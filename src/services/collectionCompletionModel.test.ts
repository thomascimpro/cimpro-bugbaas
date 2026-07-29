import assert from "node:assert/strict";
import test from "node:test";
import type { BugDexInventoryItem } from "../types.ts";
import { bugProgressionCatalog } from "./bugProgressionCatalog.ts";
import { buildCollectionCompletion, crownHallMasterEligible, missingSpeciesRoute } from "./collectionCompletionModel.ts";

function owned(ids: string[]): BugDexInventoryItem[] {
  return ids.map((bugId) => ({
    bugId,
    count: 1,
    firstUnlockedAt: "2026-07-01T10:00:00.000Z",
    lastUnlockedAt: "2026-07-01T10:00:00.000Z",
    rarity: "Gewoon",
    sources: ["test"]
  }));
}

test("reports total and per-route completion from the central catalog", () => {
  const starterIds = bugProgressionCatalog.filter((entry) => entry.acquisition === "starter").map((entry) => entry.bugId);
  const fieldId = bugProgressionCatalog.find((entry) => entry.acquisition === "field")!.bugId;
  const completion = buildCollectionCompletion(owned([...starterIds, fieldId]));

  assert.equal(completion.owned, 4);
  assert.equal(completion.total, bugProgressionCatalog.length);
  assert.equal(completion.byAcquisition.starter.owned, starterIds.length);
  assert.equal(completion.byAcquisition.starter.percent, 100);
  assert.equal(completion.byAcquisition.field.owned, 1);
});

test("lists only missing species and preserves exact acquisition routes", () => {
  const allButOne = bugProgressionCatalog.slice(0, -1);
  const missing = bugProgressionCatalog.at(-1)!;
  const completion = buildCollectionCompletion(owned(allButOne.map((entry) => entry.bugId)));

  assert.deepEqual(completion.missing.map((entry) => entry.bugId), [missing.bugId]);
  assert.equal(completion.missing[0].acquisition, missing.acquisition);
});

test("gives a clear route label for every acquisition profile", () => {
  assert.equal(missingSpeciesRoute("field"), "collection.route.field");
  assert.equal(missingSpeciesRoute("research"), "collection.route.research");
  assert.equal(missingSpeciesRoute("campaign"), "collection.route.campaign");
  assert.equal(missingSpeciesRoute("event"), "collection.route.eventReturn");
  assert.equal(missingSpeciesRoute(bugProgressionCatalog.find((entry) => entry.eventPoolId === "swarm-siege")!), "collection.route.eventSwarm");
  assert.equal(missingSpeciesRoute(bugProgressionCatalog.find((entry) => entry.eventPoolId === "team-hunt")!), "collection.route.eventTeamHunt");
  assert.equal(missingSpeciesRoute(bugProgressionCatalog.find((entry) => entry.eventPoolId === "season-finale")!), "collection.route.eventSeasonFinale");
  assert.equal(missingSpeciesRoute("mythic"), "collection.route.mythic");
});

test("requires ninety percent collection and all five core wings mastered for Crown Hall master", () => {
  assert.equal(crownHallMasterEligible({ completionPercent: 95, masteredCoreWings: 4, coreWingCount: 5 }), false);
  assert.equal(crownHallMasterEligible({ completionPercent: 89, masteredCoreWings: 5, coreWingCount: 5 }), false);
  assert.equal(crownHallMasterEligible({ completionPercent: 90, masteredCoreWings: 5, coreWingCount: 5 }), true);
});
