import { isIosSafariBrowser } from "./gameLoopTiming.ts";

export type BugSoundName =
  | "arcade_build"
  | "arcade_finish"
  | "arcade_hit"
  | "arcade_pickup"
  | "arcade_start"
  | "arcade_tap"
  | "bug_hit"
  | "bug_catch"
  | "bug_unlock"
  | "bug_rare_unlock"
  | "spray_hit"
  | "spray_start";

type WebSoundTone = {
  durationMs: number;
  endFrequency?: number;
  frequency: number;
  gain: number;
  wave: "sine" | "square" | "sawtooth" | "triangle";
};

export type WebSoundProfile = WebSoundTone & {
  accent?: WebSoundTone & { delayMs: number };
};

const profiles: Record<BugSoundName, WebSoundProfile> = {
  arcade_build: { durationMs: 85, endFrequency: 540, frequency: 330, gain: 0.035, wave: "square" },
  arcade_finish: {
    durationMs: 210,
    endFrequency: 880,
    frequency: 440,
    gain: 0.055,
    wave: "triangle",
    accent: { delayMs: 95, durationMs: 150, endFrequency: 1175, frequency: 660, gain: 0.045, wave: "triangle" }
  },
  arcade_hit: { durationMs: 70, endFrequency: 150, frequency: 260, gain: 0.045, wave: "sawtooth" },
  arcade_pickup: {
    durationMs: 105,
    endFrequency: 820,
    frequency: 560,
    gain: 0.045,
    wave: "triangle",
    accent: { delayMs: 55, durationMs: 90, endFrequency: 1120, frequency: 760, gain: 0.035, wave: "triangle" }
  },
  arcade_start: {
    durationMs: 145,
    endFrequency: 660,
    frequency: 330,
    gain: 0.045,
    wave: "square",
    accent: { delayMs: 70, durationMs: 105, endFrequency: 880, frequency: 495, gain: 0.032, wave: "triangle" }
  },
  arcade_tap: { durationMs: 45, endFrequency: 260, frequency: 390, gain: 0.028, wave: "square" },
  bug_hit: { durationMs: 55, endFrequency: 170, frequency: 280, gain: 0.035, wave: "sawtooth" },
  bug_catch: {
    durationMs: 130,
    endFrequency: 760,
    frequency: 380,
    gain: 0.048,
    wave: "triangle",
    accent: { delayMs: 65, durationMs: 105, endFrequency: 1040, frequency: 620, gain: 0.035, wave: "triangle" }
  },
  bug_unlock: {
    durationMs: 220,
    endFrequency: 940,
    frequency: 470,
    gain: 0.06,
    wave: "triangle",
    accent: { delayMs: 105, durationMs: 160, endFrequency: 1250, frequency: 700, gain: 0.042, wave: "triangle" }
  },
  bug_rare_unlock: {
    durationMs: 330,
    endFrequency: 1320,
    frequency: 520,
    gain: 0.08,
    wave: "triangle",
    accent: { delayMs: 145, durationMs: 245, endFrequency: 1660, frequency: 780, gain: 0.052, wave: "triangle" }
  },
  spray_hit: { durationMs: 65, endFrequency: 120, frequency: 240, gain: 0.04, wave: "sawtooth" },
  spray_start: { durationMs: 140, endFrequency: 180, frequency: 520, gain: 0.045, wave: "sawtooth" }
};

export const webUiSoundTargetSelector = 'button, a, input, select, textarea, [role="button"], [tabindex="0"]';

export const webUiTapProfile: WebSoundProfile = {
  durationMs: 32,
  endFrequency: 280,
  frequency: 360,
  gain: 0.014,
  wave: "square"
};

export function webSoundProfile(name: BugSoundName): WebSoundProfile {
  return profiles[name];
}

export function webSoundPlaybackMode(userAgent: string, maxTouchPoints: number): "asset" | "tone" {
  return isIosSafariBrowser(userAgent, maxTouchPoints) ? "tone" : "asset";
}
