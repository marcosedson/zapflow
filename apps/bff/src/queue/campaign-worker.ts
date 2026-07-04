import { Worker, Job } from "bullmq";
import Redis from "redis";
import { prisma } from "../index.js";
import { sendWhatsAppText, sendWhatsAppMedia } from "../lib/whatsapp.js";
import { updateHealthScore } from "../lib/health-score.js";
import { calculateSafeDelay, applyRandomVariation, getEffectiveDailyLimit } from "../lib/smart-delay.js";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

export const campaignQueue = {
  name: "campaign-send",
  redis,
};

/**
 * Campaign Worker — Processa envios de campanhas
 * Job data: { campaignId }
 */
const worker = new Worker(
  campaignQueue.name,
  async (job: Job) => {
    const { campaignId } = job.data;

    console.log(`[Campaign Worker] Processing campaign ${campaignId}`);

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          instance: true,
          recipients: {
            where: { status: "pending" },
            take: 1000, // Processar 1000 por vez
          },
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      if (campaign.status !== "running") {
        throw new Error("Campaign is not running");
      }

      // Verificar limite diário
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const usage = await prisma.usageLog.findUnique({
        where: {
          tenantId_date: {
            tenantId: campaign.instance.tenantId,
            date: today,
          },
        },
      });

      const dailySent = usage?.sent ?? 0;
      const effectiveLimit = getEffectiveDailyLimit(
        campaign.instance.tenantId === "demo" ? 1000 : 300, // Placeholder
        campaign.instance.warmupDay
      );

      if (dailySent >= effectiveLimit) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "paused" },
        });
        console.log(`[Campaign Worker] Daily limit reached, pausing campaign`);
        return { paused: true };
      }

      let sent = 0;
      let failed = 0;
      let connectionClosedCount = 0;

      for (const recipient of campaign.recipients) {
        // Verificar opt-out
        const contact = await prisma.contact.findFirst({
          where: {
            tenantId: campaign.instance.tenantId,
            phone: recipient.phone,
          },
        });

        if (contact?.optedOut) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "skipped" },
          });
          continue;
        }

        // Personalizar mensagem
        const firstName = contact?.name.split(" ")[0] || "Client";
        const personalizedMsg = campaign.content.replace(
          /\{\{nome\}\}/g,
          firstName
        );

        // Enviar
        const result = await sendWhatsAppText(
          campaign.instance.apiUrl,
          campaign.instance.instanceName,
          campaign.instance.apiKey,
          recipient.phone,
          personalizedMsg,
          campaign.delayMs
        );

        // Atualizar health score
        await updateHealthScore(campaign.instance.id, result);

        if (result.success) {
          sent++;
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "sent", sentAt: new Date() },
          });
          await prisma.contact.update({
            where: { phone_tenantId: { phone: recipient.phone, tenantId: campaign.instance.tenantId } },
            data: { lastSentAt: new Date() },
          });
          connectionClosedCount = 0;
        } else {
          failed++;
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: "failed", error: result.error },
          });

          // Parar se 3 Connection Closed seguidos
          if (result.error?.includes("Connection")) {
            connectionClosedCount++;
            if (connectionClosedCount >= 3) {
              console.log(
                `[Campaign Worker] 3x Connection Closed, stopping campaign`
              );
              await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: "paused" },
              });
              break;
            }
          }

          // Parar se 429 (rate limit)
          if (result.statusCode === 429) {
            console.log(`[Campaign Worker] Rate limit (429), stopping campaign`);
            await prisma.campaign.update({
              where: { id: campaignId },
              data: { status: "paused" },
            });
            break;
          }
        }

        // Atualizar usage log
        await prisma.usageLog.upsert({
          where: {
            tenantId_date: {
              tenantId: campaign.instance.tenantId,
              date: today,
            },
          },
          update: {
            sent: { increment: 1 },
            failed: { increment: failed > 0 ? 1 : 0 },
          },
          create: {
            tenantId: campaign.instance.tenantId,
            date: today,
            sent: 1,
            failed: failed > 0 ? 1 : 0,
          },
        });

        // Delay com variação
        const delayWithVariation = applyRandomVariation(campaign.delayMs);
        await new Promise((resolve) => setTimeout(resolve, delayWithVariation));

        // Update job progress
        job.progress(sent + failed);
      }

      // Checar se terminou (sem mais pending)
      const pendingCount = await prisma.campaignRecipient.count({
        where: { campaignId, status: "pending" },
      });

      if (pendingCount === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: "completed", completedAt: new Date() },
        });
        console.log(`[Campaign Worker] Campaign completed: ${sent} sent, ${failed} failed`);
      }

      return { sent, failed };
    } catch (error: any) {
      console.error(`[Campaign Worker] Error:`, error.message);
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed" },
      });
      throw error;
    }
  },
  { connection: redis, concurrency: 1 }
);

worker.on("completed", (job) => {
  console.log(`✅ Campaign ${job.data.campaignId} processed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Campaign ${job?.data.campaignId} failed:`, err.message);
});

export default worker;
