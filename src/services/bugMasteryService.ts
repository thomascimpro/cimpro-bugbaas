import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, getDocs, runTransaction, type Transaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase.ts";
import { BugMastery, BugMasteryRank, BugMasteryRole, BugMasterySkill, BugMasteryXpEvent, BugMasteryXpSource, User } from "../types.ts";
import { BugDexEntry, BugDexRarity, bugDexEntries, InsectVariant } from "./pointsService.ts";

export const bugMasteryLevelCap = 20;

export type BugMasteryAwardResult = {
  awarded: boolean;
  eventId: string;
  mastery: BugMastery;
};

export type BugMasteryBattleWinResult = {
  awarded: boolean;
  eventId: string;
  mastery: BugMastery;
};

const demoMastery = new Map<string, Map<string, BugMastery>>();
const demoMasteryEvents = new Map<string, Set<string>>();
const demoMasteryDailyTotals = new Map<string, Record<string, number>>();
const masteryCache = new Map<string, { at: number; items: BugMastery[] }>();
const masteryCacheTtlMs = 10 * 60 * 1000;

const dailyBugXpCap = 180;
const dailyUserXpCap = 220;
const dailySourceCaps: Partial<Record<BugMasteryXpSource, number>> = {
  active_squad_duel: 16,
  active_squad_solo: 16,
  boss_defeat: 18,
  buddy_care: 180,
  duplicate_unlock: 20,
  duel_draw: 8,
  duel_win: 9,
  movement_radar: 12,
  skill_trigger: 6,
  walking: 18
};

const rarityXpMultiplier: Record<BugDexRarity, number> = {
  Gewoon: 0.7,
  Zeldzaam: 0.85,
  Episch: 1,
  Legendarisch: 1.15,
  Mythisch: 1.6
};

const roleByInsect: Record<InsectVariant, BugMasteryRole[]> = {
  beetle: ["shield", "attack", "support"],
  crawler: ["chaos", "shield", "attack"],
  dragonfly: ["speed", "support", "attack"],
  grasshopper: ["speed", "attack", "chaos"],
  ladybug: ["support", "shield", "chaos"],
  larva: ["support", "chaos", "shield"]
};

export const bugMasterySkills: BugMasterySkill[] = [
  { id: "sharp_mandibles", kind: "passive", role: "attack", unlockedAtLevel: 3 },
  { id: "power_bite", kind: "active", role: "attack", unlockedAtLevel: 5 },
  { id: "pierce", kind: "active", role: "attack", unlockedAtLevel: 10 },
  { id: "finisher", kind: "active", role: "attack", unlockedAtLevel: 15 },
  { id: "alpha_strike", kind: "master", role: "attack", unlockedAtLevel: 20 },
  { id: "quick_reflex", kind: "passive", role: "speed", unlockedAtLevel: 3 },
  { id: "dash_mark", kind: "active", role: "speed", unlockedAtLevel: 5 },
  { id: "quick_tap", kind: "active", role: "speed", unlockedAtLevel: 10 },
  { id: "intercept", kind: "active", role: "speed", unlockedAtLevel: 15 },
  { id: "speed_read", kind: "master", role: "speed", unlockedAtLevel: 20 },
  { id: "guard_shell", kind: "passive", role: "shield", unlockedAtLevel: 3 },
  { id: "barrier", kind: "active", role: "shield", unlockedAtLevel: 5 },
  { id: "anchor", kind: "active", role: "shield", unlockedAtLevel: 10 },
  { id: "shell_break", kind: "active", role: "shield", unlockedAtLevel: 15 },
  { id: "guardian_core", kind: "master", role: "shield", unlockedAtLevel: 20 },
  { id: "wild_pattern", kind: "passive", role: "chaos", unlockedAtLevel: 3 },
  { id: "swarm_pop", kind: "active", role: "chaos", unlockedAtLevel: 5 },
  { id: "chain_zap", kind: "active", role: "chaos", unlockedAtLevel: 10 },
  { id: "confuse", kind: "active", role: "chaos", unlockedAtLevel: 15 },
  { id: "bug_storm", kind: "master", role: "chaos", unlockedAtLevel: 20 },
  { id: "lucky_find", kind: "passive", role: "support", unlockedAtLevel: 3 },
  { id: "focus_call", kind: "active", role: "support", unlockedAtLevel: 5 },
  { id: "xp_spark", kind: "active", role: "support", unlockedAtLevel: 10 },
  { id: "team_signal", kind: "active", role: "support", unlockedAtLevel: 15 },
  { id: "squad_rally", kind: "master", role: "support", unlockedAtLevel: 20 }
];

const bugDexEntryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));

export function bugMasteryXpForNextLevel(level: number, rarity: BugDexRarity = "Gewoon"): number {
  const safeLevel = Math.max(1, Math.min(bugMasteryLevelCap - 1, Math.floor(level)));
  const levelCurve = 18 + safeLevel * 8 + Math.pow(safeLevel, 1.75) * 2.2;
  return Math.ceil(levelCurve * rarityXpMultiplier[rarity]);
}

export function bugMasteryRankForLevel(level: number): BugMasteryRank {
  if (level >= 20) return "master";
  if (level >= 15) return "elite";
  if (level >= 10) return "veteran";
  if (level >= 5) return "skilled";
  if (level >= 3) return "trained";
  return "rookie";
}

export function bugMasteryRoleForEntry(entry: BugDexEntry): BugMasteryRole {
  const roles = roleByInsect[entry.insect];
  return roles[stableHash(entry.id) % roles.length];
}

export function bugMasteryUnlockedSkills(role: BugMasteryRole, level: number): BugMasterySkill[] {
  return bugMasterySkills.filter((skill) => skill.role === role && skill.unlockedAtLevel <= level);
}

export function bugMasterySessionSkill(mastery: BugMastery): BugMasterySkill | null {
  const unlockedIds = new Set(mastery.unlockedSkillIds);
  return bugMasterySkills
    .filter((skill) => skill.role === mastery.role && unlockedIds.has(skill.id) && (skill.kind === "active" || skill.kind === "master"))
    .sort((first, second) => second.unlockedAtLevel - first.unlockedAtLevel)
    [0] ?? null;
}

export function bugMasteryNextUnlockLevel(level: number): 3 | 5 | 10 | 15 | 20 | null {
  if (level < 3) return 3;
  if (level < 5) return 5;
  if (level < 10) return 10;
  if (level < 15) return 15;
  if (level < 20) return 20;
  return null;
}

export function normalizeBugMastery(bugId: string, value: Partial<BugMastery> = {}, now = new Date().toISOString()): BugMastery {
  const entry = bugDexEntryById.get(bugId);
  const role = value.role ?? (entry ? bugMasteryRoleForEntry(entry) : "support");
  const lifetimeXp = Math.max(0, Math.floor(value.lifetimeXp ?? 0));
  const levelState = entry ? bugMasteryLevelState(entry, lifetimeXp) : { level: 1, xp: 0 };
  const level = clampLevel(value.level ?? levelState.level);
  const mastery: BugMastery = {
    bugId,
    battleWins: Math.max(0, Math.floor(Number(value.battleWins ?? 0) || 0)),
    level,
    xp: Math.max(0, Math.floor(value.xp ?? levelState.xp)),
    lifetimeXp,
    rank: bugMasteryRankForLevel(level),
    role,
    unlockedSkillIds: value.unlockedSkillIds ?? bugMasteryUnlockedSkills(role, level).map((skill) => skill.id),
    activeUses: Math.max(0, Math.floor(value.activeUses ?? 0)),
    duelUses: Math.max(0, Math.floor(value.duelUses ?? 0)),
    soloUses: Math.max(0, Math.floor(value.soloUses ?? 0)),
    walkedKm: Math.max(0, Number(value.walkedKm ?? 0)),
    sourceTotals: sanitizeTotals(value.sourceTotals),
    updatedAt: value.updatedAt ?? now
  };
  if (value.selectedSkillIds) mastery.selectedSkillIds = value.selectedSkillIds;
  if (value.lastXpAt) mastery.lastXpAt = value.lastXpAt;
  if (value.lastTradeId) mastery.lastTradeId = value.lastTradeId;
  if (value.dailySourceTotals) mastery.dailySourceTotals = sanitizeTotals(value.dailySourceTotals);
  return mastery;
}

