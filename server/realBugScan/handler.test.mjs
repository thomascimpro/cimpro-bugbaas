import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../../shared/bugdex-catalog.json" with { type: "json" };
import { RealBugScanQuotaError } from "./firebaseUsageStore.mjs";
import { createRealBugIdentifyHandler } from "./handler.mjs";

function createResponse() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end() {
      return this;
    }
  };
}

function validRequest(overrides = {}) {
  return {
    method: "POST",
    headers: {
      authorization: "Bearer firebase-token",
      origin: "http://localhost:8081"
    },
    body: {
      scanId: "scan-123",
      imageDataUrl: "data:image/jpeg;base64,YWJjZA=="
    },
    ...overrides
  };
}

test("returns a normalized known BugDex match", async () => {
  const handler = createRealBugIdentifyHandler({
    catalog,
    allowedOrigins: ["http://localhost:8081"],
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 3 }),
    reserveUsage: async ({ idToken, uid, dayKey, scanId }) => {
      assert.equal(idToken, "firebase-token");
      assert.equal(uid, "user-1");
      assert.match(dayKey, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(scanId, "scan-123");
      return { remainingScans: 2 };
    },
    identifyImage: async () => ({
      containsBug: true,
      imageQuality: "good",
      catalogStatus: "matched",
      matchedBugId: "lieveheersbeestje",
      commonName: "Lieveheersbeestje",
      scientificName: "Coccinellidae",
      confidence: 0.94,
      reason: "Rode dekschilden met zwarte stippen."
    })
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "matched");
  assert.equal(response.body.identification.bugId, "lieveheersbeestje");
  assert.equal(response.body.scanId, "scan-123");
  assert.equal(response.body.remainingScans, 2);
});

test("does not consume a daily scan for an uncertain identification", async () => {
  let reserveCalls = 0;
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 2 }),
    reserveUsage: async () => {
      reserveCalls += 1;
      return { remainingScans: 1 };
    },
    identifyImage: async () => ({
      containsBug: true,
      imageQuality: "good",
      catalogStatus: "uncertain",
      matchedBugId: null,
      commonName: "Onzekere kever",
      scientificName: "",
      confidence: 0.45,
      reason: "De soort is niet betrouwbaar genoeg te bepalen."
    })
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "pending_review");
  assert.equal(response.body.remainingScans, 2);
  assert.equal(reserveCalls, 0);
});

for (const rejectedResult of [
  {
    expectedStatus: "rejected_no_bug",
    identification: {
      containsBug: false,
      imageQuality: "good",
      catalogStatus: "uncertain",
      matchedBugId: null,
      commonName: "Geen bug",
      scientificName: "",
      confidence: 0.98,
      reason: "Er is geen insect of spin zichtbaar."
    }
  },
  {
    expectedStatus: "rejected_quality",
    identification: {
      containsBug: true,
      imageQuality: "poor",
      catalogStatus: "uncertain",
      matchedBugId: null,
      commonName: "Onduidelijke bug",
      scientificName: "",
      confidence: 0.3,
      reason: "De foto is te onscherp."
    }
  },
  {
    expectedStatus: "rejected_authenticity",
    identification: {
      containsBug: true,
      imageQuality: "good",
      captureAuthenticity: "reproduction",
      authenticityReason: "Een monitorrand en pixelpatroon zijn zichtbaar.",
      catalogStatus: "matched",
      matchedBugId: "lieveheersbeestje",
      commonName: "Lieveheersbeestje",
      scientificName: "Coccinellidae",
      confidence: 0.99,
      reason: "De bug staat op een computerscherm."
    }
  }
]) {
  test(`does not consume a daily scan for ${rejectedResult.expectedStatus}`, async () => {
    let reserveCalls = 0;
    const handler = createRealBugIdentifyHandler({
      catalog,
      verifyIdToken: async () => ({ uid: "user-1" }),
      checkUsage: async () => ({ remainingScans: 2 }),
      reserveUsage: async () => {
        reserveCalls += 1;
        return { remainingScans: 1 };
      },
      identifyImage: async () => rejectedResult.identification
    });
    const response = createResponse();

    await handler(validRequest(), response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.status, rejectedResult.expectedStatus);
    assert.equal(response.body.remainingScans, 2);
    assert.equal(reserveCalls, 0);
  });
}

