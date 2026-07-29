import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "MuseumScreen.tsx"), "utf8");

test("room selector expands inline below the compact room button", () => {
  assert.match(source, /roomPickerOpen \? \(\s*<View style=\{styles\.roomPickerDropdown\}>/s);
  assert.doesNotMatch(source, /<Modal[\s\S]*visible=\{roomPickerOpen\}/);
});

test("museum room content owns the remaining viewport", () => {
  assert.match(source, /panelWrap: \{ flexGrow: 1, width: "100%" \}/);
  assert.match(source, /minHeight: Math\.max\(560, height - compactChromeHeight\)/);
});

test("museum goals refresh live inventory and mastery instead of stale caches", () => {
  assert.match(source, /listBugDexInventory\(user, \{ force: true \}\)/);
  assert.match(source, /listBugMastery\(user, \{ force: true \}\)/);
});
