import assert from "node:assert/strict";
import test from "node:test";
import { createProgressionReceipt, mergeProgressionReceipts } from "./progressionReceipt.ts";

test("creates a stable receipt with at most four visible lines", () => {
  const receipt = createProgressionReceipt({
    id: "scan-123",
    source: "real_bug_scan",
    createdAt: "2026-07-24T08:00:00.000Z",
    primaryDestination: "collection",
    lines: [
      { kind: "species", bugId: "lieveheersbeestje", labelKey: "receipt.species" },
      { kind: "copy", amount: 1, bugId: "lieveheersbeestje", labelKey: "receipt.copy" },
      { kind: "mastery", amount: 10, bugId: "lieveheersbeestje", labelKey: "receipt.mastery" },
      { kind: "research", amount: 40, labelKey: "receipt.research" },
      { kind: "xp", amount: 5, labelKey: "receipt.xp" }
    ]
  });

  assert.equal(receipt.id, "scan-123");
  assert.equal(receipt.lines.length, 4);
  assert.equal(receipt.primaryDestination, "collection");
});

test("drops invalid or empty receipt lines instead of rendering broken rewards", () => {
  const receipt = createProgressionReceipt({
    id: "reward-1",
    source: "test",
    createdAt: "2026-07-24T08:00:00.000Z",
    lines: [
      { kind: "xp", amount: 0, labelKey: "receipt.xp" },
      { kind: "research", amount: -2, labelKey: "receipt.research" },
      { kind: "event", labelKey: "" },
      { kind: "event", labelKey: "receipt.event" }
    ]
  });

  assert.deepEqual(receipt.lines, [{ kind: "event", labelKey: "receipt.event" }]);
});

test("merges related receipts without duplicate lines and keeps the newest destination", () => {
  const first = createProgressionReceipt({
    id: "one",
    source: "daily",
    createdAt: "2026-07-24T08:00:00.000Z",
    primaryDestination: "world",
    lines: [{ kind: "research", amount: 15, labelKey: "receipt.research" }]
  });
  const second = createProgressionReceipt({
    id: "two",
    source: "daily",
    createdAt: "2026-07-24T09:00:00.000Z",
    primaryDestination: "collection",
    lines: [
      { kind: "research", amount: 15, labelKey: "receipt.research" },
      { kind: "xp", amount: 10, labelKey: "receipt.xp" }
    ]
  });

  const merged = mergeProgressionReceipts("daily-summary", [first, second]);

  assert.equal(merged.id, "daily-summary");
  assert.equal(merged.lines.length, 2);
  assert.equal(merged.primaryDestination, "collection");
  assert.equal(merged.createdAt, "2026-07-24T09:00:00.000Z");
});
