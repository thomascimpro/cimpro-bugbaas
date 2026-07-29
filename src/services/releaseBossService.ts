import Constants from "expo-constants";
import { auth } from "../firebase";
import type { User } from "../types";

export type ReleaseBossStatus = {
  bossId: string;
  claimed: boolean;
  complete: boolean;
  contributed: number;
  eligibleForReward: boolean;
  finaleStartsAt: string;
  progress: number;
  rewardXp: number;
  seasonId: string;
  state: "active" | "finale";
  target: number;
};
export type ReleaseBossClaimResult = { awardedXp: number; claimed: boolean; rewardXp: number };

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

async function request(user: User, path: string, method: "GET" | "POST"): Promise<ReleaseBossStatus> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om de gezamenlijke expeditie te openen.");
  const response = await fetch(`${functionBaseUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }, method
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.bossId) throw new Error(typeof payload?.error === "string" ? payload.error : "De gezamenlijke expeditie is tijdelijk niet beschikbaar.");
  return payload as ReleaseBossStatus;
}

export function getReleaseBossStatus(user: User) { return request(user, "releaseBossStatus", "GET"); }
export async function claimReleaseBossReward(user: User): Promise<ReleaseBossClaimResult> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om de gezamenlijke beloning te claimen.");
  const response = await fetch(`${functionBaseUrl()}/claimReleaseBossReward`, { headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }, method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.claimed !== "boolean") throw new Error(typeof payload?.error === "string" ? payload.error : "De gedeelde beloning is tijdelijk niet beschikbaar.");
  return payload as ReleaseBossClaimResult;
}
