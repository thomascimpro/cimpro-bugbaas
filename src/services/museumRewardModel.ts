import type { BugDexInventoryItem, BugMastery } from "../types";
import type { FieldJournalEntry } from "./fieldJournalService";
import type { MuseumExhibitPlacement } from "./museumPlacementModel";
import { bugDexEntries } from "./pointsService";
import { museumStageRank, type MuseumWing, type MuseumWingId } from "../screens/MuseumScreenModel";

export type MuseumRewardMilestoneId = "open" | "curated" | "master" | "prestige" | "bronze" | "silver" | "gold" | "legend";

export type MuseumRewardGoal = {
  claimId: string;
  wingId: MuseumWingId;
  milestoneId: MuseumRewardMilestoneId;
  progress: number;
  current: number;
  required: number;
  complete: boolean;
  titleKey: string;
  objectiveKey: string;
  rewardKey: string;
  rewardBugId?: string;
  rewardBadgeId?: string;
  rewardXp: number;
};

const bugEntryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));

const wingMasterBug: Partial<Record<MuseumWingId, string>> = {
  beetles: "giraffekevertje",
  wings: "koningin-alexandravlinder",
  night: "roze-esdoornmot",
  crown: "glorieuze-scarabee"
};

const wingBadge: Partial<Record<MuseumWingId, string>> = {
  beetles: "bugdex-set-beetle-brigade",
  wings: "bugdex-set-wings-of-color",
  water: "bugdex-set-water-hunters",
  night: "bugdex-set-night-crew",
  crawlers: "bugdex-set-web-and-sting",
  crown: "dex-master"
};

export function museumRewardClaimId(wingId: MuseumWingId, milestoneId: MuseumRewardMilestoneId): string {
  return `museum:${wingId}:${milestoneId}`;
}

export function buildMuseumRewardGoals(args: {
  wings: MuseumWing[];
  placementsByWing: Record<MuseumWingId, MuseumExhibitPlacement[]>;
  inventory: BugDexInventoryItem[];
  masteries: BugMastery[];
  journalEntries: FieldJournalEntry[];
  trophyCount: number;
}): MuseumRewardGoal[] {
  const { wings, placementsByWing, inventory, masteries, journalEntries, trophyCount } = args;
  const masteryById = new Map(masteries.map((item) => [item.bugId, item.level]));
  const goals: MuseumRewardGoal[] = [];

  for (const wing of wings.filter((item) => item.id !== "crown")) {
    goals.push(stageGoal(wing, "open", 15));
    goals.push(stageGoal(wing, "curated", 25, undefined, wingBadge[wing.id]));
    goals.push(stageGoal(wing, "master", 40, wingMasterBug[wing.id]));

    const placements = placementsByWing[wing.id] ?? [];
    const uniquePlaced = new Set(placements.map((item) => item.bugId).filter(Boolean));
    const trained = [...uniquePlaced].filter((bugId) => (masteryById.get(bugId) ?? 1) >= 10).length;
    const rarePlaced = [...uniquePlaced].filter((bugId) => {
      const rarity = bugEntryById.get(bugId)?.rarity;
      return rarity === "Legendarisch" || rarity === "Mythisch";
    }).length;
    const wingBugIds = new Set(inventory.filter((item) => item.count > 0 && wingContainsBug(wing.id, item.bugId)).map((item) => item.bugId));
    const observations = new Set(journalEntries.filter((item) => wingBugIds.has(item.bugId)).map((item) => item.id)).size;
    const checks = [
      museumStageRank(wing.stage) >= museumStageRank("master"),
      uniquePlaced.size >= 6,
      trained >= 4,
      rarePlaced >= 1,
      observations >= 3
    ];
    const current = checks.filter(Boolean).length;
    goals.push({
      claimId: museumRewardClaimId(wing.id, "prestige"),
      wingId: wing.id,
      milestoneId: "prestige",
      progress: current / checks.length,
      current,
      required: checks.length,
      complete: current === checks.length,
      titleKey: "museum.reward.prestige.title",
      objectiveKey: prestigeObjectiveKey({ wing, uniquePlaced: uniquePlaced.size, trained, rarePlaced, observations }),
      rewardKey: "museum.reward.prestige.reward",
      rewardBadgeId: wingBadge[wing.id],
      rewardXp: 0
    });
  }

  const regular = wings.filter((item) => item.id !== "crown");
  const masterCount = regular.filter((item) => museumStageRank(item.stage) >= museumStageRank("master")).length;
  const prestigeCount = goals.filter((item) => item.milestoneId === "prestige" && item.complete).length;
  const crownPlacements = new Set((placementsByWing.crown ?? []).map((item) => item.bugId).filter(Boolean)).size;
  goals.push(crownGoal("bronze", masterCount, 2, "museum.reward.crown.bronze.reward"));
  goals.push(crownGoal("silver", masterCount, 5, "museum.reward.crown.silver.reward", "picasso-wants"));
  goals.push(crownGoal("gold", prestigeCount, 3, "museum.reward.crown.gold.reward"));
  const legendChecks = [prestigeCount >= 5, crownPlacements >= 6, trophyCount >= 1];
  goals.push({
    claimId: museumRewardClaimId("crown", "legend"),
    wingId: "crown",
    milestoneId: "legend",
    progress: legendChecks.filter(Boolean).length / legendChecks.length,
    current: legendChecks.filter(Boolean).length,
    required: legendChecks.length,
    complete: legendChecks.every(Boolean),
    titleKey: "museum.reward.crown.legend.title",
    objectiveKey: prestigeCount < 5 ? "museum.reward.crown.legend.needPrestige" : crownPlacements < 6 ? "museum.reward.crown.legend.needDisplay" : trophyCount < 1 ? "museum.reward.crown.legend.needTrophy" : "museum.reward.ready",
    rewardKey: "museum.reward.crown.legend.reward",
    rewardBadgeId: "mythic-master",
    rewardXp: 0
  });

  return goals;
}

