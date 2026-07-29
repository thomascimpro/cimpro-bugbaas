import assert from "node:assert/strict";
import test from "node:test";
import { swarmSiegeNestBalance } from "./swarmSiegeGameBalance.ts";

test("normal play has neutral balance", () => {
  assert.deepEqual(swarmSiegeNestBalance(undefined), {
    armoredWeightBonus: 0,
    bossWaveInterval: 5,
    burstEveryWave: 0,
    fastWeightBonus: 0,
    hpMultiplier: 1,
    speedMultiplier: 1
  });
});

test("each event modifier changes one readable pressure axis", () => {
  assert.equal(swarmSiegeNestBalance("fast_swarm").fastWeightBonus, 0.2);
  assert.equal(swarmSiegeNestBalance("armored_brood").armoredWeightBonus, 0.2);
  assert.equal(swarmSiegeNestBalance("double_wave").burstEveryWave, 3);
  assert.equal(swarmSiegeNestBalance("unstable_core").bossWaveInterval, 3);
});
