const wingCatalog = require("./museumWingCatalog.json");

const regularWingIds = ["beetles", "wings", "water", "night", "crawlers"];
const rarityRank = { Gewoon: 0, Zeldzaam: 1, Episch: 2, Legendarisch: 3, Mythisch: 4 };
const stageRank = { hidden: 0, discovered: 1, open: 2, curated: 3, master: 4 };

const rewardCatalog = Object.freeze({
  "museum:beetles:open": { rewardXp: 15 },
  "museum:beetles:curated": { rewardXp: 25, rewardBadgeId: "bugdex-set-beetle-brigade" },
  "museum:beetles:master": { rewardXp: 40, rewardBugId: "giraffekevertje", rewardRarity: "Mythisch" },
  "museum:beetles:prestige": { rewardTitleId: "beetle-vault-prestige" },
  "museum:wings:open": { rewardXp: 15 },
  "museum:wings:curated": { rewardXp: 25, rewardBadgeId: "bugdex-set-wings-of-color" },
  "museum:wings:master": { rewardXp: 40, rewardBugId: "koningin-alexandravlinder", rewardRarity: "Mythisch" },
  "museum:wings:prestige": { rewardTitleId: "wing-gallery-prestige" },
  "museum:water:open": { rewardXp: 15 },
  "museum:water:curated": { rewardXp: 25, rewardBadgeId: "bugdex-set-water-hunters" },
  "museum:water:master": { rewardXp: 40 },
  "museum:water:prestige": { rewardTitleId: "water-lab-prestige" },
  "museum:night:open": { rewardXp: 15 },
  "museum:night:curated": { rewardXp: 25, rewardBadgeId: "bugdex-set-night-crew" },
  "museum:night:master": { rewardXp: 40, rewardBugId: "roze-esdoornmot", rewardRarity: "Mythisch" },
  "museum:night:prestige": { rewardTitleId: "night-cabinet-prestige" },
  "museum:crawlers:open": { rewardXp: 15 },
  "museum:crawlers:curated": { rewardXp: 25, rewardBadgeId: "bugdex-set-web-and-sting" },
  "museum:crawlers:master": { rewardXp: 40 },
  "museum:crawlers:prestige": { rewardTitleId: "crawler-archive-prestige" },
  "museum:crown:bronze": { rewardTitleId: "bronze-curator" },
  "museum:crown:silver": { rewardBugId: "picasso-wants", rewardRarity: "Mythisch", rewardTitleId: "silver-curator" },
  "museum:crown:gold": { rewardTitleId: "gold-curator" },
  "museum:crown:legend": { rewardBadgeId: "mythic-master", rewardTitleId: "museum-legend" }
});

function museumClaimId(wingId, milestoneId) {
  return `museum:${wingId}:${milestoneId}`;
}

function normalizeEvidence(input = {}) {
  return {
    inventory: Array.isArray(input.inventory) ? input.inventory.filter((item) => item && Number(item.count) > 0) : [],
    masteries: Array.isArray(input.masteries) ? input.masteries : [],
    observations: Array.isArray(input.observations) ? input.observations : [],
    placementsByWing: input.placementsByWing && typeof input.placementsByWing === "object" ? input.placementsByWing : {},
    trophyCount: Math.max(0, Math.floor(Number(input.trophyCount) || 0))
  };
}

function evaluateMuseumProgress(input) {
  const evidence = normalizeEvidence(input);
  const inventoryIds = new Set(evidence.inventory.map((item) => String(item.bugId || "")).filter(Boolean));
  const rarityByBugId = new Map(evidence.inventory.map((item) => [String(item.bugId || ""), String(item.rarity || "Gewoon")]));
  const masteryById = new Map(evidence.masteries.map((item) => [String(item.bugId || ""), Math.max(1, Math.floor(Number(item.level) || 1))]));
  const observationIdsByBug = new Map();
  const observationsByBug = new Map();
  for (const item of evidence.observations) {
    const bugId = String(item.bugId || "");
    if (!bugId) continue;
    const ids = observationIdsByBug.get(bugId) || new Set();
    ids.add(String(item.id || item.scanId || `${bugId}:${ids.size}`));
    observationIdsByBug.set(bugId, ids);
    const items = observationsByBug.get(bugId) || [];
    items.push(item);
    observationsByBug.set(bugId, items);
  }

  const wings = {};
  for (const wingId of regularWingIds) {
    const eligibleIds = new Set(wingCatalog[wingId] || []);
    const ownedIds = [...inventoryIds].filter((id) => eligibleIds.has(id));
    const observedCount = ownedIds.reduce((total, id) => total + (observationIdsByBug.get(id)?.size || 0), 0);
    const observedSpeciesCount = ownedIds.filter((id) => (observationIdsByBug.get(id)?.size || 0) > 0).length;
    const habitat = wingId === "water" ? "Water" : wingId === "night" ? "Nacht" : "";
    const habitatCount = habitat ? ownedIds.reduce((total, id) => total + (observationsByBug.get(id) || []).filter((item) => String(item.habitat || "") === habitat).length, 0) : 0;
    const stage = calculateWingStage(wingId, ownedIds, masteryById, rarityByBugId, observedSpeciesCount, habitatCount);
    const placements = Array.isArray(evidence.placementsByWing[wingId]) ? evidence.placementsByWing[wingId] : [];
    const placedIds = new Set(placements.map((item) => String(item?.bugId || "")).filter((id) => ownedIds.includes(id)));
    const trainedPlaced = [...placedIds].filter((id) => (masteryById.get(id) || 1) >= 10).length;
    const highRarityPlaced = [...placedIds].filter((id) => rarityAtLeast(rarityByBugId, id, "Legendarisch")).length;
    const prestige = stage === "master" && placedIds.size >= 6 && trainedPlaced >= 4 && highRarityPlaced >= 1 && observedCount >= 3;
    wings[wingId] = { stage, prestige, ownedCount: ownedIds.length, observedCount, observedSpeciesCount, habitatCount, placedCount: placedIds.size, trainedPlaced, highRarityPlaced };
  }

  const masterCount = regularWingIds.filter((id) => stageRank[wings[id].stage] >= stageRank.master).length;
  const prestigeCount = regularWingIds.filter((id) => wings[id].prestige).length;
  const crownPlacements = new Set((Array.isArray(evidence.placementsByWing.crown) ? evidence.placementsByWing.crown : []).map((item) => String(item?.bugId || "")).filter((id) => inventoryIds.has(id))).size;
  const crown = {
    bronze: masterCount >= 2,
    silver: masterCount >= 5,
    gold: prestigeCount >= 3,
    legend: prestigeCount >= 5 && crownPlacements >= 6 && evidence.trophyCount >= 1,
    masterCount,
    prestigeCount,
    crownPlacements,
    trophyCount: evidence.trophyCount
  };
  return { wings, crown };
}

