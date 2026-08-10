import type { BugDexDropSource } from "./bugDexService.ts";

export function shouldPresentBugDexDropImmediately(_source: BugDexDropSource): boolean {
  return false;
}

export function shouldPresentPointDropAsForegroundCatch(_source: BugDexDropSource): boolean {
  return false;
}

export function shouldShowRewardSpin(_source: BugDexDropSource): boolean {
  return false;
}
