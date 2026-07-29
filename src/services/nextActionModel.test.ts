import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerNextAction } from "./nextActionModel.ts";

test("prioritizes incomplete onboarding before all other actions", () => {
  const action = buildPlayerNextAction({
    onboarding: { step: "place-first-exhibit", current: 0, target: 1 },
    pendingReceiptCount: 2,
    liveEvent: { state: "live", minutesRemaining: 30 },
    activeResearch: { progress: 95, target: 100 },
    trackedRegion: { current: 2, target: 3 },
    featuredModeAvailable: true
  });

  assert.equal(action.id, "complete-onboarding");
  assert.equal(action.destination, "collection");
  assert.equal(action.progressCurrent, 0);
  assert.equal(action.progressTarget, 1);
});

test("reveals a pending reward before non-onboarding progress", () => {
  const action = buildPlayerNextAction({
    pendingReceiptCount: 2,
    liveEvent: { state: "live", minutesRemaining: 30 },
    activeResearch: { progress: 95, target: 100 },
    trackedRegion: { current: 2, target: 3 },
    featuredModeAvailable: true
  });

  assert.equal(action.id, "reveal-reward");
  assert.equal(action.destination, "world");
  assert.equal(action.progressCurrent, 2);
  assert.equal(action.progressTarget, 2);
});

test("prioritizes a live boss only when it ends within two hours", () => {
  const urgent = buildPlayerNextAction({
    liveEvent: { state: "live", minutesRemaining: 119 },
    activeResearch: { progress: 95, target: 100 },
    featuredModeAvailable: true
  });
  assert.equal(urgent.id, "join-live-event");

  const notUrgent = buildPlayerNextAction({
    liveEvent: { state: "live", minutesRemaining: 180 },
    activeResearch: { progress: 95, target: 100 },
    featuredModeAvailable: true
  });
  assert.equal(notUrgent.id, "continue-research");
});

test("uses research, expedition and featured play in fixed fallback order", () => {
  assert.equal(buildPlayerNextAction({ activeResearch: { progress: 75, target: 100 }, trackedRegion: { current: 1, target: 3 }, featuredModeAvailable: true }).id, "continue-research");
  assert.equal(buildPlayerNextAction({ activeResearch: { progress: 20, target: 100 }, trackedRegion: { current: 1, target: 3 }, featuredModeAvailable: true }).id, "continue-expedition");
  assert.equal(buildPlayerNextAction({ featuredModeAvailable: true }).id, "play-featured");
  assert.equal(buildPlayerNextAction({}).id, "explore");
});

test("every action exposes action, reason, reward and progress keys", () => {
  const action = buildPlayerNextAction({ activeResearch: { progress: 80, target: 100 } });
  assert.ok(action.titleKey.length > 0);
  assert.ok(action.reasonKey.length > 0);
  assert.ok(action.rewardKey.length > 0);
  assert.equal(action.progressCurrent, 80);
  assert.equal(action.progressTarget, 100);
  assert.ok(action.priority > 0);
});
