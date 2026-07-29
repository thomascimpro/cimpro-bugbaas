import Constants from "expo-constants";
import { auth } from "../firebase";
import type { User } from "../types";

export type MuseumRewardClaimResult = {
  awardedXp: number;
  awardedBadges: string[];
  awardedBugs: string[];
  awardedTitles: string[];
  claimedIds: string[];
};

function functionBaseUrl(): string {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

export async function claimMuseumRewards(user: User): Promise<MuseumRewardClaimResult> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om Museum-rewards te ontvangen.");
  const response = await fetch(`${functionBaseUrl()}/claimMuseumRewards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Museum-rewards zijn tijdelijk niet beschikbaar.");
  return {
    awardedXp: Math.max(0, Math.floor(Number(payload?.awardedXp) || 0)),
    awardedBadges: Array.isArray(payload?.awardedBadges) ? payload.awardedBadges.map(String) : [],
    awardedBugs: Array.isArray(payload?.awardedBugs) ? payload.awardedBugs.map(String) : [],
    awardedTitles: Array.isArray(payload?.awardedTitles) ? payload.awardedTitles.map(String) : [],
    claimedIds: Array.isArray(payload?.claimedIds) ? payload.claimedIds.map(String) : []
  };
}
