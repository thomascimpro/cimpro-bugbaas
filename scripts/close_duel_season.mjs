#!/usr/bin/env node

import { createRequire } from "node:module";

const projectId = process.env.FIREBASE_PROJECT_ID;
const databaseId = "(default)";
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
const nowIso = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--confirm-write");
const force = args.has("--force");
const seasonId = valueArg("--season") ?? previousSeasonId();
const nextSeasonId = valueArg("--next-season") ?? currentSeasonId();

const rewardPlan = {
  1: { count: 1, label: "1 mythische bug", rarity: "Mythisch" },
  2: { count: 1, label: "1 legendarische bug", rarity: "Legendarisch" },
  3: { count: 2, label: "2 epische bugs", rarity: "Episch" },
  4: { count: 1, label: "1 epische bug", rarity: "Episch" },
  5: { count: 2, label: "2 zeldzame bugs", rarity: "Zeldzaam" }
};

const bugPools = {
  Zeldzaam: ["stinkwants", "snuitkever", "lieveheersbeestje", "tapijtkever", "roofwants", "duizendpoot", "sprinkhaan", "wesp", "schildwants", "houtmier", "kniptor", "loopkever", "waterkever", "schaatsenrijder", "goudtor", "tijgerkever", "doodgraver", "waterschorpioen", "rozekever", "vuurwants"],
  Episch: ["boktor", "hoornaar", "vogelspin", "reuzenkakkerlak", "bidsprinkhaan", "wandelend-blad", "libel", "waterjuffer", "gaasvlieg", "doodshoofdvlinder", "kolibrievlinder", "koninginnenpage", "atalanta", "dagpauwoog", "juweelkever", "pauwspin", "juweelwesp", "goudschildkever", "harlekijnwants", "lantaarnvlieg"],
  Legendarisch: ["schorpioen", "reuzen-duizendpoot", "neushoornkever", "atlaskever", "herculeskever", "goliathkever", "vliegend-hert", "orchidee-bidsprinkhaan", "smaragdlibel", "atlasvlinder", "dobsonvlieg", "spookinsect", "assassin-bug", "dolksteekwesp", "reuzenwaterwants", "zweepschorpioen", "rouwmantelvlinder", "keizersmantel", "olifantskever", "regenboogmestkever", "muskusboktor"],
  Mythisch: ["koningin-alexandravlinder", "zonsondergangsmot", "picasso-wants", "roze-esdoornmot", "giraffekevertje", "doornbloembidsprinkhaan", "lantaarndrager", "glorieuze-scarabee", "blauwe-morpho"]
};

const stringValue = (value) => ({ stringValue: String(value) });
const integerValue = (value) => ({ integerValue: String(Math.trunc(value)) });
const booleanValue = (value) => ({ booleanValue: Boolean(value) });
const arrayValue = (values) => ({ arrayValue: values.length ? { values } : {} });
const mapValue = (fields) => ({ mapValue: { fields } });
const docId = (name) => name.split("/").pop();

