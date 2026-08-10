const assert = require("node:assert/strict");
const test = require("node:test");
const {
  contestRewardBugIds,
  contestRewardRarity,
  contestRewardXp,
  selectWeeklyScanNominees,
  weeklyScanContestRewardBugId,
  weeklyScanContestWeek,
  weeklyScanContestWinner
} = require("./weeklyScanContestCore");

test("weekly contest uses Amsterdam Monday and previous week as its source", () => {
  const week = weeklyScanContestWeek(new Date("2026-08-12T12:00:00.000Z"));
  assert.equal(week.weekId, "2026-08-10");
  assert.equal(week.sourceWeekId, "2026-08-03");
  assert.equal(contestRewardXp, 150);
});

test("weekly nominees are the three best photos from three different users", () => {
  const selected = selectWeeklyScanNominees([
    { uid: "one", scanId: "one-best", photoUrl: "https://one", photoContestScore: 99, confidence: 0.9 },
    { uid: "one", scanId: "one-second", photoUrl: "https://one-2", photoContestScore: 98, confidence: 0.9 },
    { uid: "two", scanId: "two", photoUrl: "https://two", photoContestScore: 90, confidence: 0.9 },
    { uid: "three", scanId: "three", photoUrl: "https://three", photoContestScore: 80, confidence: 0.9 },
    { uid: "four", scanId: "four", photoUrl: "https://four", photoContestScore: 70, confidence: 0.9 }
  ]);
  assert.deepEqual(selected.map((item) => item.scanId), ["one-best", "two", "three"]);
  assert.equal(new Set(selected.map((item) => item.uid)).size, 3);
});

test("weekly nominees can be selected randomly but repeatably from quality photos", () => {
  const candidates = Array.from({ length: 15 }, (_, index) => ({
    uid: `user-${index}`,
    scanId: `scan-${index}`,
    photoUrl: `https://photo-${index}`,
    photoContestScore: 100 - index,
    confidence: 0.9
  }));
  const first = selectWeeklyScanNominees(candidates, 3, "2026-08-10");
  const second = selectWeeklyScanNominees(candidates, 3, "2026-08-10");
  assert.deepEqual(first.map((item) => item.scanId), second.map((item) => item.scanId));
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map((item) => item.uid)).size, 3);
  assert.ok(first.every((item) => Number(item.uid.split("-")[1]) < 12));
});

test("winner needs a vote and ties use the photo score", () => {
  assert.equal(weeklyScanContestWinner([{ uid: "one", scanId: "one", photoUrl: "https://one", voteCount: 0 }]), undefined);
  const winner = weeklyScanContestWinner([
    { uid: "one", scanId: "one", photoUrl: "https://one", voteCount: 2, photoContestScore: 80 },
    { uid: "two", scanId: "two", photoUrl: "https://two", voteCount: 2, photoContestScore: 90 }
  ]);
  assert.equal(winner.scanId, "two");
});

test("weekly winner gets one stable legendary BugDex reward", () => {
  const first = weeklyScanContestRewardBugId("winner-uid", "2026-08-03");
  const second = weeklyScanContestRewardBugId("winner-uid", "2026-08-03");
  assert.equal(first, second);
  assert.ok(contestRewardBugIds.includes(first));
  assert.equal(contestRewardRarity, "Legendarisch");
});
