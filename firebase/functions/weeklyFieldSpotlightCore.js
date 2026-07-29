const { createHash } = require("node:crypto");

const weeklyFieldSpotlightPool = Object.freeze([
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
]);

const weeklyFieldSpotlightEpicPool = Object.freeze([
  "citroenvlinder",
  "landkaartje",
  "boomblauwtje",
  "leliehaantje",
  "gamma-uil",
  "agaatvlinder",
  "stadsreus",
  "rosse-metselbij"
]);

const rotationEpochMondayUtc = Date.UTC(2020, 0, 6);
const weekMs = 7 * 24 * 60 * 60 * 1000;

function weeklyFieldSpotlight(date = new Date()) {
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

function buildWeeklyFieldSpotlightClaim({ bugId, date = new Date(), existingClaim, existingRewardItem, now = new Date().toISOString(), uid }) {
  const spotlight = weeklyFieldSpotlight(date);
  const matched = spotlight.bugIds.includes(String(bugId || ""));
  if (!matched) {
    return {
      awardedXp: 0,
      bugIds: spotlight.bugIds,
      claimed: false,
      duplicate: false,
      matched: false,
      weekId: spotlight.weekId
    };
  }

  if (existingClaim) {
    return {
      awardedXp: 0,
      bugIds: spotlight.bugIds,
      claimed: false,
      duplicate: true,
      matched: true,
      rewardBugId: String(existingClaim.awardedBugId || "") || undefined,
      weekId: spotlight.weekId
    };
  }

  const rewardBugId = weeklyFieldSpotlightEpicPool[hashIndex(`${uid}:${spotlight.weekId}`, weeklyFieldSpotlightEpicPool.length)];
  const previousCount = Math.max(0, Math.floor(Number(existingRewardItem?.count) || 0));
  const previousSources = Array.isArray(existingRewardItem?.sources) ? existingRewardItem.sources : [];
  const rewardItem = {
    ...(existingRewardItem || {}),
    bugId: rewardBugId,
    count: previousCount + 1,
    firstUnlockedAt: existingRewardItem?.firstUnlockedAt || now,
    lastUnlockedAt: now,
    rarity: "Episch",
    sources: Array.from(new Set([...previousSources, "weekly_field_spotlight"]))
  };

  return {
    awardedXp: 50,
    bugIds: spotlight.bugIds,
    claimed: true,
    duplicate: false,
    isNew: previousCount === 0,
    matched: true,
    rewardBugId,
    rewardItem,
    weekId: spotlight.weekId
  };
}

function amsterdamWeekMonday(date) {
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

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function hashIndex(value, size) {
  const hash = createHash("sha256").update(String(value)).digest();
  return hash.readUInt32BE(0) % size;
}

module.exports = {
  buildWeeklyFieldSpotlightClaim,
  weeklyFieldSpotlight,
  weeklyFieldSpotlightEpicPool,
  weeklyFieldSpotlightPool
};
