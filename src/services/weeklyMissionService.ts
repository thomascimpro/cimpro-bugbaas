import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { BugDexInventoryItem, BugReport, BugSmashDuel, User } from "../types";
import { clearBugDexInventoryCache, grantBugDexReward, pickBugDexRewardEntry, type BugDexDropResult, type BugDexDropSource } from "./bugDexService";
import type { SoloCampaignBossProgress } from "./missionProgressService";
import { badgesForUser, titleForPoints } from "./pointsService";
import { weeklyMissionBonusXp } from "./rewardBalanceService";
import { soloCampaignMaxWave } from "./soloCampaignBalance";
import { starterBoostedXp } from "./starterBoostService";

export type WeeklyMission = {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: string;
  rewardSource?: BugDexDropSource;
  rewardType: "bug" | "xp";
  rewardXp: number;
};

type MissionTemplate = {
  id: string;
  title: string;
  target: number;
  reward: string;
  rewardSource?: BugDexDropSource;
  rewardType: "bug" | "xp";
  rewardXp: number;
  progressFor: (user: User, context: WeeklyMissionContext, weekStart: Date) => number;
};

type WeeklyMissionContext = {
  bugs: BugReport[];
  duels: BugSmashDuel[];
  inventory: BugDexInventoryItem[];
  bossProgress: SoloCampaignBossProgress;
  soloCampaignWave: number;
};

const demoWeeklyClaims = new Set<string>();

const weeklyMissionTemplates: MissionTemplate[] = [
  {
    id: "walk-60k",
    title: "mission.walk60Week",
    target: 60,
    reward: "mission.rewardXp30",
    rewardSource: "weekly_mission",
    rewardType: "xp",
    rewardXp: 30,
    progressFor: (user, _context, weekStart) => weeklyWalkingKm(user, weekStart)
  },
  {
    id: "duel-player",
    title: "mission.duelPlayFive",
    target: 50,
    reward: "mission.rewardXp25",
    rewardSource: "weekly_mission",
    rewardType: "xp",
    rewardXp: 25,
    progressFor: (user, { duels }, weekStart) => duels.filter((duel) => isUserDuel(duel, user) && isThisWeek(duel.scores?.[user.uid]?.submittedAt ?? "", weekStart)).length
  },
  {
    id: "solo-finale",
    title: "mission.soloCampaignFinale",
    target: soloCampaignMaxWave,
    reward: "mission.rewardEpicBugXp70",
    rewardSource: "weekly_mission_epic",
    rewardType: "bug",
    rewardXp: 70,
    progressFor: (_user, { soloCampaignWave }) => soloCampaignWave
  }
];

export function weeklyMissionSet(user: User, bugs: BugReport[], options: {
  bossProgress?: SoloCampaignBossProgress;
  duels?: BugSmashDuel[];
  inventory?: BugDexInventoryItem[];
  now?: Date;
  soloCampaignWave?: number;
} = {}): WeeklyMission[] {
  const now = options.now ?? new Date();
  const weekStart = startOfIsoWeek(now);
  const seed = weekNumber(now);
  const context: WeeklyMissionContext = {
    bossProgress: options.bossProgress ?? { dayCount: 0, dayId: "", updatedAt: "", weekCount: 0, weekId: "" },
    bugs,
    duels: options.duels ?? [],
    inventory: options.inventory ?? [],
    soloCampaignWave: options.soloCampaignWave ?? 1
  };
  return weeklyMissionTemplates.map((template) => ({
    id: `weekly-v3-${template.id}-${seed}`,
    progress: Math.min(template.target, template.progressFor(user, context, weekStart)),
    reward: template.reward,
    rewardSource: template.rewardSource,
    rewardType: template.rewardType,
    rewardXp: template.rewardXp,
    target: template.target,
    title: template.title
  }));
}

export function weeklyMissionLabel(now = new Date()): string {
  return `Week ${weekNumber(now)}`;
}

export async function claimedWeeklyMissionIds(user: User, missionIds: string[]): Promise<Set<string>> {
  if (!missionIds.length) return new Set();
  if (!isFirebaseConfigured) return new Set(missionIds.filter((id) => demoWeeklyClaims.has(`${user.uid}:${id}`)));
  const snapshots = await Promise.all(missionIds.map((id) => getDoc(doc(db, "users", user.uid, "weeklyMissionClaims", id))));
  return new Set(snapshots.map((snapshot, index) => snapshot.exists() ? missionIds[index] : "").filter(Boolean));
}

