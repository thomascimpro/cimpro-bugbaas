import assert from "node:assert/strict";
import test from "node:test";
import { dailyMissionClaimPayload, isPermanentMissionClaimError } from "./dailyMissionClaimModel.ts";

test("daily mission claim payload matches the Firestore rewardXp schema", () => {
  const payload = dailyMissionClaimPayload({
    claimData: { localDay: "2026-07-27", missionTitle: "mission.dailyDuel", rewardType: "xp" },
    claimId: "daily-v1-duel-play-2026-07-27",
    claimedAt: "2026-07-27T12:00:00.000Z",
    rewardSource: "daily_mission_bonus",
    rewardXp: 10
  });

  assert.deepEqual(payload, {
    localDay: "2026-07-27",
    missionTitle: "mission.dailyDuel",
    rewardType: "xp",
    rewardXp: 10,
    claimedAt: "2026-07-27T12:00:00.000Z",
    id: "daily-v1-duel-play-2026-07-27",
    rewardSource: "daily_mission_bonus"
  });
  assert.equal("awardedPoints" in payload, false);
});

test("permission errors are permanent but transient Firebase errors remain retryable", () => {
  assert.equal(isPermanentMissionClaimError({ code: "permission-denied" }), true);
  assert.equal(isPermanentMissionClaimError({ code: "firestore/permission-denied" }), true);
  assert.equal(isPermanentMissionClaimError(new Error("Missing or insufficient permissions.")), true);
  assert.equal(isPermanentMissionClaimError({ code: "unavailable" }), false);
  assert.equal(isPermanentMissionClaimError(new Error("network timeout")), false);
});
