export type WorldTodayAction = "claim-movement" | "claim-mission" | "buddy" | "scan";

export type WorldTodayModelInput = {
  buddyRewardReady: boolean;
  dailyRewardReady: boolean;
  movementQueuedBugs: number;
  scanAvailable: boolean;
  weeklyRewardReady: boolean;
};

export function worldTodayModel(input: WorldTodayModelInput) {
  let primaryAction: WorldTodayAction = "scan";
  if (input.movementQueuedBugs > 0) primaryAction = "claim-movement";
  else if (input.dailyRewardReady || input.weeklyRewardReady) primaryAction = "claim-mission";
  else if (input.buddyRewardReady || !input.scanAvailable) primaryAction = "buddy";

  return {
    modules: ["movement", "missions", "buddy"] as const,
    primaryAction
  };
}

export function missionProgressSummary(missions: ReadonlyArray<{ progress: number; target: number }>) {
  return {
    done: missions.filter((mission) => mission.progress >= mission.target).length,
    total: missions.length
  };
}

export function movementGoalModel(todayKm: number, goalKm: number) {
  const baseGoal = Math.max(0.1, Number.isFinite(goalKm) ? goalKm : 1.5);
  const maxGoal = baseGoal * 10;
  const current = Math.min(maxGoal, Math.max(0, Number.isFinite(todayKm) ? todayKm : 0));
  const completedRounds = Math.floor(current / baseGoal);
  const goal = current >= maxGoal ? maxGoal : Math.min(maxGoal, (completedRounds + 1) * baseGoal);
  const remaining = Math.max(0, goal - current);
  return {
    currentLabel: formatDistance(current),
    goalLabel: formatDistance(goal),
    progress: Math.min(1, current / goal),
    remainingLabel: remaining <= 0 ? "Doel behaald" : `Nog ${formatDistance(remaining)}`
  };
}

function formatDistance(km: number): string {
  if (km < 0.05) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}
