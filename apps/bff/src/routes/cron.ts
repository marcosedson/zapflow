import { Router, Response, Request } from "express";
import { incrementAllWarmupDays } from "../lib/warmup.js";

const router = Router();

/**
 * POST /api/cron/warmup
 * Chamado diariamente por Cloud Scheduler (00:00 UTC)
 * Incrementa warmupDay de todas as instâncias
 * Header: X-Goog-IAM-Authority-Selector (Google Cloud)
 */
router.post("/warmup", async (_req: Request, res: Response) => {
  try {
    const updated = await incrementAllWarmupDays();

    res.json({
      ok: true,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[cron/warmup] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
