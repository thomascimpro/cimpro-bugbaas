import assert from "node:assert/strict";
import test from "node:test";
import { legacyRewardPolicy } from "./legacyRewardPolicy.ts";

test("maps small repeatable actions to account XP instead of random species", () => {
  assert.deepEqual(legacyRewardPolicy("profile_view"), { kind: "none", points: 0, researchSource: undefined });
  assert.deepEqual(legacyRewardPolicy("upvote_given"), { kind: "points", points: 2, researchSource: "internal_contribution" });
  assert.deepEqual(legacyRewardPolicy("comment"), { kind: "points", points: 4, researchSource: "internal_contribution" });
  assert.deepEqual(legacyRewardPolicy("status_update"), { kind: "points", points: 5, researchSource: "internal_contribution" });
  assert.deepEqual(legacyRewardPolicy("bug_reported"), { kind: "points", points: 10, researchSource: "internal_contribution" });
  assert.deepEqual(legacyRewardPolicy("bug_fixed"), { kind: "points", points: 12, researchSource: "internal_contribution" });
});

test("keeps collection-defining routes as targeted species rewards", () => {
  for (const source of ["real_bug_scan", "weekly_mission", "solo_campaign_clear", "duel_win", "rank_up"] as const) {
    assert.equal(legacyRewardPolicy(source).kind, "species");
  }
});
