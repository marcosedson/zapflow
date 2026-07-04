import { prisma } from "../index.js";

export interface SendResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Atualiza health score da instância baseado no resultado do envio
 * Regras:
 * - Taxa de 429: -50 (rate limit imediato)
 * - Connection Closed: -20 (desconexão)
 * - Número inválido (exists: false): -3
 * - Erro 500+: -10
 * - Sucesso: +1
 *
 * Ações automáticas:
 * - < 20: pausar campanha + notificar
 * - < 50: alertar no dashboard
 * - < 70: aumentar delay 50%
 */
export async function updateHealthScore(
  instanceId: string,
  result: SendResult
): Promise<number> {
  let delta = 0;

  if (result.error?.includes("429")) {
    delta = -50; // Rate limit
  } else if (result.error?.includes("Connection")) {
    delta = -20; // Conexão perdida
  } else if (result.error?.includes("exists") && result.error?.includes("false")) {
    delta = -3; // Número inválido
  } else if ((result.statusCode ?? 0) >= 500) {
    delta = -10; // Server error
  } else if (result.success) {
    delta = +1; // Sucesso
  }

  if (delta === 0) {
    // Sem mudança
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
    });
    return instance?.healthScore ?? 100;
  }

  const instance = await prisma.instance.update({
    where: { id: instanceId },
    data: {
      healthScore: {
        increment: delta,
      },
    },
  });

  // Clampar entre 0-100
  if (instance.healthScore < 0 || instance.healthScore > 100) {
    await prisma.instance.update({
      where: { id: instanceId },
      data: {
        healthScore: Math.max(0, Math.min(100, instance.healthScore)),
      },
    });
  }

  return instance.healthScore;
}

/**
 * Retorna status da instância com base no health score
 */
export function getHealthStatus(score: number): "critical" | "warning" | "healthy" {
  if (score < 20) return "critical";
  if (score < 50) return "warning";
  return "healthy";
}
