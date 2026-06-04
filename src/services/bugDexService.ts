import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, User } from "../types";
import { badgesForUser, BugDexEntry, BugDexRarity, bugDexEntries, titleForPoints } from "./pointsService";

export type BugDexDropSource =
  | "daily_login"
  | "bug_reported"
  | "comment"
  | "status_update"
  | "bug_fixed"
  | "upvote_given"
  | "profile_view"
  | "bug_splat"
  | "weekly_mission"
  | "combine";

export type BugDexDropResult = {
  rewardType: "bug";
  entry: BugDexEntry;
  item: BugDexInventoryItem;
  isNew: boolean;
  source: BugDexDropSource;
  streakDay?: number;
  daysUntilBetterReward?: number;
  updatedUser?: User;
} | {
  rewardType: "points";
  points: number;
  isNew: false;
  source: BugDexDropSource;
  streakDay?: number;
  daysUntilBetterReward?: number;
  updatedUser?: User;
};

const demoInventory = new Map<string, Map<string, BugDexInventoryItem>>();
const demoEvents = new Set<string>();
const demoDailyStreaks = new Map<string, number>();

const dailyPointReward = 5;
const dailyStreakLength = 5;

const dropChances: Record<BugDexDropSource, number> = {
  daily_login: 0.35,
  bug_reported: 0.58,
  comment: 0.24,
  status_update: 0.22,
  bug_fixed: 0.45,
  upvote_given: 0.18,
  profile_view: 0.08,
  bug_splat: 0.35,
  weekly_mission: 1,
  combine: 1
};

const rarityWeights: Record<BugDexDropSource, Array<[BugDexRarity, number]>> = {
  daily_login: [["Gewoon", 76], ["Zeldzaam", 24]],
  bug_reported: [["Gewoon", 58], ["Zeldzaam", 31], ["Episch", 11]],
  comment: [["Gewoon", 68], ["Zeldzaam", 27], ["Episch", 5]],
  status_update: [["Zeldzaam", 70], ["Episch", 30]],
  bug_fixed: [["Zeldzaam", 45], ["Episch", 45], ["Legendarisch", 10]],
  upvote_given: [["Gewoon", 75], ["Zeldzaam", 25]],
  profile_view: [["Gewoon", 88], ["Zeldzaam", 12]],
  bug_splat: [["Gewoon", 88], ["Zeldzaam", 12]],
  weekly_mission: [["Episch", 78], ["Legendarisch", 22]],
  combine: [["Zeldzaam", 100]]
};

const legendaryPools: Partial<Record<BugDexDropSource, string[]>> = {
  bug_fixed: ["mestkever", "termiet", "schorpioen"],
  weekly_mission: ["neushoornkever", "atlaskever", "herculeskever", "goliathkever"]
};

export function entryByBugId(bugId: string): BugDexEntry | undefined {
  return bugDexEntries.find((entry) => entry.id === bugId);
}

export function bugDexInventoryMap(items: BugDexInventoryItem[]): Record<string, BugDexInventoryItem> {
  return Object.fromEntries(items.map((item) => [item.bugId, item]));
}

export async function listBugDexInventory(user: User): Promise<BugDexInventoryItem[]> {
  if (!isFirebaseConfigured) {
    return Array.from(demoInventory.get(user.uid)?.values() ?? [])
      .filter((item) => item.count > 0)
      .sort((a, b) => b.lastUnlockedAt.localeCompare(a.lastUnlockedAt));
  }

  const snapshot = await getDocs(query(collection(db, "users", user.uid, "bugdex"), orderBy("lastUnlockedAt", "desc")));
  return snapshot.docs.map((item) => item.data() as BugDexInventoryItem).filter((item) => item.count > 0);
}

export async function countBugDexInventory(userOrUid: Pick<User, "uid"> | string): Promise<number> {
  const uid = typeof userOrUid === "string" ? userOrUid : userOrUid.uid;
  if (!isFirebaseConfigured) {
    return Array.from(demoInventory.get(uid)?.values() ?? []).filter((item) => item.count > 0).length;
  }

  const snapshot = await getDocs(collection(db, "users", uid, "bugdex"));
  return snapshot.docs.filter((item) => {
    const data = item.data() as BugDexInventoryItem;
    return data.count > 0;
  }).length;
}

