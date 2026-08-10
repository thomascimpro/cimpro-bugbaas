const fs = require("node:fs");
const firebaseAuth = require("C:/Users/thoma.THOMAS/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js");

const projectId = "thomascimpro-6266f";
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const samples = [
  ["realbug_1784648253547_88l88if2", "groene sabelsprinkhaan"],
  ["realbug_1784809408502_m6jczos4", "rode katoenwants"],
  ["realbug_1785076973641_jestd1o6", "koninginnenpage"],
  ["realbug_1785346564649_12oo7cnj", "groene vleesvlieg"]
];

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  loadEnv(".env.real-bug-scan.local");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ontbreekt.");
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("Firebase CLI login ontbreekt.");
  const access = await firebaseAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes || []);
  const { createOpenAIImageIdentifier } = await import("../server/realBugScan/openaiVision.mjs");
  const documents = [];
  for (const [id, expected] of samples) {
    const response = await fetch(`https://firestore.googleapis.com/v1/${databaseRoot}/pendingBugDexDiscoveries/${id}`, {
      headers: { Authorization: `Bearer ${access.access_token}` }
    });
    if (!response.ok) continue;
    const payload = await response.json();
    const data = decodeFields(payload.fields || {});
    if (typeof data.reviewThumbnailDataUrl === "string") documents.push({ expected, id, imageDataUrl: data.reviewThumbnailDataUrl });
  }
  if (!documents.length) throw new Error("Geen reviewfoto's beschikbaar.");

  const results = [];
  for (const model of ["gpt-5-mini", "gpt-5.6-luna"]) {
    const identify = createOpenAIImageIdentifier({ apiKey: process.env.OPENAI_API_KEY, model });
    for (const document of documents) {
      const startedAt = Date.now();
      try {
        const result = await identify({ imageDataUrl: document.imageDataUrl });
        const actual = normalized(result.commonName);
        const expected = normalized(document.expected);
        results.push({
          model,
          sample: document.id.slice(-8),
          expected: document.expected,
          actual: result.commonName,
          confidence: Math.round(Number(result.confidence || 0) * 100),
          exact: actual === expected || actual.includes(expected) || expected.includes(actual),
          seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1))
        });
      } catch (error) {
        results.push({ model, sample: document.id.slice(-8), expected: document.expected, actual: error instanceof Error ? error.message : "failed", confidence: 0, exact: false, seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)) });
      }
    }
  }
  console.table(results);
  for (const model of ["gpt-5-mini", "gpt-5.6-luna"]) {
    const rows = results.filter((row) => row.model === model);
    console.log(`${model}: ${rows.filter((row) => row.exact).length}/${rows.length} exact, gemiddeld ${Number((rows.reduce((sum, row) => sum + row.seconds, 0) / Math.max(1, rows.length)).toFixed(1))}s`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
