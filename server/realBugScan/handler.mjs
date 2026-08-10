import { dayKeyInTimeZone, normalizeIdentification } from "./classification.mjs";
import { RealBugScanQuotaError } from "./firebaseUsageStore.mjs";
import { createHash } from "node:crypto";

const maxImageDataUrlLength = 6_000_000;
const allowedImagePattern = /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i;
const maxReviewThumbnailLength = 220_000;
const allowedReviewThumbnailPattern = /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i;

function sendJson(response, statusCode, body) {
  if (typeof response.status === "function") return response.status(statusCode).json(body);
  response.statusCode = statusCode;
  if (typeof response.setHeader === "function") response.setHeader("Content-Type", "application/json; charset=utf-8");
  if (typeof response.end === "function") response.end(JSON.stringify(body));
  else response.body = body;
  return response;
}

function requestOrigin(request) {
  return String(request.headers?.origin ?? request.headers?.Origin ?? "").trim();
}

function isLocalDevelopmentOrigin(origin) {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
}

function applyCors(request, response, allowedOrigins) {
  const origin = requestOrigin(request);
  const allowed = origin && (allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin));
  if (allowed && typeof response.setHeader === "function") {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  if (typeof response.setHeader === "function") {
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
}

function parseBody(body) {
  if (body && typeof body === "object" && !Array.isArray(body)) return body;
  if (typeof body !== "string") return null;
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function bearerToken(request) {
  const header = String(request.headers?.authorization ?? request.headers?.Authorization ?? "");
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

function validScanId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

function validImageDataUrl(value) {
  return typeof value === "string"
    && value.length <= maxImageDataUrlLength
    && allowedImagePattern.test(value);
}

function validReviewThumbnailDataUrl(value) {
  return typeof value === "string"
    && value.length <= maxReviewThumbnailLength
    && allowedReviewThumbnailPattern.test(value);
}

export function createRealBugIdentifyHandler({
  catalog,
  verifyIdToken,
  checkUsage,
  reserveUsage,
  signReceipt,
  identifyImage,
  allowedOrigins = []
}) {
  return async function realBugIdentifyHandler(request, response) {
    applyCors(request, response, allowedOrigins);

    if (String(request.method ?? "GET").toUpperCase() === "OPTIONS") {
      response.statusCode = 204;
      if (typeof response.end === "function") response.end();
      return response;
    }

    if (String(request.method ?? "GET").toUpperCase() !== "POST") {
      return sendJson(response, 405, { ok: false, error: "Alleen POST is toegestaan." });
    }

    const token = bearerToken(request);
    if (!token) return sendJson(response, 401, { ok: false, error: "Opnieuw inloggen is nodig om een bug te scannen." });

    let decoded;
    try {
      decoded = await verifyIdToken(token);
      if (!decoded?.uid) throw new Error("Missing uid");
    } catch {
      return sendJson(response, 401, { ok: false, error: "Je BugBaas-login kon niet worden gecontroleerd." });
    }

    const body = parseBody(request.body);
    if (!body || !validScanId(body.scanId)) {
      return sendJson(response, 400, { ok: false, error: "Ongeldige scan-ID." });
    }
    if (!validImageDataUrl(body.imageDataUrl)) {
      return sendJson(response, 400, { ok: false, error: "De afbeelding is ongeldig of te groot." });
    }
    if (body.reviewThumbnailDataUrl !== undefined && !validReviewThumbnailDataUrl(body.reviewThumbnailDataUrl)) {
      return sendJson(response, 400, { ok: false, error: "De beveiligde wedstrijdminiatuur is ongeldig of te groot." });
    }

    const usageRequest = {
      dayKey: dayKeyInTimeZone(),
      idToken: token,
      scanId: body.scanId,
      uid: decoded.uid
    };
    let availability;
    try {
      if (typeof checkUsage !== "function" || typeof reserveUsage !== "function") {
        throw new Error("Bugscan quota is niet geconfigureerd.");
      }
      availability = await checkUsage(usageRequest);
    } catch (error) {
      if (error instanceof RealBugScanQuotaError) {
        return sendJson(response, 429, {
          ok: false,
          error: error.reason === "duplicate" ? "Deze foto wordt al verwerkt." : "Daglimiet voor echte bugscans bereikt."
        });
      }
      return sendJson(response, 503, { ok: false, error: "De bugscanlimiet kon niet veilig worden gecontroleerd." });
    }

    try {
      const rawIdentification = await identifyImage({
        imageDataUrl: body.imageDataUrl,
        catalog
      });
      const normalized = normalizeIdentification(rawIdentification, catalog);
      let remainingScans = availability.remainingScans;
      if (normalized.status === "matched" || normalized.status === "not_in_catalog") {
        try {
          const reservation = await reserveUsage(usageRequest);
          remainingScans = reservation.remainingScans;
        } catch (error) {
          if (error instanceof RealBugScanQuotaError) {
            return sendJson(response, 429, {
              ok: false,
              error: error.reason === "duplicate" ? "Deze foto wordt al verwerkt." : "Daglimiet voor echte bugscans bereikt."
            });
          }
          return sendJson(response, 503, { ok: false, error: "De bugscanlimiet kon niet veilig worden bijgewerkt." });
        }
      }
      const receipt = typeof signReceipt === "function"
        ? signReceipt({
          uid: decoded.uid,
          scanId: body.scanId,
          status: normalized.status,
          identification: normalized.identification,
          thumbnailSha256: validReviewThumbnailDataUrl(body.reviewThumbnailDataUrl)
            ? createHash("sha256").update(body.reviewThumbnailDataUrl).digest("hex")
            : undefined
        })
        : undefined;
      return sendJson(response, 200, {
        ok: true,
        scanId: body.scanId,
        status: normalized.status,
        remainingScans,
        identification: normalized.identification,
        ...(receipt ? { receipt } : {})
      });
    } catch (error) {
      console.error("Real bug identification failed:", error instanceof Error ? error.message : "Unknown error");
      return sendJson(response, 502, {
        ok: false,
        error: "De fotoanalyse is tijdelijk niet beschikbaar. Probeer dezelfde foto opnieuw."
      });
    }
  };
}
