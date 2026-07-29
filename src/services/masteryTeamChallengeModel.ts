export type MasteryTeamChallengeTierId = "bronze" | "gold" | "prismatic";

export type MasteryTeamChallengeTier = {
  current: number;
  frameId: string;
  id: MasteryTeamChallengeTierId;
  required: 3;
  requiredLevel: number;
  unlocked: boolean;
};

export type MasteryTeamChallenge = {
  complete: boolean;
  tiers: MasteryTeamChallengeTier[];
  unlockedFrameId?: string;
};

const tierDefinitions = [
  { frameId: "mastery-squad-bronze", id: "bronze", requiredLevel: 5 },
  { frameId: "mastery-squad-gold", id: "gold", requiredLevel: 10 },
  { frameId: "mastery-squad-prismatic", id: "prismatic", requiredLevel: 20 }
] as const;

export function buildMasteryTeamChallenge(input: {
  activeSquadIds: readonly string[];
  masteryLevels: Record<string, number>;
}): MasteryTeamChallenge {
  const squadIds = [...new Set(input.activeSquadIds.filter(Boolean))].slice(0, 3);
  const tiers = tierDefinitions.map((definition) => {
    const current = squadIds.filter((bugId) => Math.max(0, Math.floor(input.masteryLevels[bugId] ?? 0)) >= definition.requiredLevel).length;
    return {
      ...definition,
      current,
      required: 3 as const,
      unlocked: current >= 3
    };
  });
  const unlocked = [...tiers].reverse().find((tier) => tier.unlocked);
  return {
    complete: tiers.at(-1)?.unlocked ?? false,
    tiers,
    unlockedFrameId: unlocked?.frameId
  };
}