function eligibleMuseumClaimIds(input) {
  const progress = evaluateMuseumProgress(input);
  const ids = [];
  for (const wingId of regularWingIds) {
    const wing = progress.wings[wingId];
    if (stageRank[wing.stage] >= stageRank.open) ids.push(museumClaimId(wingId, "open"));
    if (stageRank[wing.stage] >= stageRank.curated) ids.push(museumClaimId(wingId, "curated"));
    if (stageRank[wing.stage] >= stageRank.master) ids.push(museumClaimId(wingId, "master"));
    if (wing.prestige) ids.push(museumClaimId(wingId, "prestige"));
  }
  if (progress.crown.bronze) ids.push(museumClaimId("crown", "bronze"));
  if (progress.crown.silver) ids.push(museumClaimId("crown", "silver"));
  if (progress.crown.gold) ids.push(museumClaimId("crown", "gold"));
  if (progress.crown.legend) ids.push(museumClaimId("crown", "legend"));
  return ids;
}

function rewardForClaimId(claimId) {
  return rewardCatalog[claimId] || null;
}

function calculateWingStage(wingId, ownedIds, masteryById, rarityByBugId, observedSpeciesCount, habitatCount) {
  if (!ownedIds.length) return "hidden";
  const total = (wingCatalog[wingId] || []).length;
  const openSpecies = Math.min(total, 3);
  const curatedSpecies = Math.min(total, Math.max(openSpecies, Math.ceil(total * 0.35)));
  const masterSpecies = Math.min(total, Math.max(curatedSpecies, Math.ceil(total * 0.8)));
  const level3 = ownedIds.filter((id) => (masteryById.get(id) || 1) >= 3).length;
  const level5 = ownedIds.filter((id) => (masteryById.get(id) || 1) >= 5).length;
  const level20 = ownedIds.filter((id) => (masteryById.get(id) || 1) >= 20).length;
  const curatedRarity = wingId === "wings" || wingId === "night" ? "Episch" : "Zeldzaam";
  const masterRarity = wingId === "wings" || wingId === "night" ? "Legendarisch" : "Episch";
  const curatedRarityCount = ownedIds.filter((id) => rarityAtLeast(rarityByBugId, id, curatedRarity)).length;
  const masterRarityRequired = wingId === "beetles" || wingId === "crawlers" ? 2 : 1;
  const masterRarityCount = ownedIds.filter((id) => rarityAtLeast(rarityByBugId, id, masterRarity)).length;
  const habitatOpen = wingId !== "water" && wingId !== "night" || habitatCount >= 1;
  const habitatCurated = wingId !== "water" && wingId !== "night" || habitatCount >= 2;
  const habitatMaster = wingId !== "water" && wingId !== "night" || habitatCount >= 4;
  const open = ownedIds.length >= openSpecies && level3 >= 1 && observedSpeciesCount >= 1 && habitatOpen;
  if (!open) return "discovered";
  const curated = ownedIds.length >= curatedSpecies && level5 >= 3 && curatedRarityCount >= 1 && observedSpeciesCount >= 2 && habitatCurated;
  if (!curated) return "open";
  const master = ownedIds.length >= masterSpecies && level20 >= 1 && masterRarityCount >= masterRarityRequired && observedSpeciesCount >= 3 && habitatMaster;
  return master ? "master" : "curated";
}

function rarityAtLeast(rarityByBugId, bugId, minimum) {
  return (rarityRank[rarityByBugId.get(bugId)] ?? -1) >= (rarityRank[minimum] ?? 99);
}

module.exports = {
  eligibleMuseumClaimIds,
  evaluateMuseumProgress,
  museumClaimId,
  rewardForClaimId,
  rewardCatalog
};
