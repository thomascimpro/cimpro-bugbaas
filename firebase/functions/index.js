const { createCipheriv, createDecipheriv, createHash, randomBytes } = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { activityImportId, activityMovement, aggregateActivityMovement, fitnessServerConfigurationStatus, fitnessUserConfigurationStatus, normalizeFitnessSyncerReturnUrl, tokenExpiryMs } = require("./fitnessSyncerCore");
const { eligibleFieldMilestones } = require("./fieldMilestoneRewards");
const { releaseBoss, releaseBossProgress, releaseBossShouldAutoAward } = require("./releaseBossCore");
const { seasonContributionAmount, seasonProgress, seasonWindow } = require("./seasonProgressCore");
const { soloCampaignMilestoneForLevel, soloCampaignMilestoneEligible } = require("./soloCampaignMilestoneCore");
const { verifyScanReceipt } = require("./realBugScanReceipt.cjs");
const { normalizeTeamHuntSpecies, observationIsInsideWeekend, teamHuntCategoryForSpeciesKey, teamHuntCategorySummary, teamHuntWeekendForDate } = require("./teamHuntCore");
const {
  swarmSiege,
  swarmSiegeAvailableCharges,
  swarmSiegeDayId,
  swarmSiegePhase,
  swarmSiegeProgress,
  swarmSiegeRewardForClaim,
  swarmSiegeRewardPool,
  swarmSiegeRewardTier,
  swarmSiegeRunCanResume,
  swarmSiegeRunExpiresAt,
  swarmSiegeSchedule,
  swarmSiegeTargetForActivePlayers,
  validateSwarmSiegeSubmission
} = require("./swarmSiegeCore");
const { normalizePrivateSightingLocation } = require("./privateSightingMapCore");
const {
  applyResearchProgress,
  claimResearchEncounter,
  createResearchTarget
} = require("./researchTargetCore");
const { normalizeResearchEvidenceRequest } = require("./researchEvidenceCore");
const { eligibleMuseumClaimIds, rewardForClaimId } = require("./museumRewardsCore");
const { bugBrainAwardedXp, bugBrainDailySeed, bugBrainStartStatus, normalizeBugBrainCorrectAnswers } = require("./bugBrainCore");
const { buildWeeklyFieldSpotlightClaim, weeklyFieldSpotlight } = require("./weeklyFieldSpotlightCore");
const {
  contestRewardRarity,
  contestRewardXp,
  selectWeeklyScanNominees,
  weeklyScanContestRewardBugId,
  weeklyScanContestWeek,
  weeklyScanContestWinner
} = require("./weeklyScanContestCore");

initializeApp();

const trustedAuthProjectIds = new Set(["thomascimpro-6266f", "bugbaas-3"]);
const authAppsByProjectId = new Map();
const db = getFirestore();
const fitnessSyncerTokenKey = defineSecret("FITNESSSYNCER_TOKEN_KEY");
const bugScanReceiptSecret = defineSecret("BUG_SCAN_RECEIPT_SECRET");
const oauthStateCollection = "fitnessSyncerOauthStates";
const scopes = "source_read source_data_activity_read";
const allowedOrigins = new Set([
  "https://bugbaas.vercel.app",
  "https://bugbaasv3.vercel.app",
  "https://bugbaasv3-6dnlxq9d8-thomas-cim-pro.vercel.app",
  "http://localhost:8081",
  "http://localhost:8083",
  "http://localhost:8084",
  "http://localhost:8085",
  "http://localhost:19006",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8083",
  "http://127.0.0.1:8084",
  "http://127.0.0.1:8085",
  "http://127.0.0.1:19006"
]);

exports.fitnessSyncerStatus = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    const uid = await authenticatedUid(req);
    const snapshot = await integrationRef(uid).get();
    const data = snapshot.data() || {};
    const serverConfiguration = fitnessServerConfigurationStatus(process.env);
    const credentialsConfigured = hasEncryptedValue(data.oauthApp);
    res.json({
      configured: serverConfiguration.configured && credentialsConfigured,
      connected: hasEncryptedValue(data.token),
      credentialsConfigured,
      serverReady: serverConfiguration.configured,
      missingConfiguration: [
        ...serverConfiguration.missingConfiguration,
        ...(credentialsConfigured ? [] : ["client_id", "client_secret"])
      ],
      lastError: data.lastError || undefined,
      lastSyncAt: data.lastSyncAt?.toDate?.().toISOString?.() || undefined
    });
  } catch (error) {
    sendError(res, error);
  }
});

exports.startBugBrainDailyRun = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const day = localDayInAmsterdam();
    const userRef = db.collection("users").doc(uid);
    const attemptRef = userRef.collection("bugBrainDailyAttempts").doc(day);
    const claimRef = userRef.collection("bugBrainDailyClaims").doc(day);
    const result = await db.runTransaction(async (transaction) => {
      const [userSnapshot, attemptSnapshot, claimSnapshot] = await transaction.getAll(userRef, attemptRef, claimRef);
      if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
      const status = bugBrainStartStatus({ attemptExists: attemptSnapshot.exists, claimExists: claimSnapshot.exists });
      if (status !== "available") return { available: false, seed: null, status };
      const seed = bugBrainDailySeed(uid, day);
      transaction.create(attemptRef, {
        day,
        seed,
        startedAt: FieldValue.serverTimestamp(),
        status: "active"
      });
      return { available: true, seed, status: "available" };
    });
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

exports.claimBugBrainDailyReward = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const correctAnswers = normalizeBugBrainCorrectAnswers(req.body?.correctAnswers);
    const day = localDayInAmsterdam();
    const userRef = db.collection("users").doc(uid);
    const attemptRef = userRef.collection("bugBrainDailyAttempts").doc(day);
    const claimRef = userRef.collection("bugBrainDailyClaims").doc(day);
    const result = await db.runTransaction(async (transaction) => {
      const [userSnapshot, attemptSnapshot, claimSnapshot] = await transaction.getAll(userRef, attemptRef, claimRef);
      if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
      if (claimSnapshot.exists) return { awardedXp: 0, alreadyClaimed: true };
      if (!attemptSnapshot.exists || attemptSnapshot.data()?.status !== "active") {
        throw httpError(409, "Start today's Bug Brain run before claiming its reward.");
      }
      const awardedXp = bugBrainAwardedXp(correctAnswers);
      transaction.create(claimRef, {
        awardedXp,
        claimedAt: FieldValue.serverTimestamp(),
        correctAnswers,
        day
      });
      transaction.update(attemptRef, {
        completedAt: FieldValue.serverTimestamp(),
        correctAnswers,
        status: "completed"
      });
      if (awardedXp > 0) transaction.update(userRef, { totalPoints: FieldValue.increment(awardedXp) });
      return { awardedXp, alreadyClaimed: false };
    });
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
});

exports.listVerifiedObservations = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requireGet(req);
    const uid = await authenticatedUid(req);
    const snapshot = await db.collection("users").doc(uid)
      .collection("verifiedObservations").orderBy("observedAt", "desc").limit(60).get();
    res.json({
      entries: snapshot.docs.map((item) => ({ ...item.data(), id: String(item.data()?.id || item.id) })),
      ok: true
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Verified observation list failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Field notes are temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.recordVerifiedObservation = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [bugScanReceiptSecret] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const habitat = String(req.body?.habitat || "");
    const behavior = String(req.body?.behavior || "");
    if (!["Tuin", "Park", "Water", "Nacht", "Kantoor", "Binnen"].includes(habitat)) throw httpError(400, "Invalid habitat.");
    if (!["Rustte", "Kroop", "Vloog", "At", "Onbekend"].includes(behavior)) throw httpError(400, "Invalid behavior.");
    const claims = verifyScanReceipt(req.body?.receipt, { secret: process.env.BUG_SCAN_RECEIPT_SECRET, uid });
    if (!claims) throw httpError(400, "This scan proof is invalid or expired. Scan again to create a field note.");
    const normalizedLocation = req.body?.location === undefined ? undefined : normalizePrivateSightingLocation(req.body.location);
    if (req.body?.location !== undefined && !normalizedLocation) throw httpError(400, "Invalid private map location.");
    const ref = db.collection("users").doc(uid).collection("verifiedObservations").doc(claims.scanId);
    const entry = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return existing.data();
      const next = {
        behavior,
        bugId: claims.bugId || "",
        confidence: claims.confidence,
        habitat,
        id: claims.scanId,
        observedAt: new Date().toISOString(),
        scanId: claims.scanId,
        scientificName: claims.scientificName,
        speciesName: claims.speciesName,
        status: claims.status,
        ...(normalizedLocation || {})
      };
      transaction.create(ref, next);
      return next;
    });
    const research = await addResearchProgressForUser(uid, "verified_scan", claims.scanId).catch((error) => {
      logger.error("Research scan progress failed", safeError(error));
      return { activeTarget: undefined, awarded: 0, duplicate: false, unavailable: true };
    });
    await addSeasonContribution(uid, "verified_discovery", claims.scanId).catch((error) => logger.error("Season discovery contribution failed", safeError(error)));
    const milestones = await claimFieldMilestones(uid).catch((error) => {
      logger.error("Field milestone claim failed", safeError(error));
      return { claimed: [], verifiedObservationCount: undefined };
    });
    const weeklySpotlight = await claimWeeklyFieldSpotlightReward(uid, claims.bugId).catch((error) => {
      logger.error("Weekly field spotlight claim failed", safeError(error));
      return { awardedXp: 0, claimed: false, matched: false, unavailable: true };
    });
    const teamHunt = await syncActiveTeamHunt(uid).catch((error) => {
      logger.error("Team Hunt contribution sync failed", safeError(error));
      return { active: false, unavailable: true };
    });
    const contestSubmission = await registerWeeklyScanContestCandidate({
      claims,
      reviewThumbnailDataUrl: req.body?.reviewThumbnailDataUrl,
      uid
    }).catch((error) => {
      logger.error("Weekly scan contest registration failed", safeError(error));
      return { registered: false, unavailable: true };
    });
    res.json({ contestSubmission, entry, milestones, ok: true, research, teamHunt, weeklySpotlight });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Verified observation failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Field note is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.weeklyScanContestStatus = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requireGet(req);
    const uid = await authenticatedUid(req);
    res.json(await weeklyScanContestPayload(uid));
  } catch (error) {
    sendWeeklyScanContestError(res, error);
  }
});

exports.voteWeeklyScanContest = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const candidateId = validContestCandidateId(req.body?.candidateId);
    const week = weeklyScanContestWeek();
    await ensureWeeklyScanContest(week);
    const contestRef = db.collection("weeklyScanContests").doc(week.weekId);
    const nomineeRef = contestRef.collection("nominees").doc(candidateId);
    const voteRef = contestRef.collection("votes").doc(uid);
    await db.runTransaction(async (transaction) => {
      const [contestSnapshot, nomineeSnapshot, voteSnapshot] = await transaction.getAll(contestRef, nomineeRef, voteRef);
      if (contestSnapshot.data()?.status !== "voting" || !nomineeSnapshot.exists) throw httpError(409, "Deze weekstemming is niet meer actief.");
      if (nomineeSnapshot.data()?.uid === uid) throw httpError(400, "Je kunt niet op je eigen foto stemmen.");
      if (voteSnapshot.exists) throw httpError(409, "Je hebt deze week al gestemd.");
      transaction.create(voteRef, { candidateId, createdAt: FieldValue.serverTimestamp(), uid });
      transaction.update(nomineeRef, { voteCount: FieldValue.increment(1) });
    });
    res.json(await weeklyScanContestPayload(uid));
  } catch (error) {
    sendWeeklyScanContestError(res, error);
  }
});

