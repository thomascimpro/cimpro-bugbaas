import assert from "node:assert/strict";
import test from "node:test";
import { missionProgressSummary, movementGoalModel, worldTodayModel } from "./WorldTodayModel.ts";

test("prioritizes claimable movement bugs over normal discovery", () => {
  const model = worldTodayModel({ buddyRewardReady: false, dailyRewardReady: false, movementQueuedBugs: 2, scanAvailable: true, weeklyRewardReady: false });
  assert.equal(model.primaryAction, "claim-movement");
});

test("shows exactly movement, missions and buddy modules", () => {
  const model = worldTodayModel({ buddyRewardReady: false, dailyRewardReady: false, movementQueuedBugs: 0, scanAvailable: true, weeklyRewardReady: false });
  assert.deepEqual(model.modules, ["movement", "missions", "buddy"]);
});

test("uses the actual mission array length and completed count", () => {
  assert.deepEqual(missionProgressSummary([
    { progress: 1, target: 1 },
    { progress: 3, target: 5 },
    { progress: 4, target: 4 },
    { progress: 0, target: 2 }
  ]), { done: 2, total: 4 });
  assert.deepEqual(missionProgressSummary([]), { done: 0, total: 0 });
});

test("formats movement as repeatable 1.5 km goals capped at ten rounds", () => {
  assert.deepEqual(movementGoalModel(0, 1.5), {
    currentLabel: "0 m",
    goalLabel: "1,5 km",
    progress: 0,
    remainingLabel: "Nog 1,5 km"
  });
  assert.deepEqual(movementGoalModel(2, 1.5), {
    currentLabel: "2,0 km",
    goalLabel: "3,0 km",
    progress: 2 / 3,
    remainingLabel: "Nog 1,0 km"
  });
  assert.deepEqual(movementGoalModel(15.8, 1.5), {
    currentLabel: "15,0 km",
    goalLabel: "15,0 km",
    progress: 1,
    remainingLabel: "Doel behaald"
  });
});
