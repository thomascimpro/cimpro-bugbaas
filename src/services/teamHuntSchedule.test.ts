import assert from "node:assert/strict";
import test from "node:test";
import { teamHuntWindow } from "./teamHuntSchedule.ts";

test("matches the first monthly Amsterdam weekend", () => {
  assert.equal(teamHuntWindow(new Date("2026-07-03T10:00:00Z"))?.id, "team-hunt-2026-07");
  assert.equal(teamHuntWindow(new Date("2026-07-05T15:59:59Z"))?.active, true);
  assert.equal(teamHuntWindow(new Date("2026-07-10T12:00:00Z"))?.active, false);
});
