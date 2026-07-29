import assert from "node:assert/strict";
import test from "node:test";
import { museumSlotCapacity, placeMuseumExhibit, sanitizeMuseumPlacements } from "./museumPlacementModel.ts";

test("opens one guided exhibit at discovered, three at open and six at curated or master", () => {
  assert.equal(museumSlotCapacity("hidden"), 0);
  assert.equal(museumSlotCapacity("discovered"), 1);
  assert.equal(museumSlotCapacity("open"), 3);
  assert.equal(museumSlotCapacity("curated"), 6);
  assert.equal(museumSlotCapacity("master"), 6);
});

test("keeps only owned, wing-matching, unique and available placements", () => {
  const placements = sanitizeMuseumPlacements({
    allowedBugIds: ["a", "b", "c"],
    ownedBugIds: ["a", "b"],
    placements: [
      { slotId: "slot-1", bugId: "a", placedAt: "1" },
      { slotId: "slot-2", bugId: "a", placedAt: "2" },
      { slotId: "slot-3", bugId: "c", placedAt: "3" },
      { slotId: "slot-9", bugId: "b", placedAt: "4" }
    ],
    stage: "open",
    wingId: "beetles"
  });

  assert.deepEqual(placements, [{ slotId: "slot-1", bugId: "a", placedAt: "1" }]);
});

test("places a selected owned bug into one slot without consuming inventory", () => {
  const result = placeMuseumExhibit({
    allowedBugIds: ["a", "b"],
    bugId: "b",
    now: "2026-07-24T10:00:00.000Z",
    ownedBugIds: ["a", "b"],
    placements: [{ slotId: "slot-1", bugId: "a", placedAt: "1" }],
    slotId: "slot-1",
    stage: "open",
    wingId: "beetles"
  });

  assert.deepEqual(result, [{ slotId: "slot-1", bugId: "b", placedAt: "2026-07-24T10:00:00.000Z" }]);
});

test("rejects locked slots and bugs outside the wing", () => {
  assert.throws(() => placeMuseumExhibit({ allowedBugIds: ["a"], bugId: "a", now: "1", ownedBugIds: ["a"], placements: [], slotId: "slot-4", stage: "open", wingId: "beetles" }), /slot is locked/i);
  assert.throws(() => placeMuseumExhibit({ allowedBugIds: ["a"], bugId: "b", now: "1", ownedBugIds: ["a", "b"], placements: [], slotId: "slot-1", stage: "open", wingId: "beetles" }), /does not belong/i);
});
