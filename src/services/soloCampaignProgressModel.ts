export type SoloCampaignProgressState = {
  lives: number;
  updatedAt: string;
  wave: number;
  weekId: string;
};

export function carrySoloCampaignProgressIntoWeek(
  progress: SoloCampaignProgressState,
  currentWeekId: string,
  now: string
): SoloCampaignProgressState {
  if (progress.weekId === currentWeekId) return { ...progress };
  return {
    lives: 3,
    updatedAt: now,
    wave: Math.max(1, Math.floor(Number(progress.wave) || 1)),
    weekId: currentWeekId
  };
}
