const { createHash } = require("node:crypto");

const supportedActivities = ["walk", "walking", "hike", "hiking", "run", "running", "cycle", "cycling", "bike", "biking"];
const approvedReturnHosts = new Set([
  "bugbaas.vercel.app",
  "bugbaasv3.vercel.app",
  "bugbaasv3-6dnlxq9d8-thomas-cim-pro.vercel.app"
]);

function activityItem(value) {
  return value && typeof value === "object" && value.item && typeof value.item === "object" ? value.item : value;
}

function activityDistanceValue(item) {
  return Number(item?.distanceKM ?? item?.distanceKm ?? item?.distance_km);
}

function isActivityItem(item) {
  return String(item?.type || "").trim().toLowerCase() === "activity";
}

function activityDistanceKm(value) {
  const item = activityItem(value);
  if (!item || !isActivityItem(item) || item.summary === true || item.manual === true) return 0;
  const activity = String(item.fitnessSyncerActivity || item.activity || "").trim().toLowerCase();
  if (!supportedActivities.some((candidate) => activity === candidate || activity.includes(candidate))) return 0;
  const distance = activityDistanceValue(item);
  return Number.isFinite(distance) && distance > 0 ? Math.round(distance * 1000) / 1000 : 0;
}

function activityTimestamp(value) {
  const item = activityItem(value);
  const timestamp = Number(item?.date);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function activityMovement(value) {
  const item = activityItem(value);
  if (!item || !isActivityItem(item) || item.manual === true) return null;
  const summary = item.summary === true;
  const activity = String(item.fitnessSyncerActivity || item.activity || "").trim().toLowerCase();
  if (!summary && !supportedActivities.some((candidate) => activity === candidate || activity.includes(candidate))) return null;
  const distance = activityDistanceValue(item);
  const steps = Number(item.steps);
  const distanceKm = Number.isFinite(distance) && distance > 0 ? Math.round(distance * 1000) / 1000 : 0;
  const safeSteps = Number.isFinite(steps) && steps > 0 ? Math.round(steps) : 0;
  if (!distanceKm && !safeSteps) return null;
  return { distanceKm, steps: safeSteps, summary, timestamp: activityTimestamp(item) };
}

function aggregateActivityMovement(records, todayStart, weekStart) {
  const sourceDays = new Map();
  for (const record of records) {
    const movement = activityMovement(record?.value);
    if (!movement || movement.timestamp < weekStart) continue;
    const day = Math.floor(movement.timestamp / 86_400_000);
    const key = `${String(record.sourceId || "unknown")}:${day}`;
    const current = sourceDays.get(key) || {
      day,
      detailDistanceKm: 0,
      detailSteps: 0,
      summaryDistanceKm: 0,
      summarySteps: 0
    };
    if (movement.summary) {
      current.summaryDistanceKm = Math.max(current.summaryDistanceKm, movement.distanceKm);
      current.summarySteps = Math.max(current.summarySteps, movement.steps);
    } else {
      current.detailDistanceKm += movement.distanceKm;
      current.detailSteps += movement.steps;
    }
    sourceDays.set(key, current);
  }

  const days = new Map();
  for (const sourceDay of sourceDays.values()) {
    const distanceKm = Math.max(sourceDay.summaryDistanceKm, sourceDay.detailDistanceKm);
    const steps = Math.max(sourceDay.summarySteps, sourceDay.detailSteps);
    const current = days.get(sourceDay.day) || { distanceKm: 0, steps: 0 };
    current.distanceKm = Math.max(current.distanceKm, distanceKm);
    current.steps = Math.max(current.steps, steps);
    days.set(sourceDay.day, current);
  }

  let todayKm = 0;
  let todaySteps = 0;
  let weekKm = 0;
  let weekSteps = 0;
  const todayDay = Math.floor(todayStart / 86_400_000);
  for (const [day, movement] of days) {
    const effectiveKm = Math.max(movement.distanceKm, movement.steps * 0.00075);
    weekKm += effectiveKm;
    weekSteps += movement.steps;
    if (day >= todayDay) {
      todayKm += effectiveKm;
      todaySteps += movement.steps;
    }
  }
  return {
    todayKm: Math.round(todayKm * 100) / 100,
    todaySteps,
    weekKm: Math.round(weekKm * 100) / 100,
    weekSteps
  };
}

function activityImportId(sourceId, value) {
  const item = activityItem(value);
  const providerId = String(item?.itemId || `${activityTimestamp(item)}:${item?.distanceKM || 0}:${item?.activity || "activity"}`);
  return createHash("sha256").update(`${sourceId}:${providerId}`).digest("hex");
}

function fitnessServerConfigurationStatus(environment = {}) {
  const missingConfiguration = String(environment.FITNESSSYNCER_TOKEN_KEY || "").trim() ? [] : ["token_key"];
  return { configured: missingConfiguration.length === 0, missingConfiguration };
}

function fitnessUserConfigurationStatus(credentials = {}) {
  const missingConfiguration = [];
  if (!String(credentials.clientId || "").trim()) missingConfiguration.push("client_id");
  if (!String(credentials.clientSecret || "").trim()) missingConfiguration.push("client_secret");
  return { configured: missingConfiguration.length === 0, missingConfiguration };
}

function normalizeFitnessSyncerReturnUrl(value, fallback) {
  const safeFallback = String(fallback || "https://bugbaas.vercel.app/");
  if (!value) return safeFallback;
  try {
    const url = new URL(String(value));
    const isApprovedWeb = url.protocol === "https:" && approvedReturnHosts.has(url.hostname);
    const isBugBaasApp = url.protocol === "bugbaas:";
    const isLocalWeb = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return isApprovedWeb || isBugBaasApp || isLocalWeb ? url.toString() : safeFallback;
  } catch {
    return safeFallback;
  }
}

function tokenExpiryMs(expiresIn, now = Date.now()) {
  const value = Number(expiresIn);
  if (!Number.isFinite(value) || value <= 0) return now + 3600000;
  return value > Math.floor(now / 2000) ? value * 1000 : now + value * 1000;
}

module.exports = { activityDistanceKm, activityImportId, activityMovement, activityTimestamp, aggregateActivityMovement, fitnessServerConfigurationStatus, fitnessUserConfigurationStatus, normalizeFitnessSyncerReturnUrl, tokenExpiryMs };
