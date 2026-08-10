import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const batches = [
  {
    root: path.join(root, "output", "visual-factory", "nl-common-complete"),
    manifest: JSON.parse(fs.readFileSync(path.join(root, "output", "visual-factory", "nl-common-complete", "manifest.json"), "utf8")),
  },
  {
    root: path.join(root, "output", "visual-factory", "nl-common-wave-02"),
    manifest: JSON.parse(fs.readFileSync(path.join(root, "output", "visual-factory", "nl-common-wave-02", "manifest.json"), "utf8")),
  },
];
const catalog = JSON.parse(fs.readFileSync(path.join(root, "shared", "bugdex-catalog.json"), "utf8"));
const artSource = fs.readFileSync(path.join(root, "src", "services", "bugArt.ts"), "utf8");
const pilotSource = fs.readFileSync(path.join(root, "src", "services", "bugDexNederlandPilot.ts"), "utf8");
const setsSource = fs.readFileSync(path.join(root, "src", "services", "bugDexSetService.ts"), "utf8");
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));

test("Dutch BugDex waves are fully wired after the asset gate", () => {
  const inApp = batches.flatMap(({ root: batchRoot, manifest }) => manifest.items
    .filter((item) => item.status === "in-app")
    .map((item) => ({ item, batchRoot })));
  assert.equal(inApp.length, 483);
  assert.match(pilotSource, /bugDexNederlandPilotEntries/);

  for (const { item, batchRoot } of inApp) {
    const catalogEntry = catalogById.get(item.id);
    assert.ok(catalogEntry, `${item.id} ontbreekt in shared catalogus`);
    assert.ok(catalogEntry.scientificAliases?.length, `${item.id} mist wetenschappelijke alias`);
    assert.match(artSource, new RegExp(`"${item.id}":\\s*require\\("\\.\\./\\.\\./assets/bugdex-webp/${item.id}\\.webp"\\)`));
    assert.match(setsSource, new RegExp(`"${item.id}"`));

    const webpPath = path.join(root, "assets", "bugdex-webp", `${item.id}.webp`);
    const reviewPath = path.join(batchRoot, "review", `${item.id}.json`);
    const bytes = fs.readFileSync(webpPath);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${item.id} is geen RIFF WebP`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${item.id} is geen WebP`);
    assert.equal(JSON.parse(fs.readFileSync(reviewPath, "utf8")).status, "PASS");
  }
});

test("new Dutch species use the reviewed visual tier distribution", () => {
  const newIds = new Set(batches.flatMap(({ manifest }) => manifest.items
    .filter((item) => item.status === "in-app")
    .map((item) => item.id)));
  const counts = Object.fromEntries(["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"].map((rarity) => [
    rarity,
    catalog.filter((entry) => newIds.has(entry.id) && entry.rarity === rarity).length,
  ]));
  assert.deepEqual(counts, {
    Gewoon: 306,
    Zeldzaam: 107,
    Episch: 58,
    Legendarisch: 12,
    Mythisch: 0,
  });
});

test("non-bug wave records stay out of the app", () => {
  const wave = batches[1].manifest;
  const excluded = wave.items.filter((item) => item.status === "out-of-scope-non-bug");
  assert.deepEqual(excluded.map((item) => item.id).sort(), ["grove-tuinslak", "ruwe-pissebed"]);
  const rejected = wave.items.filter((item) => item.status === "rejected");
  assert.deepEqual(rejected.map((item) => item.id), ["schorsmarpissa"]);
  for (const item of excluded) {
    assert.equal(catalogById.has(item.id), false, `${item.id} mag niet in catalogus staan`);
    assert.doesNotMatch(artSource, new RegExp(`"${item.id}":\\s*require`));
  }
  assert.equal(catalogById.has("schorsmarpissa"), false);
  assert.doesNotMatch(artSource, /"schorsmarpissa":\s*require/);
});

test("candidate manifest has unique IDs", () => {
  const candidates = JSON.parse(fs.readFileSync(path.join(root, "docs", "bugdex-nederland-photo-candidates.json"), "utf8")).candidates;
  const ids = candidates.map((candidate) => candidate.id);
  assert.equal(new Set(ids).size, ids.length);
});
