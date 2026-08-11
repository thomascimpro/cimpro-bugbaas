import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateProfile
} from "firebase/auth";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { BugComment, BugReport, Organization, OrganizationMember, User } from "../types";
import { entryByBugId, listBugDexInventory, listBugDexUnlocks, syncPointUnlockedBugDex } from "./bugDexService";
import { normalizeBugLampActiveUntil, normalizeBugLampCount, withActivatedBugLamp } from "./bugLampService";
import { sanitizeActiveBugSquad } from "./bugSquadService";
import { bestUnlockedCharacterId, CharacterId, CharacterUnlockContext, defaultCharacterId, isCharacterUnlocked, safeCharacterId } from "./characterService";
import { cleanOrganizationName, defaultOrganizationId, defaultOrganizationName, organizationIdsForUser, organizationNamesForUser, organizationSlug } from "./organizationService";
import { badgesForUser, titleForPoints } from "./pointsService";
import { starterBoostedXp, withStarterBoostIfEligible } from "./starterBoostService";

export const upvotePointValue = 3;
export const upvoteGivenPointValue = 1;
export const commentPointValue = 2;
export const splatRewardEvery = 100;
export const splatRewardPoints = 10;
const presenceWriteMinIntervalMs = 5 * 60 * 1000;
const userListCacheTtlMs = 5 * 60 * 1000;
const leaderboardCacheTtlMs = 10 * 60 * 1000;
const userListLimit = 75;
const leaderboardLimit = 25;

let demoUser: User | null = null;
const demoUsers = new Map<string, User>();
const cachedUserLists = new Map<string, { at: number; items: User[] }>();
const lastPresenceWriteAtByUid = new Map<string, number>();