export async function getBugMastery(user: Pick<User, "uid">, bugId: string): Promise<BugMastery> {
  if (!isFirebaseConfigured) {
    return demoMastery.get(user.uid)?.get(bugId) ?? normalizeBugMastery(bugId);
  }
  const snapshot = await getDoc(doc(db, "users", user.uid, "bugMastery", bugId));
  return normalizeBugMastery(bugId, snapshot.exists() ? snapshot.data() as Partial<BugMastery> : undefined);
}

type MasteryCacheOptions = { force?: boolean; ttlMs?: number };

function masteryCacheKey(uid: string): string {
  return `bugbaas:bugMastery:${uid}`;
}

async function readStoredMastery(uid: string, ttlMs: number): Promise<BugMastery[] | null> {
  try {
    const raw = await AsyncStorage.getItem(masteryCacheKey(uid));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { at: number; items: BugMastery[] };
    if (!cached || Date.now() - cached.at >= ttlMs || !Array.isArray(cached.items)) return null;
    return cached.items;
  } catch {
    return null;
  }
}

function writeStoredMastery(uid: string, items: BugMastery[]): void {
  void AsyncStorage.setItem(masteryCacheKey(uid), JSON.stringify({ at: Date.now(), items })).catch(() => undefined);
}

export function clearBugMasteryCache(uid?: string): void {
  if (uid) {
    masteryCache.delete(uid);
    void AsyncStorage.removeItem(masteryCacheKey(uid)).catch(() => undefined);
    return;
  }
  masteryCache.clear();
}

export async function listBugMastery(user: Pick<User, "uid">, options: MasteryCacheOptions = {}): Promise<BugMastery[]> {
  if (!isFirebaseConfigured) {
    return Array.from(demoMastery.get(user.uid)?.values() ?? []);
  }
  const ttlMs = options.ttlMs ?? masteryCacheTtlMs;
  if (!options.force) {
    const cached = masteryCache.get(user.uid);
    if (cached && Date.now() - cached.at < ttlMs) return cached.items;
    const stored = await readStoredMastery(user.uid, ttlMs);
    if (stored) {
      masteryCache.set(user.uid, { at: Date.now(), items: stored });
      return stored;
    }
  }
  const snapshot = await getDocs(collection(db, "users", user.uid, "bugMastery"));
  const items = snapshot.docs.map((item) => normalizeBugMastery(item.id, item.data() as Partial<BugMastery>));
  masteryCache.set(user.uid, { at: Date.now(), items });
  writeStoredMastery(user.uid, items);
  return items;
}