exports.reportWeeklyScanContestPhoto = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const candidateId = validContestCandidateId(req.body?.candidateId);
    const week = weeklyScanContestWeek();
    await ensureWeeklyScanContest(week);
    const contestRef = db.collection("weeklyScanContests").doc(week.weekId);
    const nomineeRef = contestRef.collection("nominees").doc(candidateId);
    const reportRef = contestRef.collection("reports").doc(`${uid}_${candidateId}`);
    await db.runTransaction(async (transaction) => {
      const [contestSnapshot, nomineeSnapshot, reportSnapshot] = await transaction.getAll(contestRef, nomineeRef, reportRef);
      if (contestSnapshot.data()?.status !== "voting" || !nomineeSnapshot.exists) throw httpError(409, "Deze weekstemming is niet meer actief.");
      if (nomineeSnapshot.data()?.uid === uid) throw httpError(400, "Je kunt je eigen foto niet rapporteren.");
      if (reportSnapshot.exists) return;
      transaction.create(reportRef, {
        candidateId,
        createdAt: FieldValue.serverTimestamp(),
        reason: "fake_or_incorrect",
        reporterUid: uid,
        status: "pending_review"
      });
      transaction.update(nomineeRef, { reportCount: FieldValue.increment(1), reviewStatus: "flagged" });
    });
    res.json(await weeklyScanContestPayload(uid));
  } catch (error) {
    sendWeeklyScanContestError(res, error);
  }
});

exports.acknowledgeWeeklyScanContestReward = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const weekId = String(req.body?.weekId || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) throw httpError(400, "Ongeldige wedstrijdweek.");
    const contestSnapshot = await db.collection("weeklyScanContests").doc(weekId).get();
    if (!contestSnapshot.exists || contestSnapshot.data()?.winner?.uid !== uid) throw httpError(403, "Deze winnaarbeloning hoort niet bij jouw account.");
    await db.collection("users").doc(uid).collection("weeklyScanContestRewardPresentations").doc(weekId).set({
      acknowledgedAt: FieldValue.serverTimestamp(),
      rewardBugId: contestSnapshot.data()?.winner?.rewardBugId || "",
      weekId
    }, { merge: true });
    res.json({ ok: true });
  } catch (error) {
    sendWeeklyScanContestError(res, error);
  }
});

exports.rotateWeeklyScanContest = onSchedule({ region: "us-central1", schedule: "10 0 * * 1", timeZone: "Europe/Amsterdam" }, async (event) => {
  const now = new Date(event.scheduleTime || Date.now());
  const current = weeklyScanContestWeek(now);
  await finalizeWeeklyScanContest(weeklyScanContestWeek(now, -1));
  await ensureWeeklyScanContest(current);
});

exports.claimFieldMilestones = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    res.json({ ok: true, ...(await claimFieldMilestones(uid)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Field milestone claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Field milestones are temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.claimMuseumRewards = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    res.json({ ok: true, ...(await claimMuseumRewards(await authenticatedUid(req))) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Museum reward claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Museum rewards are temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.researchTargetStatus = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requireGet(req);
    res.json({ ok: true, ...(await researchTargetStatusForUser(await authenticatedUid(req))) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Research target status failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Research is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.startResearchTarget = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const bugId = String(req.body?.bugId || "").trim();
    if (!bugId || bugId.includes("/")) throw httpError(400, "Invalid research species.");
    res.json({ ok: true, ...(await startResearchTargetForUser(await authenticatedUid(req), bugId)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Research target start failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Research could not be started." : String(error?.message || "Request failed.") });
  }
});

exports.claimResearchEncounter = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    res.json({ ok: true, ...(await autoAwardResearchEncounter(await authenticatedUid(req), true)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Research encounter claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "The research encounter could not be awarded." : String(error?.message || "Request failed.") });
  }
});

exports.syncResearchProgress = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const source = String(req.body?.source || "").trim();
    let evidence;
    try {
      evidence = normalizeResearchEvidenceRequest(source, req.body?.evidence || {});
    } catch (error) {
      throw httpError(400, String(error?.message || "Invalid research evidence."));
    }
    const occurredAt = await verifyResearchEvidence(uid, evidence);
    res.json({ ok: true, ...(await addResearchProgressForUser(uid, source, evidence.eventId, occurredAt)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Research progress sync failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Research progress could not be synchronized." : String(error?.message || "Request failed.") });
  }
});

exports.claimTeamHuntContributions = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    res.json({ ok: true, ...(await syncActiveTeamHunt(await authenticatedUid(req))) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Team Hunt contribution sync failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Team Hunt is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.teamHuntStatus = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const synced = await syncActiveTeamHunt(uid);
    res.json({ ok: true, ...(await teamHuntStatusForUser(uid, synced.weekend)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Team Hunt status failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Team Hunt is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.releaseBossStatus = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requireGet(req);
    const uid = await authenticatedUid(req);
    let status = await releaseBossStatus(uid);
    if (releaseBossShouldAutoAward(status)) {
      await claimReleaseBossReward(uid, status);
      status = await releaseBossStatus(uid);
    }
    res.json({ ok: true, ...status });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Release boss status failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Release boss is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.claimReleaseBossReward = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    res.json({ ok: true, ...(await claimReleaseBossReward(uid)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Release boss reward claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Release boss reward is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.claimSoloCampaignBossMilestone = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    res.json({ ok: true, ...(await claimSoloCampaignBossMilestone(uid, req.body?.bossLevel)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Solo Campaign milestone claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "The campaign milestone is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.swarmSiegeStatus = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requireGet(req);
    res.json({ ok: true, ...(await swarmSiegeStatusForUser(await authenticatedUid(req))) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Swarm Siege status failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "Swarm Siege is temporarily unavailable." : String(error?.message || "Request failed.") });
  }
});

exports.startSwarmSiegeRun = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    res.json({ ok: true, ...(await startSwarmSiegeRun(await authenticatedUid(req))) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Swarm Siege run start failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "A Swarm Siege run could not be started." : String(error?.message || "Request failed.") });
  }
});

exports.submitSwarmSiegeRun = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const runId = String(req.body?.runId || "").trim();
    const score = Number(req.body?.score);
    if (!runId || runId.includes("/")) throw httpError(400, "Invalid run ID.");
    res.json({ ok: true, ...(await submitSwarmSiegeRun(await authenticatedUid(req), runId, score)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Swarm Siege run submit failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "The Swarm Siege result could not be saved." : String(error?.message || "Request failed.") });
  }
});

exports.claimSwarmSiegeReward = onRequest({ cors: false, invoker: "public", region: "us-central1" }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const eventId = String(req.body?.eventId || "").trim();
    if (!/^swarm-siege-[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(eventId)) throw httpError(400, "Invalid event ID.");
    res.json({ ok: true, ...(await claimSwarmSiegeReward(await authenticatedUid(req), eventId)) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error("Swarm Siege reward claim failed", safeError(error));
    res.status(status).json({ error: status >= 500 ? "The Swarm Siege reward could not be claimed." : String(error?.message || "Request failed.") });
  }
});

exports.fitnessSyncerConfigure = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    requireServerConfiguration();
    const credentials = normalizeOAuthAppCredentials(req.body);
    const configuration = fitnessUserConfigurationStatus(credentials);
    if (!configuration.configured) throw httpError(400, "Enter both FitnessSyncer Client ID and Client Secret.");
    if (credentials.clientId.length > 512 || credentials.clientSecret.length > 512) throw httpError(400, "FitnessSyncer credentials are too long.");
    const ref = integrationRef(uid);
    const snapshot = await ref.get();
    const current = snapshot.data() || {};
    if (hasEncryptedValue(current.oauthApp) && hasEncryptedValue(current.token)) {
      try {
        await revokeFitnessSyncerToken(decryptJson(current.token).accessToken, oauthAppCredentials(current));
      } catch {
        // Replacing credentials must remain possible when the old token is already invalid.
      }
    }
    await ref.set({
      connectedAt: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      lastError: FieldValue.delete(),
      lastSyncAt: FieldValue.delete(),
      oauthApp: encryptJson(credentials),
      scope: FieldValue.delete(),
      token: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ configured: true, connected: false, credentialsConfigured: true, serverReady: true, missingConfiguration: [] });
  } catch (error) {
    sendError(res, error);
  }
});

exports.fitnessSyncerClearConfiguration = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const ref = integrationRef(uid);
    const snapshot = await ref.get();
    const serverReady = fitnessServerConfigurationStatus(process.env).configured;
    if (!snapshot.exists) {
      res.json({
        configured: false,
        connected: false,
        credentialsConfigured: false,
        serverReady,
        missingConfiguration: [...(serverReady ? [] : ["token_key"]), "client_id", "client_secret"]
      });
      return;
    }
    const data = snapshot.data() || {};
    if (serverReady && hasEncryptedValue(data.oauthApp) && hasEncryptedValue(data.token)) {
      const credentials = oauthAppCredentials(data);
      const tokens = decryptJson(data.token);
      await revokeFitnessSyncerToken(tokens.accessToken, credentials).catch(() => undefined);
    }
    await ref.set({
      connectedAt: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      lastError: FieldValue.delete(),
      lastSyncAt: FieldValue.delete(),
      oauthApp: FieldValue.delete(),
      scope: FieldValue.delete(),
      token: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({
      configured: false,
      connected: false,
      credentialsConfigured: false,
      serverReady,
      missingConfiguration: [...(serverReady ? [] : ["token_key"]), "client_id", "client_secret"]
    });
  } catch (error) {
    sendError(res, error);
  }
});

exports.fitnessSyncerStart = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    requireServerConfiguration();
    const credentials = await loadOAuthAppCredentials(uid);
    const returnUrl = normalizeAppReturnUrl(req.body?.returnUrl);
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    await db.collection(oauthStateCollection).doc(hash(state)).set({
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      returnUrl,
      uid,
      verifier
    });
    const url = new URL("https://www.fitnesssyncer.com/api/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", credentials.clientId);
    url.searchParams.set("redirect_uri", redirectUri());
    url.searchParams.set("scope", scopes);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    res.json({ authorizationUrl: url.toString() });
  } catch (error) {
    sendError(res, error);
  }
});

exports.fitnessSyncerCallback = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  try {
    requireServerConfiguration();
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    if (!code || !state || code === "error") throw httpError(400, "FitnessSyncer authorization was not completed.");
    const stateRef = db.collection(oauthStateCollection).doc(hash(state));
    const stateSnapshot = await stateRef.get();
    const stateData = stateSnapshot.data();
    if (!stateSnapshot.exists || !stateData || stateData.expiresAt.toMillis() < Date.now()) {
      throw httpError(400, "FitnessSyncer authorization state expired.");
    }
    await stateRef.delete();
    const credentials = await loadOAuthAppCredentials(stateData.uid);
    const token = await exchangeToken(credentials, {
      code,
      code_verifier: stateData.verifier,
      grant_type: "authorization_code"
    });
    await integrationRef(stateData.uid).set({
      connectedAt: FieldValue.serverTimestamp(),
      expiresAt: tokenExpiryMs(token.expires_in),
      scope: token.scope || scopes,
      token: encryptJson({ accessToken: token.access_token, refreshToken: token.refresh_token }),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.redirect(302, fitnessSyncerResultUrl(stateData.returnUrl, "connected"));
  } catch (error) {
    logger.error("FitnessSyncer callback failed", safeError(error));
    res.redirect(302, fitnessSyncerResultUrl(appReturnUrl(), "error"));
  }
});

exports.fitnessSyncerSync = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey], timeoutSeconds: 60 }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    requireServerConfiguration();
    const integration = await integrationRef(uid).get();
    const data = integration.data() || {};
    if (!integration.exists || !hasEncryptedValue(data.token)) throw httpError(409, "FitnessSyncer is not connected.");
    const credentials = oauthAppCredentials(data);
    let tokens = decryptJson(data.token);
    let expiresAt = Number(data.expiresAt || 0);
    if (expiresAt <= Date.now() + 60000) {
      const refreshed = await exchangeToken(credentials, { grant_type: "refresh_token", refresh_token: tokens.refreshToken });
      tokens = { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token || tokens.refreshToken };
      expiresAt = tokenExpiryMs(refreshed.expires_in);
      await integration.ref.set({ expiresAt, token: encryptJson(tokens), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    const result = await readActivityDistances(tokens.accessToken, uid);
    await integration.ref.set({ lastError: FieldValue.delete(), lastSyncAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json(result);
  } catch (error) {
    logger.error("FitnessSyncer sync failed", safeError(error));
    sendError(res, error);
  }
});

exports.fitnessSyncerDisconnect = onRequest({ cors: false, invoker: "public", region: "us-central1", secrets: [fitnessSyncerTokenKey] }, async (req, res) => {
  if (!setCors(req, res) || req.method === "OPTIONS") return;
  try {
    requirePost(req);
    const uid = await authenticatedUid(req);
    const ref = integrationRef(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      res.json({ disconnected: true });
      return;
    }
    const data = snapshot.data() || {};
    if (fitnessServerConfigurationStatus(process.env).configured && hasEncryptedValue(data.oauthApp) && hasEncryptedValue(data.token)) {
      const credentials = oauthAppCredentials(data);
      const tokens = decryptJson(data.token);
      await revokeFitnessSyncerToken(tokens.accessToken, credentials).catch(() => undefined);
    }
    await ref.set({
      connectedAt: FieldValue.delete(),
      expiresAt: FieldValue.delete(),
      lastError: FieldValue.delete(),
      lastSyncAt: FieldValue.delete(),
      scope: FieldValue.delete(),
      token: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ disconnected: true });
  } catch (error) {
    sendError(res, error);
  }
});

async function readActivityDistances(accessToken, uid) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = startOfIsoWeek(now).getTime();
  const queryStart = Math.min(todayStart, weekStart) - 24 * 60 * 60 * 1000;
  const sourcesResponse = await fitnessSyncerGet("/providers/sources/", accessToken);
  const sources = arrayItems(sourcesResponse).map(unwrap).filter((source) => String(source.type || source.taskType || "").toLowerCase() === "activity");
  const activityRecords = [];
  const importWrites = [];

  for (const source of sources) {
    const sourceId = String(source.id || source.taskId || "");
    if (!sourceId) continue;
    for (let offset = 0; offset < 1000; offset += 100) {
      const response = await fitnessSyncerGet(`/providers/sources/${encodeURIComponent(sourceId)}/items/?startDate=${queryStart}&endDate=${Date.now()}&offset=${offset}&limit=100`, accessToken);
      const items = arrayItems(response);
      for (const listEntry of items) {
        const itemId = String(unwrap(listEntry)?.itemId || "");
        if (!itemId) continue;
        const detailResponse = await fitnessSyncerGet(`/providers/sources/${encodeURIComponent(sourceId)}/items/${encodeURIComponent(itemId)}`, accessToken);
        const value = { ...unwrap(detailResponse), itemId };
        const movement = activityMovement(value);
        if (!movement?.timestamp) continue;
        activityRecords.push({ sourceId, value });
        importWrites.push({
          distanceKm: Math.round(Math.max(movement.distanceKm, movement.steps * 0.00075) * 1000) / 1000,
          id: activityImportId(sourceId, value),
          sourceId,
          steps: movement.steps,
          timestamp: movement.timestamp
        });
      }
      if (items.length < 100) break;
    }
  }
  await recordImports(uid, importWrites);
  return {
    importedActivities: activityRecords.length,
    ...aggregateActivityMovement(activityRecords, todayStart, weekStart)
  };
}

async function recordImports(uid, imports) {
  const root = integrationRef(uid).collection("imports");
  for (let offset = 0; offset < imports.length; offset += 400) {
    const batch = db.batch();
    imports.slice(offset, offset + 400).forEach((item) => {
      batch.set(root.doc(item.id), {
        distanceKm: item.distanceKm,
        importedAt: FieldValue.serverTimestamp(),
        providerActivityAt: Timestamp.fromMillis(item.timestamp),
        sourceId: item.sourceId,
        steps: item.steps
      }, { merge: true });
    });
    await batch.commit();
  }
}

async function exchangeToken(credentials, values) {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: redirectUri(),
    ...values
  });
  const response = await fetch("https://api.fitnesssyncer.com/api/oauth/access_token", {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw httpError(502, payload.error_description || "FitnessSyncer token exchange failed.");
  return payload;
}

async function revokeFitnessSyncerToken(accessToken, credentials) {
  return fetch("https://api.fitnesssyncer.com/api/oauth/revoke_token", {
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      token: accessToken,
      token_type_hint: "access_token"
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST"
  });
}

async function fitnessSyncerGet(path, accessToken) {
  const response = await fetch(`https://api.fitnesssyncer.com/api${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` }
  });
  if (response.status === 401 || response.status === 403) throw httpError(401, "Reconnect FitnessSyncer to continue.");
  if (!response.ok) throw httpError(502, `FitnessSyncer returned ${response.status}.`);
  return response.json();
}

function authProjectIdFromToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return "";
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload?.aud === "string" ? payload.aud : "";
  } catch {
    return "";
  }
}

function authAppForProject(projectId) {
  if (!trustedAuthProjectIds.has(projectId)) throw httpError(401, "Authentication project is not trusted.");
  const existing = authAppsByProjectId.get(projectId);
  if (existing) return existing;
  const app = initializeApp({ projectId }, `auth-${projectId}`);
  authAppsByProjectId.set(projectId, app);
  return app;
}

async function authenticatedUid(req) {
  const match = String(req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!match) throw httpError(401, "Authentication required.");
  const token = match[1];
  const projectId = authProjectIdFromToken(token);
  if (!projectId) throw httpError(401, "Invalid authentication token.");
  return (await getAuth(authAppForProject(projectId)).verifyIdToken(token)).uid;
}

function researchTargetRef(uid) {
  return db.collection("users").doc(uid).collection("research").doc("active");
}

function researchEvidenceRef(uid, source, eventId) {
  const id = createHash("sha256").update(`${source}:${eventId}`).digest("hex").slice(0, 40);
  return db.collection("users").doc(uid).collection("researchEvidence").doc(id);
}

function researchReceiptRef(uid, receiptId) {
  return db.collection("users").doc(uid).collection("rewardReceipts").doc(receiptId);
}

