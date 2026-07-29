export type MapCoordinate = { latitude: number; longitude: number };

const CELL_DEGREES = 0.0015;

export function isValidMapCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function privateMapCellId(latitude: number, longitude: number): string {
  if (!isValidMapCoordinate(latitude, longitude)) throw new Error("Invalid map coordinate");
  return `${Math.floor(latitude / CELL_DEGREES)}:${Math.floor(longitude / CELL_DEGREES)}`;
}

export function distanceMeters(a: MapCoordinate, b: MapCoordinate): number {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}
