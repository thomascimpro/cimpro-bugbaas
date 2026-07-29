const seasonConfig = Object.freeze({
  durationDays: 56,
  finaleDays: 7,
  target: 500
});

const contributionAmounts = Object.freeze({
  verified_discovery: 1,
  research_completion: 3,
  swarm_victory: 5
});

const epoch = Date.UTC(2026, 0, 5, 0, 0, 0);
const dayMs = 24 * 60 * 60 * 1000;

function seasonWindow(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("value must be a valid date");
  const durationMs = seasonConfig.durationDays * dayMs;
  const index = Math.floor((date.getTime() - epoch) / durationMs);
  const startsAt = new Date(epoch + index * durationMs);
  const endsAt = new Date(startsAt.getTime() + durationMs);
  const finaleStartsAt = new Date(endsAt.getTime() - seasonConfig.finaleDays * dayMs);
  const id = `season-${startsAt.toISOString().slice(0, 10)}`;
  return {
    durationDays: seasonConfig.durationDays,
    endsAt,
    finaleStartsAt,
    id,
    startsAt,
    state: date >= finaleStartsAt ? "finale" : "active",
    target: seasonConfig.target
  };
}

function seasonContributionAmount(source) {
  if (!(source in contributionAmounts)) throw new TypeError("invalid season contribution source");
  return contributionAmounts[source];
}

function seasonProgress({ communityPoints, personalPoints, target = seasonConfig.target }) {
  const safeTarget = Math.max(1, Math.floor(target));
  const progress = Math.min(safeTarget, Math.max(0, Math.floor(communityPoints || 0)));
  const personal = Math.max(0, Math.floor(personalPoints || 0));
  return {
    complete: progress >= safeTarget,
    eligible: personal >= 1,
    personalPoints: personal,
    progress,
    target: safeTarget
  };
}

module.exports = {
  seasonConfig,
  seasonContributionAmount,
  seasonProgress,
  seasonWindow
};
