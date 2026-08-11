const INITIAL_MAX_OUTPUT_TOKENS = 6000;
const RETRY_MAX_OUTPUT_TOKENS = 9000;
const DEFAULT_REQUEST_TIMEOUT_MS = 75_000;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "containsBug",
    "imageQuality",
    "captureAuthenticity",
    "authenticityReason",
    "catalogStatus",
    "matchedBugId",
    "commonName",
    "commonNameEn",
    "commonNameFr",
    "scientificName",
    "fact",
    "factEn",
    "factFr",
    "quizQuestion",
    "quizQuestionEn",
    "quizQuestionFr",
    "quizAnswer",
    "quizAnswerEn",
    "quizAnswerFr",
    "quizWrongAnswers",
    "quizWrongAnswersEn",
    "quizWrongAnswersFr",
    "quizExplanation",
    "quizExplanationEn",
    "quizExplanationFr",
    "photoContestScore",
    "photoContestReason",
    "confidence",
    "reason",
    "reasonEn",
    "reasonFr"
  ],
  properties: {
    containsBug: { type: "boolean" },
    imageQuality: { type: "string", enum: ["good", "poor"] },
    captureAuthenticity: { type: "string", enum: ["live", "reproduction", "uncertain"] },
    authenticityReason: { type: "string" },
    catalogStatus: { type: "string", enum: ["matched", "not_in_catalog", "uncertain"] },
    matchedBugId: { type: ["string", "null"] },
    commonName: { type: "string" },
    commonNameEn: { type: "string" },
    commonNameFr: { type: "string" },
    scientificName: { type: "string" },
    fact: { type: "string" },
    factEn: { type: "string" },
    factFr: { type: "string" },
    quizQuestion: { type: "string" },
    quizQuestionEn: { type: "string" },
    quizQuestionFr: { type: "string" },
    quizAnswer: { type: "string" },
    quizAnswerEn: { type: "string" },
    quizAnswerFr: { type: "string" },
    quizWrongAnswers: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    quizWrongAnswersEn: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    quizWrongAnswersFr: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    quizExplanation: { type: "string" },
    quizExplanationEn: { type: "string" },
    quizExplanationFr: { type: "string" },
    photoContestScore: { type: "number", minimum: 0, maximum: 100 },
    photoContestReason: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
    reasonEn: { type: "string" },
    reasonFr: { type: "string" }
  }
};

class IncompleteOpenAIResponseError extends Error {}

function extractOutputText(payload) {
  if (payload?.status === "incomplete") {
    const reason = payload?.incomplete_details?.reason ?? "unknown reason";
    throw new IncompleteOpenAIResponseError(`OpenAI response was incomplete: ${reason}.`);
  }
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new IncompleteOpenAIResponseError("OpenAI response contained no structured output.");
}

function parseStructuredOutput(payload) {
  try {
    return JSON.parse(extractOutputText(payload));
  } catch (error) {
    if (error instanceof IncompleteOpenAIResponseError) throw error;
    if (error instanceof SyntaxError) {
      throw new IncompleteOpenAIResponseError("OpenAI response contained incomplete JSON.");
    }
    throw error;
  }
}

