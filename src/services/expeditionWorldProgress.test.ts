import assert from "node:assert/strict";
import test from "node:test";
import { buildExpeditionRegionProgress, expeditionWorldProgress } from "./expeditionWorldProgress.ts";

const entry = (habitat: "Tuin" | "Water", speciesName: string) => ({
  behavior: "Rustte" as const, bugId: "lieveheersbeestje", confidence: 0.9, habitat, id: habitat, observedAt: "2026-07-21T10:00:00.000Z", scanId: habitat, scientificName: "", speciesName, status: "matched" as const
});

test("builds private biome progress from the latest verified journal entries", () => {
  const progress = expeditionWorldProgress([entry("Water", "Waterjuffer"), entry("Tuin", "Lieveheersbeestje")]);
  assert.equal(progress.unlockedCount, 2);
  assert.equal(progress.nextBiome?.habitat, "Park");
  assert.equal(progress.latestByHabitat.get("Water")?.speciesName, "Waterjuffer");
});

test("builds five region tiers from species, observation days, mastery and Museum progress", () => {
  const entries = [
    { ...entry("Water", "A"), bugId: "waterkever", id: "1", observedAt: "2026-07-20T10:00:00.000Z" },
    { ...entry("Water", "B"), bugId: "schrijvertje", id: "2", observedAt: "2026-07-21T10:00:00.000Z" },
    { ...entry("Water", "C"), bugId: "schaatsenrijder", id: "3", observedAt: "2026-07-22T10:00:00.000Z" }
  ];
  const tier3 = buildExpeditionRegionProgress({
    entries,
    habitat: "Water",
    linkedWingStage: "open",
    masteryLevels: { waterkever: 3 },
    coreSpeciesIds: ["waterkever", "schrijvertje", "schaatsenrijder", "waterjuffer"]
  });
  assert.equal(tier3.tier, 3);
  assert.equal(tier3.uniqueSpecies, 3);
  assert.equal(tier3.observationDays, 3);

  const master = buildExpeditionRegionProgress({
    entries: [...entries, { ...entry("Water", "D"), bugId: "waterjuffer", id: "4", observedAt: "2026-07-23T10:00:00.000Z" }],
    habitat: "Water",
    linkedWingStage: "master",
    masteryLevels: { waterkever: 10 },
    coreSpeciesIds: ["waterkever", "schrijvertje", "schaatsenrijder", "waterjuffer"]
  });
  assert.equal(master.tier, 5);
  assert.equal(master.nextTier, undefined);
});

test("caps small habitats to their actual number of core field species", () => {
  const progress = buildExpeditionRegionProgress({
    entries: [{ ...entry("Tuin", "A"), bugId: "only-bug" }],
    habitat: "Tuin",
    linkedWingStage: "open",
    masteryLevels: {},
    coreSpeciesIds: ["only-bug"]
  });
  assert.equal(progress.tier, 2);
  assert.equal(progress.nextRequirement?.kind, "days-and-mastery");
});

test("does not inflate progress when a habitat has multiple observations", () => {
  const progress = expeditionWorldProgress([entry("Tuin", "Nieuwste vondst"), entry("Tuin", "Oudere vondst")]);
  assert.equal(progress.unlockedCount, 1);
  assert.equal(progress.latestByHabitat.get("Tuin")?.speciesName, "Nieuwste vondst");
});
