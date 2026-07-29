import assert from "node:assert/strict";
import test from "node:test";
import {
  closeOverlay,
  goBack,
  initialAppNavigationState,
  mainDestinations,
  navigateTo,
  openOverlay
} from "./appNavigation.ts";

test("closes an overlay before changing the destination", () => {
  const state = openOverlay(initialAppNavigationState, { type: "missions" });
  assert.deepEqual(goBack(state), { ...state, overlay: null });
});

test("returns to the previous main destination", () => {
  const state = navigateTo(navigateTo(initialAppNavigationState, "play"), "collection");
  assert.equal(goBack(state).destination, "play");
});

test("does not duplicate consecutive destinations", () => {
  const state = navigateTo(navigateTo(initialAppNavigationState, "world"), "world");
  assert.deepEqual(state.history, []);
});

test("closeOverlay leaves destinations untouched", () => {
  const state = openOverlay(navigateTo(initialAppNavigationState, "play"), { type: "buddy" });
  assert.deepEqual(closeOverlay(state), { ...state, overlay: null });
});

test("uses only the four permanent destinations", () => {
  assert.deepEqual(mainDestinations, ["world", "scan", "play", "collection"]);
  assert.equal(mainDestinations.includes("bugs" as never), false);
  assert.equal(mainDestinations.includes("ranking" as never), false);
  assert.equal(mainDestinations.includes("menu" as never), false);
});
