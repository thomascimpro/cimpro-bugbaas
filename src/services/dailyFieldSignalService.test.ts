import assert from "node:assert/strict";
import test from "node:test";
import { dailyFieldSignal, localDayId } from "./dailyFieldSignalService.ts";
import type { FieldJournalEntry } from "./fieldJournalService.ts";

const now = new Date(2026, 6, 22, 12, 0, 0);
const entry: FieldJournalEntry = { behavior: "Vloog", bugId: "zilvervisje", confidence: 0.9, habitat: "Park", id: "one", observedAt: now.toISOString(), scanId: "scan", scientificName: "Lepisma saccharinum", speciesName: "Zilvervisje", status: "matched" };

test("uses a stable local day id", () => {
  assert.equal(localDayId(now), "2026-07-22");
});

test("only completes from a matching verified note on the current day", () => {
  const signal = dailyFieldSignal([entry], now);
  const matching = { ...entry, habitat: signal.habitat ?? entry.habitat, behavior: signal.behavior ?? entry.behavior };
  assert.equal(dailyFieldSignal([matching], now).completed, true);
  assert.equal(dailyFieldSignal([{ ...matching, observedAt: "2026-07-21T12:00:00.000Z" }], now).completed, false);
});
