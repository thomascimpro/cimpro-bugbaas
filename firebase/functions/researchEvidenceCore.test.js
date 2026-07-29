const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeResearchEvidenceRequest } = require("./researchEvidenceCore");

test("normalizes a Daily Route bonus claim", () => {
  assert.deepEqual(normalizeResearchEvidenceRequest("daily_route", { claimId: "daily-route-bonus-2026-07-24" }), {
    claimId: "daily-route-bonus-2026-07-24",
    eventId: "daily:daily-route-bonus-2026-07-24",
    source: "daily_route"
  });
  assert.throws(() => normalizeResearchEvidenceRequest("daily_route", { claimId: "daily-route-v1-train-2026-07-24" }), /daily route bonus/i);
});

test("normalizes a completed Momentum cycle", () => {
  assert.deepEqual(normalizeResearchEvidenceRequest("momentum_cycle", { cycle: 3 }), {
    cycle: 3,
    eventId: "momentum:3",
    source: "momentum_cycle"
  });
});

test("normalizes an approved arcade completion reference", () => {
  assert.deepEqual(normalizeResearchEvidenceRequest("play_completion", { mode: "web_runner", runId: "abc123" }), {
    eventId: "arcade:web_runner:abc123",
    mode: "web_runner",
    runId: "abc123",
    source: "play_completion"
  });
  assert.throws(() => normalizeResearchEvidenceRequest("play_completion", { mode: "unknown", runId: "abc123" }), /arcade mode/i);
});

test("normalizes report and comment contribution references", () => {
  assert.deepEqual(normalizeResearchEvidenceRequest("internal_contribution", { collectionName: "bugs", bugId: "bug-1", kind: "report" }), {
    bugId: "bug-1",
    collectionName: "bugs",
    eventId: "report:bugs:bug-1",
    kind: "report",
    source: "internal_contribution"
  });
  assert.deepEqual(normalizeResearchEvidenceRequest("internal_contribution", { collectionName: "organizationBugs", bugId: "bug-2", commentId: "comment-1", kind: "comment" }), {
    bugId: "bug-2",
    collectionName: "organizationBugs",
    commentId: "comment-1",
    eventId: "comment:organizationBugs:bug-2:comment-1",
    kind: "comment",
    source: "internal_contribution"
  });
  assert.deepEqual(normalizeResearchEvidenceRequest("internal_contribution", { eventId: "report-action-2026-07-24", kind: "legacy_event" }), {
    eventId: "legacy:report-action-2026-07-24",
    legacyEventId: "report-action-2026-07-24",
    kind: "legacy_event",
    source: "internal_contribution"
  });
  assert.throws(() => normalizeResearchEvidenceRequest("internal_contribution", { collectionName: "users", bugId: "x", kind: "report" }), /collection/i);
});

test("rejects unsafe ids and unsupported sources", () => {
  assert.throws(() => normalizeResearchEvidenceRequest("play_completion", { mode: "tap_duel", runId: "../x" }), /identifier/i);
  assert.throws(() => normalizeResearchEvidenceRequest("unknown", {}), /source/i);
});
