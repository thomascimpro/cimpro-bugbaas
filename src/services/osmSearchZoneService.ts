import type { MapCoordinate } from "./mapCellService";

export type SearchZoneKind = "park" | "water" | "nature";
export type SearchZoneVisualKind = "park" | "garden" | "water" | "nature";
export type SearchZoneBounds = { north: number; south: number; east: number; west: number };
export type SearchZone = MapCoordinate & { bounds?: SearchZoneBounds; id: string; kind: SearchZoneKind; label: string; visualKind: SearchZoneVisualKind };

type OverpassPoint = { lat?: number; lon?: number };
type OverpassBounds = { minlat?: number; minlon?: number; maxlat?: number; maxlon?: number };
type OverpassElement = { id?: number; lat?: number; lon?: number; center?: OverpassPoint; bounds?: OverpassBounds; geometry?: OverpassPoint[]; tags?: Record<string, string> };
type SearchZoneLoadOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };
type SearchZoneEndpointOptions = { hostname?: string; origin?: string; apiBaseUrl?: string };

const cache = new Map<string, { expiresAt: number; zones: SearchZone[] }>();
const overpassUrl = "https://overpass.private.coffee/api/interpreter";

function nearbySearchZonesQuery(center: MapCoordinate, radiusMeters: number): string {
  const radius = Math.min(3000, Math.max(250, Math.round(radiusMeters)));
  return `[out:json][timeout:8];(way(around:${radius},${center.latitude},${center.longitude})[leisure~"park|recreation_ground|garden"];way(around:${radius},${center.latitude},${center.longitude})[natural~"water|wetland|wood|scrub|heath"];way(around:${radius},${center.latitude},${center.longitude})[landuse~"forest|grass|reservoir|basin"];);out center bb 24;`;
}

async function loadDirectOverpass(center: MapCoordinate, radiusMeters: number, fetchImpl: typeof fetch, signal: AbortSignal) {
  const response = await fetchImpl(overpassUrl, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: nearbySearchZonesQuery(center, radiusMeters) }).toString(),
    signal
  });
  if (!response.ok) throw new Error("Search zones unavailable");
  return response.json() as Promise<{ elements?: OverpassElement[] }>;
}

function zoneKind(tags: Record<string, string> = {}): SearchZoneKind | undefined {
  if (["park", "recreation_ground", "garden", "meadow"].includes(tags.leisure) || tags.landuse === "grass") return "park";
  if (["water", "wetland"].includes(tags.natural) || ["reservoir", "basin"].includes(tags.landuse) || tags.waterway) return "water";
  if (["wood", "scrub", "heath"].includes(tags.natural) || tags.landuse === "forest") return "nature";
  return undefined;
}

function zoneVisualKind(kind: SearchZoneKind, tags: Record<string, string> = {}): SearchZoneVisualKind {
  if (tags.leisure === "garden") return "garden";
  return kind;
}

export function parseOsmSearchZones(elements: OverpassElement[]): SearchZone[] {
  const seen = new Set<string>();
  const zones: SearchZone[] = [];
  for (const element of elements) {
    const kind = zoneKind(element.tags);
    const geometry = (element.geometry ?? []).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    const latitudes = geometry.map((point) => point.lat as number);
    const longitudes = geometry.map((point) => point.lon as number);
    const elementBounds = element.bounds;
    const hasElementBounds = Number.isFinite(elementBounds?.minlat)
      && Number.isFinite(elementBounds?.minlon)
      && Number.isFinite(elementBounds?.maxlat)
      && Number.isFinite(elementBounds?.maxlon);
    const bounds = hasElementBounds ? {
      north: elementBounds?.maxlat as number,
      south: elementBounds?.minlat as number,
      east: elementBounds?.maxlon as number,
      west: elementBounds?.minlon as number
    } : geometry.length >= 3 ? {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes)
    } : undefined;
    const latitude = element.lat ?? element.center?.lat ?? (bounds ? (bounds.north + bounds.south) / 2 : undefined);
    const longitude = element.lon ?? element.center?.lon ?? (bounds ? (bounds.east + bounds.west) / 2 : undefined);
    if (!kind || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const access = element.tags?.access;
    if (["private", "no"].includes(access || "")) continue;
    const id = `${kind}:${element.id ?? `${latitude}:${longitude}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    zones.push({ bounds, id, kind, latitude: latitude as number, longitude: longitude as number, label: element.tags?.name || "", visualKind: zoneVisualKind(kind, element.tags) });
    if (zones.length >= 18) break;
  }
  return zones;
}

export function nearbySearchZonesEndpoint(
  center: MapCoordinate,
  radiusMeters = 1800,
  options: SearchZoneEndpointOptions = {}
): string {
  const params = new URLSearchParams({
    latitude: String(center.latitude),
    longitude: String(center.longitude),
    radius: String(radiusMeters)
  });
  const browserHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const hostname = options.hostname ?? browserHostname;
  const origin = options.origin ?? browserOrigin;
  const configured = options.apiBaseUrl?.trim().replace(/\/$/, "");
  const apiOrigin = configured
    || (["localhost", "127.0.0.1"].includes(hostname) ? "http://localhost:8084" : origin)
    || "https://bugbaas.vercel.app";
  return `${apiOrigin}/api/nearby-search-zones?${params.toString()}`;
}

export async function loadNearbySearchZones(
  center: MapCoordinate,
  radiusMeters = 1800,
  options: SearchZoneLoadOptions = {}
): Promise<SearchZone[]> {
  const key = `${center.latitude.toFixed(3)}:${center.longitude.toFixed(3)}:${radiusMeters}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.zones;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(nearbySearchZonesEndpoint(center, radiusMeters), { signal: controller.signal });
    let payload: { elements?: OverpassElement[] };
    const contentType = response.headers?.get?.("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      payload = await response.json() as { elements?: OverpassElement[] };
    } else if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      payload = await loadDirectOverpass(center, radiusMeters, fetchImpl, controller.signal);
    } else {
      if (cached) return cached.zones;
      throw new Error("Search zones unavailable");
    }
    const zones = parseOsmSearchZones(Array.isArray(payload.elements) ? payload.elements : []);
    cache.set(key, { zones, expiresAt: Date.now() + 30 * 60 * 1000 });
    return zones;
  } catch {
    if (cached) return cached.zones;
    throw new Error("Search zones unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
