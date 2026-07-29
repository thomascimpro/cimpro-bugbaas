import assert from "node:assert/strict";
import test from "node:test";
import { soloCampaignBossMilestone } from "./soloCampaignMilestoneModel.ts";

test("each campaign boss has one fixed visible species milestone", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((level) => soloCampaignBossMilestone(level)), [
    { bossLevel: 1, bugId: "vliegend-hert", claimId: "solo-boss-1" },
    { bossLevel: 2, bugId: "bidsprinkhaan", claimId: "solo-boss-2" },
    { bossLevel: 3, bugId: "regenboogmestkever", claimId: "solo-boss-3" },
    { bossLevel: 4, bugId: "hoornaar", claimId: "solo-boss-4" },
    { bossLevel: 5, bugId: "atlaskever", claimId: "solo-boss-5" }
  ]);
});

test("invalid campaign levels do not create a reward", () => {
  assert.equal(soloCampaignBossMilestone(0), undefined);
  assert.equal(soloCampaignBossMilestone(6), undefined);
});
