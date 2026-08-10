export type RecoverablePlayTab = "arcade" | "ranking";

export type PlaySessionSnapshot = {
  open: boolean;
  tab: RecoverablePlayTab;
  updatedAt: number;
};

export const playSessionRecoveryTtlMs = 30 * 60 * 1000;

export function encodePlaySessionSnapshot(open: boolean, tab: RecoverablePlayTab, now = Date.now()): string {
  return JSON.stringify({ open, tab, updatedAt: now } satisfies PlaySessionSnapshot);
}

export function readRecentPlaySession(raw: string | null, now = Date.now()): PlaySessionSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlaySessionSnapshot>;
    if (typeof parsed.open !== "boolean" || (parsed.tab !== "arcade" && parsed.tab !== "ranking")) return null;
    if (typeof parsed.updatedAt !== "number" || now - parsed.updatedAt < 0 || now - parsed.updatedAt > playSessionRecoveryTtlMs) return null;
    return parsed as PlaySessionSnapshot;
  } catch {
    return null;
  }
}
