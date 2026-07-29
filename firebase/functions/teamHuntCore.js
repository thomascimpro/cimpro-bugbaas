const { createHash } = require("node:crypto");

const timezone = "Europe/Amsterdam";
const teamHuntCategoryIds = Object.freeze(["beetles", "wings", "crawlers", "jumpers", "stingers", "water"]);

function parts(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("value must be a valid date");
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    weekday: "short",
    year: "numeric"
  }).formatToParts(date).map((part) => [part.type, part.value]));
}

function localToUtc(year, month, day, hour) {
  const target = Date.UTC(year, month - 1, day, hour);
  let timestamp = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = parts(new Date(timestamp));
    const shownAsUtc = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(shown.hour), Number(shown.minute), Number(shown.second));
    timestamp -= shownAsUtc - target;
  }
  return new Date(timestamp);
}

function firstFriday(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const delta = (5 - first.getUTCDay() + 7) % 7;
  return 1 + delta;
}

function teamHuntWeekendForDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const local = parts(date);
  const year = Number(local.year);
  const month = Number(local.month);
  const friday = firstFriday(year, month);
  const start = localToUtc(year, month, friday, 12);
  const sundayDate = new Date(Date.UTC(year, month - 1, friday + 2));
  const end = localToUtc(sundayDate.getUTCFullYear(), sundayDate.getUTCMonth() + 1, sundayDate.getUTCDate(), 18);
  if (date < start || date >= end) return null;
  return {
    end,
    id: `team-hunt-${year}-${String(month).padStart(2, "0")}`,
    start
  };
}

function normalizeTeamHuntSpecies(observation) {
  if (!observation || !["matched", "not_in_catalog"].includes(observation.status)) return null;
  const source = String(observation.bugId || observation.scientificName || observation.speciesName || "").trim();
  if (!source) return null;
  const normalized = source.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized) return null;
  return {
    id: createHash("sha256").update(normalized).digest("hex").slice(0, 32),
    key: normalized,
    label: String(observation.speciesName || observation.scientificName || observation.bugId).trim().slice(0, 120)
  };
}

function teamHuntCategoryForSpeciesKey(value) {
  const key = String(value || "").toLowerCase();
  if (!key) return "crawlers";
  if (/(water|schaatsenrijder|schrijvertje|schietmot|eendagsvlieg|juffer|libel)/.test(key)) return "water";
  if (/(bij|wesp|hoornaar|mier)/.test(key)) return "stingers";
  if (/(sprinkhaan|krekel|cicade|springstaart|veenmol)/.test(key)) return "jumpers";
  if (/(vlinder|mot|vlieg|mug|dagpauwoog|atalanta|aurelia|zandoogje|blauwtje|witje|hooibeestje|landkaartje|oranjetipje|groentje|dikkopje|keizersmantel|rouwmantel|kleine-vos)/.test(key)) return "wings";
  if (/(kever|tor|boktor|haantje|scarabee|doodgraver|vliegend-hert)/.test(key)) return "beetles";
  return "crawlers";
}

function teamHuntCategorySummary(categoryIds) {
  const completed = teamHuntCategoryIds.filter((id) => new Set(categoryIds || []).has(id));
  return {
    completed,
    missing: teamHuntCategoryIds.filter((id) => !completed.includes(id))
  };
}

function observationIsInsideWeekend(observation, weekend) {
  const observedAt = new Date(observation?.observedAt || "");
  return Boolean(weekend && Number.isFinite(observedAt.getTime()) && observedAt >= weekend.start && observedAt < weekend.end);
}

module.exports = { normalizeTeamHuntSpecies, observationIsInsideWeekend, teamHuntCategoryForSpeciesKey, teamHuntCategoryIds, teamHuntCategorySummary, teamHuntWeekendForDate };
