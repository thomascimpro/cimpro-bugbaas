import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAIImageIdentifier } from "./openaiVision.mjs";

const visual = {
  containsBug: true,
  visibleArthropodCount: 1,
  bodyPlan: "ant",
  imageQuality: "good",
  captureAuthenticity: "live",
  authenticityReason: "Natural scene and depth.",
  commonName: "Mier",
  commonNameEn: "Ant",
  commonNameFr: "Fourmi",
  scientificName: "Formicidae",
  taxonomicRank: "family",
  speciesDiagnosticTraitsVisible: 0,
  strongestAlternative: "Een andere mierensoort",
  alternativeConflictsWithChosenGenus: false,
  visualEvidence: ["Kop, mesosoma, smalle taille en glanzend achterlijf"],
  photoContestScore: 72,
  photoContestReason: "De mier is zichtbaar in een natuurlijke omgeving.",
  confidence: 0.86,
  reason: "Kop, mesosoma, smalle taille en achterlijf vormen één mier.",
  reasonEn: "Head, mesosoma, narrow waist and gaster form one ant.",
  reasonFr: "La tête, le mésosome, la taille et le gastre forment une fourmi."
};

const learning = {
  fact: "Mieren volgen geursporen met hun antennes.",
  factEn: "Ants follow scent trails with their antennae.",
  factFr: "Les fourmis suivent des pistes odorantes avec leurs antennes.",
  quizQuestion: "Waarvoor gebruikt een mier haar antennes?",
  quizQuestionEn: "What does an ant use its antennae for?",
  quizQuestionFr: "À quoi servent les antennes d'une fourmi ?",
  quizAnswer: "Om te ruiken", quizAnswerEn: "To smell", quizAnswerFr: "Pour sentir",
  quizWrongAnswers: ["Om te vliegen", "Om te zwemmen", "Om licht te maken"],
  quizWrongAnswersEn: ["To fly", "To swim", "To make light"],
  quizWrongAnswersFr: ["Pour voler", "Pour nager", "Pour faire de la lumière"],
  quizExplanation: "Met antennes kan een mier geursporen waarnemen.",
  quizExplanationEn: "An ant senses scent trails with its antennae.",
  quizExplanationFr: "Une fourmi détecte les pistes odorantes avec ses antennes."
};

function successfulResponse(value) {
  return { ok: true, json: async () => ({ output_text: JSON.stringify(value) }) };
}

function successfulPipeline(requestBodies, visualResult = visual, learningResult = learning) {
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    requestBodies.push(body);
    return successfulResponse(body.text.format.name.startsWith("bug_visual") ? visualResult : learningResult);
  };
}

test("runs a focused anatomy gate before text-only learning copy", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({ apiKey: "test-key", model: "gpt-test", fetchImpl: successfulPipeline(requestBodies) });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });

  assert.equal(result.commonName, "Mier");
  assert.equal(result.fact, learning.fact);
  assert.equal(result.catalogStatus, "uncertain");
  assert.equal(result.matchedBugId, null);
  assert.equal(requestBodies.length, 2);

  const gate = requestBodies[0];
  assert.equal(gate.model, "gpt-test");
  assert.equal(gate.max_output_tokens, 2400);
  assert.equal(gate.reasoning.effort, "medium");
  assert.equal(gate.input[0].content[1].image_url, "data:image/jpeg;base64,YWJjZA==");
  assert.equal(gate.input[0].content[1].detail, "original");
  assert.match(gate.input[0].content[0].text, /first lock the body plan/i);
  assert.match(gate.input[0].content[0].text, /shiny dark oval never proves beetle/i);
  assert.match(gate.input[0].content[0].text, /narrow petiole.*gaster is an ant/i);
  assert.match(gate.input[0].content[0].text, /strongest alternative/i);
  assert.match(gate.input[0].content[0].text, /not given the BugDex catalog/i);
  assert.equal(gate.text.format.schema.properties.bodyPlan.enum.includes("ant"), true);

  const enrichment = requestBodies[1];
  assert.equal(enrichment.reasoning.effort, "low");
  assert.equal(enrichment.input[0].content.length, 1);
  assert.match(enrichment.input[0].content[0].text, /locked identification/i);
  assert.match(enrichment.input[0].content[0].text, /do not identify the image again/i);
  assert.match(enrichment.input[0].content[0].text, /never ask its name/i);
});

