import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bugDexSetBadgeBugIds, bugDexSetById, bugDexSets } from "./bugDexSetService.ts";
import { bugDexEntries, bugDexFacts, isBugDexEntryUnlocked } from "./pointsService.ts";

const newBugIds = [
  "papiervisje",
  "ovenvisje",
  "bedwants",
  "varenrouwmug",
  "trips",
  "spintmijt",
  "wolluis",
  "schildluis",
  "grote-huisspin",
  "trilspin",
  "klein-koolwitje",
  "klein-geaderd-witje",
  "citroenvlinder",
  "bont-zandoogje",
  "icarusblauwtje",
  "kleine-vos",
  "landkaartje",
  "boomblauwtje",
  "springstaart",
  "miljoenpoot",
  "kelderpissebed",
  "oprolpissebed",
  "buxusmot",
  "buxusrups",
  "leliehaantje",
  "engerling",
  "emelt",
  "gamma-uil",
  "huismoeder",
  "agaatvlinder",
  "windevedermot",
  "jakobsvlinder",
  "jakobsvlinderrups",
  "distelvlinder",
  "groot-koolwitje",
  "hooibeestje",
  "koevinkje",
  "geelpoothoornaar",
  "daas",
  "stadsreus",
  "bijvlieg",
  "rosse-metselbij",
  "blauwzwarte-houtbij",
  "gewone-wolfspin",
  "venstersectorspin",
  "grote-wegslak",
  "segrijnslak",
  "regenworm"
] as const;

const newBugIdSet = new Set<string>(newBugIds);
const newEntries = bugDexEntries.filter((entry) => newBugIdSet.has(entry.id));
const unusedAssetBugIds = [
  "broodkever",
  "gewone-houtwormkever",
  "gewone-kogelspin",
  "kruipende-kogelspin",
  "nachtkaardespin",
  "argusvlinder"
] as const;
const unusedAssetBugIdSet = new Set<string>(unusedAssetBugIds);
const unusedAssetEntries = bugDexEntries.filter((entry) => unusedAssetBugIdSet.has(entry.id));
const julyAssetBugIds = ["spaanse-vlag", "weidebeekjuffer", "steenhommel", "muskusboktor", "eikenpage"] as const;
const europeanBumblebeeIds = ["aardhommel", "akkerhommel", "boomhommel", "heidehommel", "tuinhommel", "weidehommel", "veldhommel"] as const;
const checkerboardArtPaths = [
  "../../assets/new bugs/cropped/mosquito.png",
  "../../assets/new bugs/cropped/earwig.png",
  "../../assets/new bugs/cropped/whitefly.png",
  "../../assets/new bugs/cropped/clothes-moth.png",
  "../../assets/new bugs/cropped/indianmeal-moth.png",
  "../../assets/new bugs/cropped/blow-fly.png",
  "../../assets/new bugs/cropped/varied-carpet-beetle.png",
  "../../assets/new bugs/cropped/cockroach.png",
  "../../assets/new bugs/cropped/flea.png",
  "../../assets/bugdex/aardhommel.webp",
  "../../assets/bugdex/weidehommel.webp"
] as const;

function sourceContainsArtMapping(source: string, bugId: string): boolean {
  return source.includes(`"${bugId}": require(`);
}

test("adds exactly 48 unique drop-only scan entries", () => {
  assert.equal(newBugIds.length, 48);
  assert.equal(new Set(newBugIds).size, 48);
  assert.equal(newEntries.length, 48);
  assert.ok(newEntries.every((entry) => entry.unlockMode === "drop"));
  assert.ok(newEntries.every((entry) => !isBugDexEntryUnlocked(entry, { totalPoints: 999999, bugCount: 999999 })));
  assert.equal(isBugDexEntryUnlocked(bugDexEntries[0], { totalPoints: 0, bugCount: 0 }), true);
});

test("keeps the approved rarity distribution and adds no Mythic entry", () => {
  const counts = Object.fromEntries(["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"].map((rarity) => [
    rarity,
    newEntries.filter((entry) => entry.rarity === rarity).length
  ]));

  assert.deepEqual(counts, {
    Gewoon: 13,
    Zeldzaam: 16,
    Episch: 13,
    Legendarisch: 6,
    Mythisch: 0
  });
});

test("provides a fact and an art mapping for every new entry", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");

  for (const bugId of newBugIds) {
    assert.ok(bugDexFacts[bugId], `Missing fact for ${bugId}`);
    assert.ok(sourceContainsArtMapping(bugArtSource, bugId), `Missing art mapping for ${bugId}`);
  }
});

