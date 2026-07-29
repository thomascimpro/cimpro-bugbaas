import type { PrivateSightingLocationOptions, PrivateSightingLocationResult } from "./privateSightingLocation";

type NativeLocationModule = {
  Accuracy: { High: number };
  requestForegroundPermissionsAsync: () => Promise<{ granted: boolean; canAskAgain: boolean }>;
  getCurrentPositionAsync: (options: { accuracy: number }) => Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  }>;
};

const Location = require("expo-location") as NativeLocationModule;

/** Gets a foreground-only native location after the player grants permission. */
export async function requestPrivateSightingLocation(options: PrivateSightingLocationOptions = {}): Promise<PrivateSightingLocationResult> {
  const maxAccuracyMeters = options.maxAccuracyMeters ?? 250;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { available: false, reason: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy === null || accuracy > maxAccuracyMeters) {
      return { available: false, reason: "unavailable" };
    }

    return {
      available: true,
      location: {
        latitude,
        longitude,
        accuracyMeters: Math.max(1, Math.round(accuracy)),
        capturedAt: new Date(position.timestamp || Date.now()).toISOString()
      }
    };
  } catch {
    return { available: false, reason: "unavailable" };
  }
}
