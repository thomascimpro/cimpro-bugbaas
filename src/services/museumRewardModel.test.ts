import assert from "node:assert/strict";
import test from "node:test";
import type { BugDexInventoryItem, BugMastery } from "../types.ts";
import type { FieldJournalEntry } from "./fieldJournalService.ts";
import type { MuseumExhibitPlacement } from "./museumPlacementModel.ts";
import { buildMuseumWings, type MuseumWingId } from "../screens/MuseumScreenModel.ts";
import { buildMuseumRewardGoals, museumRewardClaimId, nextMuseumRewardGoal } from "./museumRewardModel.ts";

function item(bugId: string, rarity: BugDexInventoryItem["rarity"] = "Gewoon"): BugDexInventoryItem {
  return { bugId, count: 1, firstUnlockedAt: "2026-07-01T00:00:00.000Z", lastUnlockedAt: "2026-07-01T00:00:00.000Z", rarity, sources: ["test"] };
}

function mastery(bugId: string, level: number): BugMastery {
  return { bugId, level, xp: 0, lifetimeXp: 0, rank: level >= 20 ? "master" : level >= 10 ? "veteran" : "rookie", role: "attack", unlockedSkillIds: [], activeUses: 0, duelUses: 0, soloUses: 0, walkedKm: 0, battleWins: 0, sourceTotals: {}, updatedAt: "2026-07-01T00:00:00.000Z" };
}

function observation(id: string, bugId: string): FieldJournalEntry {
  return { id, scanId: id, observedAt: "2026-07-01T00:00:00.000Z", speciesName: bugId, scientificName: "", bugId, status: "matched", habitat: "Tuin", behavior: "Rustte", confidence: 0.9 };
}

function emptyPlacements(): Record<MuseumWingId, MuseumExhibitPlacement[]> {
  return { beetles: [], wings: [], water: [], night: [], crawlers: [], crown: [] };
}

test("uses stable non-repeatable claim ids", () => {
  assert.equal(museumRewardClaimId("beetles", "open"), "museum:beetles:open");
  assert.equal(museumRewardClaimId("crown", "legend"), "museum:crown:legend");
});

test("new player sees the open reward first", () => {
  const inventory = [item("goudtor")];
  const wings = buildMuseumWings(inventory, [], []);
  const goals = buildMuseumRewardGoals({ wings, placementsByWing: emptyPlacements(), inventory, masteries: [], journalEntries: [], trophyCount: 0 });
  const next = nextMuseumRewardGoal(goals, "beetles");
  assert.equal(next?.milestoneId, "open");
  assert.equal(next?.rewardXp, 15);
  assert.equal(next?.complete, false);
});

test("prestige needs a master room, six displays, four trained bugs, high rarity and three observations", () => {
  const ids = ["goudtor", "snuitkever", "boktor", "mestkever", "neushoornkever", "atlaskever", "herculeskever", "goliathkever", "kniptor", "loopkever", "tijgerkever", "doodgraver", "vliegend-hert", "juweelkever", "gouden-tor", "regenboogmestkever", "giraffekevertje", "glorieuze-scarabee"];
  const inventory = ids.map((id) => item(id, id === "atlaskever" ? "Legendarisch" : "Episch"));
  const masteries = ids.map((id, index) => mastery(id, index < 6 ? 20 : 1));
  const journals = [observation("o1", "goudtor"), observation("o2", "snuitkever"), observation("o3", "boktor")];
  const wings = buildMuseumWings(inventory, masteries, journals).map((wing) => wing.id === "beetles" ? { ...wing, stage: "master" as const } : wing);
  const placements = emptyPlacements();
  placements.beetles = ids.slice(0, 6).map((bugId, index) => ({ bugId, placedAt: "2026-07-01T00:00:00.000Z", slotId: `slot-${index + 1}` }));
  const goals = buildMuseumRewardGoals({ wings, placementsByWing: placements, inventory, masteries, journalEntries: journals, trophyCount: 0 });
  const prestige = goals.find((goal) => goal.wingId === "beetles" && goal.milestoneId === "prestige");
  assert.equal(prestige?.complete, true);
  assert.equal(prestige?.rewardXp, 0);
});

test("Museum Legend remains an endgame target after a large collection", () => {
  const inventory = [item("atlaskever", "Legendarisch")];
  const wings = buildMuseumWings(inventory, [], []);
  const goals = buildMuseumRewardGoals({ wings, placementsByWing: emptyPlacements(), inventory, masteries: [], journalEntries: [], trophyCount: 0 });
  const legend = goals.find((goal) => goal.milestoneId === "legend");
  assert.equal(legend?.complete, false);
  assert.equal(legend?.rewardXp, 0);
});
