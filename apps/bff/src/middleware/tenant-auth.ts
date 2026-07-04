import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { prisma } from "../index.js";

// Firebase Admin está inicializado no bootloader
// Verificar: apps/bff/src/firebase.ts

export interface AuthenticatedRequest extends Request {
  firebaseUid?: string;
  tenant?: {
    id: string;
    firebaseUid: string;
    name: string;
    email: string;
    planId: string;
    status: string;
  };
}

/**
 * Middleware: Valida token Firebase e carrega tenant
 * Retorna 401 se token inválido
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUid = decodedToken.uid;

    // Carregar tenant do banco
    const tenant = await prisma.tenant.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    req.tenant = tenant;
    next();
  } catch (error: any) {
    console.error("[auth] Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Middleware: Requer token Firebase + admin manual
 * Usado para rotas admin (só Marcos)
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    // Para Phase 1, hardcode: só o dono do projeto é admin
    // Em Phase 2: adicionar roles no Firestore
    const ADMIN_UIDS = [process.env.ADMIN_UID || "demo-admin-uid"];

    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.firebaseUid = decodedToken.uid;
    next();
  } catch (error: any) {
    console.error("[admin-auth] Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
};
