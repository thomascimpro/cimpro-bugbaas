import type React from "react";
import type { ArcadeRunResult, User } from "../../types";

export const BUTTERFLY_CATCH_WEB_URL = "https://bugbaas.vercel.app";

export type ButterflyCatchLookState = {
  yaw: number;
  pitch: number;
};

export type ButterflyCatchAimState = {
  progress: number;
  targetName: string | null;
  tracking: boolean;
};

export type ButterflyCatchGameProps = {
  onClose: () => void;
  onFullscreenChange?: (active: boolean) => void;
  onResult?: (result: ArcadeRunResult) => Promise<void> | void;
  practice?: boolean;
  ranked?: boolean;
  user: User;
};

export type ButterflyCatchSceneProps = {
  lookRef: React.MutableRefObject<ButterflyCatchLookState>;
  runActive: boolean;
  swingFocusRef: React.MutableRefObject<number>;
  swingRequestId: number;
  onAimChange?: (state: ButterflyCatchAimState) => void;
  onCatch: (bugName: string, points?: number) => void;
  onMiss: () => void;
  onFpsChange?: (fps: number) => void;
};
