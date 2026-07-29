import assert from "node:assert/strict";
import test from "node:test";
import { carrySoloCampaignProgressIntoWeek } from "./soloCampaignProgressModel.ts";

test("a new week refills lives without deleting unlocked campaign waves", () => {
  assert.deepEqual(carrySoloCampaignProgressIntoWeek({
    lives: 1,
    updatedAt: "2026-07-19T10:00:00.000Z",
    wave: 13,
    weekId: "2026-W29"
  }, "2026-W30", "2026-07-20T10:00:00.000Z"), {
    lives: 3,
    updatedAt: "2026-07-20T10:00:00.000Z",
    wave: 13,
    weekId: "2026-W30"
  });
});

test("current week progress stays unchanged", () => {
  const current = { lives: 2, updatedAt: "2026-07-24T10:00:00.000Z", wave: 7, weekId: "2026-W30" };
  assert.deepEqual(carrySoloCampaignProgressIntoWeek(current, "2026-W30", "2026-07-24T11:00:00.000Z"), current);
});
