import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, getDocs, runTransaction, setDoc, writeBatch, type Transaction } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, BugDexUnlock, User } from "../types";
import { bugLampStatus, shouldAwardBugLamp, withAwardedBugLamp } from "./bugLampService";
import { activeBugSquadBonuses } from "./bugSquadService";
import { badgesForUser, BugDexEntry, BugDexRarity, bugDexEntries, isBugDexEntryUnlocked, titleForPoints } from "./pointsService";
import { dailyLoginXp } from "./rewardBalanceService";
import { legacyRewardPolicy } from "./legacyRewardPolicy";
import { syncResearchProgress } from "./researchTargetService";
import { starterBoostedXp } from "./starterBoostService";

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
  | "weekly_mission_common"
  | "weekly_mission_rare"
  | "weekly_mission_epic"
  | "daily_mission_bonus"
  | "solo_boss_common"
  | "solo_boss_rare"
  | "solo_campaign_clear"
  | "duel_win"
  | "rank_up"
  | "buddy_common"
  | "buddy_rare"
  | "buddy_epic"
  | "bug_brain_daily"
  | "real_bug_scan"
  | "museum_reward"
  | "research_encounter"
  | "weekly_field_spotlight"
  | "weekly_scan_contest"
  | "swarm_event"
  | "movement_radar"
  | "duel_season"
  | "starter_boost"
  | "rank_unlock"
  | "combine";

export type BugDexDropResult = {
  rewardType: "bug";
  entry: BugDexEntry;
  item: BugDexInventoryItem;
  isNew: boolean;
  source: BugDexDropSource;
  sourceDetail?: string;
  streakDay?: number;
  daysUntilBetterReward?: number;
  updatedUser?: User;
} | {
  rewardType: "points";
  points: number;
  isNew: false;
  source: BugDexDropSource;
  sourceDetail?: string;
  streakDay?: number;
  daysUntilBetterReward?: number;
  updatedUser?: User;
};
export type BugDexBugDropResult = Extract<BugDexDropResult, { rewardType: "bug" }>;
export type RealBugScanRewardResult = BugDexBugDropResult & { awardedCopy: boolean; previousCount: number };

const demoInventory = new Map<string, Map<string, BugDexInventoryItem>>();
const demoUnlocks = new Map<string, Map<string, BugDexUnlock>>();
const demoEvents = new Set<string>();
const demoDailyStreaks = new Map<string, number>();
const inventoryCache = new Map<string, { at: number; items: BugDexInventoryItem[] }>();
const pendingPointUnlocks = new Map<string, BugDexDropResult[]>();
const ownInventoryCacheTtlMs = 2 * 60 * 1000;
const otherInventoryCacheTtlMs = 15 * 60 * 1000;

const dailyStreakLength = 5;
const upgradeSourceRarities: Array<Exclude<BugDexRarity, "Mythisch">> = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch"];

export const movementRadarRarityWeights: Array<[BugDexRarity, number]> = [
  ["Gewoon", 70],
  ["Zeldzaam", 24.4],
  ["Episch", 4.9],
  ["Legendarisch", 0.6],
  ["Mythisch", 0.1]
];

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
  weekly_mission_common: 1,
  weekly_mission_rare: 1,
  weekly_mission_epic: 1,
  daily_mission_bonus: 1,
  solo_boss_common: 1,
  solo_boss_rare: 1,
  solo_campaign_clear: 1,
  duel_win: 1,
  rank_up: 1,
  buddy_common: 1,
  buddy_rare: 1,
  buddy_epic: 1,
  bug_brain_daily: 1,
  real_bug_scan: 1,
  museum_reward: 1,
  research_encounter: 1,
  weekly_field_spotlight: 1,
  weekly_scan_contest: 1,
  swarm_event: 1,
  movement_radar: 1,
  duel_season: 1,
  starter_boost: 1,
  rank_unlock: 1,
  combine: 1
};

const rarityWeights: Record<BugDexDropSource, Array<[BugDexRarity, number]>> = {
  daily_login: [["Gewoon", 100]],
  bug_reported: [["Gewoon", 70], ["Zeldzaam", 24], ["Episch", 4.8], ["Legendarisch", 1.2]],
  comment: [["Gewoon", 73], ["Zeldzaam", 23.4], ["Episch", 3.5], ["Legendarisch", 0.1]],
  status_update: [["Gewoon", 71], ["Zeldzaam", 24], ["Episch", 4.5], ["Legendarisch", 0.5]],
  bug_fixed: [["Gewoon", 68], ["Zeldzaam", 24], ["Episch", 4.8], ["Legendarisch", 3.2]],
  upvote_given: [["Gewoon", 75.2], ["Zeldzaam", 24.5], ["Episch", 0.3]],
  profile_view: [["Gewoon", 88], ["Zeldzaam", 12]],
  bug_splat: [["Gewoon", 70], ["Zeldzaam", 24.4], ["Episch", 4.9], ["Legendarisch", 0.7]],
  weekly_mission: [["Gewoon", 72], ["Zeldzaam", 24], ["Episch", 3.5], ["Legendarisch", 0.5]],
  weekly_mission_common: [["Gewoon", 100]],
  weekly_mission_rare: [["Gewoon", 75], ["Zeldzaam", 24], ["Episch", 1]],
  weekly_mission_epic: [["Episch", 100]],
  daily_mission_bonus: [["Gewoon", 55], ["Zeldzaam", 35], ["Episch", 9], ["Legendarisch", 1]],
  solo_boss_common: [["Gewoon", 100]],
  solo_boss_rare: [["Gewoon", 75], ["Zeldzaam", 24], ["Episch", 1]],
  solo_campaign_clear: [["Gewoon", 75], ["Zeldzaam", 24], ["Episch", 1]],
  duel_win: [["Gewoon", 71], ["Zeldzaam", 24], ["Episch", 4.5], ["Legendarisch", 0.4], ["Mythisch", 0.1]],
  rank_up: [["Gewoon", 60], ["Zeldzaam", 32], ["Episch", 7], ["Legendarisch", 1]],
  buddy_common: [["Gewoon", 100]],
  buddy_rare: [["Zeldzaam", 100]],
  buddy_epic: [["Episch", 100]],
  bug_brain_daily: [["Zeldzaam", 100]],
  real_bug_scan: [["Gewoon", 100]],
  museum_reward: [["Mythisch", 100]],
  research_encounter: [["Gewoon", 100]],
  weekly_field_spotlight: [["Episch", 100]],
  weekly_scan_contest: [["Legendarisch", 100]],
  swarm_event: [["Legendarisch", 100]],
  movement_radar: movementRadarRarityWeights,
  duel_season: [["Mythisch", 100]],
  starter_boost: [["Gewoon", 70], ["Zeldzaam", 24.4], ["Episch", 4.9], ["Legendarisch", 0.7]],
  rank_unlock: [["Gewoon", 60], ["Zeldzaam", 32], ["Episch", 7], ["Legendarisch", 1]],
  combine: [["Zeldzaam", 100]]
};


