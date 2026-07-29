import type { BugDexInventoryItem, BugMastery, ArcadeMode } from "../types.ts";
import type { FieldJournalEntry } from "./fieldJournalService.ts";
import type { MuseumWing, MuseumWingStage } from "../screens/MuseumScreenModel.ts";
import type { PlayerNextAction } from "./nextActionModel.ts";

export type PlayerJourneyStage = "rookie" | "scout" | "ranger" | "curator" | "master";

export type PlayerJourneySnapshot = {
  stage: PlayerJourneyStage;
  ownedSpecies: number;
  verifiedFieldSpecies: number;
  masteredSpecies: number;
  openMuseumWings: number;
  curatedMuseumWings: number;
  masteredMuseumWings: number;
  completedRegions: number;
  nextAction?: PlayerNextAction;
};

export type ResearchTargetSnapshot = {
  id: string;
  bugId: string;
  progress: number;
  target: number;
  startedAt: string;
  completedAt?: string;
  claimedAt?: string;
};

export type TrackedRegionSnapshot = {
  habitat: string;
  tier: number;
  current: number;
  target: number;
};

export type ProgressionSnapshot = {
  journey: PlayerJourneySnapshot;
  activeResearch?: ResearchTargetSnapshot;
  trackedRegion?: TrackedRegionSnapshot;
  museum: {
    openWings: number;
    curatedWings: number;
    masteredWings: number;
    crownStage: MuseumWingStage;
  };
  play: {
    unlockedModes: ArcadeMode[];
    featuredMode?: ArcadeMode;
    soloCampaignWave: number;
  };
  liveEvent?: {
    eventId: string;
    state: "preview" | "live" | "result";
    endsAt: string;
  };
};

export type PersistedProgressionSnapshot = {
  version: 1;
  updatedAt: string;
  journey: PlayerJourneySnapshot;
  activeResearch?: ResearchTargetSnapshot;
  trackedRegion?: TrackedRegionSnapshot;
};

export type PlayerJourneyInput = {
  inventory: BugDexInventoryItem[];
  masteries: BugMastery[];
  museumWings: MuseumWing[];
  journalEntries: FieldJournalEntry[];
  completedRegions: number;
  nextAction?: PlayerNextAction;
};

export type ProgressionReadResult = {
  source: "current" | "derived";
  snapshot: PersistedProgressionSnapshot;
  requiresWrite: false;
};

const museumStageOrder: MuseumWingStage[] = ["hidden", "discovered", "open", "curated", "master"];

export function buildPlayerJourneySnapshot(input: PlayerJourneyInput): PlayerJourneySnapshot {
  const ownedIds = new Set(input.inventory.filter((item) => item.count > 0).map((item) => item.bugId));
  const verifiedFieldIds = new Set(
    input.journalEntries
      .filter((entry) => entry.status === "matched" && Boolean(entry.bugId) && ownedIds.has(entry.bugId!))
      .map((entry) => entry.bugId!)
  );
  const masteredSpecies = input.masteries.filter((item) => ownedIds.has(item.bugId) && item.level >= 20).length;
  const visibleWings = input.museumWings.filter((wing) => wing.id !== "crown");
  const openMuseumWings = visibleWings.filter((wing) => museumStageAtLeast(wing.stage, "open")).length;
  const curatedMuseumWings = visibleWings.filter((wing) => museumStageAtLeast(wing.stage, "curated")).length;
  const masteredMuseumWings = visibleWings.filter((wing) => museumStageAtLeast(wing.stage, "master")).length;
  const completedRegions = Math.max(0, Math.floor(input.completedRegions));
  const ownedSpecies = ownedIds.size;

  return {
    stage: deriveJourneyStage({ ownedSpecies, masteredSpecies, masteredMuseumWings, completedRegions }),
    ownedSpecies,
    verifiedFieldSpecies: verifiedFieldIds.size,
    masteredSpecies,
    openMuseumWings,
    curatedMuseumWings,
    masteredMuseumWings,
    completedRegions,
    nextAction: input.nextAction
  };
}

export function deriveJourneyStage(input: {
  ownedSpecies: number;
  masteredSpecies: number;
  masteredMuseumWings: number;
  completedRegions: number;
}): PlayerJourneyStage {
  if (input.ownedSpecies >= 160 && input.masteredSpecies >= 3 && input.masteredMuseumWings >= 3 && input.completedRegions >= 5) return "master";
  if (input.ownedSpecies >= 60) return "curator";
  if (input.ownedSpecies >= 15) return "ranger";
  if (input.ownedSpecies >= 3) return "scout";
  return "rookie";
}

export function readProgressionSnapshot(input: {
  current?: PersistedProgressionSnapshot;
  legacyInput: PlayerJourneyInput;
  now?: string;
}): ProgressionReadResult {
  if (isPersistedProgressionSnapshot(input.current)) {
    return {
      source: "current",
      snapshot: input.current,
      requiresWrite: false
    };
  }

  return {
    source: "derived",
    snapshot: {
      version: 1,
      updatedAt: input.now ?? new Date().toISOString(),
      journey: buildPlayerJourneySnapshot(input.legacyInput)
    },
    requiresWrite: false
  };
}

export function buildProgressionSnapshot(input: {
  journey: PlayerJourneySnapshot;
  activeResearch?: ResearchTargetSnapshot;
  trackedRegion?: TrackedRegionSnapshot;
  museumWings: MuseumWing[];
  unlockedModes: ArcadeMode[];
  featuredMode?: ArcadeMode;
  soloCampaignWave: number;
  liveEvent?: ProgressionSnapshot["liveEvent"];
}): ProgressionSnapshot {
  const crown = input.museumWings.find((wing) => wing.id === "crown");
  return {
    journey: input.journey,
    activeResearch: input.activeResearch,
    trackedRegion: input.trackedRegion,
    museum: {
      openWings: input.journey.openMuseumWings,
      curatedWings: input.journey.curatedMuseumWings,
      masteredWings: input.journey.masteredMuseumWings,
      crownStage: crown?.stage ?? "hidden"
    },
    play: {
      unlockedModes: [...new Set(input.unlockedModes)],
      featuredMode: input.featuredMode,
      soloCampaignWave: Math.max(0, Math.floor(input.soloCampaignWave))
    },
    liveEvent: input.liveEvent
  };
}

function museumStageAtLeast(stage: MuseumWingStage, minimum: MuseumWingStage): boolean {
  return museumStageOrder.indexOf(stage) >= museumStageOrder.indexOf(minimum);
}

function isPersistedProgressionSnapshot(value: PersistedProgressionSnapshot | undefined): value is PersistedProgressionSnapshot {
  return Boolean(
    value &&
      value.version === 1 &&
      typeof value.updatedAt === "string" &&
      value.journey &&
      typeof value.journey.ownedSpecies === "number" &&
      typeof value.journey.stage === "string"
  );
}
