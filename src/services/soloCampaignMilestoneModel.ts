export type SoloCampaignBossMilestone = {
  bossLevel: number;
  bugId: string;
  claimId: string;
};

const bossBugIds = [
  "vliegend-hert",
  "bidsprinkhaan",
  "regenboogmestkever",
  "hoornaar",
  "atlaskever"
] as const;

export function soloCampaignBossMilestone(level: number): SoloCampaignBossMilestone | undefined {
  const bossLevel = Math.floor(Number(level) || 0);
  const bugId = bossBugIds[bossLevel - 1];
  if (!bugId) return undefined;
  return {
    bossLevel,
    bugId,
    claimId: `solo-boss-${bossLevel}`
  };
}
