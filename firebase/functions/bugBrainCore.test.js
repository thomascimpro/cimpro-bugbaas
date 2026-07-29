const assert = require("node:assert/strict");
const test = require("node:test");
const {
  bugBrainAwardedXp,
  bugBrainDailySeed,
  bugBrainStartStatus,
  normalizeBugBrainCorrectAnswers
} = require("./bugBrainCore");

test("bug brain daily seed is stable per user and day", () => {
  assert.equal(bugBrainDailySeed("user-1", "2026-07-26"), bugBrainDailySeed("user-1", "2026-07-26"));
  assert.notEqual(bugBrainDailySeed("user-1", "2026-07-26"), bugBrainDailySeed("user-1", "2026-07-27"));
  assert.notEqual(bugBrainDailySeed("user-1", "2026-07-26"), bugBrainDailySeed("user-2", "2026-07-26"));
});

test("bug brain allows exactly one daily attempt", () => {
  assert.equal(bugBrainStartStatus({ attemptExists: false, claimExists: false }), "available");
  assert.equal(bugBrainStartStatus({ attemptExists: true, claimExists: false }), "attempted");
  assert.equal(bugBrainStartStatus({ attemptExists: false, claimExists: true }), "claimed");
  assert.equal(bugBrainStartStatus({ attemptExists: true, claimExists: true }), "claimed");
});

test("bug brain reward is clamped to ten xp", () => {
  assert.equal(normalizeBugBrainCorrectAnswers(-5), 0);
  assert.equal(normalizeBugBrainCorrectAnswers(4.9), 4);
  assert.equal(normalizeBugBrainCorrectAnswers(99), 10);
  assert.equal(bugBrainAwardedXp(7), 7);
  assert.equal(bugBrainAwardedXp(50), 10);
});
