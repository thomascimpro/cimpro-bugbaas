import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, writeBatch } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, User } from "../types";
import { bugLampStatus, shouldAwardBugLamp, withAwardedBugLamp } from "./bugLampService";
import { activeBugSquadBonuses } from "./bugSquadService";
import { BugDexEntry, BugDexRarity, bugDexEntries, isBugDexEntryUnlocked } from "./pointsService";

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
  | "duel_win"
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

const dailyStreakLength = 5;
const upgradeSourceRarities: Array<Exclude<BugDexRarity, "Mythisch">> = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch"];

export type UpgradeRouteId = "Gewoon-Zeldzaam" | "Zeldzaam-Episch" | "Episch-Legendarisch" | "Legendarisch-Mythisch";
export type DailyUpgradeUsage = Record<UpgradeRouteId, boolean>;

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
  duel_win: 1,
  combine: 1
};

const rarityWeights: Record<BugDexDropSource, Array<[BugDexRarity, number]>> = {
  daily_login: [["Gewoon", 100]],
  bug_reported: [["Gewoon", 54], ["Zeldzaam", 31], ["Episch", 12], ["Legendarisch", 2.5], ["Mythisch", 0.5]],
  comment: [["Gewoon", 68], ["Zeldzaam", 27], ["Episch", 4.7], ["Legendarisch", 0.3]],
  status_update: [["Zeldzaam", 67], ["Episch", 30], ["Legendarisch", 2.7], ["Mythisch", 0.3]],
  bug_fixed: [["Zeldzaam", 40], ["Episch", 43], ["Legendarisch", 15], ["Mythisch", 2]],
  upvote_given: [["Gewoon", 75], ["Zeldzaam", 24.5], ["Episch", 0.5]],
  profile_view: [["Gewoon", 88], ["Zeldzaam", 12]],
  bug_splat: [["Gewoon", 65], ["Zeldzaam", 25], ["Episch", 7.5], ["Legendarisch", 2], ["Mythisch", 0.5]],
  weekly_mission: [["Episch", 72], ["Legendarisch", 25], ["Mythisch", 3]],
  duel_win: [["Gewoon", 58], ["Zeldzaam", 28], ["Episch", 10], ["Legendarisch", 3], ["Mythisch", 1]],
  combine: [["Zeldzaam", 100]]
};

const legendaryPools: Partial<Record<BugDexDropSource, string[]>> = {
  bug_fixed: ["mestkever", "termiet", "schorpioen"],
  weekly_mission: ["neushoornkever", "atlaskever", "herculeskever", "goliathkever"]
};

const mythicPools: Partial<Record<BugDexDropSource, string[]>> = {
  bug_fixed: ["picasso-wants", "giraffekevertje", "glorieuze-scarabee"],
  bug_reported: ["roze-esdoornmot", "picasso-wants", "lantaarndrager"],
  bug_splat: ["zonsondergangsmot", "doornbloembidsprinkhaan", "glorieuze-scarabee"],
  status_update: ["giraffekevertje", "lantaarndrager"],
  weekly_mission: ["koningin-alexandravlinder", "zonsondergangsmot", "doornbloembidsprinkhaan", "glorieuze-scarabee"]
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

export async function syncPointUnlockedBugDex(user: Pick<User, "uid" | "totalPoints" | "bugCount">): Promise<void> {
  const unlockedEntries = bugDexEntries.filter((entry) => isBugDexEntryUnlocked(entry, user));
  if (!unlockedEntries.length) return;
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    for (const entry of unlockedEntries) {
      if (inventory.has(entry.id)) continue;
      inventory.set(entry.id, {
        bugId: entry.id,
        count: 1,
        firstUnlockedAt: now,
        lastUnlockedAt: now,
        rarity: entry.rarity,
        sources: ["rank_unlock"]
      });
    }
    demoInventory.set(user.uid, inventory);
    return;
  }

  const snapshot = await getDocs(collection(db, "users", user.uid, "bugdex"));
  const existingIds = new Set(snapshot.docs.map((item) => item.id));
  const missingEntries = unlockedEntries.filter((entry) => !existingIds.has(entry.id));
  if (!missingEntries.length) return;

  const batch = writeBatch(db);
  for (const entry of missingEntries) {
    batch.set(doc(db, "users", user.uid, "bugdex", entry.id), {
      bugId: entry.id,
      count: 1,
      firstUnlockedAt: now,
      lastUnlockedAt: now,
      rarity: entry.rarity,
      sources: ["rank_unlock"]
    } satisfies BugDexInventoryItem);
  }
  await batch.commit();
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

export async function getDailyUpgradeUsage(user: User): Promise<DailyUpgradeUsage> {
  const day = localDayId();
  const entries = upgradeSourceRarities.map((rarity) => {
    const targetRarity = nextRarity(rarity);
    if (!targetRarity) throw new Error("Ongeldige upgrade-route.");
    return [upgradeRouteId(rarity, targetRarity), upgradeEventId(day, rarity, targetRarity)] as const;
  });
  const dailyEventId = dailyUpgradeEventId(day);

  if (!isFirebaseConfigured) {
    const usedToday = demoEvents.has(`${user.uid}:${dailyEventId}`)
      || entries.some(([, eventId]) => demoEvents.has(`${user.uid}:${eventId}`));
    return Object.fromEntries(entries.map(([routeId]) => [routeId, usedToday])) as DailyUpgradeUsage;
  }

  const snapshots = await Promise.all([
    getDoc(doc(db, "users", user.uid, "bugdexEvents", dailyEventId)),
    ...entries.map(([, eventId]) => getDoc(doc(db, "users", user.uid, "bugdexEvents", eventId)))
  ]);
  const usedToday = snapshots.some((snapshot) => snapshot.exists());
  return Object.fromEntries(entries.map(([routeId]) => [routeId, usedToday])) as DailyUpgradeUsage;
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
  return runTransaction(db, async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists()) return null;

    const previousEventSnapshot = await transaction.get(previousEventRef);
    const previousStreak = previousEventSnapshot.exists() ? Number(previousEventSnapshot.data().streakDay ?? 0) : 0;
    const streakDay = previousStreak + 1;
    const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
    const now = new Date().toISOString();
    const entry = pickDailyCommonEntry();
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await transaction.get(userRef);
    const currentUser = userSnapshot.exists() ? userSnapshot.data() as User : user;
    const updatedUser = shouldAwardBugLamp(streakDay) ? withAwardedBugLamp(currentUser) : undefined;
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
      bugLampAwarded: Boolean(updatedUser),
      streakDay,
      localDay: day,
      createdAt: now
    });
    if (updatedUser) transaction.update(userRef, { bugLampCount: updatedUser.bugLampCount });
    return { rewardType: "bug", entry, item, isNew: !existing, source: "daily_login", streakDay, daysUntilBetterReward, updatedUser };
  });
}

