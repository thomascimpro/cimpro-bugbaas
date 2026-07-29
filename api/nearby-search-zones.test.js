const assert = require("node:assert/strict");
const test = require("node:test");
const handler = require("./nearby-search-zones.js");

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    payload: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("rejects invalid coordinates without calling Overpass", async () => {
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; throw new Error("unexpected"); };
  const response = responseRecorder();
  await handler({ method: "GET", query: { latitude: "99", longitude: "5" } }, response);
  global.fetch = originalFetch;
  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test("passes an abort signal to the Overpass request", async () => {
  const originalFetch = global.fetch;
  let signal;
  global.fetch = async (_url, options) => {
    signal = options.signal;
    return { ok: true, json: async () => ({ elements: [{ id: 1, lat: 52.09, lon: 5.12, tags: { leisure: "park" } }] }) };
  };
  const response = responseRecorder();
  await handler({ method: "GET", query: { latitude: "52.09", longitude: "5.12" } }, response);
  global.fetch = originalFetch;
  assert.ok(signal instanceof AbortSignal);
});

test("fails over when the first global Overpass mirror returns no data", async () => {
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    if (urls.length === 1) return { ok: true, json: async () => ({ elements: [] }) };
    return { ok: true, json: async () => ({ elements: [{ id: 2, center: { lat: 51.44, lon: 5.47 }, tags: { leisure: "park" } }] }) };
  };
  const response = responseRecorder();
  await handler({ method: "GET", query: { latitude: "51.4416", longitude: "5.4697" } }, response);
  global.fetch = originalFetch;
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.elements.length, 1);
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => !url.includes("overpass.osm.ch")));
});

test("uses Nominatim fallback when all Overpass mirrors are empty", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("nominatim.openstreetmap.org")) {
      return {
        ok: true,
        json: async () => [{
          osm_id: 99,
          lat: "51.44",
          lon: "5.47",
          name: "Fallback Park",
          category: "leisure",
          type: "park",
          boundingbox: ["51.438", "51.442", "5.466", "5.474"]
        }]
      };
    }
    return { ok: true, json: async () => ({ elements: [] }) };
  };
  const response = responseRecorder();
  await handler({ method: "GET", query: { latitude: "51.4416", longitude: "5.4697" } }, response);
  global.fetch = originalFetch;
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.elements[0].tags.name, "Fallback Park");
  assert.equal(response.payload.elements[0].bounds.maxlat, 51.442);
});

test("proxies bounded nearby habitat data and adds caching", async () => {
  const originalFetch = global.fetch;
  let requestBody = "";
  global.fetch = async (_url, options) => {
    requestBody = String(options.body);
    return { ok: true, json: async () => ({ elements: [{ id: 1, lat: 52.09, lon: 5.12, tags: { leisure: "park" } }] }) };
  };
  const response = responseRecorder();
  await handler({ method: "GET", query: { latitude: "52.09", longitude: "5.12", radius: "99999" } }, response);
  global.fetch = originalFetch;
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.elements.length, 1);
  assert.match(requestBody, /around%3A3000/);
  assert.match(requestBody, /out%2Bcenter%2Bbb%2B24|out\+center\+bb\+24/);
  assert.match(response.headers["Cache-Control"], /s-maxage=900/);
});
