export type MasteryGameplayXpSource = "active_squad_duel" | "active_squad_solo" | "boss_defeat" | "duel_draw" | "duel_win" | "duplicate_unlock";

export type MasteryRewardActivity = "duel_complete" | "duel_win" | "duel_draw" | "arcade_complete" | "campaign_boss" | "duplicate_scan";

const rewards: Record<MasteryRewardActivity, { amount: number; source: MasteryGameplayXpSource }> = {
  duel_complete: { amount: 4, source: "active_squad_duel" },
  duel_win: { amount: 3, source: "duel_win" },
  duel_draw: { amount: 2, source: "duel_draw" },
  arcade_complete: { amount: 4, source: "active_squad_solo" },
  campaign_boss: { amount: 12, source: "boss_defeat" },
  duplicate_scan: { amount: 10, source: "duplicate_unlock" }
};

export function masteryRewardForActivity(activity: MasteryRewardActivity): { amount: number; source: MasteryGameplayXpSource } {
  return { ...rewards[activity] };
}

export function rankedMasteryAssistScale(level: number): number {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level)));
  if (safeLevel >= 20) return 0.03;
  if (safeLevel >= 10) return 0.02;
  if (safeLevel >= 5) return 0.01;
  return 0;
}
