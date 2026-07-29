import type { BugDexDropSource } from "./bugDexService";

type DailyMissionClaimPayloadInput = {
  claimData: Record<string, unknown>;
  claimId: string;
  claimedAt: string;
  rewardSource: BugDexDropSource;
  rewardXp: number;
};

export function dailyMissionClaimPayload({
  claimData,
  claimId,
  claimedAt,
  rewardSource,
  rewardXp
}: DailyMissionClaimPayloadInput): Record<string, unknown> {
  return {
    ...claimData,
    rewardXp: Math.max(0, Math.floor(rewardXp)),
    claimedAt,
    id: claimId,
    rewardSource
  };
}

export function isPermanentMissionClaimError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "").toLowerCase()
    : "";
  if (code === "permission-denied" || code.endsWith("/permission-denied")) return true;

  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof error === "string"
      ? error.toLowerCase()
      : "";
  return message.includes("permission-denied") || message.includes("missing or insufficient permissions");
}
