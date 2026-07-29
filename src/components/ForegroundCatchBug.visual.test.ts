import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ForegroundCatchBug.tsx"), "utf8");

test("foreground bugs use larger rarity-scaled art", () => {
  assert.match(source, /common: \{[^}]*size: 82/);
  assert.match(source, /rare: \{[^}]*size: 90/);
  assert.match(source, /epic: \{[^}]*size: 100/);
  assert.match(source, /legendary: \{[^}]*size: 110/);
  assert.match(source, /mythic: \{[^}]*size: 118/);
});

test("foreground bugs render a calm high-contrast rarity aura", () => {
  assert.match(source, /rarityAccents/);
  assert.match(source, /styles\.bugAura/);
  assert.match(source, /backgroundColor: `\$\{rarityAccent\}26`/);
  assert.match(source, /borderColor: rarityAccent/);
  assert.match(source, /height: activeBug\.size \+ 24/);
  assert.match(source, /width: activeBug\.size \+ 24/);
});

test("foreground bug timer, health and hitbox scale with enlarged rarity art", () => {
  assert.match(source, /const timerSize = Math\.round\(clamp\(activeBug\.size \* 0\.28, 24, 32\)\)/);
  assert.match(source, /timerBadge: \{[\s\S]*right: 4[\s\S]*top: 4/);
  assert.match(source, /hpBar[\s\S]*width: Math\.max\(52, activeBug\.size \* 0\.86\)/);
  assert.match(source, /setHitboxSize\(Math\.round\(\(settings\.size \+ 28\) \* hitboxMultiplier\)\)/);
  assert.match(source, /hitSlop=\{10\}/);
});
