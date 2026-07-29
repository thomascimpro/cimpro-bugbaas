import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceButterflyCatchRun,
  butterflyCatchAccuracy,
  butterflyCatchResult,
  createButterflyCatchRun,
  finishButterflyCatchRun,
  recordButterflyCatch,
  resolveButterflyCatchSwing,
  startButterflyCatchSwing,
} from "./butterflyCatchGameModel.ts";

test("run lasts exactly sixty seconds", () => {
  const started = createButterflyCatchRun(1_000);
  const almostFinished = advanceButterflyCatchRun(started, 60_999);
  const finished = advanceButterflyCatchRun(started, 61_000);

  assert.equal(started.phase, "running");
  assert.equal(almostFinished.phase, "running");
  assert.equal(almostFinished.remainingMs, 1);
  assert.equal(finished.phase, "finished");
  assert.equal(finished.finishReason, "time");
  assert.equal(finished.remainingMs, 0);
});

test("aim-lock catches use movement-weighted points without requiring a swing", () => {
  const run = createButterflyCatchRun(1_000);
  const calm = recordButterflyCatch(run, 1);
  const fast = recordButterflyCatch(calm, 3);

  assert.equal(fast.catches, 2);
  assert.equal(fast.score, 4);
  assert.equal(fast.misses, 0);
});

test("a catch only counts during the capture window", () => {
  const run = createButterflyCatchRun(0);
  const swing = startButterflyCatchSwing(run, 1_000);
  const early = resolveButterflyCatchSwing(swing, { butterflyInsideNet: true, nowMs: 1_100 });
  const valid = resolveButterflyCatchSwing(swing, { butterflyInsideNet: true, nowMs: 1_240 });

  assert.equal(early.catches, 0);
  assert.equal(early.misses, 0);
  assert.equal(valid.catches, 1);
  assert.equal(valid.misses, 0);
  assert.equal(valid.score, 100);
});

test("one swing catches at most one butterfly", () => {
  const run = createButterflyCatchRun(0);
  const swing = startButterflyCatchSwing(run, 1_000);
  const caught = resolveButterflyCatchSwing(swing, { butterflyInsideNet: true, nowMs: 1_240 });
  const duplicate = resolveButterflyCatchSwing(caught, { butterflyInsideNet: true, nowMs: 1_300 });

  assert.equal(caught.catches, 1);
  assert.equal(duplicate.catches, 1);
  assert.equal(duplicate.resolvedSwingId, caught.resolvedSwingId);
});

test("an unresolved swing becomes one miss after the capture window", () => {
  const run = createButterflyCatchRun(0);
  const swing = startButterflyCatchSwing(run, 1_000);
  const miss = resolveButterflyCatchSwing(swing, { butterflyInsideNet: false, nowMs: 1_361 });
  const duplicate = resolveButterflyCatchSwing(miss, { butterflyInsideNet: false, nowMs: 1_500 });

  assert.equal(miss.catches, 0);
  assert.equal(miss.misses, 1);
  assert.equal(duplicate.misses, 1);
});

test("consecutive catches build a capped combo bonus and a miss resets the streak", () => {
  const firstSwing = startButterflyCatchSwing(createButterflyCatchRun(0), 1_000);
  const firstCatch = resolveButterflyCatchSwing(firstSwing, { butterflyInsideNet: true, nowMs: 1_240 });
  const secondSwing = startButterflyCatchSwing(firstCatch, 2_000);
  const secondCatch = resolveButterflyCatchSwing(secondSwing, { butterflyInsideNet: true, nowMs: 2_240 });
  const missedSwing = startButterflyCatchSwing(secondCatch, 3_000);
  const missed = resolveButterflyCatchSwing(missedSwing, { butterflyInsideNet: false, nowMs: 3_361 });

  assert.equal(secondCatch.score, 225);
  assert.equal(secondCatch.bestStreak, 2);
  assert.equal(missed.streak, 0);
  assert.equal(missed.score, 225);
});

test("stopped runs remain distinguishable from completed timed runs", () => {
  const stopped = finishButterflyCatchRun(createButterflyCatchRun(2_000), "stopped");
  const result = butterflyCatchResult(stopped);

  assert.equal(stopped.finishReason, "stopped");
  assert.equal(result.durationMs, 0);
});

test("accuracy rounds to the nearest whole percentage", () => {
  const state = {
    ...createButterflyCatchRun(0),
    catches: 2,
    misses: 1,
  };

  assert.equal(butterflyCatchAccuracy(state), 67);
  assert.equal(butterflyCatchAccuracy(createButterflyCatchRun(0)), 0);
});