function localDayInAmsterdam(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Amsterdam",
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function publicResearchTarget(data) {
  if (!data?.bugId) return undefined;
  return {
    bugId: String(data.bugId),
    claimedAt: data.claimedAt || undefined,
    completedAt: data.completedAt || undefined,
    id: String(data.id),
    progress: Math.max(0, Math.min(100, Math.floor(data.progress || 0))),
    startedAt: String(data.startedAt || ""),
    target: 100,
    tier: Math.max(1, Math.min(4, Math.floor(data.tier || 1)))
  };
}

async function researchTargetStatusForUser(uid) {
  const award = await autoAwardResearchEncounter(uid, false);
  const snapshot = await researchTargetRef(uid).get();
  return {
    activeTarget: publicResearchTarget(snapshot.data()),
    awardedBugId: award.awardedBugId,
    duplicate: award.duplicate,
    options: [],
    pendingReceiptId: award.duplicate ? undefined : award.receiptId
  };
}

async function startResearchTargetForUser(uid, bugId) {
  const targetRef = researchTargetRef(uid);
  const inventoryRef = db.collection("users").doc(uid).collection("bugdex").doc(bugId);
  return db.runTransaction(async (transaction) => {
    const [targetSnapshot, inventorySnapshot] = await transaction.getAll(targetRef, inventoryRef);
    const existingTarget = targetSnapshot.data();
    if (existingTarget?.bugId && !existingTarget.claimedAt) {
      if (existingTarget.bugId === bugId) return { activeTarget: publicResearchTarget(existingTarget), options: [] };
      throw httpError(409, "Finish the active research target before choosing another species.");
    }
    if (Math.max(0, Math.floor(inventorySnapshot.data()?.count || 0)) > 0) throw httpError(409, "This research species is already owned.");

    let target;
    try {
      target = createResearchTarget({ bugId, now: new Date().toISOString(), ownedBugIds: [], uid });
    } catch (error) {
      throw httpError(400, String(error?.message || "Invalid research species."));
    }
    transaction.set(targetRef, {
      ...target,
      dailySourceKeys: [],
      evidenceIds: [],
      updatedAt: FieldValue.serverTimestamp()
    });
    return { activeTarget: publicResearchTarget(target), options: [] };
  });
}

async function verifyResearchEvidence(uid, evidence) {
  if (evidence.source === "daily_route") {
    const snapshot = await db.collection("users").doc(uid).collection("dailyMissionClaims").doc(evidence.claimId).get();
    const data = snapshot.data() || {};
    if (!snapshot.exists || data.id !== evidence.claimId || data.rewardType !== "xp_bonus" || Math.max(0, Math.floor(data.awardedPoints || 0)) < 1) {
      throw httpError(409, "The Daily Route completion could not be verified.");
    }
    return researchEvidenceDate(data.claimedAt);
  }

  if (evidence.source === "momentum_cycle") {
    const snapshot = await db.collection("users").doc(uid).get();
    const data = snapshot.data() || {};
    const currentDay = localDayInAmsterdam(new Date());
    if (!snapshot.exists || Math.floor(Number(data.momentumCycle) || 0) !== evidence.cycle || Math.floor(Number(data.momentumSegments) || 0) !== 5 || data.momentumLastActiveDay !== currentDay) {
      throw httpError(409, "The completed Momentum cycle could not be verified.");
    }
    return new Date();
  }

  if (evidence.source === "play_completion") {
    const snapshot = await db.collection("arcadeGameResults").doc(evidence.mode).collection("runs").doc(evidence.runId).get();
    const data = snapshot.data() || {};
    if (!snapshot.exists || data.userId !== uid || data.mode !== evidence.mode || !Number.isFinite(Number(data.score))) {
      throw httpError(409, "The completed game could not be verified.");
    }
    return researchEvidenceDate(data.createdAt);
  }

  if (evidence.source === "internal_contribution") {
    if (evidence.kind === "legacy_event") {
      const snapshot = await db.collection("users").doc(uid).collection("bugdexEvents").doc(evidence.legacyEventId).get();
      const data = snapshot.data() || {};
      const allowedSources = new Set(["bug_reported", "comment", "status_update", "bug_fixed", "upvote_given"]);
      if (!snapshot.exists || !allowedSources.has(data.source) || data.rewardType !== "points" || Math.max(0, Math.floor(data.rewardValue || 0)) < 1) {
        throw httpError(409, "The internal contribution could not be verified.");
      }
      return researchEvidenceDate(data.createdAt);
    }
    const bugRef = db.collection(evidence.collectionName).doc(evidence.bugId);
    if (evidence.kind === "report") {
      const snapshot = await bugRef.get();
      const data = snapshot.data() || {};
      if (!snapshot.exists || data.reporterId !== uid) throw httpError(409, "The bug report contribution could not be verified.");
      return researchEvidenceDate(data.createdAt);
    }
    const snapshot = await bugRef.collection("comments").doc(evidence.commentId).get();
    const data = snapshot.data() || {};
    if (!snapshot.exists || data.authorId !== uid) throw httpError(409, "The comment contribution could not be verified.");
    return researchEvidenceDate(data.createdAt);
  }

  throw httpError(400, "Unsupported research evidence source.");
}

function researchEvidenceDate(value) {
  if (value?.toDate instanceof Function) return value.toDate();
  const date = new Date(value || "");
  return Number.isFinite(date.getTime()) ? date : new Date();
}

async function addResearchProgressForUser(uid, source, eventId, date = new Date()) {
  const targetRef = researchTargetRef(uid);
  const evidenceRef = researchEvidenceRef(uid, source, eventId);
  const now = date.toISOString();
  const localDay = localDayInAmsterdam(date);
  const progressResult = await db.runTransaction(async (transaction) => {
    const [targetSnapshot, evidenceSnapshot] = await transaction.getAll(targetRef, evidenceRef);
    if (!targetSnapshot.exists) return { activeTarget: undefined, awarded: 0, duplicate: false };
    const target = targetSnapshot.data() || {};
    if (evidenceSnapshot.exists) return { activeTarget: publicResearchTarget(target), awarded: 0, duplicate: true };

    let result;
    try {
      result = applyResearchProgress({
        dailySourceKeys: Array.isArray(target.dailySourceKeys) ? target.dailySourceKeys : [],
        evidenceIds: Array.isArray(target.evidenceIds) ? target.evidenceIds : [],
        eventId,
        localDay,
        now,
        source,
        target
      });
    } catch (error) {
      throw httpError(400, String(error?.message || "Invalid research evidence."));
    }
    if (result.duplicate) return { activeTarget: publicResearchTarget(result.target), awarded: 0, duplicate: true };

    transaction.set(targetRef, {
      ...result.target,
      dailySourceKeys: result.dailySourceKeys,
      evidenceIds: result.evidenceIds,
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.create(evidenceRef, {
      amount: result.awarded,
      createdAt: FieldValue.serverTimestamp(),
      eventId,
      localDay,
      source,
      targetId: target.id
    });
    return { activeTarget: publicResearchTarget(result.target), awarded: result.awarded, duplicate: false };
  });

  if (progressResult.activeTarget?.completedAt && !progressResult.activeTarget.claimedAt) {
    const award = await autoAwardResearchEncounter(uid, false);
    if (award.awardedBugId && !award.duplicate) await addSeasonContribution(uid, "research_completion", progressResult.activeTarget.id).catch(() => undefined);
    return { ...progressResult, ...award, activeTarget: award.activeTarget || progressResult.activeTarget };
  }
  return progressResult;
}

async function autoAwardResearchEncounter(uid, requireComplete) {
  const targetRef = researchTargetRef(uid);
  return db.runTransaction(async (transaction) => {
    const targetSnapshot = await transaction.get(targetRef);
    if (!targetSnapshot.exists) {
      if (requireComplete) throw httpError(404, "No active research target was found.");
      return { activeTarget: undefined, duplicate: false };
    }
    const target = targetSnapshot.data() || {};
    if ((Number(target.progress) || 0) < 100 || !target.completedAt) {
      if (requireComplete) throw httpError(409, "This research target is not complete.");
      return { activeTarget: publicResearchTarget(target), duplicate: false };
    }
    if (target.claimedAt) {
      return {
        activeTarget: publicResearchTarget(target),
        awardedBugId: target.bugId,
        duplicate: true,
        receiptId: target.receiptId
      };
    }

    let claim;
    try {
      claim = claimResearchEncounter({ target, now: new Date().toISOString() });
    } catch (error) {
      throw httpError(409, String(error?.message || "Research encounter is not ready."));
    }
    const inventoryRef = db.collection("users").doc(uid).collection("bugdex").doc(claim.bugId);
    const unlockRef = db.collection("users").doc(uid).collection("bugdexUnlocks").doc(claim.bugId);
    const receiptId = createHash("sha256").update(String(target.id)).digest("hex").slice(0, 40);
    const receiptRef = researchReceiptRef(uid, receiptId);
    const [inventorySnapshot, unlockSnapshot, receiptSnapshot] = await transaction.getAll(inventoryRef, unlockRef, receiptRef);
    if (receiptSnapshot.exists) {
      transaction.set(targetRef, { claimedAt: receiptSnapshot.data()?.createdAt || claim.target.claimedAt, receiptId }, { merge: true });
      return {
        activeTarget: publicResearchTarget({ ...claim.target, receiptId }),
        awardedBugId: claim.bugId,
        duplicate: true,
        receiptId
      };
    }

    const now = claim.target.claimedAt;
    const existingInventory = inventorySnapshot.data() || {};
    const existingUnlock = unlockSnapshot.data() || {};
    const previousCount = Math.max(0, Math.floor(existingInventory.count || 0));
    const rarity = ["Gewoon", "Gewoon", "Zeldzaam", "Episch", "Legendarisch"][Math.max(1, Math.min(4, Math.floor(target.tier || 1)))];
    const inventory = {
      bugId: claim.bugId,
      count: previousCount + 1,
      firstUnlockedAt: existingInventory.firstUnlockedAt || now,
      lastUnlockedAt: now,
      rarity: existingInventory.rarity || rarity,
      sources: Array.from(new Set([...(Array.isArray(existingInventory.sources) ? existingInventory.sources : []), "research_encounter"]))
    };
    const unlock = {
      bugId: claim.bugId,
      firstUnlockedAt: existingUnlock.firstUnlockedAt || inventory.firstUnlockedAt,
      lastUnlockedAt: now,
      rarity: existingUnlock.rarity || inventory.rarity,
      sources: Array.from(new Set([...(Array.isArray(existingUnlock.sources) ? existingUnlock.sources : []), "research_encounter"]))
    };
    const claimedTarget = { ...claim.target, receiptId };
    transaction.set(inventoryRef, inventory);
    transaction.set(unlockRef, unlock);
    transaction.set(targetRef, { ...claimedTarget, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(receiptRef, {
      createdAt: now,
      id: receiptId,
      lines: [
        {
          bugId: claim.bugId,
          kind: previousCount > 0 ? "copy" : "species",
          labelKey: previousCount > 0 ? "receipt.copy" : "receipt.species",
          ...(previousCount > 0 ? { amount: 1 } : {})
        },
        { amount: 100, kind: "research", labelKey: "receipt.research.complete" }
      ],
      primaryDestination: "collection",
      source: "research_encounter"
    });
    return {
      activeTarget: publicResearchTarget(claimedTarget),
      awardedBugId: claim.bugId,
      duplicate: false,
      isNew: previousCount <= 0,
      receiptId
    };
  });
}

async function claimMuseumRewards(uid) {
  const userRef = db.collection("users").doc(uid);
  const [inventory, masteries, observations, placements, trophies, existingClaims] = await Promise.all([
    userRef.collection("bugdex").get(),
    userRef.collection("bugMastery").get(),
    userRef.collection("verifiedObservations").get(),
    userRef.collection("museumPlacements").get(),
    userRef.collection("releaseBossClaims").get(),
    userRef.collection("museumRewardClaims").get()
  ]);
  const placementsByWing = {};
  placements.docs.forEach((snapshot) => { placementsByWing[snapshot.id] = Array.isArray(snapshot.data()?.placements) ? snapshot.data().placements : []; });
  const eligibleIds = eligibleMuseumClaimIds({
    inventory: inventory.docs.map((snapshot) => ({ bugId: snapshot.id, ...snapshot.data() })),
    masteries: masteries.docs.map((snapshot) => ({ bugId: snapshot.id, ...snapshot.data() })),
    observations: observations.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })),
    placementsByWing,
    trophyCount: trophies.size
  });
  const existingClaimIds = existingClaims.docs.map((snapshot) => String(snapshot.data()?.claimId || "")).filter(Boolean);
  if (!eligibleIds.length) return { awardedXp: 0, awardedBadges: [], awardedBugs: [], awardedTitles: [], claimedIds: existingClaimIds };

  return db.runTransaction(async (transaction) => {
    const claimRefs = eligibleIds.map((claimId) => userRef.collection("museumRewardClaims").doc(claimId.replace(/:/g, "__")));
    const rewardBugIds = Array.from(new Set(eligibleIds.map((claimId) => rewardForClaimId(claimId)?.rewardBugId).filter(Boolean)));
    const bugRefs = rewardBugIds.map((bugId) => userRef.collection("bugdex").doc(bugId));
    const unlockRefs = rewardBugIds.map((bugId) => userRef.collection("bugdexUnlocks").doc(bugId));
    const snapshots = await transaction.getAll(userRef, ...claimRefs, ...bugRefs, ...unlockRefs);
    const userSnapshot = snapshots[0];
    const claimSnapshots = snapshots.slice(1, 1 + claimRefs.length);
    const bugSnapshotStart = 1 + claimRefs.length;
    const bugSnapshots = snapshots.slice(bugSnapshotStart, bugSnapshotStart + bugRefs.length);
    const unlockSnapshots = snapshots.slice(bugSnapshotStart + bugRefs.length);
    const bugSnapshotById = new Map(rewardBugIds.map((bugId, index) => [bugId, bugSnapshots[index]]));
    const unlockSnapshotById = new Map(rewardBugIds.map((bugId, index) => [bugId, unlockSnapshots[index]]));
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
    const newIds = eligibleIds.filter((_, index) => !claimSnapshots[index].exists);
    const allClaimedIds = Array.from(new Set([...existingClaimIds, ...eligibleIds]));
    if (!newIds.length) return { awardedXp: 0, awardedBadges: [], awardedBugs: [], awardedTitles: [], claimedIds: allClaimedIds };

    const awardedBadges = [];
    const awardedBugs = [];
    const awardedTitles = [];
    let awardedXp = 0;
    const userData = userSnapshot.data() || {};
    const nextBadges = new Set(Array.isArray(userData.badges) ? userData.badges : []);
    const now = new Date().toISOString();

    for (const claimId of newIds) {
      const reward = rewardForClaimId(claimId) || {};
      awardedXp += Math.max(0, Math.floor(Number(reward.rewardXp) || 0));
      if (reward.rewardBadgeId && !nextBadges.has(reward.rewardBadgeId)) {
        nextBadges.add(reward.rewardBadgeId);
        awardedBadges.push(reward.rewardBadgeId);
      }
      if (reward.rewardTitleId) awardedTitles.push(reward.rewardTitleId);
      if (reward.rewardBugId) {
        const bugRef = userRef.collection("bugdex").doc(reward.rewardBugId);
        const bugSnapshot = bugSnapshotById.get(reward.rewardBugId);
        const existing = bugSnapshot?.exists ? bugSnapshot.data() || {} : null;
        const catalogRarity = String(reward.rewardRarity || "Mythisch");
        const next = existing ? {
          ...existing,
          bugId: reward.rewardBugId,
          count: Math.max(0, Math.floor(Number(existing.count) || 0)) + 1,
          lastUnlockedAt: now,
          sources: Array.from(new Set([...(Array.isArray(existing.sources) ? existing.sources : []), "museum_reward"]))
        } : {
          bugId: reward.rewardBugId,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: catalogRarity,
          sources: ["museum_reward"]
        };
        transaction.set(bugRef, next);
        const unlockRef = userRef.collection("bugdexUnlocks").doc(reward.rewardBugId);
        const unlockSnapshot = unlockSnapshotById.get(reward.rewardBugId);
        const existingUnlock = unlockSnapshot?.exists ? unlockSnapshot.data() || {} : {};
        transaction.set(unlockRef, {
          bugId: reward.rewardBugId,
          firstUnlockedAt: String(existingUnlock.firstUnlockedAt || next.firstUnlockedAt || now),
          lastUnlockedAt: now,
          rarity: String(existingUnlock.rarity || next.rarity || catalogRarity),
          sources: Array.from(new Set([...(Array.isArray(existingUnlock.sources) ? existingUnlock.sources : []), "museum_reward"]))
        });
        awardedBugs.push(reward.rewardBugId);
      }
      const claimRef = userRef.collection("museumRewardClaims").doc(claimId.replace(/:/g, "__"));
      transaction.create(claimRef, { claimId, claimedAt: FieldValue.serverTimestamp(), reward });
    }

    const userUpdate = {
      badges: Array.from(nextBadges),
      totalPoints: FieldValue.increment(awardedXp)
    };
    if (awardedTitles.length) userUpdate.museumTitles = FieldValue.arrayUnion(...awardedTitles);
    transaction.update(userRef, userUpdate);
    return { awardedXp, awardedBadges, awardedBugs, awardedTitles, claimedIds: allClaimedIds };
  });
}

async function claimWeeklyFieldSpotlightReward(uid, bugId, date = new Date()) {
  const spotlight = weeklyFieldSpotlight(date);
  if (!spotlight.bugIds.includes(String(bugId || ""))) {
    return { awardedXp: 0, bugIds: spotlight.bugIds, claimed: false, duplicate: false, matched: false, weekId: spotlight.weekId };
  }

  const userRef = db.collection("users").doc(uid);
  const claimRef = userRef.collection("weeklyFieldSpotlightClaims").doc(spotlight.weekId);
  const preview = buildWeeklyFieldSpotlightClaim({ bugId, date, existingClaim: null, existingRewardItem: null, uid });
  const rewardRef = userRef.collection("bugdex").doc(preview.rewardBugId);
  const unlockRef = userRef.collection("bugdexUnlocks").doc(preview.rewardBugId);

  return db.runTransaction(async (transaction) => {
    const [userSnapshot, claimSnapshot, rewardSnapshot, unlockSnapshot] = await transaction.getAll(userRef, claimRef, rewardRef, unlockRef);
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");

    const plan = buildWeeklyFieldSpotlightClaim({
      bugId,
      date,
      existingClaim: claimSnapshot.exists ? claimSnapshot.data() || {} : null,
      existingRewardItem: rewardSnapshot.exists ? rewardSnapshot.data() || {} : null,
      now: new Date().toISOString(),
      uid
    });
    if (!plan.claimed) {
      return {
        awardedXp: 0,
        bugIds: plan.bugIds,
        claimed: false,
        duplicate: plan.duplicate,
        matched: plan.matched,
        rewardBugId: plan.rewardBugId,
        weekId: plan.weekId
      };
    }

    const existingUnlock = unlockSnapshot.exists ? unlockSnapshot.data() || {} : {};
    transaction.set(rewardRef, plan.rewardItem);
    transaction.set(unlockRef, {
      bugId: plan.rewardBugId,
      firstUnlockedAt: existingUnlock.firstUnlockedAt || plan.rewardItem.firstUnlockedAt,
      lastUnlockedAt: plan.rewardItem.lastUnlockedAt,
      rarity: "Episch",
      sources: Array.from(new Set([...(Array.isArray(existingUnlock.sources) ? existingUnlock.sources : []), "weekly_field_spotlight"]))
    });
    transaction.create(claimRef, {
      awardedBugId: plan.rewardBugId,
      awardedXp: plan.awardedXp,
      claimedAt: FieldValue.serverTimestamp(),
      matchedBugId: bugId,
      source: "weekly_field_spotlight",
      targetBugIds: plan.bugIds,
      weekId: plan.weekId
    });
    transaction.update(userRef, { totalPoints: FieldValue.increment(plan.awardedXp) });
    return {
      awardedXp: plan.awardedXp,
      bugIds: plan.bugIds,
      claimed: true,
      duplicate: false,
      isNew: plan.isNew,
      matched: true,
      rewardBugId: plan.rewardBugId,
      weekId: plan.weekId
    };
  });
}

async function claimFieldMilestones(uid) {
  const observations = await db.collection("users").doc(uid).collection("verifiedObservations").get();
  const milestones = eligibleFieldMilestones(observations.size);
  if (!milestones.length) return { claimed: [], verifiedObservationCount: observations.size };

  const userRef = db.collection("users").doc(uid);
  const claimRefs = milestones.map((milestone) => userRef.collection("fieldMilestoneClaims").doc(milestone.id));
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, ...claimSnapshots] = await transaction.getAll(userRef, ...claimRefs);
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
    const claimed = milestones.filter((_, index) => !claimSnapshots[index].exists);
    if (!claimed.length) return { claimed: [], verifiedObservationCount: observations.size };

    const awardedXp = claimed.reduce((total, milestone) => total + milestone.rewardXp, 0);
    claimed.forEach((milestone) => {
      transaction.create(userRef.collection("fieldMilestoneClaims").doc(milestone.id), {
        awardedXp: milestone.rewardXp,
        claimedAt: FieldValue.serverTimestamp(),
        milestoneId: milestone.id,
        minimumObservations: milestone.minimumObservations,
        verifiedObservationCount: observations.size
      });
    });
    transaction.update(userRef, { totalPoints: FieldValue.increment(awardedXp) });
    return {
      claimed: claimed.map((milestone) => ({ id: milestone.id, rewardXp: milestone.rewardXp })),
      verifiedObservationCount: observations.size
    };
  });
}

