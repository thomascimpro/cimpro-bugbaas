import type { BugMastery } from "../types";
import { bugDexEntries, type BugDexEntry, type BugDexRarity } from "./pointsService.ts";

export type BugCrownRank = "none" | "crowned" | "elite" | "master" | "legend";

export type BugCrownRequirement = {
  rank: Exclude<BugCrownRank, "none">;
  level: number;
  battleWins: number;
  multiplier: number;
};

export const bugCrownRequirements: readonly BugCrownRequirement[] = Object.freeze([
  { rank: "crowned", level: 8, battleWins: 25, multiplier: 1.025 },
  { rank: "elite", level: 11, battleWins: 75, multiplier: 1.05 },
  { rank: "master", level: 14, battleWins: 150, multiplier: 1.075 },
  { rank: "legend", level: 17, battleWins: 300, multiplier: 1.1 }
]);

export const bugCrownMaxMultiplier = 1.1;

export const bugCrownGlowPalette: Record<BugCrownRank, string> = {
  none: "transparent",
  crowned: "#e7b84b",
  elite: "#ffd76b",
  master: "#fff4bd",
  legend: "#f4c95d"
};

export function bugCrownRank(rarity: BugDexRarity | string | undefined, level: number, battleWins: number): BugCrownRank {
  if (rarity !== "Mythisch") return "none";
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const safeWins = Math.max(0, Math.floor(Number(battleWins) || 0));
  return [...bugCrownRequirements]
    .reverse()
    .find((requirement) => safeLevel >= requirement.level && safeWins >= requirement.battleWins)?.rank ?? "none";
}

export function bugCrownRankForMastery(entry: Pick<BugDexEntry, "rarity">, mastery: Pick<BugMastery, "level" | "battleWins">): BugCrownRank {
  return bugCrownRank(entry.rarity, mastery.level, mastery.battleWins);
}

export function bugCrownPowerMultiplier(rank: BugCrownRank): number;
export function bugCrownPowerMultiplier(rarity: BugDexRarity | string | undefined, level: number, battleWins: number): number;
export function bugCrownPowerMultiplier(first: BugCrownRank | BugDexRarity | string | undefined, level?: number, battleWins?: number): number {
  const rank = level === undefined || battleWins === undefined
    ? (first as BugCrownRank | undefined) ?? "none"
    : bugCrownRank(first, level, battleWins);
  return Math.min(bugCrownMaxMultiplier, bugCrownRequirements.find((requirement) => requirement.rank === rank)?.multiplier ?? 1);
}

export function bugCrownPowerMultiplierForMastery(entry: Pick<BugDexEntry, "rarity">, mastery: Pick<BugMastery, "level" | "battleWins">): number {
  return bugCrownPowerMultiplier(bugCrownRankForMastery(entry, mastery));
}

export function bugCrownPowerMultiplierForSquad(squadIds: readonly string[], masteryByBugId: Record<string, Pick<BugMastery, "level" | "battleWins">>): number {
  const entryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));
  return Math.min(
    bugCrownMaxMultiplier,
    Math.max(1, ...squadIds.map((bugId) => {
      const entry = entryById.get(bugId);
      const mastery = masteryByBugId[bugId];
      return entry && mastery ? bugCrownPowerMultiplierForMastery(entry, mastery) : 1;
    }))
  );
}

export type BugCrownProgress = {
  rank: BugCrownRank;
  multiplier: number;
  next: BugCrownRequirement | null;
  level: number;
  battleWins: number;
  levelReady: boolean;
  winsReady: boolean;
  ready: boolean;
  complete: boolean;
};

export function bugCrownProgress(rarity: BugDexRarity | string | undefined, level: number, battleWins: number): BugCrownProgress {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const safeWins = Math.max(0, Math.floor(Number(battleWins) || 0));
  const rank = bugCrownRank(rarity, safeLevel, safeWins);
  const next = rarity === "Mythisch"
    ? bugCrownRequirements.find((requirement) => safeLevel < requirement.level || safeWins < requirement.battleWins) ?? null
    : null;
  const levelReady = Boolean(next && safeLevel >= next.level);
  const winsReady = Boolean(next && safeWins >= next.battleWins);
  return {
    rank,
    multiplier: bugCrownPowerMultiplier(rank),
    next,
    level: safeLevel,
    battleWins: safeWins,
    levelReady,
    winsReady,
    ready: Boolean(next && levelReady && winsReady),
    complete: rarity === "Mythisch" && !next
  };
}

export type PveBattleWinInput = {
  battleId: string;
  kind?: string;
  won: boolean;
  usedSquadIds: readonly string[];
  seenEventIds?: ReadonlySet<string>;
};

export function stablePveBattleEventId(kind: string, battleId: string, bugId: string): string {
  return `pve-battle:${kind}:${battleId}:${bugId}`;
}

export function completedPveBattleBugIds(input: PveBattleWinInput): string[] {
  if (!input.won || !input.battleId.trim()) return [];
  const kind = input.kind ?? "battle";
  return [...new Set(input.usedSquadIds.filter((bugId) => bugId.trim()))]
    .filter((bugId) => !input.seenEventIds?.has(stablePveBattleEventId(kind, input.battleId, bugId)));
}

export function pveDamageWithCrown(baseDamage: number, multiplier: number, isPve: boolean): number {
  const safeBase = Math.max(0, Number(baseDamage) || 0);
  if (!isPve) return safeBase;
  return Math.ceil(safeBase * Math.min(bugCrownMaxMultiplier, Math.max(1, multiplier)));
}
