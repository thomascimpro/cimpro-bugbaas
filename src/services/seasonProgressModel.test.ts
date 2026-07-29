import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSeasonTrophy } from "./seasonProgressModel.ts";

test("normalizes a claimed season finale into a stable Crown Hall trophy", () => {
  assert.deepEqual(normalizeSeasonTrophy("guardian-season-1", {
    awardedXp: 75.9,
    bossId: "guardian-season-1",
    claimedAt: "2026-07-24T10:00:00.000Z",
    seasonId: "season-2026-05-11"
  }), {
    awardedXp: 75,
    bossId: "guardian-season-1",
    claimedAt: "2026-07-24T10:00:00.000Z",
    seasonId: "season-2026-05-11"
  });
});

test("rejects incomplete claim documents", () => {
  assert.equal(normalizeSeasonTrophy("missing", { awardedXp: 75 }), null);
});
