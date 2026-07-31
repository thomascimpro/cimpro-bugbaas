import type { BugDexDropSource } from "./bugDexService.ts";

export function shouldPresentBugDexDropImmediately(source: BugDexDropSource): boolean {
  return source === "real_bug_scan";
}

export function shouldPresentPointDropAsForegroundCatch(source: BugDexDropSource): boolean {
  return source === "daily_mission_bonus";
}

export function shouldShowRewardSpin(_source: BugDexDropSource): boolean {
  return false;
}
