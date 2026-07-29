const test = require("node:test");
const assert = require("node:assert/strict");
const {
  swarmSiege,
  swarmSiegeAvailableCharges,
  swarmSiegeDamageForScore,
  swarmSiegeDayId,
  swarmSiegePhase,
  swarmSiegeProgress,
  swarmSiegeRewardForClaim,
  swarmSiegeRewardPool,
  swarmSiegeRewardTier,
  swarmSiegeRunCanResume,
  swarmSiegeRunExpiresAt,
  swarmSiegeSchedule,
  swarmSiegeTargetForActivePlayers,
  validateSwarmSiegeSubmission
} = require("./swarmSiegeCore");

test("uses Amsterdam Friday preview, Saturday live battle and Sunday result window", () => {
  const preview = swarmSiegeSchedule(new Date("2026-07-24T10:00:00.000Z")); // Friday 12:00 CEST
  const live = swarmSiegeSchedule(new Date("2026-07-25T10:00:00.000Z")); // Saturday 12:00 CEST
  const result = swarmSiegeSchedule(new Date("2026-07-25T16:00:00.000Z")); // Saturday 18:00 CEST
  const ended = swarmSiegeSchedule(new Date("2026-07-26T16:00:00.000Z")); // Sunday 18:00 CEST

  assert.equal(preview.state, "preview");
  assert.equal(preview.active, false);
  assert.equal(preview.event.id, "swarm-siege-2026-07-25");
  assert.equal(live.state, "live");
  assert.equal(live.active, true);
  assert.equal(live.event.start.toISOString(), "2026-07-25T10:00:00.000Z");
  assert.equal(live.event.end.toISOString(), "2026-07-25T16:00:00.000Z");
  assert.equal(result.state, "result");
  assert.equal(result.event.resultEnd.toISOString(), "2026-07-26T16:00:00.000Z");
  assert.equal(ended.state, "upcoming");
  assert.equal(ended.next.id, "swarm-siege-2026-08-01");
});

test("unlocks one attack at start and additional attacks at 14:00 and 16:00 Amsterdam", () => {
  const event = swarmSiegeSchedule(new Date("2026-07-25T10:00:00.000Z")).event;
  assert.equal(swarmSiegeAvailableCharges(new Date("2026-07-25T09:59:59.000Z"), event), 0);
  assert.equal(swarmSiegeAvailableCharges(new Date("2026-07-25T10:00:00.000Z"), event), 1);
  assert.equal(swarmSiegeAvailableCharges(new Date("2026-07-25T12:00:00.000Z"), event), 2);
  assert.equal(swarmSiegeAvailableCharges(new Date("2026-07-25T14:00:00.000Z"), event), 3);
  assert.equal(swarmSiegeAvailableCharges(new Date("2026-07-25T16:00:00.000Z"), event), 0);
});

test("attempt day id follows Amsterdam local date", () => {
  assert.equal(swarmSiegeDayId(new Date("2026-07-24T21:59:59.000Z")), "2026-07-24");
  assert.equal(swarmSiegeDayId(new Date("2026-07-24T22:00:00.000Z")), "2026-07-25");
});

test("score damage is bounded to zero through three", () => {
  assert.equal(swarmSiegeDamageForScore(149), 0);
  assert.equal(swarmSiegeDamageForScore(150), 1);
  assert.equal(swarmSiegeDamageForScore(600), 2);
  assert.equal(swarmSiegeDamageForScore(1000), 3);
  assert.throws(() => swarmSiegeDamageForScore(-1), /score is invalid/);
  assert.throws(() => swarmSiegeDamageForScore(25001), /score is invalid/);
});

test("phase boundaries match shared progress", () => {
  assert.equal(swarmSiegePhase(0).modifier, "fast_swarm");
  assert.equal(swarmSiegePhase(30).modifier, "armored_brood");
  assert.equal(swarmSiegePhase(72).modifier, "double_wave");
  assert.equal(swarmSiegePhase(108).modifier, "unstable_core");
});

test("boss target scales for one, five, twenty-five and one hundred recent active players", () => {
  assert.equal(swarmSiegeTargetForActivePlayers(1), 9);
  assert.equal(swarmSiegeTargetForActivePlayers(5), 33);
  assert.equal(swarmSiegeTargetForActivePlayers(25), 153);
  assert.equal(swarmSiegeTargetForActivePlayers(100), 360);
  assert.equal(swarmSiegeTargetForActivePlayers(-10), 9);
});

test("progress caps at the configured target", () => {
  assert.deepEqual(swarmSiegeProgress(999), { complete: true, progress: 120, remaining: 0, target: 120 });
});

test("partial community progress maps to non-zero contributor rewards", () => {
  assert.deepEqual(swarmSiegeRewardTier(1, 120), { id: "participation", rewardXp: 10, progressPercent: 1 });
  assert.equal(swarmSiegeRewardTier(30, 120).id, "bronze");
  assert.equal(swarmSiegeRewardTier(60, 120).id, "silver");
  assert.equal(swarmSiegeRewardTier(90, 120).id, "gold");
  assert.equal(swarmSiegeRewardTier(120, 120).id, "complete");
});

