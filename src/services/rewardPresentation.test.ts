import assert from "node:assert/strict";
import test from "node:test";
import { shouldPresentBugDexDropImmediately, shouldPresentPointDropAsForegroundCatch, shouldShowRewardSpin } from "./rewardPresentation.ts";

test("point rewards never pretend to be a BugDex catch", () => {
  assert.equal(shouldPresentBugDexDropImmediately("daily_mission_bonus"), false);
  assert.equal(shouldPresentPointDropAsForegroundCatch("daily_mission_bonus"), false);
  assert.equal(shouldPresentPointDropAsForegroundCatch("weekly_mission"), false);
});

test("ordinary activity drops keep the roaming catch presentation", () => {
  assert.equal(shouldPresentBugDexDropImmediately("comment"), false);
  assert.equal(shouldPresentBugDexDropImmediately("bug_reported"), false);
});

test("confirmed real bug scans also use the foreground catch before their receipt", () => {
  assert.equal(shouldPresentBugDexDropImmediately("real_bug_scan"), false);
});

test("every reward goes straight to the source-labelled discovery screen", () => {
  assert.equal(shouldShowRewardSpin("daily_mission_bonus"), false);
  assert.equal(shouldShowRewardSpin("weekly_mission_rare"), false);
  assert.equal(shouldShowRewardSpin("duel_win"), false);
  assert.equal(shouldShowRewardSpin("rank_up"), false);
});

test("fixed-rarity and known-species rewards skip the casino presentation", () => {
  assert.equal(shouldShowRewardSpin("combine"), false);
  assert.equal(shouldShowRewardSpin("buddy_common"), false);
  assert.equal(shouldShowRewardSpin("buddy_rare"), false);
  assert.equal(shouldShowRewardSpin("buddy_epic"), false);
  assert.equal(shouldShowRewardSpin("weekly_mission_common"), false);
  assert.equal(shouldShowRewardSpin("weekly_mission_epic"), false);
  assert.equal(shouldShowRewardSpin("solo_boss_common"), false);
  assert.equal(shouldShowRewardSpin("daily_login"), false);
  assert.equal(shouldShowRewardSpin("real_bug_scan"), false);
});
