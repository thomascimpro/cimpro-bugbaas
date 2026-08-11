import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAIImageIdentifier } from "./openaiVision.mjs";

const catalog = [
  { id: "mier", name: "Mier", rarity: "Gewoon" },
  { id: "lieveheersbeestje", name: "Lieveheersbeestje", rarity: "Zeldzaam" }
];

const identification = {
  containsBug: true,
  imageQuality: "good",
  captureAuthenticity: "live",
  authenticityReason: "Natural depth, lighting, and physical surroundings.",
  catalogStatus: "matched",
  matchedBugId: "mier",
  commonName: "Mier",
  commonNameEn: "Ant",
  commonNameFr: "Fourmi",
  scientificName: "Formicidae",
  fact: "Mieren communiceren met geursporen.",
  factEn: "Ants communicate using scent trails.",
  factFr: "Les fourmis communiquent avec des pistes odorantes.",
  quizQuestion: "Waarvoor gebruiken mieren geursporen?",
  quizQuestionEn: "What do ants use scent trails for?",
  quizQuestionFr: "À quoi servent les pistes odorantes des fourmis ?",
  quizAnswer: "Om elkaar de weg te wijzen",
  quizAnswerEn: "To show each other the way",
  quizAnswerFr: "Pour se montrer le chemin",
  quizWrongAnswers: ["Om te vliegen", "Om licht te maken", "Om te zwemmen"],
  quizWrongAnswersEn: ["To fly", "To make light", "To swim"],
  quizWrongAnswersFr: ["Pour voler", "Pour faire de la lumière", "Pour nager"],
  quizExplanation: "Mieren gebruiken geursporen om nestgenoten naar voedsel en het nest te leiden.",
  quizExplanationEn: "Ants use scent trails to guide nestmates to food and the nest.",
  quizExplanationFr: "Les fourmis utilisent des pistes odorantes pour guider leur colonie.",
  photoContestScore: 88,
  photoContestReason: "De mier is scherp en de natuurlijke actie is duidelijk zichtbaar.",
  confidence: 0.91,
  reason: "Zes poten en geknikte antennes.",
  reasonEn: "Six legs and elbowed antennae.",
  reasonFr: "Six pattes et des antennes coudees."
};

function successfulResponse(value = identification) {
  return {
    ok: true,
    json: async () => ({ output_text: JSON.stringify(value) })
  };
}

test("sends the image and returns structured identification", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    model: "gpt-test",
    fetchImpl: async (_url, options) => {
      requestBodies.push(JSON.parse(options.body));
      return successfulResponse();
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });
  const requestBody = requestBodies[0];

  assert.equal(result.matchedBugId, "mier");
  assert.equal(requestBodies.length, 1);
  assert.equal(requestBody.model, "gpt-test");
  assert.equal(requestBody.max_output_tokens, 6000);
  assert.equal(requestBody.reasoning.effort, "medium");
  assert.equal(requestBody.input[0].content[1].image_url, "data:image/jpeg;base64,YWJjZA==");
  assert.equal(requestBody.input[0].content[1].detail, "original");
  assert.match(requestBody.input[0].content[0].text, /screenshots, photos of screens or prints, toys, and clearly AI-generated or manipulated images/i);
  assert.match(requestBody.input[0].content[0].text, /still fill commonName and scientificName/i);
  assert.match(requestBody.input[0].content[0].text, /not given the BugDex catalog/i);
  assert.match(requestBody.input[0].content[0].text, /always name what is actually visible/i);
  assert.match(requestBody.input[0].content[0].text, /matchedBugId to null/i);
  assert.doesNotMatch(requestBody.input[0].content[0].text, /lieveheersbeestje|^mier$/im);
  assert.match(requestBody.input[0].content[0].text, /at most 140 characters per field/i);
  assert.match(requestBody.input[0].content[0].text, /two species-diagnostic traits/i);
  assert.match(requestBody.input[0].content[0].text, /never inflate confidence to cross an acceptance threshold/i);
  assert.match(requestBody.input[0].content[0].text, /normal phone photo, crop, cluttered or plain background, mild motion blur/i);
  assert.match(requestBody.input[0].content[0].text, /body shape, wing structure, antennae, legs, markings, scale, and habitat/i);
  assert.match(requestBody.input[0].content[0].text, /never ask for its name/i);
  assert.match(requestBody.input[0].content[0].text, /diet, habitat, lifecycle, body, or behavior/i);
  assert.ok(requestBody.text.format.schema.required.includes("factFr"));
  assert.ok(requestBody.text.format.schema.required.includes("quizQuestionFr"));
  assert.ok(requestBody.text.format.schema.required.includes("quizWrongAnswers"));
  assert.ok(requestBody.text.format.schema.required.includes("reasonFr"));
  assert.ok(requestBody.text.format.schema.required.includes("photoContestScore"));
  assert.ok(requestBody.text.format.schema.required.includes("photoContestReason"));
  assert.match(requestBody.input[0].content[0].text, /sharpness and detail/i);
  assert.match(requestBody.input[0].content[0].text, /fun or striking natural moment/i);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.ok(requestBody.text.format.schema.required.includes("catalogStatus"));
  assert.ok(requestBody.text.format.schema.required.includes("captureAuthenticity"));
  assert.deepEqual(requestBody.text.format.schema.properties.captureAuthenticity.enum, ["live", "reproduction", "uncertain"]);
  assert.deepEqual(requestBody.text.format.schema.properties.catalogStatus.enum, ["matched", "not_in_catalog", "uncertain"]);
});

