import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

const appSource = readFileSync(fileURLToPath(new URL("../../App.tsx", import.meta.url)), "utf8");

test("foreground bug rewards are available across every signed-in route", () => {
  assert.doesNotMatch(appSource, /foregroundBugRoutes/);
  assert.match(appSource, /const foregroundBugEnabled = foregroundUiClear;/);
  assert.match(appSource, /const forcedForegroundRewardEnabled = foregroundUiClear && foregroundRewardPending;/);
  assert.match(appSource, /enabled=\{foregroundBugEnabled \|\| forcedForegroundRewardEnabled\}/);
});

test("every claimed daily queues its points behind a tappable foreground bug", () => {
  assert.match(appSource, /shouldPresentPointDropAsForegroundCatch\(drop\.source\)/);
  assert.match(appSource, /daily-foreground-/);
  assert.match(appSource, /preGrantedDrop: drop/);
  assert.match(appSource, /pendingReward\.preGrantedDrop\.rewardType === "bug"/);
});