export function entryByBugId(bugId: string): BugDexEntry | undefined {
  return bugDexEntries.find((entry) => entry.id === bugId);
}

export function bugDexInventoryMap(items: BugDexInventoryItem[]): Record<string, BugDexInventoryItem> {
  return Object.fromEntries(items.map((item) => [item.bugId, item]));
}

type InventoryCacheOptions = { force?: boolean; ttlMs?: number };

function inventoryCacheKey(uid: string): string {
  return `bugbaas:bugdexInventory:${uid}`;
}

function sortInventory(items: BugDexInventoryItem[]): BugDexInventoryItem[] {
  return [...items].sort((a, b) => b.lastUnlockedAt.localeCompare(a.lastUnlockedAt));
}

async function readStoredInventory(uid: string, ttlMs: number): Promise<BugDexInventoryItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(inventoryCacheKey(uid));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { at: number; items: BugDexInventoryItem[] };
    if (!cached || Date.now() - cached.at >= ttlMs || !Array.isArray(cached.items)) return null;
    return cached.items;
  } catch {
    return null;
  }
}

function writeStoredInventory(uid: string, items: BugDexInventoryItem[]): void {
  void AsyncStorage.setItem(inventoryCacheKey(uid), JSON.stringify({ at: Date.now(), items })).catch(() => undefined);
}

export function clearBugDexInventoryCache(uid?: string): void {
  if (uid) {
    inventoryCache.delete(uid);
    void AsyncStorage.removeItem(inventoryCacheKey(uid)).catch(() => undefined);
    return;
  }
  inventoryCache.clear();
}

export async function listBugDexInventory(user: User, options: InventoryCacheOptions = {}): Promise<BugDexInventoryItem[]> {
  if (!isFirebaseConfigured) {
    return sortInventory(mergeLegacyInventory(user, Array.from(demoInventory.get(user.uid)?.values() ?? []))
      .map((item) => normalizeInventoryItem(item.bugId, item))
      .filter(hasOwnedCount));
  }

  const isOwnUser = auth.currentUser?.uid === user.uid;
  const ttlMs = options.ttlMs ?? (isOwnUser ? ownInventoryCacheTtlMs : otherInventoryCacheTtlMs);
  if (!options.force) {
    const cached = inventoryCache.get(user.uid);
    if (cached && Date.now() - cached.at < ttlMs) return cached.items;
    const stored = await readStoredInventory(user.uid, ttlMs);
    if (stored) {
      inventoryCache.set(user.uid, { at: Date.now(), items: stored });
      return stored;
    }
  }

  const snapshot = await getDocs(collection(db, "users", user.uid, "bugdex"));
  const items = sortInventory(mergeLegacyInventory(user, snapshot.docs.map((item) => normalizeInventoryItem(item.id, item.data() as Partial<BugDexInventoryItem>)))
    .map((item) => normalizeInventoryItem(item.bugId, item))
    .filter(hasOwnedCount));
  inventoryCache.set(user.uid, { at: Date.now(), items });
  writeStoredInventory(user.uid, items);
  return items;
}

export async function listBugDexUnlocks(user: User): Promise<BugDexUnlock[]> {
  if (!isFirebaseConfigured) {
    const unlocks = demoUnlocks.get(user.uid) ?? new Map<string, BugDexUnlock>();
    for (const item of mergeLegacyInventory(user, Array.from(demoInventory.get(user.uid)?.values() ?? [])).map((item) => normalizeInventoryItem(item.bugId, item))) {
      if (!unlocks.has(item.bugId)) unlocks.set(item.bugId, bugDexUnlockFromInventory(item));
    }
    demoUnlocks.set(user.uid, unlocks);
    return Array.from(unlocks.values())
      .sort((a, b) => b.lastUnlockedAt.localeCompare(a.lastUnlockedAt));
  }

  const [inventorySnapshot, unlockSnapshot] = await Promise.all([
    getDocs(collection(db, "users", user.uid, "bugdex")),
    getDocs(collection(db, "users", user.uid, "bugdexUnlocks"))
  ]);
  const unlocks = new Map(unlockSnapshot.docs.map((item) => [item.id, normalizeUnlockItem(item.id, item.data() as Partial<BugDexUnlock>)]));
  const missingUnlocks = mergeLegacyInventory(user, inventorySnapshot.docs.map((item) => normalizeInventoryItem(item.id, item.data() as Partial<BugDexInventoryItem>)))
    .filter((item) => !unlocks.has(item.bugId))
    .map(bugDexUnlockFromInventory);

  if (missingUnlocks.length) {
    const batch = writeBatch(db);
    for (const item of missingUnlocks) {
      unlocks.set(item.bugId, item);
      batch.set(doc(db, "users", user.uid, "bugdexUnlocks", item.bugId), item);
    }
    await batch.commit().catch(() => undefined);
  }

  return Array.from(unlocks.values()).sort((a, b) => b.lastUnlockedAt.localeCompare(a.lastUnlockedAt));
}

