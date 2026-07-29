export type RealBugScanStatus =
  | "matched"
  | "already_spotted"
  | "not_in_catalog"
  | "pending_review"
  | "rejected_authenticity"
  | "rejected_no_bug"
  | "rejected_quality";

export type RealBugIdentification = {
  bugId: string | null;
  commonName: string;
  commonNameEn: string;
  commonNameFr: string;
  scientificName: string;
  fact: string;
  factEn: string;
  factFr: string;
  confidence: number;
  captureAuthenticity?: "live" | "reproduction" | "uncertain";
  authenticityReason?: string;
  reason: string;
  reasonEn: string;
  reasonFr: string;
};

export type RealBugScanReward = {
  granted: boolean;
  isNew: boolean;
  bugId: string;
  bugName: string;
  rarity: string;
  count: number;
};

export type RealBugIdentifyApiResponse = {
  ok: true;
  scanId: string;
  status: Exclude<RealBugScanStatus, "already_spotted">;
  remainingScans: number;
  identification: RealBugIdentification;
  receipt?: string;
};

export type RealBugScanResponse = {
  ok: true;
  scanId: string;
  status: RealBugScanStatus;
  remainingScans: number;
  identification: RealBugIdentification;
  receipt?: string;
  reward?: RealBugScanReward;
};

const statuses = new Set<RealBugScanStatus>([
  "matched",
  "already_spotted",
  "not_in_catalog",
  "pending_review",
  "rejected_authenticity",
  "rejected_no_bug",
  "rejected_quality"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function invalidResponse(): never {
  throw new Error("Ongeldig scanresultaat ontvangen.");
}

function normalizeIdentification(value: unknown): RealBugIdentification {
  if (!isRecord(value)) invalidResponse();
  const bugId = value.bugId === "" || value.bugId === undefined ? null : value.bugId;
  if (!(bugId === null || isNonEmptyString(bugId))) invalidResponse();
  if (!isNonEmptyString(value.commonName)) invalidResponse();
  const scientificName = value.scientificName === null || value.scientificName === undefined
    ? ""
    : value.scientificName;
  if (typeof scientificName !== "string") invalidResponse();
  const fact = typeof value.fact === "string" ? value.fact.trim() : "";
  const commonNameEn = typeof value.commonNameEn === "string" ? value.commonNameEn.trim() : value.commonName.trim();
  const commonNameFr = typeof value.commonNameFr === "string" ? value.commonNameFr.trim() : value.commonName.trim();
  const factEn = typeof value.factEn === "string" ? value.factEn.trim() : fact;
  const factFr = typeof value.factFr === "string" ? value.factFr.trim() : fact;
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) invalidResponse();
  if (!isNonEmptyString(value.reason)) invalidResponse();
  const reasonEn = typeof value.reasonEn === "string" ? value.reasonEn.trim() : value.reason.trim();
  const reasonFr = typeof value.reasonFr === "string" ? value.reasonFr.trim() : value.reason.trim();
  const captureAuthenticity = value.captureAuthenticity === "live" || value.captureAuthenticity === "reproduction" || value.captureAuthenticity === "uncertain"
    ? value.captureAuthenticity
    : undefined;
  const authenticityReason = typeof value.authenticityReason === "string" ? value.authenticityReason.trim() : undefined;
  return {
    bugId,
    commonName: value.commonName.trim(),
    commonNameEn,
    commonNameFr,
    scientificName: scientificName.trim(),
    fact,
    factEn,
    factFr,
    confidence: value.confidence,
    ...(captureAuthenticity ? { captureAuthenticity } : {}),
    ...(authenticityReason !== undefined ? { authenticityReason } : {}),
    reason: value.reason.trim(),
    reasonEn,
    reasonFr
  };
}

function validateIdentification(value: unknown): asserts value is RealBugIdentification {
  normalizeIdentification(value);
}

export function parseRealBugIdentifyApiResponse(value: unknown, fallbackRemainingScans?: number): RealBugIdentifyApiResponse {
  if (!isRecord(value) || value.ok !== true || !isNonEmptyString(value.scanId)) invalidResponse();
  if (!statuses.has(value.status as RealBugScanStatus) || value.status === "already_spotted") invalidResponse();
  const remainingScans = value.remainingScans === undefined || value.remainingScans === null
    ? fallbackRemainingScans
    : value.remainingScans;
  if (!Number.isInteger(remainingScans) || Number(remainingScans) < 0 || Number(remainingScans) > 3) invalidResponse();
  return {
    ok: true,
    scanId: value.scanId.trim(),
    status: value.status as RealBugIdentifyApiResponse["status"],
    remainingScans: Number(remainingScans),
    identification: normalizeIdentification(value.identification),
    ...(typeof value.receipt === "string" && value.receipt.length > 0 ? { receipt: value.receipt } : {})
  };
}

export function parseRealBugScanResponse(value: unknown): RealBugScanResponse {
  if (!isRecord(value) || value.ok !== true || !isNonEmptyString(value.scanId)) invalidResponse();
  if (!statuses.has(value.status as RealBugScanStatus)) invalidResponse();
  if (!Number.isInteger(value.remainingScans) || Number(value.remainingScans) < 0 || Number(value.remainingScans) > 3) invalidResponse();
  validateIdentification(value.identification);

  if (value.reward !== undefined) {
    const reward = value.reward;
    if (!isRecord(reward)) invalidResponse();
    if (typeof reward.granted !== "boolean" || typeof reward.isNew !== "boolean") invalidResponse();
    if (!isNonEmptyString(reward.bugId) || !isNonEmptyString(reward.bugName) || !isNonEmptyString(reward.rarity)) invalidResponse();
    if (
      !Number.isInteger(reward.count)
      || Number(reward.count) < 0
      || (reward.granted && Number(reward.count) < 1)
    ) invalidResponse();
  }

  return value as RealBugScanResponse;
}

export function realBugScanApiUrl(baseUrl: string | undefined): string {
  const normalized = String(baseUrl ?? "").trim().replace(/\/+$/, "");
  return `${normalized}/api/real-bug-identify`;
}

export function realBugScanDayKey(date = new Date(), timeZone = "Europe/Amsterdam"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
