const { isResearchBugId, researchTierForBugId } = require("./researchCatalog.cjs");

const researchProgressAmounts = Object.freeze({
  verified_scan: 40,
  internal_contribution: 25,
  play_completion: 20,
  daily_route: 15,
  momentum_cycle: 25
});

function createResearchTarget({ bugId, ownedBugIds, now, uid }) {
  const normalizedBugId = String(bugId || "").trim();
  if (!uid) throw new Error("A user ID is required.");
  if (!isResearchBugId(normalizedBugId)) throw new Error("This is not an approved research species.");
  if (new Set(ownedBugIds || []).has(normalizedBugId)) throw new Error("This research species is already owned.");

  return {
    id: `research:${uid}:${normalizedBugId}:${String(now || "")}`,
    bugId: normalizedBugId,
    progress: 0,
    target: 100,
    tier: researchTierForBugId(normalizedBugId),
    startedAt: String(now || new Date().toISOString())
  };
}

function applyResearchProgress({ target, source, eventId, localDay, evidenceIds = [], dailySourceKeys = [], now }) {
  if (!target || !target.bugId) throw new Error("An active research target is required.");
  if (!(source in researchProgressAmounts)) throw new Error("Invalid research progress source.");
  const normalizedEventId = String(eventId || "").trim();
  const normalizedDay = String(localDay || "").trim();
  if (!normalizedEventId || !normalizedDay) throw new Error("Research progress evidence is incomplete.");

  const nextEvidenceIds = [...new Set(evidenceIds.map(String))];
  const nextDailySourceKeys = [...new Set(dailySourceKeys.map(String))];
  const dailySourceKey = `${normalizedDay}:${source}`;

  if (nextEvidenceIds.includes(normalizedEventId) || nextDailySourceKeys.includes(dailySourceKey) || target.claimedAt || target.completedAt) {
    return {
      target: { ...target },
      evidenceIds: nextEvidenceIds,
      dailySourceKeys: nextDailySourceKeys,
      awarded: 0,
      duplicate: true
    };
  }

  const amount = researchProgressAmounts[source];
  const progress = Math.min(100, Math.max(0, Number(target.progress) || 0) + amount);
  const completedAt = progress >= 100 ? String(now || new Date().toISOString()) : undefined;
  nextEvidenceIds.push(normalizedEventId);
  nextDailySourceKeys.push(dailySourceKey);

  return {
    target: {
      ...target,
      progress,
      ...(completedAt ? { completedAt } : {})
    },
    evidenceIds: nextEvidenceIds,
    dailySourceKeys: nextDailySourceKeys,
    awarded: Math.min(amount, 100 - Math.max(0, Number(target.progress) || 0)),
    duplicate: false
  };
}

function claimResearchEncounter({ target, now }) {
  if (!target || !target.bugId) throw new Error("An active research target is required.");
  if ((Number(target.progress) || 0) < 100 || !target.completedAt) throw new Error("This research target is not complete.");
  if (target.claimedAt) {
    return {
      bugId: target.bugId,
      duplicate: true,
      target: { ...target }
    };
  }

  return {
    bugId: target.bugId,
    duplicate: false,
    target: {
      ...target,
      claimedAt: String(now || new Date().toISOString())
    }
  };
}

module.exports = {
  applyResearchProgress,
  claimResearchEncounter,
  createResearchTarget,
  researchProgressAmounts
};
