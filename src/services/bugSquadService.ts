import { BugDexInventoryItem, User } from "../types";
import { BugDexEntry, BugDexRarity, bugDexEntries, InsectVariant } from "./pointsService";

export type BugSquadBonusCategory =
  | "radar_spawn"
  | "radar_rarity"
  | "catch_assist"
  | "catch_time"
  | "movement_boost"
  | "focus_boost"
  | "knowledge_boost"
  | "support_boost"
  | "quest_boost"
  | "xp_boost"
  | "combo_boost";

export type BugSquadBonus = {
  bugId: string;
  category: BugSquadBonusCategory;
  rarity: BugDexRarity;
  scale: number;
  value: number;
};

export type BugSquadBonusTotals = Record<BugSquadBonusCategory, number>;
export type BugSquadAttackKind = "burst" | "shield" | "splash" | "sticky" | "zap";

export const maxActiveBugSquadSize = 3;

const rarityScale: Record<BugDexRarity, number> = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 3,
  Legendarisch: 5,
  Mythisch: 6
};

const baseBonusValue: Record<BugSquadBonusCategory, number> = {
  radar_spawn: 0.01,
  radar_rarity: 0.005,
  catch_assist: 0.02,
  catch_time: 0.02,
  movement_boost: 0.015,
  focus_boost: 0.015,
  knowledge_boost: 0.015,
  support_boost: 0.015,
  quest_boost: 0.015,
  xp_boost: 0.01,
  combo_boost: 0.01
};

const bonusCaps: Record<BugSquadBonusCategory, number> = {
  radar_spawn: 0.1,
  radar_rarity: 0.05,
  catch_assist: 0.2,
  catch_time: 0.2,
  movement_boost: 0.15,
  focus_boost: 0.15,
  knowledge_boost: 0.15,
  support_boost: 0.15,
  quest_boost: 0.15,
  xp_boost: 0.1,
  combo_boost: 0.06
};

const categoriesByInsect: Record<InsectVariant, BugSquadBonusCategory[]> = {
  beetle: ["movement_boost", "quest_boost", "focus_boost"],
  crawler: ["catch_assist", "combo_boost"],
  dragonfly: ["radar_spawn", "radar_rarity", "catch_time"],
  grasshopper: ["catch_assist", "movement_boost"],
  ladybug: ["focus_boost", "support_boost", "quest_boost"],
  larva: ["knowledge_boost", "support_boost"]
};

const bugDexEntryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));

export function bugSquadBonusForEntry(entry: BugDexEntry): BugSquadBonus {
  const categories = categoriesByInsect[entry.insect];
  const category = categories[stableHash(entry.id) % categories.length];
  const scale = rarityScale[entry.rarity];
  const rawValue = baseBonusValue[category] * scale;
  return {
    bugId: entry.id,
    category,
    rarity: entry.rarity,
    scale,
    value: Math.min(rawValue, bonusCaps[category])
  };
}

export function emptyBugSquadBonuses(): BugSquadBonusTotals {
  return {
    radar_spawn: 0,
    radar_rarity: 0,
    catch_assist: 0,
    catch_time: 0,
    movement_boost: 0,
    focus_boost: 0,
    knowledge_boost: 0,
    support_boost: 0,
    quest_boost: 0,
    xp_boost: 0,
    combo_boost: 0
  };
}

export function activeBugSquadBonuses(userOrIds?: Pick<User, "activeBugSquad"> | string[]): BugSquadBonusTotals {
  const ids = Array.isArray(userOrIds) ? userOrIds : userOrIds?.activeBugSquad ?? [];
  return bugSquadBonusesForIds(ids);
}

export function activeBugSquadBonusList(userOrIds?: Pick<User, "activeBugSquad"> | string[]): BugSquadBonus[] {
  const ids = Array.isArray(userOrIds) ? userOrIds : userOrIds?.activeBugSquad ?? [];
  return sanitizeActiveBugSquad(ids)
    .map((bugId) => bugDexEntryById.get(bugId))
    .filter((entry): entry is BugDexEntry => Boolean(entry))
    .map(bugSquadBonusForEntry);
}

export function bugSquadAttackKindForCategory(category: BugSquadBonusCategory): BugSquadAttackKind {
  if (category === "catch_assist" || category === "catch_time") return "sticky";
  if (category === "radar_spawn" || category === "radar_rarity" || category === "xp_boost") return "splash";
  if (category === "movement_boost") return "shield";
  if (category === "combo_boost") return "burst";
  if (category === "focus_boost" || category === "knowledge_boost" || category === "support_boost" || category === "quest_boost") return "zap";
  return "burst";
}

export function bugSquadBonusesForIds(ids: string[]): BugSquadBonusTotals {
  const totals = emptyBugSquadBonuses();
  for (const bonus of activeBugSquadBonusList(ids)) {
    totals[bonus.category] = Math.min(bonusCaps[bonus.category], totals[bonus.category] + bonus.value);
  }
  return totals;
}

export function sanitizeActiveBugSquad(ids?: string[], inventory?: BugDexInventoryItem[]): string[] {
  const ownedIds = inventory ? new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId)) : null;
  const result: string[] = [];
  for (const bugId of ids ?? []) {
    if (result.length >= maxActiveBugSquadSize) break;
    if (result.includes(bugId)) continue;
    if (!bugDexEntryById.has(bugId)) continue;
    if (ownedIds && !ownedIds.has(bugId)) continue;
    result.push(bugId);
  }
  return result;
}

function stableHash(value: string): number {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}
