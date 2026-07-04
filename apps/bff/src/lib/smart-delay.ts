/**
 * Calcula delay seguro baseado no limite diário do plano
 * Fórmula:
 * - Tempo disponível: (endHour - startHour) * 3600 segundos
 * - Delay base: (disponível / dailyLimit) * 0.85 (15% de margem)
 * - Limite WhatsApp: 60 msgs/hora máximo
 *
 * Exemplos:
 * - Starter 300/dia (8h-17h): 108s/msg → 33 msgs/h ✅
 * - Pro 1000/dia (8h-17h): 32.4s → capped a 60s → 60 msgs/h ✅
 */
export function calculateSafeDelay(
  dailyLimit: number,
  startHour: number = 8,
  endHour: number = 17
): number {
  const MIN_DELAY_SECONDS = 30; // Mínimo absoluto
  const MAX_MSGS_PER_HOUR = 60; // Limite WhatsApp
  const SAFETY_MARGIN = 0.85; // 15% de margem

  // Limite ilimitado? usar máximo seguro
  if (dailyLimit < 0) {
    return 60 * 1000; // 60s = 60 msgs/hora
  }

  const availableSeconds = (endHour - startHour) * 3600;
  const baseDelay = (availableSeconds / dailyLimit) * SAFETY_MARGIN;
  const maxDelayCap = 3600 / MAX_MSGS_PER_HOUR; // 60 segundos

  const delaySeconds = Math.max(
    MIN_DELAY_SECONDS,
    Math.min(baseDelay, maxDelayCap)
  );

  return delaySeconds * 1000; // Converter para ms
}

/**
 * Aplica variação aleatória ±40% ao delay
 * Torna o padrão mais natural aos olhos do WhatsApp
 */
export function applyRandomVariation(delayMs: number): number {
  const variation = delayMs * 0.4;
  const randomOffset = Math.random() * variation * 2 - variation;
  return delayMs + randomOffset;
}

/**
 * Calcula limite efetivo considerando warm-up
 */
const WARMUP_SCHEDULE = [
  20, 20, 20, // Dia 1-3
  50, 50, 50, 50, // Dia 4-7
  100, 100, 100, 100, 100, 100, 100, // Dia 8-14
  200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, // Dia 15-30
];

export function getEffectiveDailyLimit(
  planDailyLimit: number,
  warmupDay: number
): number {
  const warmupLimit = WARMUP_SCHEDULE[Math.min(warmupDay - 1, 29)] ?? planDailyLimit;
  return Math.min(warmupLimit, planDailyLimit);
}
