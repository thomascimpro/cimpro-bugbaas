import type { FieldJournalBehavior, FieldJournalEntry, FieldJournalHabitat } from "./fieldJournalService";

type FieldSignalTemplate = {
  behavior?: FieldJournalBehavior;
  habitat?: FieldJournalHabitat;
  id: string;
  icon: string;
  title: string;
};

export type DailyFieldSignal = FieldSignalTemplate & { completed: boolean; dayId: string };

const templates: FieldSignalTemplate[] = [
  { habitat: "Tuin", icon: "✦", id: "garden", title: "Garden signal" },
  { habitat: "Park", icon: "✦", id: "park", title: "Park signal" },
  { habitat: "Water", icon: "◌", id: "water", title: "Waterside signal" },
  { habitat: "Nacht", icon: "☾", id: "night", title: "Night signal" },
  { behavior: "Vloog", icon: "↗", id: "flight", title: "Flight signal" },
  { behavior: "At", icon: "✿", id: "feeding", title: "Feeding signal" }
];

export function localDayId(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dailyFieldSignal(entries: FieldJournalEntry[], now = new Date()): DailyFieldSignal {
  const dayId = localDayId(now);
  const index = Number(dayId.replace(/-/g, "")) % templates.length;
  const template = templates[index];
  const completed = entries.some((entry) => localDayId(new Date(entry.observedAt)) === dayId && matches(template, entry));
  return { ...template, completed, dayId };
}

export function dailyFieldSignalBody(signal: DailyFieldSignal): string {
  if (signal.habitat) return `Document one verified find in ${signal.habitat} today.`;
  if (signal.behavior === "Vloog") return "Document one verified insect in flight today.";
  return "Document one verified insect while feeding today.";
}

function matches(template: FieldSignalTemplate, entry: FieldJournalEntry): boolean {
  return (!template.habitat || entry.habitat === template.habitat) && (!template.behavior || entry.behavior === template.behavior);
}
