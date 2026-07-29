import type { FieldJournalEntry } from "./fieldJournalService";

export type FieldPhotoStampId = "new_species" | "new_habitat" | "documented_behavior";

export type FieldPhotoStamp = {
  id: FieldPhotoStampId;
  title: string;
  body: string;
  icon: string;
};

const stampDefinitions: Record<FieldPhotoStampId, FieldPhotoStamp> = {
  new_species: { id: "new_species", icon: "✦", title: "New species frame", body: "This is your first verified field note for this species." },
  new_habitat: { id: "new_habitat", icon: "⌁", title: "Habitat frame", body: "You added a new habitat to your private discovery map." },
  documented_behavior: { id: "documented_behavior", icon: "◌", title: "Behaviour frame", body: "You documented this animal doing something specific." }
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("nl-NL");
}

/**
 * Derives visual field-photo stamps from saved, verified observations only.
 * They are documentation, not XP, inventory, or an AI quality score.
 */
export function getFieldPhotoStamps(entry: FieldJournalEntry, entries: FieldJournalEntry[]): FieldPhotoStamp[] {
  const priorEntries = entries
    .filter((item) => item.id !== entry.id && item.scanId !== entry.scanId)
    .filter((item) => new Date(item.observedAt).getTime() <= new Date(entry.observedAt).getTime());
  const stamps: FieldPhotoStamp[] = [];

  if (!priorEntries.some((item) => normalized(item.speciesName) === normalized(entry.speciesName))) stamps.push(stampDefinitions.new_species);
  if (!priorEntries.some((item) => item.habitat === entry.habitat)) stamps.push(stampDefinitions.new_habitat);
  if (entry.behavior !== "Onbekend" && !priorEntries.some((item) => normalized(item.speciesName) === normalized(entry.speciesName) && item.behavior === entry.behavior)) {
    stamps.push(stampDefinitions.documented_behavior);
  }
  return stamps;
}
