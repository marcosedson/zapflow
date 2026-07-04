import { Router, Response, Request } from "express";
import { prisma } from "../index.js";
import { normalizePhone } from "../lib/phone.js";

const router = Router();

/**
 * POST /api/webhooks/evolution
 * Webhook para receber mensagens da Evolution API
 * Detecta mensagens com "PARAR", "STOP", "SAIR", "CANCELAR", etc
 * E marca contato como optedOut
 */
router.post("/evolution", async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    // Ignorar eventos que não são mensagens recebidas
    if (event !== "messages.upsert") {
      return res.status(200).json({ received: true });
    }

    const message = data?.message;
    if (!message) {
      return res.status(200).json({ received: true });
    }

    // Extrair texto da mensagem
    const msgText = message.conversation?.toLowerCase()?.trim();
    if (!msgText) {
      return res.status(200).json({ received: true });
    }

    // Keywords para opt-out
    const OPTOUT_KEYWORDS = [
      "parar",
      "stop",
      "sair",
      "cancelar",
      "descadastrar",
      "remover",
      "unsubscribe",
      "0",
    ];

    const isOptOut = OPTOUT_KEYWORDS.some((keyword) =>
      msgText.includes(keyword)
    );

    if (!isOptOut) {
      return res.status(200).json({ received: true });
    }

    // Extrair número de quem mandou a mensagem
    const senderJid = data.key?.remoteJid;
    if (!senderJid) {
      return res.status(200).json({ received: true });
    }

    // Extrair apenas o número (remove @s.whatsapp.net)
    const senderPhone = normalizePhone(senderJid.split("@")[0]);

    console.log(`[Webhook] Opt-out request from ${senderPhone}`);

    // Marcar como optedOut em TODOS os tenants
    // (contato pode estar em múltiplos tenants)
    const updated = await prisma.contact.updateMany({
      where: { phone: senderPhone },
      data: {
        optedOut: true,
        optedOutAt: new Date(),
      },
    });

    console.log(`[Webhook] Marked ${updated.count} contacts as opted out`);

    res.status(200).json({
      received: true,
      optedOut: true,
      phone: senderPhone,
      updated: updated.count,
    });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/health-check
 * Webhook simples para verificar se o serviço está ativo
 */
router.post("/health-check", (_req: Request, res: Response) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;
