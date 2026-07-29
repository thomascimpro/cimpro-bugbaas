import type { BugDexInventoryItem, BugMastery } from "../types.ts";
import type { FieldJournalEntry, FieldJournalHabitat } from "../services/fieldJournalService.ts";
import { bugProgressionCatalog } from "../services/bugProgressionCatalog.ts";
import { bugDexEntries, type BugDexEntry, type BugDexRarity } from "../services/pointsService.ts";

export type MuseumWingId = "beetles" | "wings" | "water" | "night" | "crawlers" | "crown";
export type MuseumWingStage = "hidden" | "discovered" | "open" | "curated" | "master";
export type MuseumGoalStage = "open" | "curated" | "master";
export type MuseumRequirementKind = "species" | "mastery" | "rarity" | "habitat" | "field" | "wings";

export type MuseumRequirement = {
  id: string;
  kind: MuseumRequirementKind;
  icon: string;
  labelKey: string;
  current: number;
  required: number;
  complete: boolean;
  detail?: string;
};

export type MuseumGoal = {
  stage: MuseumGoalStage;
  requirements: MuseumRequirement[];
};

export type MuseumWingDefinition = {
  id: MuseumWingId;
  titleKey: string;
  eyebrowKey: string;
  descriptionKey: string;
  accent: string;
  tint: string;
  matcher: (entry: BugDexEntry) => boolean;
  open: MuseumTarget;
  curated: MuseumTarget;
  master: MuseumTarget;
};

export type MuseumWing = Omit<MuseumWingDefinition, "matcher" | "open" | "curated" | "master"> & {
  stage: MuseumWingStage;
  itemCount: number;
  progress: number;
  goals: MuseumGoal[];
};

type MuseumTarget = {
  species?: number;
  mastery?: number;
  masteryCount?: number;
  rarity?: BugDexRarity;
  rarityCount?: number;
  habitat?: FieldJournalHabitat;
  habitatCount?: number;
  fieldCount?: number;
  wings?: number;
  wingStage?: MuseumWingStage;
};

const rarityOrder: BugDexRarity[] = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"];
const bugEntryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));

const waterBugIds = new Set([
  "waterkever",
  "schrijvertje",
  "schaatsenrijder",
  "waterschorpioen",
  "reuzenwaterwants",
  "waterjuffer",
  "azuren-waterjuffer",
  "libel",
  "smaragdlibel",
  "helikopterjuffer"
]);

const nightBugIds = new Set([
  "mot",
  "motmug",
  "doodshoofdvlinder",
  "maanmot",
  "komeetmot",
  "atlasvlinder",
  "gespikkelde-houtvlinder",
  "kakkerlak",
  "reuzenkakkerlak",
  "nachtkaardespin",
  "gewone-kogelspin",
  "kruipende-kogelspin",
  "vioolspin",
  "kruisspin",
  "springspin",
  "zebra-springspin",
  "vogelspin",
  "wespspin",
  "schorpioen",
  "zweepschorpioen"
]);

