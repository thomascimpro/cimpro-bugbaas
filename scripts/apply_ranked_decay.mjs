#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const databaseId = "(default)";
const timeZone = "Europe/Amsterdam";
const defaultRating = 1000;
const ratingFloor = 100;
const decayPerMissedDay = 5;
const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--confirm-write");

function valueArg(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function dayIdInTimeZone(value, zone = timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: zone,
    year: "numeric"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function dayNumber(dayId) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayId ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  const date = new Date(value);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(value / 86400000);
}

export function dayIdFromNumber(value) {
  const date = new Date(value * 86400000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function calculateRankedDecay({ checkpointDay, rating, ratingUpdatedAt }, todayDayId) {
  const today = dayNumber(todayDayId);
  const rankedDayId = dayIdInTimeZone(ratingUpdatedAt);
  const rankedDay = dayNumber(rankedDayId);
  if (today === null || rankedDay === null) return null;

  const checkpoint = dayNumber(checkpointDay);
  const baseDay = Math.max(rankedDay, checkpoint ?? rankedDay);
  const lastCompleteDay = today - 1;
  const missedDays = Math.max(0, lastCompleteDay - baseDay);
  const currentRating = Math.round(Number(rating));
  if (!Number.isFinite(currentRating) || currentRating <= ratingFloor || missedDays === 0) return null;

  const nextRating = Math.max(ratingFloor, currentRating - missedDays * decayPerMissedDay);
  const decayedBy = currentRating - nextRating;
  if (decayedBy === 0) return null;
  return {
    checkpointDay: dayIdFromNumber(lastCompleteDay),
    decayedBy,
    missedDays,
    nextRating
  };
}

export function rankedDecayAnchor({ duelRatingUpdatedAt, duelSeasonResetAt, starterBoostGrantedAt, lastActiveAt }) {
  return [duelRatingUpdatedAt, duelSeasonResetAt, starterBoostGrantedAt, lastActiveAt]
    .find((value) => dayIdInTimeZone(value) !== null) ?? "";
}

function fieldString(document, field) {
  const value = document.fields?.[field];
  return value?.stringValue ?? value?.timestampValue ?? "";
}

function fieldNumber(document, field, fallback = 0) {
  const value = document.fields?.[field];
  const parsed = Number(value?.integerValue ?? value?.doubleValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldBool(document, field) {
  return document.fields?.[field]?.booleanValue ?? false;
}

function documentId(document) {
  return document.name.split("/").pop();
}

async function accessToken() {
  if (process.env.FIRESTORE_ACCESS_TOKEN) return process.env.FIRESTORE_ACCESS_TOKEN;
  try {
    const require = createRequire(import.meta.url);
    const firebaseToolsRoot = path.join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools", "lib");
    const auth = require(path.join(firebaseToolsRoot, "auth"));
    const scopes = require(path.join(firebaseToolsRoot, "scopes"));
    const account = await auth.getGlobalDefaultAccount();
    const token = await auth.getAccessToken(account?.tokens?.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM, scopes.EMAIL]);
    return typeof token === "string" ? token : token.access_token;
  } catch (error) {
    throw new Error(`No Firestore access token available: ${error.message}`);
  }
}

class FirestoreHttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function firestoreClient(projectId, token) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

  async function request(pathname, options = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new FirestoreHttpError(response.status, `${options.method ?? "GET"} ${pathname} failed: ${response.status} ${body}`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function listUsers() {
    const users = [];
    let pageToken = "";
    do {
      const suffix = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
      const page = await request(`/users?pageSize=300${suffix}`);
      users.push(...(page.documents ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return users;
  }

  function getUser(uid) {
    return request(`/users/${encodeURIComponent(uid)}`);
  }

  function updateDecay(uid, updateTime, result) {
    const query = [
      "updateMask.fieldPaths=duelRating",
      "updateMask.fieldPaths=duelRatingDecayThroughDay",
      `currentDocument.updateTime=${encodeURIComponent(updateTime)}`
    ].join("&");
    return request(`/users/${encodeURIComponent(uid)}?${query}`, {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          duelRating: { integerValue: String(result.nextRating) },
          duelRatingDecayThroughDay: { stringValue: result.checkpointDay }
        }
      })
    });
  }

  return { getUser, listUsers, updateDecay };
}

function decayForDocument(document, todayDayId) {
  if (fieldBool(document, "testAccount") || document.fields?.active?.booleanValue === false) return null;
  return calculateRankedDecay({
    checkpointDay: fieldString(document, "duelRatingDecayThroughDay"),
    rating: fieldNumber(document, "duelRating", defaultRating),
    ratingUpdatedAt: rankedDecayAnchor({
      duelRatingUpdatedAt: fieldString(document, "duelRatingUpdatedAt"),
      duelSeasonResetAt: fieldString(document, "duelSeasonResetAt"),
      starterBoostGrantedAt: fieldString(document, "starterBoostGrantedAt"),
      lastActiveAt: fieldString(document, "lastActiveAt")
    })
  }, todayDayId);
}

async function applyWithRetry(client, document, todayDayId) {
  let current = document;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = decayForDocument(current, todayDayId);
    if (!result) return null;
    try {
      await client.updateDecay(documentId(current), current.updateTime, result);
      return result;
    } catch (error) {
      if (!(error instanceof FirestoreHttpError) || error.status !== 412 || attempt === 1) throw error;
      current = await client.getUser(documentId(current));
    }
  }
  return null;
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.");
  const todayDayId = valueArg("--today") ?? dayIdInTimeZone(new Date());
  if (dayNumber(todayDayId) === null) throw new Error("--today must use YYYY-MM-DD.");

  const token = await accessToken();
  const client = firestoreClient(projectId, token);
  const users = await client.listUsers();
  const candidates = users
    .map((document) => ({ document, result: decayForDocument(document, todayDayId) }))
    .filter((item) => item.result);

  let updated = 0;
  let totalDecay = 0;
  if (!dryRun) {
    for (let index = 0; index < candidates.length; index += 10) {
      const chunk = candidates.slice(index, index + 10);
      const results = await Promise.all(chunk.map(({ document }) => applyWithRetry(client, document, todayDayId)));
      for (const result of results) {
        if (!result) continue;
        updated += 1;
        totalDecay += result.decayedBy;
      }
    }
  } else {
    updated = candidates.length;
    totalDecay = candidates.reduce((sum, item) => sum + item.result.decayedBy, 0);
  }

  const action = dryRun ? "Dry-run" : "Applied";
  console.log(`${action} ranked decay for ${todayDayId}: scanned=${users.length}, affected=${updated}, rating_removed=${totalDecay}.`);
  if (dryRun) console.log("No writes were made. Re-run with --confirm-write to apply decay.");
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