async function syncActiveTeamHunt(uid) {
  const weekend = teamHuntWeekendForDate();
  if (!weekend) return { active: false, weekend: null };
  const userRef = db.collection("users").doc(uid);
  const [userSnapshot, observations] = await Promise.all([
    userRef.get(),
    userRef.collection("verifiedObservations").get()
  ]);
  if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
  const user = userSnapshot.data() || {};
  const organizationId = String(user.organizationId || "");
  if (!organizationId || organizationId === "public") return { active: true, eligible: false, weekend };
  const organizationName = String(user.organizationName || organizationId).slice(0, 120);
  let added = 0;
  for (const snapshot of observations.docs) {
    const observation = snapshot.data();
    if (!observationIsInsideWeekend(observation, weekend)) continue;
    const species = normalizeTeamHuntSpecies(observation);
    if (!species) continue;
    if (await addTeamHuntSpecies({ organizationId, organizationName, species, uid, weekend })) added += 1;
  }
  return { active: true, added, eligible: true, weekend };
}

async function addTeamHuntSpecies({ organizationId, organizationName, species, uid, weekend }) {
  const huntRef = db.collection("teamHunts").doc(weekend.id);
  const teamRef = huntRef.collection("teams").doc(organizationId);
  const speciesRef = teamRef.collection("species").doc(species.id);
  const contributionRef = db.collection("users").doc(uid).collection("teamHuntContributions").doc(weekend.id);
  return db.runTransaction(async (transaction) => {
    const speciesSnapshot = await transaction.get(speciesRef);
    if (speciesSnapshot.exists) return false;
    transaction.set(huntRef, {
      endsAt: Timestamp.fromDate(weekend.end),
      id: weekend.id,
      startsAt: Timestamp.fromDate(weekend.start),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(teamRef, {
      organizationId,
      organizationName,
      score: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.create(speciesRef, {
      categoryId: teamHuntCategoryForSpeciesKey(species.key),
      firstContributorUid: uid,
      firstSeenAt: FieldValue.serverTimestamp(),
      speciesKey: species.key,
      speciesName: species.label
    });
    transaction.set(contributionRef, {
      addedSpecies: FieldValue.arrayUnion(species.key),
      eventId: weekend.id,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  });
}

async function teamHuntStatusForUser(uid, weekend) {
  if (!weekend) return { active: false };
  const userSnapshot = await db.collection("users").doc(uid).get();
  if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
  const user = userSnapshot.data() || {};
  const organizationId = String(user.organizationId || "");
  if (!organizationId || organizationId === "public") return { active: true, eligible: false, endsAt: weekend.end.toISOString(), eventId: weekend.id, leaderboard: [] };
  const huntRef = db.collection("teamHunts").doc(weekend.id);
  const teamRef = huntRef.collection("teams").doc(organizationId);
  const [teams, contribution, teamSpecies] = await Promise.all([
    huntRef.collection("teams").orderBy("score", "desc").limit(5).get(),
    db.collection("users").doc(uid).collection("teamHuntContributions").doc(weekend.id).get(),
    teamRef.collection("species").get()
  ]);
  const leaderboard = teams.docs.map((snapshot, index) => {
    const data = snapshot.data() || {};
    return { organizationId: snapshot.id, organizationName: String(data.organizationName || snapshot.id), rank: index + 1, score: Number(data.score || 0) };
  });
  const own = leaderboard.find((item) => item.organizationId === organizationId);
  const addedSpecies = Array.isArray(contribution.data()?.addedSpecies) ? contribution.data().addedSpecies.length : 0;
  const categorySummary = teamHuntCategorySummary(teamSpecies.docs.map((snapshot) => {
    const data = snapshot.data() || {};
    return String(data.categoryId || teamHuntCategoryForSpeciesKey(data.speciesKey || ""));
  }));
  return {
    active: true,
    addedSpecies,
    eligible: true,
    endsAt: weekend.end.toISOString(),
    eventId: weekend.id,
    leaderboard,
    missingCategories: categorySummary.missing,
    completedCategories: categorySummary.completed,
    team: { organizationId, organizationName: String(user.organizationName || organizationId), rank: own?.rank, score: own?.score || 0 }
  };
}

async function claimSoloCampaignBossMilestone(uid, bossLevelValue) {
  const milestone = soloCampaignMilestoneForLevel(bossLevelValue);
  if (!milestone) throw httpError(400, "Invalid Solo Campaign boss level.");
  const userRef = db.collection("users").doc(uid);
  const progressRef = userRef.collection("soloCampaign").doc("progress");
  const claimRef = userRef.collection("soloCampaignBossClaims").doc(milestone.claimId);
  const rewardRef = userRef.collection("bugdex").doc(milestone.bugId);
  const now = new Date().toISOString();
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, progressSnapshot, claimSnapshot, rewardSnapshot] = await transaction.getAll(userRef, progressRef, claimRef, rewardRef);
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
    const storedWave = Math.floor(Number(progressSnapshot.data()?.wave) || 0);
    if (!progressSnapshot.exists || !soloCampaignMilestoneEligible({ bossLevel: milestone.bossLevel, storedWave })) {
      throw httpError(409, "Complete this Solo Campaign boss before claiming its milestone.");
    }
    const existing = rewardSnapshot.exists ? rewardSnapshot.data() || {} : null;
    if (claimSnapshot.exists) {
      return {
        alreadyClaimed: true,
        claimed: false,
        isNew: false,
        item: existing,
        rewardBugId: milestone.bugId,
        source: "solo_campaign_clear"
      };
    }
    const item = existing
      ? {
          ...existing,
          bugId: milestone.bugId,
          count: Math.max(0, Math.floor(Number(existing.count) || 0)) + 1,
          lastUnlockedAt: now,
          rarity: String(existing.rarity || milestone.rarity),
          sources: Array.from(new Set([...(Array.isArray(existing.sources) ? existing.sources : []), "solo_campaign_clear"]))
        }
      : {
          bugId: milestone.bugId,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: milestone.rarity,
          sources: ["solo_campaign_clear"]
        };
    transaction.set(rewardRef, item);
    transaction.create(claimRef, {
      bossLevel: milestone.bossLevel,
      claimedAt: FieldValue.serverTimestamp(),
      id: milestone.claimId,
      requiredWave: milestone.requiredWave,
      rewardBugId: milestone.bugId,
      rewardSource: "solo_campaign_clear",
      rewardType: "bug"
    });
    return {
      alreadyClaimed: false,
      claimed: true,
      isNew: !existing,
      item,
      rewardBugId: milestone.bugId,
      source: "solo_campaign_clear"
    };
  });
}

function seasonRefs(uid, value = new Date()) {
  const window = seasonWindow(value);
  const seasonRef = db.collection("seasons").doc(window.id);
  return {
    contributorRef: seasonRef.collection("contributors").doc(uid),
    seasonRef,
    window
  };
}

async function addSeasonContribution(uid, source, eventId, value = new Date()) {
  const amount = seasonContributionAmount(source);
  const { contributorRef, seasonRef, window } = seasonRefs(uid, value);
  const evidenceId = createHash("sha256").update(`${window.id}:${source}:${eventId}`).digest("hex").slice(0, 40);
  const evidenceRef = db.collection("users").doc(uid).collection("seasonEvidence").doc(evidenceId);
  return db.runTransaction(async (transaction) => {
    const evidenceSnapshot = await transaction.get(evidenceRef);
    if (evidenceSnapshot.exists) return { amount: 0, duplicate: true, seasonId: window.id };
    transaction.create(evidenceRef, { amount, createdAt: FieldValue.serverTimestamp(), eventId, seasonId: window.id, source });
    transaction.set(seasonRef, {
      endsAt: Timestamp.fromDate(window.endsAt),
      finaleStartsAt: Timestamp.fromDate(window.finaleStartsAt),
      startsAt: Timestamp.fromDate(window.startsAt),
      target: window.target,
      totalPoints: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(contributorRef, {
      totalPoints: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return { amount, duplicate: false, seasonId: window.id };
  });
}

async function releaseBossStatus(uid) {
  const { contributorRef, seasonRef, window } = seasonRefs(uid);
  const [seasonSnapshot, contributorSnapshot] = await Promise.all([seasonRef.get(), contributorRef.get()]);
  const progress = seasonProgress({
    communityPoints: seasonSnapshot.data()?.totalPoints || 0,
    personalPoints: contributorSnapshot.data()?.totalPoints || 0,
    target: seasonSnapshot.data()?.target || window.target
  });
  const bossId = `guardian-${window.id}`;
  const claimSnapshot = await db.collection("users").doc(uid).collection("releaseBossClaims").doc(bossId).get();
  return {
    bossId,
    claimed: claimSnapshot.exists,
    complete: progress.complete,
    contributed: progress.personalPoints,
    eligibleForReward: window.state === "finale" && progress.eligible,
    finaleStartsAt: window.finaleStartsAt.toISOString(),
    progress: progress.progress,
    rewardXp: releaseBoss.rewardXp,
    seasonId: window.id,
    state: window.state,
    target: progress.target
  };
}

async function claimReleaseBossReward(uid, preloadedStatus) {
  const status = preloadedStatus || await releaseBossStatus(uid);
  if (status.state !== "finale") throw httpError(409, "The Conservatory Guardian opens during the final season week.");
  if (!status.complete) throw httpError(409, "The Conservatory Guardian is still gathering strength.");
  if (!status.eligibleForReward) throw httpError(409, "Contribute during this season to earn the finale reward.");
  const userRef = db.collection("users").doc(uid);
  const claimRef = userRef.collection("releaseBossClaims").doc(status.bossId);
  return db.runTransaction(async (transaction) => {
    const [userSnapshot, claimSnapshot] = await transaction.getAll(userRef, claimRef);
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");
    if (claimSnapshot.exists) return { awardedXp: 0, claimed: true, rewardXp: releaseBoss.rewardXp };
    transaction.create(claimRef, {
      awardedXp: releaseBoss.rewardXp,
      bossId: status.bossId,
      claimedAt: FieldValue.serverTimestamp(),
      seasonId: status.seasonId,
      source: "season_finale"
    });
    transaction.update(userRef, { totalPoints: FieldValue.increment(releaseBoss.rewardXp) });
    return { awardedXp: releaseBoss.rewardXp, claimed: true, rewardXp: releaseBoss.rewardXp };
  });
}

function swarmSiegeAggregateRef(eventId) {
  return db.collection("swarmSieges").doc(eventId);
}

function swarmSiegeParticipantRef(eventId, uid) {
  return swarmSiegeAggregateRef(eventId).collection("participants").doc(uid);
}

function swarmSiegeRunRef(runId) {
  return db.collection("swarmSiegeRuns").doc(runId);
}

function swarmSiegeClaimRef(uid, eventId) {
  return db.collection("users").doc(uid).collection("swarmSiegeClaims").doc(eventId);
}

async function recentSwarmActivePlayerCount(event, now = new Date()) {
  const referenceTime = Math.min(now.getTime(), event.start.getTime());
  const cutoff = new Date(referenceTime - 14 * 24 * 60 * 60 * 1000).toISOString();
  const snapshot = await db.collection("users").where("lastActiveAt", ">=", cutoff).limit(100).get();
  return Math.max(1, snapshot.size);
}

async function ensureSwarmSiegeTarget(event) {
  const aggregateRef = swarmSiegeAggregateRef(event.id);
  const existing = await aggregateRef.get();
  const existingTarget = Math.floor(Number(existing.data()?.targetDamage) || 0);
  if (existingTarget > 0) return existingTarget;

  let activePlayerSnapshot = 1;
  let targetDamage = swarmSiege.targetDamage;
  try {
    activePlayerSnapshot = await recentSwarmActivePlayerCount(event);
    targetDamage = swarmSiegeTargetForActivePlayers(activePlayerSnapshot);
  } catch (error) {
    logger.warn("Swarm Siege active-player snapshot failed; using legacy target", safeError(error));
  }

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(aggregateRef);
    const lockedTarget = Math.floor(Number(snapshot.data()?.targetDamage) || 0);
    if (lockedTarget > 0) return lockedTarget;
    transaction.set(aggregateRef, {
      activePlayerSnapshot,
      endsAt: Timestamp.fromDate(event.end),
      startsAt: Timestamp.fromDate(event.start),
      targetDamage,
      targetLockedAt: FieldValue.serverTimestamp(),
      totalDamage: Math.max(0, Math.floor(Number(snapshot.data()?.totalDamage) || 0)),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return targetDamage;
  });
}

function timestampIso(value) {
  return value?.toDate?.().toISOString?.() || undefined;
}

function participantAttemptsUsed(participant, dayId) {
  return participant.attacksDayId === dayId ? Math.max(0, Math.floor(participant.attacksUsed || 0)) : 0;
}

function publicSwarmSiegeStatus(schedule, aggregate = {}, participant = {}, claimed = false, now = new Date()) {
  const event = schedule.event || schedule.next;
  const progress = swarmSiegeProgress(aggregate.totalDamage || 0, aggregate.targetDamage || swarmSiege.targetDamage);
  const phase = swarmSiegePhase(progress.progress, progress.target);
  const attemptsUsed = participantAttemptsUsed(participant, swarmSiegeDayId(event.start));
  const availableCharges = schedule.active ? swarmSiegeAvailableCharges(now, event) : 0;
  const rewardTier = swarmSiegeRewardTier(progress.progress, progress.target);
  return {
    active: schedule.active,
    attacksRemaining: Math.max(0, availableCharges - attemptsUsed),
    claimed,
    complete: progress.complete,
    contributorCount: Math.max(0, Math.floor(aggregate.contributorCount || 0)),
    endsAt: event.end.toISOString(),
    eventId: event.id,
    medalId: claimed ? `swarm-${rewardTier.id}-${event.id}` : undefined,
    modifier: phase.modifier,
    nextStartsAt: schedule.state === "upcoming" ? event.start.toISOString() : undefined,
    personalDamage: Math.max(0, Math.floor(participant.totalDamage || 0)),
    phaseId: phase.id,
    progress: progress.progress,
    resultEndsAt: event.resultEnd?.toISOString(),
    rewardTierId: rewardTier.id,
    rewardXp: rewardTier.rewardXp,
    startsAt: event.start.toISOString(),
    state: schedule.state,
    target: progress.target
  };
}

async function swarmSiegeStatusForUser(uid) {
  const schedule = swarmSiegeSchedule();
  const currentEvent = schedule.event || schedule.next;
  if (schedule.state === "preview" || schedule.state === "live") await ensureSwarmSiegeTarget(currentEvent);
  if (schedule.state === "result") {
    const participantSnapshot = await swarmSiegeParticipantRef(currentEvent.id, uid).get();
    const participant = participantSnapshot.data() || {};
    if (Math.max(0, Math.floor(participant.totalDamage || 0)) > 0) await claimSwarmSiegeReward(uid, currentEvent.id).catch(() => undefined);
  }

  if (schedule.state === "upcoming" && schedule.previous) {
    const [previousAggregateSnapshot, previousParticipantSnapshot, previousClaimSnapshot] = await Promise.all([
      swarmSiegeAggregateRef(schedule.previous.id).get(),
      swarmSiegeParticipantRef(schedule.previous.id, uid).get(),
      swarmSiegeClaimRef(uid, schedule.previous.id).get()
    ]);
    const previousParticipant = previousParticipantSnapshot.data() || {};
    if (Math.max(0, Math.floor(previousParticipant.totalDamage || 0)) > 0 && !previousClaimSnapshot.exists) {
      await claimSwarmSiegeReward(uid, schedule.previous.id).catch(() => undefined);
      return {
        ...publicSwarmSiegeStatus(
          { active: false, event: schedule.previous, next: schedule.next, state: "result" },
          previousAggregateSnapshot.data() || {},
          previousParticipant,
          true
        ),
        nextStartsAt: schedule.next.start.toISOString()
      };
    }
  }

  const [aggregateSnapshot, participantSnapshot, claimSnapshot] = await Promise.all([
    swarmSiegeAggregateRef(currentEvent.id).get(),
    swarmSiegeParticipantRef(currentEvent.id, uid).get(),
    swarmSiegeClaimRef(uid, currentEvent.id).get()
  ]);
  return publicSwarmSiegeStatus(schedule, aggregateSnapshot.data() || {}, participantSnapshot.data() || {}, claimSnapshot.exists);
}

async function startSwarmSiegeRun(uid) {
  const schedule = swarmSiegeSchedule();
  if (!schedule.active) throw httpError(409, "Swarm Siege is not active.");
  const event = schedule.event;
  const lockedTargetDamage = await ensureSwarmSiegeTarget(event);
  const participantRef = swarmSiegeParticipantRef(event.id, uid);
  const aggregateRef = swarmSiegeAggregateRef(event.id);
  return db.runTransaction(async (transaction) => {
    const participantSnapshot = await transaction.get(participantRef);
    const participant = participantSnapshot.data() || {};
    const now = Timestamp.now();
    const dayId = swarmSiegeDayId(event.start);
    const attacksUsed = participantAttemptsUsed(participant, dayId);
    const availableCharges = swarmSiegeAvailableCharges(now.toDate(), event);
    const activeExpiresAt = participant.activeRunExpiresAt?.toMillis?.() || 0;
    if (swarmSiegeRunCanResume({ activeRunExpiresAtMs: activeExpiresAt, activeRunId: participant.activeRunId, nowMs: now.toMillis(), submittedAt: undefined })) {
      const existingRunSnapshot = await transaction.get(swarmSiegeRunRef(participant.activeRunId));
      if (existingRunSnapshot.exists && swarmSiegeRunCanResume({ activeRunExpiresAtMs: activeExpiresAt, activeRunId: participant.activeRunId, nowMs: now.toMillis(), submittedAt: existingRunSnapshot.data()?.submittedAt })) {
        const existing = existingRunSnapshot.data();
        return {
          attemptsRemaining: Math.max(0, availableCharges - attacksUsed),
          eventId: event.id,
          expiresAt: timestampIso(existing.expiresAt),
          modifier: existing.modifier,
          resumed: true,
          runId: existingRunSnapshot.id,
          seed: existing.seed
        };
      }
    }
    if (attacksUsed >= availableCharges) throw httpError(409, "No Swarm Siege attack charge is available yet.");
    const aggregateSnapshot = await transaction.get(aggregateRef);
    const aggregate = aggregateSnapshot.data() || {};
    const totalDamage = aggregate.totalDamage || 0;
    const targetDamage = aggregate.targetDamage || lockedTargetDamage;
    if (swarmSiegeProgress(totalDamage, targetDamage).complete) throw httpError(409, "The swarm boss is already defeated.");
    const runRef = db.collection("swarmSiegeRuns").doc();
    let expiresAt;
    try {
      expiresAt = Timestamp.fromDate(swarmSiegeRunExpiresAt(now.toDate(), event.end));
    } catch (error) {
      throw httpError(409, String(error?.message || "Not enough event time remains."));
    }
    const modifier = swarmSiegePhase(totalDamage, targetDamage).modifier;
    const seed = `swarm-siege:${event.id}:${runRef.id}:v1`;
    transaction.create(runRef, {
      createdAt: now,
      eventId: event.id,
      expiresAt,
      gameMode: swarmSiege.gameMode,
      modifier,
      seed,
      uid
    });
    transaction.set(participantRef, {
      activeRunExpiresAt: expiresAt,
      activeRunId: runRef.id,
      attacksDayId: dayId,
      attacksUsed: attacksUsed + 1,
      totalDamage: Math.max(0, Math.floor(participant.totalDamage || 0)),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    return {
      attemptsRemaining: Math.max(0, availableCharges - attacksUsed - 1),
      eventId: event.id,
      expiresAt: expiresAt.toDate().toISOString(),
      modifier,
      resumed: false,
      runId: runRef.id,
      seed
    };
  });
}

async function submitSwarmSiegeRun(uid, runId, score) {
  const runRef = swarmSiegeRunRef(runId);
  return db.runTransaction(async (transaction) => {
    const runSnapshot = await transaction.get(runRef);
    if (!runSnapshot.exists) throw httpError(404, "Swarm Siege run not found.");
    const run = runSnapshot.data() || {};
    if (run.uid !== uid) throw httpError(403, "This run belongs to another player.");
    if (run.gameMode !== swarmSiege.gameMode) throw httpError(409, "Wrong Swarm Siege game mode.");
    const createdAt = run.createdAt?.toDate?.();
    const schedule = createdAt ? swarmSiegeSchedule(createdAt) : null;
    if (!createdAt || !schedule?.active || schedule.event.id !== run.eventId) throw httpError(409, "This run is not linked to a valid Swarm Siege event.");
    const aggregateRef = swarmSiegeAggregateRef(run.eventId);
    const participantRef = swarmSiegeParticipantRef(run.eventId, uid);
    const claimRef = swarmSiegeClaimRef(uid, run.eventId);
    const [aggregateSnapshot, participantSnapshot, claimSnapshot] = await transaction.getAll(aggregateRef, participantRef, claimRef);
    const aggregate = aggregateSnapshot.data() || {};
    const participant = participantSnapshot.data() || {};
    if (run.submittedAt) {
      return {
        damage: Math.max(0, Math.floor(run.damage || 0)),
        duplicate: true,
        score: Math.max(0, Math.floor(run.score || 0)),
        status: publicSwarmSiegeStatus(schedule, aggregate, participant, claimSnapshot.exists)
      };
    }
    const now = new Date();
    const validation = validateSwarmSiegeSubmission({ createdAt, now, score });
    if (now >= schedule.event.end || !run.expiresAt?.toMillis || run.expiresAt.toMillis() < now.getTime()) throw httpError(409, "This Swarm Siege run expired.");
    const targetDamage = aggregate.targetDamage || swarmSiege.targetDamage;
    const currentProgress = swarmSiegeProgress(aggregate.totalDamage || 0, targetDamage);
    const acceptedDamage = currentProgress.complete ? 0 : Math.min(validation.damage, currentProgress.remaining);
    const previousPersonalDamage = Math.max(0, Math.floor(participant.totalDamage || 0));
    const nextPersonalDamage = previousPersonalDamage + acceptedDamage;
    const nextContributorCount = Math.max(0, Math.floor(aggregate.contributorCount || 0)) + (previousPersonalDamage === 0 && acceptedDamage > 0 ? 1 : 0);
    const nextProgress = swarmSiegeProgress(currentProgress.progress + acceptedDamage, targetDamage);
    transaction.update(runRef, {
      damage: acceptedDamage,
      elapsedMs: validation.elapsedMs,
      score: validation.score,
      submittedAt: FieldValue.serverTimestamp()
    });
    transaction.set(participantRef, {
      activeRunExpiresAt: FieldValue.delete(),
      activeRunId: FieldValue.delete(),
      lastAttackAt: FieldValue.serverTimestamp(),
      totalDamage: nextPersonalDamage,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    const aggregateUpdate = {
      contributorCount: nextContributorCount,
      endsAt: Timestamp.fromDate(schedule.event.end),
      startsAt: Timestamp.fromDate(schedule.event.start),
      targetDamage,
      totalDamage: nextProgress.progress,
      updatedAt: FieldValue.serverTimestamp()
    };
    if (nextProgress.complete && !currentProgress.complete) aggregateUpdate.completedAt = FieldValue.serverTimestamp();
    transaction.set(aggregateRef, aggregateUpdate, { merge: true });
    return {
      damage: acceptedDamage,
      duplicate: false,
      score: validation.score,
      status: publicSwarmSiegeStatus(
        schedule,
        { ...aggregate, contributorCount: nextContributorCount, targetDamage, totalDamage: nextProgress.progress },
        { ...participant, totalDamage: nextPersonalDamage },
        claimSnapshot.exists,
        now
      )
    };
  });
}

async function claimSwarmSiegeReward(uid, eventId) {
  const aggregateRef = swarmSiegeAggregateRef(eventId);
  const participantRef = swarmSiegeParticipantRef(eventId, uid);
  const userRef = db.collection("users").doc(uid);
  const claimRef = swarmSiegeClaimRef(uid, eventId);
  const rewardBugRefs = swarmSiegeRewardPool.map(({ bugId }) => userRef.collection("bugdex").doc(bugId));
  const result = await db.runTransaction(async (transaction) => {
    const [aggregateSnapshot, participantSnapshot, userSnapshot, claimSnapshot, ...rewardBugSnapshots] = await transaction.getAll(
      aggregateRef,
      participantRef,
      userRef,
      claimRef,
      ...rewardBugRefs
    );
    if (!userSnapshot.exists) throw httpError(404, "User profile not found.");

    const aggregate = aggregateSnapshot.data() || {};
    const rewardTier = swarmSiegeRewardTier(aggregate.totalDamage || 0, aggregate.targetDamage || swarmSiege.targetDamage);
    const inventoryByBugId = Object.fromEntries(swarmSiegeRewardPool.map(({ bugId }, index) => [
      bugId,
      rewardBugSnapshots[index]?.exists ? rewardBugSnapshots[index].data() || {} : {}
    ]));
    const rewardForTier = (rewardTierId) => swarmSiegeRewardForClaim({
      eventId,
      inventoryByBugId,
      now: new Date().toISOString(),
      rewardTierId,
      uid
    });

    if (claimSnapshot.exists) {
      const existing = claimSnapshot.data() || {};
      const existingRewardBugId = String(existing.rewardBugId || "");
      const effectiveRewardTierId = String(existing.rewardTierId || rewardTier.id);
      if (existingRewardBugId || effectiveRewardTierId !== "complete") {
        return {
          awardedBugId: existingRewardBugId || undefined,
          awardedXp: 0,
          claimed: true,
          duplicate: existingRewardBugId ? Boolean(existing.duplicate) : undefined,
          item: existingRewardBugId ? inventoryByBugId[existingRewardBugId] : undefined,
          medalId: existing.medalId,
          rewardTierId: effectiveRewardTierId,
          rewardXp: Math.max(0, Math.floor(existing.awardedXp || 0))
        };
      }

      const reward = rewardForTier(effectiveRewardTierId);
      if (reward) {
        const rewardBugRef = userRef.collection("bugdex").doc(reward.awardedBugId);
        transaction.set(rewardBugRef, reward.item);
        transaction.set(claimRef, {
          duplicate: reward.duplicate,
          rewardBugId: reward.awardedBugId,
          rewardRarity: reward.rarity
        }, { merge: true });
      }
      return {
        awardedBugId: reward?.awardedBugId,
        awardedXp: 0,
        claimed: true,
        duplicate: reward?.duplicate,
        item: reward?.item,
        medalId: existing.medalId,
        rewardTierId: effectiveRewardTierId,
        rewardXp: Math.max(0, Math.floor(existing.awardedXp || 0))
      };
    }

    if (Math.max(0, Math.floor(participantSnapshot.data()?.totalDamage || 0)) < 1) throw httpError(409, "Deal at least one damage to earn this reward.");
    const medalId = `swarm-${rewardTier.id}-${eventId}`;
    const reward = rewardForTier(rewardTier.id);
    if (reward) {
      const rewardBugRef = userRef.collection("bugdex").doc(reward.awardedBugId);
      transaction.set(rewardBugRef, reward.item);
    }
    transaction.create(claimRef, {
      awardedXp: rewardTier.rewardXp,
      claimedAt: FieldValue.serverTimestamp(),
      eventId,
      medalId,
      progressPercent: rewardTier.progressPercent,
      rewardTierId: rewardTier.id,
      source: "swarm_siege",
      ...(reward ? {
        duplicate: reward.duplicate,
        rewardBugId: reward.awardedBugId,
        rewardRarity: reward.rarity
      } : {})
    });
    transaction.update(userRef, { totalPoints: FieldValue.increment(rewardTier.rewardXp) });
    transaction.set(participantRef, { claimed: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return {
      awardedBugId: reward?.awardedBugId,
      awardedXp: rewardTier.rewardXp,
      claimed: true,
      duplicate: reward?.duplicate,
      item: reward?.item,
      medalId,
      rewardTierId: rewardTier.id,
      rewardXp: rewardTier.rewardXp
    };
  });
  if (result.rewardTierId === "complete" && result.awardedXp > 0) await addSeasonContribution(uid, "swarm_victory", eventId).catch(() => undefined);
  return result;
}

function integrationRef(uid) {
  return db.doc(`users/${uid}/privateIntegrations/fitnesssyncer`);
}

async function loadOAuthAppCredentials(uid) {
  const snapshot = await integrationRef(uid).get();
  return oauthAppCredentials(snapshot.data() || {});
}

function oauthAppCredentials(data) {
  if (!hasEncryptedValue(data.oauthApp)) throw httpError(409, "Enter your FitnessSyncer Client ID and Client Secret first.");
  const credentials = normalizeOAuthAppCredentials(decryptJson(data.oauthApp));
  if (!fitnessUserConfigurationStatus(credentials).configured) throw httpError(409, "Enter your FitnessSyncer Client ID and Client Secret first.");
  return credentials;
}

function normalizeOAuthAppCredentials(value = {}) {
  return {
    clientId: String(value.clientId || "").trim(),
    clientSecret: String(value.clientSecret || "").trim()
  };
}

function hasEncryptedValue(value) {
  return Boolean(value?.ciphertext && value?.iv && value?.tag);
}

function requireServerConfiguration() {
  if (!fitnessServerConfigurationStatus(process.env).configured) throw httpError(503, "FitnessSyncer server encryption is not active yet.");
}

function redirectUri() {
  return process.env.FITNESSSYNCER_REDIRECT_URI || "https://us-central1-thomascimpro-6266f.cloudfunctions.net/fitnessSyncerCallback";
}

function appReturnUrl() {
  return process.env.FITNESSSYNCER_APP_RETURN_URL || "https://bugbaas.vercel.app/";
}

function normalizeAppReturnUrl(value) {
  return normalizeFitnessSyncerReturnUrl(value, appReturnUrl());
}

function fitnessSyncerResultUrl(returnUrl, result) {
  const url = new URL(normalizeAppReturnUrl(returnUrl));
  url.searchParams.set("fitnessSyncer", result);
  return url.toString();
}

function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { ciphertext: encrypted.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), version: 1 };
}

function decryptJson(value) {
  if (!value?.ciphertext || !value?.iv || !value?.tag) throw httpError(409, "Reconnect FitnessSyncer to continue.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}

const contestThumbnailPattern = /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i;

function validContestCandidateId(value) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) throw httpError(400, "Ongeldige wedstrijdfoto.");
  return id;
}

function verifiedContestThumbnail(claims, reviewThumbnailDataUrl) {
  if (
    !claims.thumbnailSha256
    || typeof reviewThumbnailDataUrl !== "string"
    || reviewThumbnailDataUrl.length > 220_000
    || !contestThumbnailPattern.test(reviewThumbnailDataUrl)
    || createHash("sha256").update(reviewThumbnailDataUrl).digest("hex") !== claims.thumbnailSha256
  ) return undefined;
  return reviewThumbnailDataUrl;
}

async function registerWeeklyScanContestCandidate({ claims, reviewThumbnailDataUrl, uid }) {
  const photoUrl = verifiedContestThumbnail(claims, reviewThumbnailDataUrl);
  if (!photoUrl || !["matched", "not_in_catalog"].includes(claims?.status)) return { registered: false };
  const week = weeklyScanContestWeek();
  const candidateRef = db.collection("weeklyScanContestSubmissions").doc(week.weekId).collection("candidates").doc(uid);
  const profile = (await db.collection("users").doc(uid).get()).data() || {};
  const displayName = String(profile.displayName || profile.name || "BugBaas-speler").trim().slice(0, 80) || "BugBaas-speler";
  const candidate = {
    confidence: claims.confidence,
    displayName,
    photoContestReason: String(claims.photoContestReason || "Een scherpe, opvallende echte bugfoto.").trim().slice(0, 180),
    photoContestScore: Math.max(0, Math.min(100, Math.round(Number(claims.photoContestScore) || 0))),
    photoUrl,
    scanId: claims.scanId,
    scientificName: String(claims.scientificName || "").slice(0, 160),
    speciesName: String(claims.speciesName || "Bug").slice(0, 120),
    submittedAt: new Date().toISOString(),
    uid,
    weekId: week.weekId
  };
  const selectedAsPersonalBest = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(candidateRef);
    if (existing.data()?.scanId === claims.scanId) return true;
    const currentScore = Number(existing.data()?.photoContestScore) || -1;
    const currentConfidence = Number(existing.data()?.confidence) || -1;
    if (existing.exists && (currentScore > candidate.photoContestScore || (currentScore === candidate.photoContestScore && currentConfidence >= candidate.confidence))) return false;
    transaction.set(candidateRef, candidate);
    return true;
  });
  return { registered: true, selectedAsPersonalBest, weekId: week.weekId };
}

async function ensureWeeklyScanContest(week = weeklyScanContestWeek()) {
  const contestRef = db.collection("weeklyScanContests").doc(week.weekId);
  if ((await contestRef.get()).exists) return;
  const candidatesSnapshot = await db.collection("weeklyScanContestSubmissions").doc(week.sourceWeekId)
    .collection("candidates").orderBy("photoContestScore", "desc").limit(3).get();
  const nominees = selectWeeklyScanNominees(candidatesSnapshot.docs.map((item) => item.data()));
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(contestRef);
    if (existing.exists) return;
    const ready = nominees.length === 3;
    transaction.create(contestRef, {
      createdAt: FieldValue.serverTimestamp(),
      endsAt: week.endsAt,
      nomineeCount: ready ? 3 : 0,
      rewardXp: contestRewardXp,
      sourceWeekId: week.sourceWeekId,
      startsAt: week.startsAt,
      status: ready ? "voting" : "insufficient_candidates",
      weekId: week.weekId
    });
    if (!ready) return;
    for (const nominee of nominees) {
      transaction.create(contestRef.collection("nominees").doc(nominee.scanId), {
        ...nominee,
        reportCount: 0,
        reviewStatus: "clear",
        voteCount: 0
      });
    }
  });
}

async function finalizeWeeklyScanContest(week) {
  const contestRef = db.collection("weeklyScanContests").doc(week.weekId);
  const contestSnapshot = await contestRef.get();
  if (!contestSnapshot.exists || contestSnapshot.data()?.status !== "voting") return;
  const nomineeSnapshot = await contestRef.collection("nominees").get();
  const winner = weeklyScanContestWinner(nomineeSnapshot.docs.map((item) => item.data()));
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(contestRef);
    if (current.data()?.status !== "voting") return;
    if (!winner) {
      transaction.update(contestRef, { closedAt: FieldValue.serverTimestamp(), status: "closed", winner: null });
      return;
    }
    const winnerUserRef = db.collection("users").doc(winner.uid);
    const rewardBugId = weeklyScanContestRewardBugId(winner.uid, week.weekId);
    const rewardRef = winnerUserRef.collection("bugdex").doc(rewardBugId);
    const unlockRef = winnerUserRef.collection("bugdexUnlocks").doc(rewardBugId);
    const [winnerUser, rewardSnapshot, unlockSnapshot] = await transaction.getAll(winnerUserRef, rewardRef, unlockRef);
    if (!winnerUser.exists) throw httpError(404, "Winnaarprofiel niet gevonden.");
    const now = new Date().toISOString();
    const existingReward = rewardSnapshot.exists ? rewardSnapshot.data() || {} : {};
    const existingUnlock = unlockSnapshot.exists ? unlockSnapshot.data() || {} : {};
    const previousCount = Math.max(0, Math.floor(Number(existingReward.count) || 0));
    const rewardSources = Array.from(new Set([...(Array.isArray(existingReward.sources) ? existingReward.sources : []), "weekly_scan_contest"]));
    const unlockSources = Array.from(new Set([...(Array.isArray(existingUnlock.sources) ? existingUnlock.sources : []), "weekly_scan_contest"]));
    transaction.set(rewardRef, {
      bugId: rewardBugId,
      count: previousCount + 1,
      firstUnlockedAt: existingReward.firstUnlockedAt || now,
      lastUnlockedAt: now,
      rarity: contestRewardRarity,
      sources: rewardSources
    });
    transaction.set(unlockRef, {
      bugId: rewardBugId,
      firstUnlockedAt: existingUnlock.firstUnlockedAt || existingReward.firstUnlockedAt || now,
      lastUnlockedAt: now,
      rarity: contestRewardRarity,
      sources: unlockSources
    });
    transaction.update(winnerUserRef, {
      totalPoints: FieldValue.increment(contestRewardXp),
      weeklyScanContestWins: FieldValue.increment(1)
    });
    transaction.update(contestRef, {
      closedAt: FieldValue.serverTimestamp(),
      status: "closed",
      winner: {
        displayName: winner.displayName,
        photoUrl: winner.photoUrl,
        scanId: winner.scanId,
        speciesName: winner.speciesName,
        uid: winner.uid,
        voteCount: winner.voteCount,
        rewardBugId,
        rewardIsNew: previousCount === 0,
        rewardRarity: contestRewardRarity
      },
      winnerRewardXp: contestRewardXp
    });
  });
}

async function weeklyScanContestPayload(uid) {
  const currentWeek = weeklyScanContestWeek();
  const previousWeek = weeklyScanContestWeek(new Date(), -1);
  await finalizeWeeklyScanContest(previousWeek);
  await ensureWeeklyScanContest(currentWeek);
  const contestRef = db.collection("weeklyScanContests").doc(currentWeek.weekId);
  const [contestSnapshot, nomineeSnapshot, voteSnapshot, previousSnapshot, rewardPresentationSnapshot] = await Promise.all([
    contestRef.get(),
    contestRef.collection("nominees").get(),
    contestRef.collection("votes").doc(uid).get(),
    db.collection("weeklyScanContests").doc(previousWeek.weekId).get(),
    db.collection("users").doc(uid).collection("weeklyScanContestRewardPresentations").doc(previousWeek.weekId).get()
  ]);
  const reportSnapshots = await Promise.all(nomineeSnapshot.docs.map((item) => contestRef.collection("reports").doc(`${uid}_${item.id}`).get()));
  const reports = new Set(reportSnapshots.filter((item) => item.exists).map((item) => String(item.data()?.candidateId || "")));
  const contest = contestSnapshot.data() || {};
  const previous = previousSnapshot.data() || {};
  const winner = previous.winner && typeof previous.winner === "object" ? previous.winner : undefined;
  return {
    current: {
      endsAt: contest.endsAt,
      nominees: nomineeSnapshot.docs.map((item) => {
        const data = item.data();
        return {
          displayName: data.displayName,
          id: item.id,
          isOwn: data.uid === uid,
          photoContestReason: data.photoContestReason,
          photoContestScore: data.photoContestScore,
          photoUrl: data.photoUrl,
          reportedByViewer: reports.has(item.id),
          speciesName: data.speciesName,
          voteCount: Math.max(0, Math.floor(Number(data.voteCount) || 0))
        };
      }),
      rewardXp: contestRewardXp,
      status: contest.status || "insufficient_candidates",
      viewerVoteCandidateId: voteSnapshot.exists ? String(voteSnapshot.data()?.candidateId || "") : undefined,
      weekId: currentWeek.weekId
    },
    lastWinner: winner ? {
      displayName: winner.displayName,
      photoUrl: winner.photoUrl,
      speciesName: winner.speciesName,
      voteCount: Math.max(0, Math.floor(Number(winner.voteCount) || 0)),
      viewerWon: winner.uid === uid,
      rewardBugId: winner.rewardBugId,
      rewardIsNew: winner.rewardIsNew === true,
      rewardPresentationPending: winner.uid === uid && Boolean(winner.rewardBugId) && !rewardPresentationSnapshot.exists,
      rewardRarity: winner.rewardRarity || contestRewardRarity,
      rewardXp: Number(previous.winnerRewardXp) || contestRewardXp,
      weekId: previousWeek.weekId
    } : undefined,
    ok: true
  };
}

function sendWeeklyScanContestError(res, error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) logger.error("Weekly scan contest request failed", safeError(error));
  res.status(status).json({ error: status >= 500 ? "De weekstemming is tijdelijk niet beschikbaar." : String(error?.message || "De weekstemming is mislukt.") });
}

function encryptionKey() {
  return createHash("sha256").update(String(process.env.FITNESSSYNCER_TOKEN_KEY || "")).digest();
}

function setCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ error: "Origin not allowed." });
    return false;
  }
  if (origin) res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Vary", "Origin");
  if (req.method === "OPTIONS") res.status(204).send("");
  return true;
}

function requirePost(req) {
  if (req.method !== "POST") throw httpError(405, "Method not allowed.");
}

function requireGet(req) {
  if (req.method !== "GET") throw httpError(405, "Method not allowed.");
}

function arrayItems(value) {
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
}

function unwrap(value) {
  return value && typeof value === "object" && value.item && typeof value.item === "object" ? value.item : value;
}

function startOfIsoWeek(value) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function sendError(res, error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) logger.error("FitnessSyncer request failed", safeError(error));
  res.status(status).json({ error: status >= 500 && status !== 503 ? "FitnessSyncer is temporarily unavailable." : String(error?.message || "Request failed.") });
}

function safeError(error) {
  return { message: String(error?.message || error), status: Number(error?.status) || 500 };
}
