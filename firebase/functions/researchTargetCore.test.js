const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyResearchProgress,
  claimResearchEncounter,
  createResearchTarget,
  researchProgressAmounts
} = require("./researchTargetCore");

const now = "2026-07-24T08:00:00.000Z";

test("creates only approved unowned research targets", () => {
  const target = createResearchTarget({ bugId: "schuimcicade", ownedBugIds: [], now, uid: "u1" });
  assert.equal(target.bugId, "schuimcicade");
  assert.equal(target.progress, 0);
  assert.equal(target.target, 100);

  assert.throws(() => createResearchTarget({ bugId: "lieveheersbeestje", ownedBugIds: [], now, uid: "u1" }), /not an approved research species/i);
  assert.throws(() => createResearchTarget({ bugId: "schuimcicade", ownedBugIds: ["schuimcicade"], now, uid: "u1" }), /already owned/i);
});

test("awards each source once per local day and caps total progress at 100", () => {
  let state = {
    target: createResearchTarget({ bugId: "schuimcicade", ownedBugIds: [], now, uid: "u1" }),
    evidenceIds: [],
    dailySourceKeys: []
  };

  state = applyResearchProgress({ ...state, source: "verified_scan", eventId: "scan-1", localDay: "2026-07-24", now });
  assert.equal(state.target.progress, 40);

  const duplicateSource = applyResearchProgress({ ...state, source: "verified_scan", eventId: "scan-2", localDay: "2026-07-24", now });
  assert.equal(duplicateSource.target.progress, 40);
  assert.equal(duplicateSource.awarded, 0);

  state = applyResearchProgress({ ...state, source: "internal_contribution", eventId: "bug-1", localDay: "2026-07-24", now });
  state = applyResearchProgress({ ...state, source: "play_completion", eventId: "run-1", localDay: "2026-07-24", now });
  state = applyResearchProgress({ ...state, source: "daily_route", eventId: "daily-1", localDay: "2026-07-24", now });

  assert.equal(state.target.progress, 100);
  assert.equal(state.target.completedAt, now);
  assert.deepEqual(researchProgressAmounts, {
    verified_scan: 40,
    internal_contribution: 25,
    play_completion: 20,
    daily_route: 15,
    momentum_cycle: 25
  });
});

test("treats duplicate event IDs as idempotent even across source retries", () => {
  const initial = {
    target: createResearchTarget({ bugId: "schuimcicade", ownedBugIds: [], now, uid: "u1" }),
    evidenceIds: [],
    dailySourceKeys: []
  };
  const first = applyResearchProgress({ ...initial, source: "verified_scan", eventId: "same-event", localDay: "2026-07-24", now });
  const retry = applyResearchProgress({ ...first, source: "play_completion", eventId: "same-event", localDay: "2026-07-24", now });

  assert.equal(retry.target.progress, 40);
  assert.equal(retry.awarded, 0);
  assert.equal(retry.duplicate, true);
});

test("does not grant encounter before completion and claims exactly once", () => {
  const target = createResearchTarget({ bugId: "schuimcicade", ownedBugIds: [], now, uid: "u1" });
  assert.throws(() => claimResearchEncounter({ target, now }), /not complete/i);

  const completed = { ...target, progress: 100, completedAt: now };
  const claimed = claimResearchEncounter({ target: completed, now: "2026-07-24T09:00:00.000Z" });
  assert.equal(claimed.bugId, "schuimcicade");
  assert.equal(claimed.target.claimedAt, "2026-07-24T09:00:00.000Z");

  const retry = claimResearchEncounter({ target: claimed.target, now: "2026-07-24T10:00:00.000Z" });
  assert.equal(retry.duplicate, true);
  assert.equal(retry.target.claimedAt, "2026-07-24T09:00:00.000Z");
});
