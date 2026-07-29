import assert from "node:assert/strict";
import test from "node:test";
import { advanceMomentum, momentumSegmentsForUser } from "./momentumModel.ts";

test("momentum advances once per active day and never decays after a gap", () => {
  const first = advanceMomentum({ cycle: 0, lastActiveDay: "2026-07-20", segments: 2 }, "2026-07-24");
  assert.deepEqual(first, { changed: true, completedCycle: false, cycle: 0, lastActiveDay: "2026-07-24", segments: 3 });
  assert.deepEqual(advanceMomentum(first, "2026-07-24"), { ...first, changed: false });
});

test("fifth active day completes a cycle and the next active day starts at one", () => {
  const completed = advanceMomentum({ cycle: 0, lastActiveDay: "2026-07-23", segments: 4 }, "2026-07-24");
  assert.deepEqual(completed, { changed: true, completedCycle: true, cycle: 1, lastActiveDay: "2026-07-24", segments: 5 });
  assert.deepEqual(advanceMomentum(completed, "2026-07-25"), { changed: true, completedCycle: false, cycle: 1, lastActiveDay: "2026-07-25", segments: 1 });
});

test("legacy users start with zero safe segments", () => {
  assert.equal(momentumSegmentsForUser({}), 0);
  assert.equal(momentumSegmentsForUser({ momentumSegments: 99 }), 5);
});