export async function syncPointUnlockedBugDex(user: Pick<User, "uid" | "totalPoints" | "bugCount">): Promise<void> {
  const unlockedEntries = bugDexEntries.filter((entry) => entry.rarity !== "Mythisch" && isBugDexEntryUnlocked(entry, user));
  if (!unlockedEntries.length) return;
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    for (const entry of unlockedEntries) {
      if (inventory.has(entry.id)) continue;
      const item: BugDexInventoryItem = {
        bugId: entry.id,
        count: 1,
        firstUnlockedAt: now,
        lastUnlockedAt: now,
        rarity: entry.rarity,
        sources: ["rank_unlock"]
      };
      inventory.set(entry.id, item);
      queuePointUnlock(user.uid, { rewardType: "bug", entry, item, isNew: true, source: "rank_unlock" });
      updateDemoUnlock(user.uid, entry, "rank_unlock", now);
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
    const unlockRef = doc(db, "users", user.uid, "bugdexUnlocks", entry.id);
    const unlockSnapshot = await getDoc(unlockRef);
    const existingUnlock = unlockSnapshot.exists() ? unlockSnapshot.data() as BugDexUnlock : null;
    batch.set(doc(db, "users", user.uid, "bugdex", entry.id), {
      bugId: entry.id,
      count: 1,
      firstUnlockedAt: now,
      lastUnlockedAt: now,
      rarity: entry.rarity,
      sources: ["rank_unlock"]
    } satisfies BugDexInventoryItem);
    batch.set(unlockRef, bugDexUnlockItem(entry, "rank_unlock", now, existingUnlock));
  }
  await batch.commit();
  clearBugDexInventoryCache(user.uid);
  for (const entry of missingEntries) {
    const item: BugDexInventoryItem = { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: ["rank_unlock"] };
    queuePointUnlock(user.uid, { rewardType: "bug", entry, item, isNew: true, source: "rank_unlock" });
  }
}

export function takePendingPointUnlockedBugDex(uid: string): BugDexDropResult[] {
  const drops = pendingPointUnlocks.get(uid) ?? [];
  pendingPointUnlocks.delete(uid);
  return drops;
}

function queuePointUnlock(uid: string, drop: BugDexDropResult) {
  pendingPointUnlocks.set(uid, [...(pendingPointUnlocks.get(uid) ?? []), drop]);
}

export async function countBugDexInventory(userOrUid: Pick<User, "uid"> | string): Promise<number> {
  const uid = typeof userOrUid === "string" ? userOrUid : userOrUid.uid;
  if (!isFirebaseConfigured) {
    return Array.from(demoInventory.get(uid)?.values() ?? []).map((item) => normalizeInventoryItem(item.bugId, item)).filter(hasOwnedCount).length;
  }

  const snapshot = await getDocs(collection(db, "users", uid, "bugdex"));
  return snapshot.docs.filter((item) => {
    return hasOwnedCount(normalizeInventoryItem(item.id, item.data() as Partial<BugDexInventoryItem>));
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

export async function prepareDailyLoginBug(user: User): Promise<BugDexDropResult | null> {
  const day = localDayId();
  const previousDay = localDayId(addDays(new Date(), -1));
  const eventId = `daily-login-${day}`;
  const previousEventId = `daily-login-${previousDay}`;
  const demoKey = `${user.uid}:${eventId}`;

  if (!isFirebaseConfigured) {
    if (demoEvents.has(demoKey)) return null;
    const streakDay = demoEvents.has(`${user.uid}:${previousEventId}`) ? (demoDailyStreaks.get(user.uid) ?? 0) + 1 : 1;
    return previewDailyReward(user, streakDay);
  }

  const eventRef = doc(db, "users", user.uid, "bugdexEvents", eventId);
  const previousEventRef = doc(db, "users", user.uid, "bugdexEvents", previousEventId);
  const eventSnapshot = await getDoc(eventRef);
  if (eventSnapshot.exists()) return null;

  const previousEventSnapshot = await getDoc(previousEventRef);
  const previousStreak = previousEventSnapshot.exists() ? Number(previousEventSnapshot.data().streakDay ?? 0) : 0;
  const streakDay = previousStreak + 1;
  const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
  const now = new Date().toISOString();
  const entry = pickDailyCommonEntry();
  const inventorySnapshot = await getDoc(doc(db, "users", user.uid, "bugdex", entry.id));
  const existing = inventorySnapshot.exists() ? inventorySnapshot.data() as BugDexInventoryItem : null;
  const item = dailyRewardItem(entry, existing, now);
  return { rewardType: "bug", entry, item, isNew: !existing, source: "daily_login", streakDay, daysUntilBetterReward };
}

export async function claimDailyLoginBug(user: User, preparedDrop?: BugDexDropResult | null): Promise<BugDexDropResult | null> {
  const day = localDayId();
  const previousDay = localDayId(addDays(new Date(), -1));
  const eventId = `daily-login-${day}`;
  const previousEventId = `daily-login-${previousDay}`;
  const demoKey = `${user.uid}:${eventId}`;

  if (!isFirebaseConfigured) {
    if (demoEvents.has(demoKey)) return null;
    const streakDay = preparedDrop?.streakDay ?? (demoEvents.has(`${user.uid}:${previousEventId}`) ? (demoDailyStreaks.get(user.uid) ?? 0) + 1 : 1);
    const entry = preparedDrop?.rewardType === "bug" && preparedDrop.source === "daily_login" ? preparedDrop.entry : pickDailyCommonEntry();
    const result = await grantDailyReward(user, streakDay, entry);
    demoEvents.add(demoKey);
    demoDailyStreaks.set(user.uid, streakDay);
    return result;
  }

  const eventRef = doc(db, "users", user.uid, "bugdexEvents", eventId);
  const previousEventRef = doc(db, "users", user.uid, "bugdexEvents", previousEventId);
  const result: BugDexDropResult | null = await runTransaction(db, async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists()) return null;

    const previousEventSnapshot = await transaction.get(previousEventRef);
    const previousStreak = previousEventSnapshot.exists() ? Number(previousEventSnapshot.data().streakDay ?? 0) : 0;
    const streakDay = previousStreak + 1;
    const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
    const now = new Date().toISOString();
    const entry = preparedDrop?.rewardType === "bug" && preparedDrop.source === "daily_login" ? preparedDrop.entry : pickDailyCommonEntry();
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await transaction.get(userRef);
    const currentUser = userSnapshot.exists() ? userSnapshot.data() as User : user;
    const lampUser = shouldAwardBugLamp(streakDay) ? withAwardedBugLamp(currentUser) : { ...currentUser, bugLampCount: currentUser.bugLampCount ?? 0 };
    const totalPoints = Math.max(0, lampUser.totalPoints + starterBoostedXp(lampUser, dailyLoginXp));
    const updatedUser = {
      ...lampUser,
      totalPoints,
      title: titleForPoints(totalPoints)
    };
    updatedUser.badges = badgesForUser(updatedUser);
    const inventoryRef = doc(db, "users", user.uid, "bugdex", entry.id);
    const inventorySnapshot = await transaction.get(inventoryRef);
    const existing = inventorySnapshot.exists() ? inventorySnapshot.data() as BugDexInventoryItem : null;
    const item = dailyRewardItem(entry, existing, now);
    transaction.set(inventoryRef, item);
    transaction.set(eventRef, {
      id: eventId,
      source: "daily_login",
      rewardType: "bug",
      rewardValue: entry.id,
      bugLampAwarded: shouldAwardBugLamp(streakDay),
      streakDay,
      localDay: day,
      createdAt: now
    });
    transaction.update(userRef, {
      badges: updatedUser.badges,
      bugLampCount: updatedUser.bugLampCount ?? 0,
      title: updatedUser.title,
      totalPoints: updatedUser.totalPoints
    });
    return { rewardType: "bug", entry, item, isNew: !existing, source: "daily_login", streakDay, daysUntilBetterReward, updatedUser };
  });
  if (result?.rewardType === "bug") {
    clearBugDexInventoryCache(user.uid);
    await writeBugDexUnlockBestEffort(user.uid, result.entry, "daily_login", new Date().toISOString());
  }
  return result;
}

async function grantLegacyPointReward(user: User, source: BugDexDropSource, points: number): Promise<BugDexDropResult | null> {
  const safePoints = Math.max(0, Math.floor(points));
  if (safePoints <= 0) return null;
  const eventId = dailyLimitedRewardEventId(source);
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const demoEventId = eventId ? `${user.uid}:${eventId}` : null;
    if (demoEventId && demoEvents.has(demoEventId)) return null;
    if (demoEventId) demoEvents.add(demoEventId);
    const totalPoints = Math.max(0, user.totalPoints + safePoints);
    const updatedUser = { ...user, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    return { rewardType: "points", points: safePoints, isNew: false, source, updatedUser };
  }

  const userRef = doc(db, "users", user.uid);
  const eventRef = eventId ? doc(db, "users", user.uid, "bugdexEvents", eventId) : null;
  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) throw new Error("Gebruiker niet gevonden.");
    if (eventRef) {
      const eventSnapshot = await transaction.get(eventRef);
      if (eventSnapshot.exists()) return null;
    }
    const currentUser = { ...user, ...(userSnapshot.data() as Partial<User>) } as User;
    const totalPoints = Math.max(0, currentUser.totalPoints + safePoints);
    const updatedUser = { ...currentUser, totalPoints, title: titleForPoints(totalPoints) };
    updatedUser.badges = badgesForUser(updatedUser);
    transaction.update(userRef, {
      badges: updatedUser.badges,
      title: updatedUser.title,
      totalPoints: updatedUser.totalPoints
    });
    if (eventRef && eventId) {
      transaction.set(eventRef, {
        createdAt: now,
        id: eventId,
        rewardType: "points",
        rewardValue: safePoints,
        source
      });
    }
    return { rewardType: "points", points: safePoints, isNew: false, source, updatedUser };
  });
}

