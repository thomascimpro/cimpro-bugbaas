import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  updateProfile
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { BugComment, BugReport, User } from "../types";
import { entryByBugId, listBugDexInventory, syncPointUnlockedBugDex } from "./bugDexService";
import { normalizeBugLampActiveUntil, normalizeBugLampCount, withActivatedBugLamp } from "./bugLampService";
import { sanitizeActiveBugSquad } from "./bugSquadService";
import { bestUnlockedCharacterId, CharacterId, defaultCharacterId, isCharacterUnlocked, safeCharacterId } from "./characterService";
import { badgesForUser, titleForPoints } from "./pointsService";

export const upvotePointValue = 3;
export const upvoteGivenPointValue = 1;
export const commentPointValue = 2;
export const splatRewardEvery = 100;
export const splatRewardPoints = 10;
const presenceWriteMinIntervalMs = 60 * 1000;

let demoUser: User | null = null;
const demoUsers = new Map<string, User>();
const lastPresenceWriteAtByUid = new Map<string, number>();

function normalizeUser(user: User): User {
  const safeId = safeCharacterId(user.characterId);
  const unlockedCharacterId = isCharacterUnlocked(safeId, user.totalPoints) ? safeId : bestUnlockedCharacterId(user.totalPoints);
  const bugLampActiveUntil = normalizeBugLampActiveUntil(user.bugLampActiveUntil);
  const normalized = {
    ...user,
    active: user.active !== false,
    activeBugSquad: sanitizeActiveBugSquad(user.activeBugSquad),
    ...(bugLampActiveUntil ? { bugLampActiveUntil } : {}),
    bugLampCount: normalizeBugLampCount(user.bugLampCount),
    bugDexCount: user.bugDexCount ?? 0,
    characterId: unlockedCharacterId,
    commentPointCount: user.commentPointCount ?? 0,
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
  const snapshot = await getDocs(collection(db, "bugs"));
  return snapshot.docs.map((item) => item.data() as BugReport);
}

async function countUserComments(uid: string, bugs: BugReport[]): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  let total = 0;
  for (const bug of bugs) {
    const snapshot = await getDocs(collection(db, "bugs", bug.id, "comments"));
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
  const inventory = await listBugDexInventory(user as User);
  return {
    activeBugSquad: sanitizeActiveBugSquad(user.activeBugSquad, inventory),
    bugDexCount: inventory.length,
    legendaryBugDexCount: inventory.filter((item) => entryByBugId(item.bugId)?.rarity === "Legendarisch").length,
    mythicBugDexCount: inventory.filter((item) => entryByBugId(item.bugId)?.rarity === "Mythisch").length,
    tradedBugDexCount: inventory.filter((item) => item.sources.includes("trade")).length,
    upgradedBugDexCount: inventory.filter((item) => item.sources.includes("combine")).length
  };
}

function cleanDisplayName(displayName?: string | null): string {
  return (displayName ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function makeUser(uid: string, email: string, displayName?: string | null, nameSet = false): User {
  const fallbackName = email.split("@")[0] || "Bugmelder";
  const name = cleanDisplayName(displayName);
  return {
    uid,
    displayName: name || fallbackName,
    email,
    characterId: defaultCharacterId,
    activeBugSquad: [],
    bugLampCount: 0,
    nameSet,
    active: true,
    lastActiveAt: new Date().toISOString(),
    helpSeen: false,
    splatCount: 0,
    totalPoints: 0,
    bugCount: 0,
    bugDexCount: 0,
    commentPointCount: 0,
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
  };
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

export async function loginWithGoogle(idToken: string, accessToken?: string): Promise<User> {
  if (!idToken) throw new Error("Google-login gaf geen geldig token terug.");
  if (!isFirebaseConfigured) throw new Error("Firebase is nog niet geconfigureerd.");

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
    const name = cleanDisplayName(preferredDisplayName);
    if (user.active === false) {
      await updateDoc(ref, { active: true, lastActiveAt });
      user.active = true;
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
    const totalPoints = Math.max(0, user.totalPoints + pointsDelta);
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
    const totalPoints = Math.max(0, current.totalPoints + pointsDelta);
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

export async function syncMovementKilometers(user: User, todayKm: number): Promise<User> {
  if (!Number.isFinite(todayKm) || todayKm <= 0) return normalizeUser(user);
  const day = new Date().toISOString().slice(0, 10);
  const week = isoWeekId();
  const roundedTodayKm = Math.round(todayKm * 100) / 100;

  if (!isFirebaseConfigured) {
    const current = Array.from(demoUsers.values()).find((item) => item.uid === user.uid) ?? user;
    const previousDayKm = current.movementRegisteredDay === day ? current.movementRegisteredDayKm ?? 0 : 0;
    const previousWeekKm = current.movementRegisteredWeek === week ? current.movementRegisteredWeekKm ?? 0 : 0;
    const nextDayKm = Math.max(previousDayKm, roundedTodayKm);
    const deltaKm = Math.max(0, nextDayKm - previousDayKm);
    const updated = normalizeUser({
      ...current,
      movementKmTotal: Math.round(((current.movementKmTotal ?? 0) + deltaKm) * 100) / 100,
      movementRegisteredDay: day,
      movementRegisteredDayKm: nextDayKm,
      movementRegisteredWeek: week,
      movementRegisteredWeekKm: Math.round((previousWeekKm + deltaKm) * 100) / 100
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
    const deltaKm = Math.max(0, nextDayKm - previousDayKm);
    const movementKmTotal = Math.round(((current.movementKmTotal ?? 0) + deltaKm) * 100) / 100;
    const movementRegisteredWeekKm = Math.round((previousWeekKm + deltaKm) * 100) / 100;
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

export async function updateUserCharacter(user: User, characterId: CharacterId): Promise<User> {
  const safeId = safeCharacterId(characterId);
  if (!isCharacterUnlocked(safeId, user.totalPoints)) {
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

export async function listUsers(): Promise<User[]> {
  if (!isFirebaseConfigured) {
    const currentIsTest = Boolean(demoUser?.testAccount);
    const users = await Promise.all(Array.from(demoUsers.values())
      .filter((user) => user.active !== false)
      .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
      .map(async (user) => normalizeUser({ ...user, ...await bugDexAchievementStats(user) })));
    return users.sort((a, b) => b.totalPoints - a.totalPoints);
  }
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc")));
  const currentUid = auth.currentUser?.uid;
  const currentIsTest = Boolean(snapshot.docs.find((item) => item.id === currentUid)?.data().testAccount);
  const users = await Promise.all(snapshot.docs
    .map((item) => item.data() as User)
    .filter((user) => user.active !== false)
    .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
    .map((user) => withPublicStats(user.uid === currentUid ? user : publicUser(user))));
  return users.sort((a, b) => b.totalPoints - a.totalPoints);
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
  if (isFirebaseConfigured && auth.currentUser?.uid !== uid) {
    throw new Error("Alleen je eigen app mag je eigen punten aanpassen.");
  }
  const current = isFirebaseConfigured ? null : Array.from(demoUsers.values()).find((user) => user.uid === uid) ?? null;
  if (!isFirebaseConfigured) {
    if (!current) return null;
    const totalPoints = Math.max(0, current.totalPoints + pointsDelta);
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
  const totalPoints = Math.max(0, user.totalPoints + pointsDelta);
  const bugCount = Math.max(0, user.bugCount + bugCountDelta);
  const updated = normalizeUser({ ...user, totalPoints, bugCount, title: titleForPoints(totalPoints) });
  await updateDoc(ref, updated);
  return updated;
}

export async function recordBugSplat(user: User): Promise<{ user: User; milestone: boolean }> {
  if (!isFirebaseConfigured) {
    const current = Array.from(demoUsers.values()).find((item) => item.uid === user.uid) ?? user;
    const splatCount = (current.splatCount ?? 0) + 1;
    const milestone = splatCount % splatRewardEvery === 0;
    const totalPoints = Math.max(0, current.totalPoints + (milestone ? splatRewardPoints : 0));
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
    const totalPoints = Math.max(0, current.totalPoints + (milestone ? splatRewardPoints : 0));
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