export function nextMuseumRewardGoal(goals: MuseumRewardGoal[], wingId: MuseumWingId, claimedIds: ReadonlySet<string> = new Set()): MuseumRewardGoal | undefined {
  const order: MuseumRewardMilestoneId[] = wingId === "crown" ? ["bronze", "silver", "gold", "legend"] : ["open", "curated", "master", "prestige"];
  const orderedGoals = order.map((id) => goals.find((goal) => goal.wingId === wingId && goal.milestoneId === id)).filter((goal): goal is MuseumRewardGoal => Boolean(goal));
  return orderedGoals.find((goal) => !claimedIds.has(goal.claimId)) ?? orderedGoals[orderedGoals.length - 1];
}

function stageGoal(wing: MuseumWing, milestoneId: "open" | "curated" | "master", rewardXp: number, rewardBugId?: string, rewardBadgeId?: string): MuseumRewardGoal {
  const targetRank = museumStageRank(milestoneId);
  const currentRank = Math.max(0, museumStageRank(wing.stage));
  const complete = currentRank >= targetRank;
  return {
    claimId: museumRewardClaimId(wing.id, milestoneId),
    wingId: wing.id,
    milestoneId,
    progress: complete ? 1 : Math.max(0, Math.min(1, wing.progress)),
    current: complete ? 1 : 0,
    required: 1,
    complete,
    titleKey: `museum.reward.${milestoneId}.title`,
    objectiveKey: complete ? "museum.reward.ready" : `museum.reward.${milestoneId}.objective`,
    rewardKey: `museum.reward.${milestoneId}.reward`,
    rewardBugId,
    rewardBadgeId,
    rewardXp
  };
}

function crownGoal(milestoneId: "bronze" | "silver" | "gold", current: number, required: number, rewardKey: string, rewardBugId?: string): MuseumRewardGoal {
  return {
    claimId: museumRewardClaimId("crown", milestoneId),
    wingId: "crown",
    milestoneId,
    progress: Math.min(1, current / required),
    current,
    required,
    complete: current >= required,
    titleKey: `museum.reward.crown.${milestoneId}.title`,
    objectiveKey: current >= required ? "museum.reward.ready" : `museum.reward.crown.${milestoneId}.objective`,
    rewardKey,
    rewardBugId,
    rewardXp: 0
  };
}

function prestigeObjectiveKey(args: { wing: MuseumWing; uniquePlaced: number; trained: number; rarePlaced: number; observations: number }): string {
  if (museumStageRank(args.wing.stage) < museumStageRank("master")) return "museum.reward.prestige.needMaster";
  if (args.uniquePlaced < 6) return "museum.reward.prestige.needDisplay";
  if (args.trained < 4) return "museum.reward.prestige.needTraining";
  if (args.rarePlaced < 1) return "museum.reward.prestige.needLegendary";
  if (args.observations < 3) return "museum.reward.prestige.needField";
  return "museum.reward.ready";
}

function wingContainsBug(wingId: MuseumWingId, bugId: string): boolean {
  const entry = bugEntryById.get(bugId);
  if (!entry) return false;
  if (wingId === "beetles") return entry.insect === "beetle" || entry.insect === "ladybug";
  if (wingId === "wings") return entry.insect === "dragonfly" || entry.insect === "grasshopper";
  if (wingId === "crawlers") return entry.insect === "crawler" || entry.insect === "larva";
  if (wingId === "water") return /water|juffer|libel|schrijvertje|schaatsenrijder/.test(entry.id);
  if (wingId === "night") return /mot|nacht|kakkerlak|spin|schorpioen|glimworm/.test(entry.id);
  return true;
}