export async function copyBugMasteryForTrade(fromUser: Pick<User, "uid">, toUser: Pick<User, "uid">, bugId: string, tradeId?: string): Promise<BugMastery | null> {
  if (fromUser.uid === toUser.uid) return null;
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const sender = demoMastery.get(fromUser.uid)?.get(bugId);
    if (!sender) return null;
    const receiverMap = demoMastery.get(toUser.uid) ?? new Map<string, BugMastery>();
    const receiver = receiverMap.get(bugId) ?? normalizeBugMastery(bugId);
    if (receiver.lifetimeXp >= sender.lifetimeXp) return receiver;
    const merged = normalizeBugMastery(bugId, { ...receiver, lifetimeXp: sender.lifetimeXp, lastXpAt: now, ...(tradeId ? { lastTradeId: tradeId } : {}) }, now);
    receiverMap.set(bugId, merged);
    demoMastery.set(toUser.uid, receiverMap);
    return merged;
  }

  const senderRef = doc(db, "users", fromUser.uid, "bugMastery", bugId);
  const receiverRef = doc(db, "users", toUser.uid, "bugMastery", bugId);
  return runTransaction(db, async (transaction) => {
    const [senderSnapshot, receiverSnapshot] = await Promise.all([transaction.get(senderRef), transaction.get(receiverRef)]);
    if (!senderSnapshot.exists()) return null;
    const sender = normalizeBugMastery(bugId, senderSnapshot.data() as Partial<BugMastery>, now);
    const receiver = normalizeBugMastery(bugId, receiverSnapshot.exists() ? receiverSnapshot.data() as Partial<BugMastery> : undefined, now);
    if (receiver.lifetimeXp >= sender.lifetimeXp) return receiver;
    const merged = normalizeBugMastery(bugId, { ...receiver, lifetimeXp: sender.lifetimeXp, lastXpAt: now, ...(tradeId ? { lastTradeId: tradeId } : {}) }, now);
    transaction.set(receiverRef, merged);
    return merged;
  });
}

export async function awardBugMasteryXp(user: Pick<User, "uid">, bugId: string, amount: number, source: BugMasteryXpSource, eventId: string): Promise<BugMasteryAwardResult> {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (!bugDexEntryById.has(bugId) || safeAmount <= 0) {
    return { awarded: false, eventId, mastery: await getBugMastery(user, bugId) };
  }
  if (!isFirebaseConfigured) return awardDemoBugMasteryXp(user.uid, bugId, safeAmount, source, eventId);

  const result = await runTransaction(db, (transaction) => awardBugMasteryXpInTransaction(transaction, user, bugId, safeAmount, source, eventId));
  clearBugMasteryCache(user.uid);
  return result;
}

export async function awardBugMasteryBattleWin(user: Pick<User, "uid">, bugId: string, eventId: string, now = new Date().toISOString()): Promise<BugMasteryBattleWinResult> {
  if (!bugDexEntryById.has(bugId)) {
    return { awarded: false, eventId, mastery: await getBugMastery(user, bugId) };
  }
  if (!isFirebaseConfigured) return awardDemoBugMasteryBattleWin(user.uid, bugId, eventId, now);

  const result = await runTransaction(db, (transaction) => awardBugMasteryBattleWinInTransaction(transaction, user, bugId, eventId, now));
  clearBugMasteryCache(user.uid);
  return result;
}

export async function awardBugMasteryBattleWinInTransaction(transaction: Transaction, user: Pick<User, "uid">, bugId: string, eventId: string, now = new Date().toISOString()): Promise<BugMasteryBattleWinResult> {
  const masteryRef = doc(db, "users", user.uid, "bugMastery", bugId);
  const eventRef = doc(db, "users", user.uid, "bugMasteryEvents", eventId);
  const [masterySnapshot, eventSnapshot] = await Promise.all([
    transaction.get(masteryRef),
    transaction.get(eventRef)
  ]);
  const current = normalizeBugMastery(bugId, masterySnapshot.exists() ? masterySnapshot.data() as Partial<BugMastery> : undefined, now);
  if (!bugDexEntryById.has(bugId) || eventSnapshot.exists()) return { awarded: false, eventId, mastery: current };
  const mastery = normalizeBugMastery(bugId, {
    ...current,
    battleWins: current.battleWins + 1,
    updatedAt: now
  }, now);
  transaction.set(masteryRef, mastery);
  transaction.set(eventRef, {
    amount: 0,
    bugId,
    createdAt: now,
    id: eventId,
    kind: "battle_win",
    localDay: localDayId(new Date(now)),
    source: "active_squad_solo"
  });
  return { awarded: true, eventId, mastery };
}

