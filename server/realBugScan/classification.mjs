const defaultTimeZone = "Europe/Amsterdam";
const defaultAutoAwardThreshold = 0.7;
const defaultMissingCatalogThreshold = 0.7;

function cleanString(value, fallback = "") {
  const cleaned = typeof value === "string" ? value.trim() : "";
  return cleaned || fallback;
}

function cleanProse(value, fallback = "") {
  const cleaned = cleanString(value, fallback);
  return cleaned.startsWith("{") && cleaned.endsWith("}") ? cleaned.slice(1, -1).trim() : cleaned;
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((item) => cleanString(item)).filter(Boolean).slice(0, 3) : [];
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function normalizedTaxonName(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function taxonNamesForEntry(entry) {
  return [
    entry.name,
    ...(Array.isArray(entry.aliases) ? entry.aliases : []),
    ...(Array.isArray(entry.scientificAliases) ? entry.scientificAliases : [])
  ].map(normalizedTaxonName).filter(Boolean);
}

export function buildBugCatalogPrompt(catalog) {
  return catalog.map((entry) => `${entry.id}: ${entry.name}`).join("\n");
}

export function dayKeyInTimeZone(date = new Date(), timeZone = defaultTimeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function recognizedMissingTaxon(commonName, scientificName) {
  const normalizedCommonName = commonName.toLowerCase();
  const normalizedScientificName = cleanString(scientificName).replace(/\s+/g, " ");
  const unknownCommonName = normalizedCommonName.startsWith("onbekend")
    || normalizedCommonName === "geen bug herkend";
  return commonName.length >= 3 && normalizedScientificName.length >= 3 && !unknownCommonName;
}

export function normalizeIdentification(
  raw,
  catalog,
  autoAwardThreshold = defaultAutoAwardThreshold,
  missingCatalogThreshold = defaultMissingCatalogThreshold
) {
  const catalogMap = new Map(catalog.map((entry) => [entry.id, entry]));
  const catalogNameMap = new Map(catalog.flatMap((entry) => (
    taxonNamesForEntry(entry).map((name) => [name, entry])
  )));
  const containsBug = raw?.containsBug === true;
  const imageQuality = raw?.imageQuality === "poor" ? "poor" : "good";
  const captureAuthenticity = ["live", "reproduction", "uncertain"].includes(raw?.captureAuthenticity)
    ? raw.captureAuthenticity
    : "live";
  const authenticityReason = cleanString(raw?.authenticityReason);
  const requestedBugId = cleanString(raw?.matchedBugId) || null;
  const confidence = clampConfidence(raw?.confidence);
  const commonName = cleanString(raw?.commonName, containsBug ? "Onbekende bug" : "Geen bug herkend");
  const scientificName = cleanString(raw?.scientificName);
  const requestedEntry = requestedBugId ? catalogMap.get(requestedBugId) : null;
  const namedEntry = catalogNameMap.get(normalizedTaxonName(commonName))
    ?? catalogNameMap.get(normalizedTaxonName(scientificName));
  const matchedEntry = namedEntry ?? requestedEntry;
  const commonNameEn = cleanString(raw?.commonNameEn, commonName);
  const commonNameFr = cleanString(raw?.commonNameFr, commonName);
  const fact = cleanProse(raw?.fact);
  const factEn = cleanProse(raw?.factEn, fact);
  const factFr = cleanProse(raw?.factFr, fact);
  const quizQuestion = cleanProse(raw?.quizQuestion);
  const quizQuestionEn = cleanProse(raw?.quizQuestionEn, quizQuestion);
  const quizQuestionFr = cleanProse(raw?.quizQuestionFr, quizQuestion);
  const quizAnswer = cleanProse(raw?.quizAnswer);
  const quizAnswerEn = cleanProse(raw?.quizAnswerEn, quizAnswer);
  const quizAnswerFr = cleanProse(raw?.quizAnswerFr, quizAnswer);
  const quizWrongAnswers = cleanStringArray(raw?.quizWrongAnswers);
  const quizWrongAnswersEn = cleanStringArray(raw?.quizWrongAnswersEn);
  const quizWrongAnswersFr = cleanStringArray(raw?.quizWrongAnswersFr);
  const quizExplanation = cleanProse(raw?.quizExplanation, fact);
  const quizExplanationEn = cleanProse(raw?.quizExplanationEn, factEn);
  const quizExplanationFr = cleanProse(raw?.quizExplanationFr, factFr);
  const photoContestScore = Math.round(Math.min(100, Math.max(0, Number(raw?.photoContestScore) || 0)));
  const photoContestReason = cleanProse(raw?.photoContestReason).slice(0, 180);
  const reason = cleanProse(raw?.reason, "De foto kon niet betrouwbaar worden beoordeeld.");
  const reasonEn = cleanProse(raw?.reasonEn, reason);
  const reasonFr = cleanProse(raw?.reasonFr, reason);
  const exactCatalogNameMatch = Boolean(matchedEntry)
    && (
      taxonNamesForEntry(matchedEntry).includes(normalizedTaxonName(commonName))
      || taxonNamesForEntry(matchedEntry).includes(normalizedTaxonName(scientificName))
    );

  let status;
  if (captureAuthenticity === "reproduction") status = "rejected_authenticity";
  else if (!containsBug) status = "rejected_no_bug";
  else if (captureAuthenticity === "uncertain") status = "pending_review";
  else if (exactCatalogNameMatch && confidence >= autoAwardThreshold) status = "matched";
  else if (
    confidence >= missingCatalogThreshold
    && recognizedMissingTaxon(commonName, scientificName)
    && fact.length >= 12
  ) status = "not_in_catalog";
  else if (imageQuality === "poor") status = "rejected_quality";
  else status = "pending_review";

  return {
    status,
    identification: {
      bugId: status === "not_in_catalog" ? null : matchedEntry?.id ?? null,
      commonName: status === "matched" ? matchedEntry?.name ?? commonName : commonName,
      commonNameEn,
      commonNameFr,
      scientificName,
      fact,
      factEn,
      factFr,
      quizQuestion,
      quizQuestionEn,
      quizQuestionFr,
      quizAnswer,
      quizAnswerEn,
      quizAnswerFr,
      quizWrongAnswers,
      quizWrongAnswersEn,
      quizWrongAnswersFr,
      quizExplanation,
      quizExplanationEn,
      quizExplanationFr,
      photoContestScore: status === "matched" || status === "not_in_catalog" ? photoContestScore : 0,
      photoContestReason,
      confidence,
      captureAuthenticity,
      authenticityReason,
      reason,
      reasonEn,
      reasonFr
    }
  };
}
