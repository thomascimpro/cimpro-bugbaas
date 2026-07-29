export type TeamHuntWindow = { active: boolean; id: string; startsAt: string; endsAt: string };

export function teamHuntWindow(value = new Date()): TeamHuntWindow | undefined {
  if (!Number.isFinite(value.getTime())) return undefined;
  const local = amsterdamParts(value);
  const year = Number(local.year);
  const month = Number(local.month);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstFriday = 1 + ((5 - first.getUTCDay() + 7) % 7);
  const start = localToUtc(year, month, firstFriday, 12);
  const sunday = new Date(Date.UTC(year, month - 1, firstFriday + 2));
  const end = localToUtc(sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate(), 18);
  return {
    active: value >= start && value < end,
    id: `team-hunt-${year}-${String(month).padStart(2, "0")}`,
    startsAt: start.toISOString(),
    endsAt: end.toISOString()
  };
}

function amsterdamParts(value: Date): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Amsterdam",
    year: "numeric"
  }).formatToParts(value).map((part) => [part.type, part.value]));
}

function localToUtc(year: number, month: number, day: number, hour: number): Date {
  const target = Date.UTC(year, month - 1, day, hour);
  let timestamp = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = amsterdamParts(new Date(timestamp));
    const shownAsUtc = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(shown.hour), Number(shown.minute), Number(shown.second));
    timestamp -= shownAsUtc - target;
  }
  return new Date(timestamp);
}
