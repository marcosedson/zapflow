import { Router, Response } from "express";
import { prisma } from "../index.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/tenant-auth.js";
import { normalizePhone, isValidPhone } from "../lib/phone.js";

const router = Router();

/**
 * GET /api/contacts
 * Listar contatos do tenant
 */
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { skip = 0, take = 50, optedOut = false } = req.query;

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: req.tenant!.id,
        optedOut: optedOut === "true",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        tags: true,
        optedOut: true,
        lastSentAt: true,
        createdAt: true,
      },
      skip: parseInt(skip as string) || 0,
      take: parseInt(take as string) || 50,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.contact.count({
      where: {
        tenantId: req.tenant!.id,
        optedOut: optedOut === "true",
      },
    });

    res.json({
      contacts,
      total,
      skip: parseInt(skip as string) || 0,
      take: parseInt(take as string) || 50,
    });
  } catch (error: any) {
    console.error("[contacts] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/search
 * Buscar contatos por nome ou telefone
 */
router.get("/search", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing query parameter: q" });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: req.tenant!.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: normalizePhone(q) } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        tags: true,
        optedOut: true,
      },
      take: 20,
    });

    res.json(contacts);
  } catch (error: any) {
    console.error("[contacts/search] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/import
 * Import de contatos via JSON
 * Body: { contacts: [{ name: "João", phone: "34997656230" }, ...] }
 */
router.post("/import", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        error: "Missing or empty contacts array",
      });
    }

    const results = {
      total: contacts.length,
      imported: 0,
      skipped: 0,
      invalid: 0,
      errors: [] as any[],
    };

    // Procurar duplicatas existentes em batch
    const phonesToCheck = contacts
      .map((c) => normalizePhone(c.phone))
      .filter(Boolean);

    const existing = await prisma.contact.findMany({
      where: {
        tenantId: req.tenant!.id,
        phone: { in: phonesToCheck },
      },
      select: { phone: true },
    });

    const existingPhones = new Set(existing.map((c) => c.phone));

    // Processar contatos
    const validContacts = [];

    for (const contact of contacts) {
      const phone = normalizePhone(contact.phone);

      // Validar telefone
      if (!isValidPhone(phone)) {
        results.invalid++;
        results.errors.push({
          name: contact.name,
          phone: contact.phone,
          error: "Invalid phone format",
        });
        continue;
      }

      // Verificar duplicata
      if (existingPhones.has(phone)) {
        results.skipped++;
        continue;
      }

      validContacts.push({
        tenantId: req.tenant!.id,
        name: contact.name || "Unknown",
        phone,
        tags: contact.tags || [],
      });
    }

    // Batch insert
    if (validContacts.length > 0) {
      const created = await prisma.contact.createMany({
        data: validContacts,
        skipDuplicates: true,
      });
      results.imported = created.count;
    }

    res.json(results);
  } catch (error: any) {
    console.error("[contacts/import] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/contacts/:id
 * Atualizar contato (tags, name)
 */
router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tags } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (tags) updateData.tags = tags;

    const contact = await prisma.contact.updateMany({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
      data: updateData,
    });

    if (contact.count === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const updated = await prisma.contact.findUnique({ where: { id } });
    res.json(updated);
  } catch (error: any) {
    console.error("[contacts/:id] Update error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/contacts/:id
 * Deletar contato
 */
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.deleteMany({
      where: {
        id,
        tenantId: req.tenant!.id,
      },
    });

    if (contact.count === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("[contacts/:id] Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/:id/opt-out
 * Marcar contato como opt-out (parou de receber mensagens)
 */
router.post(
  "/:id/opt-out",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const contact = await prisma.contact.updateMany({
        where: {
          id,
          tenantId: req.tenant!.id,
        },
        data: {
          optedOut: true,
          optedOutAt: new Date(),
        },
      });

      if (contact.count === 0) {
        return res.status(404).json({ error: "Contact not found" });
      }

      res.json({ success: true, message: "Contact marked as opted out" });
    } catch (error: any) {
      console.error("[contacts/:id/opt-out] Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
