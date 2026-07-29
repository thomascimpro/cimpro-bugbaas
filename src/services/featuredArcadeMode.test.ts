import assert from "node:assert/strict";
import test from "node:test";
import type { ArcadeMode } from "../types.ts";
import { featuredArcadeMode } from "./featuredArcadeMode.ts";

test("returns undefined when no arcade mode is unlocked", () => {
  assert.equal(featuredArcadeMode([], "2026-07-24"), undefined);
});

test("returns a deterministic unlocked mode for the same local day", () => {
  const unlocked: ArcadeMode[] = ["tap_duel", "web_runner", "bubble_swarm"];
  assert.equal(featuredArcadeMode([...unlocked], "2026-07-24"), featuredArcadeMode([...unlocked], "2026-07-24"));
  assert.ok(unlocked.includes(featuredArcadeMode([...unlocked], "2026-07-24")!));
});

test("rotates across multiple days without selecting a locked mode", () => {
  const unlocked: ArcadeMode[] = ["tap_duel", "web_runner", "nest_defense", "bubble_swarm"];
  const results = new Set(Array.from({ length: 8 }, (_, index) => featuredArcadeMode([...unlocked], `2026-07-${String(20 + index).padStart(2, "0")}`)));
  assert.ok(results.size > 1);
  assert.ok([...results].every((mode) => mode === undefined || unlocked.includes(mode)));
});
