import type { PrivateSightingLocationOptions, PrivateSightingLocationResult } from "./privateSightingLocation";

type NativeLocationModule = {
  Accuracy: { Balanced: number; High: number };
  requestForegroundPermissionsAsync: () => Promise<{
    granted: boolean;
    canAskAgain: boolean;
    android?: { accuracy: "fine" | "coarse" | "none" };
  }>;
  hasServicesEnabledAsync: () => Promise<boolean>;
  enableNetworkProviderAsync: () => Promise<void>;
  getCurrentPositionAsync: (options: { accuracy: number }) => Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  }>;
  getLastKnownPositionAsync: (options: { maxAge: number; requiredAccuracy: number }) => Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
    timestamp: number;
  } | null>;
};

const Location = require("expo-location") as NativeLocationModule;

type NativePosition = Awaited<ReturnType<NativeLocationModule["getCurrentPositionAsync"]>>;

function usableLocation(position: NativePosition | null, maxAccuracyMeters: number): PrivateSightingLocationResult | null {
  if (!position) return null;
  const { latitude, longitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || accuracy === null || !Number.isFinite(accuracy) || accuracy > maxAccuracyMeters) return null;
  return {
    available: true,
    location: {
      latitude,
      longitude,
      accuracyMeters: Math.max(1, Math.round(accuracy)),
      capturedAt: new Date(position.timestamp || Date.now()).toISOString()
    }
  };
}

async function lastKnownLocation(maxAge: number, maxAccuracyMeters: number): Promise<PrivateSightingLocationResult | null> {
  try {
    return usableLocation(await Location.getLastKnownPositionAsync({ maxAge, requiredAccuracy: maxAccuracyMeters }), maxAccuracyMeters);
  } catch {
    return null;
  }
}

async function currentLocation(accuracy: number, timeoutMs: number, maxAccuracyMeters: number): Promise<PrivateSightingLocationResult | null> {
  try {
    const position = await Promise.race<NativePosition | null>([
      Location.getCurrentPositionAsync({ accuracy }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    return usableLocation(position, maxAccuracyMeters);
  } catch {
    return null;
  }
}

/** Gets a foreground-only native location after the player grants permission. */
export async function requestPrivateSightingLocation(options: PrivateSightingLocationOptions = {}): Promise<PrivateSightingLocationResult> {
  const maxAccuracyMeters = options.maxAccuracyMeters ?? 250;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { available: false, reason: "denied" };
    }

    if (Number.isFinite(maxAccuracyMeters) && permission.android && permission.android.accuracy !== "fine") {
      return { available: false, reason: "precise_required" };
    }

    if (!await Location.hasServicesEnabledAsync()) {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        return { available: false, reason: "services_disabled" };
      }
      if (!await Location.hasServicesEnabledAsync()) return { available: false, reason: "services_disabled" };
    }

    const recent = await lastKnownLocation(2 * 60 * 1000, maxAccuracyMeters);
    if (recent) return recent;

    const balanced = await currentLocation(Location.Accuracy.Balanced, 8_000, maxAccuracyMeters);
    if (balanced) return balanced;

    const precise = await currentLocation(Location.Accuracy.High, 12_000, maxAccuracyMeters);
    if (precise) return precise;

    return await lastKnownLocation(10 * 60 * 1000, maxAccuracyMeters)
      ?? { available: false, reason: "unavailable" };
  } catch {
    return { available: false, reason: "unavailable" };
  }
}