export async function rollBugDexDrop(user: User, source: BugDexDropSource): Promise<BugDexDropResult | null> {
  const bonuses = activeBugSquadBonuses(user);
  const chanceBoost = sourceChanceBoost(source, bonuses);
  if (Math.random() > Math.min(0.95, dropChances[source] * (1 + chanceBoost))) return null;
  const entry = pickEntry(source, bonuses.radar_rarity + bugLampStatus(user).rarityBoost);
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

export async function rollSpecificBugDexDrop(user: User, bugId: string, source: BugDexDropSource, chance = 0.16): Promise<BugDexDropResult | null> {
  const entry = entryByBugId(bugId);
  if (!entry || Math.random() > chance) return null;
  return grantSpecificBug(user, entry, source);
}

export async function grantBugDexReward(user: User, source: BugDexDropSource): Promise<BugDexDropResult> {
  return grantSpecificBug(user, pickEntry(source, activeBugSquadBonuses(user).radar_rarity + bugLampStatus(user).rarityBoost), source);
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
  const day = localDayId();
  const dailyEventId = dailyUpgradeEventId(day);

  if (!isFirebaseConfigured) {
    if (hasDemoUpgradeUsedToday(user.uid, day)) throw new Error("Vandaag is al een upgrade gebruikt.");
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
    demoEvents.add(`${user.uid}:${dailyEventId}`);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  }

  const sourceRef = doc(db, "users", user.uid, "bugdex", bugId);
  const targetRef = doc(db, "users", user.uid, "bugdex", targetEntry.id);
  const dailyEventRef = doc(db, "users", user.uid, "bugdexEvents", dailyEventId);
  const legacyRouteEventRefs = getUpgradeEventIdsForDay(day).map((eventId) => doc(db, "users", user.uid, "bugdexEvents", eventId));
  return runTransaction(db, async (transaction) => {
    const upgradeEventSnapshots = await Promise.all([transaction.get(dailyEventRef), ...legacyRouteEventRefs.map((ref) => transaction.get(ref))]);
    if (upgradeEventSnapshots.some((snapshot) => snapshot.exists())) throw new Error("Vandaag is al een upgrade gebruikt.");
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
    transaction.set(dailyEventRef, upgradeEventPayload(dailyEventId, sourceEntry.rarity, targetRarity, targetEntry.id, now));
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  });
}

export async function combineDifferentBugDexUpgrade(user: User, bugIds: string[]): Promise<BugDexDropResult> {
  const uniqueBugIds = Array.from(new Set(bugIds));
  if (uniqueBugIds.length !== 3) throw new Error("Kies 3 verschillende bugs.");
  const sourceEntries = uniqueBugIds.map(entryByBugId);
  if (sourceEntries.some((entry) => !entry)) throw new Error("Bug niet gevonden.");
  const sourceRarity = sourceEntries[0]?.rarity;
  if (!sourceRarity || sourceEntries.some((entry) => entry?.rarity !== sourceRarity)) throw new Error("Kies 3 bugs van dezelfde rarity.");
  const targetRarity = nextRarity(sourceRarity);
  if (!targetRarity) throw new Error("Mythisch kan niet verder upgraden.");

  const currentInventory = await listBugDexInventory(user);
  const targetEntry = pickCombineTarget(targetRarity, currentInventory);
  const now = new Date().toISOString();
  const day = localDayId();
  const dailyEventId = dailyUpgradeEventId(day);

  if (!isFirebaseConfigured) {
    if (hasDemoUpgradeUsedToday(user.uid, day)) throw new Error("Vandaag is al een upgrade gebruikt.");
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    for (const bugId of uniqueBugIds) {
      const item = inventory.get(bugId);
      if (!item || item.count < 1) throw new Error("Je mist een gekozen bug.");
    }
    for (const bugId of uniqueBugIds) {
      const item = inventory.get(bugId);
      if (!item) continue;
      inventory.set(bugId, { ...item, count: item.count - 1, lastUnlockedAt: now });
    }
    const existingTarget = inventory.get(targetEntry.id);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: existingTarget.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    inventory.set(targetEntry.id, targetItem);
    demoEvents.add(`${user.uid}:${dailyEventId}`);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  }

  const sourceRefs = uniqueBugIds.map((bugId) => doc(db, "users", user.uid, "bugdex", bugId));
  const targetRef = doc(db, "users", user.uid, "bugdex", targetEntry.id);
  const dailyEventRef = doc(db, "users", user.uid, "bugdexEvents", dailyEventId);
  const legacyRouteEventRefs = getUpgradeEventIdsForDay(day).map((eventId) => doc(db, "users", user.uid, "bugdexEvents", eventId));
  return runTransaction(db, async (transaction) => {
    const upgradeEventSnapshots = await Promise.all([transaction.get(dailyEventRef), ...legacyRouteEventRefs.map((ref) => transaction.get(ref))]);
    if (upgradeEventSnapshots.some((snapshot) => snapshot.exists())) throw new Error("Vandaag is al een upgrade gebruikt.");
    const sourceSnapshots = await Promise.all(sourceRefs.map((ref) => transaction.get(ref)));
    const sourceItems = sourceSnapshots.map((snapshot) => snapshot.exists() ? snapshot.data() as BugDexInventoryItem : null);
    if (sourceItems.some((item) => !item || item.count < 1)) throw new Error("Je mist een gekozen bug.");

    const targetSnapshot = await transaction.get(targetRef);
    const existingTarget = targetSnapshot.exists() ? targetSnapshot.data() as BugDexInventoryItem : null;
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: existingTarget.count + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };

    sourceItems.forEach((item, index) => {
      if (!item) return;
      transaction.set(sourceRefs[index], { ...item, count: item.count - 1, lastUnlockedAt: now });
    });
    transaction.set(targetRef, targetItem);
    transaction.set(dailyEventRef, upgradeEventPayload(dailyEventId, sourceRarity, targetRarity, targetEntry.id, now));
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  });
}

