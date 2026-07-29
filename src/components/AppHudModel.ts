import { getTierForPoints, userTiers } from "../services/pointsService.ts";
import type { User } from "../types.ts";

export type HudLanguage = "nl" | "en" | "fr";

export function languageFlag(language: HudLanguage): string {
  if (language === "en") return "🇬🇧";
  if (language === "fr") return "🇫🇷";
  return "🇳🇱";
}

export function compactHudModel(user: User) {
  const rawPoints = Number(user.totalPoints);
  const points = Number.isFinite(rawPoints) ? Math.max(0, rawPoints) : 0;
  const tier = getTierForPoints(points);
  const tierIndex = Math.max(0, userTiers.findIndex((item) => item.minPoints === tier.minPoints));
  const nextTier = userTiers[tierIndex + 1];
  const progress = nextTier
    ? Math.max(0, Math.min(1, (points - tier.minPoints) / Math.max(1, nextTier.minPoints - tier.minPoints)))
    : 1;

  return {
    displayName: typeof user.displayName === "string" && user.displayName.trim() ? user.displayName.trim() : "BugBaas",
    points,
    progress,
    tier
  };
}
