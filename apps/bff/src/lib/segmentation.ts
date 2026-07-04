import { prisma } from "../index.js";

/**
 * Filtros de segmentação para campanhas
 */

export interface SegmentFilter {
  excludeRecentlySent?: number; // dias: não enviar para quem recebeu há menos de X dias
  onlyTags?: string[];
  excludeTags?: string[];
  onlyOptedIn?: boolean; // padrão: true
}

/**
 * Aplica filtros de segmentação aos contatos de uma campanha
 */
export async function filterContactsBySegment(
  tenantId: string,
  filter: SegmentFilter
): Promise<string[]> {
  const where: any = {
    tenantId,
    optedOut: filter.onlyOptedIn !== false ? false : undefined,
  };

  // Filtrar por tags inclusivas
  if (filter.onlyTags && filter.onlyTags.length > 0) {
    where.tags = {
      hasSome: filter.onlyTags,
    };
  }

  // Filtrar por tags exclusivas
  if (filter.excludeTags && filter.excludeTags.length > 0) {
    where.tags = {
      ...(where.tags || {}),
      hasEvery: filter.excludeTags.map((tag) => `!${tag}`), // Nota: isso não é suportado pelo Prisma
      // Alternativa: fazer query e filtrar em memória
    };
  }

  // Filtrar por lastSentAt
  if (filter.excludeRecentlySent && filter.excludeRecentlySent > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filter.excludeRecentlySent);

    where.OR = [
      { lastSentAt: null }, // Nunca recebeu
      { lastSentAt: { lt: cutoffDate } }, // Recebeu há mais de X dias
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true },
  });

  // Filtrar tags exclusivas em memória (Prisma não suporta array exclusion diretamente)
  if (filter.excludeTags && filter.excludeTags.length > 0) {
    const allContacts = await prisma.contact.findMany({
      where: { tenantId },
      select: { id: true, tags: true },
    });

    return allContacts
      .filter((c) => !filter.excludeTags!.some((tag) => c.tags.includes(tag)))
      .map((c) => c.id);
  }

  return contacts.map((c) => c.id);
}

/**
 * Estatísticas de segmentação
 */
export async function getSegmentStats(
  tenantId: string,
  filter: SegmentFilter
): Promise<{
  total: number;
  optedOut: number;
  active: number;
  avgLastSentDays: number;
}> {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    select: { lastSentAt: true, optedOut: true },
  });

  const stats = {
    total: contacts.length,
    optedOut: contacts.filter((c) => c.optedOut).length,
    active: contacts.filter((c) => !c.optedOut).length,
    avgLastSentDays: 0,
  };

  // Calcular média de dias desde último envio
  const withLastSent = contacts.filter((c) => c.lastSentAt);
  if (withLastSent.length > 0) {
    const now = new Date();
    const avgMs = withLastSent.reduce((sum, c) => {
      return sum + (now.getTime() - c.lastSentAt!.getTime());
    }, 0) / withLastSent.length;
    stats.avgLastSentDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
  }

  return stats;
}

/**
 * Sugestões de segmentação baseado em histórico
 */
export async function getSegmentationSuggestions(
  tenantId: string
): Promise<{
  recommendTags: string[];
  recommendExcludeRecentlySent: number;
  audienceSize: number;
}> {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    select: { tags: true, lastSentAt: true },
  });

  // Sugerir tags mais comuns
  const tagFreq: Record<string, number> = {};
  contacts.forEach((c) => {
    c.tags.forEach((tag) => {
      tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    });
  });

  const recommendTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  // Sugerir dias de exclusão: se média é 7 dias, sugerir 5 dias
  let recommendExcludeRecentlySent = 5;
  const withLastSent = contacts.filter((c) => c.lastSentAt);
  if (withLastSent.length > 0) {
    const now = new Date();
    const avgMs =
      withLastSent.reduce((sum, c) => {
        return sum + (now.getTime() - c.lastSentAt!.getTime());
      }, 0) / withLastSent.length;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    recommendExcludeRecentlySent = Math.max(3, avgDays - 2);
  }

  return {
    recommendTags,
    recommendExcludeRecentlySent,
    audienceSize: contacts.length,
  };
}
