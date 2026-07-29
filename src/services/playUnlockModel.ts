import type { ArcadeMode } from "../types.ts";

const unlockTargets: Record<ArcadeMode, number> = {
  tap_duel: 1,
  bubble_swarm: 3,
  web_runner: 5,
  nest_defense: 15,
  bug_glide: 20,
  butterfly_catch: 0,
  bug_tower: 30
};

const arcadeModeOrder: ArcadeMode[] = ["tap_duel", "web_runner", "nest_defense", "bug_glide", "butterfly_catch", "bug_tower", "bubble_swarm"];

export type PlayUnlockSnapshot = {
  ownedSpecies: number;
  unlockedModes: ArcadeMode[];
  lockedModes: Array<{ mode: ArcadeMode; target: number }>;
  duelUnlocked: boolean;
  quizUnlocked: boolean;
  soloCampaignUnlocked: boolean;
};

export function arcadeModeUnlockTarget(mode: ArcadeMode): number {
  return unlockTargets[mode];
}

export function buildPlayUnlocks(ownedSpecies: number): PlayUnlockSnapshot {
  const count = Math.max(0, Math.floor(ownedSpecies));
  return {
    ownedSpecies: count,
    unlockedModes: arcadeModeOrder.filter((mode) => count >= unlockTargets[mode]),
    lockedModes: arcadeModeOrder.filter((mode) => count < unlockTargets[mode]).map((mode) => ({ mode, target: unlockTargets[mode] })),
    duelUnlocked: count >= 10,
    quizUnlocked: count >= 1,
    soloCampaignUnlocked: count >= 10
  };
}
