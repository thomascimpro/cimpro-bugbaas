import React, { useCallback, useEffect, useRef } from "react";
import type { BugDexDropResult } from "../services/bugDexService";
import { isPermanentMissionClaimError } from "../services/dailyMissionClaimModel";
import { listBugSmashDuels } from "../services/bugSmashDuelService";
import {
  claimedDailyMissionIds,
  claimDailyMissionBonusWithReward,
  claimDailyMissionReward,
  dailyMissionSet,
  dailyMissionSetComplete,
  isDailyMissionBonusClaimed
} from "../services/dailyMissionService";
import { loadSoloCampaignBossProgress } from "../services/missionProgressService";
import { getDailyRealBugScanProgress } from "../services/realBugScanProgress";
import type { User } from "../types";

type Props = {
  enabled: boolean;
  onRewardDrop: (drop: BugDexDropResult) => void;
  onUserUpdated: (user: User) => void;
  user: User;
};

const refreshMs = 8000;

export function DailyMissionCompletionController({ enabled, onRewardDrop, onUserUpdated, user }: Props) {
  const checkingRef = useRef(false);
  const blockedClaimIdsRef = useRef(new Set<string>());
  const userRef = useRef(user);
  const onRewardDropRef = useRef(onRewardDrop);
  const onUserUpdatedRef = useRef(onUserUpdated);
  userRef.current = user;
  onRewardDropRef.current = onRewardDrop;
  onUserUpdatedRef.current = onUserUpdated;

  const checkDailyMissions = useCallback(async () => {
    if (!enabled || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const currentUser = userRef.current;
      const [duels, bossProgress, realBugScanProgress] = await Promise.all([
        listBugSmashDuels(currentUser).catch(() => []),
        loadSoloCampaignBossProgress(currentUser.uid),
        getDailyRealBugScanProgress(currentUser)
      ]);
      const missions = dailyMissionSet(currentUser, { bossProgress, duels, realBugScanProgress });
      const claimedIds = await claimedDailyMissionIds(currentUser, missions.map((mission) => mission.id));
      const readyMission = missions.find((mission) =>
        mission.progress >= mission.target
        && !claimedIds.has(mission.id)
        && !blockedClaimIdsRef.current.has(mission.id)
      );

      if (readyMission) {
        try {
          const result = await claimDailyMissionReward(currentUser, readyMission);
          if (result) {
            onUserUpdatedRef.current(result.user);
            onRewardDropRef.current(result.drop);
          }
        } catch (error) {
          if (isPermanentMissionClaimError(error)) blockedClaimIdsRef.current.add(readyMission.id);
          throw error;
        }
        return;
      }

      if (!dailyMissionSetComplete(missions) || await isDailyMissionBonusClaimed(currentUser)) return;
      const bonus = await claimDailyMissionBonusWithReward(currentUser, missions);
      if (bonus) {
        onUserUpdatedRef.current(bonus.user);
        onRewardDropRef.current(bonus.drop);
      }
    } catch {
      // Mission feedback must never block the active screen.
    } finally {
      checkingRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    blockedClaimIdsRef.current.clear();
  }, [user.uid]);

  useEffect(() => {
    void checkDailyMissions();
    const timer = setInterval(() => void checkDailyMissions(), refreshMs);
    return () => clearInterval(timer);
  }, [checkDailyMissions, user.movementRegisteredDayKm, user.totalPoints, user.uid]);

  return null;
}
