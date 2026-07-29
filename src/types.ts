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
  duelDraws?: number;
  duelLosses?: number;
  duelRating?: number;
  duelRatingDecayThroughDay?: string;
  duelRatingLastDuelId?: string;
  duelRatingUpdatedAt?: string;
  duelSeasonId?: string;
  duelSeasonResetAt?: string;
  duelWins?: number;
  nameSet?: boolean;
  helpSeen?: boolean;
  lastReportRewardDay?: string;
    notificationPushToken?: string;
    splatCount?: number;
  starterBoostActiveUntil?: string;
  starterBoostGrantedAt?: string;
  bugDexCount?: number;
  commentPointCount?: number;
  legendaryBugDexCount?: number;
  movementKmTotal?: number;
  movementRegisteredDay?: string;
  movementRegisteredDayKm?: number;
  movementRegisteredWeek?: string;
  movementRegisteredWeekKm?: number;
  momentumCycle?: number;
  momentumLastActiveDay?: string;
  momentumSegments?: number;
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
  updatedAt?: string;
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

export type BugDexUnlock = {
  bugId: string;
  firstUnlockedAt: string;
  lastTradeId?: string;
  lastUnlockedAt: string;
  rarity: string;
  sources: string[];
};

export type BugMasteryRank = "rookie" | "trained" | "skilled" | "veteran" | "elite" | "master";
export type BugMasteryRole = "attack" | "speed" | "shield" | "chaos" | "support";
export type BugMasterySkillKind = "active" | "master" | "passive";
export type BugMasteryXpSource =
  | "active_squad_duel"
  | "active_squad_solo"
  | "boss_defeat"
  | "buddy_care"
  | "duplicate_unlock"
  | "duel_draw"
  | "duel_reward"
  | "duel_win"
  | "movement_radar"
  | "new_unlock"
  | "skill_trigger"
  | "walking";

export type BugMasterySkill = {
  id: string;
  kind: BugMasterySkillKind;
  role: BugMasteryRole;
  unlockedAtLevel: 3 | 5 | 10 | 15 | 20;
};

export type BugMastery = {
  bugId: string;
  battleWins: number;
  level: number;
  xp: number;
  lifetimeXp: number;
  rank: BugMasteryRank;
  role: BugMasteryRole;
  unlockedSkillIds: string[];
  selectedSkillIds?: string[];
  activeUses: number;
  duelUses: number;
  soloUses: number;
  walkedKm: number;
  lastXpAt?: string;
  lastTradeId?: string;
  sourceTotals: Record<string, number>;
  dailySourceTotals?: Record<string, number>;
  updatedAt: string;
};

export type BugMasteryXpEvent = {
  id: string;
  amount: number;
  bugId: string;
  createdAt: string;
  localDay: string;
  source: BugMasteryXpSource;
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

export type ArcadeMode = "tap_duel" | "web_runner" | "nest_defense" | "bug_glide" | "bug_tower" | "bubble_swarm" | "butterfly_catch";
export type ArcadeResultMode = ArcadeMode;

export type BugSmashDuel = {
  id: string;
  arcadeMode?: ArcadeMode;
  claimedArcadeMode?: ArcadeMode;
  arcadeSeed?: string;
  arcadeVersion?: number;
  fromUserId: string;
  fromUserName: string;
  matchType?: "direct" | "random";
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
  ratingAppliedAt?: string;
  ratingDeltas?: Record<string, number>;
};

export type ArcadeRunResult = {
  mode: ArcadeResultMode;
  score: number;
  durationMs: number;
  pickups: number;
  hits: number;
  combo: number;
  streak: number;
  timestamp: string;
  localHighScore: number;
  ratingPreview?: number;
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
  offerBugIds?: string[];
  requestBugIds?: string[];
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  acceptedBugCount?: number;
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
