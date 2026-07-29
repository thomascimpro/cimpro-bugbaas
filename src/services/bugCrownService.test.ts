import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath, URL as NodeUrl } from "node:url";
import { bugCrownPowerMultiplier, bugCrownProgress, bugCrownRank, completedPveBattleBugIds, pveDamageWithCrown, stablePveBattleEventId } from "./bugCrownService.ts";

test("only Mythic bugs can reach crown ranks at exact boundaries", () => {
  assert.equal(bugCrownRank("Legendarisch", 20, 500), "none");
  assert.equal(bugCrownRank("Mythisch", 7, 25), "none");
  assert.equal(bugCrownRank("Mythisch", 8, 24), "none");
  assert.equal(bugCrownRank("Mythisch", 8, 25), "crowned");
  assert.equal(bugCrownRank("Mythisch", 11, 75), "elite");
  assert.equal(bugCrownRank("Mythisch", 14, 150), "master");
  assert.equal(bugCrownRank("Mythisch", 17, 300), "legend");
});

test("crown multipliers are exact and capped", () => {
  assert.equal(bugCrownPowerMultiplier("none"), 1);
  assert.equal(bugCrownPowerMultiplier("crowned"), 1.025);
  assert.equal(bugCrownPowerMultiplier("elite"), 1.05);
  assert.equal(bugCrownPowerMultiplier("master"), 1.075);
  assert.equal(bugCrownPowerMultiplier("legend"), 1.1);
  assert.equal(pveDamageWithCrown(10, 1.4, true), 11);
  assert.equal(pveDamageWithCrown(10, 1.4, false), 10);
});

test("old mastery documents normalize battleWins to zero", () => {
  const masterySource = readFileSync(fileURLToPath(new NodeUrl("./bugMasteryService.ts", import.meta.url)), "utf8");
  assert.match(masterySource, /battleWins:\s*Math\.max\(0,\s*Math\.floor\(Number\(value\.battleWins \?\? 0\) \|\| 0\)\)/);
});

test("PvE win registration ignores losses, duplicates and unused squad bugs", () => {
  assert.deepEqual(completedPveBattleBugIds({ battleId: "wave-1", kind: "solo", won: false, usedSquadIds: ["a", "b"] }), []);
  const duplicateEvent = stablePveBattleEventId("solo", "wave-1", "a");
  assert.deepEqual(
    completedPveBattleBugIds({ battleId: "wave-1", kind: "solo", won: true, usedSquadIds: ["a", "a", "b"], seenEventIds: new Set([duplicateEvent]) }),
    ["b"]
  );
});

test("crown progress exposes the next target and completed legend", () => {
  const progress = bugCrownProgress("Mythisch", 8, 25);
  assert.equal(progress.next?.rank, "elite");
  assert.equal(progress.levelReady, false);
  assert.equal(progress.winsReady, false);
  assert.equal(bugCrownProgress("Mythisch", 8, 100).next?.rank, "elite");
  assert.equal(bugCrownProgress("Mythisch", 17, 300).complete, true);
  assert.equal(bugCrownProgress("Episch", 20, 500).next, null);
});
