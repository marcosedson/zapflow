import { Response, NextFunction } from "express";
import { prisma } from "../index.js";
import { AuthenticatedRequest } from "./tenant-auth.js";
import { getEffectiveDailyLimit } from "../lib/smart-delay.js";

/**
 * Middleware: Verifica se o tenant atingiu o limite diário de mensagens
 * Adiciona `remainingMessages` ao request
 */
export const checkPlanLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.usageLog.findUnique({
      where: {
        tenantId_date: {
          tenantId: req.tenant.id,
          date: today,
        },
      },
    });

    const sent = usage?.sent ?? 0;
    const dailyLimit = req.tenant.plan.dailyLimit;

    // Se é -1, é ilimitado
    const remaining = dailyLimit === -1 ? Infinity : dailyLimit - sent;

    req.remainingMessages = Math.max(0, remaining);
    req.dailyUsage = sent;

    // Adicionar headers de info
    res.set("X-Daily-Limit", dailyLimit.toString());
    res.set("X-Daily-Usage", sent.toString());
    res.set("X-Daily-Remaining", req.remainingMessages.toString());

    next();
  } catch (error: any) {
    console.error("[plan-limit] Error:", error);
    // Continuar mesmo com erro (fail open)
    req.remainingMessages = 0;
    next();
  }
};

// Estender tipo do Request
declare global {
  namespace Express {
    interface Request {
      remainingMessages?: number;
      dailyUsage?: number;
    }
  }
}