export async function awardBugMasteryXpInTransaction(transaction: Transaction, user: Pick<User, "uid">, bugId: string, amount: number, source: BugMasteryXpSource, eventId: string, now = new Date().toISOString()): Promise<BugMasteryAwardResult> {
  const safeAmount = Math.max(0, Math.floor(amount));
  const day = localDayId(new Date(now));
  const masteryRef = doc(db, "users", user.uid, "bugMastery", bugId);
  const eventRef = doc(db, "users", user.uid, "bugMasteryEvents", eventId);
  const dailyRef = doc(db, "users", user.uid, "bugMasteryDaily", day);
  const [masterySnapshot, eventSnapshot, dailySnapshot] = await Promise.all([
    transaction.get(masteryRef),
    transaction.get(eventRef),
    transaction.get(dailyRef)
  ]);
  const current = normalizeBugMastery(bugId, masterySnapshot.exists() ? masterySnapshot.data() as Partial<BugMastery> : undefined, now);
  if (!bugDexEntryById.has(bugId) || safeAmount <= 0) return { awarded: false, eventId, mastery: current };
  if (eventSnapshot.exists()) return { awarded: false, eventId, mastery: current };
  const dailyTotals = sanitizeTotals(dailySnapshot.exists() ? dailySnapshot.data() as Record<string, number> : undefined);
  const cappedAmount = cappedBugMasteryXp(current, safeAmount, source, day, dailyTotals);
  if (cappedAmount <= 0) {
    transaction.set(eventRef, bugMasteryXpEvent(eventId, bugId, 0, source, now));
    return { awarded: false, eventId, mastery: current };
  }
  const mastery = addXpToMastery(current, cappedAmount, source, now);
  const nextDailyTotal = source === "buddy_care" ? (dailyTotals.total ?? 0) : (dailyTotals.total ?? 0) + cappedAmount;
  transaction.set(masteryRef, mastery);
  transaction.set(eventRef, bugMasteryXpEvent(eventId, bugId, cappedAmount, source, now));
  transaction.set(dailyRef, { total: nextDailyTotal, updatedAt: now });
  return { awarded: true, eventId, mastery };
}

export function addXpToMastery(mastery: BugMastery, amount: number, source: BugMasteryXpSource, now = new Date().toISOString()): BugMastery {
  const entry = bugDexEntryById.get(mastery.bugId);
  const lifetimeXp = Math.max(0, mastery.lifetimeXp + Math.max(0, Math.floor(amount)));
  const levelState = entry ? bugMasteryLevelState(entry, lifetimeXp) : { level: mastery.level, xp: mastery.xp };
  const level = clampLevel(levelState.level);
  const role = mastery.role;
  const day = localDayId(new Date(now));
  const safeAmount = Math.max(0, Math.floor(amount));
  return {
    ...mastery,
    level,
    xp: level >= bugMasteryLevelCap ? 0 : levelState.xp,
    lifetimeXp,
    rank: bugMasteryRankForLevel(level),
    unlockedSkillIds: bugMasteryUnlockedSkills(role, level).map((skill) => skill.id),
    lastXpAt: now,
    sourceTotals: {
      ...mastery.sourceTotals,
      [source]: (mastery.sourceTotals[source] ?? 0) + safeAmount
    },
    dailySourceTotals: {
      ...(mastery.dailySourceTotals ?? {}),
      [`${day}:${source}`]: ((mastery.dailySourceTotals ?? {})[`${day}:${source}`] ?? 0) + safeAmount,
      [`${day}:total`]: ((mastery.dailySourceTotals ?? {})[`${day}:total`] ?? 0) + safeAmount
    },
    updatedAt: now
  };
}