export async function rollBugDexDrop(user: User, source: BugDexDropSource): Promise<BugDexDropResult | null> {
  const policy = legacyRewardPolicy(source);
  if (policy.kind === "none") return null;
  if (policy.kind === "points") {
    const result = await grantLegacyPointReward(user, source, policy.points);
    const evidenceId = dailyLimitedRewardEventId(source);
    if (result?.updatedUser && policy.researchSource === "internal_contribution" && evidenceId) {
      await syncResearchProgress(result.updatedUser, "internal_contribution", { eventId: evidenceId, kind: "legacy_event" }).catch(() => undefined);
    }
    return result;
  }

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
          count: ownedCount(existing) + 1,
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
    updateDemoUnlock(user.uid, entry, source, now);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  }

  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  const result: BugDexDropResult = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? normalizeInventoryItem(entry.id, snapshot.data() as Partial<BugDexInventoryItem>) : null;
    const item: BugDexInventoryItem = existing
      ? {
          ...existing,
          count: ownedCount(existing) + 1,
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
  clearBugDexInventoryCache(user.uid);
  await writeBugDexUnlockBestEffort(user.uid, entry, source, now);
  return result;
}

export function pickQueuedBugDexRewardEntry(user: User, source: BugDexDropSource): BugDexEntry | null {
  const bonuses = activeBugSquadBonuses(user);
  const chanceBoost = sourceChanceBoost(source, bonuses);
  if (Math.random() > Math.min(0.95, dropChances[source] * (1 + chanceBoost))) return null;
  return pickEntry(source, bonuses.radar_rarity + bugLampStatus(user).rarityBoost);
}

export async function rollSpecificBugDexDrop(user: User, bugId: string, source: BugDexDropSource, chance = 0.16): Promise<BugDexDropResult | null> {
  const entry = entryByBugId(bugId);
  if (!entry || Math.random() > chance) return null;
  return grantSpecificBug(user, entry, source);
}

export async function grantBugDexReward(user: User, source: BugDexDropSource): Promise<BugDexDropResult> {
  return grantSpecificBug(user, pickBugDexRewardEntry(user, source), source);
}

