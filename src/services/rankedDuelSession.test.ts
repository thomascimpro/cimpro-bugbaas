import assert from "node:assert/strict";
import test from "node:test";
import { parseRankedDuelSession, rankedDuelSessionTtlMs, type RankedDuelSession } from "./rankedDuelSession";

const session: RankedDuelSession = {
  duelId: "duel-1",
  startAt: "2026-08-02T12:00:00.000Z",
  score: 12,
  caughtBugIds: ["mier"],
  hitCounts: { mier: 2 },
  updatedAt: 1_000,
};

test("keeps ranked score and timer state across an orientation reload", () => {
  assert.deepEqual(parseRankedDuelSession(JSON.stringify(session), 2_000), session);
});

test("rejects stale or incomplete ranked sessions", () => {
  assert.equal(parseRankedDuelSession(JSON.stringify(session), session.updatedAt + rankedDuelSessionTtlMs + 1), null);
  assert.equal(parseRankedDuelSession(JSON.stringify({ ...session, hitCounts: null }), 2_000), null);
  assert.equal(parseRankedDuelSession("not-json", 2_000), null);
});
