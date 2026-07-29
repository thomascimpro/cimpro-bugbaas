import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("gives the monthly top five a clear descending reward ladder", () => {
  const service = readFileSync("src/services/duelSeasonService.ts", "utf8");
  const closeScript = readFileSync("scripts/close_duel_season.mjs", "utf8");
  const expected = [
    'rank === 1) return { count: 1, label: "1 mythische bug", rarity: "Mythisch"',
    'rank === 2) return { count: 1, label: "1 legendarische bug", rarity: "Legendarisch"',
    'rank === 3) return { count: 2, label: "2 epische bugs", rarity: "Episch"',
    'rank === 4) return { count: 1, label: "1 epische bug", rarity: "Episch"',
    'rank === 5) return { count: 2, label: "2 zeldzame bugs", rarity: "Zeldzaam"'
  ];

  for (const reward of expected) assert.ok(service.includes(reward), `Missing ${reward}`);
  assert.match(closeScript, /1: \{ count: 1, label: "1 mythische bug", rarity: "Mythisch" \}/);
  assert.match(closeScript, /Mythisch: \["koningin-alexandravlinder"/);
  assert.match(closeScript, /mythicBugDexCount/);
});
