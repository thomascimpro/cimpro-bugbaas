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
import { BugReport, User } from "../types";
import { badgesForUser, titleForPoints } from "./pointsService";

export const upvotePointValue = 3;
export const splatRewardEvery = 100;
export const splatRewardPoints = 10;

let demoUser: User | null = null;
const demoUsers = new Map<string, User>();

function normalizeUser(user: User): User {
  return {
    ...user,
    active: user.active !== false,
    title: titleForPoints(user.totalPoints),
    badges: badgesForUser(user)
  };
}

function withUpvoteBonus(user: User, bugs: BugReport[]): User {
  const upvoteBonus = bugs
    .filter((bug) => bug.reporterId === user.uid)
    .reduce((total, bug) => total + (bug.upvoteCount ?? 0) * upvotePointValue, 0);
  return normalizeUser({ ...user, totalPoints: user.totalPoints + upvoteBonus });
}

function publicUser(user: User): User {
  return { ...user, email: "" };
}

async function listAllBugsForScores(): Promise<BugReport[]> {
  if (!isFirebaseConfigured) return [];
  const snapshot = await getDocs(collection(db, "bugs"));
  return snapshot.docs.map((item) => item.data() as BugReport);
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
    nameSet,
    active: true,
    helpSeen: false,
    splatCount: 0,
    totalPoints: 0,
    bugCount: 0,
    title: titleForPoints(0),
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
  if (snapshot.exists()) {
    const user = snapshot.data() as User;
    const name = cleanDisplayName(preferredDisplayName);
    if (user.active === false) {
      await updateDoc(ref, { active: true });
      user.active = true;
    }
    if (name && user.displayName !== name) {
      const updated = { ...user, active: true, displayName: name, nameSet: true };
      await setDoc(ref, updated);
      const bugs = await listAllBugsForScores();
      return withUpvoteBonus(updated, bugs);
    }
    const bugs = await listAllBugsForScores();
    return withUpvoteBonus({ ...user, active: true }, bugs);
  }
  const user = makeUser(firebaseUser.uid, firebaseUser.email ?? "onbekend@cimpro.local", preferredDisplayName ?? firebaseUser.displayName, false);
  await setDoc(ref, user);
  return user;
}

export async function updateUserDisplayName(user: User, displayName: string): Promise<User> {
  const name = cleanDisplayName(displayName);
  if (!name || name.length < 2) throw new Error("Vul een naam in van minimaal 2 tekens.");

  if (!isFirebaseConfigured) {
    const updated = { ...user, displayName: name, nameSet: true };
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return normalizeUser(updated);
  }

  if (auth.currentUser?.uid === user.uid) await updateProfile(auth.currentUser, { displayName: name });
  const updated = { ...user, displayName: name, nameSet: true };
  await updateDoc(doc(db, "users", user.uid), {
    displayName: updated.displayName,
    nameSet: true
  });
  return normalizeUser(updated);
}

export async function markHelpSeen(user: User): Promise<User> {
  const updated = normalizeUser({ ...user, helpSeen: true });
  if (!isFirebaseConfigured) {
    demoUsers.set(updated.email, updated);
    if (demoUser?.uid === user.uid) demoUser = updated;
    return updated;
  }

  await updateDoc(doc(db, "users", user.uid), { helpSeen: true });
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
    return Array.from(demoUsers.values())
      .filter((user) => user.active !== false)
      .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
      .map(normalizeUser)
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc")));
  const bugs = await listAllBugsForScores();
  const currentUid = auth.currentUser?.uid;
  const currentIsTest = Boolean(snapshot.docs.find((item) => item.id === currentUid)?.data().testAccount);
  return snapshot.docs
    .map((item) => item.data() as User)
    .filter((user) => user.active !== false)
    .filter((user) => currentIsTest ? user.testAccount === true : user.testAccount !== true)
    .map((user) => withUpvoteBonus(publicUser(user), bugs))
    .sort((a, b) => b.totalPoints - a.totalPoints);
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
  const bugs = await listAllBugsForScores();
  return withUpvoteBonus(user.uid === auth.currentUser?.uid ? user : publicUser(user), bugs);
}

export async function applyUserPoints(uid: string, pointsDelta: number, bugCountDelta: number): Promise<User | null> {
  const current = isFirebaseConfigured ? null : Array.from(demoUsers.values()).find((user) => user.uid === uid) ?? null;
  if (!isFirebaseConfigured) {
    if (!current) return null;
    const totalPoints = Math.max(0, current.totalPoints + pointsDelta);
    const bugCount = Math.max(0, current.bugCount + bugCountDelta);
    const updated = { ...current, totalPoints, bugCount, title: titleForPoints(totalPoints) };
    updated.badges = badgesForUser(updated);
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
  const updated = { ...user, totalPoints, bugCount, title: titleForPoints(totalPoints) };
  updated.badges = badgesForUser(updated);
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
      splatCount,
      totalPoints,
      title: updated.title,
      badges: updated.badges
    });
    return { user: updated, milestone };
  });
}