export async function claimDailyLoginBug(user: User): Promise<BugDexDropResult | null> {
  const day = localDayId();
  const previousDay = localDayId(addDays(new Date(), -1));
  const eventId = `daily-login-${day}`;
  const previousEventId = `daily-login-${previousDay}`;
  const demoKey = `${user.uid}:${eventId}`;

  if (!isFirebaseConfigured) {
    if (demoEvents.has(demoKey)) return null;
    demoEvents.add(demoKey);
    const streakDay = demoEvents.has(`${user.uid}:${previousEventId}`) ? (demoDailyStreaks.get(user.uid) ?? 0) + 1 : 1;
    demoDailyStreaks.set(user.uid, streakDay);
    return grantDailyReward(user, streakDay);
  }

  const eventRef = doc(db, "users", user.uid, "bugdexEvents", eventId);
  const previousEventRef = doc(db, "users", user.uid, "bugdexEvents", previousEventId);
  const userRef = doc(db, "users", user.uid);
  return runTransaction(db, async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists()) return null;

    const previousEventSnapshot = await transaction.get(previousEventRef);
    const previousStreak = previousEventSnapshot.exists() ? Number(previousEventSnapshot.data().streakDay ?? 0) : 0;
    const streakDay = previousStreak + 1;
    const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
    const isStreakReward = streakDay % dailyStreakLength === 0;
    const now = new Date().toISOString();

    if (isStreakReward || Math.random() < 0.42) {
      const entry = isStreakReward ? pickDailyStreakEntry() : pickDailyBaseEntry();
      const inventoryRef = doc(db, "users", user.uid, "bugdex", entry.id);
      const inventorySnapshot = await transaction.get(inventoryRef);
      const existing = inventorySnapshot.exists() ? inventorySnapshot.data() as BugDexInventoryItem : null;
      const item: BugDexInventoryItem = existing
        ? { ...existing, count: existing.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, "daily_login"])) }
        : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: ["daily_login"] };

      transaction.set(inventoryRef, item);
      transaction.set(eventRef, {
        id: eventId,
        source: "daily_login",
        rewardType: "bug",
        rewardValue: entry.id,
        streakDay,
        localDay: day,
        createdAt: now
      });
      return { rewardType: "bug", entry, item, isNew: !existing, source: "daily_login", streakDay, daysUntilBetterReward };
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    const current = userSnapshot.data() as User;
    const totalPoints = Math.max(0, current.totalPoints + dailyPointReward);
    const updatedUser = { ...current, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);

    transaction.update(userRef, {
      active: true,
      totalPoints: updatedUser.totalPoints,
      title: updatedUser.title,
      badges: updatedUser.badges
    });
    transaction.set(eventRef, {
      id: eventId,
      source: "daily_login",
      rewardType: "points",
      rewardValue: dailyPointReward,
      streakDay,
      localDay: day,
      createdAt: now
    });
    return {
      rewardType: "points",
      points: dailyPointReward,
      isNew: false,
      source: "daily_login",
      streakDay,
      daysUntilBetterReward,
      updatedUser
    };
  });
}

export async function rollBugDexDrop(user: User, source: BugDexDropSource): Promise<BugDexDropResult | null> {
  if (Math.random() > dropChances[source]) return null;
  const entry = pickEntry(source);
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const existing = inventory.get(entry.id);
    const item = existing
      ? {
          ...existing,
          count: existing.count + 1,
          lastUnlockedAt: now,
          sources: Array.from(new Set([...existing.sources, source]))
        }
      : {
          bugId: entry.id,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: entry.rarity,
          sources: [source]
        };
    inventory.set(entry.id, item);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  }

  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? snapshot.data() as BugDexInventoryItem : null;
    const item: BugDexInventoryItem = existing
      ? {
          ...existing,
          count: existing.count + 1,
          lastUnlockedAt: now,
          sources: Array.from(new Set([...existing.sources, source]))
        }
      : {
          bugId: entry.id,
          count: 1,
          firstUnlockedAt: now,
          lastUnlockedAt: now,
          rarity: entry.rarity,
          sources: [source]
        };
    transaction.set(ref, item);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  });
}

export async function combineBugDexDuplicates(user: User, bugId: string): Promise<BugDexDropResult> {
  const sourceEntry = entryByBugId(bugId);
  if (!sourceEntry) throw new Error("Bug niet gevonden.");
  const targetRarity = nextRarity(sourceEntry.rarity);
  if (!targetRarity) throw new Error("Deze bug is al maximaal zeldzaam.");
  const requiredCount = combineRequiredCount(sourceEntry.rarity);
  const currentInventory = await listBugDexInventory(user);
  const targetEntry = pickCombineTarget(targetRarity, currentInventory);
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const sourceItem = inventory.get(bugId);
    if (!sourceItem || sourceItem.count < requiredCount) throw new Error(`Je hebt x${requiredCount} nodig om te combineren.`);
    const nextSourceCount = Math.max(1, sourceItem.count - requiredCount + 1);
    inventory.set(bugId, { ...sourceItem, count: nextSourceCount, lastUnlockedAt: now });
    const existingTarget = inventory.get(targetEntry.id);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: existingTarget.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    inventory.set(targetEntry.id, targetItem);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  }

  const sourceRef = doc(db, "users", user.uid, "bugdex", bugId);
  const targetRef = doc(db, "users", user.uid, "bugdex", targetEntry.id);
  return runTransaction(db, async (transaction) => {
    const sourceSnapshot = await transaction.get(sourceRef);
    if (!sourceSnapshot.exists()) throw new Error("Bug niet gevonden.");
    const sourceItem = sourceSnapshot.data() as BugDexInventoryItem;
    if (sourceItem.count < requiredCount) throw new Error(`Je hebt x${requiredCount} nodig om te combineren.`);

    const targetSnapshot = await transaction.get(targetRef);
    const existingTarget = targetSnapshot.exists() ? targetSnapshot.data() as BugDexInventoryItem : null;
    const nextSourceCount = Math.max(1, sourceItem.count - requiredCount + 1);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: existingTarget.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    transaction.set(sourceRef, { ...sourceItem, count: nextSourceCount, lastUnlockedAt: now });
    transaction.set(targetRef, targetItem);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  });
}

