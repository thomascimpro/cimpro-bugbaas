import assert from "node:assert/strict";
import test from "node:test";

let model: typeof import("./weeklyFieldSpotlightModel.ts") | undefined;
try {
  model = await import("./weeklyFieldSpotlightModel.ts");
} catch {
  model = undefined;
}

test("weekly field spotlight stays stable from Monday through Sunday", () => {
  assert.equal(typeof model?.weeklyFieldSpotlight, "function");
  const monday = model!.weeklyFieldSpotlight(new Date("2026-07-27T10:00:00.000Z"));
  const sunday = model!.weeklyFieldSpotlight(new Date("2026-08-02T18:00:00.000Z"));
  assert.equal(monday.weekId, "2026-07-27");
  assert.deepEqual(sunday, monday);
});

test("weekly field spotlight contains exactly three unique common species", () => {
  assert.equal(typeof model?.weeklyFieldSpotlight, "function");
  assert.ok(Array.isArray(model?.weeklyFieldSpotlightPool));
  const result = model!.weeklyFieldSpotlight(new Date("2026-07-28T12:00:00.000Z"));
  assert.equal(result.bugIds.length, 3);
  assert.equal(new Set(result.bugIds).size, 3);
  assert.ok(result.bugIds.every((bugId) => model!.weeklyFieldSpotlightPool.includes(bugId)));
});

test("weekly field spotlight rotates to another set the following week", () => {
  assert.equal(typeof model?.weeklyFieldSpotlight, "function");
  const current = model!.weeklyFieldSpotlight(new Date("2026-07-28T12:00:00.000Z"));
  const next = model!.weeklyFieldSpotlight(new Date("2026-08-04T12:00:00.000Z"));
  assert.notEqual(next.weekId, current.weekId);
  assert.notDeepEqual(next.bugIds, current.bugIds);
});
