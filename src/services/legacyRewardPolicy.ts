import type { BugDexDropSource } from "./bugDexService.ts";
import type { ResearchProgressSource } from "./researchTargetModel.ts";

export type LegacyRewardPolicy = {
  kind: "none" | "points" | "species";
  points: number;
  researchSource?: ResearchProgressSource;
};

const pointPolicies: Partial<Record<BugDexDropSource, LegacyRewardPolicy>> = {
  profile_view: { kind: "none", points: 0, researchSource: undefined },
  upvote_given: { kind: "points", points: 2, researchSource: "internal_contribution" },
  comment: { kind: "points", points: 4, researchSource: "internal_contribution" },
  status_update: { kind: "points", points: 5, researchSource: "internal_contribution" },
  bug_reported: { kind: "points", points: 10, researchSource: "internal_contribution" },
  bug_fixed: { kind: "points", points: 12, researchSource: "internal_contribution" },
  bug_splat: { kind: "points", points: 4, researchSource: undefined }
};

export function legacyRewardPolicy(source: BugDexDropSource): LegacyRewardPolicy {
  return pointPolicies[source] ?? { kind: "species", points: 0, researchSource: undefined };
}