export async function grantBugDexRewardOnce(user: User, source: BugDexDropSource, eventId: string, count = 1): Promise<BugDexDropResult | null> {
  const now = new Date().toISOString();
  const rewardCount = Math.max(1, Math.floor(count));

  if (!isFirebaseConfigured) {
    const entry = pickBugDexRewardEntry(user, source);
    const demoKey = `${user.uid}:${eventId}`;
    if (demoEvents.has(demoKey)) return null;
    demoEvents.add(demoKey);
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const existing = inventory.get(entry.id);
    const item = existing
      ? { ...existing, count: ownedCount(existing) + rewardCount, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: rewardCount, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    inventory.set(entry.id, item);
    updateDemoUnlock(user.uid, entry, source, now);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  }

  const result = await runTransaction(db, (transaction) => grantBugDexRewardOnceInTransaction(transaction, user, source, eventId, now, rewardCount));
  if (result?.rewardType === "bug") clearBugDexInventoryCache(user.uid);
  return result;
}

export async function grantBugDexRewardOnceInTransaction(transaction: Transaction, user: User, source: BugDexDropSource, eventId: string, now = new Date().toISOString(), count = 1): Promise<BugDexDropResult | null> {
  const prepared = await prepareBugDexRewardOnceInTransaction(transaction, user, source, eventId, now, count);
  prepared.commit();
  return prepared.drop;
}

export type PreparedBugDexReward = {
  commit: () => void;
  drop: BugDexDropResult | null;
};

export async function prepareBugDexRewardOnceInTransaction(transaction: Transaction, user: User, source: BugDexDropSource, eventId: string, now = new Date().toISOString(), count = 1): Promise<PreparedBugDexReward> {
  const eventRef = doc(db, "users", user.uid, "bugdexEvents", eventId);
  const eventSnapshot = await transaction.get(eventRef);
  if (eventSnapshot.exists()) return { commit: () => undefined, drop: null };
  const rewardCount = Math.max(1, Math.floor(count));

  const entry = pickBugDexRewardEntry(user, source);
  const inventoryRef = doc(db, "users", user.uid, "bugdex", entry.id);
  const unlockRef = doc(db, "users", user.uid, "bugdexUnlocks", entry.id);
  const [inventorySnapshot, unlockSnapshot] = await Promise.all([
    transaction.get(inventoryRef),
    transaction.get(unlockRef)
  ]);
  const existing = inventorySnapshot.exists() ? normalizeInventoryItem(entry.id, inventorySnapshot.data() as Partial<BugDexInventoryItem>) : null;
  const existingUnlock = unlockSnapshot.exists() ? unlockSnapshot.data() as BugDexUnlock : null;
  const item: BugDexInventoryItem = existing
    ? { ...existing, count: ownedCount(existing) + rewardCount, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
    : { bugId: entry.id, count: rewardCount, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
  const drop: BugDexBugDropResult = { rewardType: "bug", entry, item, isNew: !existing, source };

  return {
    drop,
    commit: () => {
      transaction.set(inventoryRef, item);
      transaction.set(unlockRef, bugDexUnlockItem(entry, source, now, existingUnlock));
      transaction.set(eventRef, { id: eventId, source, createdAt: now });
    }
  };
}

export async function grantBugDexRewardInTransaction(transaction: Transaction, user: User, bugId: string, source: BugDexDropSource, now = new Date().toISOString(), syncUnlock = true): Promise<BugDexBugDropResult & { previousCount: number }> {
  const entry = entryByBugId(bugId);
  if (!entry) throw new Error("BugDex item niet gevonden.");
  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  const snapshot = await transaction.get(ref);
  const existing = snapshot.exists() ? normalizeInventoryItem(entry.id, snapshot.data() as Partial<BugDexInventoryItem>) : null;
  const previousCount = existing ? ownedCount(existing) : 0;
  const item: BugDexInventoryItem = existing
    ? { ...existing, count: previousCount + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
    : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
  if (syncUnlock) await upsertBugDexUnlock(transaction, user.uid, entry, source, now);
  transaction.set(ref, item);
  return { rewardType: "bug", entry, item, isNew: !existing, source, previousCount };
}

export async function grantRealBugScanRewardOnce(user: User, bugId: string, eventId: string, now = new Date().toISOString()): Promise<RealBugScanRewardResult | null> {
  const entry = entryByBugId(bugId);
  if (!entry) throw new Error("BugDex item niet gevonden.");
  const source: BugDexDropSource = "real_bug_scan";

  if (!isFirebaseConfigured) {
    const eventKey = `${user.uid}:${eventId}`;
    if (demoEvents.has(eventKey)) return null;
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const existing = inventory.get(entry.id) ?? null;
    const previousCount = existing ? ownedCount(existing) : 0;
    const item: BugDexInventoryItem = existing
      ? { ...existing, count: previousCount + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    inventory.set(entry.id, item);
    demoInventory.set(user.uid, inventory);
    updateDemoUnlock(user.uid, entry, source, now);
    demoEvents.add(eventKey);
    return { rewardType: "bug", entry, item, isNew: previousCount === 0, source, previousCount, awardedCopy: true };
  }

  const result = await runTransaction(db, async (transaction) => {
    const eventRef = doc(db, "users", user.uid, "bugdexEvents", eventId);
    const inventoryRef = doc(db, "users", user.uid, "bugdex", entry.id);
    const unlockRef = doc(db, "users", user.uid, "bugdexUnlocks", entry.id);
    const [eventSnapshot, inventorySnapshot, unlockSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(inventoryRef),
      transaction.get(unlockRef)
    ]);
    if (eventSnapshot.exists()) return null;

    const existing = inventorySnapshot.exists() ? normalizeInventoryItem(entry.id, inventorySnapshot.data() as Partial<BugDexInventoryItem>) : null;
    const existingUnlock = unlockSnapshot.exists() ? unlockSnapshot.data() as BugDexUnlock : null;
    const previousCount = existing ? ownedCount(existing) : 0;
    const item: BugDexInventoryItem = existing
      ? { ...existing, count: previousCount + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    transaction.set(inventoryRef, item);
    transaction.set(unlockRef, bugDexUnlockItem(entry, source, now, existingUnlock));
    transaction.set(eventRef, { id: eventId, source, createdAt: now });
    return { rewardType: "bug", entry, item, isNew: previousCount === 0, source, previousCount, awardedCopy: true } as RealBugScanRewardResult;
  });
  if (result) clearBugDexInventoryCache(user.uid);
  return result;
}

export async function repairBugDexRewardInTransaction(transaction: Transaction, user: User, bugId: string, source: BugDexDropSource, minimumCount: number, now = new Date().toISOString(), syncUnlock = true): Promise<BugDexBugDropResult & { repaired: boolean }> {
  const entry = entryByBugId(bugId);
  if (!entry) throw new Error("BugDex item niet gevonden.");
  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  const snapshot = await transaction.get(ref);
  const existing = snapshot.exists() ? normalizeInventoryItem(entry.id, snapshot.data() as Partial<BugDexInventoryItem>) : null;
  const currentCount = existing ? ownedCount(existing) : 0;
  const repaired = currentCount < minimumCount;
  const item: BugDexInventoryItem = existing
    ? {
        ...existing,
        count: Math.max(currentCount, minimumCount),
        lastUnlockedAt: repaired ? now : existing.lastUnlockedAt,
        sources: Array.from(new Set([...existing.sources, source]))
      }
    : { bugId: entry.id, count: Math.max(1, minimumCount), firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
  if (syncUnlock) await upsertBugDexUnlock(transaction, user.uid, entry, source, now);
  if (repaired || !existing || !existing.sources.includes(source)) transaction.set(ref, item);
  return { rewardType: "bug", entry, item, isNew: !existing, source, repaired };
}

export async function hasBugDexRewardAvailable(user: User, source: BugDexDropSource): Promise<boolean> {
  const dailyEventId = dailyLimitedRewardEventId(source);
  if (!dailyEventId) return true;
  if (!isFirebaseConfigured) return !demoEvents.has(`${user.uid}:${dailyEventId}`);
  return !(await getDoc(doc(db, "users", user.uid, "bugdexEvents", dailyEventId))).exists();
}

export function pickBugDexRewardEntry(user: User, source: BugDexDropSource): BugDexEntry {
  const bonuses = activeBugSquadBonuses(user);
  const duelQuestBoost = source === "duel_win" ? bonuses.quest_boost * 0.35 : 0;
  return pickEntry(source, bonuses.radar_rarity + duelQuestBoost + bugLampStatus(user).rarityBoost);
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
    if (!sourceItem || ownedCount(sourceItem) < requiredCount) throw new Error(`Je hebt x${requiredCount} nodig om te combineren.`);
    const nextSourceCount = Math.max(1, ownedCount(sourceItem) - requiredCount + 1);
    inventory.set(bugId, { ...sourceItem, count: nextSourceCount, lastUnlockedAt: now });
    const existingTarget = inventory.get(targetEntry.id);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: ownedCount(existingTarget) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    inventory.set(targetEntry.id, targetItem);
    updateDemoUnlock(user.uid, targetEntry, "combine", now);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  }

  const sourceRef = doc(db, "users", user.uid, "bugdex", bugId);
  const targetRef = doc(db, "users", user.uid, "bugdex", targetEntry.id);
  const result: BugDexDropResult = await runTransaction(db, async (transaction) => {
    const sourceSnapshot = await transaction.get(sourceRef);
    if (!sourceSnapshot.exists()) throw new Error("Bug niet gevonden.");
    const sourceItem = sourceSnapshot.data() as BugDexInventoryItem;
    if (ownedCount(sourceItem) < requiredCount) throw new Error(`Je hebt x${requiredCount} nodig om te combineren.`);

    const targetSnapshot = await transaction.get(targetRef);
    const existingTarget = targetSnapshot.exists() ? targetSnapshot.data() as BugDexInventoryItem : null;
    const nextSourceCount = Math.max(1, ownedCount(sourceItem) - requiredCount + 1);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: ownedCount(existingTarget) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    await upsertBugDexUnlock(transaction, user.uid, targetEntry, "combine", now);
    transaction.set(sourceRef, { ...sourceItem, count: nextSourceCount, lastUnlockedAt: now });
    transaction.set(targetRef, targetItem);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  });
  clearBugDexInventoryCache(user.uid);
  return result;
}

export async function combineDifferentBugDexUpgrade(user: User, bugIds: string[]): Promise<BugDexDropResult> {
  const uniqueBugIds = Array.from(new Set(bugIds));
  const sourceEntries = uniqueBugIds.map(entryByBugId);
  if (sourceEntries.some((entry) => !entry)) throw new Error("Bug niet gevonden.");
  const sourceRarity = sourceEntries[0]?.rarity;
  if (!sourceRarity || sourceEntries.some((entry) => entry?.rarity !== sourceRarity)) throw new Error("Kies 3 bugs van dezelfde rarity.");
  const requiredCount = differentUpgradeRequiredCount(sourceRarity);
  if (uniqueBugIds.length !== requiredCount) throw new Error(`Kies ${requiredCount} verschillende bugs.`);
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
      if (!item || ownedCount(item) < 1) throw new Error("Je mist een gekozen bug.");
    }
    for (const bugId of uniqueBugIds) {
      const item = inventory.get(bugId);
      if (!item) continue;
      inventory.set(bugId, { ...item, count: ownedCount(item) - 1, lastUnlockedAt: now });
    }
    const existingTarget = inventory.get(targetEntry.id);
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: ownedCount(existingTarget) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    inventory.set(targetEntry.id, targetItem);
    updateDemoUnlock(user.uid, targetEntry, "combine", now);
    demoEvents.add(`${user.uid}:${dailyEventId}`);
    demoInventory.set(user.uid, inventory);
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  }

  const sourceRefs = uniqueBugIds.map((bugId) => doc(db, "users", user.uid, "bugdex", bugId));
  const targetRef = doc(db, "users", user.uid, "bugdex", targetEntry.id);
  const dailyEventRef = doc(db, "users", user.uid, "bugdexEvents", dailyEventId);
  const legacyRouteEventRefs = getUpgradeEventIdsForDay(day).map((eventId) => doc(db, "users", user.uid, "bugdexEvents", eventId));
  const result: BugDexDropResult = await runTransaction(db, async (transaction) => {
    const upgradeEventSnapshots = await Promise.all([transaction.get(dailyEventRef), ...legacyRouteEventRefs.map((ref) => transaction.get(ref))]);
    if (upgradeEventSnapshots.some((snapshot) => snapshot.exists())) throw new Error("Vandaag is al een upgrade gebruikt.");
    const sourceSnapshots = await Promise.all(sourceRefs.map((ref) => transaction.get(ref)));
    const sourceItems = sourceSnapshots.map((snapshot) => snapshot.exists() ? snapshot.data() as BugDexInventoryItem : null);
    if (sourceItems.some((item) => !item || ownedCount(item) < 1)) throw new Error("Je mist een gekozen bug.");

    const targetSnapshot = await transaction.get(targetRef);
    const existingTarget = targetSnapshot.exists() ? targetSnapshot.data() as BugDexInventoryItem : null;
    const targetItem: BugDexInventoryItem = existingTarget
      ? { ...existingTarget, count: ownedCount(existingTarget) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existingTarget.sources, "combine"])) }
      : { bugId: targetEntry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: targetEntry.rarity, sources: ["combine"] };
    await upsertBugDexUnlock(transaction, user.uid, targetEntry, "combine", now);

    sourceItems.forEach((item, index) => {
      if (!item) return;
      transaction.set(sourceRefs[index], { ...item, count: ownedCount(item) - 1, lastUnlockedAt: now });
    });
    transaction.set(targetRef, targetItem);
    transaction.set(dailyEventRef, upgradeEventPayload(dailyEventId, sourceRarity, targetRarity, targetEntry.id, now));
    return { rewardType: "bug", entry: targetEntry, item: targetItem, isNew: !existingTarget, source: "combine" };
  });
  clearBugDexInventoryCache(user.uid);
  return result;
}

