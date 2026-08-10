import Constants from "expo-constants";
import { auth } from "../firebase";
import type { User } from "../types";

export type WeeklyScanContestNominee = {
  id: string;
  isOwn: boolean;
  photoContestReason: string;
  photoContestScore: number;
  photoUrl: string;
  reportedByViewer: boolean;
  speciesName: string;
  voteCount: number;
};

export type WeeklyScanContestStatus = {
  current: {
    endsAt?: string;
    nominees: WeeklyScanContestNominee[];
    rewardXp: number;
    status: "voting" | "closed" | "insufficient_candidates";
    viewerVoteCandidateId?: string;
    weekId: string;
  };
  lastWinner?: {
    displayName: string;
    photoUrl: string;
    rewardBugId?: string;
    rewardIsNew: boolean;
    rewardPresentationPending: boolean;
    rewardRarity: string;
    rewardXp: number;
    speciesName: string;
    viewerWon: boolean;
    voteCount: number;
    weekId: string;
  };
  ok: true;
};

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

async function request(user: User, path: string, body?: Record<string, unknown>): Promise<WeeklyScanContestStatus> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om de weekstemming te bekijken.");
  const response = await fetch(`${functionBaseUrl()}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true || !payload?.current || !Array.isArray(payload.current.nominees)) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "De weekstemming kon niet worden geladen.");
  }
  return payload as WeeklyScanContestStatus;
}

export function getWeeklyScanContest(user: User): Promise<WeeklyScanContestStatus> {
  return request(user, "weeklyScanContestStatus");
}

export function voteWeeklyScanContest(user: User, candidateId: string): Promise<WeeklyScanContestStatus> {
  return request(user, "voteWeeklyScanContest", { candidateId });
}

export function reportWeeklyScanContestPhoto(user: User, candidateId: string): Promise<WeeklyScanContestStatus> {
  return request(user, "reportWeeklyScanContestPhoto", { candidateId });
}

export async function acknowledgeWeeklyScanContestReward(user: User, weekId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om je winnaarbeloning te bekijken.");
  const response = await fetch(`${functionBaseUrl()}/acknowledgeWeeklyScanContestReward`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ weekId })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok !== true) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "De winnaarbeloning kon niet worden bevestigd.");
  }
}
