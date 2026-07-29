import { gameTheme } from "./gameTheme";

export type ScreenTone = keyof typeof gameTheme.palettes;
export type ScreenPalette = (typeof gameTheme.palettes)[ScreenTone];

export function screenPalette(tone: ScreenTone = "neutral"): ScreenPalette {
  return gameTheme.palettes[tone];
}
