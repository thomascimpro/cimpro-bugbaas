import type { BugDexInventoryItem } from "../types.ts";
import {
  bugProgressionCatalog,
  type BugProgressionDefinition,
  type BugProgressionHabitat,
  type BugProgressionMuseumWingId
} from "./bugProgressionCatalog.ts";
import type { PlayerJourneyStage } from "./playerJourneyModel.ts";

export type ResearchProgressSource = "verified_scan" | "internal_contribution" | "play_completion" | "daily_route" | "momentum_cycle";

export type ResearchTarget = {
  id: string;
  bugId: string;
  progress: number;
  target: 100;
  tier: number;
  startedAt: string;
  completedAt?: string;
  claimedAt?: string;
};

export type ResearchTargetContext = {
  activeHabitat?: BugProgressionHabitat;
  activeMuseumWing?: BugProgressionMuseumWingId;
  incompleteSetBugIds?: readonly string[];
};

export type ResearchTargetStatus = {
  activeTarget?: ResearchTarget;
  awardedBugId?: string;
  duplicate?: boolean;
  options: BugProgressionDefinition[];
  pendingReceiptId?: string;
};

const progressAmounts: Record<ResearchProgressSource, number> = {
  verified_scan: 40,
  internal_contribution: 25,
  play_completion: 20,
  daily_route: 15,
  momentum_cycle: 25
};

export function researchProgressAmount(source: ResearchProgressSource): number {
  return progressAmounts[source];
}

export function buildResearchTargetOptions(input: {
  inventory: BugDexInventoryItem[];
  stage: PlayerJourneyStage;
  rotationKey: string;
  context?: ResearchTargetContext;
  limit?: number;
}): BugProgressionDefinition[] {
  const ownedIds = new Set(input.inventory.filter((item) => item.count > 0).map((item) => item.bugId));
  const incompleteSetIds = new Set(input.context?.incompleteSetBugIds ?? []);
  const maxTier = maxResearchTierForStage(input.stage);
  const limit = Math.max(0, Math.floor(input.limit ?? 3));

  return bugProgressionCatalog
    .filter((definition) => definition.acquisition === "research")
    .filter((definition) => !ownedIds.has(definition.bugId))
    .filter((definition) => (definition.researchTier ?? 4) <= maxTier)
    .map((definition) => ({
      definition,
      score: researchOptionScore(definition, input.rotationKey, input.context, incompleteSetIds)
    }))
    .sort((first, second) => second.score - first.score || first.definition.bugId.localeCompare(second.definition.bugId))
    .slice(0, limit)
    .map((item) => item.definition);
}

export function maxResearchTierForStage(stage: PlayerJourneyStage): 1 | 2 | 3 | 4 {
  if (stage === "rookie") return 1;
  if (stage === "scout") return 2;
  if (stage === "ranger") return 3;
  return 4;
}

function researchOptionScore(
  definition: BugProgressionDefinition,
  rotationKey: string,
  context: ResearchTargetContext | undefined,
  incompleteSetIds: Set<string>
): number {
  let score = (5 - (definition.researchTier ?? 4)) * 20;
  if (context?.activeHabitat && definition.habitats.includes(context.activeHabitat)) score += 1000;
  if (context?.activeMuseumWing && definition.museumWings.includes(context.activeMuseumWing)) score += 700;
  if (incompleteSetIds.has(definition.bugId)) score += 500;
  score += stableHash(`${rotationKey}:${definition.bugId}`) % 100;
  return score;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
