import assert from "node:assert/strict";
import test from "node:test";
import { masteryRewardForActivity, rankedMasteryAssistScale } from "./masteryRewardModel.ts";

test("awards small participation XP and bounded result bonuses", () => {
  assert.deepEqual(masteryRewardForActivity("duel_complete"), { amount: 4, source: "active_squad_duel" });
  assert.deepEqual(masteryRewardForActivity("duel_win"), { amount: 3, source: "duel_win" });
  assert.deepEqual(masteryRewardForActivity("duel_draw"), { amount: 2, source: "duel_draw" });
  assert.deepEqual(masteryRewardForActivity("arcade_complete"), { amount: 4, source: "active_squad_solo" });
  assert.deepEqual(masteryRewardForActivity("campaign_boss"), { amount: 12, source: "boss_defeat" });
  assert.deepEqual(masteryRewardForActivity("duplicate_scan"), { amount: 10, source: "duplicate_unlock" });
});

test("normalizes ranked mastery assistance to a small tactical ceiling", () => {
  assert.equal(rankedMasteryAssistScale(1), 0);
  assert.equal(rankedMasteryAssistScale(5), 0.01);
  assert.equal(rankedMasteryAssistScale(10), 0.02);
  assert.equal(rankedMasteryAssistScale(20), 0.03);
  assert.equal(rankedMasteryAssistScale(999), 0.03);
});