export function weeklyMissionSetComplete(missions: WeeklyMission[]): boolean {
  return missions.length > 0 && missions.every((mission) => mission.progress >= mission.target);
}

export function weeklyMissionBonusId(missions: WeeklyMission[]): string {
  const weekId = missions[0]?.id.split("-").pop() ?? weekNumber(new Date()).toString();
  return `weekly-bonus-${weekId}`;
}

export async function isWeeklyMissionBonusClaimed(user: User, missions: WeeklyMission[]): Promise<boolean> {
  const bonusId = weeklyMissionBonusId(missions);
  if (!isFirebaseConfigured) return demoWeeklyClaims.has(`${user.uid}:${bonusId}`);
  return (await getDoc(doc(db, "users", user.uid, "weeklyMissionClaims", bonusId))).exists();
}

export async function claimWeeklyMissionBonus(user: User, missions: WeeklyMission[]): Promise<User | null> {
  if (!weeklyMissionSetComplete(missions)) return null;
  const bonusId = weeklyMissionBonusId(missions);
  const claimKey = `${user.uid}:${bonusId}`;
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    if (demoWeeklyClaims.has(claimKey)) return null;
    demoWeeklyClaims.add(claimKey);
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, weeklyMissionBonusXp));
    const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    return updated;
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "weeklyMissionClaims", bonusId);
  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const claimSnapshot = await transaction.get(claimRef);
    if (!userSnapshot.exists() || claimSnapshot.exists()) return null;
    const current = userSnapshot.data() as User;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, weeklyMissionBonusXp));
    const updated = { ...current, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    transaction.set(claimRef, {
      id: bonusId,
      missionIds: missions.map((mission) => mission.id),
      rewardType: "bugdex",
      rewardXp: weeklyMissionBonusXp,
      claimedAt: now
    });
    transaction.update(userRef, {
      badges: updated.badges,
      title: updated.title,
      totalPoints: updated.totalPoints
    });
    return updated;
  });
}

export async function claimWeeklyMissionBonusWithReward(user: User, missions: WeeklyMission[]): Promise<{ drop: BugDexDropResult; user: User } | null> {
  if (!weeklyMissionSetComplete(missions)) return null;
  const bonusId = weeklyMissionBonusId(missions);
  const claimKey = `${user.uid}:${bonusId}`;
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    if (demoWeeklyClaims.has(claimKey)) return null;
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, weeklyMissionBonusXp));
    const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    const drop = await grantBugDexReward(updated, "weekly_mission_epic");
    demoWeeklyClaims.add(claimKey);
    return { drop, user: updated };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "weeklyMissionClaims", bonusId);
  const rewardEntry = pickBugDexRewardEntry(user, "weekly_mission_epic");
  const rewardRef = doc(db, "users", user.uid, "bugdex", rewardEntry.id);

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const claimSnapshot = await transaction.get(claimRef);
    const rewardSnapshot = await transaction.get(rewardRef);
    if (!userSnapshot.exists()) return null;

    const existingClaim = claimSnapshot.exists() ? claimSnapshot.data() : null;
    if (existingClaim?.rewardBugId) return null;

    const current = userSnapshot.data() as User;
    const shouldAwardXp = !existingClaim;
    const totalPoints = shouldAwardXp ? Math.max(0, current.totalPoints + starterBoostedXp(current, weeklyMissionBonusXp)) : current.totalPoints;
    const updated = { ...current, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);

    const existingReward = rewardSnapshot.exists() ? rewardSnapshot.data() as BugDexInventoryItem : null;
    const item: BugDexInventoryItem = existingReward
      ? {
          ...existingReward,
          count: existingReward.count + 1,
          lastUnlockedAt: now,
          sources: Array.from(new Set([...existingReward.sources, "weekly_mission_epic"]))
        }
      : {
          bugId: rewardEntry.id,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: rewardEntry.rarity,
          sources: ["weekly_mission_epic"]
        };

    transaction.set(claimRef, {
      id: bonusId,
      missionIds: missions.map((mission) => mission.id),
      rewardBugId: rewardEntry.id,
      rewardGrantedAt: now,
      rewardRarity: rewardEntry.rarity,
      rewardType: "bugdex",
      rewardXp: existingClaim?.rewardXp ?? weeklyMissionBonusXp,
      claimedAt: existingClaim?.claimedAt ?? now
    }, { merge: true });
    transaction.set(rewardRef, item);
    if (shouldAwardXp) {
      transaction.update(userRef, {
        badges: updated.badges,
        title: updated.title,
        totalPoints: updated.totalPoints
      });
    }

    return {
      drop: { rewardType: "bug", entry: rewardEntry, item, isNew: !existingReward, source: "weekly_mission_epic" },
      user: updated
    };
  });
}