test("sends the full overview before the selected crop and guards against plant-shaped false positives", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      requestBodies.push(JSON.parse(options.body));
      return successfulResponse();
    }
  });

  await identifyImage({
    imageDataUrl: "data:image/jpeg;base64,Y3JvcA==",
    overviewImageDataUrl: "data:image/jpeg;base64,b3ZlcnZpZXc="
  });

  const content = requestBodies[0].input[0].content;
  assert.match(content[0].text, /never identify a leaf edge, bud, petal, hole, shadow, or plant silhouette/i);
  assert.match(content[1].text, /complete original photo/i);
  assert.equal(content[2].image_url, "data:image/jpeg;base64,b3ZlcnZpZXc=");
  assert.equal(content[2].detail, "high");
  assert.match(content[3].text, /selected detail crop/i);
  assert.match(content[3].text, /only shows plants/i);
  assert.equal(content[4].image_url, "data:image/jpeg;base64,Y3JvcA==");
  assert.equal(content[4].detail, "original");
});

test("retries once with a larger budget after an incomplete response", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      requestBodies.push(JSON.parse(options.body));
      if (requestBodies.length === 1) {
        return {
          ok: true,
          json: async () => ({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] })
        };
      }
      return successfulResponse();
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });

  assert.equal(result.matchedBugId, "mier");
  assert.equal(requestBodies.length, 2);
  assert.equal(requestBodies[0].max_output_tokens, 6000);
  assert.equal(requestBodies[1].max_output_tokens, 9000);
  assert.equal(requestBodies[1].reasoning.effort, "medium");
  assert.match(requestBodies[1].input[0].content[0].text, /retry after an incomplete response/i);
});

test("refines a usable identification below seventy percent with high reasoning", async () => {
  const requestBodies = [];
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      requestBodies.push(JSON.parse(options.body));
      return successfulResponse(requestBodies.length === 1 ? { ...identification, confidence: 0.62 } : identification);
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });

  assert.equal(result.confidence, 0.91);
  assert.equal(requestBodies.length, 2);
  assert.equal(requestBodies[0].reasoning.effort, "medium");
  assert.equal(requestBodies[1].reasoning.effort, "high");
  assert.match(requestBodies[1].input[0].content[0].text, /re-check this ambiguous identification/i);
});

test("refines a low-confidence caterpillar guess and challenges the visible body plan", async () => {
  const requestBodies = [];
  const lowConfidenceGuess = {
    ...identification,
    commonName: "Rups",
    commonNameEn: "Caterpillar",
    commonNameFr: "Chenille",
    scientificName: "Lepidoptera larva",
    confidence: 0.31,
    reason: "Langwerpige vorm."
  };
  const correctedBee = {
    ...identification,
    commonName: "Honingbij",
    commonNameEn: "Western honey bee",
    commonNameFr: "Abeille domestique",
    scientificName: "Apis mellifera",
    confidence: 0.86,
    reason: "Behaard borststuk, twee paar vleugels en bijenlichaam."
  };
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async (_url, options) => {
      requestBodies.push(JSON.parse(options.body));
      return successfulResponse(requestBodies.length === 1 ? lowConfidenceGuess : correctedBee);
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });
  const refinementPrompt = requestBodies[1].input[0].content[0].text;

  assert.equal(result.commonName, "Honingbij");
  assert.equal(result.confidence, 0.86);
  assert.equal(requestBodies.length, 2);
  assert.equal(requestBodies[1].reasoning.effort, "high");
  assert.match(refinementPrompt, /first-pass hypothesis/i);
  assert.match(refinementPrompt, /"commonName":"Rups"/);
  assert.match(refinementPrompt, /adult winged insect/i);
  assert.match(refinementPrompt, /never call a visibly winged adult insect a caterpillar/i);
});

test("refines a doubtful identification even when the first pass calls the photo poor", async () => {
  let callCount = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async () => {
      callCount += 1;
      return successfulResponse(callCount === 1
        ? { ...identification, imageQuality: "poor", confidence: 0.31 }
        : identification);
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });

  assert.equal(result.confidence, 0.91);
  assert.equal(callCount, 2);
});

test("aborts a scan before the Vercel function deadline", async () => {
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    requestTimeoutMs: 100,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })
  });

  await assert.rejects(
    () => identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog }),
    /timed out/i
  );
});

test("retries once when structured JSON is truncated", async () => {
  let callCount = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async () => {
      callCount += 1;
      return callCount === 1
        ? { ok: true, json: async () => ({ output_text: '{"containsBug":true,"commonName":"Oak' }) }
        : successfulResponse();
    }
  });

  const result = await identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog });

  assert.equal(result.matchedBugId, "mier");
  assert.equal(callCount, 2);
});

test("stops after one retry when OpenAI remains incomplete", async () => {
  let callCount = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async () => {
      callCount += 1;
      return {
        ok: true,
        json: async () => ({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] })
      };
    }
  });

  await assert.rejects(
    () => identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog }),
    /incomplete: max_output_tokens/i
  );
  assert.equal(callCount, 2);
});

test("throws a safe error without retrying when OpenAI rejects the request", async () => {
  let callCount = 0;
  const identifyImage = createOpenAIImageIdentifier({
    apiKey: "test-key",
    fetchImpl: async () => {
      callCount += 1;
      return {
        ok: false,
        status: 429,
        text: async () => "rate limited"
      };
    }
  });

  await assert.rejects(
    () => identifyImage({ imageDataUrl: "data:image/jpeg;base64,YWJjZA==", catalog }),
    /OpenAI request failed: 429/
  );
  assert.equal(callCount, 1);
});
