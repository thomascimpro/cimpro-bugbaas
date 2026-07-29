import type { MuseumWingId, MuseumWingStage } from "../screens/MuseumScreenModel.ts";

export type MuseumExhibitPlacement = {
  slotId: string;
  bugId: string;
  placedAt: string;
};

export function museumSlotCapacity(stage: MuseumWingStage): number {
  if (stage === "discovered") return 1;
  if (stage === "open") return 3;
  if (stage === "curated" || stage === "master") return 6;
  return 0;
}

export function sanitizeMuseumPlacements(input: {
  wingId: MuseumWingId;
  stage: MuseumWingStage;
  placements: MuseumExhibitPlacement[];
  ownedBugIds: readonly string[];
  allowedBugIds: readonly string[];
}): MuseumExhibitPlacement[] {
  const capacity = museumSlotCapacity(input.stage);
  const owned = new Set(input.ownedBugIds);
  const allowed = new Set(input.allowedBugIds);
  const usedBugs = new Set<string>();
  const usedSlots = new Set<string>();
  const result: MuseumExhibitPlacement[] = [];

  for (const placement of input.placements) {
    const slotNumber = parseSlotNumber(placement.slotId);
    if (!slotNumber || slotNumber > capacity) continue;
    if (!owned.has(placement.bugId) || !allowed.has(placement.bugId)) continue;
    if (usedBugs.has(placement.bugId) || usedSlots.has(placement.slotId)) continue;
    usedBugs.add(placement.bugId);
    usedSlots.add(placement.slotId);
    result.push({ ...placement });
  }

  return result.sort((first, second) => parseSlotNumber(first.slotId) - parseSlotNumber(second.slotId));
}

export function placeMuseumExhibit(input: {
  wingId: MuseumWingId;
  stage: MuseumWingStage;
  placements: MuseumExhibitPlacement[];
  ownedBugIds: readonly string[];
  allowedBugIds: readonly string[];
  slotId: string;
  bugId: string;
  now: string;
}): MuseumExhibitPlacement[] {
  const slotNumber = parseSlotNumber(input.slotId);
  if (!slotNumber || slotNumber > museumSlotCapacity(input.stage)) throw new Error("This exhibit slot is locked.");
  if (!input.ownedBugIds.includes(input.bugId)) throw new Error("This specimen is not owned.");
  if (!input.allowedBugIds.includes(input.bugId)) throw new Error("This specimen does not belong in this wing.");
  const next = input.placements.filter((placement) => placement.slotId !== input.slotId && placement.bugId !== input.bugId);
  next.push({ slotId: input.slotId, bugId: input.bugId, placedAt: input.now });
  return sanitizeMuseumPlacements({ ...input, placements: next });
}

export function clearMuseumExhibit(input: {
  wingId: MuseumWingId;
  stage: MuseumWingStage;
  placements: MuseumExhibitPlacement[];
  ownedBugIds: readonly string[];
  allowedBugIds: readonly string[];
  slotId: string;
}): MuseumExhibitPlacement[] {
  return sanitizeMuseumPlacements({ ...input, placements: input.placements.filter((placement) => placement.slotId !== input.slotId) });
}

function parseSlotNumber(slotId: string): number {
  const match = /^slot-(\d+)$/.exec(slotId);
  return match ? Number(match[1]) : 0;
}
