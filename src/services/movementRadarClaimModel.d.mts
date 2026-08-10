export type MovementRadarClaimBatch<TBugId extends string = string> = {
  awarded: number;
  bugIds: TBugId[];
  estimatedKm: number;
  estimatedWeekKm?: number;
  reason?: string;
};

export const movementRadarRewardToken: "__movement_reward__";

export function movementRadarPendingCount(claimableRewards: number, queuedRewards: number): number;

export function resolveMovementRadarRewardIds<TBugId extends string>(rewardIds: Array<TBugId | typeof movementRadarRewardToken>, pickBugId: () => TBugId): TBugId[];

export function claimEveryMovementRadarReward<TBugId extends string>(dependencies: {
  claimFresh: () => Promise<MovementRadarClaimBatch<TBugId>>;
  claimQueued: () => Promise<TBugId[]>;
}): Promise<MovementRadarClaimBatch<TBugId>>;
