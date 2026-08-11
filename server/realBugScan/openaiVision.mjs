const VISUAL_MAX_OUTPUT_TOKENS = 2400;
const ENRICHMENT_MAX_OUTPUT_TOKENS = 3200;
const DEFAULT_REQUEST_TIMEOUT_MS = 75_000;

const bodyPlans = [
  "ant", "bee_or_wasp", "fly", "beetle", "true_bug", "butterfly_or_moth",
  "grasshopper_or_cricket", "dragonfly_or_damselfly", "spider", "other_arachnid",
  "larva_or_caterpillar", "other_arthropod", "not_an_arthropod"
];

const visualSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "containsBug", "visibleArthropodCount", "bodyPlan", "imageQuality", "captureAuthenticity",
    "authenticityReason", "commonName", "commonNameEn", "commonNameFr", "scientificName",
    "taxonomicRank", "speciesDiagnosticTraitsVisible", "strongestAlternative",
    "alternativeConflictsWithChosenGenus", "visualEvidence", "photoContestScore",
    "photoContestReason", "confidence", "reason", "reasonEn", "reasonFr"
  ],
  properties: {
    containsBug: { type: "boolean" },
    visibleArthropodCount: { type: "integer", minimum: 0, maximum: 20 },
    bodyPlan: { type: "string", enum: bodyPlans },
    imageQuality: { type: "string", enum: ["good", "poor"] },
    captureAuthenticity: { type: "string", enum: ["live", "reproduction", "uncertain"] },
    authenticityReason: { type: "string" },
    commonName: { type: "string" },
    commonNameEn: { type: "string" },
    commonNameFr: { type: "string" },
    scientificName: { type: "string" },
    taxonomicRank: { type: "string", enum: ["species", "genus", "family", "order", "broad", "none"] },
    speciesDiagnosticTraitsVisible: { type: "integer", minimum: 0, maximum: 10 },
    strongestAlternative: { type: "string" },
    alternativeConflictsWithChosenGenus: { type: "boolean" },
    visualEvidence: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    photoContestScore: { type: "number", minimum: 0, maximum: 100 },
    photoContestReason: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
    reasonEn: { type: "string" },
    reasonFr: { type: "string" }
  }
};

const enrichmentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "fact", "factEn", "factFr", "quizQuestion", "quizQuestionEn", "quizQuestionFr",
    "quizAnswer", "quizAnswerEn", "quizAnswerFr", "quizWrongAnswers",
    "quizWrongAnswersEn", "quizWrongAnswersFr", "quizExplanation",
    "quizExplanationEn", "quizExplanationFr"
  ],
  properties: {
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
    quizExplanationFr: { type: "string" }
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
    if (error instanceof SyntaxError) throw new IncompleteOpenAIResponseError("OpenAI response contained incomplete JSON.");
    throw error;
  }
}

const broadTaxa = {
  ant: ["Mier", "Ant", "Fourmi", "Formicidae"],
  bee_or_wasp: ["Bij of wesp", "Bee or wasp", "Abeille ou guêpe", "Hymenoptera"],
  fly: ["Vlieg", "Fly", "Mouche", "Diptera"],
  beetle: ["Kever", "Beetle", "Coléoptère", "Coleoptera"],
  true_bug: ["Wants", "True bug", "Punaise", "Heteroptera"],
  butterfly_or_moth: ["Vlinder of mot", "Butterfly or moth", "Papillon", "Lepidoptera"],
  grasshopper_or_cricket: ["Sprinkhaan of krekel", "Grasshopper or cricket", "Sauterelle ou grillon", "Orthoptera"],
  dragonfly_or_damselfly: ["Libel of waterjuffer", "Dragonfly or damselfly", "Libellule", "Odonata"],
  spider: ["Spin", "Spider", "Araignée", "Araneae"],
  other_arachnid: ["Spinachtige", "Arachnid", "Arachnide", "Arachnida"],
  larva_or_caterpillar: ["Larve of rups", "Larva or caterpillar", "Larve ou chenille", "Arthropoda"],
  other_arthropod: ["Geleedpotige", "Arthropod", "Arthropode", "Arthropoda"]
};

