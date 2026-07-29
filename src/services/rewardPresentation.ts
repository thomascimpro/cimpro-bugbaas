import type { BugDexDropSource } from "./bugDexService.ts";

export function shouldPresentBugDexDropImmediately(source: BugDexDropSource): boolean {
  return source === "real_bug_scan";
}

export function shouldPresentPointDropAsForegroundCatch(source: BugDexDropSource): boolean {
  return source === "daily_mission_bonus";
}

const randomRarityDropSources = new Set<BugDexDropSource>([
  "bug_reported",
  "comment",
  "status_update",
  "bug_fixed",
  "upvote_given",
  "profile_view",
  "bug_splat",
  "weekly_mission",
  "weekly_mission_rare",
  "daily_mission_bonus",
  "solo_boss_rare",
  "solo_campaign_clear",
  "duel_win",
  "rank_up"
]);

export function shouldShowRewardSpin(source: BugDexDropSource): boolean {
  return randomRarityDropSources.has(source);
}
