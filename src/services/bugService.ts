import { collection, doc, getDocs, orderBy, query, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugReport, BugStatus, NewBugInput, User } from "../types";
import { calculateBugPoints } from "./pointsService";
import { applyUserPoints } from "./userService";

const demoBugs: BugReport[] = [];

function normalizeBug(bug: BugReport, fallbackId = bug.id): BugReport {
  const upvoteUserIds = Array.isArray(bug.upvoteUserIds) ? bug.upvoteUserIds : [];
  return {
    ...bug,
    id: bug.id || fallbackId,
    upvoteUserIds,
    upvoteCount: typeof bug.upvoteCount === "number" ? bug.upvoteCount : upvoteUserIds.length
  };
}

export async function createBug(input: NewBugInput, user: User): Promise<BugReport> {
  if (!input.title.trim() || !input.project.trim() || !input.description.trim()) {
    throw new Error("Titel, systeem/project en beschrijving zijn verplicht.");
  }
  if (input.screenshotDataUrl && input.screenshotDataUrl.length > 900_000) {
    throw new Error("Screenshot is te groot. Kies een kleinere afbeelding.");
  }

  const now = new Date().toISOString();
  const points = calculateBugPoints(input.severity, "Nieuw");
  const baseBug: BugReport = {
    id: `bug-${Date.now()}`,
    title: input.title.trim(),
    project: input.project.trim(),
    severity: input.severity,
    description: input.description.trim(),
    steps: input.steps.trim(),
    status: "Nieuw",
    reporterId: user.uid,
    reporterName: user.displayName,
    points,
    upvoteCount: 0,
    upvoteUserIds: [],
    createdAt: now,
    updatedAt: now
  };

  if (!isFirebaseConfigured) {
    const bug = { ...baseBug, screenshotDataUrl: input.screenshotDataUrl };
    demoBugs.unshift(bug);
    await applyUserPoints(user.uid, points, 1);
    return bug;
  }

  const docRef = doc(collection(db, "bugs"));
  const bug = { ...baseBug, id: docRef.id, screenshotDataUrl: input.screenshotDataUrl };
  await setDoc(docRef, bug);
  await applyUserPoints(user.uid, points, 1);
  return bug;
}

export async function listBugs(status?: BugStatus): Promise<BugReport[]> {
  if (!isFirebaseConfigured) {
    return demoBugs.filter((bug) => !status || bug.status === status);
  }
  const snapshot = await getDocs(query(collection(db, "bugs"), orderBy("createdAt", "desc")));
  const bugs = snapshot.docs.map((item) => normalizeBug(item.data() as BugReport, item.id));
  return bugs.filter((bug) => !status || bug.status === status);
}

export async function updateBugStatus(bug: BugReport, status: BugStatus): Promise<BugReport> {
  const current = normalizeBug(bug);
  const nextPoints = calculateBugPoints(current.severity, status);
  const updated = { ...current, status, points: nextPoints, updatedAt: new Date().toISOString() };
  await applyUserPoints(current.reporterId, nextPoints - current.points, 0);

  if (!isFirebaseConfigured) {
    const index = demoBugs.findIndex((item) => item.id === current.id);
    if (index >= 0) demoBugs[index] = updated;
    return updated;
  }

  await updateDoc(doc(db, "bugs", current.id), {
    status: updated.status,
    points: updated.points,
    updatedAt: updated.updatedAt
  });
  return updated;
}

export async function toggleBugUpvote(bug: BugReport, user: User): Promise<BugReport> {
  const current = normalizeBug(bug);
  const hasVoted = current.upvoteUserIds.includes(user.uid);
  const upvoteUserIds = hasVoted
    ? current.upvoteUserIds.filter((uid) => uid !== user.uid)
    : [...current.upvoteUserIds, user.uid];
  const updated = {
    ...current,
    upvoteUserIds,
    upvoteCount: upvoteUserIds.length,
    updatedAt: new Date().toISOString()
  };

  if (!isFirebaseConfigured) {
    const index = demoBugs.findIndex((item) => item.id === current.id);
    if (index >= 0) demoBugs[index] = updated;
    return updated;
  }

  const bugRef = doc(db, "bugs", current.id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(bugRef);
    if (!snapshot.exists()) throw new Error("Bug niet gevonden.");
    const fresh = normalizeBug(snapshot.data() as BugReport, snapshot.id);
    const voted = fresh.upvoteUserIds.includes(user.uid);
    const nextUserIds = voted
      ? fresh.upvoteUserIds.filter((uid) => uid !== user.uid)
      : [...fresh.upvoteUserIds, user.uid];
    const next = {
      ...fresh,
      upvoteUserIds: nextUserIds,
      upvoteCount: nextUserIds.length,
      updatedAt: new Date().toISOString()
    };
    transaction.update(bugRef, {
      upvoteUserIds: next.upvoteUserIds,
      upvoteCount: next.upvoteCount,
      updatedAt: next.updatedAt
    });
    return next;
  });
}
