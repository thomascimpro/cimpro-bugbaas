import { existsSync, readFileSync } from "node:fs";

function loadEnv(path) {
  const result = {};
  if (!existsSync(path)) return result;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

function requireValue(value, name) {
  if (!String(value || "").trim()) throw new Error(`${name} is required.`);
  return String(value);
}

const localEnv = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const firebaseApiKey = requireValue(localEnv.FIREBASE_API_KEY, "FIREBASE_API_KEY");
const email = requireValue(process.env.BUGBAAS_TEST_EMAIL, "BUGBAAS_TEST_EMAIL");
const password = requireValue(process.env.BUGBAAS_TEST_PASSWORD, "BUGBAAS_TEST_PASSWORD");
const imageUrl = requireValue(process.env.BUGBAAS_TEST_IMAGE_URL, "BUGBAAS_TEST_IMAGE_URL");

const loginResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey)}`, {
  body: JSON.stringify({ email, password, returnSecureToken: true }),
  headers: { "content-type": "application/json" },
  method: "POST"
});
const login = await loginResponse.json();
if (!loginResponse.ok || !login.idToken) throw new Error(`Test login failed (${loginResponse.status}).`);

const imageResponse = await fetch(imageUrl);
if (!imageResponse.ok) throw new Error(`Test image download failed (${imageResponse.status}).`);
const imageDataUrl = `data:image/jpeg;base64,${Buffer.from(await imageResponse.arrayBuffer()).toString("base64")}`;
const scanId = `release-308-${Date.now()}`;
const scanResponse = await fetch("https://bugbaas.vercel.app/api/real-bug-identify", {
  body: JSON.stringify({ imageDataUrl, scanId }),
  headers: {
    authorization: `Bearer ${login.idToken}`,
    "content-type": "application/json",
    origin: "https://bugbaas.vercel.app"
  },
  method: "POST"
});
const scan = await scanResponse.json().catch(() => ({}));
console.log(JSON.stringify({
  confidence: scan.identification?.confidence,
  hasReceipt: Boolean(scan.receipt),
  http: scanResponse.status,
  name: scan.identification?.commonName,
  status: scan.status,
  step: "scan"
}));
if (!scanResponse.ok || !scan.receipt) throw new Error(`Production scan did not return a receipt (${scanResponse.status}).`);

const observationResponse = await fetch("https://us-central1-thomascimpro-6266f.cloudfunctions.net/recordVerifiedObservation", {
  body: JSON.stringify({
    behavior: "Vloog",
    habitat: "Park",
    location: {
      accuracyMeters: 8.4,
      capturedAt: new Date().toISOString(),
      latitude: 52.0907374,
      longitude: 5.1214201
    },
    receipt: scan.receipt
  }),
  headers: {
    authorization: `Bearer ${login.idToken}`,
    "content-type": "application/json",
    origin: "https://bugbaas.vercel.app"
  },
  method: "POST"
});
const observation = await observationResponse.json().catch(() => ({}));
console.log(JSON.stringify({
  behavior: observation.entry?.behavior,
  habitat: observation.entry?.habitat,
  hasPrivateLocation: Boolean(observation.entry?.privateLocation),
  http: observationResponse.status,
  saved: Boolean(observation.entry),
  scanId: observation.entry?.scanId,
  step: "fieldnote"
}));
if (!observationResponse.ok || observation.entry?.scanId !== scanId) {
  throw new Error(`Production field note save failed (${observationResponse.status}): ${observation.error || "unknown error"}`);
}
