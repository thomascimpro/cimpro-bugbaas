const swarmSiege = Object.freeze({
  gameMode: "nest_defense",
  maxAttemptsPerEvent: 3,
  maxAttemptsPerDay: 3,
  maxRunDurationMs: 8 * 60 * 1000,
  maxScore: 25000,
  minRunDurationMs: 20 * 1000,
  rewardXp: 75,
  targetDamage: 120,
  targetScaling: Object.freeze({ base: 3, hpPerActivePlayer: 6, maximum: 360, minimum: 9 }),
  timezone: "Europe/Amsterdam"
});

const swarmSiegeRewardPool = Object.freeze([
  Object.freeze({ bugId: "reuzen-duizendpoot", rarity: "Legendarisch" }),
  Object.freeze({ bugId: "reuzenwaterwants", rarity: "Legendarisch" }),
  Object.freeze({ bugId: "zweepschorpioen", rarity: "Legendarisch" })
]);

const phases = Object.freeze([
  { from: 0, id: "signal_hunt", modifier: "fast_swarm" },
  { from: 0.25, id: "armor_break", modifier: "armored_brood" },
  { from: 0.6, id: "nest_surge", modifier: "double_wave" },
  { from: 0.9, id: "unstable_core", modifier: "unstable_core" }
]);

function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("value must be a valid date");
  return date;
}

function amsterdamParts(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: swarmSiege.timezone,
    weekday: "short",
    year: "numeric"
  }).formatToParts(validDate(value));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function amsterdamLocalDate(value) {
  const parts = amsterdamParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function amsterdamLocalToUtc(year, month, day, hour, minute = 0, second = 0) {
  let timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = amsterdamParts(new Date(timestamp));
    const displayedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    timestamp -= displayedAsUtc - Date.UTC(year, month - 1, day, hour, minute, second);
  }
  return new Date(timestamp);
}

function localDatePartsFromDate(value) {
  const parts = amsterdamParts(value);
  return { day: Number(parts.day), month: Number(parts.month), weekday: parts.weekday, year: Number(parts.year) };
}

function addLocalDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

function saturdayForLocalDate(value, direction = "current-or-next") {
  const local = localDatePartsFromDate(value);
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[local.weekday];
  let delta = (6 - weekdayIndex + 7) % 7;
  if (direction === "next" && delta === 0) delta = 7;
  if (direction === "previous") delta = delta === 0 ? 0 : delta - 7;
  return addLocalDays(local, delta);
}

function eventFromSaturday(parts) {
  const localDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  const friday = addLocalDays(parts, -1);
  const sunday = addLocalDays(parts, 1);
  return {
    end: amsterdamLocalToUtc(parts.year, parts.month, parts.day, 18),
    id: `swarm-siege-${localDate}`,
    previewStart: amsterdamLocalToUtc(friday.year, friday.month, friday.day, 12),
    resultEnd: amsterdamLocalToUtc(sunday.year, sunday.month, sunday.day, 18),
    start: amsterdamLocalToUtc(parts.year, parts.month, parts.day, 12)
  };
}

function swarmSiegeSchedule(value = new Date()) {
  const now = validDate(value);
  const candidate = eventFromSaturday(saturdayForLocalDate(now));
  if (now >= candidate.previewStart && now < candidate.start) return { active: false, event: candidate, next: candidate, state: "preview" };
  if (now >= candidate.start && now < candidate.end) return { active: true, event: candidate, state: "live" };
  if (now >= candidate.end && now < candidate.resultEnd) return { active: false, event: candidate, next: eventFromSaturday(saturdayForLocalDate(now, "next")), previous: candidate, state: "result" };

  const next = now < candidate.previewStart ? candidate : eventFromSaturday(saturdayForLocalDate(now, "next"));
  const previousParts = addLocalDays({ year: next.start.getUTCFullYear(), month: next.start.getUTCMonth() + 1, day: next.start.getUTCDate() }, -7);
  return { active: false, next, previous: eventFromSaturday(previousParts), state: "upcoming" };
}

function swarmSiegeDayId(value = new Date()) {
  return amsterdamLocalDate(value);
}

function swarmSiegeAvailableCharges(value, event) {
  const now = validDate(value);
  if (!event || now < event.start || now >= event.end) return 0;
  const elapsedMs = now.getTime() - event.start.getTime();
  if (elapsedMs >= 4 * 60 * 60 * 1000) return 3;
  if (elapsedMs >= 2 * 60 * 60 * 1000) return 2;
  return 1;
}

