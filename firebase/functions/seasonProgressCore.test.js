const assert = require("node:assert/strict");
const test = require("node:test");
const { seasonContributionAmount, seasonProgress, seasonWindow } = require("./seasonProgressCore");

test("creates stable eight-week seasons with a one-week finale", () => {
  const active = seasonWindow(new Date("2026-07-01T12:00:00Z"));
  const finale = seasonWindow(new Date(active.finaleStartsAt.getTime() + 1000));
  assert.equal(active.id, finale.id);
  assert.equal(active.durationDays, 56);
  assert.equal(finale.state, "finale");
});

test("weights meaningful discoveries, research and Swarm victories", () => {
  assert.equal(seasonContributionAmount("verified_discovery"), 1);
  assert.equal(seasonContributionAmount("research_completion"), 3);
  assert.equal(seasonContributionAmount("swarm_victory"), 5);
});

test("builds a bounded community finale meter and personal eligibility", () => {
  assert.deepEqual(seasonProgress({ communityPoints: 9999, personalPoints: 4, target: 500 }), {
    complete: true,
    eligible: true,
    personalPoints: 4,
    progress: 500,
    target: 500
  });
  assert.equal(seasonProgress({ communityPoints: 200, personalPoints: 0, target: 500 }).eligible, false);
});
