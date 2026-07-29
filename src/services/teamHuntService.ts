import Constants from "expo-constants";
import { auth } from "../firebase";
import type { User } from "../types";
import { teamHuntWindow } from "./teamHuntSchedule";

export type TeamHuntCategoryId = "beetles" | "wings" | "crawlers" | "jumpers" | "stingers" | "water";
export type TeamHuntLeaderboardRow = { organizationId: string; organizationName: string; rank: number; score: number };
export type TeamHuntStatus = {
  active: boolean; eligible?: boolean; unavailable?: boolean; eventId?: string; endsAt?: string;
  addedSpecies?: number; completedCategories?: TeamHuntCategoryId[]; leaderboard?: TeamHuntLeaderboardRow[]; missingCategories?: TeamHuntCategoryId[];
  team?: { organizationId: string; organizationName: string; rank?: number; score: number };
};

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

async function callTeamHunt(user: User, endpoint: "claimTeamHuntContributions" | "teamHuntStatus"): Promise<TeamHuntStatus> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om Team Hunt te openen.");
  const response = await fetch(`${functionBaseUrl()}/${endpoint}`, {
    body: "{}",
    headers: { Authorization: `Bearer ${await currentUser.getIdToken()}`, "Content-Type": "application/json" },
    method: "POST"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Team Hunt is tijdelijk niet beschikbaar.");
  return payload as TeamHuntStatus;
}

export function teamHuntActiveNow(value = new Date()): boolean {
  return teamHuntWindow(value)?.active ?? false;
}

export async function refreshTeamHunt(user: User) {
  await callTeamHunt(user, "claimTeamHuntContributions");
  return callTeamHunt(user, "teamHuntStatus");
}
