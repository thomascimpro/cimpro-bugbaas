import assert from "node:assert/strict";
import test from "node:test";
import { loadNearbySearchZones, nearbySearchZonesEndpoint, parseOsmSearchZones } from "./osmSearchZoneService.ts";

test("aborts a stalled nearby search-zone request", async () => {
  const fetchImpl: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });

  await assert.rejects(
    loadNearbySearchZones({ latitude: 52.0907, longitude: 5.1214 }, 1800, { fetchImpl, timeoutMs: 5 }),
    /unavailable/i
  );
});

test("derives biome bounds from Overpass bounds", () => {
  const zones = parseOsmSearchZones([{
    id: 6,
    center: { lat: 51.44, lon: 5.47 },
    bounds: { minlat: 51.438, minlon: 5.466, maxlat: 51.442, maxlon: 5.474 },
    tags: { natural: "water", name: "Testwater" }
  }]);

  assert.deepEqual(zones[0]?.bounds, { north: 51.442, south: 51.438, east: 5.474, west: 5.466 });
  assert.equal(zones[0]?.kind, "water");
});

test("derives biome bounds from OSM geometry", () => {
  const zones = parseOsmSearchZones([{
    id: 7,
    center: { lat: 52.09, lon: 5.12 },
    geometry: [
      { lat: 52.091, lon: 5.119 },
      { lat: 52.091, lon: 5.122 },
      { lat: 52.088, lon: 5.122 },
      { lat: 52.088, lon: 5.119 }
    ],
    tags: { leisure: "park", name: "Testpark" }
  }]);

  assert.deepEqual(zones[0]?.bounds, { north: 52.091, south: 52.088, east: 5.122, west: 5.119 });
  assert.equal(zones[0]?.kind, "park");
  assert.equal(zones[0]?.visualKind, "park");
});

test("uses separate garden art for OSM gardens", () => {
  const zones = parseOsmSearchZones([{
    id: 8,
    center: { lat: 51.44, lon: 5.48 },
    bounds: { minlat: 51.439, minlon: 5.479, maxlat: 51.441, maxlon: 5.481 },
    tags: { leisure: "garden", name: "Testtuin" }
  }]);

  assert.equal(zones[0]?.kind, "park");
  assert.equal(zones[0]?.visualKind, "garden");
});

test("uses the current Vercel origin on web", () => {
  assert.equal(
    nearbySearchZonesEndpoint(
      { latitude: 52.0907, longitude: 5.1214 },
      1800,
      { hostname: "bugbaasv3.vercel.app", origin: "https://bugbaasv3.vercel.app" }
    ),
    "https://bugbaasv3.vercel.app/api/nearby-search-zones?latitude=52.0907&longitude=5.1214&radius=1800"
  );
});

test("uses the production API when no browser origin exists", () => {
  assert.equal(
    nearbySearchZonesEndpoint({ latitude: 52.0907, longitude: 5.1214 }, 1800, {}),
    "https://bugbaas.vercel.app/api/nearby-search-zones?latitude=52.0907&longitude=5.1214&radius=1800"
  );
});

test("reloads zones after the viewed map center moves a few hundred meters", async () => {
  let requests = 0;
  const fetchImpl: typeof fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify({ elements: [] }), {
      headers: { "content-type": "application/json" },
      status: 200
    });
  };

  await loadNearbySearchZones({ latitude: 52.0901, longitude: 5.1211 }, 1777, { fetchImpl });
  await loadNearbySearchZones({ latitude: 52.0941, longitude: 5.1211 }, 1777, { fetchImpl });

  assert.equal(requests, 2);
});
