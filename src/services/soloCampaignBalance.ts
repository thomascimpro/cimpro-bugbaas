import { bugSmashDuelBugCount } from "./bugSmashDuelService";
import { bugDexEntries, BugDexRarity } from "./pointsService";

export type SoloCampaignConfig = {
  boss: boolean;
  bugCount: number;
  level: number;
  pcScore: number;
  spawnSpacingMultiplier: number;
  targetScore: number;
  wave: number;
};

export const soloCampaignMaxLevel = 5;
export const soloCampaignWavesPerLevel = 4;
export const soloCampaignMaxWave = soloCampaignMaxLevel * soloCampaignWavesPerLevel;

export const soloCampaignTargetsByLevel = [
  [56, 66, 76, 88],
  [70, 82, 94, 110],
  [86, 100, 114, 134],
  [104, 120, 136, 160],
  [124, 142, 162, 190]
];

export function soloCampaignTargetRange(level: number) {
  const targets = soloCampaignTargetsByLevel[Math.max(1, Math.min(soloCampaignMaxLevel, level)) - 1] ?? soloCampaignTargetsByLevel[0];
  return { start: targets[0], boss: targets[targets.length - 1] };
}

export function soloCampaignConfig(wave: number): SoloCampaignConfig {
  const safeWave = Math.max(1, Math.min(soloCampaignMaxWave, Math.floor(wave)));
  const level = Math.floor((safeWave - 1) / soloCampaignWavesPerLevel) + 1;
  const waveInLevel = ((safeWave - 1) % soloCampaignWavesPerLevel) + 1;
  const boss = waveInLevel === soloCampaignWavesPerLevel;
  const targetScore = soloCampaignTargetsByLevel[level - 1]?.[waveInLevel - 1] ?? 60;
  const pcScore = Math.max(60, targetScore - (boss ? 6 : 10));
  const bugCount = safeWave >= 18 ? 56 : safeWave >= 14 ? 48 : safeWave >= 11 ? 40 : bugSmashDuelBugCount;
  const spawnSpacingMultiplier = safeWave >= 18 ? 0.58 : safeWave >= 14 ? 0.68 : safeWave >= 11 ? 0.82 : 1;
  return { boss, bugCount, level, pcScore, spawnSpacingMultiplier, targetScore, wave: safeWave };
}

export function soloCampaignBugIds(seed: number, config: SoloCampaignConfig) {
  const waveInLevel = ((config.wave - 1) % soloCampaignWavesPerLevel) + 1;
  const maxRank = config.boss ? Math.min(4, 2 + config.level) : Math.min(3, 1 + Math.ceil((config.level + waveInLevel) / 2));
  const ranked = bugDexEntries
    .filter((entry) => bugDexRarityRank(entry.rarity) <= maxRank)
    .map((entry, index) => ({ id: entry.id, sort: stableHash(`${seed}:solo:${config.wave}:${entry.id}:${index}`) }))
    .sort((a, b) => a.sort - b.sort);
  const bossLead = config.boss
    ? bugDexEntries
        .filter((entry) => bugDexRarityRank(entry.rarity) >= Math.min(3, config.level + 1))
        .map((entry, index) => ({ id: entry.id, sort: stableHash(`${seed}:boss:${config.wave}:${entry.id}:${index}`) }))
        .sort((a, b) => a.sort - b.sort)
        .map((item) => item.id)[0]
    : "";
  const ids = bossLead ? [bossLead, ...ranked.filter((item) => item.id !== bossLead).map((item) => item.id)] : ranked.map((item) => item.id);
  const fallback = bugDexEntries
    .map((entry, index) => ({ id: entry.id, sort: stableHash(`${seed}:fallback:${entry.id}:${index}`) }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.id);
  return [...ids, ...fallback.filter((id) => !ids.includes(id))].slice(0, config.bugCount);
}

export function bugDexRarityRank(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 4;
  if (rarity === "Legendarisch") return 3;
  if (rarity === "Episch") return 2;
  if (rarity === "Zeldzaam") return 1;
  return 0;
}

function stableHash(seed: string) {
  return seed.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}
