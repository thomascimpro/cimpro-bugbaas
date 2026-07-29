import type { BugDexRarity } from "./pointsService";
import { bugSquadAttackKindForCategory, type BugSquadAttackKind, type BugSquadBonus } from "./bugSquadService";

export type MythicHelperSpecialKind =
  | "royal_freeze"
  | "prism_chain"
  | "pattern_break"
  | "candy_slow"
  | "longneck_scout"
  | "bloom_blade"
  | "lantern_signal"
  | "mirror_guard";

export type BugSquadHelperInfo = {
  cooldownSeconds: number;
  hits: number;
  kind: BugSquadAttackKind;
  specialKind?: MythicHelperSpecialKind;
  targets: number;
  translationKey: string;
  translationParams: Record<string, number>;
};

const mythicSpecialByBugId: Record<string, MythicHelperSpecialKind> = {
  "koningin-alexandravlinder": "royal_freeze",
  "zonsondergangsmot": "prism_chain",
  "picasso-wants": "pattern_break",
  "roze-esdoornmot": "candy_slow",
  "giraffekevertje": "longneck_scout",
  "doornbloembidsprinkhaan": "bloom_blade",
  "lantaarndrager": "lantern_signal",
  "glorieuze-scarabee": "mirror_guard"
};

export function helperEffectDescription(
  bonus: BugSquadBonus,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const info = bugSquadHelperInfo(bonus);
  return t(info.translationKey, info.translationParams);
}

export function bugSquadHelperInfo(bonus: BugSquadBonus): BugSquadHelperInfo {
  const kind = bugSquadAttackKindForCategory(bonus.category);
  const hits = helperBaseHitsForRarity(bonus.rarity);
  const cooldownSeconds = Math.round(helperCooldownMsForRarity(bonus.rarity) / 1000);
  const targets = helperSplashTargetCount(bonus.rarity, kind);
  const specialKind = mythicSpecialByBugId[bonus.bugId];
  const translationKey = specialKind ? `duel.helperSpecial.${specialKind}` : `duel.helperEffect.${kind}`;
  return {
    cooldownSeconds,
    hits,
    kind,
    specialKind,
    targets,
    translationKey,
    translationParams: { cooldown: cooldownSeconds, hits, targets }
  };
}

function helperBaseHitsForRarity(rarity: BugDexRarity): number {
  if (rarity === "Mythisch") return 5;
  if (rarity === "Legendarisch") return 4;
  if (rarity === "Episch") return 3;
  if (rarity === "Zeldzaam") return 2;
  return 1;
}

function helperCooldownMsForRarity(rarity: BugDexRarity): number {
  if (rarity === "Mythisch") return 4300;
  if (rarity === "Legendarisch") return 5200;
  if (rarity === "Episch") return 6500;
  if (rarity === "Zeldzaam") return 7900;
  return 9400;
}

function helperSplashTargetCount(rarity: BugDexRarity, kind: BugSquadAttackKind): number {
  if (kind !== "splash") return 1;
  const rarityBoost = rarity === "Mythisch" ? 4 : rarity === "Legendarisch" ? 3 : rarity === "Episch" ? 2 : rarity === "Zeldzaam" ? 1 : 0;
  const extraTargets = rarityBoost >= 2 ? Math.min(3, rarityBoost - 1) : 0;
  return Math.max(1, extraTargets + 1);
}
