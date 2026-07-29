import assert from "node:assert/strict";
import test from "node:test";
import { requestPrivateSightingLocation } from "./privateSightingLocation.ts";

test("private location gracefully opts out where browser geolocation is unavailable", async () => {
  const result = await requestPrivateSightingLocation();
  assert.equal(result.available, false);
});

test("map mode accepts a coarse browser location while private storage stays strict", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: { latitude: 52.09, longitude: 5.12, accuracy: 1500 },
            timestamp: Date.now()
          } as GeolocationPosition);
        }
      }
    }
  });

  try {
    const strictResult = await requestPrivateSightingLocation();
    assert.equal(strictResult.available, false);

    const mapResult = await requestPrivateSightingLocation({ maxAccuracyMeters: Number.POSITIVE_INFINITY });
    assert.equal(mapResult.available, true);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete (globalThis as { navigator?: Navigator }).navigator;
  }
});
