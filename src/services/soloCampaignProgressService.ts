import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { soloCampaignMaxWave } from "./soloCampaignBalance";
import { carrySoloCampaignProgressIntoWeek } from "./soloCampaignProgressModel";

export type SoloCampaignProgress = {
  lives: number;
  updatedAt: string;
  wave: number;
  weekId: string;
};

const soloCampaignStartingLives = 3;
const storageKey = (uid: string) => `bugbaas:soloCampaignProgress:${uid}`;
const legacyWaveStorageKey = (uid: string) => `bugbaas:soloCampaignWave:${uid}`;

export function defaultSoloCampaignProgress(): SoloCampaignProgress {
  return {
    lives: soloCampaignStartingLives,
    updatedAt: new Date(0).toISOString(),
    wave: 1,
    weekId: currentWeekId()
  };
}

export async function loadSoloCampaignProgress(uid: string): Promise<SoloCampaignProgress> {
  if (isFirebaseConfigured) {
    try {
      const snapshot = await getDoc(progressRef(uid));
      if (snapshot.exists()) {
        const progress = resetIfExpired(normalize(snapshot.data()));
        await saveLocal(uid, progress);
        if (progress.wave === 1 && progress.weekId === currentWeekId()) await setDoc(progressRef(uid), progress).catch(() => undefined);
        return progress;
      }
    } catch {
      // Fall back to local progress below.
    }
  }

  const local = resetIfExpired(await loadLocal(uid));
  if (isFirebaseConfigured) await saveSoloCampaignProgress(uid, local).catch(() => undefined);
  return local;
}

export async function saveSoloCampaignProgress(uid: string, progress: Partial<SoloCampaignProgress>): Promise<SoloCampaignProgress> {
  const next = normalize({
    ...progress,
    updatedAt: new Date().toISOString(),
    weekId: currentWeekId()
  });
  await saveLocal(uid, next);
  if (isFirebaseConfigured) await setDoc(progressRef(uid), next);
  return next;
}

function progressRef(uid: string) {
  return doc(db, "users", uid, "soloCampaign", "progress");
}

async function loadLocal(uid: string): Promise<SoloCampaignProgress> {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return loadLegacyLocal(uid);
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return loadLegacyLocal(uid);
  }
}

async function loadLegacyLocal(uid: string): Promise<SoloCampaignProgress> {
  const rawWave = await AsyncStorage.getItem(legacyWaveStorageKey(uid));
  const wave = Number(rawWave);
  return normalize({
    lives: soloCampaignStartingLives,
    updatedAt: new Date(0).toISOString(),
    wave: Number.isFinite(wave) ? wave : 1,
    weekId: weekIdForIso(new Date(0).toISOString())
  });
}

async function saveLocal(uid: string, progress: SoloCampaignProgress): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(normalize(progress)));
}

function normalize(value: Partial<SoloCampaignProgress>): SoloCampaignProgress {
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString();
  return {
    lives: Math.max(1, Math.min(soloCampaignStartingLives, Math.floor(Number(value.lives) || soloCampaignStartingLives))),
    updatedAt,
    wave: Math.max(1, Math.min(soloCampaignMaxWave, Math.floor(Number(value.wave) || 1))),
    weekId: typeof value.weekId === "string" ? value.weekId : weekIdForIso(updatedAt)
  };
}

function resetIfExpired(progress: SoloCampaignProgress): SoloCampaignProgress {
  return carrySoloCampaignProgressIntoWeek(progress, currentWeekId(), new Date().toISOString());
}

function currentWeekId(): string {
  return weekIdForDate(new Date());
}

function weekIdForIso(iso: string): string {
  const date = new Date(iso);
  return weekIdForDate(Number.isNaN(date.getTime()) ? new Date() : date);
}

function weekIdForDate(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