export const museumWingDefinitions: MuseumWingDefinition[] = [
  {
    id: "beetles",
    titleKey: "museum.wing.beetles.title",
    eyebrowKey: "museum.wing.beetles.eyebrow",
    descriptionKey: "museum.wing.beetles.description",
    accent: "#e8c964",
    tint: "rgba(49, 28, 12, 0.42)",
    matcher: (entry) => entry.insect === "beetle" || entry.insect === "ladybug",
    open: { species: 4, mastery: 3 },
    curated: { species: 8, mastery: 5, rarity: "Zeldzaam", rarityCount: 1 },
    master: { species: 14, mastery: 10, rarity: "Episch", rarityCount: 2 }
  },
  {
    id: "wings",
    titleKey: "museum.wing.wings.title",
    eyebrowKey: "museum.wing.wings.eyebrow",
    descriptionKey: "museum.wing.wings.description",
    accent: "#9ed6e9",
    tint: "rgba(12, 46, 66, 0.42)",
    matcher: (entry) => entry.insect === "dragonfly" || entry.insect === "grasshopper",
    open: { species: 4, mastery: 3 },
    curated: { species: 9, mastery: 5, rarity: "Episch", rarityCount: 1 },
    master: { species: 16, mastery: 10, rarity: "Legendarisch", rarityCount: 1 }
  },
  {
    id: "water",
    titleKey: "museum.wing.water.title",
    eyebrowKey: "museum.wing.water.eyebrow",
    descriptionKey: "museum.wing.water.description",
    accent: "#6fd1d0",
    tint: "rgba(5, 55, 69, 0.48)",
    matcher: (entry) => waterBugIds.has(entry.id) || /water|juffer|libel|schrijvertje|schaatsenrijder/.test(entry.id),
    open: { species: 3, habitat: "Water", habitatCount: 1 },
    curated: { species: 6, mastery: 5, rarity: "Zeldzaam", rarityCount: 1, habitat: "Water", habitatCount: 2 },
    master: { species: 10, mastery: 10, rarity: "Episch", rarityCount: 1, habitat: "Water", habitatCount: 4 }
  },
  {
    id: "night",
    titleKey: "museum.wing.night.title",
    eyebrowKey: "museum.wing.night.eyebrow",
    descriptionKey: "museum.wing.night.description",
    accent: "#b7b7ff",
    tint: "rgba(18, 16, 67, 0.56)",
    matcher: (entry) => nightBugIds.has(entry.id) || /mot|nacht|kakkerlak|spin|schorpioen|glimworm/.test(entry.id),
    open: { species: 4, mastery: 3, habitat: "Nacht", habitatCount: 1 },
    curated: { species: 8, mastery: 5, rarity: "Episch", rarityCount: 1, habitat: "Nacht", habitatCount: 2 },
    master: { species: 12, mastery: 10, rarity: "Legendarisch", rarityCount: 1, habitat: "Nacht", habitatCount: 4 }
  },
  {
    id: "crawlers",
    titleKey: "museum.wing.crawlers.title",
    eyebrowKey: "museum.wing.crawlers.eyebrow",
    descriptionKey: "museum.wing.crawlers.description",
    accent: "#93d28c",
    tint: "rgba(16, 62, 34, 0.46)",
    matcher: (entry) => entry.insect === "crawler" || entry.insect === "larva",
    open: { species: 4, mastery: 3 },
    curated: { species: 8, mastery: 5, rarity: "Zeldzaam", rarityCount: 1 },
    master: { species: 14, mastery: 10, rarity: "Episch", rarityCount: 2 }
  },
  {
    id: "crown",
    titleKey: "museum.wing.crown.title",
    eyebrowKey: "museum.wing.crown.eyebrow",
    descriptionKey: "museum.wing.crown.description",
    accent: "#f2cf68",
    tint: "rgba(62, 31, 4, 0.52)",
    matcher: () => true,
    open: { species: 20, mastery: 10, rarity: "Legendarisch", rarityCount: 1, wings: 3, wingStage: "open" },
    curated: { species: 35, mastery: 10, masteryCount: 3, rarity: "Legendarisch", rarityCount: 3, wings: 3, wingStage: "curated" },
    master: { species: Math.ceil(bugProgressionCatalog.length * 0.9), mastery: 20, rarity: "Mythisch", rarityCount: 1, wings: 5, wingStage: "master" }
  }
];

export function buildMuseumWings(inventory: BugDexInventoryItem[], masteries: BugMastery[], journalEntries: FieldJournalEntry[]): MuseumWing[] {
  const owned = ownedSpecies(inventory);
  const baseDefinitions = museumWingDefinitions.filter((wing) => wing.id !== "crown");
  const baseWings = baseDefinitions.map((definition) => buildStandardWing(definition, owned, masteries, journalEntries));
  const crownDefinition = museumWingDefinitions.find((wing) => wing.id === "crown")!;
  return [...baseWings, buildCrownWing(crownDefinition, owned, masteries, baseWings)];
}

