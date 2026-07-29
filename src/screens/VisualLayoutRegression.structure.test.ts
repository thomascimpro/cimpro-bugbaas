import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const screensDir = dirname(fileURLToPath(import.meta.url));
const scanStageSource = readFileSync(join(screensDir, "scan", "ScanStageHeader.tsx"), "utf8");
const journalSource = readFileSync(join(screensDir, "FieldJournalScreen.tsx"), "utf8");
const worldSource = readFileSync(join(screensDir, "WorldScreen.tsx"), "utf8");
const loadingSource = readFileSync(join(screensDir, "..", "components", "AppLoadingScreen.tsx"), "utf8");

test("scan progress connectors render behind numbered dots", () => {
  assert.match(scanStageSource, /connector: \{[\s\S]*zIndex: 0/);
  assert.match(scanStageSource, /dot: \{[\s\S]*zIndex: 1/);
});

test("field journal keeps an opaque non-animated paper surface while scrolling", () => {
  assert.match(journalSource, /<FlatList[\s\S]*overScrollMode="never"/);
  assert.match(journalSource, /style=\{styles\.list\}/);
  assert.match(journalSource, /list: \{ backgroundColor: "#f5f0e5", flex: 1 \}/);
  assert.match(journalSource, /content: \{[\s\S]*flexGrow: 1/);
  assert.doesNotMatch(journalSource, /<Animated\.View[\s\S]*<FlatList/);
});

test("world map removes expedition routes and gives the map the remaining height", () => {
  assert.doesNotMatch(worldSource, /ExpeditionRoutePanel/);
  assert.match(worldSource, /styles\.mapPanelContent/);
  assert.match(worldSource, /mapPanelContent: \{ flex: 1, minHeight: 0/);
});


test("startup loading bar continuously moves left and right", () => {
  assert.match(loadingSource, /Animated\.loop/);
  assert.match(loadingSource, /translateX/);
  assert.match(loadingSource, /outputRange: \[-18, 18\]/);
  assert.match(loadingSource, /<Animated\.View[\s\S]*styles\.progressFill/);
});
