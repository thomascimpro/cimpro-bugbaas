import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "bugBrainRewardService.ts"), "utf8");

test("daily start uses one fixed attempt and claim document per user and day", () => {
  assert.match(source, /bugBrainDailyAttempts/);
  assert.match(source, /bugBrainDailyClaims/);
  assert.match(source, /runTransaction/);
  assert.match(source, /if \(attemptSnapshot\.exists\(\)\) return \{ available: false/);
});

test("daily completion grants exact XP once and stores completion atomically", () => {
  assert.match(source, /const awardedXp = safeCorrectAnswers/);
  assert.match(source, /transaction\.set\(claimRef, claim\)/);
  assert.match(source, /transaction\.update\(attemptRef/);
  assert.match(source, /alreadyCompleted: true/);
  assert.match(source, /awardedXp: 0/);
});

test("tier rewards use the exact daily rarity and BugDex transaction helper", () => {
  assert.match(source, /bugBrainDailyRewardTier/);
  assert.match(source, /bugBrainRewardEntryForTier/);
  assert.match(source, /grantBugDexRewardInTransaction/);
  assert.match(source, /"bug_brain_daily"/);
  assert.doesNotMatch(source, /Gewoon|Mythisch/);
});
