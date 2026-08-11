import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const worldDir = dirname(fileURLToPath(import.meta.url));
const heroSource = readFileSync(join(worldDir, "WorldBiomeHero.tsx"), "utf8");
const researchSource = readFileSync(join(worldDir, "ResearchProgressCard.tsx"), "utf8");
const screenSource = readFileSync(join(worldDir, "..", "WorldScreen.tsx"), "utf8");

test("world hero reuses one generated atlas for all six biomes", () => {
  assert.match(heroSource, /biome-atlas-v1\.jpg/);
  for (const habitat of ["Tuin", "Park", "Water", "Nacht", "Kantoor", "Binnen"]) {
    assert.match(heroSource, new RegExp(`${habitat}:`));
  }
  assert.match(heroSource, /<BiomeAtlasCrop habitat=\{item\.habitat\}/);
});

test("world hero keeps only useful route, movement and biome layers", () => {
  assert.match(heroSource, /styles\.routePath/);
  assert.match(heroSource, /<MovementBugRail/);
  assert.match(heroSource, /styles\.findMarker/);
  assert.match(heroSource, /styles\.lockedOverlay/);
  assert.match(heroSource, /styles\.biomeRail/);
});

test("world hero is compact and exposes biomes in a horizontal scroll rail", () => {
  assert.match(heroSource, /ScrollView/);
  assert.match(heroSource, /horizontal/);
  assert.match(heroSource, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(heroSource, /heroMinHeight = Math\.min\(isTablet \? 360 : 278, Math\.max\(isCompact \? 190 : 218, height - 590\)\)/);
  const thumbnailStyle = heroSource.slice(heroSource.indexOf("thumbnail: {"), heroSource.indexOf("thumbnailTablet:"));
  assert.match(thumbnailStyle, /minHeight: 54/);
  assert.match(thumbnailStyle, /width: 92/);
  assert.doesNotMatch(thumbnailStyle, /flex: 1/);
});

test("world hero removes the decorative radar, map shortcut and next-action card", () => {
  for (const obsolete of [
    /nextAction/,
    /onNextAction/,
    /onOpenMap/,
    /searchZoneArt/,
    /searchZoneMarker/,
    /locationButton/,
    /primaryAction/,
    /LocationGlyph/,
    /SearchZoneGlyph/,
    /GameUiIcon/
  ]) {
    assert.doesNotMatch(heroSource, obsolete);
  }
  assert.doesNotMatch(heroSource, /bug-radar-request-signal-hd\.webp/);
  assert.match(heroSource, /<LockGlyph \/>/);
});

test("world screen renders the simplified biome hero without obsolete callbacks", () => {
  assert.match(screenSource, /<WorldBiomeHero/);
  assert.match(screenSource, /walkingGoalCountToday=\{movementProgress\?\.walkingGoalCountToday \?\? 0\}/);
  assert.match(heroSource, /world\.today\.walking/);
  assert.match(heroSource, /walkingGoalCountToday\}\/\{walkingGoalCountMax/);
  assert.doesNotMatch(screenSource, /onNextAction=\{openNextAction\}/);
  assert.doesNotMatch(screenSource, /onOpenMap=\{/);
  assert.doesNotMatch(screenSource, /nextAction=\{nextAction\}/);
});

test("world region levels explain the next goal, outcome and completed repeat loop", () => {
  assert.match(heroSource, /region\.nextRequirement\?\.kind/);
  assert.match(heroSource, /world\.region\.next\./);
  assert.match(heroSource, /world\.region\.outcome/);
  assert.match(heroSource, /world\.region\.repeat/);
  assert.match(heroSource, /styles\.routeGoal/);
});

test("research is presented as a bug encounter", () => {
  assert.match(researchSource, /import \{ BugArtImage \}/);
  assert.match(researchSource, /styles\.encounterRow/);
  assert.match(researchSource, /styles\.bugStage/);
});
