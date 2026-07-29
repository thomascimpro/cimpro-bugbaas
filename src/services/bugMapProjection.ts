import type { MapCoordinate } from "./mapCellService";

export const OSM_TILE_SIZE = 256;
const MARKER_RADIUS = 22;
const MAX_MERCATOR_LATITUDE = 85.05112878;
const EARTH_RADIUS_METERS = 6371008.8;

export type MapViewport = { width: number; height: number };
export type ProjectedTile = { key: string; left: number; top: number; uri: string };

function clampLatitude(latitude: number) {
  return Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, latitude));
}

function wrapLongitude(longitude: number) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

function lonToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latToTileY(latitude: number, zoom: number) {
  const clamped = clampLatitude(latitude);
  const latRad = clamped * Math.PI / 180;
  return (1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * 2 ** zoom;
}

function tileXToLongitude(tileX: number, zoom: number) {
  return wrapLongitude(tileX / 2 ** zoom * 360 - 180);
}

function tileYToLatitude(tileY: number, zoom: number) {
  const worldTiles = 2 ** zoom;
  const clampedY = Math.max(0, Math.min(worldTiles, tileY));
  const mercator = Math.PI - 2 * Math.PI * clampedY / worldTiles;
  return clampLatitude(Math.atan(Math.sinh(mercator)) * 180 / Math.PI);
}

export function moveMapCenterByPixels(
  center: MapCoordinate,
  zoom: number,
  deltaX: number,
  deltaY: number
): MapCoordinate {
  const centerX = lonToTileX(center.longitude, zoom);
  const centerY = latToTileY(center.latitude, zoom);
  return {
    latitude: tileYToLatitude(centerY - deltaY / OSM_TILE_SIZE, zoom),
    longitude: tileXToLongitude(centerX - deltaX / OSM_TILE_SIZE, zoom)
  };
}

export function mapDistanceMeters(a: MapCoordinate, b: MapCoordinate) {
  const toRadians = Math.PI / 180;
  const latitudeA = a.latitude * toRadians;
  const latitudeB = b.latitude * toRadians;
  const latitudeDelta = (b.latitude - a.latitude) * toRadians;
  const longitudeDelta = wrapLongitude(b.longitude - a.longitude) * toRadians;
  const sinLatitude = Math.sin(latitudeDelta / 2);
  const sinLongitude = Math.sin(longitudeDelta / 2);
  const haversine = sinLatitude ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * sinLongitude ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function visibleMapRadiusMeters(center: MapCoordinate, zoom: number, viewport: MapViewport) {
  const halfWidth = Math.max(1, viewport.width) / 2;
  const halfHeight = Math.max(1, viewport.height) / 2;
  const corners = [
    moveMapCenterByPixels(center, zoom, halfWidth, halfHeight),
    moveMapCenterByPixels(center, zoom, halfWidth, -halfHeight),
    moveMapCenterByPixels(center, zoom, -halfWidth, halfHeight),
    moveMapCenterByPixels(center, zoom, -halfWidth, -halfHeight)
  ];
  const radius = Math.max(...corners.map((corner) => mapDistanceMeters(center, corner))) * 1.1;
  return Math.round(Math.min(3000, Math.max(250, radius)));
}

export function createMapProjection(center: MapCoordinate, zoom: number, viewport: MapViewport) {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const centerX = lonToTileX(center.longitude, zoom);
  const centerY = latToTileY(center.latitude, zoom);
  const halfTilesX = width / OSM_TILE_SIZE / 2;
  const halfTilesY = height / OSM_TILE_SIZE / 2;
  const minX = Math.floor(centerX - halfTilesX) - 1;
  const maxX = Math.ceil(centerX + halfTilesX) + 1;
  const minY = Math.floor(centerY - halfTilesY) - 1;
  const maxY = Math.ceil(centerY + halfTilesY) + 1;
  const worldTiles = 2 ** zoom;
  const tiles: ProjectedTile[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= worldTiles) continue;
    for (let x = minX; x <= maxX; x += 1) {
      const wrappedX = ((x % worldTiles) + worldTiles) % worldTiles;
      tiles.push({
        key: `${zoom}:${wrappedX}:${y}`,
        left: (x - centerX) * OSM_TILE_SIZE + width / 2,
        top: (y - centerY) * OSM_TILE_SIZE + height / 2,
        uri: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`
      });
    }
  }

  return {
    tiles,
    project(point: MapCoordinate) {
      return {
        left: (lonToTileX(point.longitude, zoom) - centerX) * OSM_TILE_SIZE + width / 2 - MARKER_RADIUS,
        top: (latToTileY(point.latitude, zoom) - centerY) * OSM_TILE_SIZE + height / 2 - MARKER_RADIUS
      };
    }
  };
}
