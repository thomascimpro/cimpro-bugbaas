import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BottomNav.tsx"), "utf8");

test("bottom navigation keeps premium image-first presentation with equal destinations", () => {
  assert.match(source, /styles\.activeCapsule/);
  assert.match(source, /styles\.navArtwork/);
  assert.match(source, /source=\{scanMedallion\}/);
  assert.match(source, /height: active \? activeArtSize : artSize/);
  assert.match(source, /<NavigationArt/);
  assert.match(source, /bugbaas-scan-medallion-v1\.png/);
  assert.doesNotMatch(source, /scanFab|scanItemRaised/);
});
