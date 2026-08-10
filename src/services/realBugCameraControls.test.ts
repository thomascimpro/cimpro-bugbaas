import assert from "node:assert/strict";
import test from "node:test";
import { calculateRealBugPinchZoom, chooseBestRealBugPictureSize, nextRealBugFlashMode, realBugLensLabel } from "./realBugCameraControls.ts";

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

test("camera flash cycles through useful still-photo modes", () => {
  assert.equal(nextRealBugFlashMode("auto"), "on");
  assert.equal(nextRealBugFlashMode("on"), "off");
  assert.equal(nextRealBugFlashMode("off"), "auto");
});

test("iPhone camera lenses get short camera-like labels", () => {
  assert.equal(realBugLensLabel("builtInUltraWideAngleCamera"), "0.5×");
  assert.equal(realBugLensLabel("builtInWideAngleCamera"), "1×");
  assert.equal(realBugLensLabel("builtInTelephotoCamera"), "2×");
});
