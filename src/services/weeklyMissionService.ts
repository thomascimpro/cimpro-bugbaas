import { BugReport, User } from "../types";

export type WeeklyMission = {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: string;
};

type MissionTemplate = {
  id: string;
  title: string;
  target: number;
  reward: string;
  progressFor: (user: User, bugs: BugReport[], weekStart: Date) => number;
};

const missionPool: MissionTemplate[] = [
  {
    id: "fresh-finds",
    title: "Meld 2 bugs",
    target: 2,
    reward: "+20 missiepunten",
    progressFor: (user, bugs, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart)).length
  },
  {
    id: "screenshot-proof",
    title: "Meld bug met screenshot",
    target: 1,
    reward: "Screenshot badge",
    progressFor: (user, bugs, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart) && !!bug.screenshotDataUrl).length
  },
  {
    id: "team-votes",
    title: "Krijg 2 upvotes",
    target: 2,
    reward: "+10 bonuspunten",
    progressFor: (user, bugs, weekStart) => bugs
      .filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.updatedAt, weekStart))
      .reduce((total, bug) => total + (bug.upvoteCount ?? 0), 0)
  },
  {
    id: "fix-hunter",
    title: "Laat 1 bug fixen",
    target: 1,
    reward: "Fix streak",
    progressFor: (user, bugs, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && bug.status === "Gefixt" && isThisWeek(bug.updatedAt, weekStart)).length
  },
  {
    id: "critical-eye",
    title: "Vind hoge urgentie",
    target: 1,
    reward: "Scherp oog",
    progressFor: (user, bugs, weekStart) => bugs.filter((bug) => isBugReport(bug) && bug.reporterId === user.uid && isThisWeek(bug.createdAt, weekStart) && (bug.severity === "Hoog" || bug.severity === "Kritiek")).length
  }
];

export function weeklyMissionSet(user: User, bugs: BugReport[], now = new Date()): WeeklyMission[] {
  const weekStart = startOfIsoWeek(now);
  const seed = weekNumber(now);
  return [0, 1, 2].map((offset) => {
    const template = missionPool[(seed + offset * 2) % missionPool.length];
    const progress = Math.min(template.target, template.progressFor(user, bugs, weekStart));
    return {
      id: `${template.id}-${seed}`,
      title: template.title,
      target: template.target,
      progress,
      reward: template.reward
    };
  });
}

export function weeklyMissionLabel(now = new Date()): string {
  return `Week ${weekNumber(now)}`;
}

function startOfIsoWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

function weekNumber(date: Date): number {
  const next = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(next.getUTCFullYear(), 0, 1));
  return Math.ceil((((next.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function isBugReport(bug: BugReport): boolean {
  return (bug.reportType ?? "bug") === "bug";
}

function isThisWeek(value: string, weekStart: Date): boolean {
  const date = new Date(value);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}