async function grantDailyReward(user: User, streakDay: number): Promise<BugDexDropResult> {
  const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
  const result = await grantSpecificBug(user, pickDailyCommonEntry(), "daily_login");
  const updatedUser = shouldAwardBugLamp(streakDay) ? withAwardedBugLamp(user) : undefined;
  return { ...result, streakDay, daysUntilBetterReward, updatedUser };
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

function pickDailyCommonEntry(): BugDexEntry {
  return pickFrom(bugDexEntries.filter((entry) => entry.rarity === "Gewoon")) ?? bugDexEntries[0];
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

function upgradeRouteId(sourceRarity: BugDexRarity, targetRarity: BugDexRarity): UpgradeRouteId {
  return `${sourceRarity}-${targetRarity}` as UpgradeRouteId;
}

function dailyUpgradeEventId(day: string): string {
  return `upgrade-${day}`;
}

function upgradeEventId(day: string, sourceRarity: BugDexRarity, targetRarity: BugDexRarity): string {
  return `upgrade-${day}-${sourceRarity}-to-${targetRarity}`;
}

function getUpgradeEventIdsForDay(day: string): string[] {
  return upgradeSourceRarities.map((rarity) => {
    const targetRarity = nextRarity(rarity);
    if (!targetRarity) throw new Error("Ongeldige upgrade-route.");
    return upgradeEventId(day, rarity, targetRarity);
  });
}

function hasDemoUpgradeUsedToday(uid: string, day: string): boolean {
  return demoEvents.has(`${uid}:${dailyUpgradeEventId(day)}`)
    || getUpgradeEventIdsForDay(day).some((eventId) => demoEvents.has(`${uid}:${eventId}`));
}

function upgradeEventPayload(id: string, sourceRarity: BugDexRarity, targetRarity: BugDexRarity, targetBugId: string, createdAt: string) {
  return {
    id,
    source: "combine",
    rewardType: "bug",
    rewardValue: targetBugId,
    sourceRarity,
    targetRarity,
    localDay: localDayId(),
    createdAt
  };
}

export function combineRequiredCount(rarity: BugDexRarity): number {
  if (rarity === "Gewoon") return 3;
  if (rarity === "Zeldzaam") return 4;
  if (rarity === "Episch") return 5;
  if (rarity === "Legendarisch") return 6;
  return Number.POSITIVE_INFINITY;
}

function nextRarity(rarity: BugDexRarity): BugDexRarity | null {
  if (rarity === "Gewoon") return "Zeldzaam";
  if (rarity === "Zeldzaam") return "Episch";
  if (rarity === "Episch") return "Legendarisch";
  if (rarity === "Legendarisch") return "Mythisch";
  return null;
}

function pickCombineTarget(rarity: BugDexRarity, inventory: BugDexInventoryItem[]): BugDexEntry {
  const ownedIds = new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId));
  const candidates = bugDexEntries.filter((entry) => entry.rarity === rarity);
  const undiscovered = candidates.filter((entry) => !ownedIds.has(entry.id));
  return pickFrom(undiscovered) ?? pickFrom(candidates) ?? bugDexEntries[0];
}