test("places every new entry in a Dutch home or garden filter", () => {
  const homeSet = bugDexSetById("dutch_home");
  const gardenSet = bugDexSetById("dutch_garden");

  assert.ok(homeSet);
  assert.ok(gardenSet);
  const categorizedIds = new Set([...homeSet.bugIds, ...gardenSet.bugIds]);

  for (const bugId of newBugIds) {
    assert.ok(categorizedIds.has(bugId), `Missing Dutch category for ${bugId}`);
  }
});

test("does not add new entries to existing badge requirements", () => {
  const badgeSets = bugDexSets.filter((set) => set.badgeId);
  assert.ok(badgeSets.length > 0);

  for (const set of badgeSets) {
    const badgeIds = bugDexSetBadgeBugIds(set);
    assert.ok(badgeIds.length > 0, `Empty badge requirements for ${set.id}`);
    assert.ok(badgeIds.every((bugId) => !newBugIdSet.has(bugId)), `New bug leaked into badge ${set.id}`);
  }
});

test("registers six previously unused named insect assets as drop-only entries", () => {
  assert.equal(unusedAssetEntries.length, unusedAssetBugIds.length);
  assert.ok(unusedAssetEntries.every((entry) => entry.unlockMode === "drop"));
  assert.deepEqual(
    Object.fromEntries(["Gewoon", "Zeldzaam", "Episch"].map((rarity) => [
      rarity,
      unusedAssetEntries.filter((entry) => entry.rarity === rarity).length
    ])),
    { Gewoon: 2, Zeldzaam: 2, Episch: 2 }
  );
});

test("connects every reused asset to art, facts and a home or garden filter", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");
  const homeSet = bugDexSetById("dutch_home");
  const gardenSet = bugDexSetById("dutch_garden");
  assert.ok(homeSet);
  assert.ok(gardenSet);
  const categorizedIds = new Set([...homeSet.bugIds, ...gardenSet.bugIds]);

  for (const bugId of unusedAssetBugIds) {
    assert.ok(sourceContainsArtMapping(bugArtSource, bugId), `Missing art mapping for ${bugId}`);
    assert.ok(bugDexFacts[bugId], `Missing fact for ${bugId}`);
    assert.ok(categorizedIds.has(bugId), `Missing Dutch category for ${bugId}`);
  }
});

test("registers five selected July assets as balanced drop-only BugDex entries", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");
  const entries = julyAssetBugIds.map((bugId) => bugDexEntries.find((entry) => entry.id === bugId));
  const gardenIds = new Set(bugDexSetById("dutch_garden")?.bugIds ?? []);

  assert.ok(entries.every(Boolean));
  assert.ok(entries.every((entry) => entry?.unlockMode === "drop"));
  assert.deepEqual(entries.map((entry) => entry?.rarity), ["Episch", "Episch", "Zeldzaam", "Legendarisch", "Episch"]);

  for (const bugId of julyAssetBugIds) {
    assert.ok(sourceContainsArtMapping(bugArtSource, bugId), `Missing art mapping for ${bugId}`);
    assert.ok(bugDexFacts[bugId], `Missing fact for ${bugId}`);
    assert.ok(gardenIds.has(bugId), `Missing Dutch garden category for ${bugId}`);
  }
});

test("registers seven recognizable European bumblebees without changing badge requirements", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");
  const gardenIds = new Set(bugDexSetById("dutch_garden")?.bugIds ?? []);
  const entries = europeanBumblebeeIds.map((bugId) => bugDexEntries.find((entry) => entry.id === bugId));

  assert.ok(entries.every(Boolean));
  assert.ok(entries.every((entry) => entry?.unlockMode === "drop"));
  assert.deepEqual(entries.map((entry) => entry?.rarity), ["Gewoon", "Gewoon", "Zeldzaam", "Zeldzaam", "Episch", "Episch", "Zeldzaam"]);

  for (const bugId of europeanBumblebeeIds) {
    assert.ok(sourceContainsArtMapping(bugArtSource, bugId), `Missing art mapping for ${bugId}`);
    assert.ok(bugDexFacts[bugId], `Missing fact for ${bugId}`);
    assert.ok(gardenIds.has(bugId), `Missing Dutch garden category for ${bugId}`);
  }
});

test("does not map BugDex entries to artwork with a baked checkerboard background", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");

  for (const assetPath of checkerboardArtPaths) {
    assert.equal(
      bugArtSource.includes(`require("${assetPath}")`),
      false,
      `Checkerboard artwork is still mapped: ${assetPath}`
    );
  }
});
