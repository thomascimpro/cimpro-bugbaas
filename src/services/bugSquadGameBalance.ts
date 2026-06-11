import { User } from "../types";
import { activeBugSquadBonuses } from "./bugSquadService";

export type ForegroundCatchBalance = {
  hitboxMultiplier: number;
  timeMultiplier: number;
};

export type BugSmashDuelBalance = {
  comboBonusEvery: number;
  comboGraceMs: number;
  focusEasyHits: number;
  hitboxMultiplier: number;
  movementFinalBonusCap: number;
  questRewardRarityBoost: number;
  radarRarePointChance: number;
  targetSpacingMultiplier: number;
  xpDuplicatePointChance: number;
  speedMultiplier: number;
  supportBonusEvery: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function foregroundCatchBalanceForUser(user?: Pick<User, "activeBugSquad"> | null): ForegroundCatchBalance {
  const bonuses = activeBugSquadBonuses(user ?? undefined);
  return {
    hitboxMultiplier: 1.06 + clamp(bonuses.catch_assist, 0, 0.22),
    timeMultiplier: 1 + clamp(bonuses.catch_time, 0, 0.2)
  };
}

export function bugSmashDuelBalanceForUser(user?: Pick<User, "activeBugSquad"> | null): BugSmashDuelBalance {
  const bonuses = activeBugSquadBonuses(user ?? undefined);
  return {
    comboBonusEvery: comboBonusEveryForValue(bonuses.combo_boost),
    comboGraceMs: Math.round(650 + clamp(bonuses.knowledge_boost, 0, 0.15) * 5200),
    focusEasyHits: tieredCount(bonuses.focus_boost, [0.015, 0.045, 0.075], 3),
    hitboxMultiplier: 1.05 + clamp(bonuses.catch_assist, 0, 0.22),
    movementFinalBonusCap: tieredCount(bonuses.movement_boost, [0.015, 0.045, 0.075], 3),
    questRewardRarityBoost: clamp(bonuses.quest_boost * 0.35, 0, 0.05),
    radarRarePointChance: clamp(bonuses.radar_rarity * 1.2, 0, 0.08),
    targetSpacingMultiplier: 1 - clamp(bonuses.radar_spawn * 0.45, 0, 0.08),
    xpDuplicatePointChance: clamp(bonuses.xp_boost * 0.9, 0, 0.08),
    speedMultiplier: 1 + clamp(bonuses.catch_time, 0, 0.18),
    supportBonusEvery: supportBonusEveryForValue(bonuses.support_boost)
  };
}

function comboBonusEveryForValue(value: number): number {
  if (value >= 0.06) return 2;
  if (value >= 0.03) return 3;
  if (value >= 0.01) return 4;
  return 5;
}

function supportBonusEveryForValue(value: number): number {
  if (value >= 0.09) return 4;
  if (value >= 0.075) return 5;
  if (value >= 0.045) return 6;
  if (value >= 0.03) return 7;
  if (value >= 0.015) return 8;
  return 0;
}

function tieredCount(value: number, thresholds: number[], cap: number): number {
  return Math.min(cap, thresholds.filter((threshold) => value >= threshold).length);
}