async function grantDailyReward(user: User, streakDay: number): Promise<BugDexDropResult> {
  const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
  const isStreakReward = streakDay % dailyStreakLength === 0;
  if (isStreakReward || Math.random() < 0.42) {
    const entry = isStreakReward ? pickDailyStreakEntry() : pickDailyBaseEntry();
    const result = await grantSpecificBug(user, entry, "daily_login");
    return { ...result, streakDay, daysUntilBetterReward };
  }
  const updatedUser = await grantDailyPoints(user, dailyPointReward);
  return {
    rewardType: "points",
    points: dailyPointReward,
    isNew: false,
    source: "daily_login",
    streakDay,
    daysUntilBetterReward,
    updatedUser
  };
}

async function grantSpecificBug(user: User, entry: BugDexEntry, source: BugDexDropSource): Promise<BugDexDropResult> {
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const existing = inventory.get(entry.id);
    const item = existing
      ? { ...existing, count: existing.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    inventory.set(entry.id, item);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  }

  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? snapshot.data() as BugDexInventoryItem : null;
    const item: BugDexInventoryItem = existing
      ? { ...existing, count: existing.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    transaction.set(ref, item);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  });
}

async function grantDailyPoints(user: User, points: number): Promise<User> {
  const totalPoints = Math.max(0, user.totalPoints + points);
  const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
  updated.badges = badgesForUser(updated);

  if (!isFirebaseConfigured) return updated;

  await setDoc(doc(db, "users", user.uid), {
    totalPoints: updated.totalPoints,
    title: updated.title,
    badges: updated.badges,
    active: true
  }, { merge: true });
  return updated;
}

function pickDailyBaseEntry(): BugDexEntry {
  const rarity: BugDexRarity = Math.random() < 0.82 ? "Gewoon" : "Zeldzaam";
  return pickFrom(bugDexEntries.filter((entry) => entry.rarity === rarity)) ?? bugDexEntries[0];
}

function pickDailyStreakEntry(): BugDexEntry {
  const rarity: BugDexRarity = Math.random() < 0.82 ? "Zeldzaam" : "Episch";
  return pickFrom(bugDexEntries.filter((entry) => entry.rarity === rarity)) ?? bugDexEntries[0];
}

function daysUntilNextDailyStreakReward(streakDay: number): number {
  const remainder = streakDay % dailyStreakLength;
  return remainder === 0 ? dailyStreakLength : dailyStreakLength - remainder;
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function combineRequiredCount(rarity: BugDexRarity): number {
  if (rarity === "Gewoon") return 3;
  if (rarity === "Zeldzaam") return 4;
  if (rarity === "Episch") return 5;
  return Number.POSITIVE_INFINITY;
}

function nextRarity(rarity: BugDexRarity): BugDexRarity | null {
  if (rarity === "Gewoon") return "Zeldzaam";
  if (rarity === "Zeldzaam") return "Episch";
  if (rarity === "Episch") return "Legendarisch";
  return null;
}

function pickCombineTarget(rarity: BugDexRarity, inventory: BugDexInventoryItem[]): BugDexEntry {
  const ownedIds = new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId));
  const candidates = bugDexEntries.filter((entry) => entry.rarity === rarity);
  const undiscovered = candidates.filter((entry) => !ownedIds.has(entry.id));
  return pickFrom(undiscovered) ?? pickFrom(candidates) ?? bugDexEntries[0];
}

function pickEntry(source: BugDexDropSource): BugDexEntry {
  const rarity = pickRarity(source);
  if (rarity === "Legendarisch") {
    const specialIds = legendaryPools[source] ?? [];
    const special = pickFrom(specialIds.map((id) => entryByBugId(id)).filter((entry): entry is BugDexEntry => Boolean(entry)));
    if (special) return special;
  }
  return pickFrom(bugDexEntries.filter((entry) => entry.rarity === rarity)) ?? bugDexEntries[0];
}

function pickRarity(source: BugDexDropSource): BugDexRarity {
  const weights = rarityWeights[source];
  const roll = Math.random() * weights.reduce((total, [, weight]) => total + weight, 0);
  let cursor = 0;
  for (const [rarity, weight] of weights) {
    cursor += weight;
    if (roll <= cursor) return rarity;
  }
  return weights[0][0];
}

function pickFrom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}
