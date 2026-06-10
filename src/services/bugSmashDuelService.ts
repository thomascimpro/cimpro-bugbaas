import { collection, doc, getDocs, onSnapshot, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugSmashDuel, User } from "../types";
import { badgesForUser, bugDexEntries, titleForPoints } from "./pointsService";
import { duelLossXp, duelWinXp } from "./rewardBalanceService";

const demoDuels = new Map<string, BugSmashDuel>();

export const bugSmashDuelDurationMs = 30000;
export const bugSmashDuelStartDelayMs = 5000;
export const bugSmashDuelBugCount = 36;

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function pickBugIds(seed: number): string[] {
  const random = seededRandom(seed);
  const ids = bugDexEntries.map((entry) => entry.id);
  return ids
    .map((id) => ({ id, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, bugSmashDuelBugCount)
    .map((item) => item.id);
}

function duelRef(duelId: string) {
  return doc(db, "bugSmashDuels", duelId);
}

function isParticipant(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

export async function createBugSmashDuel(fromUser: User, toUser: User): Promise<BugSmashDuel> {
  if (fromUser.uid === toUser.uid) throw new Error("Je kunt jezelf niet uitdagen.");
  const id = isFirebaseConfigured ? doc(collection(db, "bugSmashDuels")).id : makeId();
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const duel: BugSmashDuel = {
    id,
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    toUserId: toUser.uid,
    toUserName: toUser.displayName,
    status: "pending",
    seed,
    bugIds: pickBugIds(seed),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    durationMs: bugSmashDuelDurationMs,
    scores: {},
    rewardClaimedBy: [],
    resultSeenBy: []
  };

  if (!isFirebaseConfigured) {
    demoDuels.set(id, duel);
    return duel;
  }

  await setDoc(duelRef(id), duel);
  return duel;
}

export async function listBugSmashDuels(user: User): Promise<BugSmashDuel[]> {
  if (!isFirebaseConfigured) {
    return Array.from(demoDuels.values())
      .filter((duel) => isParticipant(duel, user))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const sent = await getDocs(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", user.uid)));
  const received = await getDocs(query(collection(db, "bugSmashDuels"), where("toUserId", "==", user.uid)));
  const byId = new Map<string, BugSmashDuel>();
  sent.docs.forEach((item) => byId.set(item.id, item.data() as BugSmashDuel));
  received.docs.forEach((item) => byId.set(item.id, item.data() as BugSmashDuel));
  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function subscribeBugSmashDuel(duelId: string, onDuel: (duel: BugSmashDuel | null) => void): () => void {
  if (!duelId) return () => undefined;
  if (!isFirebaseConfigured) {
    onDuel(demoDuels.get(duelId) ?? null);
    return () => undefined;
  }
  return onSnapshot(duelRef(duelId), (snapshot) => {
    onDuel(snapshot.exists() ? snapshot.data() as BugSmashDuel : null);
  });
}

export async function respondBugSmashDuel(user: User, duelId: string, accepted: boolean): Promise<BugSmashDuel> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.toUserId !== user.uid || duel.status !== "pending") throw new Error("Duel niet beschikbaar.");
    const updated: BugSmashDuel = {
      ...duel,
      status: accepted ? "accepted" : "declined",
      startAt: accepted ? new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString() : duel.startAt,
      updatedAt: nowIso()
    };
    demoDuels.set(duelId, updated);
    return updated;
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Duel niet gevonden.");
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.toUserId !== user.uid || duel.status !== "pending") throw new Error("Duel niet beschikbaar.");
    const updated: BugSmashDuel = {
      ...duel,
      status: accepted ? "accepted" : "declined",
      startAt: accepted ? new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString() : duel.startAt,
      updatedAt: nowIso()
    };
    transaction.update(ref, {
      status: updated.status,
      updatedAt: updated.updatedAt,
      ...(updated.startAt ? { startAt: updated.startAt } : {})
    });
    return updated;
  });
}

export async function cancelBugSmashDuel(user: User, duelId: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.fromUserId !== user.uid || duel.status !== "pending") return false;
    demoDuels.set(duelId, { ...duel, status: "cancelled", updatedAt: nowIso() });
    return true;
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return false;
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.fromUserId !== user.uid || duel.status !== "pending") return false;
    transaction.update(ref, { status: "cancelled", updatedAt: nowIso() });
    return true;
  });
}

