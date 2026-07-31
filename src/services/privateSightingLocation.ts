export type PrivateSightingLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export type PrivateSightingLocationResult =
  | { available: true; location: PrivateSightingLocation }
  | { available: false; reason: "unsupported" | "denied" | "unavailable" };

export type PrivateSightingLocationOptions = {
  maxAccuracyMeters?: number;
};

/** Gets the foreground phone location; the server stores only the owner's rounded private map position. */
export async function requestPrivateSightingLocation(options: PrivateSightingLocationOptions = {}): Promise<PrivateSightingLocationResult> {
  const maxAccuracyMeters = options.maxAccuracyMeters ?? 250;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { available: false, reason: "unsupported" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy > maxAccuracyMeters) {
          resolve({ available: false, reason: "unavailable" });
          return;
        }
        resolve({ available: true, location: { latitude, longitude, accuracyMeters: Math.max(1, Math.round(accuracy)), capturedAt: new Date(position.timestamp || Date.now()).toISOString() } });
      },
      (error) => resolve({ available: false, reason: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  });
}