async function grantDailyReward(user: User, streakDay: number, entry = pickDailyCommonEntry()): Promise<BugDexDropResult> {
  const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
  const result = await grantSpecificBug(user, entry, "daily_login");
  const lampUser = shouldAwardBugLamp(streakDay) ? withAwardedBugLamp(user) : { ...user, bugLampCount: user.bugLampCount ?? 0 };
  const totalPoints = Math.max(0, lampUser.totalPoints + starterBoostedXp(lampUser, dailyLoginXp));
  const updatedUser = { ...lampUser, totalPoints, title: titleForPoints(totalPoints) };
  updatedUser.badges = badgesForUser(updatedUser);
  return { ...result, streakDay, daysUntilBetterReward, updatedUser };
}

function previewDailyReward(user: User, streakDay: number): BugDexDropResult {
  const daysUntilBetterReward = daysUntilNextDailyStreakReward(streakDay);
  const entry = pickDailyCommonEntry();
  const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
  const existing = inventory.get(entry.id) ?? null;
  const item = dailyRewardItem(entry, existing, new Date().toISOString());
  return { rewardType: "bug", entry, item, isNew: !existing, source: "daily_login", streakDay, daysUntilBetterReward };
}

function dailyRewardItem(entry: BugDexEntry, existing: BugDexInventoryItem | null, now: string): BugDexInventoryItem {
  const current = existing ? normalizeInventoryItem(entry.id, existing) : null;
  return existing
    ? { ...current!, count: ownedCount(current!) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...current!.sources, "daily_login"])) }
    : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: ["daily_login"] };
}