function awardDemoBugMasteryXp(uid: string, bugId: string, amount: number, source: BugMasteryXpSource, eventId: string): BugMasteryAwardResult {
  const events = demoMasteryEvents.get(uid) ?? new Set<string>();
  const userMastery = demoMastery.get(uid) ?? new Map<string, BugMastery>();
  const current = userMastery.get(bugId) ?? normalizeBugMastery(bugId);
  if (events.has(eventId)) return { awarded: false, eventId, mastery: current };
  const day = localDayId();
  const dailyKey = `${uid}:${day}`;
  const dailyTotals = demoMasteryDailyTotals.get(dailyKey) ?? {};
  const cappedAmount = cappedBugMasteryXp(current, amount, source, day, dailyTotals);
  if (cappedAmount <= 0) {
    events.add(eventId);
    demoMasteryEvents.set(uid, events);
    return { awarded: false, eventId, mastery: current };
  }
  const mastery = addXpToMastery(current, cappedAmount, source);
  events.add(eventId);
  userMastery.set(bugId, mastery);
  demoMasteryDailyTotals.set(dailyKey, { ...dailyTotals, total: (dailyTotals.total ?? 0) + cappedAmount });
  demoMasteryEvents.set(uid, events);
  demoMastery.set(uid, userMastery);
  return { awarded: true, eventId, mastery };
}

function awardDemoBugMasteryBattleWin(uid: string, bugId: string, eventId: string, now: string): BugMasteryBattleWinResult {
  const events = demoMasteryEvents.get(uid) ?? new Set<string>();
  const userMastery = demoMastery.get(uid) ?? new Map<string, BugMastery>();
  const current = userMastery.get(bugId) ?? normalizeBugMastery(bugId, undefined, now);
  if (events.has(eventId)) return { awarded: false, eventId, mastery: current };
  const mastery = normalizeBugMastery(bugId, { ...current, battleWins: current.battleWins + 1, updatedAt: now }, now);
  events.add(eventId);
  userMastery.set(bugId, mastery);
  demoMasteryEvents.set(uid, events);
  demoMastery.set(uid, userMastery);
  return { awarded: true, eventId, mastery };
}

function cappedBugMasteryXp(mastery: BugMastery, amount: number, source: BugMasteryXpSource, day: string, userDailyTotals: Record<string, number>): number {
  const safeAmount = Math.max(0, Math.floor(amount));
  if (source === "buddy_care") return safeAmount;
  const dailyTotals = mastery.dailySourceTotals ?? {};
  const sourceRemaining = Math.max(0, (dailySourceCaps[source] ?? dailyBugXpCap) - (dailyTotals[`${day}:${source}`] ?? 0));
  const bugRemaining = Math.max(0, dailyBugXpCap - (dailyTotals[`${day}:total`] ?? 0));
  const userRemaining = Math.max(0, dailyUserXpCap - (userDailyTotals.total ?? 0));
  return Math.max(0, Math.min(safeAmount, sourceRemaining, bugRemaining, userRemaining));
}

function bugMasteryLevelState(entry: BugDexEntry, lifetimeXp: number): { level: number; xp: number } {
  let remaining = Math.max(0, Math.floor(lifetimeXp));
  let level = 1;
  while (level < bugMasteryLevelCap) {
    const needed = bugMasteryXpForNextLevel(level, entry.rarity);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }
  return { level, xp: level >= bugMasteryLevelCap ? 0 : remaining };
}

function bugMasteryXpEvent(id: string, bugId: string, amount: number, source: BugMasteryXpSource, now: string): BugMasteryXpEvent {
  return {
    id,
    amount,
    bugId,
    createdAt: now,
    localDay: localDayId(),
    source
  };
}

function sanitizeTotals(value?: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(value ?? {}).map(([key, total]) => [key, Math.max(0, Math.floor(Number(total) || 0))]));
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(bugMasteryLevelCap, Math.floor(level)));
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stableHash(value: string): number {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}
