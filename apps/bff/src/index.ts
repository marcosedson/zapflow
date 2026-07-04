import express, { Express } from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import adminRoutes from "./routes/admin.js";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Prisma
export const prisma = new PrismaClient();

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/admin", adminRoutes);

// Start server
const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected");

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
