const overpassUrls = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];
const overpassTimeoutMs = 4500;
const nominatimUrl = "https://nominatim.openstreetmap.org/search";

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function viewboxFor(latitude, longitude, radiusMeters) {
  const latitudeDelta = radiusMeters / 111320;
  const longitudeScale = Math.max(0.2, Math.cos(latitude * Math.PI / 180));
  const longitudeDelta = radiusMeters / (111320 * longitudeScale);
  return [
    longitude - longitudeDelta,
    latitude + latitudeDelta,
    longitude + longitudeDelta,
    latitude - latitudeDelta
  ].join(",");
}

async function loadNominatimFallback(latitude, longitude, radiusMeters) {
  const searches = [
    { query: "park", tags: { leisure: "park" } },
    { query: "water", tags: { natural: "water" } },
    { query: "wood", tags: { natural: "wood" } }
  ];
  const elements = [];
  const viewbox = viewboxFor(latitude, longitude, radiusMeters);

  for (let index = 0; index < searches.length; index += 1) {
    if (index > 0) await wait(1050);
    const search = searches[index];
    const params = new URLSearchParams({
      format: "jsonv2",
      q: search.query,
      viewbox,
      bounded: "1",
      limit: "6"
    });
    const response = await fetch(`${nominatimUrl}?${params.toString()}`, {
      headers: { "Accept": "application/json", "User-Agent": "BugBaas/3.0 (+https://bugbaas.vercel.app)" }
    });
    if (!response.ok) continue;
    const results = await response.json();
    for (const result of Array.isArray(results) ? results : []) {
      const boundingbox = Array.isArray(result?.boundingbox) ? result.boundingbox.map(Number) : [];
      const lat = Number(result?.lat);
      const lon = Number(result?.lon);
      if (boundingbox.length !== 4 || boundingbox.some((value) => !Number.isFinite(value)) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      elements.push({
        id: Number(result.osm_id) || `${search.query}:${lat}:${lon}`,
        center: { lat, lon },
        bounds: { minlat: boundingbox[0], maxlat: boundingbox[1], minlon: boundingbox[2], maxlon: boundingbox[3] },
        tags: { ...search.tags, name: String(result.name || "") }
      });
      if (elements.length >= 18) return elements;
    }
  }
  return elements;
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

module.exports = async function nearbySearchZonesApi(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const latitude = finiteNumber(request.query?.latitude);
  const longitude = finiteNumber(request.query?.longitude);
  const requestedRadius = finiteNumber(request.query?.radius);
  const radius = Math.min(3000, Math.max(250, Math.round(requestedRadius ?? 1800)));

  if (latitude === undefined || longitude === undefined || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return response.status(400).json({ error: "Invalid coordinates" });
  }

  const query = `[out:json][timeout:8];(way(around:${radius},${latitude},${longitude})[leisure~"park|recreation_ground|garden"];way(around:${radius},${latitude},${longitude})[natural~"water|wetland|wood|scrub|heath"];way(around:${radius},${latitude},${longitude})[landuse~"forest|grass|reservoir|basin"];);out center bb 24;`;

  let lastEmpty = [];
  for (const overpassUrl of overpassUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), overpassTimeoutMs);
    try {
      const upstream = await fetch(overpassUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "BugBaas/3.0 (+https://bugbaas.vercel.app)"
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal
      });
      if (!upstream.ok) continue;
      const payload = await upstream.json();
      const elements = Array.isArray(payload?.elements) ? payload.elements : [];
      if (!elements.length) {
        lastEmpty = elements;
        continue;
      }
      response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
      return response.status(200).json({ elements });
    } catch {
      // Try the next global mirror.
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const fallbackElements = await loadNominatimFallback(latitude, longitude, radius);
    if (fallbackElements.length) {
      response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
      return response.status(200).json({ elements: fallbackElements });
    }
  } catch {
    // Return the last valid empty result below.
  }

  response.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  return response.status(200).json({ elements: lastEmpty });
};
