export type BugStatus = "Nieuw" | "Bevestigd" | "In behandeling" | "Gefixt" | "Afgekeurd" | "Dubbel";
export type BugSeverity = "Laag" | "Normaal" | "Hoog" | "Kritiek";
export type ReportType = "bug" | "tip" | "workaround" | "idea";

export type User = {
  uid: string;
  displayName: string;
  email: string;
  active?: boolean;
  lastActiveAt?: string;
  testAccount?: boolean;
  organizationId?: string;
  organizationName?: string;
  organizationIds?: string[];
  organizationNames?: Record<string, string>;
  organizationInviteId?: string;
  characterId?: string;
  activeBugSquad?: string[];
  bugLampActiveUntil?: string;
  bugLampCount?: number;
  nameSet?: boolean;
    helpSeen?: boolean;
    notificationPushToken?: string;
    splatCount?: number;
  bugDexCount?: number;
  commentPointCount?: number;
  legendaryBugDexCount?: number;
  movementKmTotal?: number;
  movementRegisteredDay?: string;
  movementRegisteredDayKm?: number;
  movementRegisteredWeek?: string;
  movementRegisteredWeekKm?: number;
  mythicBugDexCount?: number;
  tradedBugDexCount?: number;
  upgradedBugDexCount?: number;
  upvoteGivenPointCount?: number;
  upvoteReceivedPointCount?: number;
  totalPoints: number;
  bugCount: number;
  title: string;
  badges: string[];
};

export type Organization = {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
};

export type OrganizationMemberRole = "owner" | "admin" | "member";

export type OrganizationMember = {
  uid: string;
  displayName: string;
  email: string;
  role: OrganizationMemberRole;
  organizationId: string;
  organizationName: string;
  joinedAt: string;
  invitedById?: string;
  inviteId?: string;
};

export type OrganizationInviteStatus = "open" | "accepted" | "cancelled" | "declined";

export type OrganizationInvite = {
  id: string;
  organizationId: string;
  organizationName: string;
  invitedEmail: string;
  invitedUserId?: string;
  invitedUserName?: string;
  invitedById: string;
  invitedByName: string;
  status: OrganizationInviteStatus;
  createdAt: string;
  acceptedAt?: string;
  acceptedById?: string;
  cancelledAt?: string;
  declinedAt?: string;
  declinedById?: string;
};

export type BugReport = {
  id: string;
  collectionName?: "bugs" | "organizationBugs";
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
  organizationId?: string;
  organizationName?: string;
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
  organizationId?: string;
  organizationName?: string;
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

export type NotificationType = "trade" | "new_bug" | "comment" | "bug_update" | "bugdex" | "movement" | "duel";

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
  duelId?: string;
  read: boolean;
};

export type BugSmashDuelStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled" | "expired";

export type BugSmashDuelScore = {
  score: number;
  caughtBugIds: string[];
  bonusScore: number;
  submittedAt: string;
};

export type BugSmashDuel = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: BugSmashDuelStatus;
  seed: number;
  bugIds: string[];
  createdAt: string;
  updatedAt: string;
  startAt?: string;
  durationMs: number;
  scores?: Record<string, BugSmashDuelScore>;
  winnerId?: string;
  rewardClaimedBy?: string[];
  resultSeenBy?: string[];
};

export type TradeStatus = "Open" | "Geaccepteerd" | "Afgewezen" | "Geannuleerd";

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
  organizationId?: string;
  organizationName?: string;
};