export function getMuseumWingItems(items: BugDexInventoryItem[], wingId: MuseumWingId): BugDexInventoryItem[] {
  const definition = museumWingDefinitions.find((wing) => wing.id === wingId);
  if (!definition) return [];
  return ownedSpecies(items).filter((item) => {
    const entry = bugEntryById.get(item.bugId);
    return Boolean(entry && definition.matcher(entry));
  });
}

export function getRecentMuseumFinds(items: BugDexInventoryItem[], limit = 3): BugDexInventoryItem[] {
  return ownedSpecies(items)
    .sort((first, second) => second.lastUnlockedAt.localeCompare(first.lastUnlockedAt))
    .slice(0, Math.max(0, limit));
}

export function getNextMuseumGoal(wing: MuseumWing): MuseumGoal | undefined {
  if (wing.stage === "master") return undefined;
  if (wing.stage === "hidden" || wing.stage === "discovered") return wing.goals.find((goal) => goal.stage === "open");
  if (wing.stage === "open") return wing.goals.find((goal) => goal.stage === "curated");
  return wing.goals.find((goal) => goal.stage === "master");
}

export function museumStageRank(stage: MuseumWingStage): number {
  return ["hidden", "discovered", "open", "curated", "master"].indexOf(stage);
}

function buildStandardWing(definition: MuseumWingDefinition, owned: BugDexInventoryItem[], masteries: BugMastery[], journalEntries: FieldJournalEntry[]): MuseumWing {
  const resolvedDefinition = resolveStandardDefinition(definition);
  const items = getMuseumWingItems(owned, definition.id);
  const itemIds = new Set(items.map((item) => item.bugId));
  const relevantMasteries = masteries.filter((item) => itemIds.has(item.bugId));
  const relevantJournal = journalEntries.filter((item) => itemIds.has(item.bugId));
  const goals = buildGoals(resolvedDefinition, items, relevantMasteries, relevantJournal);
  const stage = stageFromGoals(items.length, goals);
  return wingFromDefinition(resolvedDefinition, stage, items.length, goals);
}

function resolveStandardDefinition(definition: MuseumWingDefinition): MuseumWingDefinition {
  const totalSpecies = bugDexEntries.filter((entry) => definition.matcher(entry)).length;
  const openSpecies = Math.min(totalSpecies, 3);
  const curatedSpecies = Math.min(totalSpecies, Math.max(openSpecies, Math.ceil(totalSpecies * 0.35)));
  const masterSpecies = Math.min(totalSpecies, Math.max(curatedSpecies, Math.ceil(totalSpecies * 0.8)));
  return {
    ...definition,
    open: { ...definition.open, fieldCount: 1, species: openSpecies },
    curated: { ...definition.curated, fieldCount: 2, mastery: 5, masteryCount: 3, species: curatedSpecies },
    master: { ...definition.master, fieldCount: 3, mastery: 20, masteryCount: 1, species: masterSpecies }
  };
}

function buildCrownWing(definition: MuseumWingDefinition, owned: BugDexInventoryItem[], masteries: BugMastery[], baseWings: MuseumWing[]): MuseumWing {
  const goals = (["open", "curated", "master"] as MuseumGoalStage[]).map((stage) => ({
    stage,
    requirements: requirementsForTarget(definition[stage], owned, masteries, [], baseWings)
  }));
  const visible = baseWings.some((wing) => museumStageRank(wing.stage) >= museumStageRank("open"));
  const stage = visible ? stageFromGoals(owned.length, goals) : "hidden";
  return wingFromDefinition(definition, stage, owned.length, goals);
}

function buildGoals(definition: MuseumWingDefinition, items: BugDexInventoryItem[], masteries: BugMastery[], journalEntries: FieldJournalEntry[]): MuseumGoal[] {
  return (["open", "curated", "master"] as MuseumGoalStage[]).map((stage) => ({
    stage,
    requirements: requirementsForTarget(definition[stage], items, masteries, journalEntries, [])
  }));
}