test("consumes a daily scan for a valid species outside the catalog", async () => {
  let reserveCalls = 0;
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 2 }),
    reserveUsage: async () => {
      reserveCalls += 1;
      return { remainingScans: 1 };
    },
    identifyImage: async () => ({
      containsBug: true,
      imageQuality: "good",
      catalogStatus: "not_in_catalog",
      matchedBugId: null,
      commonName: "Nieuwe wants",
      commonNameEn: "New shield bug",
      commonNameFr: "Nouvelle punaise",
      scientificName: "Pentatomidae nova",
      fact: "Wantsen gebruiken een zuigsnuit om voedsel op te nemen.",
      factEn: "Shield bugs use a piercing mouthpart to feed.",
      factFr: "Les punaises utilisent un rostre pour se nourrir.",
      confidence: 0.91,
      reason: "Een duidelijke wants die niet in de catalogus staat."
    })
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "not_in_catalog");
  assert.equal(response.body.remainingScans, 1);
  assert.equal(reserveCalls, 1);
});

test("returns the daily limit when quota fills during identification", async () => {
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 1 }),
    reserveUsage: async () => {
      throw new RealBugScanQuotaError("limit");
    },
    identifyImage: async () => ({
      containsBug: true,
      imageQuality: "good",
      catalogStatus: "matched",
      matchedBugId: "lieveheersbeestje",
      commonName: "Lieveheersbeestje",
      scientificName: "Coccinellidae",
      confidence: 0.94,
      reason: "Rode dekschilden met zwarte stippen."
    })
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 429);
  assert.match(response.body.error, /daglimiet/i);
});

test("rejects requests when the daily server quota is exhausted", async () => {
  let identifyCalls = 0;
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => {
      throw new RealBugScanQuotaError("limit");
    },
    reserveUsage: async () => {
      throw new Error("should not run");
    },
    identifyImage: async () => {
      identifyCalls += 1;
      throw new Error("should not run");
    }
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 429);
  assert.equal(identifyCalls, 0);
  assert.match(response.body.error, /daglimiet/i);
});

test("rejects requests without a Firebase bearer token", async () => {
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "unused" }),
    checkUsage: async () => ({ remainingScans: 3 }),
    reserveUsage: async () => ({ remainingScans: 2 }),
    identifyImage: async () => {
      throw new Error("should not run");
    }
  });
  const response = createResponse();

  await handler(validRequest({ headers: {} }), response);

  assert.equal(response.statusCode, 401);
  assert.match(response.body.error, /inloggen/i);
});

test("rejects non-image data URLs", async () => {
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 3 }),
    reserveUsage: async () => ({ remainingScans: 2 }),
    identifyImage: async () => {
      throw new Error("should not run");
    }
  });
  const response = createResponse();

  await handler(validRequest({ body: { scanId: "scan-123", imageDataUrl: "hello" } }), response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /afbeelding/i);
});

test("returns a safe upstream error when image analysis fails", async () => {
  let reserveCalls = 0;
  const handler = createRealBugIdentifyHandler({
    catalog,
    verifyIdToken: async () => ({ uid: "user-1" }),
    checkUsage: async () => ({ remainingScans: 3 }),
    reserveUsage: async () => {
      reserveCalls += 1;
      return { remainingScans: 2 };
    },
    identifyImage: async () => {
      throw new Error("OpenAI unavailable");
    }
  });
  const response = createResponse();

  await handler(validRequest(), response);

  assert.equal(response.statusCode, 502);
  assert.match(response.body.error, /analyse/i);
  assert.equal(reserveCalls, 0);
});

test("answers CORS preflight without calling dependencies", async () => {
  const handler = createRealBugIdentifyHandler({
    catalog,
    allowedOrigins: ["http://localhost:8081"],
    verifyIdToken: async () => {
      throw new Error("should not run");
    },
    checkUsage: async () => ({ remainingScans: 3 }),
    reserveUsage: async () => ({ remainingScans: 2 }),
    identifyImage: async () => {
      throw new Error("should not run");
    }
  });
  const response = createResponse();

  await handler(validRequest({ method: "OPTIONS" }), response);

  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["Access-Control-Allow-Origin"], "http://localhost:8081");
});
