export type PrivateSightingLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export type PrivateSightingLocationFailureReason = "unsupported" | "denied" | "services_disabled" | "precise_required" | "unavailable";

export type PrivateSightingLocationResult =
  | { available: true; location: PrivateSightingLocation }
  | { available: false; reason: PrivateSightingLocationFailureReason };

export type PrivateSightingLocationOptions = {
  maxAccuracyMeters?: number;
};

type BrowserLocationAttempt =
  | { position: GeolocationPosition }
  | { reason: "denied" | "unavailable" };

function browserPosition(enableHighAccuracy: boolean, maximumAge: number, timeout: number): Promise<BrowserLocationAttempt> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ position }),
      (error) => resolve({ reason: error.code === error.PERMISSION_DENIED || error.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy, maximumAge, timeout }
    );
  });
}

function usableBrowserLocation(position: GeolocationPosition, maxAccuracyMeters: number): PrivateSightingLocationResult | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy > maxAccuracyMeters) return null;
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

/** Gets the foreground phone location; the server stores only the owner's rounded private map position. */
export async function requestPrivateSightingLocation(options: PrivateSightingLocationOptions = {}): Promise<PrivateSightingLocationResult> {
  const maxAccuracyMeters = options.maxAccuracyMeters ?? 250;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { available: false, reason: "unsupported" };
  }
  for (const attemptOptions of [
    { enableHighAccuracy: false, maximumAge: 2 * 60 * 1000, timeout: 4_000 },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8_000 }
  ]) {
    const attempt = await browserPosition(attemptOptions.enableHighAccuracy, attemptOptions.maximumAge, attemptOptions.timeout);
    if ("reason" in attempt) {
      if (attempt.reason === "denied") return { available: false, reason: "denied" };
      continue;
    }
    const usable = usableBrowserLocation(attempt.position, maxAccuracyMeters);
    if (usable) return usable;
  }
  return { available: false, reason: "unavailable" };
}
