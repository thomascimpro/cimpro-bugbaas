import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

test("Bug Brain attempts are owner-only and can complete only once", () => {
  assert.match(rules, /match \/bugBrainDailyAttempts\/\{dayId\}/);
  assert.match(rules, /resource\.data\.status == 'active'/);
  assert.match(rules, /request\.resource\.data\.status == 'completed'/);
  assert.match(rules, /allow delete: if false/);
});

test("Bug Brain XP exactly equals the number of correct answers", () => {
  assert.match(rules, /request\.resource\.data\.awardedXp == request\.resource\.data\.correctAnswers/);
  assert.match(rules, /totalPoints == get\([^\n]+\)\.data\.totalPoints \+ request\.resource\.data\.awardedXp/);
  assert.match(rules, /correctAnswers <= 10/);
});

test("Bug Brain accepts only the three existing reward tiers at their score thresholds", () => {
  assert.match(rules, /correctAnswers >= 5/);
  assert.match(rules, /correctAnswers <= 7/);
  assert.match(rules, /rewardTier == 'Zeldzaam'/);
  assert.match(rules, /correctAnswers >= 8/);
  assert.match(rules, /correctAnswers <= 9/);
  assert.match(rules, /rewardTier == 'Episch'/);
  assert.match(rules, /correctAnswers == 10/);
  assert.match(rules, /rewardTier == 'Legendarisch'/);
  assert.doesNotMatch(rules.match(/match \/bugBrainDailyClaims[\s\S]*?allow update, delete: if false;/)?.[0] ?? "", /rewardTier == 'Gewoon'|rewardTier == 'Mythisch'/);
});

test("claimed BugDex document must match the stored tier and source", () => {
  assert.match(rules, /\.data\.rarity == request\.resource\.data\.rewardTier/);
  assert.match(rules, /\.data\.sources\.hasAny\(\['bug_brain_daily'\]\)/);
});
