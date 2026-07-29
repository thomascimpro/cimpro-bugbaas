import { collection, doc, getDocs, limit, onSnapshot, query, runTransaction, setDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { ArcadeMode, BugSmashDuel, BugSmashDuelScore, User } from "../types";
import { createArcadeSeed } from "./arcadeResultService";
import { BugDexDropResult, grantBugDexReward, grantBugDexRewardInTransaction, pickBugDexRewardEntry, repairBugDexRewardInTransaction, writeBugDexUnlockBestEffort } from "./bugDexService";
import { badgesForUser, bugDexEntries, titleForPoints } from "./pointsService";
import { duelLossXp, duelWinXp } from "./rewardBalanceService";
import { starterBoostedXp } from "./starterBoostService";

const demoDuels = new Map<string, BugSmashDuel>();
const demoDuelRewardEvents = new Map<string, { bugId?: string; minimumCount?: number; result: BugSmashDuelClaimResult["result"] }>();

export const bugSmashDuelDurationMs = 30000;
export const butterflyCatchDuelDurationMs = 60000;
export const bugSmashDuelStartDelayMs = 5000;
export const bugSmashDuelBugCount = 56;
const defaultDuelRating = 1000;
const minimumDuelRating = 100;
const duelRatingDecayFloor = 1000;
const duelRatingDecayPerDay = 5;
const duelListLimit = 60;
const openRandomDuelScoreTtlMs = 48 * 60 * 60 * 1000;
const randomOpponentRepeatWindowMs = 15 * 60 * 1000;

type CreateDuelOptions = {
  arcadeMode?: ArcadeMode;
  arcadeVersion?: number;
};

export function bugSmashDuelDurationForMode(mode: ArcadeMode): number {
  return mode === "butterfly_catch" ? butterflyCatchDuelDurationMs : bugSmashDuelDurationMs;
}

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

function localDayNumber(dayId: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayId);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  const date = new Date(value);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(value / 86400000);
}

