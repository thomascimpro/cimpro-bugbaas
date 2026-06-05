import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { BugComment, BugReport, BugStatus, NewBugInput, ReportType, User } from "../types";
import { badgesForUser, calculateBugPoints, titleForPoints } from "./pointsService";
import { applyUserPoints, commentPointValue, syncEngagementPoints, upvoteGivenPointValue } from "./userService";

const demoBugs: BugReport[] = [];
const demoComments: BugComment[] = [];

function normalizeBug(bug: BugReport, fallbackId = bug.id): BugReport {
  const upvoteUserIds = Array.isArray(bug.upvoteUserIds) ? bug.upvoteUserIds : [];
  return {
    ...bug,
    id: bug.id || fallbackId,
    reportType: bug.reportType ?? "bug",
    upvoteUserIds,
    upvoteCount: typeof bug.upvoteCount === "number" ? bug.upvoteCount : upvoteUserIds.length
  };
}

function calculateReportPoints(reportType: ReportType, severity: NewBugInput["severity"], status: BugStatus): number {
  if (reportType === "bug") return calculateBugPoints(severity, status);
  if (status === "Afgekeurd" || status === "Dubbel") return 0;
  if (reportType === "workaround") return 8;
  if (reportType === "tip") return 6;
  return 5;
}

async function currentUserIsTestAccount(): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() && Boolean((snapshot.data() as User).testAccount);
}

async function filterBugsForCurrentUser(bugs: BugReport[]): Promise<BugReport[]> {
  if (!isFirebaseConfigured) {
    return bugs.filter((bug) => bug.reporterTestAccount !== true);
  }

  const [currentIsTest, userSnapshot] = await Promise.all([
    currentUserIsTestAccount(),
    getDocs(collection(db, "users"))
  ]);
  const usersById = new Map(userSnapshot.docs.map((item) => [item.id, item.data() as User]));

  return bugs.filter((bug) => {
    const reporter = usersById.get(bug.reporterId);
    const reporterIsTest = bug.reporterTestAccount === true || reporter?.testAccount === true;
    const reporterIsActiveRealUser = Boolean(reporter) && reporter?.active !== false && reporter?.testAccount !== true && bug.reporterTestAccount !== true;
    return currentIsTest ? reporterIsTest || !reporter : reporterIsActiveRealUser;
  });
}

export async function createBug(input: NewBugInput, user: User): Promise<BugReport> {
  if (!input.title.trim() || !input.project.trim() || !input.description.trim()) {
    throw new Error("Titel, systeem/project en beschrijving zijn verplicht.");
  }
  if (input.screenshotDataUrl && input.screenshotDataUrl.length > 900_000) {
    throw new Error("Screenshot is te groot. Kies een kleinere afbeelding.");
  }

  const now = new Date().toISOString();
  const reportType = input.reportType ?? "bug";
  const points = calculateReportPoints(reportType, input.severity, "Nieuw");
  const baseBug: BugReport = {
    id: `bug-${Date.now()}`,
    reportType,
    title: input.title.trim(),
    project: input.project.trim(),
    severity: input.severity,
    description: input.description.trim(),
    steps: input.steps.trim(),
    status: "Nieuw",
    reporterId: user.uid,
    reporterName: user.displayName,
    reporterTestAccount: user.testAccount === true,
    points,
    upvoteCount: 0,
    upvoteUserIds: [],
    createdAt: now,
    updatedAt: now
  };

  if (!isFirebaseConfigured) {
    const bug = { ...baseBug, screenshotDataUrl: input.screenshotDataUrl };
    demoBugs.unshift(bug);
    await applyUserPoints(user.uid, points, reportType === "bug" ? 1 : 0);
    return bug;
  }

  const docRef = doc(collection(db, "bugs"));
  const bug: BugReport = { ...baseBug, id: docRef.id };
  if (input.screenshotDataUrl) bug.screenshotDataUrl = input.screenshotDataUrl;
  await setDoc(docRef, bug);
  await applyUserPoints(user.uid, points, reportType === "bug" ? 1 : 0);
  return bug;
}

export async function listBugs(status?: BugStatus): Promise<BugReport[]> {
  if (!isFirebaseConfigured) {
    const visibleBugs = await filterBugsForCurrentUser(demoBugs);
    return visibleBugs.filter((bug) => !status || bug.status === status);
  }
  const snapshot = await getDocs(query(collection(db, "bugs"), orderBy("createdAt", "desc")));
  const bugs = snapshot.docs.map((item) => normalizeBug(item.data() as BugReport, item.id));
  const visibleBugs = await filterBugsForCurrentUser(bugs);
  return visibleBugs.filter((bug) => !status || bug.status === status);
}

