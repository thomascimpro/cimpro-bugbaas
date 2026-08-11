import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { User } from "../types";
import { entryByBugId, grantRealBugScanRewardOnce, listBugDexInventory, type RealBugScanRewardResult } from "./bugDexService";
import { recordPendingBugDexDiscovery } from "./pendingBugDexDiscovery";
import {
  parseRealBugIdentifyApiResponse,
  parseRealBugScanResponse,
  realBugScanApiUrl,
  realBugScanDayKey,
  type RealBugScanResponse
} from "./realBugScanContract";
import { realBugScanFingerprint } from "./realBugScanFingerprint";
import { hasRealBugScanFingerprint, rememberRealBugScanFingerprint } from "./realBugScanFingerprintStore";
import { recordDailyRealBugScanProgress } from "./realBugScanProgress";

const maxDailyRealBugScans = 3;

export class RealBugScanLimitError extends Error {
  constructor() {
    super("Je hebt vandaag al drie echte bugs gescand.");
    this.name = "RealBugScanLimitError";
  }
}

export type RealBugScanSubmission = {
  result: RealBugScanResponse;
  drop: RealBugScanRewardResult | null;
};

function usageCount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const used = Number((data as { used?: unknown }).used);
  return Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0;
}

function apiBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return "http://localhost:8787";
    if (window.location.hostname.endsWith(".vercel.app") && window.location.hostname !== "bugbaas.vercel.app") return window.location.origin;
  }
  const extra = Constants.expoConfig?.extra ?? {};
  const configured = String((extra as { realBugScanApiBaseUrl?: unknown }).realBugScanApiBaseUrl ?? "").trim();
  if (configured) return configured;
  if (Platform.OS === "web" && typeof window !== "undefined") return window.location.origin;
  return "https://bugbaas.vercel.app";
}

function createScanId(): string {
  return `realbug_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getRemainingRealBugScans(user: User, date = new Date()): Promise<number> {
  const dayKey = realBugScanDayKey(date);
  if (!isFirebaseConfigured) return maxDailyRealBugScans;
  const snapshot = await getDoc(doc(db, "users", user.uid, "realBugScanServerUsage", dayKey));
  return Math.max(0, maxDailyRealBugScans - (snapshot.exists() ? usageCount(snapshot.data()) : 0));
}

async function apiError(response: Response): Promise<Error> {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return new Error(payload.error);
  } catch {
    // Use generic fallback below.
  }
  return new Error(`Bugscan API-fout (${response.status}).`);
}

export async function submitRealBugScan(
  user: User,
  imageDataUrl: string,
  reviewThumbnailDataUrl: string,
  overviewImageDataUrl?: string
): Promise<RealBugScanSubmission> {
  const scanId = createScanId();
  const dayKey = realBugScanDayKey();
  const fingerprint = realBugScanFingerprint(imageDataUrl);
  if (await hasRealBugScanFingerprint(user.uid, dayKey, fingerprint)) {
    throw new Error("Deze foto heb je vandaag al gescand. Maak een nieuwe foto.");
  }

  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) throw new Error("Log opnieuw in voordat je een echte bug scant.");
    const idToken = await firebaseUser.getIdToken();
    const response = await fetch(realBugScanApiUrl(apiBaseUrl()), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        scanId,
        imageDataUrl,
        reviewThumbnailDataUrl,
        ...(overviewImageDataUrl ? { overviewImageDataUrl } : {})
      })
    });
    if (!response.ok) {
      if (response.status === 429) throw new RealBugScanLimitError();
      throw await apiError(response);
    }

    const rawIdentification = await response.json();
    const hasServerRemainingScans = Boolean(
      rawIdentification
      && typeof rawIdentification === "object"
      && !Array.isArray(rawIdentification)
      && Object.prototype.hasOwnProperty.call(rawIdentification, "remainingScans")
    );
    const fallbackRemainingScans = hasServerRemainingScans
      ? undefined
      : await getRemainingRealBugScans(user).catch(() => maxDailyRealBugScans);
    const identified = parseRealBugIdentifyApiResponse(rawIdentification, fallbackRemainingScans);
    let status: RealBugScanResponse["status"] = identified.status;
    let reward: RealBugScanResponse["reward"];
    let drop: RealBugScanRewardResult | null = null;

    if (identified.status === "not_in_catalog") {
      await recordPendingBugDexDiscovery({
        user,
        scanId,
        identification: identified.identification,
        reviewThumbnailDataUrl
      });
    }

    if (identified.status === "matched" && identified.identification.bugId) {
      const bugId = identified.identification.bugId;
      const entry = entryByBugId(bugId);
      if (!entry) throw new Error("De herkende bug bestaat niet in de lokale BugDex.");
      const eventId = `real-bug-scan-${scanId}`;
      const granted = await grantRealBugScanRewardOnce(user, bugId, eventId);
      if (granted) {
        drop = granted;
        reward = {
          granted: granted.awardedCopy,
          isNew: granted.isNew,
          bugId,
          bugName: entry.name,
          rarity: entry.rarity,
          count: granted.item.count
        };
      } else {
        const inventory = await listBugDexInventory(user, { force: true });
        const existing = inventory.find((item) => item.bugId === bugId);
        status = "already_spotted";
        reward = {
          granted: false,
          isNew: false,
          bugId,
          bugName: entry.name,
          rarity: entry.rarity,
          count: existing?.count ?? 1
        };
      }
    }

    const result = parseRealBugScanResponse({
      ...identified,
      status,
      remainingScans: identified.remainingScans,
      reward
    });
    await rememberRealBugScanFingerprint(user.uid, dayKey, fingerprint);
    await recordDailyRealBugScanProgress(user, result);
    return { result, drop };
  } catch (error) {
    throw error;
  }
}
