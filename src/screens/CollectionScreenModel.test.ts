import assert from "node:assert/strict";
import test from "node:test";
import { collectionTabs, normalizeCollectionTab, sortCollectionEntriesByLatest } from "./CollectionScreenModel.ts";

test("keeps BugDex, Museum and Journal as the only permanent collection tabs", () => {
  assert.deepEqual(collectionTabs, ["bugdex", "museum", "journal"]);
});

test("normalizes invalid or missing tabs back to BugDex", () => {
  assert.equal(normalizeCollectionTab(undefined), "bugdex");
  assert.equal(normalizeCollectionTab("trade"), "bugdex");
  assert.equal(normalizeCollectionTab("museum"), "museum");
});

test("sorts collection entries by the latest caught timestamp", () => {
  const entries = [{ id: "first" }, { id: "latest" }, { id: "middle" }];
  const inventory = [
    { bugId: "first", lastUnlockedAt: "2026-01-01T10:00:00.000Z" },
    { bugId: "latest", lastUnlockedAt: "2026-03-01T10:00:00.000Z" },
    { bugId: "middle", lastUnlockedAt: "2026-02-01T10:00:00.000Z" }
  ];

  assert.deepEqual(
    sortCollectionEntriesByLatest(entries, inventory, []).map((entry) => entry.id),
    ["latest", "middle", "first"]
  );
});
