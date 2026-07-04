import { Router, Response } from "express";
import axios from "axios";
import { prisma } from "../index.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/tenant-auth.js";
import { getHealthStatus } from "../lib/health-score.js";

const router = Router();

/**
 * GET /api/instances
 * Listar instâncias do tenant
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const instances = await prisma.instance.findMany({
      where: { tenantId: req.tenant!.id },
      select: {
        id: true,
        name: true,
        instanceName: true,
        status: true,
        healthScore: true,
        warmupDay: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Adicionar health status
    const withStatus = instances.map((inst) => ({
      ...inst,
      healthStatus: getHealthStatus(inst.healthScore),
    }));

    res.json(withStatus);
  } catch (error: any) {
    console.error("[instances] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instances/:id
 * Detalhe de uma instância
 */
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
      include: {
        campaigns: {
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!instance) {
      return res.status(404).json({ error: "Instance not found" });
    }

    res.json({
      ...instance,
      healthStatus: getHealthStatus(instance.healthScore),
    });
  } catch (error: any) {
    console.error("[instances/:id] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/instances
 * Criar nova instância (conectar ao Evolution API)
 * Body: { name, instanceName, apiUrl, apiKey }
 */
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, instanceName, apiUrl, apiKey } = req.body;

    if (!name || !instanceName || !apiUrl || !apiKey) {
      return res.status(400).json({
        error: "Missing fields: name, instanceName, apiUrl, apiKey",
      });
    }

    // Verificar limite de instâncias do plano
    const existingCount = await prisma.instance.count({
      where: { tenantId: req.tenant!.id },
    });

    if (existingCount >= req.tenant!.plan.instanceLimit) {
      return res.status(409).json({
        error: `Limit reached: ${req.tenant!.plan.instanceLimit} instances allowed`,
      });
    }

    // Criar instância
    const instance = await prisma.instance.create({
      data: {
        tenantId: req.tenant!.id,
        name,
        instanceName,
        apiUrl,
        apiKey,
        status: "disconnected",
        healthScore: 100,
        warmupDay: 1,
      },
    });

    res.status(201).json({
      ...instance,
      healthStatus: getHealthStatus(instance.healthScore),
    });
  } catch (error: any) {
    console.error("[instances] Creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/instances/:id
 * Atualizar instância (name, status)
 */
router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;

    const instance = await prisma.instance.updateMany({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
      data: updateData,
    });

    if (instance.count === 0) {
      return res.status(404).json({ error: "Instance not found" });
    }

    const updated = await prisma.instance.findUnique({ where: { id } });
    res.json({
      ...updated,
      healthStatus: getHealthStatus(updated!.healthScore),
    });
  } catch (error: any) {
    console.error("[instances/:id] Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/instances/:id
 * Deletar instância
 */
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.deleteMany({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (instance.count === 0) {
      return res.status(404).json({ error: "Instance not found" });
    }

    res.json({ success: true, message: "Instance deleted" });
  } catch (error: any) {
    console.error("[instances/:id] Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/instances/:id/qr
 * Proxy para Evolution API: obter QR code para conectar WhatsApp
 * POST na Evolution API: GET /qrcode/{instanceName}
 */
router.get("/:id/qr", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const instance = await prisma.instance.findFirst({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (!instance) {
      return res.status(404).json({ error: "Instance not found" });
    }

    // Chamar Evolution API
    const evolutionUrl = `${instance.apiUrl}/qrcode/${instance.instanceName}`;
    const response = await axios.get(evolutionUrl, {
      headers: {
        apikey: instance.apiKey,
      },
      timeout: 5000,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("[instances/:id/qr] Error:", error.message);
    res.status(500).json({
      error: "Failed to get QR code from Evolution API",
      details: error.message,
    });
  }
});

/**
 * GET /api/instances/:id/check-health
 * Verifica status da instância na Evolution API
 */
router.get(
  "/:id/check-health",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          tenantId: req.tenant!.id,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: "Instance not found" });
      }

      // Chamar Evolution API para verificar status
      const evolutionUrl = `${instance.apiUrl}/chat/findChats/${instance.instanceName}`;
      const response = await axios.get(evolutionUrl, {
        headers: {
          apikey: instance.apiKey,
        },
        timeout: 5000,
      });

      const isConnected = response.status === 200 && response.data?.chats;

      // Atualizar status
      if (isConnected !== (instance.status === "connected")) {
        await prisma.instance.update({
          where: { id },
          data: {
            status: isConnected ? "connected" : "disconnected",
            lastSeenAt: new Date(),
          },
        });
      }

      res.json({
        connected: isConnected,
        status: isConnected ? "connected" : "disconnected",
      });
    } catch (error: any) {
      console.error("[instances/:id/check-health] Error:", error.message);
      res.status(500).json({
        error: "Failed to check instance health",
        connected: false,
      });
    }
  }
);

export default router;
