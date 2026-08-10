import assert from "node:assert/strict";
import test from "node:test";
import { parseRealBugIdentifyApiResponse, parseRealBugScanResponse, realBugScanApiUrl, realBugScanDayKey } from "./realBugScanContract.ts";

const validResponse = {
  ok: true,
  scanId: "scan-123",
  status: "matched",
  remainingScans: 2,
  identification: {
    bugId: "lieveheersbeestje",
    commonName: "Lieveheersbeestje",
    commonNameEn: "Ladybug",
    commonNameFr: "Coccinelle",
    scientificName: "Coccinellidae",
    fact: "Lieveheersbeestjes eten vaak bladluizen.",
    factEn: "Ladybugs often eat aphids.",
    factFr: "Les coccinelles mangent souvent des pucerons.",
    quizQuestion: "Wat eten veel lieveheersbeestjes?",
    quizQuestionEn: "What do many ladybugs eat?",
    quizQuestionFr: "Que mangent beaucoup de coccinelles ?",
    quizAnswer: "Bladluizen",
    quizAnswerEn: "Aphids",
    quizAnswerFr: "Des pucerons",
    quizWrongAnswers: ["Stenen", "Hout", "Zand"],
    quizWrongAnswersEn: ["Stones", "Wood", "Sand"],
    quizWrongAnswersFr: ["Des pierres", "Du bois", "Du sable"],
    quizExplanation: "Veel lieveheersbeestjes jagen op bladluizen.",
    quizExplanationEn: "Many ladybugs hunt aphids.",
    quizExplanationFr: "Beaucoup de coccinelles chassent les pucerons.",
    confidence: 0.93,
    reason: "Rode dekschilden met zwarte stippen.",
    reasonEn: "Red wing cases with black spots.",
    reasonFr: "Élytres rouges avec des points noirs."
  },
  reward: {
    granted: true,
    isNew: true,
    bugId: "lieveheersbeestje",
    bugName: "Lieveheersbeestje",
    rarity: "Zeldzaam",
    count: 1
  }
} as const;

test("parses a valid real bug scan response", () => {
  assert.deepEqual(parseRealBugScanResponse(validResponse), validResponse);
});

test("accepts an existing BugDex unlock without an owned copy", () => {
  const response = {
    ...validResponse,
    reward: {
      ...validResponse.reward,
      granted: false,
      isNew: false,
      count: 0
    }
  } as const;
  assert.deepEqual(parseRealBugScanResponse(response), response);
});

test("rejects a response with an invalid remaining scan count", () => {
  assert.throws(
    () => parseRealBugScanResponse({ ...validResponse, remainingScans: 7 }),
    /ongeldig scanresultaat/i
  );
});

test("parses the server identification response before the client reward step", () => {
  const apiResponse = {
    ok: true,
    scanId: "scan-123",
    status: "matched",
    remainingScans: 2,
    identification: validResponse.identification
  } as const;
  assert.deepEqual(parseRealBugIdentifyApiResponse(apiResponse), apiResponse);
});

test("parses a confident species that is not in the BugDex", () => {
  const apiResponse = {
    ok: true,
    scanId: "scan-unknown-1",
    status: "not_in_catalog",
    remainingScans: 1,
    identification: {
      bugId: null,
      commonName: "Aziatisch lieveheersbeestje",
      commonNameEn: "Asian lady beetle",
      commonNameFr: "Coccinelle asiatique",
      scientificName: "Harmonia axyridis",
      fact: "Deze soort heeft veel kleurvormen.",
      factEn: "This species has many color forms.",
      factFr: "Cette espèce présente de nombreuses formes colorées.",
      confidence: 0.92,
      reason: "De soort staat niet in de aangeleverde catalogus.",
      reasonEn: "The species is not in the supplied catalog.",
      reasonFr: "L'espèce ne figure pas dans le catalogue fourni."
    }
  } as const;
  assert.deepEqual(parseRealBugIdentifyApiResponse(apiResponse), apiResponse);
});

test("accepts a legacy API response when a safe remaining-scan fallback is supplied", () => {
  assert.deepEqual(
    parseRealBugIdentifyApiResponse({
      ok: true,
      scanId: "scan-123",
      status: "matched",
      identification: { ...validResponse.identification, scientificName: null }
    }, 2),
    {
      ok: true,
      scanId: "scan-123",
      status: "matched",
      remainingScans: 2,
      identification: { ...validResponse.identification, scientificName: "" }
    }
  );
});

test("rejects an API response without a valid remaining scan count or fallback", () => {
  assert.throws(
    () => parseRealBugIdentifyApiResponse({
      ok: true,
      scanId: "scan-123",
      status: "matched",
      remainingScans: 9,
      identification: validResponse.identification
    }),
    /ongeldig scanresultaat/i
  );
});

test("normalizes the configured API base URL", () => {
  assert.equal(realBugScanApiUrl("https://scan.example.com/"), "https://scan.example.com/api/real-bug-identify");
  assert.equal(realBugScanApiUrl(""), "/api/real-bug-identify");
});

test("uses Europe Amsterdam for daily scan limits", () => {
  assert.equal(realBugScanDayKey(new Date("2026-07-20T21:59:00.000Z")), "2026-07-20");
  assert.equal(realBugScanDayKey(new Date("2026-07-20T22:01:00.000Z")), "2026-07-21");
});
