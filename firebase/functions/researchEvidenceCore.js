const arcadeModes = new Set(["tap_duel", "web_runner", "nest_defense", "bug_glide", "bug_tower", "bubble_swarm"]);
const contributionCollections = new Set(["bugs", "organizationBugs"]);
const safeIdPattern = /^[A-Za-z0-9_-]{1,160}$/;

function normalizeResearchEvidenceRequest(source, body = {}) {
  if (source === "daily_route") {
    const claimId = safeId(body.claimId);
    if (!claimId.startsWith("daily-route-bonus-")) throw new TypeError("A completed Daily Route bonus is required.");
    return { claimId, eventId: `daily:${claimId}`, source };
  }

  if (source === "momentum_cycle") {
    const cycle = Math.max(1, Math.floor(Number(body.cycle) || 0));
    if (!cycle) throw new TypeError("A completed Momentum cycle is required.");
    return { cycle, eventId: `momentum:${cycle}`, source };
  }

  if (source === "play_completion") {
    const mode = String(body.mode || "").trim();
    if (!arcadeModes.has(mode)) throw new TypeError("Invalid arcade mode.");
    const runId = safeId(body.runId);
    return { eventId: `arcade:${mode}:${runId}`, mode, runId, source };
  }

  if (source === "internal_contribution") {
    const kind = String(body.kind || "").trim();
    if (kind === "legacy_event") {
      const legacyEventId = safeId(body.eventId);
      return { eventId: `legacy:${legacyEventId}`, legacyEventId, kind, source };
    }
    const collectionName = String(body.collectionName || "").trim();
    if (!contributionCollections.has(collectionName)) throw new TypeError("Invalid contribution collection.");
    const bugId = safeId(body.bugId);
    if (kind === "report") return { bugId, collectionName, eventId: `report:${collectionName}:${bugId}`, kind, source };
    if (kind === "comment") {
      const commentId = safeId(body.commentId);
      return { bugId, collectionName, commentId, eventId: `comment:${collectionName}:${bugId}:${commentId}`, kind, source };
    }
    throw new TypeError("Invalid contribution kind.");
  }

  throw new TypeError("Invalid research evidence source.");
}

function safeId(value) {
  const id = String(value || "").trim();
  if (!safeIdPattern.test(id)) throw new TypeError("Invalid evidence identifier.");
  return id;
}

module.exports = { normalizeResearchEvidenceRequest };
