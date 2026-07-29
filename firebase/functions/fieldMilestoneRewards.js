const fieldMilestoneDefinitions = Object.freeze([
  Object.freeze({ id: "first-discovery", minimumObservations: 1, rewardXp: 20 }),
  Object.freeze({ id: "trailblazer", minimumObservations: 3, rewardXp: 30 }),
  Object.freeze({ id: "field-naturalist", minimumObservations: 6, rewardXp: 50 })
]);

function eligibleFieldMilestones(verifiedObservationCount) {
  const count = Number.isSafeInteger(verifiedObservationCount) ? verifiedObservationCount : 0;
  return fieldMilestoneDefinitions.filter((milestone) => count >= milestone.minimumObservations);
}

module.exports = { eligibleFieldMilestones, fieldMilestoneDefinitions };
