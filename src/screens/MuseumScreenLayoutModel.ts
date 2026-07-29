export const museumTabs = ["room", "goals", "collection"] as const;

export type MuseumTab = (typeof museumTabs)[number];

export type MuseumPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

export function adjacentMuseumWingId<T extends string>(wingIds: readonly T[], currentWingId: T, direction: -1 | 1): T {
  if (!wingIds.length) return currentWingId;
  const currentIndex = Math.max(0, wingIds.indexOf(currentWingId));
  return wingIds[(currentIndex + direction + wingIds.length) % wingIds.length]!;
}

export function clampMuseumPage(page: number, itemCount: number, pageSize = 6): number {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(Math.max(0, itemCount) / safePageSize));
  return Math.min(Math.max(0, Math.floor(page)), pageCount - 1);
}

export function paginateMuseumItems<T>(items: readonly T[], page: number, pageSize = 6): MuseumPage<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const safePage = clampMuseumPage(page, items.length, safePageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize));
  const start = safePage * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageCount,
    hasPrevious: safePage > 0,
    hasNext: safePage < pageCount - 1
  };
}
