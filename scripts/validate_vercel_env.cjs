const fs = require("node:fs");

const file = process.argv[2];
if (!file) throw new Error("Geef het pad naar een door Vercel opgehaald env-bestand.");

const values = {};
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const value = match[2].trim();
  values[match[1]] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

const required = [
  "OPENAI_API_KEY",
  "OPENAI_BUG_SCAN_MODEL",
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_ANDROID_CLIENT_ID",
  "BUG_SCAN_RECEIPT_SECRET",
  "BUG_SCAN_ALLOWED_ORIGINS",
  "REAL_BUG_SCAN_API_BASE_URL",
  "BUGBAAS_REQUIRE_ENV"
];
const missing = required.filter((key) => !String(values[key] || "").trim());
const secretIsConfigured = (key, minimumLength) => {
  const value = String(values[key] || "");
  return value.length >= minimumLength || /sensitive|encrypted/i.test(value) || /^\*+$/.test(value);
};
const result = {
  requiredVariables: required.length,
  missingCount: missing.length,
  modelCorrect: values.OPENAI_BUG_SCAN_MODEL === "gpt-5-mini",
  firebaseProjectCorrect: values.FIREBASE_PROJECT_ID === "thomascimpro-6266f",
  firebaseAuthDomainCorrect: values.FIREBASE_AUTH_DOMAIN === "thomascimpro-6266f.firebaseapp.com",
  productionApiCorrect: values.REAL_BUG_SCAN_API_BASE_URL === "https://bugbaas.vercel.app",
  requiredEnvGuard: values.BUGBAAS_REQUIRE_ENV === "1",
  openAiKeyConfigured: secretIsConfigured("OPENAI_API_KEY", 21),
  receiptSecretConfigured: secretIsConfigured("BUG_SCAN_RECEIPT_SECRET", 32)
};

console.log(JSON.stringify(result, null, 2));
if (missing.length || Object.entries(result).some(([, value]) => value === false)) process.exitCode = 1;
