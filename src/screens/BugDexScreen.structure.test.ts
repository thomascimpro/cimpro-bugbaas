import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(root, "BugDexScreen.tsx"), "utf8");
const helperSource = readFileSync(join(root, "../services/bugSquadHelperInfo.ts"), "utf8");

test("Active Squad exposes complete duel helper information", () => {
  assert.match(source, /duel\.helperInfoTitle/);
  assert.match(source, /helperEffectDescription/);
  assert.match(source, /bugSquadHelperInfo/);
  assert.match(helperSource, /duel\.helperEffect\./);
  assert.match(helperSource, /duel\.helperSpecial\./);
  assert.match(helperSource, /cooldownSeconds/);
  assert.match(helperSource, /targets/);
});

test("BugDex dashboard actions remain tappable above phone navigation", () => {
  assert.match(source, /paddingBottom: embedded \? 8 : layout\.navigationMode === "rail" \? 20 : layout\.bottomNavHeight \+ layout\.bottomNavInset \+ 48/);
  assert.match(source, /dashboardPagerButton:\s*\{[^}]*height: 48[^}]*width: 48/s);
  assert.match(source, /dashboardPrimaryButton:\s*\{[^}]*minHeight: 48/s);
});
