import assert from "node:assert/strict";
import test from "node:test";
import { baasMenuFeatures } from "./featureRegistry.ts";

test("contains each owned feature exactly once", () => {
  const ids = baasMenuFeatures.map((feature) => feature.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ["bugs", "collection", "arcade", "missions", "buddy", "events", "profile", "settings"]);
});

test("keeps the menu compact and label-only", () => {
  assert.equal(baasMenuFeatures.length, 8);
  assert.ok(baasMenuFeatures.every((feature) => feature.labelKey.startsWith("menu.")));
  assert.ok(baasMenuFeatures.every((feature) => !Object.hasOwn(feature, "description")));
});
