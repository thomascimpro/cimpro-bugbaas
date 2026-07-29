import assert from "node:assert/strict";
import test from "node:test";
import { buildMasteryTeamChallenge } from "./masteryTeamChallengeModel.ts";

test("tracks only the three active squad bugs across mastery tiers", () => {
  const challenge = buildMasteryTeamChallenge({
    activeSquadIds: ["a", "b", "c"],
    masteryLevels: { a: 20, b: 12, c: 5, reserve: 20 }
  });
  assert.deepEqual(challenge.tiers.map((tier) => ({ current: tier.current, id: tier.id, unlocked: tier.unlocked })), [
    { current: 3, id: "bronze", unlocked: true },
    { current: 2, id: "gold", unlocked: false },
    { current: 1, id: "prismatic", unlocked: false }
  ]);
  assert.equal(challenge.unlockedFrameId, "mastery-squad-bronze");
});

test("three mastery level twenty squad bugs unlock the prismatic frame", () => {
  const challenge = buildMasteryTeamChallenge({ activeSquadIds: ["a", "b", "c"], masteryLevels: { a: 20, b: 20, c: 20 } });
  assert.equal(challenge.complete, true);
  assert.equal(challenge.unlockedFrameId, "mastery-squad-prismatic");
});
