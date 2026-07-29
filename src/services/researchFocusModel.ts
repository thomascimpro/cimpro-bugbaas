export type ResearchFocusWing = "beetles" | "wings" | "water" | "night" | "crawlers";

const researchFocusWings = new Set<ResearchFocusWing>(["beetles", "wings", "water", "night", "crawlers"]);

export function normalizeResearchFocusWing(value: unknown): ResearchFocusWing | undefined {
  const wingId = String(value || "") as ResearchFocusWing;
  return researchFocusWings.has(wingId) ? wingId : undefined;
}
