import type { MuseumWingStage } from "../screens/MuseumScreenModel";
import type { FieldJournalEntry, FieldJournalHabitat } from "./fieldJournalService";

export const expeditionHabitats: readonly FieldJournalHabitat[] = ["Tuin", "Park", "Water", "Nacht", "Kantoor", "Binnen"];

export type ExpeditionBiome = {
  habitat: FieldJournalHabitat;
  subtitle: string;
  symbol: string;
  tone: "moss" | "water" | "amber" | "violet" | "slate" | "coral";
};

export const expeditionBiomes: ExpeditionBiome[] = [
  { habitat: "Tuin", subtitle: "Hedges and flower borders", symbol: "01", tone: "moss" },
  { habitat: "Park", subtitle: "The open meadow route", symbol: "02", tone: "amber" },
  { habitat: "Water", subtitle: "Reed banks and reflections", symbol: "03", tone: "water" },
  { habitat: "Nacht", subtitle: "The after-dark lantern path", symbol: "04", tone: "violet" },
  { habitat: "Kantoor", subtitle: "Small worlds at work", symbol: "05", tone: "slate" },
  { habitat: "Binnen", subtitle: "The hidden indoor biome", symbol: "06", tone: "coral" }
];

export type ExpeditionRegionRequirement = {
  kind: "first-observation" | "species" | "days-and-mastery" | "curated-set" | "master-set";
  current: number;
  target: number;
};

export type ExpeditionRegionProgress = {
  habitat: FieldJournalHabitat;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  nextTier?: 1 | 2 | 3 | 4 | 5;
  uniqueSpecies: number;
  observationDays: number;
  verifiedObservations: number;
  linkedWingStage: MuseumWingStage;
  coreSpeciesTarget: number;
  nextRequirement?: ExpeditionRegionRequirement;
};

export type ExpeditionWorldProgress = {
  discoveredHabitats: Set<FieldJournalHabitat>;
  latestByHabitat: Map<FieldJournalHabitat, FieldJournalEntry>;
  nextBiome: ExpeditionBiome | undefined;
  unlockedCount: number;
};

export function expeditionWorldProgress(entries: FieldJournalEntry[]): ExpeditionWorldProgress {
  const latestByHabitat = new Map<FieldJournalHabitat, FieldJournalEntry>();
  for (const entry of entries) {
    if (!expeditionHabitats.includes(entry.habitat) || latestByHabitat.has(entry.habitat)) continue;
    latestByHabitat.set(entry.habitat, entry);
  }
  const discoveredHabitats = new Set(latestByHabitat.keys());
  return {
    discoveredHabitats,
    latestByHabitat,
    nextBiome: expeditionBiomes.find((biome) => !discoveredHabitats.has(biome.habitat)),
    unlockedCount: discoveredHabitats.size
  };
}

export function buildExpeditionRegionProgress(input: {
  habitat: FieldJournalHabitat;
  entries: FieldJournalEntry[];
  masteryLevels: Record<string, number>;
  linkedWingStage: MuseumWingStage;
  coreSpeciesIds: readonly string[];
}): ExpeditionRegionProgress {
  const regionEntries = input.entries.filter((entry) => entry.status === "matched" && entry.habitat === input.habitat);
  const uniqueSpeciesIds = new Set(regionEntries.map((entry) => entry.bugId).filter((id): id is string => Boolean(id)));
  const observationDays = new Set(regionEntries.map((entry) => localDay(entry.observedAt))).size;
  const coreSpecies = [...new Set(input.coreSpeciesIds)];
  const coreSpeciesTarget = Math.max(1, coreSpecies.length);
  const uniqueCoreSpecies = coreSpecies.filter((bugId) => uniqueSpeciesIds.has(bugId)).length;
  const maxMastery = Math.max(0, ...Array.from(uniqueSpeciesIds).map((bugId) => input.masteryLevels[bugId] ?? 0));
  const tier2Target = Math.min(3, coreSpeciesTarget);
  const tier4Target = Math.max(1, Math.ceil(coreSpeciesTarget * 0.6));

  let tier: ExpeditionRegionProgress["tier"] = 0;
  if (regionEntries.length >= 1) tier = 1;
  if (uniqueCoreSpecies >= tier2Target) tier = 2;
  if (tier >= 2 && observationDays >= 3 && maxMastery >= 3) tier = 3;
  if (tier >= 3 && uniqueCoreSpecies >= tier4Target && stageAtLeast(input.linkedWingStage, "curated")) tier = 4;
  if (tier >= 4 && uniqueCoreSpecies >= coreSpeciesTarget && maxMastery >= 10 && stageAtLeast(input.linkedWingStage, "master")) tier = 5;

  return {
    habitat: input.habitat,
    tier,
    nextTier: tier < 5 ? (tier + 1) as 1 | 2 | 3 | 4 | 5 : undefined,
    uniqueSpecies: uniqueSpeciesIds.size,
    observationDays,
    verifiedObservations: regionEntries.length,
    linkedWingStage: input.linkedWingStage,
    coreSpeciesTarget,
    nextRequirement: nextRegionRequirement({ tier, regionEntries: regionEntries.length, uniqueCoreSpecies, observationDays, maxMastery, tier2Target, tier4Target, coreSpeciesTarget, wingStage: input.linkedWingStage })
  };
}

function nextRegionRequirement(input: {
  tier: ExpeditionRegionProgress["tier"];
  regionEntries: number;
  uniqueCoreSpecies: number;
  observationDays: number;
  maxMastery: number;
  tier2Target: number;
  tier4Target: number;
  coreSpeciesTarget: number;
  wingStage: MuseumWingStage;
}): ExpeditionRegionRequirement | undefined {
  if (input.tier === 0) return { kind: "first-observation", current: input.regionEntries, target: 1 };
  if (input.tier === 1) return { kind: "species", current: input.uniqueCoreSpecies, target: input.tier2Target };
  if (input.tier === 2) return { kind: "days-and-mastery", current: Math.min(input.observationDays, 3) + Math.min(input.maxMastery, 3), target: 6 };
  if (input.tier === 3) return { kind: "curated-set", current: Math.min(input.uniqueCoreSpecies, input.tier4Target) + (stageAtLeast(input.wingStage, "curated") ? 1 : 0), target: input.tier4Target + 1 };
  if (input.tier === 4) return { kind: "master-set", current: Math.min(input.uniqueCoreSpecies, input.coreSpeciesTarget) + Math.min(input.maxMastery, 10) + (stageAtLeast(input.wingStage, "master") ? 1 : 0), target: input.coreSpeciesTarget + 11 };
  return undefined;
}

function stageAtLeast(stage: MuseumWingStage, minimum: MuseumWingStage): boolean {
  const order: MuseumWingStage[] = ["hidden", "discovered", "open", "curated", "master"];
  return order.indexOf(stage) >= order.indexOf(minimum);
}

function localDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