test("an interrupted boss run resumes only while the same server ticket is active", () => {
  assert.equal(swarmSiegeRunCanResume({ activeRunExpiresAtMs: 2000, activeRunId: "run-1", nowMs: 1000, submittedAt: undefined }), true);
  assert.equal(swarmSiegeRunCanResume({ activeRunExpiresAtMs: 1000, activeRunId: "run-1", nowMs: 1000, submittedAt: undefined }), false);
  assert.equal(swarmSiegeRunCanResume({ activeRunExpiresAtMs: 2000, activeRunId: "run-1", nowMs: 1000, submittedAt: "done" }), false);
  assert.equal(swarmSiegeRunCanResume({ activeRunExpiresAtMs: 2000, activeRunId: "", nowMs: 1000, submittedAt: undefined }), false);
});

test("run expiry never extends beyond the six-hour battle end", () => {
  const normal = swarmSiegeRunExpiresAt(new Date("2026-07-25T10:00:00.000Z"), new Date("2026-07-25T16:00:00.000Z"));
  const nearEnd = swarmSiegeRunExpiresAt(new Date("2026-07-25T15:55:00.000Z"), new Date("2026-07-25T16:00:00.000Z"));
  assert.equal(normal.toISOString(), "2026-07-25T10:08:00.000Z");
  assert.equal(nearEnd.toISOString(), "2026-07-25T16:00:00.000Z");
  assert.throws(() => swarmSiegeRunExpiresAt(new Date("2026-07-25T15:59:50.000Z"), new Date("2026-07-25T16:00:00.000Z")), /not enough event time remains/);
});

test("submission requires realistic server elapsed time", () => {
  const createdAt = new Date("2026-07-25T10:00:00.000Z");
  assert.throws(() => validateSwarmSiegeSubmission({ createdAt, now: new Date("2026-07-25T10:00:10.000Z"), score: 600 }), /run duration is invalid/);
  assert.deepEqual(validateSwarmSiegeSubmission({ createdAt, now: new Date("2026-07-25T10:02:30.000Z"), score: 600 }), { damage: 2, elapsedMs: 150000, score: 600 });
  assert.throws(() => validateSwarmSiegeSubmission({ createdAt, now: new Date("2026-07-25T10:09:00.000Z"), score: 600 }), /run duration is invalid/);
});

test("complete Swarm Siege rewards prefer a missing Legendary eventpool bug", () => {
  const reward = swarmSiegeRewardForClaim({
    eventId: "swarm-siege-2026-08-01",
    inventoryByBugId: {
      "reuzen-duizendpoot": {
        bugId: "reuzen-duizendpoot",
        count: 1,
        firstUnlockedAt: "2026-07-01T12:00:00.000Z",
        lastUnlockedAt: "2026-07-01T12:00:00.000Z",
        rarity: "Legendarisch",
        sources: ["legacy"]
      }
    },
    now: "2026-08-02T12:00:00.000Z",
    rewardTierId: "complete",
    uid: "player-a"
  });

  assert.ok(["reuzenwaterwants", "zweepschorpioen"].includes(reward.awardedBugId));
  assert.equal(reward.duplicate, false);
  assert.equal(reward.item.count, 1);
  assert.equal(reward.item.rarity, "Legendarisch");
  assert.deepEqual(reward.item.sources, ["swarm_siege"]);
});

test("non-complete Swarm Siege tiers do not award an eventpool bug", () => {
  assert.equal(swarmSiegeRewardForClaim({
    eventId: "swarm-siege-2026-08-01",
    inventoryByBugId: {},
    now: "2026-08-02T12:00:00.000Z",
    rewardTierId: "gold",
    uid: "player-a"
  }), null);
});

test("Swarm Siege eventpool selection is deterministic and falls back to a duplicate", () => {
  const inventoryByBugId = Object.fromEntries(swarmSiegeRewardPool.map(({ bugId, rarity }) => [bugId, {
    bugId,
    count: 2,
    firstUnlockedAt: "2026-07-01T12:00:00.000Z",
    lastUnlockedAt: "2026-07-01T12:00:00.000Z",
    rarity,
    sources: ["legacy"]
  }]));
  const input = {
    eventId: "swarm-siege-2026-08-01",
    inventoryByBugId,
    now: "2026-08-02T12:00:00.000Z",
    rewardTierId: "complete",
    uid: "player-b"
  };

  const first = swarmSiegeRewardForClaim(input);
  const second = swarmSiegeRewardForClaim(input);

  assert.deepEqual(first, second);
  assert.equal(first.duplicate, true);
  assert.equal(first.item.count, 3);
  assert.ok(first.item.sources.includes("legacy"));
  assert.ok(first.item.sources.includes("swarm_siege"));
});

test("Swarm Siege eventpool contains only the intended Legendary species", () => {
  assert.deepEqual(swarmSiegeRewardPool, [
    { bugId: "reuzen-duizendpoot", rarity: "Legendarisch" },
    { bugId: "reuzenwaterwants", rarity: "Legendarisch" },
    { bugId: "zweepschorpioen", rarity: "Legendarisch" }
  ]);
});

test("event configuration keeps the live battle bounded", () => {
  assert.equal(swarmSiege.gameMode, "nest_defense");
  assert.equal(swarmSiege.maxAttemptsPerEvent, 3);
  assert.equal(swarmSiege.timezone, "Europe/Amsterdam");
});
