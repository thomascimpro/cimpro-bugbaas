import assert from "node:assert/strict";
import test from "node:test";
import type { ArcadeMode, BugSmashDuel, User } from "../types.ts";
import { localDayId } from "./missionProgressService.ts";
import { dailyMissionSet, dailyMissionSetComplete } from "./dailyMissionService.ts";

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

function duel(id: string, mode: ArcadeMode, submittedAt: string): BugSmashDuel {
  return {
    id,
    arcadeMode: mode,
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

function bossProgress(day: string, dayCount: number) {
  return { dayCount, dayId: day, updatedAt: now.toISOString(), weekCount: dayCount, weekId: "2026-30" };
}

test("matches the six concrete 2.10.20 daily missions", () => {
  const day = localDayId(now);
  const submittedAt = new Date(now).toISOString();
  const duels = ["tap_duel", "bubble_swarm", "web_runner", "nest_defense", "bug_glide"].map((mode, index) => duel(`duel-${index + 1}`, mode as ArcadeMode, submittedAt));
  const missions = dailyMissionSet(user({ movementRegisteredDay: day, movementRegisteredDayKm: 2.4 }), {
    bossProgress: bossProgress(day, 1),
    duels,
    now,
    realBugScanProgress: 1
  });

  assert.deepEqual(missions.map((mission) => ({
    id: mission.id,
    title: mission.title,
    target: mission.target,
    progress: mission.progress,
    reward: mission.reward,
    rewardXp: mission.rewardXp
  })), [
    { id: `daily-v1-duel-play-${day}`, title: "mission.dailyDuel", target: 1, progress: 1, reward: "mission.rewardXp10", rewardXp: 10 },
    { id: `daily-v1-real-bug-scan-${day}`, title: "mission.dailyRealBugScan", target: 1, progress: 1, reward: "mission.rewardXp10", rewardXp: 10 },
    { id: `daily-v1-play-all-game-types-${day}`, title: "mission.dailyPlayAllGameTypes", target: 4, progress: 4, reward: "mission.rewardXp20", rewardXp: 20 },
    { id: `daily-v1-duel-play-5-${day}`, title: "mission.dailyFiveDuels", target: 5, progress: 5, reward: "mission.rewardXp25", rewardXp: 25 },
    { id: `daily-v1-walk-1k-${day}`, title: "mission.dailyWalk1", target: 3, progress: 2.4, reward: "mission.rewardXp10", rewardXp: 10 },
    { id: `daily-v1-solo-boss-${day}`, title: "mission.dailySoloBoss", target: 1, progress: 1, reward: "mission.rewardXp10", rewardXp: 10 }
  ]);
  assert.equal(dailyMissionSetComplete(missions), false);
});

test("requires all six daily missions before the daily bonus is complete", () => {
  const day = localDayId(now);
  const submittedAt = new Date(now).toISOString();
  const duels = ["tap_duel", "bubble_swarm", "web_runner", "nest_defense", "bug_glide"].map((mode, index) => duel(`duel-${index + 1}`, mode as ArcadeMode, submittedAt));
  const missions = dailyMissionSet(user({ movementRegisteredDay: day, movementRegisteredDayKm: 3 }), {
    bossProgress: bossProgress(day, 1),
    duels,
    now,
    realBugScanProgress: 1
  });

  assert.equal(dailyMissionSetComplete(missions), true);
});
