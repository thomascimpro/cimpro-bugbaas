import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, BugReport, BugSmashDuel, User } from "../types";
import { BugDexDropResult, BugDexDropSource, pickBugDexRewardEntry, grantBugDexReward } from "./bugDexService";
import { badgesForUser, titleForPoints } from "./pointsService";
import { weeklyMissionBonusXp } from "./rewardBalanceService";

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
};

const demoWeeklyClaims = new Set<string>();

const bugMissionPool: MissionTemplate[] = [
  {
    id: "fresh-finds",
    title: "mission.reportFive",
    target: 5,
    reward: "mission.rewardXp25",
    rewardType: "xp",
    rewardXp: 25,
    progressFor: (user, { bugs }, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart)).length
  },
  {
    id: "screenshot-proof",
    title: "mission.screenshotThree",
    target: 3,
    reward: "mission.rewardCommonBug",
    rewardSource: "weekly_mission_common",
    rewardType: "bug",
    rewardXp: 0,
    progressFor: (user, { bugs }, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart) && !!bug.screenshotDataUrl).length
  },
  {
    id: "team-votes",
    title: "mission.upvotesFive",
    target: 5,
    reward: "mission.rewardXp20",
    rewardType: "xp",
    rewardXp: 20,
    progressFor: (user, { bugs }, weekStart) => bugs
      .filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.updatedAt, weekStart))
      .reduce((total, bug) => total + (bug.upvoteCount ?? 0), 0)
  },
  {
    id: "fix-hunter",
    title: "mission.fixedTwo",
    target: 2,
    reward: "mission.rewardRareBug",
    rewardSource: "weekly_mission_rare",
    rewardType: "bug",
    rewardXp: 0,
    progressFor: (user, { bugs }, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && bug.status === "Gefixt" && isThisWeek(bug.updatedAt, weekStart)).length
  },
  {
    id: "critical-eye",
    title: "mission.highTwo",
    target: 2,
    reward: "mission.rewardXp25",
    rewardType: "xp",
    rewardXp: 25,
    progressFor: (user, { bugs }, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart) && (bug.severity === "Hoog" || bug.severity === "Kritiek")).length
  }
];

const featureMissionPool: MissionTemplate[] = [
  {
    id: "duel-player",
    title: "mission.duelPlayThree",
    target: 3,
    reward: "mission.rewardXp20",
    rewardType: "xp",
    rewardXp: 20,
    progressFor: (user, { duels }, weekStart) => duels.filter((duel) => isUserDuel(duel, user) && isThisWeek(duel.scores?.[user.uid]?.submittedAt ?? "", weekStart)).length
  },
  {
    id: "duel-winner",
    title: "mission.duelWinTwo",
    target: 2,
    reward: "mission.rewardRareBug",
    rewardSource: "weekly_mission_rare",
    rewardType: "bug",
    rewardXp: 0,
    progressFor: (user, { duels }, weekStart) => duels.filter((duel) => duel.winnerId === user.uid && isThisWeek(duel.updatedAt, weekStart)).length
  },
  {
    id: "bugdex-week",
    title: "mission.bugdexWeekFive",
    target: 5,
    reward: "mission.rewardRareBug",
    rewardSource: "weekly_mission_rare",
    rewardType: "bug",
    rewardXp: 0,
    progressFor: (_user, { inventory }, weekStart) => inventory.filter((item) => isThisWeek(item.lastUnlockedAt, weekStart)).length
  },
  {
    id: "squad-ready",
    title: "mission.squadReady",
    target: 3,
    reward: "mission.rewardCommonBug",
    rewardSource: "weekly_mission_common",
    rewardType: "bug",
    rewardXp: 0,
    progressFor: (user) => new Set(user.activeBugSquad ?? []).size
  }
];

const movementMission: MissionTemplate = {
  id: "walk-week",
  title: "mission.walkWeek",
  target: 5,
  reward: "mission.rewardXp20",
  rewardType: "xp",
  rewardXp: 20,
  progressFor: (user, _context, weekStart) => user.movementRegisteredWeek === isoWeekId(weekStart) ? Math.floor(user.movementRegisteredWeekKm ?? 0) : 0
};

