export type AutoClaimMission = {
  id: string;
  progress: number;
  target: number;
};

export function autoClaimableMissionIds(missions: AutoClaimMission[], claimedIds: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const mission of missions) {
    if (!mission.id || mission.target <= 0 || mission.progress < mission.target || claimedIds.has(mission.id) || seen.has(mission.id)) continue;
    seen.add(mission.id);
    result.push(mission.id);
  }
  return result;
}