function enforceDefensibleTaxon(visual) {
  if (!visual?.containsBug) return visual;
  const traits = Number(visual.speciesDiagnosticTraitsVisible) || 0;
  const overSpecific = visual.taxonomicRank === "species" && traits < 2;
  const genusConflict = visual.alternativeConflictsWithChosenGenus === true
    && (visual.taxonomicRank === "species" || visual.taxonomicRank === "genus");
  if (!overSpecific && !genusConflict) return visual;
  const broad = broadTaxa[visual.bodyPlan];
  if (!broad) return { ...visual, confidence: Math.min(Number(visual.confidence) || 0, 0.69) };
  return {
    ...visual,
    commonName: broad[0],
    commonNameEn: broad[1],
    commonNameFr: broad[2],
    scientificName: broad[3],
    taxonomicRank: broad[3] === "Arthropoda" ? "broad" : "family",
    confidence: Math.min(Math.max(Number(visual.confidence) || 0, 0.7), 0.89)
  };
}

function fallbackLearning(visual) {
  if (visual.bodyPlan === "ant") return {
    fact: "Mieren gebruiken hun antennes om te ruiken en met hun nestgenoten te communiceren.",
    factEn: "Ants use their antennae to smell and communicate with nestmates.",
    factFr: "Les fourmis utilisent leurs antennes pour sentir et communiquer.",
    quizQuestion: "Waarvoor gebruikt een mier haar antennes?",
    quizQuestionEn: "What does an ant use its antennae for?",
    quizQuestionFr: "À quoi servent les antennes d'une fourmi ?",
    quizAnswer: "Om te ruiken en communiceren", quizAnswerEn: "To smell and communicate", quizAnswerFr: "Pour sentir et communiquer",
    quizWrongAnswers: ["Om te vliegen", "Om licht te maken", "Om te zwemmen"],
    quizWrongAnswersEn: ["To fly", "To make light", "To swim"],
    quizWrongAnswersFr: ["Pour voler", "Pour faire de la lumière", "Pour nager"],
    quizExplanation: "Met haar antennes volgt een mier geursporen van andere mieren.",
    quizExplanationEn: "An ant uses its antennae to follow scent trails from other ants.",
    quizExplanationFr: "Une fourmi suit les pistes odorantes avec ses antennes."
  };
  return {
    fact: `${visual.commonName} is een geleedpotige met een uitwendig skelet.`,
    factEn: `${visual.commonNameEn} is an arthropod with an external skeleton.`,
    factFr: `${visual.commonNameFr} est un arthropode avec un squelette externe.`,
    quizQuestion: "Waar zit het skelet van een geleedpotige?", quizQuestionEn: "Where is an arthropod's skeleton?", quizQuestionFr: "Où se trouve le squelette d'un arthropode ?",
    quizAnswer: "Aan de buitenkant", quizAnswerEn: "On the outside", quizAnswerFr: "À l'extérieur",
    quizWrongAnswers: ["Alleen in de poten", "In de vleugels", "Geleedpotigen hebben geen skelet"],
    quizWrongAnswersEn: ["Only in the legs", "In the wings", "Arthropods have no skeleton"],
    quizWrongAnswersFr: ["Seulement dans les pattes", "Dans les ailes", "Ils n'ont pas de squelette"],
    quizExplanation: "Een uitwendig skelet beschermt het lichaam aan de buitenkant.",
    quizExplanationEn: "An external skeleton protects the body from the outside.",
    quizExplanationFr: "Un squelette externe protège le corps de l'extérieur."
  };
}

