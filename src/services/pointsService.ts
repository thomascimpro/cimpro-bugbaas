import { BugSeverity, BugStatus, User } from "../types";

export type InsectVariant = "larva" | "beetle" | "grasshopper" | "dragonfly" | "ladybug" | "crawler";

export type UserTier = {
  minPoints: number;
  title: string;
  description: string;
  color: string;
  insect: InsectVariant;
  bugSize: number;
  evolutionLevel: number;
};

export const userTiers: UserTier[] = [
  {
    minPoints: 0,
    title: "Larve",
    description: "Net uit het test-ei, klaar voor de eerste vondst.",
    color: "#6f7f5f",
    insect: "larva",
    bugSize: 46,
    evolutionLevel: 1
  },
  {
    minPoints: 25,
    title: "Keverscout",
    description: "Ziet kleine foutjes voordat ze groter worden.",
    color: "#2f6b4f",
    insect: "beetle",
    bugSize: 56,
    evolutionLevel: 2
  },
  {
    minPoints: 75,
    title: "Sprinkhaan Specialist",
    description: "Springt snel naar reproduceerbare bugs.",
    color: "#587c2d",
    insect: "grasshopper",
    bugSize: 66,
    evolutionLevel: 3
  },
  {
    minPoints: 150,
    title: "Libelle Leider",
    description: "Houdt overzicht over status, prioriteit en fix.",
    color: "#356d7c",
    insect: "dragonfly",
    bugSize: 76,
    evolutionLevel: 4
  },
  {
    minPoints: 300,
    title: "Opperbugmeister",
    description: "De baas van de bugjacht.",
    color: "#b83227",
    insect: "ladybug",
    bugSize: 88,
    evolutionLevel: 5
  }
];

const severityBase: Record<BugSeverity, number> = {
  Laag: 5,
  Normaal: 10,
  Hoog: 20,
  Kritiek: 35
};

export function calculateBugPoints(severity: BugSeverity, status: BugStatus): number {
  if (status === "Afgekeurd" || status === "Dubbel") {
    return 0;
  }
  if (status === "Gefixt") {
    return severityBase[severity] + 15;
  }
  if (status === "Bevestigd" || status === "In behandeling") {
    return severityBase[severity] + 5;
  }
  return severityBase[severity];
}

export function titleForPoints(points: number): string {
  return getTierForPoints(points).title;
}

export function getTierForPoints(points: number): UserTier {
  return [...userTiers].reverse().find((tier) => points >= tier.minPoints) ?? userTiers[0];
}

export function pointsUntilNextTier(points: number): number | null {
  const nextTier = userTiers.find((tier) => tier.minPoints > points);
  return nextTier ? nextTier.minPoints - points : null;
}

export function badgesForUser(user: Pick<User, "totalPoints" | "bugCount">): string[] {
  const badges = [];
  if (user.bugCount >= 1) badges.push("Eerste vangst");
  if (user.bugCount >= 5) badges.push("Speurneus");
  if (user.totalPoints >= 100) badges.push("Puntenslijper");
  if (user.totalPoints >= 150) badges.push("Statusstrijder");
  if (user.totalPoints >= 300) badges.push("Meesterkolonie");
  return badges;
}
