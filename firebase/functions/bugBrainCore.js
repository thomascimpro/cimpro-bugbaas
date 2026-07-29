function normalizeBugBrainCorrectAnswers(value) {
  return Math.max(0, Math.min(10, Math.floor(Number(value) || 0)));
}

function bugBrainAwardedXp(correctAnswers) {
  return normalizeBugBrainCorrectAnswers(correctAnswers);
}

function bugBrainDailySeed(uid, day) {
  const key = `${String(uid)}:${String(day)}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function bugBrainStartStatus({ attemptExists, claimExists }) {
  if (claimExists) return "claimed";
  if (attemptExists) return "attempted";
  return "available";
}

module.exports = {
  bugBrainAwardedXp,
  bugBrainDailySeed,
  bugBrainStartStatus,
  normalizeBugBrainCorrectAnswers
};
