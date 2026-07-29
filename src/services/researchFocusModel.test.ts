import assert from "node:assert/strict";
import test from "node:test";
import { normalizeResearchFocusWing } from "./researchFocusModel.ts";

test("accepts only core Museum wings as a research focus", () => {
  assert.equal(normalizeResearchFocusWing("water"), "water");
  assert.equal(normalizeResearchFocusWing("night"), "night");
  assert.equal(normalizeResearchFocusWing("crown"), undefined);
  assert.equal(normalizeResearchFocusWing("unknown"), undefined);
});
