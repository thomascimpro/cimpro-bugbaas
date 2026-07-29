import assert from "node:assert/strict";
import test from "node:test";
import { adjacentMuseumWingId, clampMuseumPage, museumTabs, paginateMuseumItems } from "./MuseumScreenLayoutModel.ts";

test("museum tabs match the compact fullscreen layout", () => {
  assert.deepEqual(museumTabs, ["room", "goals", "collection"]);
});

test("collection paging returns six specimens and stable metadata", () => {
  const result = paginateMuseumItems(Array.from({ length: 14 }, (_, index) => index + 1), 1, 6);

  assert.deepEqual(result.items, [7, 8, 9, 10, 11, 12]);
  assert.equal(result.page, 1);
  assert.equal(result.pageCount, 3);
  assert.equal(result.hasPrevious, true);
  assert.equal(result.hasNext, true);
});

test("paging clamps invalid pages after changing rooms", () => {
  assert.equal(clampMuseumPage(4, 5, 6), 0);
  assert.equal(clampMuseumPage(-2, 20, 6), 0);
  assert.equal(clampMuseumPage(9, 20, 6), 3);
});

test("empty collections keep one stable page", () => {
  const result = paginateMuseumItems([], 8, 6);

  assert.deepEqual(result.items, []);
  assert.equal(result.page, 0);
  assert.equal(result.pageCount, 1);
  assert.equal(result.hasPrevious, false);
  assert.equal(result.hasNext, false);
});

test("museum wing navigation cycles through every gallery", () => {
  const wingIds = ["beetles", "wings", "water", "night", "crawlers", "crown"] as const;

  assert.equal(adjacentMuseumWingId(wingIds, "beetles", -1), "crown");
  assert.equal(adjacentMuseumWingId(wingIds, "beetles", 1), "wings");
  assert.equal(adjacentMuseumWingId(wingIds, "crown", 1), "beetles");
});