export function createOpenAIImageIdentifier({
  apiKey,
  model = "gpt-5.6-luna",
  reasoningEffort = "medium",
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl = fetch
} = {}) {
  return async function identifyImage({ imageDataUrl }) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    const deadline = Date.now() + Math.max(100, Number(requestTimeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS);
    const promptLines = [
      "Identify the visible insect, arachnid, or other small arthropod independently. You are not given the BugDex catalog and must not guess toward an app species.",
      "Always name what is actually visible in commonName and scientificName at the most specific defensible taxonomic level, even when imageQuality is poor or containsBug is false. Use a broader honest taxon such as beetle, moth, spider, or family when the exact species is uncertain; do not replace a recognizable subject with a generic unknown label.",
      "If the photo does not contain an arthropod, commonName must still briefly name the visible subject, while containsBug remains false.",
      "The server compares your independent name with BugDex afterward. Always set catalogStatus to uncertain and matchedBugId to null; do not invent or infer an app catalog ID.",
      "Use a species name only when at least two species-diagnostic traits are actually visible. Otherwise return the most specific honest genus, family, or broader taxon supported by the pixels.",
      "If one taxon is clearly most likely, return that best defensible identification and express residual doubt through confidence instead of inventing missing visual evidence.",
      "Use a two-pass assessment: first inspect body shape, wing structure, antennae, legs, markings, scale, and habitat; then challenge the first identification against the strongest visual alternative.",
      "Calibrate confidence only from visible diagnostic evidence. Never inflate confidence to cross an acceptance threshold, and do not lower it merely because a species is rare.",
      "Set imageQuality to poor only when no useful diagnostic feature can be assessed because of severe blur, darkness, distance, or obstruction. A normal phone photo, crop, cluttered or plain background, mild motion blur, or imperfect composition is not poor by itself.",
      "Do not invent IDs. Treat confidence as identification confidence, not image quality.",
      "Return commonName in Dutch, commonNameEn in English, and commonNameFr in French. Keep scientificName language-neutral.",
      "Return one short, verifiable species fact in Dutch, English, and French using fact, factEn, and factFr. Avoid medical or safety claims.",
      "Create one simple multiple-choice question for a 10-year-old about the identified animal's diet, habitat, lifecycle, body, or behavior. Never ask for its name and never ask which animal was photographed.",
      "Use quizQuestion, quizAnswer, three plausible quizWrongAnswers, and quizExplanation in Dutch. Provide matching English and French versions in the corresponding En and Fr fields. Keep each answer option short.",
      "The question must have exactly one unambiguous correct answer. The explanation may reuse the species fact. Do not reveal the quiz answer in reason, reasonEn, or reasonFr.",
      "Vary the question by the identified taxon so different bugs teach different facts.",
      "Score the photo itself for the weekly photo contest from 0 to 100 in photoContestScore. Balance visible sharpness and detail (60%), composition and lighting (25%), and a fun or striking natural moment (15%). Score the photography, not species rarity. Reproductions and photos with no bug must score 0.",
      "In photoContestReason, explain in one short Dutch sentence what makes the photo sharp, fun, or striking. Do not mention a numeric score and do not reveal private location clues.",
      "Return the identification explanation in Dutch, English, and French using reason, reasonEn, and reasonFr.",
      "Keep every translated fact and explanation concise: at most 140 characters per field.",
      "Before species classification, inspect capture authenticity and reject screenshots, photos of screens or prints, toys, and clearly AI-generated or manipulated images. Look for screen bezels, browser or app chrome, pixel grids, moire, display glare, print halftones, flat paper edges, repeated synthetic details, and impossible AI anatomy.",
      "Set captureAuthenticity to live only when the image plausibly shows a physical bug in a real scene. Set it to reproduction for a screenshot, photographed screen, print, toy, or clearly AI-generated/manipulated image. Use uncertain when those cues are ambiguous.",
      "For reproduction set containsBug to false and explain the strongest authenticity cue in authenticityReason. For uncertain authenticity, keep the biological identification honest but never imply it is reward-safe.",
      "For a rejected reference image, still fill commonName and scientificName for the visible subject when possible, but keep containsBug false so it cannot grant a reward or create a catalog suggestion."
    ];

    async function requestIdentification(maxOutputTokens, retryMode = "none", effort = reasoningEffort) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 2_000) throw new Error("OpenAI request timed out before a complete identification was available.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remainingMs);
      let response;
      try {
        response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            max_output_tokens: maxOutputTokens,
            reasoning: { effort },
            input: [{
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    ...(retryMode === "incomplete" ? ["Retry after an incomplete response. Return one compact, complete JSON object and no extra text."] : []),
                    ...(retryMode === "refine" ? ["Re-check this ambiguous identification carefully. Prefer an exact species only when the visible traits support it; otherwise keep the best honest broader taxon."] : []),
                    ...promptLines
                  ].join("\n")
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                  detail: "original"
                }
              ]
            }],
            text: {
              format: {
                type: "json_schema",
                name: "real_bug_identification",
                description: "An independent, cautious real-world arthropod identification.",
                strict: true,
                schema: responseSchema
              }
            }
          })
        });
      } catch (error) {
        if (controller.signal.aborted) throw new Error("OpenAI request timed out before a complete identification was available.");
        throw error;
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        if (typeof response.text === "function") await response.text().catch(() => "");
        throw new Error(`OpenAI request failed: ${response.status}`);
      }

      return parseStructuredOutput(await response.json());
    }

    let initial;
    try {
      initial = await requestIdentification(INITIAL_MAX_OUTPUT_TOKENS);
    } catch (error) {
      if (!(error instanceof IncompleteOpenAIResponseError)) throw error;
      return requestIdentification(RETRY_MAX_OUTPUT_TOKENS, "incomplete", "medium");
    }

    const confidence = Number(initial?.confidence);
    const shouldRefine = initial?.containsBug === true
      && initial?.imageQuality === "good"
      && initial?.captureAuthenticity !== "reproduction"
      && Number.isFinite(confidence)
      && confidence >= 0.5
      && confidence < 0.7
      && deadline - Date.now() >= 15_000;
    if (!shouldRefine) return initial;

    try {
      return await requestIdentification(RETRY_MAX_OUTPUT_TOKENS, "refine", "high");
    } catch {
      return initial;
    }
  };
}
