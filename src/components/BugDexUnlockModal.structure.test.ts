import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BugDexUnlockModal.tsx"), "utf8");

test("bug unlock modal uses the rarity color as its main visual language", () => {
  assert.match(source, /borderColor: rarityColor/);
  assert.match(source, /color: rarityColor/);
  assert.match(source, /backgroundColor: rarityColor/);
  assert.match(source, /styles\.rarityBackdrop/);
});

test("bug unlock modal restores the clean 2.10 composition", () => {
  assert.doesNotMatch(source, /JournalStamp/);
  assert.doesNotMatch(source, /SpecimenFrame/);
  assert.doesNotMatch(source, /RarityMarks/);
  assert.doesNotMatch(source, /discoveryPlinth/);
  assert.match(source, /<BugArtImage bugId=\{drop\.entry\.id\} size=\{138\}/);
});

test("premium and mythic reward effects remain available", () => {
  assert.match(source, /premiumAuraImage/);
  assert.match(source, /MythicRarityFrame/);
  assert.match(source, /premiumStyle/);
});
