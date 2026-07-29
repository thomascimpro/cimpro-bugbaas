import assert from "node:assert/strict";
import test from "node:test";
import { minimumPlatformCenterShift, platformSkipChance, towerJumpVelocity, towerPlatformGap, towerPlatformX, towerScrollSpeed } from "./bugTowerBalance.ts";

test("platforms move visibly sideways instead of stacking above each other", () => {
  const previousX = 22;
  const previousWidth = 56;
  const width = 48;
  const nextX = towerPlatformX(previousX, previousWidth, width, 40, 0.51);
  const previousCenter = previousX + previousWidth / 2;
  const nextCenter = nextX + width / 2;

  assert.ok(Math.abs(nextCenter - previousCenter) >= minimumPlatformCenterShift(40) - 0.01);
});

test("platform placement turns back inward near a screen edge", () => {
  const nextX = towerPlatformX(55, 38, 32, 120, 0.95);
  assert.ok(nextX < 55);
  assert.ok(nextX >= 3.5);
  assert.ok(nextX + 32 <= 96.5);
});

test("missing-step gaps only appear later and grow the vertical jump", () => {
  const earlyNormal = towerPlatformGap(10, 0.5, 0);
  const earlySkipAttempt = towerPlatformGap(10, 0.5, 0);
  const lateNormal = towerPlatformGap(120, 0.5, 1);
  const lateSkip = towerPlatformGap(120, 0.5, 0);

  assert.equal(earlySkipAttempt, earlyNormal);
  assert.ok(lateSkip >= lateNormal + 4);
  assert.ok(platformSkipChance(120) > platformSkipChance(30));
});

test("tower pressure moves upward from the start and keeps accelerating", () => {
  assert.ok(towerScrollSpeed(0, 0) >= 0.016);
  assert.ok(towerScrollSpeed(25, 30_000) > towerScrollSpeed(0, 0));
});

test("a fully charged jump reaches a clearly higher seven-step arc", () => {
  const velocity = Math.abs(towerJumpVelocity(1, 1, false));
  const estimatedHeight = (velocity * velocity) / (2 * 0.145);
  assert.ok(estimatedHeight >= 70);
  assert.ok(estimatedHeight <= 94);
});

test("the green spring creates a clearly stronger mega jump", () => {
  assert.ok(Math.abs(towerJumpVelocity(1, 1, true)) >= Math.abs(towerJumpVelocity(1, 1, false)) + 0.8);
});
