import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const towerSource = readFileSync(join(directory, "BugTowerGame.tsx"), "utf8");
const swarmSource = readFileSync(join(directory, "BubbleSwarmGame.tsx"), "utf8");
const runnerSource = readFileSync(join(directory, "WebRunnerGame.tsx"), "utf8");
const glideSource = readFileSync(join(directory, "BugGlideGame.tsx"), "utf8");
const nestSource = readFileSync(join(directory, "NestDefenseGame.tsx"), "utf8");
const rulesSource = readFileSync(join(directory, "..", "..", "..", "firestore.rules"), "utf8");

test("Bug Tower ends on a fall instead of a timer or score cap", () => {
  assert.doesNotMatch(towerSource, /maxDurationMs/);
  assert.doesNotMatch(towerSource, /Math\.min\(50000/);
  assert.match(towerSource, /nextPlayer\.y - playerHalfHeight > 105/);
  assert.match(towerSource, /Survive until you fall/);
});

test("Bubble Swarm ends at the danger row and keeps raising pressure", () => {
  assert.doesNotMatch(swarmSource, /maxDurationMs/);
  assert.doesNotMatch(swarmSource, /Math\.min\(50000/);
  assert.match(swarmSource, /bubble\.row >= dangerRow/);
  assert.match(swarmSource, /elapsed >= 180000/);
  assert.match(swarmSource, /2200, 8200/);
});

test("Bubble Swarm only serves colors still present on the board", () => {
  assert.match(swarmSource, /activeKindsForBoard\(boardRef\.current/);
  assert.match(swarmSource, /nextShotKind\([^\n]+activeKinds/);
  assert.doesNotMatch(swarmSource, /activeKindCount\(elapsed\)/);
});

test("Bubble Swarm advances a level after clearing the board and adds one color", () => {
  assert.match(swarmSource, /if \(nextBoard\.length === 0\)/);
  assert.match(swarmSource, /startNextLevel/);
  assert.match(swarmSource, /Math\.min\(allKinds\.length, baseLevelKindCount \+ level - 1\)/);
  assert.match(swarmSource, /Level \$\{level\}/);
});

test("active movement games use frame delta while Nest Defense keeps its 2.10.19 balance tick", () => {
  assert.match(towerSource, /const tickMs = 16;/);
  assert.match(runnerSource, /const tickMs = 16;/);
  assert.match(glideSource, /const tickMs = 16;/);
  assert.match(nestSource, /const tickMs = 90;/);
  assert.match(towerSource, /frameScaleForTick/);
  assert.match(runnerSource, /frameScaleForTick/);
  assert.match(glideSource, /frameScaleForTick/);
  assert.doesNotMatch(nestSource, /frameScaleForTick/);
  assert.match(towerSource, /startArcadeFrameLoop\(tick\)/);
  assert.match(runnerSource, /startArcadeFrameLoop\(tick\)/);
  assert.match(glideSource, /startArcadeFrameLoop\(tick\)/);
  assert.doesNotMatch(nestSource, /startArcadeFrameLoop\(tick\)/);
  assert.doesNotMatch(towerSource, /setInterval\(tick/);
  assert.doesNotMatch(runnerSource, /setInterval\(tick/);
  assert.doesNotMatch(glideSource, /setInterval\(tick/);
  assert.match(nestSource, /setInterval\(tick, tickMs\)/);
  assert.doesNotMatch(towerSource, /const frameScale = tickMs \/ simulationStepMs;/);
  assert.doesNotMatch(runnerSource, /const frameScale = tickMs \/ simulationStepMs;/);
  assert.doesNotMatch(glideSource, /const frameScale = tickMs \/ simulationStepMs;/);
  assert.doesNotMatch(nestSource, /const frameScale = tickMs \/ simulationStepMs;/);
});

test("ranked arcade games remove the title bar while the game is running", () => {
  for (const source of [towerSource, swarmSource, runnerSource, glideSource, nestSource]) {
    assert.match(source, /!\(ranked && state === "running"\)/);
  }
});

test("Bug Glide and Bug Tower use faster responsive simulation steps", () => {
  assert.match(glideSource, /const simulationStepMs = 66;/);
  assert.match(towerSource, /const simulationStepMs = 20;/);
});

test("Bug Tower controls react immediately to taps", () => {
  assert.match(towerSource, /unstable_pressDelay=\{0\}/);
  assert.match(towerSource, /const horizontalAcceleration = 0\.035;/);
  assert.match(towerSource, /const maxHorizontalSpeed = 0\.6;/);
});

test("Firestore accepts bounded long survival runs", () => {
  assert.match(rulesSource, /request\.resource\.data\.score <= 100000000/);
  assert.match(rulesSource, /request\.resource\.data\.durationMs <= 21600000/);
  assert.match(rulesSource, /request\.resource\.data\.score <= 50000/);
  assert.match(rulesSource, /mode in \['bug_tower', 'bubble_swarm'\]/);
  assert.match(rulesSource, /request\.resource\.data\.localHighScore >= request\.resource\.data\.score/);
});
