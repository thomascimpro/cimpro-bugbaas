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

test("browser field notes retry after a temporary location-provider error", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let attempts = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(success: PositionCallback, error: PositionErrorCallback) {
          attempts += 1;
          if (attempts === 1) {
            error({ code: 2, message: "temporary", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
            return;
          }
          success({
            coords: { latitude: 52.09, longitude: 5.12, accuracy: 32 },
            timestamp: Date.now()
          } as GeolocationPosition);
        }
      }
    }
  });

  try {
    const result = await requestPrivateSightingLocation();
    assert.equal(result.available, true);
    assert.equal(attempts, 2);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete (globalThis as { navigator?: Navigator }).navigator;
  }
});
