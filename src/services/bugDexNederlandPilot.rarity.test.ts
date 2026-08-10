import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bugDexNederlandPilotDefinitions, bugDexNederlandPilotEntries } from "./bugDexNederlandPilot";

const catalog = JSON.parse(readFileSync("shared/bugdex-catalog.json", "utf8")) as Array<{ id: string; rarity: string }>;
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));

test("all 483 Dutch additions have the same tier in runtime and shared catalog", () => {
  assert.equal(bugDexNederlandPilotDefinitions.length, 483);
  assert.equal(bugDexNederlandPilotEntries.length, 483);
  for (const entry of bugDexNederlandPilotEntries) {
    assert.equal(catalogById.get(entry.id)?.rarity, entry.rarity, `${entry.id} has a different catalog tier`);
  }
  assert.deepEqual(
    Object.fromEntries(["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"].map((rarity) => [
      rarity,
      bugDexNederlandPilotEntries.filter((entry) => entry.rarity === rarity).length,
    ])),
    { Gewoon: 306, Zeldzaam: 107, Episch: 58, Legendarisch: 12, Mythisch: 0 }
  );
});
