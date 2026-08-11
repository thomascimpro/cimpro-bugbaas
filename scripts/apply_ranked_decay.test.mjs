import assert from "node:assert/strict";
import test from "node:test";
import { calculateRankedDecay, rankedDecayAnchor } from "./apply_ranked_decay.mjs";

test("new users receive five rating decay for each fully missed day", () => {
  const anchor = rankedDecayAnchor({
    duelRatingUpdatedAt: "2026-08-08T10:00:00.000Z",
    duelSeasonResetAt: "",
    starterBoostGrantedAt: "",
    lastActiveAt: "2026-08-10T10:00:00.000Z"
  });
  const result = calculateRankedDecay({ checkpointDay: "", rating: 1000, ratingUpdatedAt: anchor }, "2026-08-11");
  assert.deepEqual(result, { checkpointDay: "2026-08-10", decayedBy: 10, missedDays: 2, nextRating: 990 });
});

test("existing users without a duel timestamp fall back to their season reset", () => {
  const anchor = rankedDecayAnchor({
    duelRatingUpdatedAt: "",
    duelSeasonResetAt: "2026-08-09T00:00:00.000Z",
    starterBoostGrantedAt: "2026-08-01T00:00:00.000Z",
    lastActiveAt: "2026-08-11T00:00:00.000Z"
  });
  assert.equal(anchor, "2026-08-09T00:00:00.000Z");
  assert.equal(calculateRankedDecay({ checkpointDay: "", rating: 1000, ratingUpdatedAt: anchor }, "2026-08-11")?.decayedBy, 5);
});
