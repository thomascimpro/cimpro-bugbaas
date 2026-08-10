import assert from "node:assert/strict";
import test from "node:test";
import { encodePlaySessionSnapshot, playSessionRecoveryTtlMs, readRecentPlaySession } from "./playSessionRecovery";

test("restores an open ranking workspace after an orientation reload", () => {
  const raw = encodePlaySessionSnapshot(true, "ranking", 1_000);
  assert.deepEqual(readRecentPlaySession(raw, 2_000), { open: true, tab: "ranking", updatedAt: 1_000 });
});

test("ignores stale or invalid play workspace snapshots", () => {
  const raw = encodePlaySessionSnapshot(true, "ranking", 1_000);
  assert.equal(readRecentPlaySession(raw, 1_000 + playSessionRecoveryTtlMs + 1), null);
  assert.equal(readRecentPlaySession('{"open":true,"tab":"unknown","updatedAt":1000}', 2_000), null);
});
