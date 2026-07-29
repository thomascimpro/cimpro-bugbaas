export const collectionTabs = ["bugdex", "museum", "journal"] as const;
export type CollectionTab = typeof collectionTabs[number];

export function normalizeCollectionTab(value: unknown): CollectionTab {
  return collectionTabs.includes(value as CollectionTab) ? value as CollectionTab : "bugdex";
}

type CollectionEntry = { id: string };
type CollectionTimestamp = { bugId: string; lastUnlockedAt?: string };

export function sortCollectionEntriesByLatest<T extends CollectionEntry>(
  entries: T[],
  inventory: CollectionTimestamp[],
  unlocks: CollectionTimestamp[]
): T[] {
  const latestByBugId = new Map<string, number>();
  for (const item of [...inventory, ...unlocks]) {
    const timestamp = Date.parse(item.lastUnlockedAt ?? "");
    if (Number.isFinite(timestamp)) {
      latestByBugId.set(item.bugId, Math.max(latestByBugId.get(item.bugId) ?? 0, timestamp));
    }
  }
  return [...entries].sort((first, second) => (latestByBugId.get(second.id) ?? 0) - (latestByBugId.get(first.id) ?? 0));
}
