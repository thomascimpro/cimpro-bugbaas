import assert from "node:assert/strict";
import test from "node:test";
import { flagPatternForLanguage } from "./LanguageFlagModel.ts";

test("uses deterministic flag patterns for all supported languages", () => {
  assert.equal(flagPatternForLanguage("nl"), "netherlands");
  assert.equal(flagPatternForLanguage("en"), "united-kingdom");
  assert.equal(flagPatternForLanguage("fr"), "france");
});
