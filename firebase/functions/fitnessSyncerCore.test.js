const test = require("node:test");
const assert = require("node:assert/strict");
const { activityDistanceKm, activityImportId, aggregateActivityMovement, fitnessServerConfigurationStatus, fitnessUserConfigurationStatus, normalizeFitnessSyncerReturnUrl, tokenExpiryMs } = require("./fitnessSyncerCore");

test("accepts measured walking, running, and cycling distances", () => {
  assert.equal(activityDistanceKm({ type: "Activity", fitnessSyncerActivity: "Walking", distanceKM: 3.25, itemId: "1" }), 3.25);
  assert.equal(activityDistanceKm({ item: { type: "Activity", activity: "Outdoor Cycling", distanceKM: 12.3456, itemId: "2" } }), 12.346);
});

test("rejects summaries, manual entries, and unsupported activities", () => {
  assert.equal(activityDistanceKm({ type: "Activity", activity: "Walking", distanceKM: 8, summary: true }), 0);
  assert.equal(activityDistanceKm({ type: "Activity", activity: "Running", distanceKM: 8, manual: true }), 0);
  assert.equal(activityDistanceKm({ type: "Activity", activity: "Swimming", distanceKM: 2 }), 0);
});

test("accepts case-insensitive Activity records and common distance field casing", () => {
  assert.equal(activityDistanceKm({ type: "activity", activity: "Walking", distanceKm: 4.2 }), 4.2);
});

test("uses measured daily steps when FitnessSyncer provides a summary", () => {
  const todayStart = Date.UTC(2026, 6, 20);
  const result = aggregateActivityMovement([
    { sourceId: "health", value: { type: "Activity", fitnessSyncerActivity: "Daily Activity", date: todayStart + 3_600_000, distanceKM: 0, steps: 10_000, summary: true } },
    { sourceId: "health", value: { type: "Activity", fitnessSyncerActivity: "Walking", date: todayStart + 7_200_000, distanceKM: 1.5, steps: 2_000 } }
  ], todayStart, todayStart);

  assert.equal(result.todaySteps, 10_000);
  assert.equal(result.weekSteps, 10_000);
  assert.equal(result.todayKm, 7.5);
  assert.equal(result.weekKm, 7.5);
});

test("does not double count the same day across multiple connected sources", () => {
  const todayStart = Date.UTC(2026, 6, 20);
  const result = aggregateActivityMovement([
    { sourceId: "watch", value: { type: "Activity", date: todayStart + 3_600_000, steps: 8_000, summary: true } },
    { sourceId: "phone", value: { type: "Activity", date: todayStart + 3_600_000, steps: 7_800, summary: true } }
  ], todayStart, todayStart);

  assert.equal(result.todaySteps, 8_000);
  assert.equal(result.todayKm, 6);
});

test("creates stable provider-scoped import ids", () => {
  const item = { type: "Activity", activity: "Walking", distanceKM: 2, itemId: "activity-1" };
  assert.equal(activityImportId("source-a", item), activityImportId("source-a", item));
  assert.notEqual(activityImportId("source-a", item), activityImportId("source-b", item));
});

test("keeps OAuth return URLs inside approved BugBaas apps", () => {
  const fallback = "https://bugbaas.vercel.app/";
  assert.equal(normalizeFitnessSyncerReturnUrl("https://bugbaasv3.vercel.app/settings", fallback), "https://bugbaasv3.vercel.app/settings");
  assert.equal(normalizeFitnessSyncerReturnUrl("bugbaas://settings", fallback), "bugbaas://settings");
  assert.equal(normalizeFitnessSyncerReturnUrl("https://evil.example/settings", fallback), fallback);
});

test("supports both epoch and duration token expiry values", () => {
  const now = 1_800_000_000_000;
  assert.equal(tokenExpiryMs(1_800_003_600, now), 1_800_003_600_000);
  assert.equal(tokenExpiryMs(3600, now), now + 3_600_000);
});

test("server configuration only requires the BugBaas token encryption key", () => {
  assert.deepEqual(fitnessServerConfigurationStatus({}), { configured: false, missingConfiguration: ["token_key"] });
  assert.deepEqual(fitnessServerConfigurationStatus({ FITNESSSYNCER_TOKEN_KEY: "set" }), { configured: true, missingConfiguration: [] });
});

test("user configuration requires a personal Client ID and Client Secret", () => {
  assert.deepEqual(fitnessUserConfigurationStatus({ clientId: "personal-id" }), {
    configured: false,
    missingConfiguration: ["client_secret"]
  });
  assert.deepEqual(fitnessUserConfigurationStatus({ clientId: "personal-id", clientSecret: "personal-secret" }), {
    configured: true,
    missingConfiguration: []
  });
});
