const legacyPrecision = 1000;
const privatePrecision = 100000;
const cellDegrees = 0.0015;

function validCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function privateSightingMapCell(location) {
  if (!location || typeof location !== "object" || Array.isArray(location)) return undefined;
  const { latitude, longitude } = location;
  if (!validCoordinate(latitude, longitude)) return undefined;
  return {
    latitudeE3: Math.round(latitude * legacyPrecision),
    longitudeE3: Math.round(longitude * legacyPrecision)
  };
}

function normalizePrivateSightingLocation(location, now = Date.now()) {
  if (!location || typeof location !== "object" || Array.isArray(location)) return undefined;
  const { latitude, longitude, accuracyMeters, capturedAt } = location;
  if (!validCoordinate(latitude, longitude)) return undefined;
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 250) return undefined;
  const capturedTime = new Date(capturedAt).getTime();
  if (!Number.isFinite(capturedTime) || Math.abs(now - capturedTime) > 15 * 60 * 1000) return undefined;
  return {
    privateLocation: {
      latitudeE5: Math.round(latitude * privatePrecision),
      longitudeE5: Math.round(longitude * privatePrecision),
      accuracyMeters: Math.max(1, Math.round(accuracyMeters)),
      capturedAt: new Date(capturedTime).toISOString()
    },
    locationCell: privateSightingMapCell(location),
    mapCellId: `${Math.floor(latitude / cellDegrees)}:${Math.floor(longitude / cellDegrees)}`
  };
}

module.exports = { normalizePrivateSightingLocation, privateSightingMapCell };
