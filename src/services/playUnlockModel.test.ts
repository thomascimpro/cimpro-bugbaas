import assert from "node:assert/strict";
import test from "node:test";
import { arcadeModeUnlockTarget, buildPlayUnlocks } from "./playUnlockModel.ts";

test("unlocks arcade modes in the planned owned-species order with Vleugeljacht always open", () => {
  assert.deepEqual(buildPlayUnlocks(0).unlockedModes, ["butterfly_catch"]);
  assert.deepEqual(buildPlayUnlocks(1).unlockedModes, ["tap_duel", "butterfly_catch"]);
  assert.deepEqual(buildPlayUnlocks(3).unlockedModes, ["tap_duel", "butterfly_catch", "bubble_swarm"]);
  assert.deepEqual(buildPlayUnlocks(5).unlockedModes, ["tap_duel", "web_runner", "butterfly_catch", "bubble_swarm"]);
  assert.deepEqual(buildPlayUnlocks(15).unlockedModes, ["tap_duel", "web_runner", "nest_defense", "butterfly_catch", "bubble_swarm"]);
  assert.deepEqual(buildPlayUnlocks(25).unlockedModes, ["tap_duel", "web_runner", "nest_defense", "bug_glide", "butterfly_catch", "bubble_swarm"]);
  assert.deepEqual(buildPlayUnlocks(30).unlockedModes, ["tap_duel", "web_runner", "nest_defense", "bug_glide", "butterfly_catch", "bug_tower", "bubble_swarm"]);
});

test("unlocks quiz with the first owned species and duel modes at ten", () => {
  assert.equal(buildPlayUnlocks(0).quizUnlocked, false);
  assert.equal(buildPlayUnlocks(1).quizUnlocked, true);
  assert.equal(buildPlayUnlocks(9).duelUnlocked, false);
  assert.equal(buildPlayUnlocks(9).soloCampaignUnlocked, false);
  assert.equal(buildPlayUnlocks(10).duelUnlocked, true);
  assert.equal(buildPlayUnlocks(10).soloCampaignUnlocked, true);
});

test("returns exact goals for every locked mode", () => {
  assert.equal(arcadeModeUnlockTarget("tap_duel"), 1);
  assert.equal(arcadeModeUnlockTarget("bubble_swarm"), 3);
  assert.equal(arcadeModeUnlockTarget("web_runner"), 5);
  assert.equal(arcadeModeUnlockTarget("nest_defense"), 15);
  assert.equal(arcadeModeUnlockTarget("bug_glide"), 20);
  assert.equal(arcadeModeUnlockTarget("butterfly_catch"), 0);
  assert.equal(arcadeModeUnlockTarget("bug_tower"), 30);
});
