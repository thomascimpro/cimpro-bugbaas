import type { Language } from "../services/i18n";

export type FlagPattern = "netherlands" | "united-kingdom" | "france";

export function flagPatternForLanguage(language: Language): FlagPattern {
  if (language === "nl") return "netherlands";
  if (language === "fr") return "france";
  return "united-kingdom";
}
