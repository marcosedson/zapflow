import { Router, Response } from "express";
import { Queue } from "bullmq";
import Redis from "redis";
import { prisma } from "../index.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/tenant-auth.js";
import { calculateSafeDelay, getEffectiveDailyLimit } from "../lib/smart-delay.js";
import { campaignQueue } from "../queue/campaign-worker.js";
import { filterContactsBySegment, getSegmentStats } from "../lib/segmentation.js";

const router = Router();

// Job queue
const queue = new Queue(campaignQueue.name, { connection: campaignQueue.redis });

/**
 * GET /api/campaigns
 * Listar campanhas do tenant
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, skip = 0, take = 20 } = req.query;

    const where: any = {
      instance: {
        tenantId: req.tenant!.id,
      },
    };

    if (status) {
      where.status = status;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        instance: {
          select: { name: true, healthScore: true },
        },
        recipients: {
          select: { status: true },
        },
      },
      skip: parseInt(skip as string) || 0,
      take: parseInt(take as string) || 20,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.campaign.count({ where });

    // Adicionar contadores
    const campaignsWithStats = campaigns.map((c) => {
      const stats = c.recipients.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        ...c,
        recipients: undefined,
        stats,
      };
    });

    res.json({ campaigns: campaignsWithStats, total });
  } catch (error: any) {
    console.error("[campaigns] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/campaigns/:id
 * Detalhe de campaign com recipients paginados
 */
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { skip = 0, take = 50 } = req.query;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        instance: { tenantId: req.tenant!.id },
      },
      include: {
        instance: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      skip: parseInt(skip as string) || 0,
      take: parseInt(take as string) || 50,
      orderBy: { createdAt: "desc" },
    });

    const recipientStats = await prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    });

    const stats = recipientStats.reduce(
      (acc, r) => {
        acc[r.status] = r._count;
        return acc;
      },
      {} as Record<string, number>
    );

    res.json({
      campaign,
      recipients,
      stats,
    });
  } catch (error: any) {
    console.error("[campaigns/:id] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/campaigns
 * Criar nova campanha (draft)
 * Body: { name, instanceId, messageType, content, mediaUrl? }
 */
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, instanceId, messageType, content, mediaUrl } = req.body;

    if (!name || !instanceId || !messageType || !content) {
      return res.status(400).json({
        error: "Missing fields: name, instanceId, messageType, content",
      });
    }

    // Verificar instância
    const instance = await prisma.instance.findFirst({
      where: {
        id: instanceId,
        tenantId: req.tenant!.id,
      },
      include: { tenant: true },
    });

    if (!instance) {
      return res.status(404).json({ error: "Instance not found" });
    }

    // Calcular delay seguro
    const effectiveLimit = getEffectiveDailyLimit(
      instance.tenant.plan.dailyLimit,
      instance.warmupDay
    );

    const delayMs = calculateSafeDelay(effectiveLimit);

    const campaign = await prisma.campaign.create({
      data: {
        name,
        instanceId,
        messageType,
        content,
        mediaUrl,
        delayMs,
        status: "draft",
      },
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error("[campaigns] Creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/campaigns/:id
 * Atualizar campanha (só se draft)
 */
router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        instance: { tenantId: req.tenant!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== "draft") {
      return res.status(409).json({ error: "Can only edit draft campaigns" });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(content && { content }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("[campaigns/:id] Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Deletar campanha (só se draft ou paused)
 */
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        instance: { tenantId: req.tenant!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!["draft", "paused"].includes(campaign.status)) {
      return res.status(409).json({
        error: "Can only delete draft or paused campaigns",
      });
    }

    await prisma.campaign.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error("[campaigns/:id] Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/add-recipients
 * Adicionar recipients à campanha com segmentação opcional
 * Body: { all?, listId?, filter?: { excludeRecentlySent?, onlyTags?, excludeTags? } }
 */
router.post(
  "/:id/add-recipients",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { listId, all, filter } = req.body;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          instance: { tenantId: req.tenant!.id },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      let contactIds: string[] = [];

      if (all) {
        // Todos os contatos (não opt-out)
        const contacts = await prisma.contact.findMany({
          where: {
            tenantId: req.tenant!.id,
            optedOut: false,
          },
          select: { id: true, name: true, phone: true },
        });
        contactIds = contacts.map((c) => c.id);
      } else if (listId) {
        // Contatos de lista específica
        const listMembers = await prisma.contactListMember.findMany({
          where: { listId },
        });

        const contacts = await prisma.contact.findMany({
          where: {
            id: { in: listMembers.map((m) => m.contactId) },
            tenantId: req.tenant!.id,
            optedOut: false,
          },
          select: { id: true, name: true, phone: true },
        });
        contactIds = contacts.map((c) => c.id);
      } else {
        return res.status(400).json({ error: "Missing all or listId parameter" });
      }

      // Aplicar filtros de segmentação
      if (filter) {
        const filtered = await filterContactsBySegment(req.tenant!.id, filter);
        contactIds = contactIds.filter((id) => filtered.includes(id));
      }

      // Buscar dados completos
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true, phone: true },
      });

      // Criar recipients
      const recipients = await prisma.campaignRecipient.createMany({
        data: contacts.map((c) => ({
          campaignId: id,
          phone: c.phone,
          name: c.name,
          status: "pending",
        })),
        skipDuplicates: true,
      });

      res.json({ added: recipients.count, filtered: contactIds.length });
    } catch (error: any) {
      console.error("[campaigns/:id/add-recipients] Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/campaigns/:id/start
 * Iniciar envios (muda status para running, enfileira job)
 */
router.post("/:id/start", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        instance: { tenantId: req.tenant!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      return res.status(409).json({
        error: "Can only start draft or paused campaigns",
      });
    }

    // Atualizar status
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "running", startedAt: new Date() },
    });

    // Enfileirar job
    const job = await queue.add("send", { campaignId: id }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    res.json({
      campaign: updated,
      job: { id: job.id, status: job.progress() },
    });
  } catch (error: any) {
    console.error("[campaigns/:id/start] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/pause
 * Pausar envios
 */
router.post("/:id/pause", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        instance: { tenantId: req.tenant!.id },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: "paused" },
    });

    res.json(updated);
  } catch (error: any) {
    console.error("[campaigns/:id/pause] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
