export const BUTTERFLY_CATCH_RUN_DURATION_MS = 60_000;
export const BUTTERFLY_CATCH_SWING_DURATION_MS = 620;
export const BUTTERFLY_CATCH_CAPTURE_START_MS = 180;
export const BUTTERFLY_CATCH_CAPTURE_END_MS = 360;

export type ButterflyCatchRunPhase = "ready" | "running" | "finished";
export type ButterflyCatchFinishReason = "time" | "stopped" | null;

export type ButterflyCatchRunState = {
  phase: ButterflyCatchRunPhase;
  finishReason: ButterflyCatchFinishReason;
  startedAtMs: number;
  endsAtMs: number;
  remainingMs: number;
  score: number;
  catches: number;
  misses: number;
  streak: number;
  bestStreak: number;
  swingId: number;
  swingStartedAtMs: number | null;
  resolvedSwingId: number | null;
};

export type ButterflyCatchResult = {
  score: number;
  catches: number;
  misses: number;
  accuracy: number;
  bestStreak: number;
  durationMs: number;
};

export function createButterflyCatchRun(nowMs: number): ButterflyCatchRunState {
  return {
    phase: "running",
    finishReason: null,
    startedAtMs: nowMs,
    endsAtMs: nowMs + BUTTERFLY_CATCH_RUN_DURATION_MS,
    remainingMs: BUTTERFLY_CATCH_RUN_DURATION_MS,
    score: 0,
    catches: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    swingId: 0,
    swingStartedAtMs: null,
    resolvedSwingId: null,
  };
}

export function advanceButterflyCatchRun(
  state: ButterflyCatchRunState,
  nowMs: number,
): ButterflyCatchRunState {
  if (state.phase === "finished") return state;
  const remainingMs = Math.max(0, state.endsAtMs - nowMs);
  return {
    ...state,
    remainingMs,
    phase: remainingMs === 0 ? "finished" : state.phase,
    finishReason: remainingMs === 0 ? "time" : state.finishReason,
  };
}

export function finishButterflyCatchRun(
  state: ButterflyCatchRunState,
  reason: Exclude<ButterflyCatchFinishReason, null>,
): ButterflyCatchRunState {
  if (state.phase === "finished") return state;
  return {
    ...state,
    finishReason: reason,
    phase: "finished",
    remainingMs: reason === "time" ? 0 : state.remainingMs,
  };
}

export function startButterflyCatchSwing(
  state: ButterflyCatchRunState,
  nowMs: number,
): ButterflyCatchRunState {
  if (state.phase !== "running") return state;
  return {
    ...state,
    swingId: state.swingId + 1,
    swingStartedAtMs: nowMs,
    resolvedSwingId: null,
  };
}

export function resolveButterflyCatchSwing(
  state: ButterflyCatchRunState,
  params: { basePoints?: number; butterflyInsideNet: boolean; nowMs: number },
): ButterflyCatchRunState {
  if (state.phase !== "running" || state.swingStartedAtMs === null) return state;
  if (state.resolvedSwingId === state.swingId) return state;

  const elapsedMs = params.nowMs - state.swingStartedAtMs;
  if (elapsedMs < BUTTERFLY_CATCH_CAPTURE_START_MS) return state;

  if (params.butterflyInsideNet && elapsedMs <= BUTTERFLY_CATCH_CAPTURE_END_MS) {
    const streak = state.streak + 1;
    const basePoints = Math.max(50, Math.min(250, Math.floor(params.basePoints ?? 100)));
    const comboBonus = Math.min(100, Math.max(0, streak - 1) * 25);
    return {
      ...state,
      catches: state.catches + 1,
      score: state.score + basePoints + comboBonus,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      resolvedSwingId: state.swingId,
    };
  }

  if (elapsedMs > BUTTERFLY_CATCH_CAPTURE_END_MS) {
    return {
      ...state,
      misses: state.misses + 1,
      streak: 0,
      resolvedSwingId: state.swingId,
    };
  }

  return state;
}

export function recordButterflyCatch(
  state: ButterflyCatchRunState,
  points: number,
): ButterflyCatchRunState {
  if (state.phase !== "running") return state;
  const safePoints = Math.max(1, Math.min(3, Math.floor(points)));
  const streak = state.streak + 1;
  return {
    ...state,
    catches: state.catches + 1,
    score: state.score + safePoints,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

export function butterflyCatchAccuracy(state: Pick<ButterflyCatchRunState, "catches" | "misses">): number {
  const attempts = state.catches + state.misses;
  if (attempts === 0) return 0;
  return Math.round((state.catches / attempts) * 100);
}

export function butterflyCatchResult(state: ButterflyCatchRunState): ButterflyCatchResult {
  return {
    score: state.score,
    catches: state.catches,
    misses: state.misses,
    accuracy: butterflyCatchAccuracy(state),
    bestStreak: state.bestStreak,
    durationMs: Math.max(0, BUTTERFLY_CATCH_RUN_DURATION_MS - state.remainingMs),
  };
}