export async function claimWeeklyMissionReward(user: User, mission: WeeklyMission): Promise<{ drop?: BugDexDropResult; user: User } | null> {
  if (mission.progress < mission.target) return null;
  const claimKey = `${user.uid}:${mission.id}`;
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    if (demoWeeklyClaims.has(claimKey)) return null;
    demoWeeklyClaims.add(claimKey);
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, mission.rewardXp));
    const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    const drop = mission.rewardSource ? await grantBugDexReward(updated, mission.rewardSource) : undefined;
    return { drop, user: updated };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "weeklyMissionClaims", mission.id);
  const rewardEntry = mission.rewardSource ? pickBugDexRewardEntry(user, mission.rewardSource) : null;
  const rewardRef = rewardEntry ? doc(db, "users", user.uid, "bugdex", rewardEntry.id) : null;
  const result = await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const claimSnapshot = await transaction.get(claimRef);
    const rewardSnapshot = rewardRef ? await transaction.get(rewardRef) : null;
    if (!userSnapshot.exists() || claimSnapshot.exists()) return null;
    const current = userSnapshot.data() as User;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, mission.rewardXp));
    const updated = { ...current, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);

    let drop: BugDexDropResult | undefined;
    if (rewardEntry && rewardRef && mission.rewardSource) {
      const existingReward = rewardSnapshot?.exists() ? rewardSnapshot.data() as BugDexInventoryItem : null;
      const item: BugDexInventoryItem = existingReward
        ? {
            ...existingReward,
            count: existingReward.count + 1,
            lastUnlockedAt: now,
            sources: Array.from(new Set([...existingReward.sources, mission.rewardSource]))
          }
        : {
            bugId: rewardEntry.id,
            count: 1,
            firstUnlockedAt: now,
            lastUnlockedAt: now,
            rarity: rewardEntry.rarity,
            sources: [mission.rewardSource]
          };
      transaction.set(rewardRef, item);
      drop = { rewardType: "bug", entry: rewardEntry, item, isNew: !existingReward, source: mission.rewardSource };
    }

    const claimData: Record<string, string | number> = {
      id: mission.id,
      missionTitle: mission.title,
      rewardType: drop ? "bugdex_plus_xp" : mission.rewardType,
      rewardXp: mission.rewardXp,
      claimedAt: now,
    };
    if (rewardEntry && mission.rewardSource) {
      claimData.rewardBugId = rewardEntry.id;
      claimData.rewardGrantedAt = now;
      claimData.rewardRarity = rewardEntry.rarity;
      claimData.rewardSource = mission.rewardSource;
    }
    transaction.set(claimRef, claimData);
    transaction.update(userRef, {
      badges: updated.badges,
      title: updated.title,
      totalPoints: updated.totalPoints
    });
    return { drop, user: updated };
  });
  if (result?.drop) clearBugDexInventoryCache(user.uid);
  return result;
}

export async function claimWeeklyMissionXp(user: User, mission: WeeklyMission): Promise<User | null> {
  const result = await claimWeeklyMissionReward(user, mission);
  return result?.user ?? null;
}

function startOfIsoWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function weekNumber(date: Date): number {
  const next = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  return Math.ceil((((next.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function weeklyWalkingKm(user: User, weekStart: Date): number {
  if (!user.movementRegisteredDay || !isThisWeek(user.movementRegisteredDay, weekStart)) return 0;
  return Math.max(0, user.movementRegisteredDayKm ?? 0);
}

function isUserDuel(duel: BugSmashDuel, user: User): boolean {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

function isThisWeek(value: string, weekStart: Date): boolean {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return date >= weekStart && date < end;
}
