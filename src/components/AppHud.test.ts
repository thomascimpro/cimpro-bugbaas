import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "../types.ts";
import { compactHudModel, languageFlag } from "./AppHudModel.ts";

function user(totalPoints: number): User {
  return {
    uid: "user-1",
    displayName: "Thomas",
    email: "thomas@example.com",
    totalPoints,
    bugCount: 0,
    title: "",
    badges: []
  };
}

test("clamps negative points and progress", () => {
  const model = compactHudModel(user(-50));
  assert.equal(model.points, 0);
  assert.equal(model.progress, 0);
});

test("keeps progress inside the HUD bar", () => {
  const model = compactHudModel(user(Number.POSITIVE_INFINITY));
  assert.equal(model.points, 0);
  assert.ok(model.progress >= 0);
  assert.ok(model.progress <= 1);
});

test("uses a short fallback name", () => {
  const model = compactHudModel({ ...user(40), displayName: "   " });
  assert.equal(model.displayName, "BugBaas");
});

test("supports legacy users without a display name", () => {
  const legacyUser = { ...user(40), displayName: undefined } as unknown as User;
  const model = compactHudModel(legacyUser);
  assert.equal(model.displayName, "BugBaas");
});

test("shows a flag for every supported language", () => {
  assert.equal(languageFlag("nl"), "🇳🇱");
  assert.equal(languageFlag("en"), "🇬🇧");
  assert.equal(languageFlag("fr"), "🇫🇷");
});
