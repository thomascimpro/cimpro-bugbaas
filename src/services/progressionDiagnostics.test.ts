import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressionDiagnostics } from "./progressionDiagnostics.ts";
import type { ProgressionSnapshot } from "./playerJourneyModel.ts";

const snapshot: ProgressionSnapshot = {
  journey: {
    stage: "ranger",
    ownedSpecies: 25,
    verifiedFieldSpecies: 4,
    masteredSpecies: 1,
    openMuseumWings: 2,
    curatedMuseumWings: 1,
    masteredMuseumWings: 0,
    completedRegions: 1
  },
  museum: {
    openWings: 2,
    curatedWings: 1,
    masteredWings: 0,
    crownStage: "discovered"
  },
  play: {
    unlockedModes: ["tap_duel", "bubble_swarm"],
    featuredMode: "bubble_swarm",
    soloCampaignWave: 3
  }
};

test("returns no diagnostics outside development mode", () => {
  assert.equal(buildProgressionDiagnostics(snapshot, false), undefined);
});

test("returns a compact serializable snapshot in development mode", () => {
  const diagnostics = buildProgressionDiagnostics(snapshot, true);
  assert.deepEqual(diagnostics, {
    stage: "ranger",
    ownedSpecies: 25,
    fieldSpecies: 4,
    museum: "2/1/0",
    featuredMode: "bubble_swarm",
    liveEventState: "none"
  });
  assert.doesNotThrow(() => JSON.stringify(diagnostics));
});
