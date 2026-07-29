const assert = require("node:assert/strict");
const test = require("node:test");
const { eligibleMuseumClaimIds, evaluateMuseumProgress, museumClaimId, rewardForClaimId } = require("./museumRewardsCore");

function item(bugId, rarity = "Gewoon") { return { bugId, count: 1, rarity }; }
function mastery(bugId, level) { return { bugId, level }; }
function observation(id, bugId) { return { id, bugId }; }

test("claim ids and rewards are stable", () => {
  assert.equal(museumClaimId("beetles", "open"), "museum:beetles:open");
  assert.deepEqual(rewardForClaimId("museum:beetles:open"), { rewardXp: 15 });
});

test("no progress grants no claims", () => {
  assert.deepEqual(eligibleMuseumClaimIds({}), []);
});

test("open claim requires collection, mastery and a verified observation", () => {
  const inventory = [item("goudtor"), item("snuitkever"), item("boktor")];
  assert.equal(eligibleMuseumClaimIds({ inventory, masteries: [mastery("goudtor", 3)] }).includes("museum:beetles:open"), false);
  assert.equal(eligibleMuseumClaimIds({ inventory, masteries: [mastery("goudtor", 3)], observations: [observation("o1", "goudtor")] }).includes("museum:beetles:open"), true);
});

test("prestige does not add repeatable xp", () => {
  const reward = rewardForClaimId("museum:beetles:prestige");
  assert.equal(reward.rewardXp || 0, 0);
  assert.equal(reward.rewardTitleId, "beetle-vault-prestige");
});

test("duplicate observations of one species do not fake curated field progress", () => {
  const inventory = [item("goudtor", "Zeldzaam"), item("snuitkever"), item("boktor"), item("mestkever"), item("neushoornkever"), item("atlaskever", "Legendarisch"), item("herculeskever"), item("goliathkever")];
  const masteries = [mastery("goudtor", 5), mastery("snuitkever", 5), mastery("boktor", 5)];
  const observations = [observation("o1", "goudtor"), observation("o2", "goudtor"), observation("o3", "goudtor")];
  const progress = evaluateMuseumProgress({ inventory, masteries, observations });
  assert.notEqual(progress.wings.beetles.stage, "curated");
  assert.equal(progress.wings.beetles.observedSpeciesCount, 1);
});

test("water gallery requires a real Water habitat note", () => {
  const inventory = [item("waterkever"), item("schrijvertje"), item("schaatsenrijder")];
  const masteries = [mastery("waterkever", 3)];
  const wrongHabitat = evaluateMuseumProgress({ inventory, masteries, observations: [{ ...observation("o1", "waterkever"), habitat: "Tuin" }] });
  const waterHabitat = evaluateMuseumProgress({ inventory, masteries, observations: [{ ...observation("o1", "waterkever"), habitat: "Water" }] });
  assert.equal(wrongHabitat.wings.water.stage, "discovered");
  assert.equal(waterHabitat.wings.water.stage, "open");
});

test("crown endgame remains locked without all prestige and trophy evidence", () => {
  const progress = evaluateMuseumProgress({ inventory: [item("atlaskever", "Legendarisch")] });
  assert.equal(progress.crown.legend, false);
  assert.equal(progress.crown.trophyCount, 0);
});
