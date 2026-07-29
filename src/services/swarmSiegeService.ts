import Constants from "expo-constants";
import { auth } from "../firebase";
import type { BugDexInventoryItem, User } from "../types";
import { swarmSiegeRequestError } from "./swarmSiegeError";

export type SwarmSiegeModifier = "armored_brood" | "double_wave" | "fast_swarm" | "unstable_core";
export type SwarmSiegePhaseId = "armor_break" | "nest_surge" | "signal_hunt" | "unstable_core";

export type SwarmSiegeEventState = "preview" | "live" | "result" | "upcoming";
export type SwarmSiegeRewardTierId = "participation" | "bronze" | "silver" | "gold" | "complete";

export type SwarmSiegeStatus = {
  active: boolean;
  attacksRemaining: number;
  claimed: boolean;
  complete: boolean;
  contributorCount: number;
  endsAt: string;
  eventId: string;
  medalId?: string;
  modifier: SwarmSiegeModifier;
  nextStartsAt?: string;
  personalDamage: number;
  phaseId: SwarmSiegePhaseId;
  progress: number;
  resultEndsAt?: string;
  rewardTierId: SwarmSiegeRewardTierId;
  rewardXp: number;
  startsAt: string;
  state: SwarmSiegeEventState;
  target: number;
};

export type SwarmSiegeRunTicket = {
  attemptsRemaining: number;
  eventId: string;
  expiresAt: string;
  modifier: SwarmSiegeModifier;
  resumed: boolean;
  runId: string;
  seed: string;
};

export type SwarmSiegeSubmitResult = {
  damage: number;
  duplicate: boolean;
  score: number;
  status: SwarmSiegeStatus;
};

export type SwarmSiegeClaimResult = {
  awardedBugId?: string;
  awardedXp: number;
  claimed: boolean;
  duplicate?: boolean;
  item?: BugDexInventoryItem;
  medalId: string;
  rewardTierId?: SwarmSiegeRewardTierId;
  rewardXp: number;
};

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String(
    (extra as { swarmSiegeApiBaseUrl?: unknown }).swarmSiegeApiBaseUrl
      ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net"
  ).replace(/\/+$/, "");
}

async function request<T>(user: User, endpoint: string, method: "GET" | "POST", body?: object): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om Swarm Siege te openen.");
  try {
    const response = await fetch(`${functionBaseUrl()}/${endpoint}`, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        Authorization: `Bearer ${await currentUser.getIdToken()}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      method
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(swarmSiegeRequestError(null, response.status, payload?.error));
    if (!payload || typeof payload !== "object") throw new Error("De eventserver gaf een ongeldig antwoord.");
    return payload as T;
  } catch (value) {
    if (value instanceof Error && !/failed to fetch|network request failed/i.test(value.message)) throw value;
    throw new Error(swarmSiegeRequestError(value));
  }
}

export function getSwarmSiegeStatus(user: User) {
  return request<SwarmSiegeStatus>(user, "swarmSiegeStatus", "GET");
}

export function startSwarmSiegeRun(user: User) {
  return request<SwarmSiegeRunTicket>(user, "startSwarmSiegeRun", "POST", {});
}

export function submitSwarmSiegeRun(user: User, runId: string, score: number) {
  return request<SwarmSiegeSubmitResult>(user, "submitSwarmSiegeRun", "POST", { runId, score });
}

export function claimSwarmSiegeReward(user: User, eventId: string) {
  return request<SwarmSiegeClaimResult>(user, "claimSwarmSiegeReward", "POST", { eventId });
}
