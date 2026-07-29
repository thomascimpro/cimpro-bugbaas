export type SeasonTrophy = {
  awardedXp: number;
  bossId: string;
  claimedAt: string;
  seasonId: string;
};

export function normalizeSeasonTrophy(id: string, value: Record<string, unknown>): SeasonTrophy | null {
  const seasonId = typeof value.seasonId === "string" ? value.seasonId.trim() : "";
  const bossId = typeof value.bossId === "string" ? value.bossId.trim() : id;
  const rawClaimedAt = value.claimedAt as { toDate?: () => Date } | string | undefined;
  const claimedAt = typeof rawClaimedAt === "string"
    ? rawClaimedAt
    : rawClaimedAt?.toDate?.().toISOString?.() ?? "";
  if (!seasonId || !bossId || !claimedAt) return null;
  return {
    awardedXp: Math.max(0, Math.floor(Number(value.awardedXp) || 0)),
    bossId,
    claimedAt,
    seasonId
  };
}
