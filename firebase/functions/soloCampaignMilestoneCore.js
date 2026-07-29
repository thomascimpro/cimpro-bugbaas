const milestones = Object.freeze([
  Object.freeze({ bossLevel: 1, bugId: "vliegend-hert", claimId: "solo-boss-1", rarity: "Legendarisch", requiredWave: 4 }),
  Object.freeze({ bossLevel: 2, bugId: "bidsprinkhaan", claimId: "solo-boss-2", rarity: "Episch", requiredWave: 8 }),
  Object.freeze({ bossLevel: 3, bugId: "regenboogmestkever", claimId: "solo-boss-3", rarity: "Legendarisch", requiredWave: 12 }),
  Object.freeze({ bossLevel: 4, bugId: "hoornaar", claimId: "solo-boss-4", rarity: "Episch", requiredWave: 16 }),
  Object.freeze({ bossLevel: 5, bugId: "atlaskever", claimId: "solo-boss-5", rarity: "Legendarisch", requiredWave: 20 })
]);

function soloCampaignMilestoneForLevel(value) {
  const bossLevel = Math.floor(Number(value) || 0);
  return milestones.find((milestone) => milestone.bossLevel === bossLevel);
}

function soloCampaignMilestoneEligible({ bossLevel, storedWave }) {
  const milestone = soloCampaignMilestoneForLevel(bossLevel);
  return Boolean(milestone && Math.floor(Number(storedWave) || 0) >= milestone.requiredWave);
}

module.exports = { milestones, soloCampaignMilestoneForLevel, soloCampaignMilestoneEligible };
