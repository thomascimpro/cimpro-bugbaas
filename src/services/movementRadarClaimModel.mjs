export const movementRadarRewardToken = "__movement_reward__";

export function movementRadarPendingCount(claimableRewards, queuedRewards) {
  const freshCount = Number.isFinite(claimableRewards) ? Math.max(0, Math.floor(claimableRewards)) : 0;
  const queuedCount = Number.isFinite(queuedRewards) ? Math.max(0, Math.floor(queuedRewards)) : 0;
  return freshCount + queuedCount;
}

export function resolveMovementRadarRewardIds(rewardIds, pickBugId) {
  return rewardIds.map((rewardId) => rewardId === movementRadarRewardToken ? pickBugId() : rewardId);
}

export async function claimEveryMovementRadarReward({ claimFresh, claimQueued }) {
  let queuedBugIds = [];
  try {
    queuedBugIds = await claimQueued();
  } catch {
    queuedBugIds = [];
  }

  let freshClaim;
  try {
    freshClaim = await claimFresh();
  } catch {
    freshClaim = {
      awarded: 0,
      bugIds: [],
      estimatedKm: 0,
      reason: "claim_error"
    };
  }

  const bugIds = [...queuedBugIds, ...freshClaim.bugIds];
  return {
    ...freshClaim,
    awarded: bugIds.length,
    bugIds
  };
}
