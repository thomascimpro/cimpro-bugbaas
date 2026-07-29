import assert from "node:assert/strict";
import test from "node:test";
import { bugProgressionCatalog } from "./bugProgressionCatalog.ts";
import { buildCollectionCompletion } from "./collectionCompletionModel.ts";
import { buildPlayerNextAction } from "./nextActionModel.ts";
import { deriveJourneyStage } from "./playerJourneyModel.ts";
import { buildPlayUnlocks } from "./playUnlockModel.ts";
import type { BugDexInventoryItem } from "../types.ts";

function inventory(count: number): BugDexInventoryItem[] {
  return bugProgressionCatalog.slice(0, count).map((definition, index) => ({
    bugId: definition.bugId,
    count: 1,
    firstUnlockedAt: `2026-07-${String((index % 24) + 1).padStart(2, "0")}T10:00:00.000Z`,
    lastUnlockedAt: `2026-07-${String((index % 24) + 1).padStart(2, "0")}T10:00:00.000Z`,
    rarity: "Gewoon",
    sources: ["starter"]
  }));
}

test("new player persona starts as a focused Rookie with only the linked web game available", () => {
  assert.equal(deriveJourneyStage({ ownedSpecies: 0, masteredSpecies: 0, masteredMuseumWings: 0, completedRegions: 0 }), "rookie");
  assert.deepEqual(buildPlayUnlocks(0).unlockedModes, ["butterfly_catch"]);
  assert.equal(buildPlayerNextAction({ onboarding: { current: 0, step: "choose-starter", target: 1 } }).id, "complete-onboarding");
});

test("early persona with five species is a Scout with three native choices and the linked web game", () => {
  const unlocks = buildPlayUnlocks(5);
  assert.equal(deriveJourneyStage({ ownedSpecies: 5, masteredSpecies: 0, masteredMuseumWings: 0, completedRegions: 0 }), "scout");
  assert.deepEqual(new Set(unlocks.unlockedModes), new Set(["tap_duel", "bubble_swarm", "web_runner", "butterfly_catch"]));
  assert.equal(unlocks.duelUnlocked, false);
});

test("mid persona with forty species is a Ranger with all play modes and Duel", () => {
  const unlocks = buildPlayUnlocks(40);
  assert.equal(deriveJourneyStage({ ownedSpecies: 40, masteredSpecies: 0, masteredMuseumWings: 1, completedRegions: 1 }), "ranger");
  assert.equal(unlocks.unlockedModes.length, 7);
  assert.equal(unlocks.duelUnlocked, true);
  assert.equal(unlocks.soloCampaignUnlocked, true);
});

test("late persona with one hundred fifty species is a Curator with a visible missing-species route", () => {
  const completion = buildCollectionCompletion(inventory(150));
  assert.equal(deriveJourneyStage({ ownedSpecies: 150, masteredSpecies: 2, masteredMuseumWings: 2, completedRegions: 3 }), "curator");
  assert.equal(completion.owned, 150);
  assert.ok(completion.missing.length > 0);
  assert.ok(completion.missing.every((definition) => Boolean(definition.acquisition)));
});

test("complete persona reaches Master only with collection, mastery, Museum and regions together", () => {
  const completion = buildCollectionCompletion(inventory(bugProgressionCatalog.length));
  assert.equal(completion.percent, 100);
  assert.equal(completion.missing.length, 0);
  assert.equal(deriveJourneyStage({
    ownedSpecies: bugProgressionCatalog.length,
    masteredSpecies: 3,
    masteredMuseumWings: 5,
    completedRegions: 5
  }), "master");
});
