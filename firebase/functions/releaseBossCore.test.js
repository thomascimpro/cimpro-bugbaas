const test = require("node:test");
const assert = require("node:assert/strict");
const { releaseBoss, releaseBossProgress, releaseBossShouldAutoAward } = require("./releaseBossCore");

test("boss progress is capped and does not expose participant identities", () => {
  assert.deepEqual(releaseBossProgress(103, 2), {
    bossId: releaseBoss.id, complete: true, contributed: 2, eligibleForReward: true,
    progress: 100, rewardXp: 40, target: 100
  });
});

test("only a verified personal observation makes a completed boss reward eligible", () => {
  assert.equal(releaseBossProgress(100, 0).eligibleForReward, false);
  assert.equal(releaseBossProgress(99, 4).complete, false);
});

test("completed eligible finale rewards auto-award exactly before they are claimed", () => {
  assert.equal(releaseBossShouldAutoAward({ claimed: false, complete: true, eligibleForReward: true, state: "finale" }), true);
  assert.equal(releaseBossShouldAutoAward({ claimed: true, complete: true, eligibleForReward: true, state: "finale" }), false);
  assert.equal(releaseBossShouldAutoAward({ claimed: false, complete: true, eligibleForReward: true, state: "active" }), false);
});

test("malformed counters never become a boss contribution", () => {
  assert.throws(() => releaseBossProgress(-1, 0));
  assert.throws(() => releaseBossProgress(1.5, 0));
});
