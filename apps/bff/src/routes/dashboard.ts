import { Router, Response } from "express";
import { prisma } from "../index.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/tenant-auth.js";
import { getHealthStatus } from "../lib/health-score.js";

const router = Router();

/**
 * GET /api/dashboard
 * Visão geral do tenant: campanhas, instâncias, uso
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.id;

    // Stats de campanhas
    const campaignStats = await prisma.campaign.groupBy({
      by: ["status"],
      where: {
        instance: { tenantId },
      },
      _count: true,
    });

    const campaignsByStatus = campaignStats.reduce(
      (acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Stats de instâncias
    const instances = await prisma.instance.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        healthScore: true,
        warmupDay: true,
        lastSeenAt: true,
      },
    });

    const instanceStats = {
      total: instances.length,
      connected: instances.filter((i) => i.status === "connected").length,
      disconnected: instances.filter((i) => i.status === "disconnected").length,
      avgHealthScore:
        instances.length > 0
          ? Math.round(
              instances.reduce((sum, i) => sum + i.healthScore, 0) / instances.length
            )
          : 100,
      instances: instances.map((i) => ({
        ...i,
        healthStatus: getHealthStatus(i.healthScore),
      })),
    };

    // Stats de contatos
    const contactStats = await prisma.contact.groupBy({
      by: ["optedOut"],
      where: { tenantId },
      _count: true,
    });

    const contacts = contactStats.reduce(
      (acc, stat) => {
        acc[stat.optedOut ? "optedOut" : "active"] = stat._count;
        return acc;
      },
      { active: 0, optedOut: 0 }
    );

    // Uso diário hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayUsage = await prisma.usageLog.findUnique({
      where: {
        tenantId_date: {
          tenantId,
          date: today,
        },
      },
    });

    const daily = {
      sent: todayUsage?.sent ?? 0,
      failed: todayUsage?.failed ?? 0,
      total: (todayUsage?.sent ?? 0) + (todayUsage?.failed ?? 0),
      limit: req.tenant!.plan.dailyLimit,
      remaining:
        req.tenant!.plan.dailyLimit === -1
          ? Infinity
          : Math.max(0, req.tenant!.plan.dailyLimit - (todayUsage?.sent ?? 0)),
    };

    // Campanhas recentes
    const recentCampaigns = await prisma.campaign.findMany({
      where: {
        instance: { tenantId },
      },
      select: {
        id: true,
        name: true,
        status: true,
        messageType: true,
        createdAt: true,
        instance: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    res.json({
      campaigns: campaignsByStatus,
      instances: instanceStats,
      contacts,
      daily,
      recentCampaigns,
      plan: {
        name: req.tenant!.plan.name,
        dailyLimit: req.tenant!.plan.dailyLimit,
        instanceLimit: req.tenant!.plan.instanceLimit,
      },
    });
  } catch (error: any) {
    console.error("[dashboard] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/analytics
 * Histórico de uso (últimos 30 dias)
 */
router.get("/analytics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const history = await prisma.usageLog.findMany({
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // Agregar dados
    const stats = {
      totalSent: 0,
      totalFailed: 0,
      avgPerDay: 0,
      peakDay: { date: null as Date | null, count: 0 },
      dailyBreakdown: [] as any[],
    };

    let maxCount = 0;

    for (const log of history) {
      stats.totalSent += log.sent;
      stats.totalFailed += log.failed;

      const dayCount = log.sent + log.failed;

      if (dayCount > maxCount) {
        maxCount = dayCount;
        stats.peakDay = { date: log.date, count: dayCount };
      }

      stats.dailyBreakdown.push({
        date: log.date,
        sent: log.sent,
        failed: log.failed,
        total: dayCount,
      });
    }

    const days = stats.dailyBreakdown.length || 1;
    stats.avgPerDay = Math.round(stats.totalSent / days);

    res.json(stats);
  } catch (error: any) {
    console.error("[dashboard/analytics] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/instance-health
 * Histórico de health score (últimos 30 dias)
 */
router.get(
  "/instance-health",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { instanceId } = req.query;

      const where: any = {
        tenantId: req.tenant!.id,
      };

      if (instanceId) {
        where.id = instanceId;
      }

      const instances = await prisma.instance.findMany({
        where,
        select: {
          id: true,
          name: true,
          healthScore: true,
          status: true,
          lastSeenAt: true,
        },
      });

      const health = instances.map((i) => ({
        ...i,
        healthStatus: getHealthStatus(i.healthScore),
        healthPercentage: `${i.healthScore}%`,
      }));

      res.json(health);
    } catch (error: any) {
      console.error("[dashboard/instance-health] Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
