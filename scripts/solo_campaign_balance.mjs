const maxWave = 20;
const wavesPerLevel = 4;
const scoreByRank = [1, 2, 4, 6, 9];
const tapsByRank = [2, 3, 5, 7, 9];
const targetsByLevel = [
  [72, 84, 94, 108],
  [92, 104, 116, 134],
  [112, 126, 140, 164],
  [134, 150, 166, 194],
  [158, 176, 196, 228]
];

const profiles = [
  { name: "beginner_no_squad", taps: 34, technique: 0.42, risk: 0.2, tapSave: 0, bonusNormal: 0, bonusBoss: 0 },
  { name: "average_low_squad", taps: 44, technique: 0.58, risk: 0.38, tapSave: 0.08, bonusNormal: 1, bonusBoss: 2 },
  { name: "skilled_epic_squad", taps: 56, technique: 0.72, risk: 0.62, tapSave: 0.16, bonusNormal: 3, bonusBoss: 5 },
  { name: "skilled_mythic_squad", taps: 60, technique: 0.78, risk: 0.76, tapSave: 0.24, bonusNormal: 5, bonusBoss: 8 }
];

function campaignConfig(wave) {
  const safeWave = Math.max(1, Math.min(maxWave, Math.floor(wave)));
  const level = Math.floor((safeWave - 1) / wavesPerLevel) + 1;
  const waveInLevel = ((safeWave - 1) % wavesPerLevel) + 1;
  const boss = waveInLevel === wavesPerLevel;
  const targetScore = targetsByLevel[level - 1]?.[waveInLevel - 1] ?? 60;
  const pcScore = Math.max(60, targetScore - (boss ? 6 : 10));
  return { boss, level, pcScore, targetScore, wave: safeWave, waveInLevel };
}

function maxRankFor(config) {
  return config.boss ? Math.min(4, 2 + config.level) : Math.min(3, 1 + Math.ceil((config.level + config.waveInLevel) / 2));
}

function stableHash(seed) {
  return String(seed).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function targetRanks(config, seed) {
  const maxRank = maxRankFor(config);
  const ranks = [];
  if (config.boss) ranks.push(Math.min(4, Math.max(3, config.level)));
  for (let index = ranks.length; index < 36; index += 1) {
    const roll = stableHash(`${seed}:${config.wave}:${index}`) % 1000;
    if (maxRank >= 4 && roll > 965) ranks.push(4);
    else if (maxRank >= 3 && roll > 850) ranks.push(3);
    else if (maxRank >= 2 && roll > 650) ranks.push(2);
    else if (maxRank >= 1 && roll > 360) ranks.push(1);
    else ranks.push(0);
  }
  return ranks;
}

function runScore(config, profile, seed) {
  const targets = targetRanks(config, seed).map((rank, index) => {
    const efficiency = scoreByRank[rank] / tapsByRank[rank];
    const rarityPull = rank * profile.risk * 0.16;
    const jitter = (stableHash(`${seed}:${profile.name}:${index}`) % 100) / 1000;
    return { rank, score: scoreByRank[rank], taps: Math.max(1, tapsByRank[rank] - Math.floor(rank * profile.tapSave)), value: efficiency + rarityPull + jitter };
  }).sort((a, b) => b.value - a.value);

  let tapsLeft = Math.round(profile.taps * profile.technique);
  let score = config.boss ? profile.bonusBoss : profile.bonusNormal;
  for (const target of targets) {
    if (target.taps > tapsLeft) continue;
    tapsLeft -= target.taps;
    score += target.score;
  }
  return score;
}

function summarizeWave(wave, profile) {
  const config = campaignConfig(wave);
  const scores = Array.from({ length: 500 }, (_, index) => runScore(config, profile, 12000 + index * 17));
  const wins = scores.filter((score) => score >= config.targetScore && score >= config.pcScore).length;
  const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return {
    wave,
    level: config.level,
    type: config.boss ? "boss" : "normal",
    target: config.targetScore,
    pc: config.pcScore,
    profile: profile.name,
    avgScore: Number(avg.toFixed(1)),
    winRate: Number((wins / scores.length).toFixed(2))
  };
}

const rows = [];
for (let wave = 1; wave <= maxWave; wave += 1) {
  for (const profile of profiles) rows.push(summarizeWave(wave, profile));
}

console.table(rows);

const gates = rows.filter((row) => row.wave % wavesPerLevel === 0);
console.log("\nBoss gates:");
console.table(gates);
