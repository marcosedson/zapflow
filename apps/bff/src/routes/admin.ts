import { Router, Response } from "express";
import { prisma } from "../index.js";
import { requireAdmin, AuthenticatedRequest } from "../middleware/tenant-auth.js";

const router = Router();

// ============ PLANS ============

/**
 * GET /api/admin/plans
 * List all plans
 */
router.get("/plans", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error: any) {
    console.error("[admin/plans] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/plans
 * Create a new plan
 */
router.post("/plans", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, priceMonthly, dailyLimit, instanceLimit, features } = req.body;

    if (!name || priceMonthly === undefined) {
      return res.status(400).json({ error: "Missing required fields: name, priceMonthly" });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        priceMonthly,
        dailyLimit: dailyLimit ?? 100,
        instanceLimit: instanceLimit ?? 1,
        features: features ?? {},
      },
    });

    res.status(201).json(plan);
  } catch (error: any) {
    console.error("[admin/plans] Creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ TENANTS ============

/**
 * GET /api/admin/tenants
 * List all tenants
 */
router.get("/tenants", requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(tenants);
  } catch (error: any) {
    console.error("[admin/tenants] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/tenants
 * Create a new tenant
 * Body: { firebaseUid, name, email, planId }
 */
router.post("/tenants", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firebaseUid, name, email, planId } = req.body;

    if (!firebaseUid || !name || !email || !planId) {
      return res.status(400).json({
        error: "Missing required fields: firebaseUid, name, email, planId",
      });
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const tenant = await prisma.tenant.create({
      data: {
        firebaseUid,
        name,
        email,
        planId,
        status: "trial",
      },
      include: { plan: true },
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Email or Firebase UID already exists" });
    }
    console.error("[admin/tenants] Creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/tenants/:id
 * Update tenant status or plan
 */
router.put("/tenants/:id", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, planId } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (planId) updateData.planId = planId;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: { plan: true },
    });

    res.json(tenant);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Tenant not found" });
    }
    console.error("[admin/tenants] Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