export function weeklyMissionSet(user: User, bugs: BugReport[], options: { duels?: BugSmashDuel[]; inventory?: BugDexInventoryItem[]; now?: Date } = {}): WeeklyMission[] {
  const now = options.now ?? new Date();
  const weekStart = startOfIsoWeek(now);
  const seed = weekNumber(now);
  const context: WeeklyMissionContext = {
    bugs,
    duels: options.duels ?? [],
    inventory: options.inventory ?? []
  };
  const templates = [
    bugMissionPool[seed % bugMissionPool.length],
    featureMissionPool[seed % featureMissionPool.length],
    movementMission,
    bugMissionPool[(seed + 2) % bugMissionPool.length]
  ];
  return templates.map((template) => {
    const progress = Math.min(template.target, template.progressFor(user, context, weekStart));
    return {
      id: `weekly-v2-${template.id}-${seed}`,
      title: template.title,
      target: template.target,
      progress,
      reward: template.reward,
      rewardSource: template.rewardSource,
      rewardType: template.rewardType,
      rewardXp: template.rewardXp
    };
  });
}

export function weeklyMissionLabel(now = new Date()): string {
  return `Week ${weekNumber(now)}`;
}

export async function claimedWeeklyMissionIds(user: User, missionIds: string[]): Promise<Set<string>> {
  if (!missionIds.length) return new Set();
  if (!isFirebaseConfigured) {
    return new Set(missionIds.filter((id) => demoWeeklyClaims.has(`${user.uid}:${id}`)));
  }
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
    const totalPoints = Math.max(0, user.totalPoints + weeklyMissionBonusXp);
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
    const totalPoints = Math.max(0, current.totalPoints + weeklyMissionBonusXp);
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
    const totalPoints = Math.max(0, user.totalPoints + weeklyMissionBonusXp);
    const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    const drop = await grantBugDexReward(updated, "weekly_mission");
    demoWeeklyClaims.add(claimKey);
    return { drop, user: updated };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "weeklyMissionClaims", bonusId);
  const rewardEntry = pickBugDexRewardEntry(user, "weekly_mission");
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
    const totalPoints = shouldAwardXp ? Math.max(0, current.totalPoints + weeklyMissionBonusXp) : current.totalPoints;
    const updated = { ...current, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);

    const existingReward = rewardSnapshot.exists() ? rewardSnapshot.data() as BugDexInventoryItem : null;
    const item: BugDexInventoryItem = existingReward
      ? {
          ...existingReward,
          count: existingReward.count + 1,
          lastUnlockedAt: now,
          sources: Array.from(new Set([...existingReward.sources, "weekly_mission"]))
        }
      : {
          bugId: rewardEntry.id,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: rewardEntry.rarity,
          sources: ["weekly_mission"]
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
      drop: { rewardType: "bug", entry: rewardEntry, item, isNew: !existingReward, source: "weekly_mission" },
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
    if (mission.rewardType === "bug" && mission.rewardSource) {
      const drop = await grantBugDexReward(user, mission.rewardSource);
      return { drop, user };
    }
    const totalPoints = Math.max(0, user.totalPoints + mission.rewardXp);
    const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
    return { user: updated };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "weeklyMissionClaims", mission.id);
  const rewardEntry = mission.rewardType === "bug" && mission.rewardSource ? pickBugDexRewardEntry(user, mission.rewardSource) : null;
  const rewardRef = rewardEntry ? doc(db, "users", user.uid, "bugdex", rewardEntry.id) : null;
  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const claimSnapshot = await transaction.get(claimRef);
    const rewardSnapshot = rewardRef ? await transaction.get(rewardRef) : null;
    if (!userSnapshot.exists() || claimSnapshot.exists()) return null;
    const current = userSnapshot.data() as User;
    const totalPoints = Math.max(0, current.totalPoints + (mission.rewardType === "xp" ? mission.rewardXp : 0));
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
      rewardType: mission.rewardType,
      rewardXp: mission.rewardType === "xp" ? mission.rewardXp : 0,
      claimedAt: now
    };
    if (rewardEntry && mission.rewardSource) {
      claimData.rewardBugId = rewardEntry.id;
      claimData.rewardGrantedAt = now;
      claimData.rewardRarity = rewardEntry.rarity;
      claimData.rewardSource = mission.rewardSource;
    }
    transaction.set(claimRef, claimData);
    if (mission.rewardType === "xp") {
      transaction.update(userRef, {
        badges: updated.badges,
        title: updated.title,
        totalPoints: updated.totalPoints
      });
    }
    return { drop, user: updated };
  });
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

function isoWeekId(date = new Date()): string {
  const next = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((next.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${next.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function isBugReport(bug: BugReport): boolean {
  return (bug.reportType ?? "bug") === "bug";
}

function isUserDuel(duel: BugSmashDuel, user: User): boolean {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

function isThisWeek(value: string, weekStart: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}
