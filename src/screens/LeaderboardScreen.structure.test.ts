import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "LeaderboardScreen.tsx"), "utf8");

test("ranking list fills the remaining play workspace height", () => {
  assert.match(source, /<FlatList[\s\S]*?style=\{styles\.list\}[\s\S]*?\/>/);
  assert.match(source, /list:\s*\{\s*flex:\s*1,\s*minHeight:\s*0\s*\}/);
  assert.match(source, /screen:\s*\{[\s\S]*?paddingBottom:\s*0,/);
});

test("ranking includes unlocked bugs and exposes its back action", () => {
  assert.match(source, /type RankingMode = "score" \| "duel" \| "bugs"/);
  assert.match(source, /rankingMode === "bugs"/);
  assert.match(source, /bugDexCount/);
  assert.match(source, /onPress=\{onBack\}/);
  assert.match(source, /leaderboard\.bugsRank/);
});
