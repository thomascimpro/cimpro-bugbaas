const test = require("node:test");
const assert = require("node:assert/strict");
const { soloCampaignMilestoneForLevel, soloCampaignMilestoneEligible } = require("./soloCampaignMilestoneCore");

test("maps all five boss levels to fixed species and required waves", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(soloCampaignMilestoneForLevel), [
    { bossLevel: 1, bugId: "vliegend-hert", claimId: "solo-boss-1", rarity: "Legendarisch", requiredWave: 4 },
    { bossLevel: 2, bugId: "bidsprinkhaan", claimId: "solo-boss-2", rarity: "Episch", requiredWave: 8 },
    { bossLevel: 3, bugId: "regenboogmestkever", claimId: "solo-boss-3", rarity: "Legendarisch", requiredWave: 12 },
    { bossLevel: 4, bugId: "hoornaar", claimId: "solo-boss-4", rarity: "Episch", requiredWave: 16 },
    { bossLevel: 5, bugId: "atlaskever", claimId: "solo-boss-5", rarity: "Legendarisch", requiredWave: 20 }
  ]);
});

test("only stored campaign progress at or beyond the boss wave is eligible", () => {
  assert.equal(soloCampaignMilestoneEligible({ bossLevel: 3, storedWave: 11 }), false);
  assert.equal(soloCampaignMilestoneEligible({ bossLevel: 3, storedWave: 12 }), true);
  assert.equal(soloCampaignMilestoneEligible({ bossLevel: 3, storedWave: 20 }), true);
  assert.equal(soloCampaignMilestoneEligible({ bossLevel: 8, storedWave: 20 }), false);
});
