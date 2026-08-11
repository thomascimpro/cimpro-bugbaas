import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "privateSightingLocation.native.ts"), "utf8");
const movementSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../android/app/src/main/java/nl/cimpro/bugbaas/MovementRadarNative.kt"), "utf8");
const bridgeSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../android/app/src/main/java/nl/cimpro/bugbaas/BugBaasNativeModule.kt"), "utf8");
const worldSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../screens/WorldScreen.tsx"), "utf8");

test("native field notes reuse a recent valid phone location before waiting for GPS", () => {
  assert.match(source, /getLastKnownPositionAsync/);
  assert.match(source, /lastKnownLocation\(2 \* 60 \* 1000, maxAccuracyMeters\)/);
});

test("native field notes retry from balanced to precise positioning", () => {
  assert.match(source, /currentLocation\(Location\.Accuracy\.Balanced, 8_000, maxAccuracyMeters\)/);
  assert.match(source, /currentLocation\(Location\.Accuracy\.High, 12_000, maxAccuracyMeters\)/);
  assert.match(source, /lastKnownLocation\(10 \* 60 \* 1000, maxAccuracyMeters\)/);
});

test("native field notes distinguish disabled phone location from denied app permission", () => {
  assert.match(source, /hasServicesEnabledAsync/);
  assert.match(source, /enableNetworkProviderAsync/);
  assert.match(source, /reason: "services_disabled"/);
});

test("native field notes explain when Android only grants approximate location", () => {
  assert.match(source, /permission\.android\.accuracy !== "fine"/);
  assert.match(source, /reason: "precise_required"/);
});

test("home shows exact completed 1.5 km walking goals for today", () => {
  assert.match(movementSource, /dailyWalkingGoalCount\(rawSnapshot\.walkingMeters\)/);
  assert.match(movementSource, /meters\) \/ walkingMetersPerRadarBug/);
  assert.match(bridgeSource, /putInt\("walkingGoalCountToday", progress\.walkingGoalCountToday\)/);
  assert.match(worldSource, /movementProgress\?\.walkingGoalCountToday/);
});
