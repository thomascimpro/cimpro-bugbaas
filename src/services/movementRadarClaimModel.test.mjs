import assert from "node:assert/strict";
import test from "node:test";
import { claimEveryMovementRadarReward, movementRadarPendingCount, movementRadarRewardToken, resolveMovementRadarRewardIds } from "./movementRadarClaimModel.mjs";

test("pending radar count includes queued widget bugs and newly earned walking bugs", () => {
  assert.equal(movementRadarPendingCount(2, 3), 5);
});

test("one claim returns every exact queued and newly earned bug in display order", async () => {
  const calls = [];
  const claimed = await claimEveryMovementRadarReward({
    claimFresh: async () => {
      calls.push("fresh");
      return {
        awarded: 2,
        bugIds: ["vlinder", "mier"],
        estimatedKm: 4.5,
        estimatedWeekKm: 12
      };
    },
    claimQueued: async () => {
      calls.push("queued");
      return ["bij", "bij"];
    }
  });

  assert.deepEqual(calls, ["queued", "fresh"]);
  assert.deepEqual(claimed.bugIds, ["bij", "bij", "vlinder", "mier"]);
  assert.equal(claimed.awarded, 4);
  assert.equal(claimed.estimatedKm, 4.5);
  assert.equal(claimed.estimatedWeekKm, 12);
});

test("already claimed widget bugs are not lost when the fresh health claim fails", async () => {
  const claimed = await claimEveryMovementRadarReward({
    claimFresh: async () => { throw new Error("Health Connect unavailable"); },
    claimQueued: async () => ["lieveheersbeestje"]
  });

  assert.deepEqual(claimed.bugIds, ["lieveheersbeestje"]);
  assert.equal(claimed.awarded, 1);
});

test("every radar reward token is independently resolved from the full app pool", () => {
  const picks = ["gewone-wesp", "atlasvlinder", "goliathkever"];
  let index = 0;
  const resolved = resolveMovementRadarRewardIds(
    [movementRadarRewardToken, movementRadarRewardToken, movementRadarRewardToken],
    () => picks[index++]
  );

  assert.deepEqual(resolved, picks);
  assert.equal(index, 3);
});

test("legacy concrete widget rewards remain the exact same bug", () => {
  assert.deepEqual(resolveMovementRadarRewardIds(["mier", movementRadarRewardToken], () => "maanvlinder"), ["mier", "maanvlinder"]);
});
