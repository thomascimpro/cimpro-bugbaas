import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("BugBaas client Firebase config stays on the BugBaas project even when environment values are wrong", () => {
  const previous = {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    BUGBAAS_REQUIRE_ENV: process.env.BUGBAAS_REQUIRE_ENV
  };

  Object.assign(process.env, {
    FIREBASE_API_KEY: "wrong-api-key",
    FIREBASE_AUTH_DOMAIN: "wrong.firebaseapp.com",
    FIREBASE_PROJECT_ID: "wrong-project",
    FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    FIREBASE_APP_ID: "1:000000000000:web:wrong",
    BUGBAAS_REQUIRE_ENV: "0"
  });

  try {
    delete require.cache[require.resolve("../app.config.js")];
    const config = require("../app.config.js")();
    assert.equal(config.extra.firebaseProjectId, "thomascimpro-6266f");
    assert.equal(config.extra.firebaseAuthDomain, "thomascimpro-6266f.firebaseapp.com");
    assert.equal(config.extra.firebaseMessagingSenderId, "508370199825");
    assert.equal(config.extra.firebaseAppId, "1:508370199825:android:469f30507a5623e281d8b0");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("redacted or malformed API URLs never reach the Android bundle", () => {
  const previous = {
    REAL_BUG_SCAN_API_BASE_URL: process.env.REAL_BUG_SCAN_API_BASE_URL,
    BUG_BRAIN_API_BASE_URL: process.env.BUG_BRAIN_API_BASE_URL
  };

  Object.assign(process.env, {
    REAL_BUG_SCAN_API_BASE_URL: '"[SENSITIVE]"',
    BUG_BRAIN_API_BASE_URL: "not-a-url"
  });

  try {
    delete require.cache[require.resolve("../app.config.js")];
    const config = require("../app.config.js")();
    assert.equal(config.extra.realBugScanApiBaseUrl, "https://bugbaas.vercel.app");
    assert.equal(config.extra.bugBrainApiBaseUrl, "https://us-central1-thomascimpro-6266f.cloudfunctions.net");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("valid HTTPS API URLs are normalized and preserved", () => {
  const previous = process.env.REAL_BUG_SCAN_API_BASE_URL;
  process.env.REAL_BUG_SCAN_API_BASE_URL = "https://scan.example.com/";

  try {
    delete require.cache[require.resolve("../app.config.js")];
    const config = require("../app.config.js")();
    assert.equal(config.extra.realBugScanApiBaseUrl, "https://scan.example.com");
  } finally {
    if (previous === undefined) delete process.env.REAL_BUG_SCAN_API_BASE_URL;
    else process.env.REAL_BUG_SCAN_API_BASE_URL = previous;
  }
});
