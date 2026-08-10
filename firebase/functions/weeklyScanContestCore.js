const { createHash } = require("node:crypto");

const contestRewardXp = 150;
const contestRewardRarity = "Legendarisch";
const contestRewardBugIds = Object.freeze([
  "schorpioen",
  "reuzen-duizendpoot",
  "neushoornkever",
  "atlaskever",
  "herculeskever",
  "goliathkever",
  "vliegend-hert",
  "orchidee-bidsprinkhaan",
  "smaragdlibel",
  "atlasvlinder",
  "dobsonvlieg",
  "regenboogmestkever"
]);

function amsterdamWeekMonday(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Amsterdam",
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  localDate.setUTCDate(localDate.getUTCDate() - ((localDate.getUTCDay() + 6) % 7));
  return localDate;
}

function weeklyScanContestWeek(date = new Date(), offsetWeeks = 0) {
  const monday = amsterdamWeekMonday(date);
  monday.setUTCDate(monday.getUTCDate() + (offsetWeeks * 7));
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return {
    weekId: monday.toISOString().slice(0, 10),
    sourceWeekId: new Date(monday.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
    startsAt: monday.toISOString(),
    endsAt: nextMonday.toISOString()
  };
}

function cleanCandidate(value) {
  if (!value || typeof value !== "object") return undefined;
  const uid = String(value.uid || "").trim();
  const scanId = String(value.scanId || "").trim();
  const photoUrl = String(value.photoUrl || "").trim();
  if (!uid || !scanId || !photoUrl) return undefined;
  return {
    ...value,
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
    photoContestScore: Math.max(0, Math.min(100, Math.round(Number(value.photoContestScore) || 0))),
    scanId,
    submittedAt: String(value.submittedAt || ""),
    uid
  };
}

function seededNomineeOrder(seed, candidate) {
  return createHash("sha256")
    .update(`${seed}:${candidate.uid}:${candidate.scanId}`)
    .digest("hex");
}

function selectWeeklyScanNominees(candidates, limit = 3, seed = "") {
  const sorted = (Array.isArray(candidates) ? candidates : [])
    .map(cleanCandidate)
    .filter(Boolean)
    .sort((left, right) => (
      right.photoContestScore - left.photoContestScore
      || right.confidence - left.confidence
      || left.submittedAt.localeCompare(right.submittedAt)
      || left.scanId.localeCompare(right.scanId)
    ));
  const uniqueCandidates = [];
  const selectedUsers = new Set();
  for (const candidate of sorted) {
    if (selectedUsers.has(candidate.uid)) continue;
    uniqueCandidates.push(candidate);
    selectedUsers.add(candidate.uid);
  }
  if (!seed) return uniqueCandidates.slice(0, limit);
  const qualityPool = uniqueCandidates.slice(0, Math.max(limit, 12));
  return qualityPool
    .sort((left, right) => seededNomineeOrder(seed, left).localeCompare(seededNomineeOrder(seed, right)))
    .slice(0, limit);
}

function weeklyScanContestWinner(nominees) {
  const ranked = (Array.isArray(nominees) ? nominees : [])
    .map(cleanCandidate)
    .filter(Boolean)
    .map((candidate) => ({ ...candidate, voteCount: Math.max(0, Math.floor(Number(candidate.voteCount) || 0)) }))
    .sort((left, right) => (
      right.voteCount - left.voteCount
      || right.photoContestScore - left.photoContestScore
      || left.scanId.localeCompare(right.scanId)
    ));
  return ranked[0]?.voteCount > 0 ? ranked[0] : undefined;
}

function weeklyScanContestRewardBugId(uid, weekId) {
  const key = `${String(uid || "").trim()}:${String(weekId || "").trim()}`;
  const index = createHash("sha256").update(key).digest().readUInt32BE(0) % contestRewardBugIds.length;
  return contestRewardBugIds[index];
}

module.exports = {
  contestRewardBugIds,
  contestRewardRarity,
  contestRewardXp,
  selectWeeklyScanNominees,
  weeklyScanContestRewardBugId,
  weeklyScanContestWeek,
  weeklyScanContestWinner
};
