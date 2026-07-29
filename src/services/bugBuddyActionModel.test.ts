import assert from "node:assert/strict";
import test from "node:test";
import { buddyActionAvailability } from "./bugBuddyActionModel.ts";

const action = { id: "adventure" as const, cooldownMs: 12 * 60 * 60 * 1000, energyCost: 34 };

test("blocks every expedition while one Buddy task is active", () => {
  assert.deepEqual(buddyActionAvailability({ activeTask: true, energy: 100, lastStartedAt: 0 }, action, 50_000), {
    ready: false,
    reason: "active_task",
    remainingMs: 0
  });
});

test("shows energy and cooldown reasons without hiding the expedition", () => {
  assert.deepEqual(buddyActionAvailability({ activeTask: false, energy: 20, lastStartedAt: 0 }, action, action.cooldownMs + 1), {
    ready: false,
    reason: "energy",
    remainingMs: 0
  });
  assert.deepEqual(buddyActionAvailability({ activeTask: false, energy: 100, lastStartedAt: 10_000 }, action, 20_000), {
    ready: false,
    reason: "cooldown",
    remainingMs: action.cooldownMs - 10_000
  });
});

test("marks an expedition ready when no task, energy or cooldown blocks it", () => {
  assert.deepEqual(buddyActionAvailability({ activeTask: false, energy: 100, lastStartedAt: 0 }, action, action.cooldownMs + 1), {
    ready: true,
    reason: "ready",
    remainingMs: 0
  });
});
