const releaseBoss = Object.freeze({
  id: "release-boss-conservatory-01",
  minimumContribution: 1,
  rewardXp: 40,
  targetVerifiedObservations: 100
});

function releaseBossProgress(globalVerifiedObservations, personalVerifiedObservations) {
  if (!Number.isInteger(globalVerifiedObservations) || globalVerifiedObservations < 0) throw new TypeError("globalVerifiedObservations must be a non-negative integer");
  if (!Number.isInteger(personalVerifiedObservations) || personalVerifiedObservations < 0) throw new TypeError("personalVerifiedObservations must be a non-negative integer");
  const contribution = Math.min(globalVerifiedObservations, releaseBoss.targetVerifiedObservations);
  const complete = contribution >= releaseBoss.targetVerifiedObservations;
  return {
    bossId: releaseBoss.id,
    complete,
    contributed: Math.min(personalVerifiedObservations, releaseBoss.targetVerifiedObservations),
    eligibleForReward: complete && personalVerifiedObservations >= releaseBoss.minimumContribution,
    progress: contribution,
    rewardXp: releaseBoss.rewardXp,
    target: releaseBoss.targetVerifiedObservations
  };
}

function releaseBossShouldAutoAward(status) {
  return Boolean(status && status.state === "finale" && status.complete && status.eligibleForReward && !status.claimed);
}

module.exports = { releaseBoss, releaseBossProgress, releaseBossShouldAutoAward };
