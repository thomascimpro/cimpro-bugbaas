import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath, URL as NodeUrl } from "node:url";
import { bugDexSets } from "./bugDexSetService.ts";
import { bugDexEntries } from "./pointsService.ts";
import {
  bugAcquisitionProfiles,
  bugProgressionCatalog,
  bugProgressionDefinitionById,
  legacyOwnershipMigration,
  legacyRewardSourcePolicies,
  museumWingIds
} from "./bugProgressionCatalog.ts";

const require = createRequire(import.meta.url);
const sharedResearchCatalog = require("../../shared/researchCatalog.cjs") as {
  researchBugIds: string[];
  researchTierForBugId: (bugId: string) => number | undefined;
};

const expectedStarterIds = ["lieveheersbeestje", "springspin", "zilvervisje"];
const dutchFieldIds = new Set(
  bugDexSets
    .filter((set) => set.id === "dutch_home" || set.id === "dutch_garden")
    .flatMap((set) => set.bugIds)
);

test("classifies every current BugDex entry exactly once", () => {
  const entryIds = bugDexEntries.map((entry) => entry.id).sort();
  const catalogIds = bugProgressionCatalog.map((definition) => definition.bugId).sort();

  assert.equal(new Set(catalogIds).size, catalogIds.length);
  assert.deepEqual(catalogIds, entryIds);
});

test("every definition has a valid acquisition route, habitat and museum wing", () => {
  for (const definition of bugProgressionCatalog) {
    assert.ok(bugAcquisitionProfiles.includes(definition.acquisition), `${definition.bugId} has an invalid acquisition profile`);
    assert.ok(definition.habitats.length > 0, `${definition.bugId} has no habitat`);
    assert.equal(new Set(definition.habitats).size, definition.habitats.length, `${definition.bugId} repeats a habitat`);
    assert.ok(definition.museumWings.length > 0, `${definition.bugId} has no museum wing`);
    assert.equal(new Set(definition.museumWings).size, definition.museumWings.length, `${definition.bugId} repeats a museum wing`);
    assert.ok(definition.museumWings.every((wing) => museumWingIds.includes(wing)), `${definition.bugId} has an invalid museum wing`);
    assert.equal(definition.verifiedScanUnlock, "exact_species", `${definition.bugId} must remain unlockable by an exact verified scan`);

    if (definition.acquisition === "research") {
      assert.ok(definition.researchTier && definition.researchTier >= 1 && definition.researchTier <= 4, `${definition.bugId} has no valid research tier`);
    } else {
      assert.equal(definition.researchTier, undefined, `${definition.bugId} should not have a research tier`);
    }

    if (definition.acquisition === "campaign") assert.ok(definition.campaignMilestoneId, `${definition.bugId} has no campaign milestone`);
    if (definition.acquisition === "event") assert.ok(definition.eventPoolId, `${definition.bugId} has no event pool`);
    if (definition.acquisition === "mythic") assert.ok(definition.mythicPathId, `${definition.bugId} has no mythic endgame path`);
  }
});

test("keeps starter, field and mythic routes deliberate", () => {
  const starterIds = bugProgressionCatalog
    .filter((definition) => definition.acquisition === "starter")
    .map((definition) => definition.bugId)
    .sort();
  assert.deepEqual(starterIds, expectedStarterIds);

  for (const bugId of dutchFieldIds) {
    assert.equal(bugProgressionDefinitionById(bugId)?.acquisition, "field", `${bugId} should use the field route`);
  }

  for (const entry of bugDexEntries.filter((item) => item.rarity === "Mythisch")) {
    assert.equal(bugProgressionDefinitionById(entry.id)?.acquisition, "mythic", `${entry.id} should use the mythic route`);
  }
});

test("includes active campaign and event pools without parking catalog entries in legacy", () => {
  const activeProfiles = new Set(bugProgressionCatalog.map((definition) => definition.acquisition));
  for (const profile of ["starter", "field", "research", "campaign", "event", "mythic"] as const) {
    assert.ok(activeProfiles.has(profile), `${profile} has no catalog entries`);
  }
  assert.equal(bugProgressionCatalog.some((definition) => definition.acquisition === "legacy"), false);

  assert.deepEqual(
    bugProgressionCatalog.filter((definition) => definition.acquisition === "campaign").map((definition) => definition.bugId).sort(),
    ["atlaskever", "bidsprinkhaan", "hoornaar", "regenboogmestkever", "vliegend-hert"]
  );
  assert.deepEqual(
    bugProgressionCatalog.filter((definition) => definition.eventPoolId === "swarm-siege").map((definition) => definition.bugId).sort(),
    ["reuzen-duizendpoot", "reuzenwaterwants", "zweepschorpioen"]
  );
  assert.deepEqual(
    bugProgressionCatalog.filter((definition) => definition.eventPoolId === "team-hunt").map((definition) => definition.bugId).sort(),
    ["blauwe-ertsbij", "groene-zandloopkever", "smaragdlibel"]
  );
  assert.deepEqual(
    bugProgressionCatalog.filter((definition) => definition.eventPoolId === "season-finale").map((definition) => definition.bugId).sort(),
    ["atlasvlinder", "dobsonvlieg", "gouden-vogelvlinder"]
  );
});

test("keeps the shared Firebase research whitelist in sync with the central catalog", () => {
  const definitions = bugProgressionCatalog.filter((definition) => definition.acquisition === "research");
  assert.deepEqual(sharedResearchCatalog.researchBugIds.slice().sort(), definitions.map((definition) => definition.bugId).sort());
  for (const definition of definitions) {
    assert.equal(sharedResearchCatalog.researchTierForBugId(definition.bugId), definition.researchTier);
  }
});

test("lookup returns the same stable catalog definition", () => {
  const definition = bugProgressionDefinitionById("zilvervisje");
  assert.ok(definition);
  assert.equal(definition, bugProgressionCatalog.find((item) => item.bugId === "zilvervisje"));
  assert.equal(bugProgressionDefinitionById("missing-bug"), undefined);
});

test("documents a migration policy for every legacy BugDex reward source", () => {
  const serviceSource = readFileSync(fileURLToPath(new NodeUrl("./bugDexService.ts", import.meta.url)), "utf8");
  const typeBlock = serviceSource.match(/export type BugDexDropSource =([\s\S]*?);/);
  assert.ok(typeBlock, "BugDexDropSource union was not found");
  const serviceSources = Array.from(typeBlock[1].matchAll(/\|\s*"([^"]+)"/g), (match) => match[1]).sort();

  assert.deepEqual(Object.keys(legacyRewardSourcePolicies).sort(), serviceSources);
  assert.equal(legacyOwnershipMigration.preserveInventory, true);
  assert.equal(legacyOwnershipMigration.preserveMastery, true);
  assert.equal(legacyOwnershipMigration.preserveUnlockHistory, true);
  assert.equal(legacyOwnershipMigration.reclassifyOwnedSpecies, false);
});