function localDayIdFromNumber(dayNumber: number): string {
  const date = new Date(dayNumber * 86400000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
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

function buildBugSmashDuel(params: {
  fromUser: User;
  id: string;
  matchType: "direct" | "random";
  options?: CreateDuelOptions;
  seed: number;
  startAt?: string;
  toUser: Pick<User, "displayName" | "uid">;
}): BugSmashDuel {
  const arcadeMode = params.options?.arcadeMode ?? "tap_duel";
  const arcadeVersion = params.options?.arcadeVersion ?? 1;
  return {
    id: params.id,
    arcadeMode,
    ...(arcadeMode !== "tap_duel" ? {
      arcadeSeed: createArcadeSeed(arcadeMode, params.id, arcadeVersion),
      arcadeVersion
    } : {}),
    fromUserId: params.fromUser.uid,
    fromUserName: params.fromUser.displayName,
    matchType: params.matchType,
    toUserId: params.toUser.uid,
    toUserName: params.toUser.displayName,
    status: "pending",
    seed: params.seed,
    bugIds: pickBugIds(params.seed),
    createdAt: nowIso(),
    ...(params.startAt ? { startAt: params.startAt } : {}),
    updatedAt: nowIso(),
    durationMs: bugSmashDuelDurationForMode(arcadeMode),
    scores: {},
    rewardClaimedBy: [],
    resultSeenBy: []
  };
}

function duelRef(duelId: string) {
  return doc(db, "bugSmashDuels", duelId);
}

function userRef(userId: string) {
  return doc(db, "users", userId);
}

export type BugSmashDuelClaimResult = {
  result: "draw" | "loss" | "win";
  rewardGranted: boolean;
  alreadyClaimed: boolean;
  repaired: boolean;
  user: User;
  drop?: BugDexDropResult;
};

export function duelRatingForUser(user: Pick<User, "duelRating">): number {
  const rating = Math.round(user.duelRating ?? defaultDuelRating);
  return Number.isFinite(rating) ? Math.max(minimumDuelRating, rating) : defaultDuelRating;
}

export type DuelRatingDecayResult = {
  decayedBy: number;
  missedDays: number;
  user: User;
};

export function calculateDuelRatingDecay(user: User, now = new Date()): DuelRatingDecayResult {
  const updatedAt = user.duelRatingUpdatedAt ? new Date(user.duelRatingUpdatedAt) : null;
  if (!updatedAt || !Number.isFinite(updatedAt.getTime())) return { decayedBy: 0, missedDays: 0, user };

  const rankedDay = localDayNumber(localDayId(updatedAt));
  const today = localDayNumber(localDayId(now));
  if (rankedDay === null || today === null) return { decayedBy: 0, missedDays: 0, user };

  const processedDay = user.duelRatingDecayThroughDay ? localDayNumber(user.duelRatingDecayThroughDay) : null;
  const baseDay = Math.max(rankedDay, processedDay ?? rankedDay);
  const lastCompleteDay = today - 1;
  const missedDays = Math.max(0, lastCompleteDay - baseDay);
  const currentRating = duelRatingForUser(user);
  if (currentRating <= duelRatingDecayFloor) return { decayedBy: 0, missedDays, user };
  const nextRating = Math.max(duelRatingDecayFloor, currentRating - missedDays * duelRatingDecayPerDay);
  const decayedBy = currentRating - nextRating;
  if (missedDays === 0 || decayedBy === 0) return { decayedBy: 0, missedDays, user };

  return {
    decayedBy,
    missedDays,
    user: {
      ...user,
      duelRating: nextRating,
      duelRatingDecayThroughDay: localDayIdFromNumber(lastCompleteDay)
    }
  };
}

export async function applyDuelRatingDecay(user: User, now = new Date()): Promise<DuelRatingDecayResult> {
  if (!isFirebaseConfigured) return calculateDuelRatingDecay(user, now);

  return runTransaction(db, async (transaction) => {
    const reference = userRef(user.uid);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) return { decayedBy: 0, missedDays: 0, user };

    const currentUser = snapshot.data() as User;
    const result = calculateDuelRatingDecay(currentUser, now);
    if (result.decayedBy > 0) {
      transaction.update(reference, {
        duelRating: result.user.duelRating,
        duelRatingDecayThroughDay: result.user.duelRatingDecayThroughDay
      });
    }
    return result;
  });
}

function duelGamesPlayed(user: Pick<User, "duelWins" | "duelLosses" | "duelDraws">): number {
  return Math.max(0, user.duelWins ?? 0) + Math.max(0, user.duelLosses ?? 0) + Math.max(0, user.duelDraws ?? 0);
}

function duelKFactor(user: Pick<User, "duelRating" | "duelWins" | "duelLosses" | "duelDraws">): number {
  if (duelGamesPlayed(user) < 10) return 40;
  if (duelRatingForUser(user) > 1400) return 24;
  return 32;
}

export function calculateDuelRatingDelta(playerRating: number, opponentRating: number, actualScore: 0 | 0.5 | 1, kFactor = 32): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return Math.round(kFactor * (actualScore - expectedScore));
}

function ratingResultForUser(duel: BugSmashDuel, userId: string): 0 | 0.5 | 1 {
  if (!duel.winnerId) return 0.5;
  return duel.winnerId === userId ? 1 : 0;
}

function ratingStatsForUser(user: User, duel: BugSmashDuel, delta: number) {
  const result = ratingResultForUser(duel, user.uid);
  return {
    duelDraws: (user.duelDraws ?? 0) + (result === 0.5 ? 1 : 0),
    duelLosses: (user.duelLosses ?? 0) + (result === 0 ? 1 : 0),
    duelRating: Math.max(minimumDuelRating, duelRatingForUser(user) + delta),
    duelRatingLastDuelId: duel.id,
    duelRatingUpdatedAt: duel.ratingAppliedAt,
    duelWins: (user.duelWins ?? 0) + (result === 1 ? 1 : 0)
  };
}

function shouldApplyRandomDuelRating(before: BugSmashDuel, after: BugSmashDuel): boolean {
  return after.matchType === "random"
    && after.status === "completed"
    && before.status !== "completed"
    && !before.ratingAppliedAt
    && Boolean(after.scores?.[after.fromUserId])
    && Boolean(after.scores?.[after.toUserId])
    && after.toUserId !== "random";
}

function duelRewardEventId(duelId: string, userId: string) {
  return `duel-${encodeURIComponent(duelId)}-${encodeURIComponent(userId)}`;
}

function duelOpponentId(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
}

function isParticipant(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
}