export async function updateBugStatus(bug: BugReport, status: BugStatus): Promise<BugReport> {
  const current = normalizeBug(bug);
  const nextPoints = calculateReportPoints(current.reportType ?? "bug", current.severity, status);
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
  if (current.reporterId === user.uid) throw new Error("Je kunt je eigen bug niet upvoten.");
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
    await applyUserPoints(user.uid, hasVoted ? -upvoteGivenPointValue : upvoteGivenPointValue, 0);
    return updated;
  }

  const bugRef = doc(db, "bugs", current.id);
  const nextBug = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(bugRef);
    if (!snapshot.exists()) throw new Error("Bug niet gevonden.");
    const fresh = normalizeBug(snapshot.data() as BugReport, snapshot.id);
    if (fresh.reporterId === user.uid) throw new Error("Je kunt je eigen bug niet upvoten.");
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
  await syncEngagementPoints(user);
  return nextBug;
}

export async function deleteOwnBug(bug: BugReport, user: User): Promise<void> {
  const current = normalizeBug(bug);
  if (current.reporterId !== user.uid) throw new Error("Je kunt alleen je eigen bugs verwijderen.");

  if (!isFirebaseConfigured) {
    const index = demoBugs.findIndex((item) => item.id === current.id);
    if (index >= 0) demoBugs.splice(index, 1);
    for (let i = demoComments.length - 1; i >= 0; i -= 1) {
      if (demoComments[i].bugId === current.id) demoComments.splice(i, 1);
    }
    await applyUserPoints(user.uid, -current.points, current.reportType === "bug" ? -1 : 0);
    return;
  }

  const bugRef = doc(db, "bugs", current.id);
  const userRef = doc(db, "users", user.uid);
  const commentSnapshot = await getDocs(collection(db, "bugs", current.id, "comments"));
  for (let index = 0; index < commentSnapshot.docs.length; index += 450) {
    const batch = writeBatch(db);
    commentSnapshot.docs.slice(index, index + 450).forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }

  await runTransaction(db, async (transaction) => {
    const bugSnapshot = await transaction.get(bugRef);
    if (!bugSnapshot.exists()) throw new Error("Bug niet gevonden.");
    const fresh = normalizeBug(bugSnapshot.data() as BugReport, bugSnapshot.id);
    if (fresh.reporterId !== user.uid) throw new Error("Je kunt alleen je eigen bugs verwijderen.");

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    const currentUser = userSnapshot.data() as User;
    const totalPoints = Math.max(0, currentUser.totalPoints - fresh.points);
    const bugCount = Math.max(0, currentUser.bugCount - (fresh.reportType === "bug" ? 1 : 0));
    const updatedUser = { ...currentUser, totalPoints, bugCount, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);

    transaction.update(userRef, {
      totalPoints,
      bugCount,
      title: updatedUser.title,
      badges: updatedUser.badges
    });
    transaction.delete(bugRef);
  });
}

export async function listBugComments(bugId: string): Promise<BugComment[]> {
  if (!isFirebaseConfigured) {
    return demoComments.filter((comment) => comment.bugId === bugId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const snapshot = await getDocs(query(collection(db, "bugs", bugId, "comments"), orderBy("createdAt", "asc")));
  return snapshot.docs.map((item) => ({ ...(item.data() as BugComment), id: item.id, bugId }));
}

export async function addBugComment(bug: BugReport, user: User, text: string, reaction: string): Promise<BugComment> {
  const trimmed = text.trim();
  if (!trimmed && !reaction) throw new Error("Kies een reactie of typ commentaar.");
  if (trimmed.length > 500) throw new Error("Commentaar mag maximaal 500 tekens zijn.");

  const now = new Date().toISOString();
  const baseComment: BugComment = {
    id: `comment-${Date.now()}`,
    bugId: bug.id,
    authorId: user.uid,
    authorName: user.displayName,
    text: trimmed,
    reaction,
    createdAt: now
  };

  if (!isFirebaseConfigured) {
    demoComments.push(baseComment);
    await applyUserPoints(user.uid, commentPointValue, 0);
    return baseComment;
  }

  const ref = doc(collection(db, "bugs", bug.id, "comments"));
  const comment = { ...baseComment, id: ref.id };
  await setDoc(ref, comment);
  await syncEngagementPoints(user);
  return comment;
}
