export type BugStatus = "Nieuw" | "Bevestigd" | "In behandeling" | "Gefixt" | "Afgekeurd" | "Dubbel";
export type BugSeverity = "Laag" | "Normaal" | "Hoog" | "Kritiek";
export type ReportType = "bug" | "tip" | "workaround" | "idea";

export type User = {
  uid: string;
  displayName: string;
  email: string;
  active?: boolean;
  testAccount?: boolean;
  characterId?: string;
  nameSet?: boolean;
  helpSeen?: boolean;
  splatCount?: number;
  bugDexCount?: number;
  commentPointCount?: number;
  upvoteGivenPointCount?: number;
  totalPoints: number;
  bugCount: number;
  title: string;
  badges: string[];
};

export type BugReport = {
  id: string;
  reportType?: ReportType;
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  screenshotDataUrl?: string;
  status: BugStatus;
  reporterId: string;
  reporterName: string;
  reporterTestAccount?: boolean;
  points: number;
  upvoteCount: number;
  upvoteUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type BugComment = {
  id: string;
  bugId: string;
  authorId: string;
  authorName: string;
  text: string;
  reaction: string;
  createdAt: string;
};

export type BugDexInventoryItem = {
  bugId: string;
  count: number;
  firstUnlockedAt: string;
  lastUnlockedAt: string;
  rarity: string;
  sources: string[];
  lastTradeId?: string;
};

export type NotificationType = "trade" | "new_bug" | "comment" | "bug_update" | "bugdex" | "movement";

export type NotificationSettings = Record<NotificationType, boolean>;

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  actorId: string;
  actorName: string;
  bugId?: string;
  read: boolean;
};

export type TradeStatus = "Open" | "Geaccepteerd" | "Afgewezen";

export type TradeRequest = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  offerBugId: string;
  requestBugId: string;
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  requesterSeenAt?: string;
};

export type NewBugInput = {
  reportType: ReportType;
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  screenshotDataUrl?: string;
};