async function grantSpecificBug(user: User, entry: BugDexEntry, source: BugDexDropSource): Promise<BugDexDropResult> {
  const now = new Date().toISOString();
  const dailyEventId = dailyLimitedRewardEventId(source);

  if (!isFirebaseConfigured) {
    if (dailyEventId && demoEvents.has(`${user.uid}:${dailyEventId}`)) throw new Error("Daily reward already claimed.");
    const inventory = demoInventory.get(user.uid) ?? new Map<string, BugDexInventoryItem>();
    const existing = inventory.has(entry.id) ? normalizeInventoryItem(entry.id, inventory.get(entry.id) ?? {}) : null;
    const item = existing
      ? { ...existing, count: ownedCount(existing) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    inventory.set(entry.id, item);
    updateDemoUnlock(user.uid, entry, source, now);
    demoInventory.set(user.uid, inventory);
    if (dailyEventId) demoEvents.add(`${user.uid}:${dailyEventId}`);
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  }

  const ref = doc(db, "users", user.uid, "bugdex", entry.id);
  const eventRef = dailyEventId ? doc(db, "users", user.uid, "bugdexEvents", dailyEventId) : null;
  const result: BugDexDropResult = await runTransaction(db, async (transaction) => {
    const eventSnapshot = eventRef ? await transaction.get(eventRef) : null;
    if (eventSnapshot?.exists()) throw new Error("Daily reward already claimed.");
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? normalizeInventoryItem(entry.id, snapshot.data() as Partial<BugDexInventoryItem>) : null;
    const item: BugDexInventoryItem = existing
      ? { ...existing, count: ownedCount(existing) + 1, lastUnlockedAt: now, sources: Array.from(new Set([...existing.sources, source])) }
      : { bugId: entry.id, count: 1, firstUnlockedAt: now, lastUnlockedAt: now, rarity: entry.rarity, sources: [source] };
    transaction.set(ref, item);
    if (eventRef && dailyEventId) transaction.set(eventRef, { id: dailyEventId, source, createdAt: now });
    return { rewardType: "bug", entry, item, isNew: !existing, source };
  });
  clearBugDexInventoryCache(user.uid);
  await writeBugDexUnlockBestEffort(user.uid, entry, source, now);
  return result;
}

function updateDemoUnlock(uid: string, entry: BugDexEntry, source: string, now: string): void {
  const unlocks = demoUnlocks.get(uid) ?? new Map<string, BugDexUnlock>();
  unlocks.set(entry.id, bugDexUnlockItem(entry, source, now, unlocks.get(entry.id) ?? null));
  demoUnlocks.set(uid, unlocks);
}

async function upsertBugDexUnlock(transaction: Transaction, uid: string, entry: BugDexEntry, source: string, now: string): Promise<void> {
  const ref = doc(db, "users", uid, "bugdexUnlocks", entry.id);
  const snapshot = await transaction.get(ref);
  const existing = snapshot.exists() ? snapshot.data() as BugDexUnlock : null;
  transaction.set(ref, bugDexUnlockItem(entry, source, now, existing));
}

export async function writeBugDexUnlockBestEffort(uid: string, entry: BugDexEntry, source: string, now: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const ref = doc(db, "users", uid, "bugdexUnlocks", entry.id);
    const snapshot = await getDoc(ref);
    const existing = snapshot.exists() ? snapshot.data() as BugDexUnlock : null;
    await setDoc(ref, bugDexUnlockItem(entry, source, now, existing));
  } catch {
    // Inventory is the source of truth; unlock history is best-effort.
  }
}

function bugDexUnlockItem(entry: BugDexEntry, source: string, now: string, existing: BugDexUnlock | null): BugDexUnlock {
  return {
    bugId: entry.id,
    firstUnlockedAt: existing?.firstUnlockedAt ?? now,
    lastUnlockedAt: now,
    rarity: entry.rarity,
    sources: Array.from(new Set([...(existing?.sources ?? []), source]))
  };
}

function bugDexUnlockFromInventory(item: BugDexInventoryItem): BugDexUnlock {
  return {
    bugId: item.bugId,
    firstUnlockedAt: item.firstUnlockedAt,
    lastUnlockedAt: item.lastUnlockedAt,
    rarity: item.rarity,
    sources: Array.from(new Set([...(item.sources ?? []), "inventory_backfill"]))
  };
}

