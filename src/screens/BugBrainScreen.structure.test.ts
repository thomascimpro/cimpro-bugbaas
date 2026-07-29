import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BugBrainScreen.tsx"), "utf8");
const playSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "PlayScreen.tsx"), "utf8");

test("bug brain is a server-backed ten-question daily run", () => {
  assert.match(source, /startBugBrainDailyRun/);
  assert.match(source, /completeBugBrainDailyRun/);
  assert.match(source, /BUG_BRAIN_DAILY_QUESTION_COUNT/);
  assert.match(source, /BUG_BRAIN_QUESTION_DURATION_MS/);
});

test("each question uses a thirty-second timer and manual feedback advance", () => {
  assert.match(source, /setInterval/);
  assert.match(source, /remainingMs/);
  assert.match(source, /timedOut/);
  assert.match(source, /function advanceQuestion/);
  assert.match(source, /copy\.nextQuestion/);
  assert.match(source, /copy\.viewResult/);
  assert.match(source, /VOLGENDE VRAAG/);
  assert.match(source, /RESULTAAT BEKIJKEN/);
  assert.doesNotMatch(source, /FEEDBACK_DURATION_MS|transitionTimerRef/);
});

test("bug brain reports active state so World cannot close an active run", () => {
  assert.match(source, /onActiveChange\?: \(active: boolean\) => void/);
  assert.match(source, /onActiveChange\?\.\(true\)/);
  assert.match(source, /onActiveChange\?\.\(false\)/);
});

test("saving and finished bug brain states always have a direct route back to Arcade", () => {
  assert.match(source, /onExit: \(\) => void/);
  assert.match(source, /runState === "submitting"[\s\S]*onPress=\{onExit\}/);
  assert.match(source, /runState === "finished"[\s\S]*onPress=\{onExit\}/);
  assert.match(source, /backToArcade/);
  assert.match(playSource, /onExit=\{closeBugBrain\}/);
});

test("bug brain has no lives training replay or separate claim button", () => {
  assert.doesNotMatch(source, /lives|streak|Free Play|Vrij spelen|Training mode|Trainen/);
  assert.doesNotMatch(source, /restartRun|playAgain|claimReward|CLAIM .*XP|CLAIMEN/);
});