function swarmSiegeDamageForScore(score) {
  if (!Number.isInteger(score) || score < 0 || score > swarmSiege.maxScore) throw new TypeError("score is invalid");
  if (score >= 1000) return 3;
  if (score >= 600) return 2;
  if (score >= 150) return 1;
  return 0;
}

function swarmSiegeRunCanResume({ activeRunId, activeRunExpiresAtMs, nowMs = Date.now(), submittedAt }) {
  return Boolean(String(activeRunId || "").trim() && Number(activeRunExpiresAtMs) > Number(nowMs) && !submittedAt);
}

function swarmSiegeRunExpiresAt(value, eventEndValue) {
  const now = validDate(value);
  const eventEnd = validDate(eventEndValue);
  if (eventEnd.getTime() - now.getTime() < swarmSiege.minRunDurationMs) throw new TypeError("not enough event time remains");
  return new Date(Math.min(now.getTime() + swarmSiege.maxRunDurationMs, eventEnd.getTime()));
}

function swarmSiegeTargetForActivePlayers(activePlayerCount) {
  const activePlayers = Math.max(1, Math.floor(Number(activePlayerCount) || 0));
  const scaling = swarmSiege.targetScaling;
  return Math.max(scaling.minimum, Math.min(scaling.maximum, scaling.base + activePlayers * scaling.hpPerActivePlayer));
}

function swarmSiegeProgress(totalDamage, target = swarmSiege.targetDamage) {
  const safeTarget = Math.max(1, Math.floor(target || swarmSiege.targetDamage));
  const safe = Number.isFinite(totalDamage) ? Math.max(0, Math.floor(totalDamage)) : 0;
  const progress = Math.min(safe, safeTarget);
  return { complete: progress >= safeTarget, progress, remaining: safeTarget - progress, target: safeTarget };
}

function swarmSiegePhase(totalDamage, target = swarmSiege.targetDamage) {
  const progress = swarmSiegeProgress(totalDamage, target);
  const ratio = progress.target ? progress.progress / progress.target : 0;
  return [...phases].reverse().find((phase) => ratio >= phase.from) || phases[0];
}

function swarmSiegeRewardTier(totalDamage, target = swarmSiege.targetDamage) {
  const progress = swarmSiegeProgress(totalDamage, target);
  const percent = Math.floor((progress.progress / progress.target) * 100);
  if (percent >= 100) return { id: "complete", progressPercent: 100, rewardXp: 75 };
  if (percent >= 75) return { id: "gold", progressPercent: percent, rewardXp: 50 };
  if (percent >= 50) return { id: "silver", progressPercent: percent, rewardXp: 35 };
  if (percent >= 25) return { id: "bronze", progressPercent: percent, rewardXp: 20 };
  return { id: "participation", progressPercent: Math.max(1, percent), rewardXp: 10 };
}

function stableRewardIndex(value, length) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

function swarmSiegeRewardForClaim({ eventId, inventoryByBugId = {}, now, rewardTierId, uid }) {
  if (rewardTierId !== "complete") return null;
  const missing = swarmSiegeRewardPool.filter(({ bugId }) => Math.max(0, Math.floor(Number(inventoryByBugId[bugId]?.count) || 0)) < 1);
  const candidates = missing.length ? missing : swarmSiegeRewardPool;
  const reward = candidates[stableRewardIndex(`${eventId}:${uid}`, candidates.length)];
  const existing = inventoryByBugId[reward.bugId] || {};
  const previousCount = Math.max(0, Math.floor(Number(existing.count) || 0));
  const timestamp = validDate(now).toISOString();
  return {
    awardedBugId: reward.bugId,
    duplicate: previousCount > 0,
    item: {
      ...existing,
      bugId: reward.bugId,
      count: previousCount + 1,
      firstUnlockedAt: existing.firstUnlockedAt || timestamp,
      lastUnlockedAt: timestamp,
      rarity: existing.rarity || reward.rarity,
      sources: Array.from(new Set([...(Array.isArray(existing.sources) ? existing.sources : []), "swarm_siege"]))
    },
    rarity: reward.rarity
  };
}

function validateSwarmSiegeSubmission({ createdAt, now = new Date(), score }) {
  const started = validDate(createdAt);
  const ended = validDate(now);
  const elapsedMs = ended.getTime() - started.getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs < swarmSiege.minRunDurationMs || elapsedMs > swarmSiege.maxRunDurationMs) throw new TypeError("run duration is invalid");
  return { damage: swarmSiegeDamageForScore(score), elapsedMs, score };
}

module.exports = {
  swarmSiege,
  swarmSiegeAvailableCharges,
  swarmSiegeDamageForScore,
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
};