test("sends overview before crop without adding catalog hints", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({ apiKey: "test-key", fetchImpl: successfulPipeline(requestBodies) });
  await identifyImage({ imageDataUrl: "data:image/jpeg;base64,Y3JvcA==", overviewImageDataUrl: "data:image/jpeg;base64,b3ZlcnZpZXc=" });

  const content = requestBodies[0].input[0].content;
  assert.match(content[0].text, /never identify a leaf, hole, shadow, twig/i);
  assert.match(content[1].text, /complete original photo/i);
  assert.equal(content[2].image_url, "data:image/jpeg;base64,b3ZlcnZpZXc=");
  assert.equal(content[2].detail, "high");
  assert.match(content[3].text, /selected detail crop/i);
  assert.equal(content[4].image_url, "data:image/jpeg;base64,Y3JvcA==");
});

test("collapses an unsupported conflicting genus to the honest body-plan group", async () => {
  const requestBodies = [];
  const overSpecific = {
    ...visual,
    commonName: "Houtmier",
    commonNameEn: "Carpenter ant",
    commonNameFr: "Fourmi charpentière",
    scientificName: "Camponotus sp.",
    taxonomicRank: "genus",
    strongestAlternative: "Lasius sp.",
    alternativeConflictsWithChosenGenus: true,
    confidence: 0.92
  };
  const identifyImage = createOpenAIImageIdentifier({ apiKey: "test-key", fetchImpl: successfulPipeline(requestBodies, overSpecific) });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });

  assert.equal(result.commonName, "Mier");
  assert.equal(result.scientificName, "Formicidae");
  assert.equal(result.confidence, 0.89);
});

test("collapses a species claim without two visible diagnostic traits", async () => {
  const requestBodies = [];
  const unsupportedSpecies = {
    ...visual,
    commonName: "Zwarte wegmier",
    scientificName: "Lasius niger",
    taxonomicRank: "species",
    speciesDiagnosticTraitsVisible: 1,
    confidence: 0.95
  };
  const identifyImage = createOpenAIImageIdentifier({ apiKey: "test-key", fetchImpl: successfulPipeline(requestBodies, unsupportedSpecies) });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });
  assert.equal(result.commonName, "Mier");
  assert.equal(result.scientificName, "Formicidae");
});

test("keeps a completed visual result when optional learning copy fails", async () => {
  let calls = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      calls += 1;
      if (calls === 1) return successfulResponse(visual);
      return { ok: false, status: 503, text: async () => "temporary" };
    }
  });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });
  assert.equal(result.commonName, "Mier");
  assert.match(result.fact, /antennes/i);
  assert.equal(calls, 2);
});

test("skips enrichment when no arthropod is visible", async () => {
  const requestBodies = [];
  const noBug = {
    ...visual,
    containsBug: false,
    visibleArthropodCount: 0,
    bodyPlan: "not_an_arthropod",
    commonName: "Blad",
    commonNameEn: "Leaf",
    commonNameFr: "Feuille",
    scientificName: "",
    taxonomicRank: "none",
    captureAuthenticity: "live",
    photoContestScore: 0,
    confidence: 0.98
  };
  const identifyImage = createOpenAIImageIdentifier({ apiKey: "test-key", fetchImpl: successfulPipeline(requestBodies, noBug) });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });
  assert.equal(result.containsBug, false);
  assert.equal(requestBodies.length, 1);
});

test("retries an incomplete anatomy response once", async () => {
  const requestBodies = [];
  let calls = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      requestBodies.push(body);
      calls += 1;
      if (calls === 1) return { ok: true, json: async () => ({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }) };
      return successfulResponse(body.text.format.name.startsWith("bug_visual") ? visual : learning);
    }
  });
  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" });
  assert.equal(result.commonName, "Mier");
  assert.equal(requestBodies.length, 3);
  assert.equal(requestBodies[1].max_output_tokens, 3400);
  assert.match(requestBodies[1].input[0].content[0].text, /compact complete result/i);
});

test("aborts a scan before the server deadline", async () => {
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    requestTimeoutMs: 100,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  });
  await assert.rejects(() => identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" }), /timed out/i);
});

test("does not retry an HTTP rejection", async () => {
  let calls = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 429, text: async () => "rate limited" };
    }
  });
  await assert.rejects(() => identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==" }), /OpenAI request failed: 429/);
  assert.equal(calls, 1);
});
