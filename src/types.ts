export type BugStatus = "Nieuw" | "Bevestigd" | "In behandeling" | "Gefixt" | "Afgekeurd" | "Dubbel";
export type BugSeverity = "Laag" | "Normaal" | "Hoog" | "Kritiek";

export type User = {
  uid: string;
  displayName: string;
  email: string;
  totalPoints: number;
  bugCount: number;
  title: string;
  badges: string[];
};

export type BugReport = {
  id: string;
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  screenshotDataUrl?: string;
  status: BugStatus;
  reporterId: string;
  reporterName: string;
  points: number;
  upvoteCount: number;
  upvoteUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type NewBugInput = {
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  screenshotDataUrl?: string;
};
