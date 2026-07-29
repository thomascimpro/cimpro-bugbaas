import assert from "node:assert/strict";
import test from "node:test";
import { getFieldPhotoStamps } from "./fieldPhotoStampService.ts";
import type { FieldJournalEntry } from "./fieldJournalService";

function entry(overrides: Partial<FieldJournalEntry> = {}): FieldJournalEntry {
  return {
    id: "current", scanId: "scan-current", observedAt: "2026-07-21T10:00:00.000Z", speciesName: "Common earwig", scientificName: "Forficula auricularia",
    bugId: "earwig", status: "matched", habitat: "Tuin", behavior: "Kroop", confidence: 0.91, ...overrides
  };
}

test("first verified field note earns documentation stamps without an AI quality verdict", () => {
  assert.deepEqual(getFieldPhotoStamps(entry(), []).map((stamp) => stamp.id), ["new_species", "new_habitat", "documented_behavior"]);
});

test("a repeat species in a known habitat only records a new observed behaviour", () => {
  const previous = entry({ id: "previous", scanId: "scan-previous", observedAt: "2026-07-20T10:00:00.000Z", behavior: "Kroop" });
  assert.deepEqual(getFieldPhotoStamps(entry({ behavior: "Vloog" }), [previous]).map((stamp) => stamp.id), ["documented_behavior"]);
});

test("unknown behaviour never creates a behaviour stamp", () => {
  assert.deepEqual(getFieldPhotoStamps(entry({ behavior: "Onbekend" }), []).map((stamp) => stamp.id), ["new_species", "new_habitat"]);
});
