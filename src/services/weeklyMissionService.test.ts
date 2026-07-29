import assert from "node:assert/strict";
import test from "node:test";
import type { BugSmashDuel, User } from "../types.ts";
import { localDayId } from "./missionProgressService.ts";
import { weeklyMissionSet, weeklyMissionSetComplete } from "./weeklyMissionService.ts";

const now = new Date(2026, 6, 24, 12, 0, 0);

function user(overrides: Partial<User> = {}): User {
  return {
    uid: "user-1",
    displayName: "Test user",
    email: "test@example.com",
    totalPoints: 0,
    bugCount: 0,
    title: "Bug Hunter",
    badges: [],
    ...overrides
  };
}

function duel(id: string, submittedAt: string): BugSmashDuel {
  return {
    id,
    fromUserId: "user-1",
    fromUserName: "Test user",
    toUserId: "other-user",
    toUserName: "Other user",
    status: "completed",
    seed: Number(id.replace("duel-", "")),
    bugIds: [],
    createdAt: submittedAt,
    updatedAt: submittedAt,
    durationMs: 30_000,
    scores: {
      "user-1": { score: 1, caughtBugIds: [], bonusScore: 0, submittedAt }
    }
  };
}

function bossProgress(weekCount: number) {
  return { dayCount: 0, dayId: localDayId(now), updatedAt: now.toISOString(), weekCount, weekId: "2026-30" };
}

test("uses one clear 60 km weekly walking goal on Home", () => {
  const submittedAt = new Date(now).toISOString();
  const duels = Array.from({ length: 17 }, (_, index) => duel(`duel-${index + 1}`, submittedAt));
  const missions = weeklyMissionSet(user({ movementRegisteredDay: localDayId(now), movementRegisteredDayKm: 43.4 }), [], {
    bossProgress: bossProgress(5),
    duels,
    now,
    soloCampaignWave: 5
  });

  assert.ok(missions.every((mission) => mission.id.startsWith("weekly-v3-")));
  assert.deepEqual(missions.map((mission) => ({
    title: mission.title,
    target: mission.target,
    progress: mission.progress,
    reward: mission.reward,
    rewardXp: mission.rewardXp
  })), [
    { title: "mission.walk60Week", target: 60, progress: 43.4, reward: "mission.rewardXp30", rewardXp: 30 },
    { title: "mission.duelPlayFive", target: 50, progress: 17, reward: "mission.rewardXp25", rewardXp: 25 },
    { title: "mission.soloCampaignFinale", target: 20, progress: 5, reward: "mission.rewardEpicBugXp70", rewardXp: 70 }
  ]);
  assert.equal(weeklyMissionSetComplete(missions), false);
});

test("weekly completion requires the 60 km goal and both game goals", () => {
  const submittedAt = new Date(now).toISOString();
  const duels = Array.from({ length: 50 }, (_, index) => duel(`duel-${index + 1}`, submittedAt));
  const missions = weeklyMissionSet(user({ movementRegisteredDay: localDayId(now), movementRegisteredDayKm: 60 }), [], {
    bossProgress: bossProgress(10),
    duels,
    now,
    soloCampaignWave: 20
  });

  assert.equal(weeklyMissionSetComplete(missions), true);
  assert.equal(missions[2].rewardSource, "weekly_mission_epic");
  assert.equal(missions[2].rewardType, "bug");
  assert.ok(missions.every((mission) => !("tierId" in mission) && !("trackKind" in mission)));
});
