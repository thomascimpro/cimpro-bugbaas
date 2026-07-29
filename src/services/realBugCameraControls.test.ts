import assert from "node:assert/strict";
import test from "node:test";
import { adjustRealBugCameraZoom, calculateRealBugPinchZoom, chooseBestRealBugPictureSize } from "./realBugCameraControls.ts";

test("adjustRealBugCameraZoom clamps zoom between 0 and 1", () => {
  assert.equal(adjustRealBugCameraZoom(0, -1), 0);
  assert.equal(adjustRealBugCameraZoom(1, 1), 1);
});

test("adjustRealBugCameraZoom changes zoom in stable steps", () => {
  assert.equal(adjustRealBugCameraZoom(0, 1), 0.15);
  assert.equal(adjustRealBugCameraZoom(0.3, -1), 0.15);
});

test("calculateRealBugPinchZoom maps pinch distance to clamped camera zoom", () => {
  assert.equal(calculateRealBugPinchZoom(0.2, 100, 150), 0.45);
  assert.equal(calculateRealBugPinchZoom(0.9, 100, 150), 1);
  assert.equal(calculateRealBugPinchZoom(0.1, 100, 50), 0);
});

test("chooseBestRealBugPictureSize prefers the largest safe 4:3 camera size", () => {
  assert.equal(
    chooseBestRealBugPictureSize(["1920x1080", "4000x3000", "8000x6000", "3264x2448"]),
    "4000x3000"
  );
});

test("chooseBestRealBugPictureSize falls back safely for invalid or non-4:3 values", () => {
  assert.equal(chooseBestRealBugPictureSize(["invalid", "3840x2160", "2560x1440"]), "3840x2160");
  assert.equal(chooseBestRealBugPictureSize([]), undefined);
});
