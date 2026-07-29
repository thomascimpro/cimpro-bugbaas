import { doc, getDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "../firebase";
import type { User } from "../types";
import {
  clearBugDexInventoryCache,
  grantBugDexRewardInTransaction,
  type BugDexDropResult
} from "./bugDexService";
import {
  bugBrainDailyRewardTier,
  bugBrainRewardEntryForTier,
  type BugBrainRewardTier
} from "./bugBrainGameModel";
import { badgesForUser, titleForPoints } from "./pointsService";

export type BugBrainStartResult = {
  available: boolean;
  seed: number | null;
  status: "available" | "attempted" | "claimed";
};

export type BugBrainDailyStatus = {
  awardedXp: number;
  correctAnswers: number;
  rewardBugId?: string;
  rewardTier: BugBrainRewardTier | null;
  seed: number | null;
  status: "available" | "active" | "completed";
};

export type BugBrainDailyCompletion = {
  awardedXp: number;
  alreadyCompleted: boolean;
  correctAnswers: number;
  drop?: BugDexDropResult;
  rewardBugId?: string;
  rewardTier: BugBrainRewardTier | null;
  user: User;
};

type DailyAttemptData = {
  completedAt?: string;
  correctAnswers?: number;
  day: string;
  seed: number;
  startedAt: string;
  status: "active" | "completed";
};

type DailyClaimData = {
  awardedXp: number;
  claimedAt: string;
  correctAnswers: number;
  day: string;
  rewardBugId?: string;
  rewardTier?: BugBrainRewardTier;
};

function localDayInAmsterdam(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Amsterdam",
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dailySeed(uid: string, day: string): number {
  const key = `${uid}:${day}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function assertCurrentUser(user: User) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) {
    throw new Error("Log opnieuw in om Bug Brain te spelen.");
  }
}

function refsForDay(userId: string, day: string) {
  return {
    attemptRef: doc(db, "users", userId, "bugBrainDailyAttempts", day),
    claimRef: doc(db, "users", userId, "bugBrainDailyClaims", day),
    userRef: doc(db, "users", userId)
  };
}

export async function loadBugBrainDailyStatus(user: User): Promise<BugBrainDailyStatus> {
  assertCurrentUser(user);
  const day = localDayInAmsterdam();
  const { attemptRef, claimRef } = refsForDay(user.uid, day);
  const [attemptSnapshot, claimSnapshot] = await Promise.all([getDoc(attemptRef), getDoc(claimRef)]);

  if (claimSnapshot.exists()) {
    const claim = claimSnapshot.data() as DailyClaimData;
    return {
      awardedXp: Math.max(0, Number(claim.awardedXp) || 0),
      correctAnswers: Math.max(0, Number(claim.correctAnswers) || 0),
      rewardBugId: claim.rewardBugId,
      rewardTier: claim.rewardTier ?? null,
      seed: attemptSnapshot.exists() ? Number((attemptSnapshot.data() as DailyAttemptData).seed) || null : null,
      status: "completed"
    };
  }

  if (attemptSnapshot.exists()) {
    const attempt = attemptSnapshot.data() as DailyAttemptData;
    return {
      awardedXp: 0,
      correctAnswers: Math.max(0, Number(attempt.correctAnswers) || 0),
      rewardTier: null,
      seed: Number(attempt.seed) || null,
      status: attempt.status === "completed" ? "completed" : "active"
    };
  }

  return { awardedXp: 0, correctAnswers: 0, rewardTier: null, seed: null, status: "available" };
}

export async function startBugBrainDailyRun(user: User): Promise<BugBrainStartResult> {
  assertCurrentUser(user);
  const day = localDayInAmsterdam();
  const { attemptRef, claimRef } = refsForDay(user.uid, day);

  return runTransaction(db, async (transaction) => {
    const claimSnapshot = await transaction.get(claimRef);
    if (claimSnapshot.exists()) return { available: false, seed: null, status: "claimed" };

    const attemptSnapshot = await transaction.get(attemptRef);
    if (attemptSnapshot.exists()) return { available: false, seed: null, status: "attempted" };

    const seed = dailySeed(user.uid, day);
    transaction.set(attemptRef, {
      day,
      seed,
      startedAt: new Date().toISOString(),
      status: "active"
    } satisfies DailyAttemptData);
    return { available: true, seed, status: "available" };
  });
}

export async function completeBugBrainDailyRun(user: User, correctAnswers: number): Promise<BugBrainDailyCompletion> {
  assertCurrentUser(user);
  const day = localDayInAmsterdam();
  const safeCorrectAnswers = Math.max(0, Math.min(10, Math.floor(Number(correctAnswers) || 0)));
  const rewardTier = bugBrainDailyRewardTier(safeCorrectAnswers);
  const { attemptRef, claimRef, userRef } = refsForDay(user.uid, day);

  const result = await runTransaction(db, async (transaction) => {
    const claimSnapshot = await transaction.get(claimRef);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error("Gebruikersprofiel niet gevonden.");
    const currentUser = userSnapshot.data() as User;

    if (claimSnapshot.exists()) {
      const claim = claimSnapshot.data() as DailyClaimData;
      return {
        awardedXp: 0,
        alreadyCompleted: true,
        correctAnswers: Math.max(0, Number(claim.correctAnswers) || 0),
        rewardBugId: claim.rewardBugId,
        rewardTier: claim.rewardTier ?? null,
        user: currentUser
      } satisfies BugBrainDailyCompletion;
    }

    const attemptSnapshot = await transaction.get(attemptRef);
    if (!attemptSnapshot.exists() || (attemptSnapshot.data() as DailyAttemptData).status !== "active") {
      throw new Error("Start eerst de dagelijkse Bug Brain-run.");
    }

    const attempt = attemptSnapshot.data() as DailyAttemptData;
    const now = new Date().toISOString();
    const awardedXp = safeCorrectAnswers;
    const totalPoints = Math.max(0, Math.floor(Number(currentUser.totalPoints) || 0)) + awardedXp;
    const updatedUser: User = {
      ...currentUser,
      totalPoints,
      title: titleForPoints(totalPoints)
    };
    updatedUser.badges = badgesForUser(updatedUser);

    let drop: BugDexDropResult | undefined;
    let rewardBugId: string | undefined;
    if (rewardTier) {
      const entry = bugBrainRewardEntryForTier(rewardTier, attempt.seed);
      rewardBugId = entry.id;
      const granted = await grantBugDexRewardInTransaction(transaction, currentUser, entry.id, "bug_brain_daily", now);
      drop = { ...granted, updatedUser };
    }

    const claim: DailyClaimData = {
      awardedXp,
      claimedAt: now,
      correctAnswers: safeCorrectAnswers,
      day,
      ...(rewardTier && rewardBugId ? { rewardBugId, rewardTier } : {})
    };

    transaction.set(claimRef, claim);
    transaction.update(attemptRef, {
      completedAt: now,
      correctAnswers: safeCorrectAnswers,
      status: "completed"
    });
    if (awardedXp > 0) {
      transaction.update(userRef, {
        badges: updatedUser.badges,
        title: updatedUser.title,
        totalPoints: updatedUser.totalPoints
      });
    }

    return {
      awardedXp,
      alreadyCompleted: false,
      correctAnswers: safeCorrectAnswers,
      drop,
      rewardBugId,
      rewardTier,
      user: updatedUser
    } satisfies BugBrainDailyCompletion;
  });

  if (result.drop?.rewardType === "bug") clearBugDexInventoryCache(user.uid);
  return result;
}