function duelResultForUser(duel: BugSmashDuel, userId: string): BugSmashDuelClaimResult["result"] {
  const fromScore = duel.scores?.[duel.fromUserId]?.score;
  const toScore = duel.scores?.[duel.toUserId]?.score;
  const completedDraw = typeof fromScore === "number" && typeof toScore === "number" && fromScore === toScore;
  if (completedDraw || !duel.winnerId) return "draw";
  return duel.winnerId === userId ? "win" : "loss";
}

function isActiveDuelBetween(duel: BugSmashDuel, firstUserId: string, secondUserId: string) {
  const samePair = (duel.fromUserId === firstUserId && duel.toUserId === secondUserId)
    || (duel.fromUserId === secondUserId && duel.toUserId === firstUserId);
  return samePair && (duel.status === "pending" || duel.status === "accepted");
}

function duelCreatedToday(duel: BugSmashDuel, day = localDayId()): boolean {
  return localDayId(new Date(duel.createdAt)) === day;
}

function sameDuelPair(duel: BugSmashDuel, firstUserId: string, secondUserId: string): boolean {
  return (duel.fromUserId === firstUserId && duel.toUserId === secondUserId)
    || (duel.fromUserId === secondUserId && duel.toUserId === firstUserId);
}

function duelCompletedAt(duel: BugSmashDuel): string {
  const fromSubmittedAt = duel.scores?.[duel.fromUserId]?.submittedAt ?? "";
  const toSubmittedAt = duel.scores?.[duel.toUserId]?.submittedAt ?? "";
  if (fromSubmittedAt && toSubmittedAt) return fromSubmittedAt > toSubmittedAt ? fromSubmittedAt : toSubmittedAt;
  return duel.updatedAt;
}

function duelRecentActivityAt(duel: BugSmashDuel): string {
  if (duel.status === "completed") return duelCompletedAt(duel);
  return duel.startAt ?? duel.updatedAt ?? duel.createdAt;
}

function recentRandomOpponentIdsForUser(duels: BugSmashDuel[], userId: string, mode: ArcadeMode = "tap_duel", now = Date.now()): Set<string> {
  const cutoff = now - randomOpponentRepeatWindowMs;
  return new Set(duels.flatMap((duel) => {
    if (duel.matchType !== "random" || (duel.fromUserId !== userId && duel.toUserId !== userId)) return [];
    if (duelMode(duel) !== mode) return [];
    const opponentId = duel.fromUserId === userId ? duel.toUserId : duel.fromUserId;
    if (!opponentId || opponentId === "random") return [];
    const activityAt = new Date(duelRecentActivityAt(duel)).getTime();
    return Number.isFinite(activityAt) && activityAt >= cutoff ? [opponentId] : [];
  }));
}

function duelCompletedTodayBetween(duel: BugSmashDuel, firstUserId: string, secondUserId: string, day = localDayId()): boolean {
  return duel.status === "completed"
    && sameDuelPair(duel, firstUserId, secondUserId)
    && localDayId(new Date(duelCompletedAt(duel))) === day;
}

function isExpiredOpenRandomDuelScore(duel: BugSmashDuel, now = Date.now()): boolean {
  if (duel.matchType !== "random" || duel.status !== "pending" || duel.toUserId !== "random") return false;
  const submittedAt = duel.scores?.[duel.fromUserId]?.submittedAt;
  if (!submittedAt) return false;
  const submittedAtMs = new Date(submittedAt).getTime();
  return Number.isFinite(submittedAtMs) && now - submittedAtMs >= openRandomDuelScoreTtlMs;
}

function expireOpenRandomDuelScore(duel: BugSmashDuel, now = nowIso()): BugSmashDuel {
  if (!isExpiredOpenRandomDuelScore(duel, new Date(now).getTime())) return duel;
  return {
    ...duel,
    status: "expired",
    updatedAt: now
  };
}

function scaledDuelXp(baseXp: number): number {
  return Math.round(baseXp);
}

function duelMode(duel: BugSmashDuel): ArcadeMode {
  return duel.arcadeMode ?? "tap_duel";
}

