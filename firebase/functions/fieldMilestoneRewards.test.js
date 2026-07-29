const test = require("node:test");
const assert = require("node:assert/strict");
const { eligibleFieldMilestones, fieldMilestoneDefinitions } = require("./fieldMilestoneRewards");

test("only exposes fixed rewards after their verified-observation threshold", () => {
  assert.deepEqual(eligibleFieldMilestones(0), []);
  assert.deepEqual(eligibleFieldMilestones(1), [fieldMilestoneDefinitions[0]]);
  assert.deepEqual(eligibleFieldMilestones(4), fieldMilestoneDefinitions.slice(0, 2));
  assert.deepEqual(eligibleFieldMilestones(6), fieldMilestoneDefinitions);
});

test("rejects malformed observation counts instead of granting a reward", () => {
  assert.deepEqual(eligibleFieldMilestones(-1), []);
  assert.deepEqual(eligibleFieldMilestones(1.5), []);
  assert.deepEqual(eligibleFieldMilestones("6"), []);
});
