import AsyncStorage from "@react-native-async-storage/async-storage";

export const rankedDuelSessionTtlMs = 30 * 60 * 1000;

export type RankedDuelSession = {
  duelId: string;
  startAt: string;
  score: number;
  caughtBugIds: string[];
  hitCounts: Record<string, number>;
  updatedAt: number;
};

function rankedDuelSessionStorageKey(uid: string): string {
  return `bugbaas:active-ranked-duel:v1:${uid}`;
}

export function parseRankedDuelSession(raw: string | null, now = Date.now()): RankedDuelSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RankedDuelSession>;
    const validHitCounts = parsed.hitCounts
      && typeof parsed.hitCounts === "object"
      && !Array.isArray(parsed.hitCounts)
      && Object.entries(parsed.hitCounts).every(([bugId, hits]) => bugId.length > 0 && typeof hits === "number" && Number.isFinite(hits) && hits >= 0);
    if (typeof parsed.duelId !== "string" || !parsed.duelId) return null;
    if (typeof parsed.startAt !== "string" || !Number.isFinite(Date.parse(parsed.startAt))) return null;
    if (typeof parsed.score !== "number" || !Number.isFinite(parsed.score) || parsed.score < 0) return null;
    if (!Array.isArray(parsed.caughtBugIds) || !parsed.caughtBugIds.every((bugId) => typeof bugId === "string" && bugId.length > 0)) return null;
    if (!validHitCounts) return null;
    if (typeof parsed.updatedAt !== "number" || now - parsed.updatedAt < 0 || now - parsed.updatedAt > rankedDuelSessionTtlMs) return null;
    return parsed as RankedDuelSession;
  } catch {
    return null;
  }
}

export async function loadRankedDuelSession(uid: string): Promise<RankedDuelSession | null> {
  const key = rankedDuelSessionStorageKey(uid);
  const session = parseRankedDuelSession(await AsyncStorage.getItem(key));
  if (!session) await AsyncStorage.removeItem(key).catch(() => undefined);
  return session;
}

export async function saveRankedDuelSession(uid: string, session: Omit<RankedDuelSession, "updatedAt">): Promise<void> {
  await AsyncStorage.setItem(rankedDuelSessionStorageKey(uid), JSON.stringify({ ...session, updatedAt: Date.now() } satisfies RankedDuelSession));
}

export async function clearRankedDuelSession(uid: string): Promise<void> {
  await AsyncStorage.removeItem(rankedDuelSessionStorageKey(uid));
}
