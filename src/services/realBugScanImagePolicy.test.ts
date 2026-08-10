import assert from "node:assert/strict";
import test from "node:test";
import {
  emergencyRealBugPhotoPlan,
  fallbackRealBugPhotoPlan,
  primaryRealBugPhotoPlan,
  reviewRealBugThumbnailPlan,
  shouldFallbackRealBugPhoto
} from "./realBugScanImagePolicy.ts";

test("keeps enough landscape detail for reliable AI identification", () => {
  assert.deepEqual(primaryRealBugPhotoPlan(4032, 3024), {
    resize: [{ resize: { width: 2560 } }],
    quality: 0.94
  });
});

test("keeps enough portrait detail for reliable AI identification", () => {
  assert.deepEqual(primaryRealBugPhotoPlan(3024, 4032), {
    resize: [{ resize: { height: 2560 } }],
    quality: 0.94
  });
});

test("does not upscale photos that are already small", () => {
  assert.deepEqual(primaryRealBugPhotoPlan(640, 480), {
    resize: [],
    quality: 0.94
  });
});

test("uses a high-detail fallback that stays below the API payload limit", () => {
  assert.deepEqual(fallbackRealBugPhotoPlan(4032, 3024), {
    resize: [{ resize: { width: 2048 } }],
    quality: 0.9
  });
});

test("uses a compact emergency fallback for unusually large photos", () => {
  assert.deepEqual(emergencyRealBugPhotoPlan(4032, 3024), {
    resize: [{ resize: { width: 1600 } }],
    quality: 0.84
  });
});

test("creates a readable 640 pixel developer review thumbnail", () => {
  assert.deepEqual(reviewRealBugThumbnailPlan(2000, 1000), {
    resize: [{ resize: { width: 640 } }],
    quality: 0.72
  });
});

test("falls back above three megabytes to keep the JSON request below Vercel's limit", () => {
  const exactlyThreeMbBase64 = "a".repeat(Math.ceil((3 * 1024 * 1024 * 4) / 3));
  const aboveThreeMbBase64 = "a".repeat(Math.ceil(((3 * 1024 * 1024) + 1) * 4 / 3));

  assert.equal(shouldFallbackRealBugPhoto(exactlyThreeMbBase64), false);
  assert.equal(shouldFallbackRealBugPhoto(aboveThreeMbBase64), true);
});
