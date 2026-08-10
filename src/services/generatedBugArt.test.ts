import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { imageSize } from "image-size";
import { bugDexSets, bugDexSetBadgeBugIds } from "./bugDexSetService.ts";
import { bugDexEntries, bugDexFacts } from "./pointsService.ts";

const addedEntries = bugDexEntries.filter((entry) => entry.unlockMode === "drop");
const addedIds = new Set(addedEntries.map((entry) => entry.id));
const catalogIds = new Set(bugDexEntries.map((entry) => entry.id));

test("Dutch BugDex expansion contains all approved drop-only entries", () => {
  assert.equal(addedEntries.length, 549);
  assert.deepEqual(
    Object.fromEntries(["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"].map((rarity) => [rarity, addedEntries.filter((entry) => entry.rarity === rarity).length])),
    { Gewoon: 323, Zeldzaam: 129, Episch: 78, Legendarisch: 19, Mythisch: 0 }
  );
  assert.ok(addedEntries.every((entry) => entry.minPoints === 0 && entry.minBugs === 0));
});

test("every added entry has transparent raster art and a fact", () => {
  const bugArtSource = readFileSync("src/services/bugArt.ts", "utf8");
  for (const entry of addedEntries) {
    const mapping = bugArtSource.match(new RegExp(`"${entry.id}": require\\("../../([^"]+)"\\)`));
    assert.ok(mapping, `missing raster mapping for ${entry.id}`);
    const assetPath = mapping[1];
    const raster = readFileSync(assetPath);
    const isPng = raster.subarray(1, 4).toString("ascii") === "PNG";
    const isWebp = raster.subarray(0, 4).toString("ascii") === "RIFF" && raster.subarray(8, 12).toString("ascii") === "WEBP";
    assert.ok(isPng || isWebp, `${entry.id} is not PNG or WebP`);
    const hasAlpha = isPng
      ? raster[25] === 4 || raster[25] === 6 || (raster[25] === 3 && raster.includes(Buffer.from("tRNS")))
      : raster.includes(Buffer.from("ALPH"));
    assert.ok(hasAlpha, `${entry.id} raster is missing transparency`);
    const dimensions = imageSize(raster);
    assert.ok((dimensions.width ?? Infinity) <= 768 && (dimensions.height ?? Infinity) <= 768, `${entry.id} exceeds 768px`);
    assert.ok(bugDexFacts[entry.id]?.length > 20, `missing useful fact for ${entry.id}`);
  }
});

test("all category references point at real BugDex entries", () => {
  for (const set of bugDexSets) {
    assert.equal(new Set(set.bugIds).size, set.bugIds.length, `${set.id} contains duplicate bug IDs`);
    for (const bugId of set.bugIds) assert.ok(catalogIds.has(bugId), `${set.id} references unknown ${bugId}`);
    for (const bugId of bugDexSetBadgeBugIds(set)) assert.ok(catalogIds.has(bugId), `${set.id} badge references unknown ${bugId}`);
  }
});

test("category filters cover every added entry without changing badge requirements", () => {
  const dutchHome = bugDexSets.find((set) => set.id === "dutch_home");
  const dutchGarden = bugDexSets.find((set) => set.id === "dutch_garden");
  assert.ok(dutchHome);
  assert.ok(dutchGarden);
  assert.equal(dutchHome.badgeId, undefined);
  assert.equal(dutchGarden.badgeId, undefined);

  const filteredIds = new Set(bugDexSets.flatMap((set) => set.bugIds));
  for (const id of addedIds) assert.ok(filteredIds.has(id), `new entry ${id} is missing from Dutch filters`);

  for (const set of bugDexSets.filter((item) => item.badgeId)) {
    const badgeIds = bugDexSetBadgeBugIds(set);
    assert.ok(badgeIds.length > 0, `${set.id} has an empty badge requirement`);
    assert.ok(badgeIds.every((id) => !addedIds.has(id)), `${set.id} badge was made harder by a new entry`);
  }
});