export function createOpenAIImageIdentifier({
  apiKey,
  model = "gpt-5.6-luna",
  reasoningEffort = "medium",
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl = fetch
} = {}) {
  return async function identifyImage({ imageDataUrl, overviewImageDataUrl }) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    const deadline = Date.now() + Math.max(100, Number(requestTimeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS);

    const imageContent = overviewImageDataUrl
      ? [
        { type: "input_text", text: "Image 1 is the complete original photo. Locate the real animal in this scene." },
        { type: "input_image", image_url: overviewImageDataUrl, detail: "high" },
        { type: "input_text", text: "Image 2 is the player's selected detail crop. Prefer its animal only when real anatomy is visible; if it misses, use Image 1." },
        { type: "input_image", image_url: imageDataUrl, detail: "original" }
      ]
      : [{ type: "input_image", image_url: imageDataUrl, detail: "original" }];

    async function requestStructured({ prompt, content = [], schema, name, maxOutputTokens, effort }) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 2_000) throw new Error("OpenAI request timed out before a complete identification was available.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remainingMs);
      let response;
      try {
        response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            max_output_tokens: maxOutputTokens,
            reasoning: { effort },
            input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...content] }],
            text: { format: { type: "json_schema", name, strict: true, schema } }
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

    const visualPrompt = [
      "Identify the visible insect, arachnid, or other small arthropod independently. You are not given the BugDex catalog.",
      "FIRST lock the body plan from visible anatomy; only then choose a taxon. Count visible animals and trace head, thorax/mesosoma, abdomen/gaster, waist/petiole, legs, antennae, wings and elytra.",
      "A shiny dark oval never proves beetle. Beetle requires one continuous beetle body with paired hardened forewings/elytra or a dorsal seam. Separate head + mesosoma + narrow petiole + gaster is an ant, even when the gaster looks shiny like a beetle.",
      "Never identify a leaf, hole, shadow, twig or separate body segment as another animal. visualEvidence must name only anatomy genuinely visible in the pixels.",
      "Use species only when at least two species-diagnostic traits are visible. Count those traits in speciesDiagnosticTraitsVisible. Color, gloss, general size and habitat alone are not species-diagnostic.",
      "Actively compare the strongest alternative. HARD RULE: if it belongs to another genus and cannot be ruled out visually, set alternativeConflictsWithChosenGenus true and return their shared family/common group, never genus sp. or a species. For an uncertain ant use Mier / Ant / Fourmi and Formicidae.",
      "A confident answer must be morphologically compatible; confidence is identification confidence, not photo quality. Do not inflate it to pass 70%.",
      "Confidence applies to the broader taxon you actually return. If family or body plan is clear but species is not, return that broader taxon with its own evidence-based confidence rather than the rejected species confidence.",
      "Set imageQuality poor only if no useful anatomical feature is assessable. Mild blur, clutter or a small subject alone is not poor.",
      "Reject screenshots, screens, prints, toys and clearly generated/manipulated images via captureAuthenticity. A plausible physical animal in a natural scene is live.",
      "If no arthropod is visible, containsBug is false and bodyPlan is not_an_arthropod, but briefly name the visible subject.",
      "Return concise Dutch, English and French names/reasons. Keep each reason under 160 characters.",
      "Score the photograph 0-100 using sharpness/detail 60%, composition/light 25%, natural moment 15%; reproduction or no bug scores 0. photoContestReason is one Dutch sentence."
    ].join("\n");

    let visual;
    try {
      visual = await requestStructured({
        prompt: visualPrompt,
        content: imageContent,
        schema: visualSchema,
        name: "bug_visual_anatomy",
        maxOutputTokens: VISUAL_MAX_OUTPUT_TOKENS,
        effort: reasoningEffort
      });
    } catch (error) {
      if (!(error instanceof IncompleteOpenAIResponseError)) throw error;
      visual = await requestStructured({
        prompt: `Return one compact complete result.\n${visualPrompt}`,
        content: imageContent,
        schema: visualSchema,
        name: "bug_visual_anatomy_retry",
        maxOutputTokens: VISUAL_MAX_OUTPUT_TOKENS + 1000,
        effort: "medium"
      });
    }
    visual = enforceDefensibleTaxon(visual);

    let learning = fallbackLearning(visual);
    if (visual.containsBug && visual.captureAuthenticity !== "reproduction" && deadline - Date.now() >= 4_000) {
      const enrichmentPrompt = [
        "Create short educational copy for a 10-year-old about the LOCKED identification below.",
        "Do not identify the image again and do not change, narrow or contradict its taxon.",
        `Locked identification: ${JSON.stringify({ commonName: visual.commonName, commonNameEn: visual.commonNameEn, commonNameFr: visual.commonNameFr, scientificName: visual.scientificName, bodyPlan: visual.bodyPlan })}`,
        "Return one verifiable fact and one multiple-choice question about this animal's body, diet, habitat, lifecycle or behavior. Never ask its name or which animal was photographed.",
        "Exactly one answer is correct; provide three short plausible wrong answers. Supply matching Dutch, English and French versions. Keep every field under 140 characters."
      ].join("\n");
      try {
        learning = await requestStructured({
          prompt: enrichmentPrompt,
          schema: enrichmentSchema,
          name: "bug_learning_copy",
          maxOutputTokens: ENRICHMENT_MAX_OUTPUT_TOKENS,
          effort: "low"
        });
      } catch {
        // The visual identification remains usable when optional learning copy times out.
      }
    }

    return {
      containsBug: visual.containsBug,
      imageQuality: visual.imageQuality,
      captureAuthenticity: visual.captureAuthenticity,
      authenticityReason: visual.authenticityReason,
      catalogStatus: "uncertain",
      matchedBugId: null,
      commonName: visual.commonName,
      commonNameEn: visual.commonNameEn,
      commonNameFr: visual.commonNameFr,
      scientificName: visual.scientificName,
      ...learning,
      photoContestScore: visual.photoContestScore,
      photoContestReason: visual.photoContestReason,
      confidence: visual.confidence,
      reason: visual.reason,
      reasonEn: visual.reasonEn,
      reasonFr: visual.reasonFr
    };
  };
}
