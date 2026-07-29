import assert from "node:assert/strict";
import test from "node:test";
import { autoClaimableMissionIds } from "./rewardAutoClaimService.ts";

test("returns only completed unclaimed mission ids", () => {
  const ids = autoClaimableMissionIds([
    { id: "done", progress: 1, target: 1 },
    { id: "open", progress: 0, target: 1 },
    { id: "claimed", progress: 2, target: 1 }
  ], new Set(["claimed"]));
  assert.deepEqual(ids, ["done"]);
});

test("deduplicates ids and ignores malformed targets", () => {
  const ids = autoClaimableMissionIds([
    { id: "same", progress: 1, target: 1 },
    { id: "same", progress: 2, target: 1 },
    { id: "bad", progress: 1, target: 0 }
  ], new Set());
  assert.deepEqual(ids, ["same"]);
});
