import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { ArcadeMode, ArcadeResultMode, ArcadeRunResult } from "../types";

type RankedArcadeRunContext = {
  duelId: string;
  ranked: true;
};

function highScoreKey(uid: string, mode: ArcadeResultMode) {
  return `bugbaas:arcade:highScore:${uid}:${mode}`;
}

export function createArcadeSeed(mode: ArcadeMode, id: string, version = 1, difficulty = "normal"): string {
  return `${mode}:${id}:v${version}:${difficulty}`;
}

export function seededNumber(seed: string, index: number): number {
  const text = `${seed}:${index}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function seededLane(seed: string, index: number): 0 | 1 | 2 {
  return Math.floor(seededNumber(seed, index) * 3) as 0 | 1 | 2;
}

export async function loadArcadeHighScore(uid: string, mode: ArcadeResultMode): Promise<number> {
  const raw = await AsyncStorage.getItem(highScoreKey(uid, mode));
  const value = Math.floor(Number(raw) || 0);
  return Math.max(0, value);
}

export async function saveArcadeHighScore(uid: string, mode: ArcadeResultMode, score: number): Promise<number> {
  const nextScore = Math.max(0, Math.floor(score));
  const current = await loadArcadeHighScore(uid, mode);
  const highScore = Math.max(current, nextScore);
  await AsyncStorage.setItem(highScoreKey(uid, mode), String(highScore));
  return highScore;
}

export async function saveArcadeRunResult(uid: string, result: ArcadeRunResult, context?: RankedArcadeRunContext): Promise<void> {
  if (!isFirebaseConfigured || result.mode === "tap_duel") return;
  await addDoc(collection(db, "arcadeGameResults", result.mode, "runs"), {
    combo: Math.max(0, Math.floor(result.combo)),
    durationMs: Math.max(0, Math.floor(result.durationMs)),
    hits: Math.max(0, Math.floor(result.hits)),
    localHighScore: Math.max(0, Math.floor(result.localHighScore)),
    mode: result.mode,
    pickups: Math.max(0, Math.floor(result.pickups)),
    score: Math.max(0, Math.floor(result.score)),
    streak: Math.max(0, Math.floor(result.streak)),
    timestamp: result.timestamp,
    userId: uid,
    ...(context ? { duelId: context.duelId, ranked: context.ranked } : {})
  });
}

export function arcadeRatingPreview(result: Pick<ArcadeRunResult, "mode" | "score">): number {
  const expectedScore: Record<ArcadeResultMode, number> = {
    butterfly_catch: 900,
    bug_glide: 650,
    bug_tower: 900,
    bubble_swarm: 1100,
    nest_defense: 700,
    tap_duel: 600,
    web_runner: 650
  };
  const expected = expectedScore[result.mode] || 600;
  return Math.max(100, Math.round((result.score / expected) * 1000));
}
