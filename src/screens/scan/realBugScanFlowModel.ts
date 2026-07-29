import type { RealBugScanStatus } from "../../services/realBugScanContract.ts";

export type RealBugScanStage = "capture" | "review" | "identification" | "result" | "impact";
export type RealBugScanResultKind = "new-species" | "duplicate" | "journal-only" | "pending" | "retake" | "not-a-bug";

export function deriveRealBugScanStage(input: {
  cameraOpen: boolean;
  hasPhoto: boolean;
  hasResult: boolean;
  busy: boolean;
  journalSaved: boolean;
}): RealBugScanStage {
  if (input.hasResult && input.journalSaved) return "impact";
  if (input.hasResult) return "result";
  if (input.hasPhoto && input.busy) return "identification";
  if (input.hasPhoto) return "review";
  return "capture";
}

export function scanStageAllowsPageScroll(stage: RealBugScanStage): boolean {
  return stage === "review" || stage === "result" || stage === "impact";
}

export function realBugScanResultKind(input: {
  status: RealBugScanStatus;
  rewardGranted: boolean;
  awardedCopy: boolean;
}): RealBugScanResultKind {
  if (input.status === "matched") return input.awardedCopy || !input.rewardGranted ? "duplicate" : "new-species";
  if (input.status === "already_spotted") return "duplicate";
  if (input.status === "not_in_catalog") return "journal-only";
  if (input.status === "pending_review") return "pending";
  if (input.status === "rejected_quality") return "retake";
  return "not-a-bug";
}
