import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function source(filename: string): Promise<string> {
  return readFile(resolve(process.cwd(), "src/screens", filename), "utf8");
}

test("Collection shell does not fade the entire screen through a white background", async () => {
  const text = await source("CollectionScreen.tsx");
  assert.doesNotMatch(text, /opacity: reveal/);
  assert.doesNotMatch(text, /Animated\.timing\(reveal/);
});

test("Embedded BugDex renders fully opaque without a whole-panel white fade", async () => {
  const text = await source("BugDexScreen.tsx");
  assert.match(text, /opacity: embedded \? 1 : dashboardIntro/);
  assert.match(text, /translateY: embedded \? 0 : dashboardIntro\.interpolate/);
});

test("BugDex detail never exposes raw discovery source keys", async () => {
  const text = await source("BugDexScreen.tsx");
  assert.doesNotMatch(text, /sources\.join\(/);
  assert.match(text, /bugDexSourceLabel/);
});

test("BugDex locked entries use a reusable silhouette instead of a question mark", async () => {
  const text = await source("BugDexScreen.tsx");
  assert.doesNotMatch(text, /lockedMark}>\?<\/Text>/);
  assert.match(text, /LockedBugSilhouette/);
});

test("Field Journal virtualizes observation rows and provides an error state", async () => {
  const text = await source("FieldJournalScreen.tsx");
  assert.match(text, /FlatList/);
  assert.doesNotMatch(text, /\) : entries\.map\(/);
  assert.match(text, /setLoadError/);
});

test("Field Journal keeps Android rows mounted on an opaque non-animated scroll surface", async () => {
  const text = await source("FieldJournalScreen.tsx");
  assert.match(text, /removeClippedSubviews=\{false\}/);
  assert.doesNotMatch(text, /<Animated\.View[\s\S]*<FlatList/);
});

test("Museum stage states use visual components instead of text glyph assets", async () => {
  const text = await source("MuseumScreen.tsx");
  assert.doesNotMatch(text, /const stageIcons/);
  assert.match(text, /MuseumStageMark/);
  assert.match(text, /LockedBugSilhouette/);
});

test("Museum exhibit editor opens above fixed navigation with its own scroll area", async () => {
  const text = await source("MuseumScreen.tsx");
  assert.match(text, /<Modal/);
  assert.match(text, /visible=\{exhibitEditorOpen\}/);
  assert.match(text, /styles\.editorModalScroll/);
  assert.match(text, /editorModalScroll: \{[\s\S]*maxHeight: "92%"/);
});
