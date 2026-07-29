import assert from "node:assert/strict";
import test from "node:test";
import { helpTourSteps } from "./HelpTourOverlayModel.ts";

test("new player tour has five focused visual steps", () => {
  assert.equal(helpTourSteps.length, 5);
  assert.deepEqual(helpTourSteps.map((step) => step.route), ["home", "realBugScan", "duel", "bugdex", "museum"]);
});

test("tour no longer contains obsolete profile movement ranking or settings steps", () => {
  const keys = helpTourSteps.flatMap((step) => [step.titleKey, step.bodyKey]).join(" ");
  assert.equal(/profile|movement|rank|settings|trade|upgrade/i.test(keys), false);
});

test("every step includes multiple bug visuals and a bottom navigation destination", () => {
  for (const step of helpTourSteps) {
    assert.ok(step.bugIds.length >= 2);
    assert.ok(["world", "scan", "play", "collection"].includes(step.destination));
  }
});
