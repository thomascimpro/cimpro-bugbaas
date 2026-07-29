import type { ArcadeRunResult, User } from "../../types";
import {
  loadArcadeHighScore,
  saveArcadeHighScore,
  saveArcadeRunResult,
} from "../../services/arcadeResultService";
import type { ButterflyCatchResult } from "./butterflyCatchGameModel";

export const BUTTERFLY_CATCH_RESULT_MODE = "butterfly_catch" as const;

export function loadButterflyCatchHighScore(user: Pick<User, "uid">): Promise<number> {
  return loadArcadeHighScore(user.uid, BUTTERFLY_CATCH_RESULT_MODE);
}

export async function saveButterflyCatchResult(
  user: Pick<User, "uid">,
  result: ButterflyCatchResult,
): Promise<number> {
  const arcadeResult = await createButterflyCatchArcadeResult(user, result);
  await saveArcadeRunResult(user.uid, arcadeResult);
  return arcadeResult.localHighScore;
}

export async function createButterflyCatchArcadeResult(
  user: Pick<User, "uid">,
  result: ButterflyCatchResult,
): Promise<ArcadeRunResult> {
  const localHighScore = await saveArcadeHighScore(
    user.uid,
    BUTTERFLY_CATCH_RESULT_MODE,
    result.score,
  );

  return butterflyCatchArcadeResult(result, localHighScore);
}

export function butterflyCatchArcadeResult(
  result: ButterflyCatchResult,
  localHighScore: number,
): ArcadeRunResult {
  return {
    combo: result.bestStreak,
    durationMs: result.durationMs,
    hits: result.catches,
    localHighScore,
    mode: BUTTERFLY_CATCH_RESULT_MODE,
    pickups: result.catches,
    score: result.score,
    streak: result.bestStreak,
    timestamp: new Date().toISOString(),
  };
}
