import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { ArcadeMode, BugSmashDuel, User } from "../types";
import type { BugDexDropResult, BugDexDropSource } from "./bugDexService";
import { dailyMissionClaimPayload } from "./dailyMissionClaimModel";
import { localDayId, type SoloCampaignBossProgress } from "./missionProgressService";
import { advanceMomentum } from "./momentumModel";
import { badgesForUser, titleForPoints } from "./pointsService";
import { syncResearchProgress } from "./researchTargetService";
import { starterBoostedXp } from "./starterBoostService";

export type DailyMission = {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: string;
  rewardSource: BugDexDropSource;
  rewardXp: number;
};

type DailyMissionTemplate = {
  id: string;
  title: string;
  target: number;
  reward: string;
  rewardSource: BugDexDropSource;
  rewardXp: number;
  progressFor: (user: User, context: DailyMissionContext, day: string) => number;
};

type DailyMissionContext = {
  bossProgress: SoloCampaignBossProgress;
  duels: BugSmashDuel[];
  realBugScanProgress: number;
};

const demoDailyClaims = new Set<string>();
const dailyMissionXp = 10;
const dailyBonusXp = 15;
const allArcadeModes: ArcadeMode[] = ["tap_duel", "web_runner", "nest_defense", "bug_glide", "butterfly_catch", "bug_tower", "bubble_swarm"];

const dailyMissionTemplates: DailyMissionTemplate[] = [
  {
    id: "duel-play",
    title: "mission.dailyDuel",
    target: 1,
    reward: "mission.rewardXp10",
    rewardSource: "daily_mission_bonus",
    rewardXp: dailyMissionXp,
    progressFor: (user, { duels }, day) => duels.filter((duel) => isUserDuel(duel, user) && isThisDay(duel.scores?.[user.uid]?.submittedAt ?? "", day)).length
  },
  {
    id: "real-bug-scan",
    title: "mission.dailyRealBugScan",
    target: 1,
    reward: "mission.rewardXp10",
    rewardSource: "daily_mission_bonus",
    rewardXp: dailyMissionXp,
    progressFor: (_user, { realBugScanProgress }) => realBugScanProgress
  },
  {
    id: "play-all-game-types",
    title: "mission.dailyPlayAllGameTypes",
    target: 4,
    reward: "mission.rewardXp20",
    rewardSource: "daily_mission_bonus",
    rewardXp: 20,
    progressFor: (user, { duels }, day) => new Set(duels
      .filter((duel) => isUserDuel(duel, user) && isThisDay(duel.scores?.[user.uid]?.submittedAt ?? "", day))
      .map((duel) => duel.arcadeMode ?? "tap_duel")
      .filter((mode): mode is ArcadeMode => allArcadeModes.includes(mode as ArcadeMode))
    ).size
  },
  {
    id: "duel-play-5",
    title: "mission.dailyFiveDuels",
    target: 5,
    reward: "mission.rewardXp25",
    rewardSource: "daily_mission_bonus",
    rewardXp: 25,
    progressFor: (user, { duels }, day) => duels.filter((duel) => isUserDuel(duel, user) && isThisDay(duel.scores?.[user.uid]?.submittedAt ?? "", day)).length
  },
  {
    id: "walk-1k",
    title: "mission.dailyWalk1",
    target: 3,
    reward: "mission.rewardXp10",
    rewardSource: "daily_mission_bonus",
    rewardXp: dailyMissionXp,
    progressFor: (user, _context, day) => user.movementRegisteredDay === day ? Math.floor(((user.movementRegisteredDayKm ?? 0) + 0.0001) * 10) / 10 : 0
  },
  {
    id: "solo-boss",
    title: "mission.dailySoloBoss",
    target: 1,
    reward: "mission.rewardXp10",
    rewardSource: "daily_mission_bonus",
    rewardXp: dailyMissionXp,
    progressFor: (_user, { bossProgress }) => bossProgress.dayCount
  }
];

export function dailyMissionSet(user: User, options: {
  bossProgress: SoloCampaignBossProgress;
  duels?: BugSmashDuel[];
  now?: Date;
  realBugScanProgress?: number;
}): DailyMission[] {
  const day = localDayId(options.now);
  const context: DailyMissionContext = {
    bossProgress: options.bossProgress,
    duels: options.duels ?? [],
    realBugScanProgress: Math.max(0, Math.min(1, Math.floor(options.realBugScanProgress ?? 0)))
  };
  return dailyMissionTemplates.map((template) => ({
    id: `daily-v1-${template.id}-${day}`,
    progress: Math.min(template.target, template.progressFor(user, context, day)),
    reward: template.reward,
    rewardSource: template.rewardSource,
    rewardXp: template.rewardXp,
    target: template.target,
    title: template.title
  }));
}

export async function claimedDailyMissionIds(user: User, missionIds: string[]): Promise<Set<string>> {
  if (!missionIds.length) return new Set();
  if (!isFirebaseConfigured) return new Set(missionIds.filter((id) => demoDailyClaims.has(`${user.uid}:${id}`)));
  const snapshots = await Promise.all(missionIds.map((id) => getDoc(doc(db, "users", user.uid, "dailyMissionClaims", id))));
  return new Set(snapshots.map((snapshot, index) => snapshot.exists() ? missionIds[index] : "").filter(Boolean));
}