function requirementsForTarget(target: MuseumTarget, items: BugDexInventoryItem[], masteries: BugMastery[], journalEntries: FieldJournalEntry[], wings: MuseumWing[]): MuseumRequirement[] {
  const requirements: MuseumRequirement[] = [];
  if (target.species) requirements.push(requirement("species", "◉", "museum.goal.species", items.length, target.species));
  if (target.mastery) {
    const masteryCount = Math.max(1, target.masteryCount ?? 1);
    const current = masteries.filter((item) => item.level >= target.mastery!).length;
    requirements.push(requirement("mastery", "✦", "museum.goal.mastery", current, masteryCount, `Lv.${target.mastery}`));
  }
  if (target.rarity) {
    const required = Math.max(1, target.rarityCount ?? 1);
    const current = items.filter((item) => rarityAtLeast(item, target.rarity!)).length;
    requirements.push(requirement("rarity", "◆", "museum.goal.rarity", current, required, target.rarity));
  }
  if (target.fieldCount) {
    const current = new Set(journalEntries.map((entry) => entry.bugId).filter(Boolean)).size;
    requirements.push(requirement("field", "⌖", "museum.goal.field", current, target.fieldCount));
  }
  if (target.habitat) {
    const required = Math.max(1, target.habitatCount ?? 1);
    const current = journalEntries.filter((item) => item.habitat === target.habitat).length;
    requirements.push(requirement("habitat", target.habitat === "Water" ? "≈" : "☾", "museum.goal.habitat", current, required, target.habitat));
  }
  if (target.wings && target.wingStage) {
    const current = wings.filter((wing) => museumStageRank(wing.stage) >= museumStageRank(target.wingStage!)).length;
    requirements.push(requirement("wings", "⌂", "museum.goal.wings", current, target.wings, target.wingStage));
  }
  return requirements;
}

function stageFromGoals(itemCount: number, goals: MuseumGoal[]): MuseumWingStage {
  if (itemCount <= 0) return "hidden";
  if (!goalComplete(goals.find((goal) => goal.stage === "open"))) return "discovered";
  if (!goalComplete(goals.find((goal) => goal.stage === "curated"))) return "open";
  if (!goalComplete(goals.find((goal) => goal.stage === "master"))) return "curated";
  return "master";
}

function goalComplete(goal?: MuseumGoal): boolean {
  return Boolean(goal && goal.requirements.every((item) => item.complete));
}

function wingFromDefinition(definition: MuseumWingDefinition, stage: MuseumWingStage, itemCount: number, goals: MuseumGoal[]): MuseumWing {
  const nextGoal = stage === "master" ? undefined : stage === "hidden" || stage === "discovered" ? goals[0] : stage === "open" ? goals[1] : goals[2];
  const progress = nextGoal?.requirements.length
    ? nextGoal.requirements.reduce((total, item) => total + Math.min(1, item.current / item.required), 0) / nextGoal.requirements.length
    : 1;
  return {
    id: definition.id,
    titleKey: definition.titleKey,
    eyebrowKey: definition.eyebrowKey,
    descriptionKey: definition.descriptionKey,
    accent: definition.accent,
    tint: definition.tint,
    stage,
    itemCount,
    progress,
    goals
  };
}

function requirement(kind: MuseumRequirementKind, icon: string, labelKey: string, current: number, required: number, detail?: string): MuseumRequirement {
  return { id: `${kind}:${detail ?? ""}`, kind, icon, labelKey, current, required, complete: current >= required, detail };
}

function rarityAtLeast(item: BugDexInventoryItem, minimum: BugDexRarity): boolean {
  const entry = bugEntryById.get(item.bugId);
  const rarity = (entry?.rarity ?? item.rarity) as BugDexRarity;
  return rarityOrder.indexOf(rarity) >= rarityOrder.indexOf(minimum);
}

function ownedSpecies(items: BugDexInventoryItem[]): BugDexInventoryItem[] {
  return items.filter((item) => item.count > 0);
}
