import type { BugDexInventoryItem, BugDexUnlock } from "../types.ts";
import {
  bugProgressionCatalog,
  type BugAcquisitionProfile,
  type BugProgressionDefinition
} from "./bugProgressionCatalog.ts";

export type CollectionRouteCompletion = {
  owned: number;
  total: number;
  percent: number;
};

export type CollectionCompletion = {
  owned: number;
  total: number;
  percent: number;
  byAcquisition: Record<BugAcquisitionProfile, CollectionRouteCompletion>;
  missing: BugProgressionDefinition[];
};

const acquisitionProfiles: BugAcquisitionProfile[] = ["starter", "field", "research", "campaign", "event", "mythic", "legacy"];

export function buildCollectionCompletion(
  inventory: BugDexInventoryItem[],
  unlockHistory: Pick<BugDexUnlock, "bugId">[] = []
): CollectionCompletion {
  const ownedIds = new Set([
    ...inventory.filter((item) => item.count > 0).map((item) => item.bugId),
    ...unlockHistory.map((item) => item.bugId)
  ]);
  const owned = bugProgressionCatalog.filter((entry) => ownedIds.has(entry.bugId)).length;
  const total = bugProgressionCatalog.length;
  const byAcquisition = Object.fromEntries(acquisitionProfiles.map((profile) => {
    const definitions = bugProgressionCatalog.filter((entry) => entry.acquisition === profile);
    const routeOwned = definitions.filter((entry) => ownedIds.has(entry.bugId)).length;
    return [profile, {
      owned: routeOwned,
      total: definitions.length,
      percent: percentage(routeOwned, definitions.length)
    }];
  })) as Record<BugAcquisitionProfile, CollectionRouteCompletion>;

  return {
    owned,
    total,
    percent: percentage(owned, total),
    byAcquisition,
    missing: bugProgressionCatalog.filter((entry) => !ownedIds.has(entry.bugId))
  };
}

export function missingSpeciesRoute(input: BugAcquisitionProfile | BugProgressionDefinition): string {
  const profile = typeof input === "string" ? input : input.acquisition;
  if (profile !== "event") return `collection.route.${profile}`;
  const eventPoolId = typeof input === "string" ? undefined : input.eventPoolId;
  if (eventPoolId === "swarm-siege") return "collection.route.eventSwarm";
  if (eventPoolId === "team-hunt") return "collection.route.eventTeamHunt";
  if (eventPoolId === "season-finale") return "collection.route.eventSeasonFinale";
  return "collection.route.eventReturn";
}

export function crownHallMasterEligible(input: {
  completionPercent: number;
  masteredCoreWings: number;
  coreWingCount: number;
}): boolean {
  return input.completionPercent >= 90 && input.coreWingCount > 0 && input.masteredCoreWings >= input.coreWingCount;
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}
