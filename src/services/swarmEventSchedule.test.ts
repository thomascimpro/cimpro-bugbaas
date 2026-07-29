import assert from "node:assert/strict";
import test from "node:test";
import { swarmEventCountdownTarget, swarmEventPhaseProgress, swarmEventTimeline } from "./swarmEventSchedule.ts";

test("maps preview live result and upcoming to the correct countdown target", () => {
  const base = {
    endsAt: "2026-07-25T16:00:00.000Z",
    nextStartsAt: "2026-08-01T10:00:00.000Z",
    resultEndsAt: "2026-07-26T16:00:00.000Z",
    startsAt: "2026-07-25T10:00:00.000Z"
  };
  assert.equal(swarmEventCountdownTarget({ ...base, state: "preview" }), base.startsAt);
  assert.equal(swarmEventCountdownTarget({ ...base, state: "live" }), base.endsAt);
  assert.equal(swarmEventCountdownTarget({ ...base, state: "result" }), base.resultEndsAt);
  assert.equal(swarmEventCountdownTarget({ ...base, state: "upcoming" }), base.nextStartsAt);
});

test("shows three Amsterdam attack charge moments inside the live window", () => {
  assert.deepEqual(swarmEventTimeline("2026-07-25T10:00:00.000Z"), [
    "2026-07-25T10:00:00.000Z",
    "2026-07-25T12:00:00.000Z",
    "2026-07-25T14:00:00.000Z"
  ]);
});

test("phase progress stays bounded and exposes the remaining phase share", () => {
  assert.deepEqual(swarmEventPhaseProgress(70, 120, "armor_break"), {
    eventProgress: 58,
    phaseEnd: 60,
    phaseProgress: 94,
    phaseStart: 25
  });
  assert.equal(swarmEventPhaseProgress(999, 120, "unstable_core").eventProgress, 100);
});
