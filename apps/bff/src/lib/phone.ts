/**
 * Normaliza número de telefone para formato WhatsApp
 * Entrada: "34997656230", "(34) 99765-6230", "+55 34 99765-6230"
 * Saída: "5534997656230"
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";

  let phone = rawPhone
    .replace(/[^\d+]/g, "") // Remove tudo menos dígitos e +
    .replace(/^\+/, ""); // Remove + do início

  // Se não começar com 55 (Brasil), adiciona
  if (!phone.startsWith("55")) {
    // Se começa com 0, remove (ex: 034... → 34...)
    if (phone.startsWith("0")) {
      phone = phone.substring(1);
    }
    phone = "55" + phone;
  }

  return phone;
}

/**
 * Valida se é um número WhatsApp válido
 * Deve ter: 55 + DDD (2 dígitos) + 9 + 8 dígitos = 13 dígitos
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // 55 + 2 (DDD) + 1 (9) + 8 (número) = 13 dígitos mínimo
  return /^55\d{11}$/.test(normalized);
}
