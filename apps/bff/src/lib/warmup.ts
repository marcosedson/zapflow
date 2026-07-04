import { prisma } from "../index.js";

/**
 * Incrementa o warmupDay de uma instância
 * Deve ser chamado daily (cron job ou webhook)
 * Schedule: 00:00 UTC todos os dias
 */
export async function incrementWarmupDay(instanceId: string): Promise<number> {
  const instance = await prisma.instance.findUnique({
    where: { id: instanceId },
  });

  if (!instance) {
    throw new Error("Instance not found");
  }

  // Não incrementar além de 30 dias
  const newWarmupDay = Math.min(instance.warmupDay + 1, 30);

  const updated = await prisma.instance.update({
    where: { id: instanceId },
    data: { warmupDay: newWarmupDay },
  });

  console.log(
    `[Warmup] Instance ${instance.name}: Day ${instance.warmupDay} → ${newWarmupDay}`
  );

  return updated.warmupDay;
}

/**
 * Incrementa warmupDay de TODAS as instâncias ativas
 * Deve ser chamado uma vez por dia (via Cloud Scheduler ou cron externo)
 */
export async function incrementAllWarmupDays(): Promise<number> {
  const instances = await prisma.instance.findMany({
    where: { status: "connected" },
    select: { id: true, warmupDay: true },
  });

  let updated = 0;

  for (const instance of instances) {
    if (instance.warmupDay < 30) {
      await incrementWarmupDay(instance.id);
      updated++;
    }
  }

  console.log(`[Warmup] Incremented ${updated} instances`);
  return updated;
}

/**
 * Retorna o schedule de warm-up para referência
 */
export const WARMUP_SCHEDULE = [
  20, 20, 20, // Dia 1-3: 20 msgs/dia
  50, 50, 50, 50, // Dia 4-7: 50 msgs/dia
  100, 100, 100, 100, 100, 100, 100, // Dia 8-14: 100 msgs/dia
  200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, // Dia 15-30: 200 msgs/dia
];

export function getWarmupLimit(warmupDay: number): number {
  return WARMUP_SCHEDULE[Math.min(warmupDay - 1, 29)] ?? 200;
}