export function dailyMissionSetComplete(missions: DailyMission[]): boolean {
  return missions.length > 0 && missions.every((mission) => mission.progress >= mission.target);
}

export function dailyMissionBonusId(now = new Date()): string {
  return `daily-bonus-${localDayId(now)}`;
}

export async function isDailyMissionBonusClaimed(user: User): Promise<boolean> {
  const bonusId = dailyMissionBonusId();
  if (!isFirebaseConfigured) return demoDailyClaims.has(`${user.uid}:${bonusId}`);
  return (await getDoc(doc(db, "users", user.uid, "dailyMissionClaims", bonusId))).exists();
}

export async function claimDailyMissionReward(user: User, mission: DailyMission): Promise<{ drop: BugDexDropResult; user: User } | null> {
  if (mission.progress < mission.target) return null;
  return claimDailyPoints(user, mission.id, mission.rewardXp, mission.rewardSource, {
    localDay: localDayId(),
    missionTitle: mission.title,
    rewardType: "xp"
  });
}

export async function claimDailyMissionBonusWithReward(user: User, missions: DailyMission[]): Promise<{ drop: BugDexDropResult; user: User } | null> {
  if (!dailyMissionSetComplete(missions)) return null;
  const claimId = dailyMissionBonusId();
  const result = await claimDailyPoints(user, claimId, dailyBonusXp, "daily_mission_bonus", {
    localDay: localDayId(),
    missionIds: missions.filter((mission) => mission.progress >= mission.target).map((mission) => mission.id),
    rewardType: "xp_bonus"
  }, true);
  if (result) {
    await syncResearchProgress(result.user, "daily_route", { claimId }).catch(() => undefined);
    if (result.user.momentumSegments === 5 && result.user.momentumLastActiveDay === localDayId()) {
      await syncResearchProgress(result.user, "momentum_cycle", { cycle: result.user.momentumCycle ?? 0 }).catch(() => undefined);
    }
  }
  return result;
}

async function claimDailyPoints(
  user: User,
  claimId: string,
  basePoints: number,
  source: BugDexDropSource,
  claimData: Record<string, unknown>,
  updateMomentum = false
): Promise<{ drop: BugDexDropResult; user: User } | null> {
  const claimKey = `${user.uid}:${claimId}`;
  const awardedPoints = starterBoostedXp(user, Math.max(0, Math.floor(basePoints)));
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    if (demoDailyClaims.has(claimKey)) return null;
    demoDailyClaims.add(claimKey);
    const updated = updateMomentum ? userWithMomentum(userWithPoints(user, awardedPoints), localDayId()) : userWithPoints(user, awardedPoints);
    return { drop: pointDrop(source, awardedPoints, updated), user: updated };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "dailyMissionClaims", claimId);
  return runTransaction(db, async (transaction) => {
    const [userSnapshot, claimSnapshot] = await Promise.all([transaction.get(userRef), transaction.get(claimRef)]);
    if (!userSnapshot.exists() || claimSnapshot.exists()) return null;
    const current = userSnapshot.data() as User;
    const actualPoints = starterBoostedXp(current, Math.max(0, Math.floor(basePoints)));
    const updated = updateMomentum ? userWithMomentum(userWithPoints(current, actualPoints), localDayId()) : userWithPoints(current, actualPoints);
    transaction.update(userRef, {
      badges: updated.badges,
      ...(updateMomentum ? {
        momentumCycle: updated.momentumCycle ?? 0,
        momentumLastActiveDay: updated.momentumLastActiveDay ?? localDayId(),
        momentumSegments: updated.momentumSegments ?? 0
      } : {}),
      title: updated.title,
      totalPoints: updated.totalPoints
    });
    transaction.set(claimRef, dailyMissionClaimPayload({
      claimData,
      claimId,
      claimedAt: now,
      rewardSource: source,
      rewardXp: actualPoints
    }));
    return { drop: pointDrop(source, actualPoints, updated), user: updated };
  });
}

function userWithMomentum(user: User, day: string): User {
  const next = advanceMomentum({
    cycle: user.momentumCycle ?? 0,
    lastActiveDay: user.momentumLastActiveDay,
    segments: user.momentumSegments ?? 0
  }, day);
  return {
    ...user,
    momentumCycle: next.cycle,
    momentumLastActiveDay: next.lastActiveDay,
    momentumSegments: next.segments
  };
}

function userWithPoints(user: User, points: number): User {
  const totalPoints = Math.max(0, user.totalPoints + points);
  const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
  updated.badges = badgesForUser(updated);
  return updated;
}

function pointDrop(source: BugDexDropSource, points: number, updatedUser: User): BugDexDropResult {
  return { isNew: false, points, rewardType: "points", source, updatedUser };
}

function isUserDuel(duel: BugSmashDuel, user: User): boolean {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

function isThisDay(value: string, day: string): boolean {
  return Boolean(value && localDayId(new Date(value)) === day);
}
