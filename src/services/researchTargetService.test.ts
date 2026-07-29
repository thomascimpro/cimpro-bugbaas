import assert from "node:assert/strict";
import test from "node:test";
import type { BugDexInventoryItem } from "../types.ts";
import { bugProgressionCatalog } from "./bugProgressionCatalog.ts";
import {
  buildResearchTargetOptions,
  researchProgressAmount,
  type ResearchTargetContext
} from "./researchTargetModel.ts";

function owned(...bugIds: string[]): BugDexInventoryItem[] {
  return bugIds.map((bugId) => ({
    bugId,
    count: 1,
    firstUnlockedAt: "2026-07-01T10:00:00.000Z",
    lastUnlockedAt: "2026-07-01T10:00:00.000Z",
    rarity: "Gewoon",
    sources: ["test"]
  }));
}

test("returns three missing research species and never offers owned or non-research entries", () => {
  const options = buildResearchTargetOptions({
    inventory: owned("schuimcicade", "mierenleeuw", "lieveheersbeestje"),
    stage: "ranger",
    rotationKey: "2026-W30"
  });

  assert.equal(options.length, 3);
  assert.ok(options.every((option) => option.acquisition === "research"));
  assert.ok(options.every((option) => !["schuimcicade", "mierenleeuw", "lieveheersbeestje"].includes(option.bugId)));
});

test("prioritizes active habitat, museum wing and incomplete set without making the result random", () => {
  const context: ResearchTargetContext = {
    activeHabitat: "Water",
    activeMuseumWing: "water",
    incompleteSetBugIds: ["waterjuffer", "libel", "gaasvlieg"]
  };
  const first = buildResearchTargetOptions({ inventory: [], stage: "ranger", rotationKey: "same-key", context });
  const second = buildResearchTargetOptions({ inventory: [], stage: "ranger", rotationKey: "same-key", context });

  assert.deepEqual(first, second);
  assert.ok(first.every((option) => option.habitats.includes("Water") || option.museumWings.includes("water")));
  assert.ok(first.some((option) => context.incompleteSetBugIds?.includes(option.bugId)));
});

test("caps research tiers for early players and opens all tiers for curators", () => {
  const scout = buildResearchTargetOptions({ inventory: [], stage: "scout", rotationKey: "tier-check", limit: 84 });
  const curator = buildResearchTargetOptions({ inventory: [], stage: "curator", rotationKey: "tier-check", limit: bugProgressionCatalog.length });

  assert.ok(scout.every((option) => (option.researchTier ?? 4) <= 2));
  assert.ok(curator.some((option) => option.researchTier === 4));
});

test("returns all remaining options near completion instead of duplicates", () => {
  const researchIds = bugProgressionCatalog.filter((entry) => entry.acquisition === "research").map((entry) => entry.bugId);
  const missing = researchIds.slice(-2);
  const inventory = owned(...researchIds.filter((id) => !missing.includes(id)));

  const options = buildResearchTargetOptions({ inventory, stage: "master", rotationKey: "near-complete" });

  assert.deepEqual(new Set(options.map((option) => option.bugId)), new Set(missing));
});

test("uses bounded research progress values including the five-day Momentum bonus", () => {
  assert.equal(researchProgressAmount("verified_scan"), 40);
  assert.equal(researchProgressAmount("internal_contribution"), 25);
  assert.equal(researchProgressAmount("play_completion"), 20);
  assert.equal(researchProgressAmount("daily_route"), 15);
  assert.equal(researchProgressAmount("momentum_cycle"), 25);
});
