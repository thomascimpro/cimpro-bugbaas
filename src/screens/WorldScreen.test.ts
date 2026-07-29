import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { worldActionModel, worldEventCards, worldHotspotModel, worldTodayModules } from "./WorldScreenModel.ts";

const worldScreenSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "WorldScreen.tsx"), "utf8");

test("prioritizes claimable rewards and limits actions to three", () => {
  const actions = worldActionModel({
    activeDailyDiscovery: true,
    activeEvent: true,
    buddyNeedsAction: true,
    claimableReward: true
  });
  assert.equal(actions.length, 3);
  assert.equal(actions[0]?.id, "claim-reward");
});

test("falls back to exploration when no urgent action exists", () => {
  const actions = worldActionModel({
    activeDailyDiscovery: false,
    activeEvent: false,
    buddyNeedsAction: false,
    claimableReward: false
  });
  assert.deepEqual(actions.map((item) => item.id), ["explore"]);
});

test("shows only active contextual hotspots", () => {
  assert.deepEqual(worldHotspotModel({ buddyNeedsAction: false, swarmSiegeActive: false, teamHuntActive: false }), []);
  assert.deepEqual(worldHotspotModel({ buddyNeedsAction: true, swarmSiegeActive: true, teamHuntActive: true }), ["buddy", "swarmSiege", "teamHunt"]);
});

test("today always starts with one primary action and stays limited to three modules", () => {
  assert.deepEqual(
    worldTodayModules({
      buddyActionable: true,
      eventUrgent: true,
      missionsActionable: true,
      movementActionable: true,
      researchVisible: true
    }),
    ["next-action", "research", "event"]
  );
});

test("today hides passive systems and chooses only one contextual secondary module", () => {
  assert.deepEqual(
    worldTodayModules({
      buddyActionable: false,
      eventUrgent: false,
      missionsActionable: true,
      movementActionable: false,
      researchVisible: false
    }),
    ["next-action", "missions"]
  );
  assert.deepEqual(
    worldTodayModules({
      buddyActionable: false,
      eventUrgent: false,
      missionsActionable: false,
      movementActionable: false,
      researchVisible: false
    }),
    ["next-action"]
  );
});

test("events distinguish the Swarm signal preview from upcoming", () => {
  assert.deepEqual(worldEventCards({ swarmActive: false, swarmComplete: false, swarmState: "preview", teamHuntActive: false }), ["swarm-preview"]);
});

test("events always show Swarm Siege as active or upcoming", () => {
  assert.deepEqual(worldEventCards({ swarmActive: true, swarmComplete: false, swarmState: "live", teamHuntActive: false }), ["swarm-live"]);
  assert.deepEqual(worldEventCards({ swarmActive: false, swarmComplete: false, swarmState: "upcoming", teamHuntActive: false }), ["swarm-upcoming"]);
  assert.deepEqual(worldEventCards({ swarmActive: true, swarmComplete: false, swarmState: "live", teamHuntActive: true }), ["swarm-live", "team-hunt"]);
  assert.deepEqual(worldEventCards({ swarmActive: false, swarmComplete: true, swarmState: "result", teamHuntActive: false }), ["swarm-result"]);
});

test("World no longer renders Bug Brain because it does not fit the phone Today layout", () => {
  assert.doesNotMatch(worldScreenSource, /BugBrainScreen|Bug Brain|bugBrainOpen|bugBrainActive/);
});
