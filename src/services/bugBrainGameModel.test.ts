import assert from "node:assert/strict";
import test from "node:test";
import {
  BUG_BRAIN_DAILY_QUESTION_COUNT,
  BUG_BRAIN_QUESTION_DURATION_MS,
  buildBugBrainRun,
  bugBrainDailyRewardTier,
  bugBrainRewardEntryForTier,
  bugBrainTimedAnswerScore
} from "./bugBrainGameModel.ts";

test("bug brain builds a deterministic ten-question run without duplicates", () => {
  const first = buildBugBrainRun("nl", 42, BUG_BRAIN_DAILY_QUESTION_COUNT);
  const second = buildBugBrainRun("nl", 42, BUG_BRAIN_DAILY_QUESTION_COUNT);
  const otherDay = buildBugBrainRun("nl", 43, BUG_BRAIN_DAILY_QUESTION_COUNT);

  assert.equal(BUG_BRAIN_DAILY_QUESTION_COUNT, 10);
  assert.equal(first.length, 10);
  assert.equal(new Set(first.map((question) => question.id)).size, 10);
  assert.deepEqual(first.map((question) => question.id), second.map((question) => question.id));
  assert.notDeepEqual(first.map((question) => question.id), otherDay.map((question) => question.id));
});

test("every question has exactly thirty seconds and awards one XP only when answered correctly in time", () => {
  assert.equal(BUG_BRAIN_QUESTION_DURATION_MS, 30_000);
  assert.equal(bugBrainTimedAnswerScore(true, 0), 1);
  assert.equal(bugBrainTimedAnswerScore(true, 29_999), 1);
  assert.equal(bugBrainTimedAnswerScore(false, 1_000), 0);
  assert.equal(bugBrainTimedAnswerScore(true, 30_000), 0);
  assert.equal(bugBrainTimedAnswerScore(true, 35_000), 0);
});

test("daily result maps only to existing BugDex tiers", () => {
  assert.equal(bugBrainDailyRewardTier(0), null);
  assert.equal(bugBrainDailyRewardTier(4), null);
  assert.equal(bugBrainDailyRewardTier(5), "Zeldzaam");
  assert.equal(bugBrainDailyRewardTier(7), "Zeldzaam");
  assert.equal(bugBrainDailyRewardTier(8), "Episch");
  assert.equal(bugBrainDailyRewardTier(9), "Episch");
  assert.equal(bugBrainDailyRewardTier(10), "Legendarisch");
  assert.equal(bugBrainDailyRewardTier(99), "Legendarisch");
});

test("tier reward selection always returns a catalog entry of the requested tier", () => {
  assert.equal(bugBrainRewardEntryForTier("Zeldzaam", 10).rarity, "Zeldzaam");
  assert.equal(bugBrainRewardEntryForTier("Episch", 10).rarity, "Episch");
  assert.equal(bugBrainRewardEntryForTier("Legendarisch", 10).rarity, "Legendarisch");
  assert.equal(bugBrainRewardEntryForTier("Episch", 123).id, bugBrainRewardEntryForTier("Episch", 123).id);
});