function pickEntry(source: BugDexDropSource, rarityBoost = 0): BugDexEntry {
  const rarity = pickRarity(source, rarityBoost);
  if (rarity === "Mythisch") {
    const specialIds = mythicPools[source] ?? [];
    const special = pickFrom(specialIds.map((id) => entryByBugId(id)).filter((entry): entry is BugDexEntry => Boolean(entry)));
    if (special) return special;
  }
  if (rarity === "Legendarisch") {
    const specialIds = legendaryPools[source] ?? [];
    const special = pickFrom(specialIds.map((id) => entryByBugId(id)).filter((entry): entry is BugDexEntry => Boolean(entry)));
    if (special) return special;
  }
  return pickFrom(bugDexEntries.filter((entry) => entry.rarity === rarity)) ?? bugDexEntries[0];
}

function pickRarity(source: BugDexDropSource, rarityBoost = 0): BugDexRarity {
  const weights = boostedRarityWeights(rarityWeights[source], rarityBoost);
  const roll = Math.random() * weights.reduce((total, [, weight]) => total + weight, 0);
  let cursor = 0;
  for (const [rarity, weight] of weights) {
    cursor += weight;
    if (roll <= cursor) return rarity;
  }
  return weights[0][0];
}

function boostedRarityWeights(weights: Array<[BugDexRarity, number]>, rarityBoost: number): Array<[BugDexRarity, number]> {
  const boost = Math.max(0, Math.min(0.05, rarityBoost));
  if (boost <= 0) return weights;
  const commonIndex = weights.findIndex(([rarity]) => rarity === "Gewoon");
  if (commonIndex < 0) return weights;

  const nextWeights = weights.map(([rarity, weight]) => [rarity, weight] as [BugDexRarity, number]);
  const total = nextWeights.reduce((sum, [, weight]) => sum + weight, 0);
  const shift = Math.min(nextWeights[commonIndex][1], total * boost);
  nextWeights[commonIndex][1] -= shift;

  const rareIndex = nextWeights.findIndex(([rarity]) => rarity === "Zeldzaam");
  const epicIndex = nextWeights.findIndex(([rarity]) => rarity === "Episch");
  if (rareIndex >= 0) nextWeights[rareIndex][1] += shift * 0.65;
  if (epicIndex >= 0) nextWeights[epicIndex][1] += shift * 0.35;
  if (rareIndex < 0 && epicIndex < 0) nextWeights[commonIndex][1] += shift;
  return nextWeights;
}

function sourceChanceBoost(source: BugDexDropSource, bonuses: ReturnType<typeof activeBugSquadBonuses>): number {
  const base = bonuses.radar_spawn;
  const boost = source === "bug_reported"
    ? base + bonuses.focus_boost + bonuses.knowledge_boost
    : source === "comment" || source === "upvote_given"
      ? base + bonuses.support_boost
      : source === "status_update" || source === "bug_fixed"
        ? base + bonuses.focus_boost
        : source === "weekly_mission"
          ? base + bonuses.quest_boost
          : base;
  return Math.min(0.15, boost);
}

function pickFrom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}
