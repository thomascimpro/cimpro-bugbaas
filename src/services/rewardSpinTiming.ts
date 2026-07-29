export type RewardSpinStep = { delayMs: number; rarityIndex: number };

export function rewardSpinSchedule(targetRarityIndex: number): RewardSpinStep[] {
  const target = Math.max(0, Math.min(4, Math.floor(targetRarityIndex)));
  const steps: RewardSpinStep[] = [];
  const delays = [70, 75, 80, 90, 105, 125, 150, 185, 230, 290];
  for (let index = 0; index < delays.length - 1; index += 1) {
    steps.push({ delayMs: delays[index], rarityIndex: index % 5 });
  }
  steps.push({ delayMs: delays[delays.length - 1], rarityIndex: target });
  return steps;
}
