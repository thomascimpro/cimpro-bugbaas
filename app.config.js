const appConfig = require("./app.json");

const canonicalFirebaseExtra = {
  firebaseApiKey: "AIzaSyDSoTGqmjFMIzlVBjgNt55gCqpr4bsM9R4",
  firebaseAuthDomain: "thomascimpro-6266f.firebaseapp.com",
  firebaseProjectId: "thomascimpro-6266f",
  firebaseMessagingSenderId: "508370199825",
  firebaseAppId: "1:508370199825:android:469f30507a5623e281d8b0"
};

const requiredExtraEnv = {
  googleClientId: "GOOGLE_CLIENT_ID",
  googleAndroidClientId: "GOOGLE_ANDROID_CLIENT_ID"
};

function safeHttpsUrl(envName, fallback) {
  const rawValue = String(process.env[envName] ?? "").trim();
  const value = rawValue.replace(/^(["'])(.*)\1$/, "$2").trim();
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && parsed.hostname) return value.replace(/\/+$/, "");
  } catch {
    // A redacted or malformed build-time value must never reach the app bundle.
  }
  return fallback;
}

function readExtra() {
  const extra = Object.fromEntries(
    Object.entries(requiredExtraEnv).map(([key, envName]) => [key, process.env[envName] ?? ""])
  );
  if (process.env.BUGBAAS_REQUIRE_ENV === "1") {
    const missing = Object.entries(requiredExtraEnv)
      .filter(([, envName]) => !process.env[envName])
      .map(([, envName]) => envName);
    if (missing.length) {
      throw new Error(`Missing required BugBaas env vars: ${missing.join(", ")}`);
    }
  }
  return extra;
}

module.exports = () => ({
  ...appConfig.expo,
  plugins: Array.from(new Set([...(appConfig.expo.plugins ?? []), "expo-asset"])),
  extra: {
    ...(appConfig.expo.extra ?? {}),
    ...readExtra(),
    ...canonicalFirebaseExtra,
    bugBrainApiBaseUrl: safeHttpsUrl("BUG_BRAIN_API_BASE_URL", "https://us-central1-thomascimpro-6266f.cloudfunctions.net"),
    fitnessSyncerApiBaseUrl: safeHttpsUrl("FITNESSSYNCER_API_BASE_URL", "https://us-central1-thomascimpro-6266f.cloudfunctions.net"),
    swarmSiegeApiBaseUrl: safeHttpsUrl("SWARM_SIEGE_API_BASE_URL", "https://us-central1-thomascimpro-6266f.cloudfunctions.net"),
    realBugScanApiBaseUrl: safeHttpsUrl("REAL_BUG_SCAN_API_BASE_URL", "https://bugbaas.vercel.app")
  }
});
