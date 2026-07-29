import Constants from "expo-constants";
import { auth, isFirebaseConfigured } from "../firebase";
import type { User } from "../types";
import type { RealBugScanResponse } from "./realBugScanContract";
import type { PrivateSightingLocation } from "./privateSightingLocation";

export const fieldJournalHabitats = ["Tuin", "Park", "Water", "Nacht", "Kantoor", "Binnen"] as const;
export const fieldJournalBehaviors = ["Rustte", "Kroop", "Vloog", "At", "Onbekend"] as const;
export type FieldJournalHabitat = typeof fieldJournalHabitats[number];
export type FieldJournalBehavior = typeof fieldJournalBehaviors[number];
export type PrivateSightingMapCell = { latitudeE3: number; longitudeE3: number };
export type PrivateSightingMapLocation = { latitudeE5: number; longitudeE5: number; accuracyMeters: number; capturedAt: string };

export type FieldJournalEntry = {
  id: string; scanId: string; observedAt: string; speciesName: string; scientificName: string;
  bugId: string; status: "matched" | "not_in_catalog"; habitat: FieldJournalHabitat; behavior: FieldJournalBehavior; confidence: number; locationCell?: PrivateSightingMapCell; privateLocation?: PrivateSightingMapLocation; mapCellId?: string;
};

export type FieldMilestoneReward = { id: string; minimumObservations: number; rewardXp: number };
export type WeeklyFieldSpotlightReward = {
  awardedXp: number;
  bugIds?: string[];
  claimed: boolean;
  duplicate?: boolean;
  isNew?: boolean;
  matched: boolean;
  rewardBugId?: string;
  weekId?: string;
};
export type FieldJournalSaveResult = { entry: FieldJournalEntry; milestones: FieldMilestoneReward[]; weeklySpotlight?: WeeklyFieldSpotlightReward };

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

function canJournal(result: RealBugScanResponse): result is RealBugScanResponse & { receipt: string; status: FieldJournalEntry["status"] } {
  return Boolean(result.receipt) && (result.status === "matched" || result.status === "not_in_catalog");
}

export async function saveFieldJournalEntry(user: User, result: RealBugScanResponse, habitat: FieldJournalHabitat, behavior: FieldJournalBehavior, location?: PrivateSightingLocation): Promise<FieldJournalSaveResult> {
  if (!canJournal(result)) throw new Error("Deze scan kan nog niet veilig als veldnotitie worden opgeslagen.");
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om een veldnotitie op te slaan.");
  const response = await fetch(`${functionBaseUrl()}/recordVerifiedObservation`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await currentUser.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(location ? { behavior, habitat, location, receipt: result.receipt } : { behavior, habitat, receipt: result.receipt })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.entry) throw new Error(typeof payload?.error === "string" ? payload.error : "Veldnotitie opslaan mislukt.");
  return {
    entry: payload.entry as FieldJournalEntry,
    milestones: Array.isArray(payload?.milestones?.claimed) ? payload.milestones.claimed as FieldMilestoneReward[] : [],
    weeklySpotlight: payload?.weeklySpotlight && typeof payload.weeklySpotlight === "object"
      ? payload.weeklySpotlight as WeeklyFieldSpotlightReward
      : undefined
  };
}

export async function listFieldJournalEntries(user: User): Promise<FieldJournalEntry[]> {
  if (!isFirebaseConfigured) return [];
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om veldnotities te laden.");
  const response = await fetch(`${functionBaseUrl()}/listVerifiedObservations`, {
    method: "GET",
    headers: { Authorization: `Bearer ${await currentUser.getIdToken()}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload?.entries)) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Veldnotities laden mislukt.");
  }
  return payload.entries as FieldJournalEntry[];
}

export function weeklyExpeditionFindCount(entries: FieldJournalEntry[], now = new Date()): number {
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return entries.filter((entry) => {
    const observedAt = new Date(entry.observedAt);
    return Number.isFinite(observedAt.getTime()) && observedAt >= start && observedAt <= now;
  }).length;
}