export async function submitBugSmashDuelScore(user: User, duelId: string, score: number, caughtBugIds: string[], bonusScore: number): Promise<BugSmashDuel> {
  const submit = (duel: BugSmashDuel): BugSmashDuel => {
    if (!isParticipant(duel, user)) throw new Error("Je doet niet mee aan dit duel.");
    if (duel.status !== "accepted" && duel.status !== "completed") throw new Error("Duel is niet actief.");
    const scores = {
      ...(duel.scores ?? {}),
      [user.uid]: {
        score,
        caughtBugIds,
        bonusScore,
        submittedAt: nowIso()
      }
    };
    const fromScore = scores[duel.fromUserId];
    const toScore = scores[duel.toUserId];
    const completed = Boolean(fromScore && toScore);
    const winnerId = completed
      ? fromScore.score === toScore.score
        ? undefined
        : fromScore.score > toScore.score
          ? duel.fromUserId
          : duel.toUserId
      : duel.winnerId;
    return {
      ...duel,
      scores,
      status: completed ? "completed" : duel.status,
      winnerId: winnerId ?? "",
      updatedAt: nowIso()
    };
  };

  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel) throw new Error("Duel niet gevonden.");
    const updated = submit(duel);
    demoDuels.set(duelId, updated);
    return updated;
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Duel niet gevonden.");
    const updated = submit(snapshot.data() as BugSmashDuel);
    transaction.update(ref, updated);
    return updated;
  });
}

export async function claimBugSmashDuelReward(user: User, duelId: string): Promise<{ result: "loss" | "win"; user: User } | null> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.status !== "completed" || !isParticipant(duel, user) || !duel.winnerId || (duel.rewardClaimedBy ?? []).includes(user.uid)) return null;
    const result = duel.winnerId === user.uid ? "win" : "loss";
    const totalPoints = Math.max(0, user.totalPoints + (result === "win" ? duelWinXp : duelLossXp));
    const updatedUser = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    demoDuels.set(duelId, {
      ...duel,
      rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    return { result, user: updatedUser };
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const userRef = doc(db, "users", user.uid);
    const snapshot = await transaction.get(ref);
    const userSnapshot = await transaction.get(userRef);
    if (!snapshot.exists() || !userSnapshot.exists()) return null;
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.status !== "completed" || !isParticipant(duel, user) || !duel.winnerId || (duel.rewardClaimedBy ?? []).includes(user.uid)) return null;
    const result = duel.winnerId === user.uid ? "win" : "loss";
    const currentUser = userSnapshot.data() as User;
    const totalPoints = Math.max(0, currentUser.totalPoints + (result === "win" ? duelWinXp : duelLossXp));
    const updatedUser = { ...currentUser, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    transaction.update(ref, {
      rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    transaction.update(userRef, {
      badges: updatedUser.badges,
      title: updatedUser.title,
      totalPoints: updatedUser.totalPoints
    });
    return { result, user: updatedUser };
  });
}

export async function acknowledgeBugSmashDuelResult(user: User, duelId: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.status !== "completed" || !isParticipant(duel, user)) return false;
    if ((duel.resultSeenBy ?? []).includes(user.uid)) return true;
    demoDuels.set(duelId, {
      ...duel,
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    return true;
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return false;
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.status !== "completed" || !isParticipant(duel, user)) return false;
    if ((duel.resultSeenBy ?? []).includes(user.uid)) return true;
    transaction.update(ref, {
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    return true;
  });
}
