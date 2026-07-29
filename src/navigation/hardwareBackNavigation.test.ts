import assert from "node:assert/strict";
import test from "node:test";
import { parentRouteForHardwareBack } from "./hardwareBackNavigation.ts";

test("Android back follows the same parent routes as visible back controls", () => {
  assert.equal(parentRouteForHardwareBack("settings", "realBugScan"), "profile");
  assert.equal(parentRouteForHardwareBack("profile", "realBugScan"), "home");
  assert.equal(parentRouteForHardwareBack("new", "realBugScan"), "bugs");
  assert.equal(parentRouteForHardwareBack("detail", "realBugScan"), "bugs");
  assert.equal(parentRouteForHardwareBack("userProfile", "realBugScan"), "leaderboard");
});

test("field journal returns to its actual launch route", () => {
  assert.equal(parentRouteForHardwareBack("fieldJournal", "seasonFinale"), "seasonFinale");
  assert.equal(parentRouteForHardwareBack("fieldJournal", "realBugScan"), "realBugScan");
});

test("root world route lets Android background the app", () => {
  assert.equal(parentRouteForHardwareBack("home", "realBugScan"), null);
});