function normalizeInventoryItem(docId: string, item: Partial<BugDexInventoryItem>): BugDexInventoryItem {
  const entry = entryByBugId(item.bugId ?? docId);
  const fallbackDate = item.lastUnlockedAt ?? item.firstUnlockedAt ?? "1970-01-01T00:00:00.000Z";
  const count = typeof item.count === "number" && Number.isFinite(item.count) ? item.count : 1;
  const sources = Array.isArray(item.sources) ? item.sources.filter((source): source is string => typeof source === "string") : [];
  return {
    bugId: item.bugId ?? docId,
    count,
    firstUnlockedAt: item.firstUnlockedAt ?? fallbackDate,
    lastUnlockedAt: item.lastUnlockedAt ?? fallbackDate,
    rarity: item.rarity ?? entry?.rarity ?? "Gewoon",
    sources: sources.length ? sources : ["legacy_backfill"]
  };
}

function normalizeUnlockItem(docId: string, item: Partial<BugDexUnlock>): BugDexUnlock {
  const entry = entryByBugId(item.bugId ?? docId);
  const fallbackDate = item.lastUnlockedAt ?? item.firstUnlockedAt ?? "1970-01-01T00:00:00.000Z";
  const sources = Array.isArray(item.sources) ? item.sources.filter((source): source is string => typeof source === "string") : [];
  return {
    bugId: item.bugId ?? docId,
    firstUnlockedAt: item.firstUnlockedAt ?? fallbackDate,
    lastUnlockedAt: item.lastUnlockedAt ?? fallbackDate,
    rarity: item.rarity ?? entry?.rarity ?? "Gewoon",
    sources: sources.length ? sources : ["legacy_backfill"]
  };
}

function mergeLegacyInventory(user: User, items: BugDexInventoryItem[]): BugDexInventoryItem[] {
  const byId = new Map(items.map((item) => {
    const normalized = normalizeInventoryItem(item.bugId, item);
    return [normalized.bugId, normalized] as const;
  }));

  for (const item of legacyInventoryFromUser(user)) {
    if (!byId.has(item.bugId)) byId.set(item.bugId, item);
  }

  return Array.from(byId.values());
}

function legacyInventoryFromUser(user: User): BugDexInventoryItem[] {
  const now = user.lastActiveAt ?? "1970-01-01T00:00:00.000Z";
  const ids = new Set<string>();
  for (const bugId of user.activeBugSquad ?? []) {
    if (entryByBugId(bugId)) ids.add(bugId);
  }
  for (const entry of bugDexEntries) {
    if (entry.rarity !== "Mythisch" && isBugDexEntryUnlocked(entry, user)) ids.add(entry.id);
  }
  return Array.from(ids).map((bugId) => {
    const entry = entryByBugId(bugId);
    return {
      bugId,
      count: 1,
      firstUnlockedAt: now,
      lastUnlockedAt: now,
      rarity: entry?.rarity ?? "Gewoon",
      sources: ["legacy_user_backfill"]
    };
  });
}

function hasOwnedCount(item: BugDexInventoryItem): boolean {
  return item.count > 0;
}

function ownedCount(item: BugDexInventoryItem): number {
  return Math.max(0, normalizeInventoryItem(item.bugId, item).count);
}

const reportActionRewardSources = new Set<BugDexDropSource>(["bug_reported", "comment", "status_update", "bug_fixed", "upvote_given"]);

function dailyLimitedRewardEventId(source: BugDexDropSource): string | null {
  if (source === "solo_campaign_clear") return `${source}-${localDayId()}`;
  if (source === "bug_splat") return `${source}-${localDayId()}`;
  if (reportActionRewardSources.has(source)) return `report-action-${localDayId()}`;
  return null;
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
  if (rarity === "Mythisch") return Number.POSITIVE_INFINITY;
  return 5;
}

export function differentUpgradeRequiredCount(rarity: BugDexRarity): number {
  return rarity === "Legendarisch" ? 5 : 3;
}

function nextRarity(rarity: BugDexRarity): BugDexRarity | null {
  if (rarity === "Gewoon") return "Zeldzaam";
  if (rarity === "Zeldzaam") return "Episch";
  if (rarity === "Episch") return "Legendarisch";
  if (rarity === "Legendarisch") return "Mythisch";
  return null;
}

function pickCombineTarget(rarity: BugDexRarity, inventory: BugDexInventoryItem[]): BugDexEntry {
  const ownedIds = new Set(inventory.map((item) => normalizeInventoryItem(item.bugId, item)).filter(hasOwnedCount).map((item) => item.bugId));
  const candidates = bugDexEntries.filter((entry) => entry.rarity === rarity);
  const undiscovered = candidates.filter((entry) => !ownedIds.has(entry.id));
  return pickFrom(undiscovered) ?? pickFrom(candidates) ?? bugDexEntries[0];
}

function pickEntry(source: BugDexDropSource, rarityBoost = 0): BugDexEntry {
  const rarity = pickRarity(source, rarityBoost);
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
  if (boost <= 0) return cappedRarityWeights(weights);
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
  return cappedRarityWeights(nextWeights);
}

function cappedRarityWeights(weights: Array<[BugDexRarity, number]>): Array<[BugDexRarity, number]> {
  const commonIndex = weights.findIndex(([rarity]) => rarity === "Gewoon");
  if (commonIndex < 0) return weights;
  const nextWeights = weights.map(([rarity, weight]) => [rarity, weight] as [BugDexRarity, number]);
  const total = nextWeights.reduce((sum, [, weight]) => sum + weight, 0);
  const caps: Array<[BugDexRarity, number]> = [["Zeldzaam", total * 0.245], ["Episch", total * 0.049]];

  for (const [rarity, cap] of caps) {
    const index = nextWeights.findIndex(([itemRarity]) => itemRarity === rarity);
    if (index < 0 || nextWeights[index][1] <= cap) continue;
    const excess = nextWeights[index][1] - cap;
    nextWeights[index][1] = cap;
    nextWeights[commonIndex][1] += excess;
  }
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
        : source === "weekly_mission" || source === "weekly_mission_common" || source === "weekly_mission_rare" || source === "weekly_mission_epic"
          ? base + bonuses.quest_boost
          : base;
  return Math.min(0.15, boost);
}

function pickFrom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}
