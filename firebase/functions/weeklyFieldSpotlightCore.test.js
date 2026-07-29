const assert = require("node:assert/strict");
const test = require("node:test");

let core;
try {
  core = require("./weeklyFieldSpotlightCore");
} catch {
  core = undefined;
}

test("server weekly spotlight matches the client week rotation contract", () => {
  assert.equal(typeof core?.weeklyFieldSpotlight, "function");
  const result = core.weeklyFieldSpotlight(new Date("2026-07-28T12:00:00.000Z"));
  assert.equal(result.weekId, "2026-07-27");
  assert.equal(result.bugIds.length, 3);
  assert.equal(new Set(result.bugIds).size, 3);
});

test("non-target verified observations do not create a weekly reward", () => {
  assert.equal(typeof core?.buildWeeklyFieldSpotlightClaim, "function");
  const result = core.buildWeeklyFieldSpotlightClaim({
    bugId: "niet-in-de-weekselectie",
    date: new Date("2026-07-28T12:00:00.000Z"),
    existingClaim: null,
    existingRewardItem: null,
    now: "2026-07-28T12:00:00.000Z",
    uid: "user-1"
  });
  assert.equal(result.matched, false);
  assert.equal(result.claimed, false);
  assert.equal(result.awardedXp, 0);
  assert.equal(result.rewardBugId, undefined);
});

test("first matching verified observation grants 50 XP and one Epic specimen", () => {
  assert.equal(typeof core?.buildWeeklyFieldSpotlightClaim, "function");
  const spotlight = core.weeklyFieldSpotlight(new Date("2026-07-28T12:00:00.000Z"));
  const result = core.buildWeeklyFieldSpotlightClaim({
    bugId: spotlight.bugIds[0],
    date: new Date("2026-07-28T12:00:00.000Z"),
    existingClaim: null,
    existingRewardItem: null,
    now: "2026-07-28T12:00:00.000Z",
    uid: "user-1"
  });
  assert.equal(result.matched, true);
  assert.equal(result.claimed, true);
  assert.equal(result.duplicate, false);
  assert.equal(result.awardedXp, 50);
  assert.ok(core.weeklyFieldSpotlightEpicPool.includes(result.rewardBugId));
  assert.equal(result.rewardItem.rarity, "Episch");
  assert.equal(result.rewardItem.count, 1);
});

test("an existing weekly claim makes matching retries idempotent", () => {
  assert.equal(typeof core?.buildWeeklyFieldSpotlightClaim, "function");
  const spotlight = core.weeklyFieldSpotlight(new Date("2026-07-28T12:00:00.000Z"));
  const result = core.buildWeeklyFieldSpotlightClaim({
    bugId: spotlight.bugIds[1],
    date: new Date("2026-07-29T12:00:00.000Z"),
    existingClaim: { awardedBugId: "citroenvlinder", awardedXp: 50 },
    existingRewardItem: { bugId: "citroenvlinder", count: 1, rarity: "Episch" },
    now: "2026-07-29T12:00:00.000Z",
    uid: "user-1"
  });
  assert.equal(result.matched, true);
  assert.equal(result.claimed, false);
  assert.equal(result.duplicate, true);
  assert.equal(result.awardedXp, 0);
  assert.equal(result.rewardBugId, "citroenvlinder");
});
