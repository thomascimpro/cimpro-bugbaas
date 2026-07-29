import Constants from "expo-constants";
import { auth, isFirebaseConfigured } from "../firebase";
import type { User } from "../types.ts";
import type { ResearchTargetStatus } from "./researchTargetModel.ts";

export {
  buildResearchTargetOptions,
  maxResearchTierForStage,
  researchProgressAmount
} from "./researchTargetModel.ts";
export type {
  ResearchProgressSource,
  ResearchTarget,
  ResearchTargetContext,
  ResearchTargetStatus
} from "./researchTargetModel.ts";

function functionBaseUrl(): string {
  const extra = Constants.expoConfig?.extra ?? {};
  return String(
    (extra as { researchApiBaseUrl?: unknown }).researchApiBaseUrl
      ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net"
  ).replace(/\/+$/, "");
}

async function request<T>(user: User, endpoint: string, method: "GET" | "POST", body?: object): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om onderzoek te openen.");
  const response = await fetch(`${functionBaseUrl()}/${endpoint}`, {
    ...(body ? { body: JSON.stringify(body) } : {}),
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    method
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error || "Onderzoek is tijdelijk niet beschikbaar."));
  return payload as T;
}

export function getResearchTargetStatus(user: User): Promise<ResearchTargetStatus> {
  return request<ResearchTargetStatus>(user, "researchTargetStatus", "GET");
}

export function startResearchTarget(user: User, bugId: string): Promise<ResearchTargetStatus> {
  return request<ResearchTargetStatus>(user, "startResearchTarget", "POST", { bugId });
}

export function claimResearchEncounter(user: User): Promise<ResearchTargetStatus & { awardedBugId?: string; duplicate?: boolean }> {
  return request<ResearchTargetStatus & { awardedBugId?: string; duplicate?: boolean }>(user, "claimResearchEncounter", "POST", {});
}

export type ResearchEvidence =
  | { claimId: string }
  | { mode: string; runId: string }
  | { collectionName: "bugs" | "organizationBugs"; bugId: string; kind: "report" }
  | { collectionName: "bugs" | "organizationBugs"; bugId: string; commentId: string; kind: "comment" }
  | { eventId: string; kind: "legacy_event" }
  | { cycle: number };

export async function syncResearchProgress(
  user: User,
  source: "daily_route" | "play_completion" | "internal_contribution" | "momentum_cycle",
  evidence: ResearchEvidence
): Promise<ResearchTargetStatus | undefined> {
  if (!isFirebaseConfigured) return undefined;
  return request<ResearchTargetStatus>(user, "syncResearchProgress", "POST", { evidence, source });
}
