const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePrivateSightingLocation, privateSightingMapCell } = require("./privateSightingMapCore");

test("stores only a rounded private map cell", () => {
  assert.deepEqual(privateSightingMapCell({ latitude: 52.0907374, longitude: 5.1214201 }), { latitudeE3: 52091, longitudeE3: 5121 });
});

test("normalizes precise owner-only location and derives a stable gameplay cell", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z");
  assert.deepEqual(normalizePrivateSightingLocation({
    latitude: 52.0907374,
    longitude: 5.1214201,
    accuracyMeters: 8.4,
    capturedAt: "2026-07-23T11:59:30.000Z"
  }, now), {
    privateLocation: {
      latitudeE5: 5209074,
      longitudeE5: 512142,
      accuracyMeters: 8,
      capturedAt: "2026-07-23T11:59:30.000Z"
    },
    locationCell: { latitudeE3: 52091, longitudeE3: 5121 },
    mapCellId: "34727:3414"
  });
});

test("accepts a coarse phone fix so a field note is not blocked indoors", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z");
  const result = normalizePrivateSightingLocation({ latitude: 52, longitude: 5, accuracyMeters: 1500, capturedAt: "2026-07-23T12:00:00.000Z" }, now);
  assert.equal(result.privateLocation.accuracyMeters, 1500);
  assert.deepEqual(result.locationCell, { latitudeE3: 52000, longitudeE3: 5000 });
});

test("rejects malformed, stale, unusably inaccurate or out-of-range locations", () => {
  const now = Date.parse("2026-07-23T12:00:00.000Z");
  assert.equal(privateSightingMapCell({ latitude: 91, longitude: 5 }), undefined);
  assert.equal(privateSightingMapCell({ latitude: "52", longitude: 5 }), undefined);
  assert.equal(privateSightingMapCell(undefined), undefined);
  assert.equal(normalizePrivateSightingLocation({ latitude: 52, longitude: 5, accuracyMeters: 5001, capturedAt: "2026-07-23T12:00:00.000Z" }, now), undefined);
  assert.equal(normalizePrivateSightingLocation({ latitude: 52, longitude: 5, accuracyMeters: 10, capturedAt: "2026-07-23T11:40:00.000Z" }, now), undefined);
});