async function readStoredUserList(cacheKey: string, ttlMs = userListCacheTtlMs): Promise<User[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`bugbaas:${cacheKey}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { at: number; items: User[] };
    if (!cached || Date.now() - cached.at >= ttlMs || !Array.isArray(cached.items)) return null;
    return cached.items;
  } catch {
    return null;
  }
}

function writeStoredUserList(cacheKey: string, items: User[]): void {
  void AsyncStorage.setItem(`bugbaas:${cacheKey}`, JSON.stringify({ at: Date.now(), items })).catch(() => undefined);
}

function clearStoredUserListCache(uid?: string): void {
  cachedUserLists.clear();
  const userKey = uid ?? auth.currentUser?.uid ?? "anonymous";
  void AsyncStorage.multiRemove([
    `bugbaas:users:${userKey}`,
    `bugbaas:usersLight:${userKey}`,
    `bugbaas:leaderboard:top:${userKey}`,
    `bugbaas:leaderboard:all:${userKey}`,
    `bugbaas:leaderboard:${userKey}`
  ]).catch(() => undefined);
}

function normalizeUser(user: User): User {
  const safeId = safeCharacterId(user.characterId);
  const characterContext = { allowUnknownSetBadges: true, user };
  const unlockedCharacterId = isCharacterUnlocked(safeId, user.totalPoints, characterContext) ? safeId : bestUnlockedCharacterId(user.totalPoints, characterContext);
  const bugLampActiveUntil = normalizeBugLampActiveUntil(user.bugLampActiveUntil);
  const organizationIds = organizationIdsForUser(user);
  const organizationNames = organizationNamesForUser(user);
  const normalized = {
    ...user,
    active: user.active !== false,
    activeBugSquad: sanitizeActiveBugSquad(user.activeBugSquad),
    organizationId: user.organizationId || defaultOrganizationId,
    organizationName: user.organizationName || defaultOrganizationName,
    organizationIds,
    organizationNames,
    ...(bugLampActiveUntil ? { bugLampActiveUntil } : {}),
    bugLampCount: normalizeBugLampCount(user.bugLampCount),
    bugDexCount: user.bugDexCount ?? 0,
    characterId: unlockedCharacterId,
    commentPointCount: user.commentPointCount ?? 0,
    duelDraws: user.duelDraws ?? 0,
    duelLosses: user.duelLosses ?? 0,
    duelRating: user.duelRating ?? 1000,
    duelWins: user.duelWins ?? 0,
    legendaryBugDexCount: user.legendaryBugDexCount ?? 0,
    movementKmTotal: user.movementKmTotal ?? 0,
    movementRegisteredDayKm: user.movementRegisteredDayKm ?? 0,
    movementRegisteredWeekKm: user.movementRegisteredWeekKm ?? 0,
    mythicBugDexCount: user.mythicBugDexCount ?? 0,
    splatCount: user.splatCount ?? 0,
    tradedBugDexCount: user.tradedBugDexCount ?? 0,
    upgradedBugDexCount: user.upgradedBugDexCount ?? 0,
    upvoteGivenPointCount: user.upvoteGivenPointCount ?? 0,
    upvoteReceivedPointCount: user.upvoteReceivedPointCount ?? 0,
    title: titleForPoints(user.totalPoints)
  };
  return { ...normalized, badges: badgesForUser(normalized) };
}

function publicUser(user: User): User {
  return { ...user, email: "", notificationPushToken: "" };
}

async function listAllBugsForScores(): Promise<BugReport[]> {
  if (!isFirebaseConfigured) return [];
  const orgIds = await currentUserOrganizationIds();
  const publicSnapshot = await getDocs(collection(db, "bugs"));
  const orgSnapshots = await Promise.all(orgIds.map((orgId) => getDocs(query(collection(db, "organizationBugs"), where("organizationId", "==", orgId)))));
  return [
    ...publicSnapshot.docs.map((item) => ({ ...(item.data() as BugReport), collectionName: "bugs" as const })),
    ...orgSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ ...(item.data() as BugReport), collectionName: "organizationBugs" as const })))
  ];
}

async function currentUserOrganizationIds(): Promise<string[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? organizationIdsForUser(snapshot.data() as User) : [];
}

async function countUserComments(uid: string, bugs: BugReport[]): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  let total = 0;
  for (const bug of bugs) {
    const collectionName = bug.collectionName ?? (bug.organizationId && bug.organizationId !== defaultOrganizationId ? "organizationBugs" : "bugs");
    const snapshot = await getDocs(collection(db, collectionName, bug.id, "comments"));
    total += snapshot.docs.filter((item) => (item.data() as BugComment).authorId === uid).length;
  }
  return total;
}

async function withPublicStats(user: User): Promise<User> {
  return normalizeUser({ ...user, ...await bugDexAchievementStats(user) });
}

async function bugDexAchievementStats(user: Pick<User, "uid" | "activeBugSquad" | "totalPoints" | "bugCount">): Promise<Pick<User, "activeBugSquad" | "bugDexCount" | "legendaryBugDexCount" | "mythicBugDexCount" | "tradedBugDexCount" | "upgradedBugDexCount">> {
  if (!isFirebaseConfigured || auth.currentUser?.uid === user.uid) {
    await syncPointUnlockedBugDex(user);
  }
  const [inventory, unlocks] = await Promise.all([
    listBugDexInventory(user as User),
    listBugDexUnlocks(user as User)
  ]);
  return {
    activeBugSquad: sanitizeActiveBugSquad(user.activeBugSquad, inventory),
    bugDexCount: unlocks.length,
    legendaryBugDexCount: unlocks.filter((item) => entryByBugId(item.bugId)?.rarity === "Legendarisch").length,
    mythicBugDexCount: unlocks.filter((item) => entryByBugId(item.bugId)?.rarity === "Mythisch").length,
    tradedBugDexCount: unlocks.filter((item) => item.sources.includes("trade")).length,
    upgradedBugDexCount: unlocks.filter((item) => item.sources.includes("combine")).length
  };
}

function cleanDisplayName(displayName?: string | null): string {
  return (displayName ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function makeUser(uid: string, email: string, displayName?: string | null, nameSet = false): User {
  const fallbackName = email.split("@")[0] || "Bugmelder";
  const name = cleanDisplayName(displayName);
  const createdAt = new Date().toISOString();
  return withStarterBoostIfEligible({
    uid,
    displayName: name || fallbackName,
    email,
    characterId: defaultCharacterId,
    activeBugSquad: [],
    bugLampCount: 0,
    nameSet,
    active: true,
    lastActiveAt: createdAt,
    organizationId: defaultOrganizationId,
    organizationName: defaultOrganizationName,
    organizationIds: [],
    organizationNames: {},
    helpSeen: false,
    splatCount: 0,
    totalPoints: 0,
    bugCount: 0,
    bugDexCount: 0,
    commentPointCount: 0,
    duelDraws: 0,
    duelLosses: 0,
    duelRating: 1000,
    duelRatingUpdatedAt: createdAt,
    duelWins: 0,
    upvoteGivenPointCount: 0,
    legendaryBugDexCount: 0,
    movementKmTotal: 0,
    movementRegisteredDayKm: 0,
    movementRegisteredWeekKm: 0,
    mythicBugDexCount: 0,
    tradedBugDexCount: 0,
    upgradedBugDexCount: 0,
    title: titleForPoints(0),
    upvoteReceivedPointCount: 0,
    badges: []
  });
}

export function subscribeAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string): Promise<User> {
  if (!email || !password) throw new Error("Vul e-mail en wachtwoord in.");
  if (!isFirebaseConfigured) {
    demoUser = demoUsers.get(email) ?? makeUser(`demo-${Date.now()}`, email);
    demoUsers.set(email, demoUser);
    return demoUser;
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return ensureUserDocument(credential.user);
}

export async function register(email: string, password: string, displayName?: string): Promise<User> {
  if (!email || password.length < 6) throw new Error("Gebruik een wachtwoord van minimaal 6 tekens.");
  const name = cleanDisplayName(displayName);
  if (!isFirebaseConfigured) {
    demoUser = makeUser(`demo-${Date.now()}`, email, name, Boolean(name));
    demoUsers.set(email, demoUser);
    return demoUser;
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(credential.user, { displayName: name });
  return ensureUserDocument(credential.user, name);
}

export async function loginWithGoogle(idToken?: string, accessToken?: string): Promise<User> {
  if (!isFirebaseConfigured) throw new Error("Firebase is nog niet geconfigureerd.");

  if (Platform.OS === "web") {
    const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
    return ensureUserDocument(userCredential.user);
  }

  if (!idToken) throw new Error("Google-login gaf geen geldig token terug.");
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await signInWithCredential(auth, credential);
  return ensureUserDocument(userCredential.user);
}

export async function ensureUserDocument(firebaseUser: FirebaseUser, preferredDisplayName?: string): Promise<User> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(ref);
  const lastActiveAt = new Date().toISOString();
  if (snapshot.exists()) {
    const user = snapshot.data() as User;
    const boostedUser = withStarterBoostIfEligible(user);
    const name = cleanDisplayName(preferredDisplayName);
    const starterBoostChanged = boostedUser.starterBoostGrantedAt !== user.starterBoostGrantedAt || boostedUser.starterBoostActiveUntil !== user.starterBoostActiveUntil;
    if (user.active === false || starterBoostChanged) {
      await updateDoc(ref, {
        active: true,
        lastActiveAt,
        ...(starterBoostChanged ? {
          starterBoostActiveUntil: boostedUser.starterBoostActiveUntil,
          starterBoostGrantedAt: boostedUser.starterBoostGrantedAt
        } : {})
      });
      user.active = true;
      user.starterBoostActiveUntil = boostedUser.starterBoostActiveUntil;
      user.starterBoostGrantedAt = boostedUser.starterBoostGrantedAt;
    }
    if (name && user.displayName !== name) {
      const updated = { ...user, active: true, displayName: name, lastActiveAt, nameSet: true };
      await setDoc(ref, updated);
      return normalizeUser(updated);
    }
    await touchUserActivity(firebaseUser.uid, true).catch(() => undefined);
    return normalizeUser({ ...user, active: true, lastActiveAt });
  }
  const user = makeUser(firebaseUser.uid, firebaseUser.email ?? "onbekend@cimpro.local", preferredDisplayName ?? firebaseUser.displayName, false);
  await setDoc(ref, user);
  return user;
}

export async function touchUserActivity(userOrUid: Pick<User, "uid"> | string, force = false): Promise<string | null> {
  const uid = typeof userOrUid === "string" ? userOrUid : userOrUid.uid;
  if (!uid) return null;

  const now = Date.now();
  const lastWriteAt = lastPresenceWriteAtByUid.get(uid) ?? 0;
  if (!force && now - lastWriteAt < presenceWriteMinIntervalMs) return null;
  lastPresenceWriteAtByUid.set(uid, now);

  const lastActiveAt = new Date(now).toISOString();
  if (!isFirebaseConfigured) {
    const current = Array.from(demoUsers.values()).find((item) => item.uid === uid);
    if (current) {
      const updated = { ...current, lastActiveAt };
      demoUsers.set(updated.email, updated);
      if (demoUser?.uid === uid) demoUser = updated;
    }
    return lastActiveAt;
  }

  await updateDoc(doc(db, "users", uid), { lastActiveAt });
  return lastActiveAt;
}

export async function syncEngagementPoints(user: User): Promise<User> {
  const bugs = await listAllBugsForScores();
  const commentCount = await countUserComments(user.uid, bugs);
  const upvoteGivenCount = bugs.filter((bug) => (bug.upvoteUserIds ?? []).includes(user.uid)).length;
  const upvoteReceivedCount = bugs
    .filter((bug) => bug.reporterId === user.uid)
    .reduce((total, bug) => total + (bug.upvoteCount ?? 0), 0);
  const bugDexStats = await bugDexAchievementStats(user);

  if (!isFirebaseConfigured) {
    const pointsDelta =
      (commentCount - (user.commentPointCount ?? 0)) * commentPointValue
      + (upvoteGivenCount - (user.upvoteGivenPointCount ?? 0)) * upvoteGivenPointValue
      + (upvoteReceivedCount - (user.upvoteReceivedPointCount ?? 0)) * upvotePointValue;
    const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, pointsDelta));
    const updated = normalizeUser({ ...user, ...bugDexStats, totalPoints, commentPointCount: commentCount, upvoteGivenPointCount: upvoteGivenCount, upvoteReceivedPointCount: upvoteReceivedCount });
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  const ref = doc(db, "users", user.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    const current = snapshot.data() as User;
    const pointsDelta =
      (commentCount - (current.commentPointCount ?? 0)) * commentPointValue
      + (upvoteGivenCount - (current.upvoteGivenPointCount ?? 0)) * upvoteGivenPointValue
      + (upvoteReceivedCount - (current.upvoteReceivedPointCount ?? 0)) * upvotePointValue;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, pointsDelta));
    const updated = normalizeUser({ ...current, ...bugDexStats, active: true, totalPoints, commentPointCount: commentCount, upvoteGivenPointCount: upvoteGivenCount, upvoteReceivedPointCount: upvoteReceivedCount });
    transaction.update(ref, {
      active: true,
      totalPoints: updated.totalPoints,
      title: updated.title,
      badges: updated.badges,
      characterId: updated.characterId,
      activeBugSquad: updated.activeBugSquad,
      ...bugDexStats,
      commentPointCount: commentCount,
      upvoteGivenPointCount: upvoteGivenCount,
      upvoteReceivedPointCount: upvoteReceivedCount
    });
    return updated;
  });
}

export async function syncMovementKilometers(user: User, todayKm: number, weekKm = todayKm): Promise<User> {
  if (!Number.isFinite(todayKm) || !Number.isFinite(weekKm) || (todayKm <= 0 && weekKm <= 0)) return normalizeUser(user);
  const day = new Date().toISOString().slice(0, 10);
  const week = isoWeekId();
  const roundedTodayKm = Math.max(0, Math.round(todayKm * 100) / 100);
  const roundedWeekKm = Math.max(roundedTodayKm, Math.round((Number.isFinite(weekKm) ? weekKm : todayKm) * 100) / 100);

  if (!isFirebaseConfigured) {
    const current = Array.from(demoUsers.values()).find((item) => item.uid === user.uid) ?? user;
    const previousDayKm = current.movementRegisteredDay === day ? current.movementRegisteredDayKm ?? 0 : 0;
    const previousWeekKm = current.movementRegisteredWeek === week ? current.movementRegisteredWeekKm ?? 0 : 0;
    const nextDayKm = Math.max(previousDayKm, roundedTodayKm);
    const dayDeltaKm = Math.max(0, nextDayKm - previousDayKm);
    const nextWeekKm = Math.max(previousWeekKm + dayDeltaKm, roundedWeekKm);
    const weekDeltaKm = Math.max(0, nextWeekKm - previousWeekKm);
    const updated = normalizeUser({
      ...current,
      movementKmTotal: Math.round(((current.movementKmTotal ?? 0) + weekDeltaKm) * 100) / 100,
      movementRegisteredDay: day,
      movementRegisteredDayKm: nextDayKm,
      movementRegisteredWeek: week,
      movementRegisteredWeekKm: Math.round(nextWeekKm * 100) / 100
    });
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  const ref = doc(db, "users", user.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    const current = snapshot.data() as User;
    const previousDayKm = current.movementRegisteredDay === day ? current.movementRegisteredDayKm ?? 0 : 0;
    const previousWeekKm = current.movementRegisteredWeek === week ? current.movementRegisteredWeekKm ?? 0 : 0;
    const nextDayKm = Math.max(previousDayKm, roundedTodayKm);
    const dayDeltaKm = Math.max(0, nextDayKm - previousDayKm);
    const nextWeekKm = Math.max(previousWeekKm + dayDeltaKm, roundedWeekKm);
    const weekDeltaKm = Math.max(0, nextWeekKm - previousWeekKm);
    const movementKmTotal = Math.round(((current.movementKmTotal ?? 0) + weekDeltaKm) * 100) / 100;
    const movementRegisteredWeekKm = Math.round(nextWeekKm * 100) / 100;
    const updated = normalizeUser({
      ...current,
      movementKmTotal,
      movementRegisteredDay: day,
      movementRegisteredDayKm: nextDayKm,
      movementRegisteredWeek: week,
      movementRegisteredWeekKm
    });
    transaction.update(ref, {
      badges: updated.badges,
      characterId: updated.characterId,
      movementKmTotal,
      movementRegisteredDay: day,
      movementRegisteredDayKm: nextDayKm,
      movementRegisteredWeek: week,
      movementRegisteredWeekKm
    });
    return updated;
  });
}

function isoWeekId(date = new Date()): string {
  const next = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((next.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${next.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export async function updateUserDisplayName(user: User, displayName: string): Promise<User> {
  const name = cleanDisplayName(displayName);
  if (!name || name.length < 2) throw new Error("Vul een naam in van minimaal 2 tekens.");

  if (!isFirebaseConfigured) {
    const updated = normalizeUser({ ...user, displayName: name, nameSet: true });
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  if (auth.currentUser?.uid === user.uid) await updateProfile(auth.currentUser, { displayName: name });
  const updated = normalizeUser({ ...user, displayName: name, nameSet: true });
  await updateDoc(doc(db, "users", user.uid), {
    characterId: updated.characterId,
    displayName: updated.displayName,
    nameSet: true
  });
  return updated;
}

export async function createOrganizationForUser(user: User, organizationName: string): Promise<User> {
  const name = cleanOrganizationName(organizationName);
  if (name.length < 2) throw new Error("Organisatienaam moet minimaal 2 tekens zijn.");
  const organizationId = organizationSlug(name);
  if (organizationId === defaultOrganizationId) throw new Error("Kies een andere organisatienaam.");

  const updated = normalizeUser({ ...user, organizationId, organizationName: name });
  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  const userRef = doc(db, "users", user.uid);
  const organizationRef = doc(db, "organizations", organizationId);
  const memberRef = doc(db, "organizations", organizationId, "members", user.uid);
  await runTransaction(db, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);
    if (organizationSnapshot.exists()) throw new Error("Deze organisatie bestaat al.");
    const now = new Date().toISOString();
    const organization: Organization = {
      id: organizationId,
      name,
      createdBy: user.uid,
      createdByName: user.displayName,
      createdAt: now
    };
    transaction.set(organizationRef, organization);
    const member: OrganizationMember = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: "owner",
      organizationId,
      organizationName: name,
      joinedAt: now
    };
    transaction.set(memberRef, member);
    transaction.update(userRef, {
      organizationId,
      organizationName: name,
      organizationIds: arrayUnion(organizationId),
      [`organizationNames.${organizationId}`]: name
    });
  });

  return updated;
}

export async function updateUserCharacter(user: User, characterId: CharacterId, context: CharacterUnlockContext = {}): Promise<User> {
  const safeId = safeCharacterId(characterId);
  if (!isCharacterUnlocked(safeId, user.totalPoints, { ...context, user })) {
    const updated = normalizeUser(user);
    if (isFirebaseConfigured) {
      await updateDoc(doc(db, "users", user.uid), { characterId: updated.characterId });
    } else {
      demoUsers.set(updated.email, updated);
      if (demoUser?.uid === user.uid) demoUser = updated;
    }
    return updated;
  }
  const updated = normalizeUser({ ...user, characterId: safeId });

  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), { characterId: safeId });
  return updated;
}

export async function updateUserBugSquad(user: User, bugIds: string[]): Promise<User> {
  const inventory = await listBugDexInventory(user);
  const activeBugSquad = sanitizeActiveBugSquad(bugIds, inventory);
  const updated = normalizeUser({ ...user, activeBugSquad });

  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), { activeBugSquad });
  return updated;
}

export async function updateUserNotificationPushToken(user: User, notificationPushToken: string): Promise<User> {
  const token = notificationPushToken.trim();
  if (!token) return normalizeUser(user);
  const updated = normalizeUser({ ...user, notificationPushToken: token });

  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), { notificationPushToken: token });
  return updated;
}

export async function activateBugLamp(user: User): Promise<User> {
  const updated = normalizeUser(withActivatedBugLamp(user));

  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), {
    bugLampActiveUntil: updated.bugLampActiveUntil,
    bugLampCount: updated.bugLampCount
  });
  return updated;
}

export async function markHelpSeen(user: User): Promise<User> {
  const updated = normalizeUser({ ...user, helpSeen: true });
  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), { characterId: updated.characterId, helpSeen: true });
  return updated;
}

export async function logout(): Promise<void> {
  if (!isFirebaseConfigured) {
    demoUser = null;
    return;
  }
  await signOut(auth);
}

export async function listUsersLight(): Promise<User[]> {
  if (!isFirebaseConfigured) {
    const currentIsTest = Boolean(demoUser?.testAccount);
    return Array.from(demoUsers.values())
      .filter((user) => user.active !== false)
      .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
      .map((user) => normalizeUser(publicUser(user)))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  const currentUid = auth.currentUser?.uid;
  const cacheKey = `usersLight:${currentUid ?? "anonymous"}`;
  const cached = cachedUserLists.get(cacheKey);
  if (cached && Date.now() - cached.at < userListCacheTtlMs) return cached.items;
  const stored = await readStoredUserList(cacheKey);
  if (stored) {
    cachedUserLists.set(cacheKey, { at: Date.now(), items: stored });
    return stored;
  }

  const currentSnapshot = currentUid ? await getDoc(doc(db, "users", currentUid)) : null;
  const currentIsTest = Boolean(currentSnapshot?.exists() && (currentSnapshot.data() as User).testAccount);
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(userListLimit)));
  const users = snapshot.docs
    .map((item) => item.data() as User)
    .filter((user) => user.active !== false)
    .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
    .map((user) => normalizeUser(user.uid === currentUid ? user : publicUser(user)))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  cachedUserLists.set(cacheKey, { at: Date.now(), items: users });
  writeStoredUserList(cacheKey, users);
  return users;
}

export async function listUsers(): Promise<User[]> {
  if (!isFirebaseConfigured) {
    const currentIsTest = Boolean(demoUser?.testAccount);
    const users = await Promise.all(Array.from(demoUsers.values())
      .filter((user) => user.active !== false)
      .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
      .map(async (user) => normalizeUser({ ...user, ...await bugDexAchievementStats(user) })));
    return users.sort((a, b) => b.totalPoints - a.totalPoints);
  }
  const currentUid = auth.currentUser?.uid;
  const cacheKey = `users:${currentUid ?? "anonymous"}`;
  const cached = cachedUserLists.get(cacheKey);
  if (cached && Date.now() - cached.at < userListCacheTtlMs) return cached.items;
  const stored = await readStoredUserList(cacheKey);
  if (stored) {
    cachedUserLists.set(cacheKey, { at: Date.now(), items: stored });
    return stored;
  }

  const currentSnapshot = currentUid ? await getDoc(doc(db, "users", currentUid)) : null;
  const currentIsTest = Boolean(currentSnapshot?.exists() && (currentSnapshot.data() as User).testAccount);
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(userListLimit)));
  const users = await Promise.all(snapshot.docs
    .map((item) => item.data() as User)
    .filter((user) => user.active !== false)
    .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
    .map((user) => withPublicStats(user.uid === currentUid ? user : publicUser(user))));
  const sorted = users.sort((a, b) => b.totalPoints - a.totalPoints);
  cachedUserLists.set(cacheKey, { at: Date.now(), items: sorted });
  writeStoredUserList(cacheKey, sorted);
  return sorted;
}

type LeaderboardListOptions = {
  complete?: boolean;
  fresh?: boolean;
};

export async function listLeaderboardUsers(options: LeaderboardListOptions = {}): Promise<User[]> {
  if (!isFirebaseConfigured) {
    const currentIsTest = Boolean(demoUser?.testAccount);
    return Array.from(demoUsers.values())
      .filter((user) => user.active !== false)
      .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
      .map(normalizeUser)
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  const currentUid = auth.currentUser?.uid;
  const cacheKey = `leaderboard:${options.complete ? "all" : "top"}:${currentUid ?? "anonymous"}`;
  if (!options.fresh) {
    const cached = cachedUserLists.get(cacheKey);
    if (cached && Date.now() - cached.at < leaderboardCacheTtlMs) return cached.items;
    const stored = await readStoredUserList(cacheKey, leaderboardCacheTtlMs);
    if (stored) {
      cachedUserLists.set(cacheKey, { at: Date.now(), items: stored });
      return stored;
    }
  }

  const currentSnapshot = currentUid ? await getDoc(doc(db, "users", currentUid)) : null;
  const currentIsTest = Boolean(currentSnapshot?.exists() && (currentSnapshot.data() as User).testAccount);
  const snapshot = options.complete
    ? await getDocs(collection(db, "users"))
    : await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(leaderboardLimit)));
  const users = snapshot.docs
    .map((item) => item.data() as User)
    .filter((user) => user.active !== false)
    .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
    .map((user) => normalizeUser(user.uid === currentUid ? user : publicUser(user)))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  cachedUserLists.set(cacheKey, { at: Date.now(), items: users });
  writeStoredUserList(cacheKey, users);
  return users;
}

export async function getUserById(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured) {
    const user = Array.from(demoUsers.values()).find((item) => item.uid === uid) ?? null;
    return user ? normalizeUser(user) : null;
  }
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  const user = snapshot.data() as User;
  if (user.active === false) return null;
  return withPublicStats(user.uid === auth.currentUser?.uid ? user : publicUser(user));
}

export async function applyUserPoints(uid: string, pointsDelta: number, bugCountDelta: number): Promise<User | null> {
  clearStoredUserListCache(uid);
  if (isFirebaseConfigured && auth.currentUser?.uid !== uid) {
    throw new Error("Alleen je eigen app mag je eigen punten aanpassen.");
  }
  const current = isFirebaseConfigured ? null : Array.from(demoUsers.values()).find((user) => user.uid === uid) ?? null;
  if (!isFirebaseConfigured) {
    if (!current) return null;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, pointsDelta));
    const bugCount = Math.max(0, current.bugCount + bugCountDelta);
    const updated = normalizeUser({ ...current, totalPoints, bugCount, title: titleForPoints(totalPoints) });
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === uid) demoUser = updated;
    return updated;
  }

  const ref = doc(db, "users", uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const user = snapshot.data() as User;
  const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, pointsDelta));
  const bugCount = Math.max(0, user.bugCount + bugCountDelta);
  const updated = normalizeUser({ ...user, totalPoints, bugCount, title: titleForPoints(totalPoints) });
  await updateDoc(ref, {
    badges: updated.badges,
    bugCount: updated.bugCount,
    characterId: updated.characterId,
    title: updated.title,
    totalPoints: updated.totalPoints
  });
  return updated;
}

export async function recordBugSplat(user: User): Promise<{ user: User; milestone: boolean }> {
  if (!isFirebaseConfigured) {
    const current = Array.from(demoUsers.values()).find((item) => item.uid === user.uid) ?? user;
    const splatCount = (current.splatCount ?? 0) + 1;
    const milestone = splatCount % splatRewardEvery === 0;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, milestone ? splatRewardPoints : 0));
    const updated = normalizeUser({ ...current, splatCount, totalPoints });
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return { user: updated, milestone };
  }

  const ref = doc(db, "users", user.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    const current = snapshot.data() as User;
    const splatCount = (current.splatCount ?? 0) + 1;
    const milestone = splatCount % splatRewardEvery === 0;
    const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, milestone ? splatRewardPoints : 0));
    const updated = normalizeUser({ ...current, active: true, splatCount, totalPoints });
    transaction.update(ref, {
      active: true,
      characterId: updated.characterId,
      splatCount,
      totalPoints,
      title: updated.title,
      badges: updated.badges
    });
    return { user: updated, milestone };
  });
}
