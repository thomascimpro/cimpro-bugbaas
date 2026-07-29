import assert from "node:assert/strict";
import test from "node:test";
import type { BugDexInventoryItem, BugMastery } from "../types.ts";
import type { FieldJournalEntry } from "./fieldJournalService.ts";
import type { MuseumWing } from "../screens/MuseumScreenModel.ts";
import {
  buildPlayerJourneySnapshot,
  readProgressionSnapshot,
  type PersistedProgressionSnapshot
} from "./playerJourneyModel.ts";

function inventory(count: number): BugDexInventoryItem[] {
  return Array.from({ length: count }, (_, index) => ({
    bugId: `bug-${index + 1}`,
    count: 1,
    firstUnlockedAt: "2026-07-01T10:00:00.000Z",
    lastUnlockedAt: "2026-07-01T10:00:00.000Z",
    rarity: "Gewoon",
    sources: ["test"]
  }));
}

function masteries(levels: number[]): BugMastery[] {
  return levels.map((level, index) => ({
    bugId: `bug-${index + 1}`,
    level,
    xp: 0,
    lifetimeXp: level * 100,
    rank: level >= 20 ? "master" : level >= 15 ? "elite" : level >= 10 ? "veteran" : level >= 5 ? "skilled" : level >= 3 ? "trained" : "rookie",
    role: "attack",
    unlockedSkillIds: [],
    activeUses: 0,
    duelUses: 0,
    soloUses: 0,
    walkedKm: 0,
    battleWins: 0,
    sourceTotals: {},
    updatedAt: "2026-07-01T10:00:00.000Z"
  }));
}

function wing(id: MuseumWing["id"], stage: MuseumWing["stage"]): MuseumWing {
  return {
    id,
    stage,
    titleKey: `museum.${id}.title`,
    eyebrowKey: `museum.${id}.eyebrow`,
    descriptionKey: `museum.${id}.description`,
    accent: "#fff",
    tint: "#000",
    itemCount: 1,
    progress: 1,
    goals: []
  };
}

function fieldEntry(id: string, bugId: string): FieldJournalEntry {
  return {
    id,
    scanId: id,
    observedAt: "2026-07-01T10:00:00.000Z",
    speciesName: bugId,
    scientificName: "",
    bugId,
    status: "matched",
    habitat: "Tuin",
    behavior: "Rustte",
    confidence: 0.9
  };
}

test("derives rookie, scout, ranger and curator stages from owned species", () => {
  assert.equal(buildPlayerJourneySnapshot({ inventory: inventory(1), masteries: [], museumWings: [], journalEntries: [], completedRegions: 0 }).stage, "rookie");
  assert.equal(buildPlayerJourneySnapshot({ inventory: inventory(3), masteries: [], museumWings: [], journalEntries: [], completedRegions: 0 }).stage, "scout");
  assert.equal(buildPlayerJourneySnapshot({ inventory: inventory(15), masteries: [], museumWings: [], journalEntries: [], completedRegions: 0 }).stage, "ranger");
  assert.equal(buildPlayerJourneySnapshot({ inventory: inventory(60), masteries: [], museumWings: [], journalEntries: [], completedRegions: 0 }).stage, "curator");
});

test("requires collection and proven endgame progress before assigning master", () => {
  const notMaster = buildPlayerJourneySnapshot({
    inventory: inventory(170),
    masteries: masteries([20, 20]),
    museumWings: [wing("beetles", "master"), wing("wings", "master")],
    journalEntries: [],
    completedRegions: 4
  });
  assert.equal(notMaster.stage, "curator");

  const master = buildPlayerJourneySnapshot({
    inventory: inventory(170),
    masteries: masteries([20, 20, 20]),
    museumWings: [wing("beetles", "master"), wing("wings", "master"), wing("water", "master")],
    journalEntries: [],
    completedRegions: 5
  });
  assert.equal(master.stage, "master");
});

test("counts unique owned, verified field, mastery and museum progress", () => {
  const snapshot = buildPlayerJourneySnapshot({
    inventory: [...inventory(4), { ...inventory(1)[0], count: 0 }],
    masteries: masteries([20, 5, 20]),
    museumWings: [wing("beetles", "open"), wing("wings", "curated"), wing("water", "master"), wing("crown", "hidden")],
    journalEntries: [fieldEntry("scan-1", "bug-1"), fieldEntry("scan-2", "bug-1"), fieldEntry("scan-3", "bug-2")],
    completedRegions: 2
  });

  assert.equal(snapshot.ownedSpecies, 4);
  assert.equal(snapshot.verifiedFieldSpecies, 2);
  assert.equal(snapshot.masteredSpecies, 2);
  assert.equal(snapshot.openMuseumWings, 3);
  assert.equal(snapshot.curatedMuseumWings, 2);
  assert.equal(snapshot.masteredMuseumWings, 1);
  assert.equal(snapshot.completedRegions, 2);
});

test("dual-read prefers a valid current snapshot without mutating either input", () => {
  const legacyInput = {
    inventory: inventory(4),
    masteries: masteries([5]),
    museumWings: [wing("beetles", "open")],
    journalEntries: [fieldEntry("scan-1", "bug-1")],
    completedRegions: 1
  };
  const current: PersistedProgressionSnapshot = {
    version: 1,
    updatedAt: "2026-07-24T08:00:00.000Z",
    journey: {
      stage: "ranger",
      ownedSpecies: 25,
      verifiedFieldSpecies: 5,
      masteredSpecies: 1,
      openMuseumWings: 2,
      curatedMuseumWings: 1,
      masteredMuseumWings: 0,
      completedRegions: 1
    }
  };
  const beforeLegacy = JSON.stringify(legacyInput);
  const beforeCurrent = JSON.stringify(current);

  const result = readProgressionSnapshot({ current, legacyInput });

  assert.equal(result.source, "current");
  assert.equal(result.snapshot, current);
  assert.equal(result.requiresWrite, false);
  assert.equal(JSON.stringify(legacyInput), beforeLegacy);
  assert.equal(JSON.stringify(current), beforeCurrent);
});

test("dual-read derives an in-memory snapshot when no current record exists", () => {
  const result = readProgressionSnapshot({
    current: undefined,
    legacyInput: {
      inventory: inventory(15),
      masteries: [],
      museumWings: [],
      journalEntries: [],
      completedRegions: 0
    }
  });

  assert.equal(result.source, "derived");
  assert.equal(result.snapshot.version, 1);
  assert.equal(result.snapshot.journey.stage, "ranger");
  assert.equal(result.requiresWrite, false);
});
