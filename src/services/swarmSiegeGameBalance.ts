import type { SwarmSiegeModifier } from "./swarmSiegeService";

export type SwarmSiegeNestBalance = {
  armoredWeightBonus: number;
  bossWaveInterval: number;
  burstEveryWave: number;
  fastWeightBonus: number;
  hpMultiplier: number;
  speedMultiplier: number;
};

const neutral: SwarmSiegeNestBalance = {
  armoredWeightBonus: 0,
  bossWaveInterval: 5,
  burstEveryWave: 0,
  fastWeightBonus: 0,
  hpMultiplier: 1,
  speedMultiplier: 1
};

export function swarmSiegeNestBalance(modifier?: SwarmSiegeModifier): SwarmSiegeNestBalance {
  if (modifier === "fast_swarm") return { ...neutral, fastWeightBonus: 0.2, speedMultiplier: 1.08 };
  if (modifier === "armored_brood") return { ...neutral, armoredWeightBonus: 0.2, hpMultiplier: 1.12 };
  if (modifier === "double_wave") return { ...neutral, burstEveryWave: 3 };
  if (modifier === "unstable_core") return { ...neutral, bossWaveInterval: 3, hpMultiplier: 1.08, speedMultiplier: 1.05 };
  return neutral;
}
