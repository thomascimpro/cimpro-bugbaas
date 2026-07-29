import assert from "node:assert/strict";
import test from "node:test";
import { rewardSpinSchedule } from "./rewardSpinTiming.ts";

test("ends on the selected rarity", () => {
  const schedule = rewardSpinSchedule(3);
  assert.equal(schedule.at(-1)?.rarityIndex, 3);
});

test("clamps invalid rarity indexes", () => {
  assert.equal(rewardSpinSchedule(99).at(-1)?.rarityIndex, 4);
  assert.equal(rewardSpinSchedule(-2).at(-1)?.rarityIndex, 0);
});
