export const weeklyFieldSpotlightPool = [
  "mier",
  "pissebed",
  "bladluis",
  "mug",
  "fruitvlieg",
  "zilvervisje",
  "oorworm",
  "huisvlieg",
  "honingbij",
  "hommel",
  "meikever",
  "mot"
] as const;

export type WeeklyFieldSpotlightBugId = (typeof weeklyFieldSpotlightPool)[number];

export type WeeklyFieldSpotlight = {
  weekId: string;
  bugIds: readonly [WeeklyFieldSpotlightBugId, WeeklyFieldSpotlightBugId, WeeklyFieldSpotlightBugId];
};

const rotationEpochMondayUtc = Date.UTC(2020, 0, 6);
const weekMs = 7 * 24 * 60 * 60 * 1000;

export function weeklyFieldSpotlight(date = new Date()): WeeklyFieldSpotlight {
  const monday = amsterdamWeekMonday(date);
  const weekIndex = Math.floor((monday.getTime() - rotationEpochMondayUtc) / weekMs);
  const start = positiveModulo(weekIndex, weeklyFieldSpotlightPool.length);
  return {
    weekId: monday.toISOString().slice(0, 10),
    bugIds: [
      weeklyFieldSpotlightPool[start],
      weeklyFieldSpotlightPool[(start + 4) % weeklyFieldSpotlightPool.length],
      weeklyFieldSpotlightPool[(start + 8) % weeklyFieldSpotlightPool.length]
    ]
  };
}

function amsterdamWeekMonday(date: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Amsterdam",
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
  return localDate;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
