const firebaseAuth = require("C:/Users/thoma.THOMAS/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js");

const projectId = "thomascimpro-6266f";
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const apiRoot = `https://firestore.googleapis.com/v1/${databaseRoot}`;
const releaseId = "3.0.6";

const resolutions = new Map([
  ["realbug_1784648253547_88l88if2", { bugId: "groene-sabelsprinkhaan", note: "Bestaande soort: groene sabelsprinkhaan." }],
  ["realbug_1784809408502_m6jczos4", { bugId: "rode-katoenwants", note: "Nieuwe soort: rode katoenwants (Dysdercus sp.)." }],
  ["realbug_1784884978588_h7ggdwnf", { bugId: "groene-sabelsprinkhaan", note: "Bestaande soort: groene sabelsprinkhaan." }],
  ["realbug_1785076973641_jestd1o6", { bugId: "koninginnenpage", note: "Bestaande soort: koninginnenpage (Papilio machaon)." }],
  ["realbug_1785095096146_hqkdic18", { bugId: "groene-sabelsprinkhaan", note: "Dezelfde foto en soort als een eerdere inzending." }],
  ["realbug_1785346564649_12oo7cnj", { bugId: "groene-vleesvlieg", note: "Bestaande soort: groene vleesvlieg (Lucilia sp.)." }],
  ["realbug_1785357034466_s285t1a3", { bugId: "gouden-wielwebspin", note: "Nieuwe soort: gouden wielwebspin (Trichonephila sp.)." }],
  ["realbug_1785402410721_2eeedhge", { bugId: "groene-sabelsprinkhaan", note: "Dezelfde foto en soort als een eerdere inzending." }]
]);

const catalog = require("../shared/bugdex-catalog.json");
const rarityByBugId = new Map(catalog.map((entry) => [entry.id, entry.rarity]));

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}

function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
}

async function request(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${payload.error?.message || "request failed"}`);
  return payload;
}

async function readDocument(token, path) {
  const document = await request(token, `${apiRoot}/${path}`);
  return document ? { createTime: document.createTime, data: decodeFields(document.fields), name: document.name, updateTime: document.updateTime } : null;
}

function updateWrite(path, data) {
  return {
    update: {
      name: `${databaseRoot}/${path}`,
      fields: encodeFields(data)
    },
    updateMask: {
      fieldPaths: Object.keys(data)
    }
  };
}

async function main() {
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI login ontbreekt.");
  const access = await firebaseAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || []);
  const token = access.access_token;
  const now = new Date().toISOString();
  const pending = [];

  for (const [recordId, resolution] of resolutions) {
    const document = await readDocument(token, `pendingBugDexDiscoveries/${recordId}`);
    if (!document) throw new Error(`Aanbeveling ontbreekt: ${recordId}`);
    const uid = String(document.data.userId || document.data.uid || "");
    if (!uid) throw new Error(`Aanbeveling zonder gebruiker: ${recordId}`);
    pending.push({ ...document, recordId, resolution, uid });
  }

  const awardedPairs = new Set(
    pending
      .filter((item) => item.data.rewardGrantedAt)
      .map((item) => `${item.uid}:${item.resolution.bugId}`)
  );
  const writes = [];
  const summary = [];

  for (const item of pending) {
    const pair = `${item.uid}:${item.resolution.bugId}`;
    const alreadyGranted = Boolean(item.data.rewardGrantedAt);
    const duplicateInBatch = awardedPairs.has(pair);
    const shouldAward = !alreadyGranted && !duplicateInBatch;
    if (!alreadyGranted) awardedPairs.add(pair);

    const reviewUpdate = {
      approvedAt: item.data.approvedAt || now,
      bugDexBugId: item.resolution.bugId,
      developerResolution: item.resolution.note,
      releaseId,
      rewardGranted: shouldAward,
      rewardReason: shouldAward ? "approved_species_reward" : alreadyGranted ? "already_granted" : "duplicate_user_species",
      status: "approved",
      updatedAt: now,
      ...(shouldAward ? { rewardGrantedAt: now } : {})
    };
    writes.push(updateWrite(`pendingBugDexDiscoveries/${item.recordId}`, reviewUpdate));

    if (shouldAward) {
      const inventoryPath = `users/${item.uid}/bugdex/${item.resolution.bugId}`;
      const unlockPath = `users/${item.uid}/bugdexUnlocks/${item.resolution.bugId}`;
      const [inventoryDocument, unlockDocument] = await Promise.all([
        readDocument(token, inventoryPath),
        readDocument(token, unlockPath)
      ]);
      const inventory = inventoryDocument?.data || {};
      const unlock = unlockDocument?.data || {};
      const rarity = String(inventory.rarity || unlock.rarity || rarityByBugId.get(item.resolution.bugId) || "Gewoon");
      const firstUnlockedAt = String(inventory.firstUnlockedAt || unlock.firstUnlockedAt || now);
      const sources = Array.from(new Set([...(Array.isArray(inventory.sources) ? inventory.sources : []), "developer_approved_scan"]));
      const unlockSources = Array.from(new Set([...(Array.isArray(unlock.sources) ? unlock.sources : []), "developer_approved_scan"]));
      writes.push(updateWrite(inventoryPath, {
        bugId: item.resolution.bugId,
        count: Math.max(0, Number(inventory.count || 0)) + 1,
        firstUnlockedAt,
        lastUnlockedAt: now,
        rarity,
        sources
      }));
      writes.push(updateWrite(unlockPath, {
        bugId: item.resolution.bugId,
        firstUnlockedAt,
        lastUnlockedAt: now,
        rarity,
        sources: unlockSources
      }));
    }

    summary.push({
      bugId: item.resolution.bugId,
      recordId: item.recordId,
      reward: shouldAward ? "1 copy" : alreadyGranted ? "already granted" : "duplicate skipped",
      user: String(item.data.userDisplayName || item.data.displayName || item.uid).slice(0, 40)
    });
  }

  console.table(summary);
  if (!process.argv.includes("--apply")) {
    console.log(`Dry-run: ${writes.length} atomische writes klaar. Gebruik --apply om uit te voeren.`);
    return;
  }

  await request(token, `https://firestore.googleapis.com/v1/${databaseRoot}:commit`, {
    method: "POST",
    body: JSON.stringify({ writes })
  });
  console.log(`Klaar: ${pending.length} aanbevelingen beoordeeld, ${summary.filter((item) => item.reward === "1 copy").length} unieke spelersoort-beloningen toegekend.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
