import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { User } from "../types";

export type DuelSeasonRewardRarity = "Episch" | "Legendarisch" | "Mythisch" | "Zeldzaam";

export type DuelSeasonReward = {
  count: number;
  label: string;
  rarity: DuelSeasonRewardRarity;
};

export type DuelSeasonClaim = {
  bugIds: string[];
  claimedAt: string;
  displayName: string;
  newBugIds?: string[];
  rank: number;
  reward: DuelSeasonReward;
  seasonId: string;
  seenAt?: string;
  uid: string;
};

export type DuelSeasonSummary = {
  closedAt: string;
  seasonId: string;
  top5: Array<{
    bugIds: string[];
    displayName: string;
    rank: number;
    reward: DuelSeasonReward;
    uid: string;
    duelRating: number;
  }>;
};

const defaultDuelRating = 1000;

export function currentDuelSeasonId(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function previousDuelSeasonId(date = new Date()): string {
  return currentDuelSeasonId(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

export function duelSeasonEndDate(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function duelSeasonEndLabel(date = new Date()): string {
  return duelSeasonEndDate(date).toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

export function duelSeasonRewardForRank(rank: number): DuelSeasonReward | null {
  if (rank === 1) return { count: 1, label: "1 mythische bug", rarity: "Mythisch" };
  if (rank === 2) return { count: 1, label: "1 legendarische bug", rarity: "Legendarisch" };
  if (rank === 3) return { count: 2, label: "2 epische bugs", rarity: "Episch" };
  if (rank === 4) return { count: 1, label: "1 epische bug", rarity: "Episch" };
  if (rank === 5) return { count: 2, label: "2 zeldzame bugs", rarity: "Zeldzaam" };
  return null;
}

export function effectiveDuelRating(user: User, seasonId = currentDuelSeasonId()): number {
  if (user.duelSeasonId && user.duelSeasonId !== seasonId) return defaultDuelRating;
  const rating = Math.round(user.duelRating ?? defaultDuelRating);
  return Number.isFinite(rating) ? Math.max(100, rating) : defaultDuelRating;
}

export function duelSeasonRank(users: User[], uid: string, seasonId = currentDuelSeasonId()): number | null {
  const ranked = [...users]
    .filter((user) => user.active !== false)
    .sort((a, b) => effectiveDuelRating(b, seasonId) - effectiveDuelRating(a, seasonId) || a.displayName.localeCompare(b.displayName));
  const index = ranked.findIndex((user) => user.uid === uid);
  return index >= 0 ? index + 1 : null;
}

export async function getDuelSeasonSummary(seasonId = previousDuelSeasonId()): Promise<DuelSeasonSummary | null> {
  if (!isFirebaseConfigured) return null;
  const snapshot = await getDoc(doc(db, "duelSeasons", seasonId));
  if (!snapshot.exists()) return null;
  return normalizeSeasonSummary(seasonId, snapshot.data() as Partial<DuelSeasonSummary>);
}

export async function getOwnDuelSeasonClaim(uid: string, seasonId = previousDuelSeasonId()): Promise<DuelSeasonClaim | null> {
  if (!isFirebaseConfigured) return null;
  const snapshot = await getDoc(doc(db, "users", uid, "duelSeasonClaims", seasonId));
  if (!snapshot.exists()) return null;
  return normalizeSeasonClaim(seasonId, uid, snapshot.data() as Partial<DuelSeasonClaim>);
}

function normalizeSeasonSummary(seasonId: string, value: Partial<DuelSeasonSummary>): DuelSeasonSummary {
  const top5 = Array.isArray(value.top5) ? value.top5 : [];
  return {
    closedAt: typeof value.closedAt === "string" ? value.closedAt : "",
    seasonId: typeof value.seasonId === "string" ? value.seasonId : seasonId,
    top5: top5.map((item, index) => ({
      bugIds: Array.isArray(item.bugIds) ? item.bugIds.filter((bugId): bugId is string => typeof bugId === "string") : [],
      displayName: typeof item.displayName === "string" ? item.displayName : "Speler",
      duelRating: typeof item.duelRating === "number" ? item.duelRating : defaultDuelRating,
      rank: typeof item.rank === "number" ? item.rank : index + 1,
      reward: normalizeReward(item.reward, index + 1),
      uid: typeof item.uid === "string" ? item.uid : ""
    })).filter((item) => item.uid)
  };
}

function normalizeSeasonClaim(seasonId: string, uid: string, value: Partial<DuelSeasonClaim>): DuelSeasonClaim {
  const rank = typeof value.rank === "number" ? value.rank : 0;
  return {
    bugIds: Array.isArray(value.bugIds) ? value.bugIds.filter((bugId): bugId is string => typeof bugId === "string") : [],
    claimedAt: typeof value.claimedAt === "string" ? value.claimedAt : "",
    displayName: typeof value.displayName === "string" ? value.displayName : "Speler",
    newBugIds: Array.isArray(value.newBugIds) ? value.newBugIds.filter((bugId): bugId is string => typeof bugId === "string") : undefined,
    rank,
    reward: normalizeReward(value.reward, rank),
    seasonId: typeof value.seasonId === "string" ? value.seasonId : seasonId,
    seenAt: typeof value.seenAt === "string" ? value.seenAt : undefined,
    uid: typeof value.uid === "string" ? value.uid : uid
  };
}

function normalizeReward(value: unknown, rank: number): DuelSeasonReward {
  const fallback = duelSeasonRewardForRank(rank) ?? { count: 0, label: "Geen reward", rarity: "Zeldzaam" as const };
  if (!value || typeof value !== "object") return fallback;
  const reward = value as Partial<DuelSeasonReward>;
  const rarity = reward.rarity === "Mythisch" || reward.rarity === "Legendarisch" || reward.rarity === "Episch" || reward.rarity === "Zeldzaam" ? reward.rarity : fallback.rarity;
  const count = typeof reward.count === "number" ? reward.count : fallback.count;
  return {
    count,
    label: typeof reward.label === "string" ? reward.label : fallback.label,
    rarity
  };
}