function valueArg(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function currentSeasonId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function previousSeasonId(date = new Date()) {
  return currentSeasonId(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

function fieldString(doc, field) {
  return doc.fields?.[field]?.stringValue ?? "";
}

function fieldBool(doc, field) {
  return doc.fields?.[field]?.booleanValue ?? false;
}

function fieldNumber(doc, field, fallback = 0) {
  const value = doc.fields?.[field];
  if (!value) return fallback;
  const raw = value.integerValue ?? value.doubleValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fieldStringArray(doc, field) {
  return (doc.fields?.[field]?.arrayValue?.values ?? [])
    .map((item) => item.stringValue)
    .filter((value) => typeof value === "string");
}

async function accessToken() {
  if (process.env.FIRESTORE_ACCESS_TOKEN) return process.env.FIRESTORE_ACCESS_TOKEN;
  try {
    const require = createRequire(import.meta.url);
    const auth = require("C:/Users/thoma.THOMAS/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth");
    const scopes = require("C:/Users/thoma.THOMAS/AppData/Roaming/npm/node_modules/firebase-tools/lib/scopes");
    const account = await auth.getGlobalDefaultAccount();
    const token = await auth.getAccessToken(account?.tokens?.refresh_token, [scopes.CLOUD_PLATFORM, scopes.FIREBASE_PLATFORM, scopes.EMAIL]);
    return typeof token === "string" ? token : token.access_token;
  } catch (error) {
    throw new Error(`No Firestore access token available: ${error.message}`);
  }
}

async function firestoreFetch(path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }
  return response.status === 204 ? null : response.json();
}

async function getDocument(path, token) {
  try {
    return await firestoreFetch(path, token);
  } catch (error) {
    if (String(error.message).includes(" 404 ")) return null;
    throw error;
  }
}

async function listCollection(path, token) {
  const docs = [];
  let pageToken = "";
  do {
    const separator = path.includes("?") ? "&" : "?";
    const page = await firestoreFetch(`${path}${separator}pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`, token);
    docs.push(...(page.documents ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return docs;
}

async function patchDocument(path, token, fields, fieldPaths) {
  const mask = fieldPaths.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  if (dryRun) {
    console.log(`[dry-run] PATCH ${path} ${fieldPaths.join(",")}`);
    return;
  }
  await firestoreFetch(`${path}${mask ? `?${mask}` : ""}`, token, {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}

function chooseRewardBugId(rarity, season, rank, index) {
  const pool = bugPools[rarity];
  const seed = [...`${season}:${rank}:${index}:${rarity}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return pool[seed % pool.length];
}

function rewardFields(reward) {
  return mapValue({ count: integerValue(reward.count), label: stringValue(reward.label), rarity: stringValue(reward.rarity) });
}

function seasonTopFields(top5) {
  return arrayValue(top5.map((item) => mapValue({
    bugIds: arrayValue(item.bugIds.map(stringValue)),
    displayName: stringValue(item.displayName),
    duelRating: integerValue(item.duelRating),
    rank: integerValue(item.rank),
    reward: rewardFields(item.reward),
    uid: stringValue(item.uid)
  })));
}

async function grantBug(token, userDoc, bugId, rarity, source) {
  const uid = docId(userDoc.name);
  const inventoryPath = `/users/${uid}/bugdex/${bugId}`;
  const unlockPath = `/users/${uid}/bugdexUnlocks/${bugId}`;
  const current = await getDocument(inventoryPath, token);
  const previousCount = current ? fieldNumber(current, "count", 0) : 0;
  const existingSources = current ? fieldStringArray(current, "sources") : [];
  const firstUnlockedAt = current ? fieldString(current, "firstUnlockedAt") || nowIso : nowIso;
  const sources = Array.from(new Set([...existingSources, source]));

  await patchDocument(inventoryPath, token, {
    bugId: stringValue(bugId),
    count: integerValue(previousCount + 1),
    firstUnlockedAt: stringValue(firstUnlockedAt),
    lastUnlockedAt: stringValue(nowIso),
    rarity: stringValue(rarity),
    sources: arrayValue(sources.map(stringValue))
  }, ["bugId", "count", "firstUnlockedAt", "lastUnlockedAt", "rarity", "sources"]);

  const unlock = await getDocument(unlockPath, token);
  const unlockSources = unlock ? fieldStringArray(unlock, "sources") : [];
  await patchDocument(unlockPath, token, {
    bugId: stringValue(bugId),
    firstUnlockedAt: stringValue(unlock ? fieldString(unlock, "firstUnlockedAt") || nowIso : nowIso),
    lastUnlockedAt: stringValue(nowIso),
    rarity: stringValue(rarity),
    sources: arrayValue(Array.from(new Set([...unlockSources, source])).map(stringValue))
  }, ["bugId", "firstUnlockedAt", "lastUnlockedAt", "rarity", "sources"]);

  return previousCount === 0;
}

async function updateUserCountersAndReset(token, userDoc, newUniqueCounts) {
  const uid = docId(userDoc.name);
  const bugDexCount = fieldNumber(userDoc, "bugDexCount", 0) + newUniqueCounts.total;
  const legendaryBugDexCount = fieldNumber(userDoc, "legendaryBugDexCount", 0) + newUniqueCounts.legendary;
  const mythicBugDexCount = fieldNumber(userDoc, "mythicBugDexCount", 0) + newUniqueCounts.mythic;
  await patchDocument(`/users/${uid}`, token, {
    bugDexCount: integerValue(bugDexCount),
    duelRating: integerValue(1000),
    duelSeasonId: stringValue(nextSeasonId),
    duelSeasonResetAt: stringValue(nowIso),
    legendaryBugDexCount: integerValue(legendaryBugDexCount),
    mythicBugDexCount: integerValue(mythicBugDexCount)
  }, ["bugDexCount", "duelRating", "duelSeasonId", "duelSeasonResetAt", "legendaryBugDexCount", "mythicBugDexCount"]);
}

async function writeClaim(token, userDoc, rank, reward, bugIds) {
  const uid = docId(userDoc.name);
  await patchDocument(`/users/${uid}/duelSeasonClaims/${seasonId}`, token, {
    bugIds: arrayValue(bugIds.map(stringValue)),
    claimedAt: stringValue(nowIso),
    displayName: stringValue(fieldString(userDoc, "displayName") || uid),
    rank: integerValue(rank),
    reward: rewardFields(reward),
    seasonId: stringValue(seasonId),
    uid: stringValue(uid)
  }, ["bugIds", "claimedAt", "displayName", "rank", "reward", "seasonId", "uid"]);
}

async function main() {
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required.");
  const token = await accessToken();
  const existingSeason = await getDocument(`/duelSeasons/${seasonId}`, token);
  if (existingSeason && !force) throw new Error(`Season ${seasonId} already closed. Use --force only if you know what you are doing.`);

  const users = (await listCollection("/users", token))
    .filter((user) => fieldString(user, "uid") || docId(user.name))
    .filter((user) => !fieldBool(user, "testAccount"))
    .filter((user) => user.fields?.active?.booleanValue !== false);

  const ranked = [...users]
    .sort((a, b) => fieldNumber(b, "duelRating", 1000) - fieldNumber(a, "duelRating", 1000) || fieldString(a, "displayName").localeCompare(fieldString(b, "displayName")));
  const winners = ranked.slice(0, 5);
  const top5 = [];

  for (let index = 0; index < winners.length; index += 1) {
    const user = winners[index];
    const uid = docId(user.name);
    const rank = index + 1;
    const reward = rewardPlan[rank];
    const existingClaim = await getDocument(`/users/${uid}/duelSeasonClaims/${seasonId}`, token);
    const bugIds = [];
    const newUniqueCounts = { legendary: 0, mythic: 0, total: 0 };

    if (!existingClaim) {
      for (let rewardIndex = 0; rewardIndex < reward.count; rewardIndex += 1) {
        const bugId = chooseRewardBugId(reward.rarity, seasonId, rank, rewardIndex);
        bugIds.push(bugId);
        const isNew = await grantBug(token, user, bugId, reward.rarity, `duel_season_${seasonId}`);
        if (isNew) {
          newUniqueCounts.total += 1;
          if (reward.rarity === "Legendarisch") newUniqueCounts.legendary += 1;
          if (reward.rarity === "Mythisch") newUniqueCounts.mythic += 1;
        }
      }
      await writeClaim(token, user, rank, reward, bugIds);
    } else {
      bugIds.push(...fieldStringArray(existingClaim, "bugIds"));
    }

    await updateUserCountersAndReset(token, user, newUniqueCounts);
    top5.push({
      bugIds,
      displayName: fieldString(user, "displayName") || uid,
      duelRating: fieldNumber(user, "duelRating", 1000),
      rank,
      reward,
      uid
    });
  }

  for (const user of users.filter((user) => !top5.some((winner) => winner.uid === docId(user.name)))) {
    await updateUserCountersAndReset(token, user, { legendary: 0, mythic: 0, total: 0 });
  }

  await patchDocument(`/duelSeasons/${seasonId}`, token, {
    closedAt: stringValue(nowIso),
    nextSeasonId: stringValue(nextSeasonId),
    rewardsLocked: booleanValue(true),
    seasonId: stringValue(seasonId),
    top5: seasonTopFields(top5)
  }, ["closedAt", "nextSeasonId", "rewardsLocked", "seasonId", "top5"]);

  console.log(`${dryRun ? "Dry-run checked" : "Closed"} duel season ${seasonId}. ${dryRun ? "Would reset" : "Reset"} ${users.length} users to ${nextSeasonId}.`);
  if (dryRun) console.log("No writes were made. Re-run with --confirm-write to close the season.");
  top5.forEach((winner) => console.log(`#${winner.rank} ${winner.displayName} ${winner.duelRating} rating: ${winner.reward.label} (${winner.bugIds.join(", ")})`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
