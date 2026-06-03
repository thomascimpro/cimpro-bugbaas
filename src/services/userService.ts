import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut
} from "firebase/auth";
import { doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, collection } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { User } from "../types";
import { badgesForUser, titleForPoints } from "./pointsService";

let demoUser: User | null = null;
const demoUsers = new Map<string, User>();

const demoRivals: User[] = [
  {
    uid: "demo-rival-maya",
    displayName: "Maya",
    email: "maya@cimpro.local",
    totalPoints: 315,
    bugCount: 18,
    title: titleForPoints(315),
    badges: []
  },
  {
    uid: "demo-rival-noor",
    displayName: "Noor",
    email: "noor@cimpro.local",
    totalPoints: 168,
    bugCount: 11,
    title: titleForPoints(168),
    badges: []
  },
  {
    uid: "demo-rival-lars",
    displayName: "Lars",
    email: "lars@cimpro.local",
    totalPoints: 92,
    bugCount: 7,
    title: titleForPoints(92),
    badges: []
  },
  {
    uid: "demo-rival-zoe",
    displayName: "Zoe",
    email: "zoe@cimpro.local",
    totalPoints: 31,
    bugCount: 3,
    title: titleForPoints(31),
    badges: []
  }
];

function ensureDemoLeaderboard() {
  demoRivals.forEach((rival) => {
    if (!demoUsers.has(rival.email)) {
      const normalized = normalizeUser(rival);
      demoUsers.set(normalized.email, normalized);
    }
  });
}

function normalizeUser(user: User): User {
  return {
    ...user,
    title: titleForPoints(user.totalPoints),
    badges: badgesForUser(user)
  };
}

function makeUser(uid: string, email: string, displayName?: string | null): User {
  const fallbackName = email.split("@")[0] || "Bugmelder";
  return {
    uid,
    displayName: displayName || fallbackName,
    email,
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
    ensureDemoLeaderboard();
    return demoUser;
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return ensureUserDocument(credential.user);
}

export async function register(email: string, password: string): Promise<User> {
  if (!email || password.length < 6) throw new Error("Gebruik een wachtwoord van minimaal 6 tekens.");
  if (!isFirebaseConfigured) {
    demoUser = makeUser(`demo-${Date.now()}`, email);
    demoUsers.set(email, demoUser);
    ensureDemoLeaderboard();
    return demoUser;
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return ensureUserDocument(credential.user);
}

export async function loginWithGoogle(idToken: string, accessToken?: string): Promise<User> {
  if (!idToken) throw new Error("Google-login gaf geen geldig token terug.");
  if (!isFirebaseConfigured) throw new Error("Firebase is nog niet geconfigureerd.");

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCredential = await signInWithCredential(auth, credential);
  return ensureUserDocument(userCredential.user);
}

export async function ensureUserDocument(firebaseUser: FirebaseUser): Promise<User> {
  const ref = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return normalizeUser(snapshot.data() as User);
  }
  const user = makeUser(firebaseUser.uid, firebaseUser.email ?? "onbekend@cimpro.local", firebaseUser.displayName);
  await setDoc(ref, user);
  return user;
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
    ensureDemoLeaderboard();
    return Array.from(demoUsers.values()).map(normalizeUser).sort((a, b) => b.totalPoints - a.totalPoints);
  }
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("totalPoints", "desc")));
  return snapshot.docs.map((item) => normalizeUser(item.data() as User));
}

export async function getUserById(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured) {
    const user = Array.from(demoUsers.values()).find((item) => item.uid === uid) ?? null;
    return user ? normalizeUser(user) : null;
  }
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? normalizeUser(snapshot.data() as User) : null;
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
