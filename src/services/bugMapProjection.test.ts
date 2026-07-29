import assert from "node:assert/strict";
import test from "node:test";
import {
  createMapProjection,
  mapDistanceMeters,
  moveMapCenterByPixels,
  visibleMapRadiusMeters
} from "./bugMapProjection.ts";

const center = { latitude: 52.0907, longitude: 5.1214 };

test("projects map center to the visual center of a small phone viewport", () => {
  const projection = createMapProjection(center, 16, { width: 340, height: 430 });
  assert.deepEqual(projection.project(center), { left: 148, top: 193 });
});

test("creates enough tiles to cover a phone viewport", () => {
  const projection = createMapProjection(center, 16, { width: 340, height: 430 });
  assert.ok(projection.tiles.length >= 9);
  assert.ok(projection.tiles.some((tile) => tile.left < 0));
  assert.ok(projection.tiles.some((tile) => tile.left + 256 > 340));
  assert.ok(projection.tiles.some((tile) => tile.top < 0));
  assert.ok(projection.tiles.some((tile) => tile.top + 256 > 430));
});

test("dragging the map right moves the viewed center west by one tile", () => {
  const moved = moveMapCenterByPixels(center, 13, 256, 0);
  assert.ok(Math.abs(moved.latitude - center.latitude) < 0.000001);
  assert.ok(Math.abs(moved.longitude - (center.longitude - 360 / 2 ** 13)) < 0.000001);
});

test("dragging the map down moves the viewed center north", () => {
  const moved = moveMapCenterByPixels(center, 13, 0, 256);
  assert.ok(moved.latitude > center.latitude);
  assert.ok(Math.abs(moved.longitude - center.longitude) < 0.000001);
});

test("dragged centers stay inside OSM latitude limits and wrap longitude", () => {
  const moved = moveMapCenterByPixels({ latitude: 85, longitude: -179 }, 3, 100000, 100000);
  assert.ok(moved.latitude <= 85.05112878);
  assert.ok(moved.latitude >= -85.05112878);
  assert.ok(moved.longitude >= -180);
  assert.ok(moved.longitude < 180);
});

test("distance helper returns realistic geographic distance", () => {
  const distance = mapDistanceMeters({ latitude: 52, longitude: 5 }, { latitude: 53, longitude: 5 });
  assert.ok(distance > 110000);
  assert.ok(distance < 112000);
});

test("visible search radius is bounded and grows when zooming out", () => {
  const phone = { width: 340, height: 430 };
  const zoomedIn = visibleMapRadiusMeters(center, 18, phone);
  const zoomedOut = visibleMapRadiusMeters(center, 12, phone);
  assert.ok(zoomedIn >= 250 && zoomedIn <= 3000);
  assert.ok(zoomedOut >= 250 && zoomedOut <= 3000);
  assert.ok(zoomedOut > zoomedIn);
});