function pickRandomOpponent(fromUser: User, candidates: User[], duels: BugSmashDuel[]): User {
  const recentOpponentIds = recentRandomOpponentIdsForUser(duels, fromUser.uid, "tap_duel");
  const eligible = candidates.filter((candidate) =>
    candidate.uid !== fromUser.uid
    && candidate.active !== false
    && !duels.some((duel) => !isExpiredOpenRandomDuelScore(duel) && isActiveDuelBetween(duel, fromUser.uid, candidate.uid))
  );
  if (!eligible.length) throw new Error("Geen random tegenstander beschikbaar.");
  const preferred = eligible.filter((candidate) => !recentOpponentIds.has(candidate.uid));
  const pool = preferred.length ? preferred : eligible;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function createBugSmashDuel(fromUser: User, toUser: User, matchType: "direct" | "random" = "direct", options: CreateDuelOptions = {}): Promise<BugSmashDuel> {
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
  const duel = buildBugSmashDuel({
    id,
    fromUser,
    matchType,
    options,
    seed,
    toUser
  });

  if (!isFirebaseConfigured) {
    demoDuels.set(id, duel);
    return duel;
  }

  await setDoc(duelRef(id), duel);
  return duel;
}

export async function createRandomBugSmashDuel(fromUser: User, candidates: User[]): Promise<BugSmashDuel> {
  const duels = await listBugSmashDuels(fromUser);
  const opponent = pickRandomOpponent(fromUser, candidates, duels);
  return createBugSmashDuel(fromUser, opponent, "random");
}

export async function createOpenRandomBugSmashDuel(fromUser: User, options: CreateDuelOptions = {}): Promise<BugSmashDuel> {
  const id = isFirebaseConfigured ? doc(collection(db, "bugSmashDuels")).id : makeId();
  const seed = Date.now() + Math.floor(Math.random() * 100000);
  const startAt = new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString();
  const duel = buildBugSmashDuel({
    id,
    fromUser,
    matchType: "random",
    options,
    seed,
    startAt,
    toUser: { displayName: "Random", uid: "random" }
  });

  if (!isFirebaseConfigured) {
    demoDuels.set(id, duel);
    return duel;
  }

  await setDoc(duelRef(id), duel);
  return duel;
}

export async function claimOpenRandomBugSmashDuel(user: User, options: CreateDuelOptions = {}): Promise<BugSmashDuel | null> {
  const ownDuels = await listBugSmashDuels(user);
  const requestedMode = options.arcadeMode ?? "tap_duel";
  const recentOpponentIds = recentRandomOpponentIdsForUser(ownDuels, user.uid, requestedMode);
  const matchesArcadeMode = (duel: BugSmashDuel) => duelMode(duel) === requestedMode;

  if (!isFirebaseConfigured) {
    const now = nowIso();
    Array.from(demoDuels.values()).forEach((duel) => {
      const expired = expireOpenRandomDuelScore(duel, now);
      if (expired !== duel) demoDuels.set(duel.id, expired);
    });
    const openDuels = Array.from(demoDuels.values())
      .filter((duel) =>
        duel.matchType === "random"
        && duel.status === "pending"
        && duel.toUserId === "random"
        && duel.fromUserId !== user.uid
        && Boolean(duel.scores?.[duel.fromUserId])
        && !isExpiredOpenRandomDuelScore(duel)
        && matchesArcadeMode(duel)
        && !ownDuels.some((ownDuel) => !isExpiredOpenRandomDuelScore(ownDuel) && isActiveDuelBetween(ownDuel, user.uid, duel.fromUserId))
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const preferredOpenDuels = openDuels.filter((duel) => !recentOpponentIds.has(duel.fromUserId));
  const openDuel = preferredOpenDuels[0];
    if (!openDuel) return null;
    const updated: BugSmashDuel = {
      ...openDuel,
      startAt: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString(),
      status: "accepted",
      toUserId: user.uid,
      toUserName: user.displayName,
      updatedAt: nowIso()
    };
    demoDuels.set(openDuel.id, updated);
    return updated;
  }

  const openSnapshot = await getDocs(query(
    collection(db, "bugSmashDuels"),
    where("matchType", "==", "random"),
    where("status", "==", "pending"),
    where("toUserId", "==", "random")
  ));
  const candidates = openSnapshot.docs
    .map((item) => item.data() as BugSmashDuel)
    .filter((duel) =>
      duel.fromUserId !== user.uid
      && Boolean(duel.scores?.[duel.fromUserId])
      && !isExpiredOpenRandomDuelScore(duel)
      && matchesArcadeMode(duel)
      && !ownDuels.some((ownDuel) => !isExpiredOpenRandomDuelScore(ownDuel) && isActiveDuelBetween(ownDuel, user.uid, duel.fromUserId))
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const preferredCandidates = candidates.filter((duel) => !recentOpponentIds.has(duel.fromUserId));
  const candidate = preferredCandidates[0];
  if (!candidate) return null;

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(candidate.id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return null;
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.matchType !== "random" || duel.status !== "pending" || duel.toUserId !== "random" || duel.fromUserId === user.uid) return null;
    if (!duel.scores?.[duel.fromUserId]) return null;
    if (isExpiredOpenRandomDuelScore(duel)) {
      const expired = expireOpenRandomDuelScore(duel);
      transaction.update(ref, { status: expired.status, updatedAt: expired.updatedAt });
      return null;
    }
    if (duelMode(duel) !== requestedMode) return null;
    const updated: BugSmashDuel = {
      ...duel,
      ...(requestedMode !== "tap_duel" ? { claimedArcadeMode: requestedMode } : {}),
      startAt: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString(),
      status: "accepted",
      toUserId: user.uid,
      toUserName: user.displayName,
      updatedAt: nowIso()
    };
    transaction.update(ref, {
      ...(requestedMode !== "tap_duel" ? { claimedArcadeMode: requestedMode } : {}),
      startAt: updated.startAt,
      status: updated.status,
      toUserId: updated.toUserId,
      toUserName: updated.toUserName,
      updatedAt: updated.updatedAt
    });
    return updated;
  });
}

export async function listBugSmashDuels(user: User): Promise<BugSmashDuel[]> {
  if (!isFirebaseConfigured) {
    const now = nowIso();
    Array.from(demoDuels.values()).forEach((duel) => {
      const expired = expireOpenRandomDuelScore(duel, now);
      if (expired !== duel) demoDuels.set(duel.id, expired);
    });
    return Array.from(demoDuels.values())
      .filter((duel) => isParticipant(duel, user))
      .map((duel) => expireOpenRandomDuelScore(duel))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const sent = await getDocs(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", user.uid), limit(duelListLimit)));
  const received = await getDocs(query(collection(db, "bugSmashDuels"), where("toUserId", "==", user.uid), limit(duelListLimit)));
  const byId = new Map<string, BugSmashDuel>();
  sent.docs.forEach((item) => byId.set(item.id, item.data() as BugSmashDuel));
  received.docs.forEach((item) => byId.set(item.id, item.data() as BugSmashDuel));
  return Array.from(byId.values()).map((duel) => expireOpenRandomDuelScore(duel)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listOpenRandomBugSmashDuels(user: User): Promise<BugSmashDuel[]> {
  const filterOpen = (duel: BugSmashDuel) =>
    duel.matchType === "random"
    && duel.status === "pending"
    && duel.toUserId === "random"
    && duel.fromUserId === user.uid
    && Boolean(duel.scores?.[duel.fromUserId])
    && !isExpiredOpenRandomDuelScore(duel);

  if (!isFirebaseConfigured) {
    const now = nowIso();
    Array.from(demoDuels.values()).forEach((duel) => {
      const expired = expireOpenRandomDuelScore(duel, now);
      if (expired !== duel) demoDuels.set(duel.id, expired);
    });
    return Array.from(demoDuels.values())
      .map((duel) => expireOpenRandomDuelScore(duel))
      .filter(filterOpen)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const openSnapshot = await getDocs(query(
    collection(db, "bugSmashDuels"),
    where("matchType", "==", "random"),
    where("status", "==", "pending"),
    where("toUserId", "==", "random"),
    limit(duelListLimit)
  ));
  return openSnapshot.docs
    .map((item) => expireOpenRandomDuelScore(item.data() as BugSmashDuel))
    .filter(filterOpen)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function countBugSmashDuelActionsForUser(duels: BugSmashDuel[], userId: string): number {
  return duels.filter((duel) => isBugSmashDuelActionForUser(duel, userId)).length;
}

export function countIncomingBugSmashDuelActionsForUser(duels: BugSmashDuel[], userId: string): number {
  return duels.filter((duel) => isIncomingBugSmashDuelActionForUser(duel, userId)).length;
}

function isIncomingBugSmashDuelActionForUser(duel: BugSmashDuel, userId: string): boolean {
  if (isExpiredOpenRandomDuelScore(duel)) return false;
  if (duel.toUserId !== userId) return false;
  if (duel.status === "pending") return true;
  if (duel.status === "accepted") return !duel.scores?.[userId];
  return false;
}

export function isBugSmashDuelActionForUser(duel: BugSmashDuel, userId: string): boolean {
  if (isExpiredOpenRandomDuelScore(duel)) return false;
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

  const unsubscribeSent = onSnapshot(query(collection(db, "bugSmashDuels"), where("fromUserId", "==", user.uid), limit(duelListLimit)), (snapshot) => syncSnapshot(sentDuels, snapshot));
  const unsubscribeReceived = onSnapshot(query(collection(db, "bugSmashDuels"), where("toUserId", "==", user.uid), limit(duelListLimit)), (snapshot) => syncSnapshot(receivedDuels, snapshot));
  return () => {
    unsubscribeSent();
    unsubscribeReceived();
  };
}

export function subscribeIncomingBugSmashDuelActionCount(user: User, onCount: (count: number) => void): () => void {
  if (!isFirebaseConfigured) {
    onCount(countIncomingBugSmashDuelActionsForUser(Array.from(demoDuels.values()), user.uid));
    return () => undefined;
  }

  return onSnapshot(query(collection(db, "bugSmashDuels"), where("toUserId", "==", user.uid), limit(duelListLimit)), (snapshot) => {
    const duels = snapshot.docs.map((item) => item.data() as BugSmashDuel);
    onCount(countIncomingBugSmashDuelActionsForUser(duels, user.uid));
  });
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
    let updated = submit(duel);
    if (shouldApplyRandomDuelRating(duel, updated)) {
      updated = { ...updated, ratingAppliedAt: nowIso(), ratingDeltas: {} };
    }
    demoDuels.set(duelId, updated);
    return updated;
  }

  return runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Duel niet gevonden.");
    const currentDuel = snapshot.data() as BugSmashDuel;
    if (isExpiredOpenRandomDuelScore(currentDuel)) {
      const expired = expireOpenRandomDuelScore(currentDuel);
      transaction.update(ref, { status: expired.status, updatedAt: expired.updatedAt });
      throw new Error("Duel score is verlopen.");
    }
    let updated = submit(currentDuel);
    if (shouldApplyRandomDuelRating(currentDuel, updated)) {
      const fromRef = userRef(updated.fromUserId);
      const toRef = userRef(updated.toUserId);
      const fromSnapshot = await transaction.get(fromRef);
      const toSnapshot = await transaction.get(toRef);
      if (fromSnapshot.exists() && toSnapshot.exists()) {
        const fromUser = fromSnapshot.data() as User;
        const toUser = toSnapshot.data() as User;
        const fromResult = ratingResultForUser(updated, updated.fromUserId);
        const toResult = ratingResultForUser(updated, updated.toUserId);
        const fromDelta = calculateDuelRatingDelta(duelRatingForUser(fromUser), duelRatingForUser(toUser), fromResult, duelKFactor(fromUser));
        const toDelta = calculateDuelRatingDelta(duelRatingForUser(toUser), duelRatingForUser(fromUser), toResult, duelKFactor(toUser));
        updated = {
          ...updated,
          ratingAppliedAt: nowIso(),
          ratingDeltas: {
            [updated.fromUserId]: fromDelta,
            [updated.toUserId]: toDelta
          }
        };
        transaction.update(fromRef, ratingStatsForUser(fromUser, updated, fromDelta));
        transaction.update(toRef, ratingStatsForUser(toUser, updated, toDelta));
      }
    }
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

export async function claimBugSmashDuelReward(user: User, duelId: string): Promise<BugSmashDuelClaimResult | null> {
  if (!isFirebaseConfigured) {
    const duel = demoDuels.get(duelId);
    if (!duel || duel.status !== "completed" || !isParticipant(duel, user)) return null;
    const result = duelResultForUser(duel, user.uid);
    const eventKey = duelRewardEventId(duelId, user.uid);
    const existingEvent = demoDuelRewardEvents.get(eventKey);
    const alreadyClaimed = (duel.rewardClaimedBy ?? []).includes(user.uid);
    const bugDexRewardEligible = result === "win" || result === "draw";
    const rewardGranted = !existingEvent;
    const baseXp = result === "win" ? duelWinXp : duelLossXp;
    const drop = bugDexRewardEligible && rewardGranted ? await grantBugDexReward(user, "duel_win") : undefined;
    if (bugDexRewardEligible && rewardGranted && drop?.rewardType === "bug") demoDuelRewardEvents.set(eventKey, { bugId: drop.entry.id, minimumCount: drop.item.count, result });
    if (!bugDexRewardEligible && rewardGranted) demoDuelRewardEvents.set(eventKey, { result });
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, rewardGranted ? scaledDuelXp(baseXp) : 0));
    const updatedUser = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    demoDuels.set(duelId, {
      ...duel,
      rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
      resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
      updatedAt: nowIso()
    });
    return { alreadyClaimed, drop, repaired: false, result, rewardGranted, user: updatedUser };
  }

  const claim = await runTransaction(db, async (transaction) => {
    const ref = duelRef(duelId);
    const currentUserRef = userRef(user.uid);
    const snapshot = await transaction.get(ref);
    const userSnapshot = await transaction.get(currentUserRef);
    if (!snapshot.exists() || !userSnapshot.exists()) return null;
    const duel = snapshot.data() as BugSmashDuel;
    if (duel.status !== "completed" || !isParticipant(duel, user)) return null;
    const result = duelResultForUser(duel, user.uid);
    const bugDexRewardEligible = result === "win" || result === "draw";
    const eventRef = doc(db, "users", user.uid, "duelRewardEvents", duelRewardEventId(duelId, user.uid));
    const eventSnapshot = await transaction.get(eventRef);
    const alreadyClaimed = (duel.rewardClaimedBy ?? []).includes(user.uid);
    const existingEvent = eventSnapshot.exists() ? eventSnapshot.data() as { rewardBugId?: string; minimumCount?: number; result?: string } : null;
    const currentUser = userSnapshot.data() as User;
    const baseXp = result === "win" ? duelWinXp : duelLossXp;
    let drop: BugDexDropResult | undefined;
    let repaired = false;
    let rewardGranted = false;
    if (bugDexRewardEligible) {
      if (existingEvent?.rewardBugId) {
        const repair = await repairBugDexRewardInTransaction(transaction, currentUser, existingEvent.rewardBugId, "duel_win", Math.max(1, Number(existingEvent.minimumCount ?? 1)), nowIso(), false);
        drop = repair;
        repaired = repair.repaired;
      } else {
        const entry = pickBugDexRewardEntry(currentUser, "duel_win");
        const grant = await grantBugDexRewardInTransaction(transaction, currentUser, entry.id, "duel_win", nowIso(), false);
        drop = grant;
        rewardGranted = true;
        transaction.set(eventRef, {
          createdAt: nowIso(),
          day: localDayId(),
          duelId,
          opponentId: duelOpponentId(duel, user),
          result,
          rewardBugId: entry.id,
          minimumCount: grant.item.count
        });
      }
    } else if (!existingEvent) {
      rewardGranted = true;
      transaction.set(eventRef, {
        createdAt: nowIso(),
        day: localDayId(),
        duelId,
        opponentId: duelOpponentId(duel, user),
        result
      });
    }
    const totalPoints = Math.max(0, currentUser.totalPoints + starterBoostedXp(currentUser, rewardGranted ? scaledDuelXp(baseXp) : 0));
    const updatedUser = { ...currentUser, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    if (!alreadyClaimed) {
      transaction.update(ref, {
        rewardClaimedBy: Array.from(new Set([...(duel.rewardClaimedBy ?? []), user.uid])),
        resultSeenBy: Array.from(new Set([...(duel.resultSeenBy ?? []), user.uid])),
        updatedAt: nowIso()
      });
    }
    if (rewardGranted) {
      transaction.update(currentUserRef, {
        badges: updatedUser.badges,
        title: updatedUser.title,
        totalPoints: updatedUser.totalPoints
      });
    }
    return { alreadyClaimed, drop, repaired, result, rewardGranted, user: updatedUser };
  });
  if (claim?.drop?.rewardType === "bug") {
    void writeBugDexUnlockBestEffort(user.uid, claim.drop.entry, "duel_win", new Date().toISOString());
  }
  return claim;
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
