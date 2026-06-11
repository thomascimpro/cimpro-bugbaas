import { collection, doc, getDocs, onSnapshot, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugSmashDuel, BugSmashDuelScore, User } from "../types";
import { badgesForUser, bugDexEntries, titleForPoints } from "./pointsService";
import { duelLossXp, duelWinXp } from "./rewardBalanceService";
import { starterBoostedXp } from "./starterBoostService";

const demoDuels = new Map<string, BugSmashDuel>();
const demoDuelRewardEvents = new Set<string>();

export const bugSmashDuelDurationMs = 30000;
export const bugSmashDuelStartDelayMs = 5000;
export const bugSmashDuelBugCount = 56;

const scoreByRarity = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 4,
  Legendarisch: 6,
  Mythisch: 9
};

function nowIso() {
  return new Date().toISOString();
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function duelDailyRewardEventId(opponentId: string, day = localDayId()) {
  return `duel-daily-${day}-${encodeURIComponent(opponentId)}`;
}

function duelOpponentId(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
}

function isParticipant(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

function isActiveDuelBetween(duel: BugSmashDuel, firstUserId: string, secondUserId: string) {
  const samePair = (duel.fromUserId === firstUserId && duel.toUserId === secondUserId)
    || (duel.fromUserId === secondUserId && duel.toUserId === firstUserId);
  return samePair && (duel.status === "pending" || duel.status === "accepted");
}

export async function createBugSmashDuel(fromUser: User, toUser: User): Promise<BugSmashDuel> {
  if (fromUser.uid === toUser.uid) throw new Error("Je kunt jezelf niet uitdagen.");
  if (!isFirebaseConfigured) {
    const existing = Array.from(demoDuels.values()).find((duel) => isActiveDuelBetween(duel, fromUser.uid, toUser.uid));
    if (existing) throw new Error("Er loopt al een actief duel tussen deze spelers.");
  } else {
    const [sent, received] = await Promise.all([
      getDocs(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", fromUser.uid), where("toUserId", "==", toUser.uid))),
      getDocs(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", toUser.uid), where("toUserId", "==", fromUser.uid)))
    ]);
    const existing = [...sent.docs, ...received.docs].find((item) => isActiveDuelBetween(item.data() as BugSmashDuel, fromUser.uid, toUser.uid));
    if (existing) throw new Error("Er loopt al een actief duel tussen deze spelers.");
  }
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

export function countBugSmashDuelActionsForUser(duels: BugSmashDuel[], userId: string): number {
  return duels.filter((duel) => isBugSmashDuelActionForUser(duel, userId)).length;
}

export function isBugSmashDuelActionForUser(duel: BugSmashDuel, userId: string): boolean {
  if (duel.fromUserId !== userId && duel.toUserId !== userId) return false;
  const opponentId = duel.fromUserId === userId ? duel.toUserId : duel.fromUserId;
  const ownScore = duel.scores?.[userId];
  const opponentScore = duel.scores?.[opponentId];

  if (duel.status === "pending") {
    if (duel.toUserId === userId) return true;
    return duel.fromUserId === userId && !opponentScore;
  }
  if (duel.status === "accepted") {
    return !ownScore || !opponentScore;
  }
  if (duel.status === "completed") {
    return !(duel.resultSeenBy ?? []).includes(userId) && !(duel.rewardClaimedBy ?? []).includes(userId);
  }
  return false;
}

export function subscribeBugSmashDuelActionCount(user: User, onCount: (count: number) => void): () => void {
  if (!isFirebaseConfigured) {
    onCount(countBugSmashDuelActionsForUser(Array.from(demoDuels.values()), user.uid));
    return () => undefined;
  }

  const sentDuels = new Map<string, BugSmashDuel>();
  const receivedDuels = new Map<string, BugSmashDuel>();
  const publish = () => {
    const duelsById = new Map<string, BugSmashDuel>([...sentDuels, ...receivedDuels]);
    onCount(countBugSmashDuelActionsForUser(Array.from(duelsById.values()), user.uid));
  };
  const syncSnapshot = (target: Map<string, BugSmashDuel>, snapshot: Awaited<ReturnType<typeof getDocs>>) => {
    target.clear();
    snapshot.docs.forEach((item) => target.set(item.id, item.data() as BugSmashDuel));
    publish();
  };

  const unsubscribeSent = onSnapshot(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", user.uid)), (snapshot) => syncSnapshot(sentDuels, snapshot));
  const unsubscribeReceived = onSnapshot(query(collection(db, "bugSmashDuels"), where("toUserId", "==", user.uid)), (snapshot) => syncSnapshot(receivedDuels, snapshot));
  return () => {
    unsubscribeSent();
    unsubscribeReceived();
  };
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
    const requesterCanPreplay = duel.status === "pending" && duel.fromUserId === user.uid;
    if (!requesterCanPreplay && duel.status !== "accepted" && duel.status !== "completed") throw new Error("Duel is niet actief.");
    const candidateScore = normalizeSubmittedScore({
      score,
      caughtBugIds: [...caughtBugIds],
      bonusScore,
      submittedAt: nowIso()
    });
    const ownScore = preferredSubmittedScore(duel.scores?.[user.uid], candidateScore);
    const scores = {
      ...(duel.scores ?? {}),
      [user.uid]: ownScore
    };
    const fromScore = scores[duel.fromUserId];
    const toScore = scores[duel.toUserId];
    const completed = Boolean(fromScore && toScore);
    const winnerId = completed
      ? scoreValue(fromScore) === scoreValue(toScore)
        ? undefined
        : scoreValue(fromScore) > scoreValue(toScore)
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

function minimumScoreForCaughtBugIds(caughtBugIds: string[], bonusScore: number): number {
  const entryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));
  const baseScore = caughtBugIds.reduce((total, bugId, index) => {
    const entry = entryById.get(bugId);
    const catchScore = entry ? scoreByRarity[entry.rarity] : 0;
    return total + catchScore + ((index + 1) % 5 === 0 ? 1 : 0);
  }, 0);
  return Math.max(0, baseScore + Math.max(0, bonusScore));
}

function scoreValue(score: BugSmashDuelScore): number {
  return Math.max(0, score.score, minimumScoreForCaughtBugIds(score.caughtBugIds, score.bonusScore));
}

function normalizeSubmittedScore(score: BugSmashDuelScore): BugSmashDuelScore {
  return {
    ...score,
    caughtBugIds: [...score.caughtBugIds],
    bonusScore: Math.max(0, score.bonusScore),
    score: scoreValue(score)
  };
}

function preferredSubmittedScore(existing: BugSmashDuelScore | undefined, candidate: BugSmashDuelScore): BugSmashDuelScore {
  if (!existing) return candidate;
  const normalizedExisting = normalizeSubmittedScore(existing);
  const existingValue = scoreValue(normalizedExisting);
  const candidateValue = scoreValue(candidate);
  if (candidateValue > existingValue) return candidate;
  if (candidateValue === existingValue && candidate.caughtBugIds.length > normalizedExisting.caughtBugIds.length) return candidate;
  return normalizedExisting;
}

export async function claimBugSmashDuelReward(user: User, duelId: string): Promise<{ result: "loss" | "win"; rewardGranted: boolean; user: User } | null> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.status !== "completed" || !isParticipant(duel, user) || !duel.winnerId || (duel.rewardClaimedBy ?? []).includes(user.uid)) return null;
    const result = duel.winnerId === user.uid ? "win" : "loss";
    const eventKey = `${user.uid}:${duelDailyRewardEventId(duelOpponentId(duel, user))}`;
    const rewardGranted = !demoDuelRewardEvents.has(eventKey);
    if (rewardGranted) demoDuelRewardEvents.add(eventKey);
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, rewardGranted ? result === "win" ? duelWinXp : duelLossXp : 0));
    const updatedUser = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    demoDuels.set(duelId, {
      ...duel,
      rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    return { result, rewardGranted, user: updatedUser };
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
    const eventRef = doc(db, "users", user.uid, "duelRewardEvents", duelDailyRewardEventId(duelOpponentId(duel, user)));
    const eventSnapshot = await transaction.get(eventRef);
    const rewardGranted = !eventSnapshot.exists();
    const currentUser = userSnapshot.data() as User;
    const totalPoints = Math.max(0, currentUser.totalPoints + starterBoostedXp(currentUser, rewardGranted ? result === "win" ? duelWinXp : duelLossXp : 0));
    const updatedUser = { ...currentUser, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    transaction.update(ref, {
      rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    if (rewardGranted) {
      transaction.set(eventRef, {
        createdAt: nowIso(),
        day: localDayId(),
        duelId,
        opponentId: duelOpponentId(duel, user),
        result
      });
      transaction.update(userRef, {
        badges: updatedUser.badges,
        title: updatedUser.title,
        totalPoints: updatedUser.totalPoints
      });
    }
    return { result, rewardGranted, user: updatedUser };
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
