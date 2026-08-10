import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import type { NotificationResponse } from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, BackHandler, Image, ImageSourcePropType, Linking, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNotification, BugComment, BugReport, NotificationSettings, User } from "./src/types";
import { AppLoadingScreen } from "./src/components/AppLoadingScreen";
import { activateBugLamp, applyUserPoints, createOrganizationForUser, ensureUserDocument, getUserById, login, loginWithGoogle, logout, markHelpSeen, recordBugSplat, register, subscribeAuth, syncEngagementPoints, syncMovementKilometers, touchUserActivity, updateUserCharacter, updateUserDisplayName } from "./src/services/userService";
import { activeBugSquadBonuses } from "./src/services/bugSquadService";
import { movementBoostWithBugLamp } from "./src/services/bugLampService";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { WorldScreen } from "./src/screens/WorldScreen";
import { BugListScreen } from "./src/screens/BugListScreen";
import { BugDetailScreen } from "./src/screens/BugDetailScreen";
import { NewBugScreen } from "./src/screens/NewBugScreen";
import { PlayScreen } from "./src/screens/PlayScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { CollectionScreen } from "./src/screens/CollectionScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { RealBugScanScreen } from "./src/screens/RealBugScanScreen";
import { ReleaseBossScreen } from "./src/screens/ReleaseBossScreen";
import { TeamHuntScreen } from "./src/screens/TeamHuntScreen";
import { SwarmSiegeScreen } from "./src/screens/SwarmSiegeScreen";
import { AppBackground } from "./src/components/AppBackground";
import { BottomNav } from "./src/components/BottomNav";
import { AppHud } from "./src/components/AppHud";
import { AppOverlayHost } from "./src/components/AppOverlayHost";
import { BuddyOverlay } from "./src/components/BuddyOverlay";
import { ViewportScreen } from "./src/components/ViewportScreen";
import { useResponsiveLayout } from "./src/theme/useResponsiveLayout";
import type { ScreenTone } from "./src/theme/screenTheme";
import { closeOverlay, initialAppNavigationState, navigateTo, openOverlay, type MainDestination } from "./src/navigation/appNavigation";
import { parentRouteForHardwareBack } from "./src/navigation/hardwareBackNavigation";
import { WalkingBugsLayer } from "./src/components/WalkingBugsLayer";
import { BugDexUnlockModal } from "./src/components/BugDexUnlockModal";
import { RankUpModal } from "./src/components/RankUpModal";
import { RewardSpinModal } from "./src/components/RewardSpinModal";
import { BadgeUnlockModal } from "./src/components/BadgeUnlockModal";
import { BugSplatBonusOverlay } from "./src/components/BugSplatBonusOverlay";
import { ForegroundCatchBug } from "./src/components/ForegroundCatchBug";
import { DisplayNameModal } from "./src/components/DisplayNameModal";
import { InAppNotificationToast } from "./src/components/InAppNotificationToast";
import { ActiveEventAnnouncementModal, type ActiveEventAnnouncement } from "./src/components/ActiveEventAnnouncementModal";
import { HelpTourOverlay } from "./src/components/HelpTourOverlay";
import { DailyMissionCompletionController } from "./src/components/DailyMissionCompletionController";
import { allBugArtIds, BugArtId } from "./src/services/bugArt";
import { CharacterId, CharacterUnlockContext } from "./src/services/characterService";
import { bugDexEntryName, LanguageProvider, rarityLabel, useI18n } from "./src/services/i18n";
import { listBugs } from "./src/services/bugService";
import { BugDexDropResult, BugDexDropSource, claimDailyLoginBug, entryByBugId, grantBugDexReward, hasBugDexRewardAvailable, listBugDexInventory, pickBugDexRewardEntry, pickQueuedBugDexRewardEntry, prepareDailyLoginBug, rollSpecificBugDexDrop, takePendingPointUnlockedBugDex } from "./src/services/bugDexService";
import { badgeDefinitions, getTierForPoints, userTiers, type BadgeDefinition, type BugDexEntry, type UserTier } from "./src/services/pointsService";
import { getFitnessSyncerStatus } from "./src/services/fitnessSyncerService";
import { claimAllMovementRadarRewards, claimMovementRadarBonusesForApp, requestHealthConnectPermissions, resolveMovementRadarBugIds, type MovementRadarRewardId } from "./src/services/movementRadarService";
import { canRegisterMovementSource, MovementSyncSource } from "./src/services/movementSyncSource";
import { movementRadarXpPerBug } from "./src/services/rewardBalanceService";
import { checkLatestVersion, VersionNotice } from "./src/services/versionService";
import { isStarterBoostActive } from "./src/services/starterBoostService";
import {
  defaultNotificationSettings,
  dismissPhoneNotification,
  dismissPresentedNotificationsForTarget,
  getNotificationSettings,
  markNotificationRead,
  notifyBugUpdate,
  notifyBugSmashDuelAccepted,
  notifyBugSmashDuelRequest,
  notifyComment,
  notifyNewBug,
  registerPhoneNotificationsForUser,
  saveNotificationSettings,
  showBugDexUnlockNotification,
  showMovementRewardNotification,
  showPhoneNotification,
  subscribeUserNotifications
} from "./src/services/notificationService";
import { subscribeIncomingBugSmashDuelActionCount } from "./src/services/bugSmashDuelService";
import { setRadarRequestCounts } from "./src/services/movementRadarService";
import { getOwnDuelSeasonClaim, previousDuelSeasonId } from "./src/services/duelSeasonService";
import { getReleaseBossStatus } from "./src/services/releaseBossService";
import { getSwarmSiegeStatus } from "./src/services/swarmSiegeService";
import { getTeamHuntStatus } from "./src/services/teamHuntService";
import { teamHuntWindow } from "./src/services/teamHuntSchedule";
import { installWebUiSounds } from "./src/services/soundService";
import { shouldPresentBugDexDropImmediately, shouldPresentPointDropAsForegroundCatch, shouldShowRewardSpin } from "./src/services/rewardPresentation";
import { subscribeIncomingTradeRequestCount } from "./src/services/tradeService";
import { encodeWebRouteSnapshot, readRecentWebRoute, webRouteLocalStorageKey } from "./src/services/webRouteRecovery";

export type RouteName = "home" | "bugs" | "new" | "detail" | "leaderboard" | "profile" | "userProfile" | "bugdex" | "museum" | "realBugScan" | "fieldJournal" | "teamHunt" | "swarmSiege" | "seasonFinale" | "settings" | "duel";

function routeScreenTone(route: RouteName): ScreenTone {
  if (route === "realBugScan" || route === "new") return "scan";
  if (route === "duel" || route === "leaderboard") return "play";
  if (route === "bugdex" || route === "museum" || route === "fieldJournal" || route === "bugs" || route === "detail") return "collection";
  if (route === "profile" || route === "userProfile" || route === "settings") return "profile";
  if (route === "teamHunt" || route === "swarmSiege" || route === "seasonFinale") return "event";
  return "world";
}

const helpTourVersion = "visual-help-v3";
const helpTourVersionKey = (uid: string) => `bugbaas:helpTour:${helpTourVersion}:${uid}`;
const changelogSeenKey = (uid: string, version: string) => `bugbaas:changelog:${version}:${uid}`;
const badgeUnlockSeenKey = (uid: string, badgeId: string) => `bugbaas:badgeUnlock:${uid}:${badgeId}`;
const duelSeasonPopupSeenKey = (uid: string, seasonId: string) => `bugbaas:duelSeasonReward:v2:${uid}:${seasonId}`;
const activeEventSeenKey = (uid: string, eventId: string) => `bugbaas:activeEvent:v1:${uid}:${eventId}`;
const startupEngagementSyncDelayMs = 4000;
const startupMovementCheckDelayMs = 2500;
const startupNotificationRegistrationDelayMs = 3500;
const startupVersionCheckDelayMs = 5000;
const activeEventCheckTimeoutMs = 4000;
const reportActionRewardSources = new Set<BugDexDropSource>(["bug_reported", "comment", "status_update", "bug_fixed", "upvote_given"]);
const webRouteSessionKey = "bugbaas:active-route:v3";
const routeNames = new Set<RouteName>(["home", "bugs", "new", "detail", "leaderboard", "profile", "userProfile", "bugdex", "museum", "realBugScan", "fieldJournal", "teamHunt", "swarmSiege", "seasonFinale", "settings", "duel"]);

function initialRoute(): RouteName {
  if (Platform.OS !== "web" || typeof window === "undefined") return "home";
  const normalizedPath = window.location.pathname.replace(/\/+$/, "");
  const search = new URLSearchParams(window.location.search);
  if (normalizedPath === "/real-bug-scan" || search.has("real-bug-scan")) return "realBugScan";
  try {
    const storedRoute = window.sessionStorage.getItem(webRouteSessionKey) as RouteName | null;
    if (storedRoute && routeNames.has(storedRoute)) return storedRoute;
  } catch {
    // Safari private mode can disable session storage.
  }
  try {
    return (readRecentWebRoute(window.localStorage.getItem(webRouteLocalStorageKey), routeNames) as RouteName | null) ?? "home";
  } catch {
    return "home";
  }
}

function routeDestination(route: RouteName): MainDestination | undefined {
  if (route === "home" || route === "bugs" || route === "new" || route === "detail" || route === "teamHunt" || route === "swarmSiege" || route === "seasonFinale") return "world";
  if (route === "realBugScan") return "scan";
  if (route === "duel" || route === "leaderboard" || route === "userProfile") return "play";
  if (route === "bugdex" || route === "museum" || route === "fieldJournal") return "collection";
  return undefined;
}

function destinationRoute(destination: MainDestination): RouteName {
  if (destination === "scan") return "realBugScan";
  if (destination === "play") return "duel";
  if (destination === "collection") return "bugdex";
  return "home";
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type PendingForegroundReward = {
  bugId: BugArtId;
  entry: BugDexEntry;
  id: string;
  preGrantPromise?: Promise<BugDexDropResult | null>;
  preparedDrop?: BugDexDropResult;
  preGrantedDrop?: BugDexDropResult;
  source: BugDexDropSource;
  starterBoostBonus?: boolean;
};

type RequestTabBadges = {
  duel: number;
  trade: number;
};

const emptyRequestTabBadges: RequestTabBadges = { duel: 0, trade: 0 };

function isRequestNotification(notification: AppNotification) {
  return notification.type === "trade" || notification.type === "duel";
}

type ChangelogFeature = {
  key: string;
  image: ImageSourcePropType;
  tone: "gold" | "green" | "purple";
};

const usefulChangelogByVersion: Record<string, ChangelogFeature[]> = {
  "2.10.17": [
    { key: "changelog.2.10.17.art", image: require("./assets/bugdex-webp/grote-wegslak.webp"), tone: "gold" },
    { key: "changelog.2.10.17.scan", image: require("./assets/bugdex-webp/lieveheersbeestje.webp"), tone: "green" },
    { key: "changelog.2.10.17.fitness", image: require("./assets/badges/kilometer-colony.png"), tone: "purple" }
  ],
  "2.10.11": [
    { key: "changelog.2.10.11.nest", image: require("./assets/bugdex-webp/houtmier.webp"), tone: "gold" },
    { key: "changelog.2.10.11.fitness", image: require("./assets/generated/bug-radar-request-signal-hd.webp"), tone: "green" },
    { key: "changelog.2.10.11.security", image: require("./assets/badges/kilometer-colony.png"), tone: "purple" }
  ],
  "2.10.10": [
    { key: "changelog.2.10.10.categories", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "green" },
    { key: "changelog.2.10.10.nest", image: require("./assets/bugdex-webp/houtmier.webp"), tone: "gold" },
    { key: "changelog.2.10.10.unlocks", image: require("./assets/badges/badge-overview.webp"), tone: "purple" }
  ],
  "2.10.9": [
    { key: "changelog.2.10.9.glide", image: require("./assets/bugdex-webp/honingbij.webp"), tone: "gold" },
    { key: "changelog.2.10.9.tower", image: require("./assets/minigames/bug-tower/bug-tower-background.jpg"), tone: "purple" },
    { key: "changelog.2.10.9.bubbles", image: require("./assets/minigames/bubble-swarm/bubble-swarm-background.jpg"), tone: "green" }
  ],
  "2.10.8": [
    { key: "changelog.2.10.8.tower", image: require("./assets/minigames/bug-tower/bug-tower-background.jpg"), tone: "purple" },
    { key: "changelog.2.10.8.bubbles", image: require("./assets/minigames/bubble-swarm/bubble-swarm-background.jpg"), tone: "green" },
    { key: "changelog.2.10.8.practice", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "gold" }
  ],
  "2.2.5": [
    { key: "changelog.2.2.5.arena", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.2.5.widget", image: require("./assets/generated/bug-radar-request-signal-hd.webp"), tone: "green" },
    { key: "changelog.2.2.5.fullscreen", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "gold" }
  ],
  "2.2.4": [
    { key: "changelog.2.2.4.jars", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.2.4.duelStart", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.2.4.weekly", image: require("./assets/generated/bug-radar-request-signal-hd.webp"), tone: "gold" }
  ],
  "2.2.3": [
    { key: "changelog.2.2.3.bosses", image: require("./assets/generated/solo-boss-atlas-hd.webp"), tone: "purple" },
    { key: "changelog.2.2.3.rewards", image: require("./assets/generated/solo-boss-stag-hd.webp"), tone: "gold" },
    { key: "changelog.2.2.3.widget", image: require("./assets/generated/bug-radar-request-signal-hd.webp"), tone: "green" }
  ],
  "2.2.2": [
    { key: "changelog.2.2.2.jars", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.2.2.targets", image: require("./assets/generated/solo-duel-campaign-hd.jpg"), tone: "purple" },
    { key: "changelog.2.2.2.size", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "gold" }
  ],
  "2.2.1": [
    { key: "changelog.2.2.1.powerups", image: require("./assets/generated/solo-powerups-hd.jpg"), tone: "gold" },
    { key: "changelog.2.2.1.modes", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.2.1.jars", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" }
  ],
  "2.2.0": [
    { key: "changelog.2.2.0.soloCampaign", image: require("./assets/generated/release-2.2.0-solo-campaign-hd.jpg"), tone: "purple" },
    { key: "changelog.2.2.0.balance", image: require("./assets/generated/solo-duel-campaign-hd.jpg"), tone: "green" },
    { key: "changelog.2.2.0.home", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "gold" }
  ],
  "2.1.6": [
    { key: "changelog.2.1.6.duelNotify", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.6.helpers", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.1.6.settings", image: require("./assets/generated/settings-gear-hd.png"), tone: "gold" }
  ],
  "2.1.4": [
    { key: "changelog.2.1.4.install", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "green" },
    { key: "changelog.2.1.4.duel", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.4.clean", image: require("./assets/generated/bug-swatter-hd.png"), tone: "gold" }
  ],
  "2.1.3": [
    { key: "changelog.2.1.3.clean", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "green" },
    { key: "changelog.2.1.3.duel", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.3.install", image: require("./assets/generated/bug-swatter-hd.png"), tone: "gold" }
  ],
  "2.1.2": [
    { key: "changelog.2.1.2.duel", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.2.xp", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "gold" },
    { key: "changelog.2.1.2.android", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "green" }
  ],
  "2.1.1": [
    { key: "changelog.2.1.1.balance", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.1.hitbox", image: require("./assets/generated/bug-swatter-hd.png"), tone: "gold" },
    { key: "changelog.2.1.1.safety", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "green" }
  ],
  "2.1.0": [
    { key: "changelog.2.1.0.duel", image: require("./assets/generated/bug-smash-duel-concept.jpg"), tone: "purple" },
    { key: "changelog.2.1.0.swatter", image: require("./assets/generated/bug-swatter-hd.png"), tone: "gold" },
    { key: "changelog.2.1.0.bonus", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" }
  ],
  "2.0.6": [
    { key: "changelog.2.0.6.movement", image: require("./assets/generated/release-2.0.6-hero.jpg"), tone: "green" },
    { key: "changelog.2.0.6.trade", image: require("./assets/generated/bugdex-workshop-shortcut.webp"), tone: "gold" },
    { key: "changelog.2.0.6.expo", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "purple" }
  ],
  "2.0.5": [
    { key: "changelog.2.0.5.profileButtons", image: require("./assets/characters/character-rookie-bug-catcher.png"), tone: "green" },
    { key: "changelog.2.0.5.bugdexCollection", image: require("./assets/generated/bugdex-collection-view-hd.jpg"), tone: "gold" },
    { key: "changelog.2.0.5.radarClaim", image: require("./assets/bugdex-webp/schaatsenrijder.webp"), tone: "purple" },
    { key: "changelog.2.0.5.profileReward", image: require("./assets/generated/active-bug-squad-selection-hd.jpg"), tone: "green" }
  ],
  "2.0.3": [
    { key: "changelog.2.0.3.bugdex", image: require("./assets/bugdex-webp/atlaskever.webp"), tone: "purple" },
    { key: "changelog.2.0.3.squad", image: require("./assets/generated/active-bug-squad-selection-hd.jpg"), tone: "green" },
    { key: "changelog.2.0.3.radar", image: require("./assets/bugdex-webp/schaatsenrijder.webp"), tone: "gold" }
  ],
  "2.0.2": [
    { key: "changelog.2.0.1.movement", image: require("./assets/bugdex-webp/schaatsenrijder.webp"), tone: "green" },
    { key: "changelog.2.0.1.bugdex", image: require("./assets/bugdex-webp/koningin-alexandravlinder.webp"), tone: "purple" },
    { key: "changelog.2.0.1.badges", image: require("./assets/badges/badge-overview.webp"), tone: "gold" },
    { key: "changelog.2.0.1.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" },
    { key: "changelog.2.0.1.squad", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.1.apk", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "purple" }
  ],
  "2.0.1": [
    { key: "changelog.2.0.1.movement", image: require("./assets/bugdex-webp/schaatsenrijder.webp"), tone: "green" },
    { key: "changelog.2.0.1.bugdex", image: require("./assets/bugdex-webp/koningin-alexandravlinder.webp"), tone: "purple" },
    { key: "changelog.2.0.1.badges", image: require("./assets/badges/badge-overview.webp"), tone: "gold" },
    { key: "changelog.2.0.1.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" },
    { key: "changelog.2.0.1.squad", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.1.apk", image: require("./assets/generated/bugbaas-splash-badge-hd.webp"), tone: "purple" }
  ],
  "2.0.0": [
    { key: "changelog.2.0.0.badges", image: require("./assets/badges/badge-overview.webp"), tone: "gold" },
    { key: "changelog.2.0.0.squad", image: require("./assets/generated/bug-squad-empty-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.0.rank", image: require("./assets/bugdex-webp/atlaskever.webp"), tone: "purple" }
  ],
  "1.5.9": [
    { key: "changelog.1.5.9.badges", image: require("./assets/bugdex-webp/lieveheersbeestje.webp"), tone: "gold" },
    { key: "changelog.1.5.9.movement", image: require("./assets/bugdex-webp/schaatsenrijder.webp"), tone: "green" },
    { key: "changelog.1.5.9.rare", image: require("./assets/bugdex-webp/koningin-alexandravlinder.webp"), tone: "purple" },
    { key: "changelog.1.5.9.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" }
  ],
  "1.5.8": [
    { key: "changelog.1.5.8.help", image: require("./assets/characters/bugcatcher-classic.png"), tone: "green" },
    { key: "changelog.1.5.8.mythic", image: require("./assets/bugdex-webp/koningin-alexandravlinder.webp"), tone: "purple" },
    { key: "changelog.1.5.8.rewards", image: require("./assets/bugdex-webp/pissebed.webp"), tone: "gold" }
  ],
  "1.5.7": [
    { key: "changelog.1.5.7.help", image: require("./assets/characters/bugcatcher-classic.png"), tone: "green" },
    { key: "changelog.1.5.7.mythic", image: require("./assets/bugdex-webp/koningin-alexandravlinder.webp"), tone: "purple" },
    { key: "changelog.1.5.7.rewards", image: require("./assets/bugdex-webp/pissebed.webp"), tone: "gold" }
  ]
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { language, t } = useI18n();
  const responsiveLayout = useResponsiveLayout();
  const responsiveShellStyle = Platform.OS === "web" ? { maxWidth: responsiveLayout.shellMaxWidth } : undefined;
  const [route, setRoute] = useState<RouteName>(initialRoute);
  const [appNavigation, setAppNavigation] = useState(initialAppNavigationState);
  const [fieldJournalBackRoute, setFieldJournalBackRoute] = useState<RouteName>("realBugScan");
  const [user, setUser] = useState<User | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [duelOpponent, setDuelOpponent] = useState<User | null>(null);
  const [openDuelId, setOpenDuelId] = useState("");
  const [bugDexDrop, setBugDexDrop] = useState<BugDexDropResult | null>(null);
  const [rewardSpinDrop, setRewardSpinDrop] = useState<BugDexDropResult | null>(null);
  const [rewardSpinQueue, setRewardSpinQueue] = useState<BugDexDropResult[]>([]);
  const [bugDexClaiming, setBugDexClaiming] = useState(false);
  const [rankUpTier, setRankUpTier] = useState<UserTier | null>(null);
  const [badgeUnlock, setBadgeUnlock] = useState<BadgeDefinition | null>(null);
  const [bugDexDropQueue, setBugDexDropQueue] = useState<BugDexDropResult[]>([]);
  const [badgeUnlockQueue, setBadgeUnlockQueue] = useState<BadgeDefinition[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [requestTabBadges, setRequestTabBadges] = useState<RequestTabBadges>(emptyRequestTabBadges);
  const [openBugDexTradeRequest, setOpenBugDexTradeRequest] = useState(0);
  const [helpVisible, setHelpVisible] = useState(false);
  const [helpGateChecked, setHelpGateChecked] = useState(false);
  const [changelogVersion, setChangelogVersion] = useState("");
  const [splatBonusVisible, setSplatBonusVisible] = useState(false);
  const [versionNotice, setVersionNotice] = useState<VersionNotice | null>(null);
  const [activeEventAnnouncement, setActiveEventAnnouncement] = useState<ActiveEventAnnouncement | null>(null);
  const [activeEventQueue, setActiveEventQueue] = useState<ActiveEventAnnouncement[]>([]);
  const [activeEventCheckComplete, setActiveEventCheckComplete] = useState(false);
  const [pendingForegroundRewards, setPendingForegroundRewards] = useState<PendingForegroundReward[]>([]);
  const [duelFullscreen, setDuelFullscreen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [walkingBugsReady, setWalkingBugsReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const movementCheckInProgress = useRef<Promise<void> | null>(null);
  const radarClaimRequested = useRef(false);
  const versionCheckInProgress = useRef(false);
  const activeForegroundRewardRef = useRef<PendingForegroundReward | null>(null);
  const pendingForegroundRewardsRef = useRef<PendingForegroundReward[]>([]);
  const userRef = useRef<User | null>(null);
  const previousRankRef = useRef<{ uid: string; minPoints: number } | null>(null);
  const queuedRankBugDexRewardsRef = useRef(new Set<string>());
  const previousBadgesRef = useRef<{ badges: string[]; uid: string } | null>(null);
  const queuedBadgeIdsRef = useRef(new Set<string>());
  const engagementSyncInProgress = useRef(new Set<string>());
  const notificationSettingsRef = useRef<NotificationSettings>(defaultNotificationSettings);
  const handledNotificationResponses = useRef(new Set<string>());
  const dailyLoginClaimedForUsers = useRef(new Set<string>());
  const reportActionRewardQueuedDay = useRef("");
  const activeEventCheckInProgress = useRef("");

  useEffect(() => installWebUiSounds(), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(webRouteSessionKey, route);
    } catch {
      // Safari private mode can disable session storage.
    }
    try {
      window.localStorage.setItem(webRouteLocalStorageKey, encodeWebRouteSnapshot(route));
    } catch {
      // Safari private mode can also disable local storage.
    }
  }, [route]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (appNavigation.overlay) {
        setAppNavigation((current) => closeOverlay(current));
        return true;
      }
      const backRoute = parentRouteForHardwareBack(route, fieldJournalBackRoute);
      if (backRoute !== null) setRoute(backRoute);
      return backRoute !== null;
    });
    return () => subscription.remove();
  }, [appNavigation.overlay, fieldJournalBackRoute, route]);

  const foregroundUiClear = Boolean(
    user
    && user.nameSet === true
    && !appNavigation.overlay
    && !badgeUnlock
    && !bugDexDrop
    && !rankUpTier
    && !notification
    && !helpVisible
    && !changelogVersion
    && !splatBonusVisible
    && !versionNotice
    && !activeEventAnnouncement
    && activeEventCheckComplete
  );
  const foregroundRewardPending = pendingForegroundRewards.length > 0;
  const foregroundBugEnabled = foregroundUiClear;
  const forcedForegroundRewardEnabled = foregroundUiClear && foregroundRewardPending;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const previous = [html, body, root].filter(Boolean).map((element) => ({
      element: element as HTMLElement,
      height: (element as HTMLElement).style.height,
      minHeight: (element as HTMLElement).style.minHeight,
      overflow: (element as HTMLElement).style.overflow,
      overscrollBehavior: (element as HTMLElement).style.overscrollBehavior,
      width: (element as HTMLElement).style.width
    }));
    [html, body, root].filter(Boolean).forEach((element) => {
      const target = element as HTMLElement;
      target.style.height = "100%";
      target.style.minHeight = "100%";
      target.style.width = "100%";
      target.style.overflow = "hidden";
      target.style.overscrollBehavior = "none";
    });
    const keepViewportPinned = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", keepViewportPinned, { passive: true });
    keepViewportPinned();
    return () => {
      window.removeEventListener("scroll", keepViewportPinned);
      previous.forEach(({ element, height, minHeight, overflow, overscrollBehavior, width }) => {
        element.style.height = height;
        element.style.minHeight = minHeight;
        element.style.width = width;
        element.style.overflow = overflow;
        element.style.overscrollBehavior = overscrollBehavior;
      });
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !duelFullscreen) return;
    const targets = [document.documentElement, document.body, document.getElementById("root")].filter(Boolean) as HTMLElement[];
    const previous = targets.map((element) => ({
      element,
      touchCallout: element.style.getPropertyValue("-webkit-touch-callout"),
      userSelect: element.style.userSelect
    }));
    const preventGameMenu = (event: Event) => event.preventDefault();
    targets.forEach((element) => {
      element.style.userSelect = "none";
      element.style.setProperty("-webkit-touch-callout", "none");
    });
    document.addEventListener("contextmenu", preventGameMenu, true);
    document.addEventListener("selectstart", preventGameMenu, true);
    return () => {
      document.removeEventListener("contextmenu", preventGameMenu, true);
      document.removeEventListener("selectstart", preventGameMenu, true);
      previous.forEach(({ element, touchCallout, userSelect }) => {
        element.style.userSelect = userSelect;
        if (touchCallout) element.style.setProperty("-webkit-touch-callout", touchCallout);
        else element.style.removeProperty("-webkit-touch-callout");
      });
    };
  }, [duelFullscreen]);

  function recordUserActivity(currentUser: User, force = false) {
    void touchUserActivity(currentUser, force)
      .then((lastActiveAt) => {
        if (!lastActiveAt) return;
        setUser((existing) => existing?.uid === currentUser.uid ? { ...existing, lastActiveAt } : existing);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!radarClaimRequested.current || user?.nameSet !== true) return;
    void claimRequestedRadarStack();
  }, [user?.nameSet, user?.uid]);

  useEffect(() => {
    setWalkingBugsReady(false);
    if (!user) return;
    const timer = setTimeout(() => setWalkingBugsReady(true), 2500);
    return () => clearTimeout(timer);
  }, [user?.uid]);

  useEffect(() => {
    pendingForegroundRewardsRef.current = pendingForegroundRewards;
  }, [pendingForegroundRewards]);

  useEffect(() => {
    if (!user?.uid) return;
    takePendingPointUnlockedBugDex(user.uid).forEach(showBugDexDrop);
  }, [user?.bugDexCount, user?.totalPoints, user?.uid]);

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;
    const seasonUser: User = currentUser;
    const uid = currentUser.uid;
    const seasonId = previousDuelSeasonId();
    let active = true;
    async function checkDuelSeasonPopup() {
      const seenKey = duelSeasonPopupSeenKey(uid, seasonId);
      const seen = await AsyncStorage.getItem(seenKey);
      if (seen || !active) return;
      const claim = await getOwnDuelSeasonClaim(uid, seasonId).catch(() => null);
      if (!claim || !active) return;
      const inventory = await listBugDexInventory(seasonUser, { force: true });
      if (!active) return;
      const newBugIds = new Set(claim.newBugIds ?? []);
      const drops = claim.bugIds.flatMap((bugId) => {
        const entry = entryByBugId(bugId);
        const item = inventory.find((candidate) => candidate.bugId === bugId);
        if (!entry || !item) return [];
        const isNew = newBugIds.has(bugId) || (claim.newBugIds === undefined && item.count === 1);
        newBugIds.delete(bugId);
        return [{
          entry,
          isNew,
          item,
          rewardType: "bug" as const,
          source: "duel_season" as const,
          sourceDetail: language === "en"
            ? `RANKED DUEL SEASON · PLACE #${claim.rank}`
            : language === "fr"
              ? `SAISON DE DUELS CLASSÉS · PLACE #${claim.rank}`
              : `RANKED DUEL-SEIZOEN · PLEK #${claim.rank}`
        }];
      });
      if (!drops.length) return;
      await AsyncStorage.setItem(seenKey, "1");
      drops.forEach(showBugDexDrop);
    }
    void checkDuelSeasonPopup();
    return () => { active = false; };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      previousRankRef.current = null;
      setRankUpTier(null);
      return;
    }
    const currentTier = getTierForPoints(user.totalPoints);
    const previous = previousRankRef.current;
    if (previous?.uid === user.uid && currentTier.minPoints > previous.minPoints) {
      setRankUpTier(currentTier);
      const tierIndex = userTiers.findIndex((tier) => tier.minPoints === currentTier.minPoints);
      const rewardKey = `${user.uid}:${currentTier.minPoints}`;
      if (tierIndex >= 3 && !queuedRankBugDexRewardsRef.current.has(rewardKey)) {
        queuedRankBugDexRewardsRef.current.add(rewardKey);
        void grantBugDexReward(user, "rank_up").then(showBugDexDrop).catch(() => undefined);
      }
    }
    previousRankRef.current = { uid: user.uid, minPoints: currentTier.minPoints };
  }, [user?.totalPoints, user?.uid]);

  const badgeNamesKey = (user?.badges ?? []).join("|");

  function badgeDefinitionsForNames(badgeNames: string[]): BadgeDefinition[] {
    return badgeNames
      .map((badgeName) => badgeDefinitions.find((definition) => definition.name === badgeName))
      .filter((definition): definition is BadgeDefinition => Boolean(definition));
  }

  function queueBadgeUnlocks(badges: BadgeDefinition[]) {
    if (!badges.length) return;
    setBadgeUnlockQueue((queue) => {
      const knownIds = new Set(queuedBadgeIdsRef.current);
      if (badgeUnlock) knownIds.add(badgeUnlock.id);
      const additions = badges.filter((badge) => !knownIds.has(badge.id));
      additions.forEach((badge) => queuedBadgeIdsRef.current.add(badge.id));
      return additions.length ? [...queue, ...additions] : queue;
    });
  }

  async function queueUnseenBadgeUnlocks(badges: BadgeDefinition[]) {
    if (!userRef.current || !badges.length) return;
    const uid = userRef.current.uid;
    const pairs = await AsyncStorage.multiGet(badges.map((badge) => badgeUnlockSeenKey(uid, badge.id)));
    const seenKeys = new Set(pairs.filter(([, value]) => Boolean(value)).map(([key]) => key));
    queueBadgeUnlocks(badges.filter((badge) => !seenKeys.has(badgeUnlockSeenKey(uid, badge.id))));
  }

  useEffect(() => {
    if (!user) {
      previousBadgesRef.current = null;
      queuedBadgeIdsRef.current.clear();
      setBadgeUnlock(null);
      setBadgeUnlockQueue([]);
      return;
    }

    const currentBadges = user.badges ?? [];
    const previous = previousBadgesRef.current;
    if (previous?.uid === user.uid) {
      const previousBadges = new Set(previous.badges);
      const newBadges = badgeDefinitionsForNames(currentBadges.filter((badgeName) => !previousBadges.has(badgeName)));
      void queueUnseenBadgeUnlocks(newBadges).catch(() => undefined);
    } else {
      queuedBadgeIdsRef.current.clear();
      setBadgeUnlock(null);
      setBadgeUnlockQueue([]);
    }
    previousBadgesRef.current = { badges: currentBadges, uid: user.uid };
  }, [badgeNamesKey, badgeUnlock, user?.uid]);

  useEffect(() => {
    if (badgeUnlock || rankUpTier || bugDexDrop || notification || helpVisible || changelogVersion || splatBonusVisible || versionNotice) return;
    const [nextBadge, ...remaining] = badgeUnlockQueue;
    if (!nextBadge) return;
    setBadgeUnlock(nextBadge);
    setBadgeUnlockQueue(remaining);
  }, [badgeUnlock, badgeUnlockQueue, bugDexDrop, changelogVersion, helpVisible, notification, rankUpTier, splatBonusVisible, versionNotice]);

  useEffect(() => {
    if (
      bugDexDrop
      || activeForegroundRewardRef.current
      || pendingForegroundRewards.length > 0
      || badgeUnlock
      || rankUpTier
      || notification
      || helpVisible
      || changelogVersion
      || splatBonusVisible
      || versionNotice
    ) return;
    const [nextDrop, ...remaining] = bugDexDropQueue;
    if (!nextDrop) return;
    setBugDexDrop(nextDrop);
    setBugDexDropQueue(remaining);
  }, [badgeUnlock, bugDexDrop, bugDexDropQueue, changelogVersion, helpVisible, notification, pendingForegroundRewards.length, rankUpTier, splatBonusVisible, versionNotice]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    let settled = false;
    const authTimeout = setTimeout(() => {
      if (settled) return;
      setAuthError("Authenticatie duurt langer dan verwacht. Je kunt opnieuw inloggen.");
      setAuthLoading(false);
    }, 8000);
    const unsubscribe = subscribeAuth(async (nextUser) => {
      try {
        if (nextUser) {
          const appUser = await ensureUserDocument(nextUser);
          setUser(appUser);
          scheduleEngagementSync(appUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Authenticatie laden mislukt.");
        setUser(null);
      } finally {
        settled = true;
        clearTimeout(authTimeout);
        setAuthLoading(false);
      }
    });
    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void checkForVersionUpdate(), startupVersionCheckDelayMs);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const openAppUrl = (url: string | null) => {
      const fitnessSyncerResult = fitnessSyncerResultFromUrl(url);
      if (fitnessSyncerResult) {
        setSelectedBug(null);
        setSelectedUser(null);
        setRoute("settings");
        if (Platform.OS === "web" && typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const claimRadarStack = radarStackClaimFromUrl(url);
      const bugId = radarBugIdFromUrl(url);
      if (!claimRadarStack && !bugId) return;
      setSelectedBug(null);
      setSelectedUser(null);
      setRoute("home");
      if (claimRadarStack) {
        radarClaimRequested.current = true;
        void claimRequestedRadarStack();
        return;
      }
      if (!bugId) return;
      const entry = entryByBugId(bugId);
      if (!entry) return;
      queueForegroundReward({
        bugId,
        entry,
        id: `deeplink-${bugId}-${Date.now()}-${Math.random()}`,
        source: "movement_radar"
      });
    };

    void Linking.getInitialURL().then(openAppUrl).catch(() => undefined);
    const subscription = Linking.addEventListener("url", (event) => openAppUrl(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;
      if (nextState === "active") {
        const currentUser = userRef.current;
        if (currentUser) {
          recordUserActivity(currentUser);
          void checkActiveEventAnnouncements(currentUser);
        }
        void checkMovementRadarBonuses();
        void checkForVersionUpdate();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user) return () => undefined;
    recordUserActivity(user, true);
    const interval = setInterval(() => {
      if (appState.current === "active") recordUserActivity(user);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || user.nameSet !== true) return;
    const startupTimer = setTimeout(() => void checkMovementRadarBonuses(), startupMovementCheckDelayMs);
    const interval = setInterval(() => void checkMovementRadarBonuses(), 15 * 60 * 1000);
    return () => {
      clearTimeout(startupTimer);
      clearInterval(interval);
    };
  }, [user?.uid, user?.nameSet]);

  useEffect(() => {
    if (!user) return;
    void getNotificationSettings(user).then(setNotificationSettings);
    const timer = setTimeout(() => {
      void registerPhoneNotificationsForUser(user).then((updated) => {
        if (updated) setUser(updated);
      }).catch(() => undefined);
    }, startupNotificationRegistrationDelayMs);
    return () => clearTimeout(timer);
  }, [user?.uid]);

  useEffect(() => {
    setHelpGateChecked(false);
    if (!user || user.nameSet !== true) return;
    let active = true;
    void AsyncStorage.getItem(helpTourVersionKey(user.uid)).then((seenVersion) => {
      if (!active) return;
      if (user.helpSeen === false || !seenVersion) setHelpVisible(true);
      setHelpGateChecked(true);
    }).catch(() => {
      if (active && user.helpSeen === false) setHelpVisible(true);
      if (active) setHelpGateChecked(true);
    });
    return () => {
      active = false;
    };
  }, [user?.helpSeen, user?.nameSet, user?.uid]);

  useEffect(() => {
    setActiveEventAnnouncement(null);
    setActiveEventQueue([]);
    setActiveEventCheckComplete(false);
    if (!user || user.nameSet !== true) {
      setActiveEventCheckComplete(true);
      return;
    }
    void checkActiveEventAnnouncements(user);
  }, [user?.nameSet, user?.uid]);

  useEffect(() => {
    if (!user || user.nameSet !== true || !helpGateChecked || helpVisible || !activeEventCheckComplete || activeEventAnnouncement || activeEventQueue.length > 0 || badgeUnlock || bugDexDrop || notification || splatBonusVisible || versionNotice) return;
    const currentVersion = currentAppVersion();
    const changelogItems = usefulChangelogByVersion[currentVersion];
    if (!currentVersion || !changelogItems?.length) return;
    let active = true;
    void AsyncStorage.getItem(changelogSeenKey(user.uid, currentVersion)).then((seen) => {
      if (!active || seen) return;
      setChangelogVersion(currentVersion);
      void AsyncStorage.setItem(changelogSeenKey(user.uid, currentVersion), "true").catch(() => undefined);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [activeEventAnnouncement, activeEventCheckComplete, activeEventQueue.length, badgeUnlock, bugDexDrop, helpGateChecked, helpVisible, notification, splatBonusVisible, user?.nameSet, user?.uid, versionNotice]);

  useEffect(() => {
    if (!user || user.nameSet !== true || !helpGateChecked || helpVisible || !activeEventCheckComplete || activeEventAnnouncement || activeEventQueue.length > 0 || changelogVersion || badgeUnlock || bugDexDrop || notification || splatBonusVisible || versionNotice) return;
    if (dailyLoginClaimedForUsers.current.has(user.uid)) return;
    dailyLoginClaimedForUsers.current.add(user.uid);
    void prepareDailyLoginBug(user).then((drop) => {
      if (drop) showBugDexDrop(drop);
    }).catch(() => {
      dailyLoginClaimedForUsers.current.delete(user.uid);
    });
  }, [activeEventAnnouncement, activeEventCheckComplete, activeEventQueue.length, badgeUnlock, bugDexDrop, changelogVersion, helpGateChecked, helpVisible, notification, splatBonusVisible, user?.nameSet, user?.uid, versionNotice]);

  useEffect(() => {
    if (!user) return () => undefined;
    return subscribeUserNotifications(user, notificationSettings, (nextNotification) => {
      if (appState.current === "active") {
        if (!isRequestNotification(nextNotification)) setNotification(nextNotification);
        if (nextNotification.type === "trade" || nextNotification.type === "comment" || nextNotification.type === "duel") void showPhoneNotification(nextNotification).catch(() => undefined);
        return;
      }
      void showPhoneNotification(nextNotification).catch(() => undefined);
    });
  }, [notificationSettings, user]);

  useEffect(() => {
    if (!user) {
      setRequestTabBadges(emptyRequestTabBadges);
      void setRadarRequestCounts(0, 0).catch(() => undefined);
      return () => undefined;
    }
    let tradeCount = 0;
    let duelCount = 0;
    const publishCounts = () => {
      setRequestTabBadges({ trade: tradeCount, duel: duelCount });
      void setRadarRequestCounts(tradeCount, duelCount).catch(() => undefined);
    };
    const unsubscribeTrades = subscribeIncomingTradeRequestCount(user, (count) => {
      tradeCount = count;
      publishCounts();
    });
    const unsubscribeDuels = subscribeIncomingBugSmashDuelActionCount(user, (count) => {
      duelCount = count;
      publishCounts();
    });
    return () => {
      unsubscribeTrades();
      unsubscribeDuels();
    };
  }, [user]);

  useEffect(() => {
    if (Platform.OS === "web") return () => undefined;
    let active = true;
    let subscription: { remove: () => void } | null = null;

    function handleResponse(response: NotificationResponse) {
      const request = response.notification.request;
      const contentData = request.content.data as { bugId?: string; duelId?: string; notificationId?: string; type?: string };
      const responseKey = `${request.identifier}:${response.actionIdentifier}`;
      if (handledNotificationResponses.current.has(responseKey)) return;
      handledNotificationResponses.current.add(responseKey);
      void dismissPhoneNotification(request.identifier);
      void openNotificationTarget(contentData.type, contentData.bugId, contentData.notificationId, contentData.duelId);
    }

    void (async () => {
      const Notifications = await import("expo-notifications");
      if (!active) return;
      subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
      const response = await Notifications.getLastNotificationResponseAsync();
      if (active && response) handleResponse(response);
    })().catch(() => undefined);

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  async function handleLogin(email: string, password: string, createAccount: boolean, displayName?: string) {
    setAuthError("");
    try {
      const appUser = createAccount ? await register(email, password, displayName) : await login(email, password);
      setUser(appUser);
      scheduleEngagementSync(appUser);
      setRoute("home");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Inloggen mislukt.");
    }
  }

  async function handleGoogleLogin(idToken?: string, accessToken?: string) {
    setAuthError("");
    try {
      const appUser = await loginWithGoogle(idToken, accessToken);
      setUser(appUser);
      scheduleEngagementSync(appUser);
      setRoute("home");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google-login mislukt.");
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setSelectedBug(null);
    setSelectedUser(null);
    setDuelOpponent(null);
    setOpenDuelId("");
    setRoute("home");
  }

  async function handleDisplayNameSave(displayName: string) {
    if (!user) return;
    setUser(await updateUserDisplayName(user, displayName));
  }

  async function handleCharacterSave(characterId: CharacterId, context?: CharacterUnlockContext) {
    if (!user) return;
    setUser(await updateUserCharacter(user, characterId, context));
  }

  async function handleCreateOrganization(organizationName: string) {
    if (!user) return;
    setUser(await createOrganizationForUser(user, organizationName));
  }

  async function finishHelpTour() {
    setHelpVisible(false);
    if (!user) return;
    void AsyncStorage.setItem(helpTourVersionKey(user.uid), "true").catch(() => undefined);
    if (user.helpSeen === true) return;
    try {
      setUser(await markHelpSeen(user));
    } catch {
      setUser({ ...user, helpSeen: true });
    }
  }

  function closeChangelog() {
    const currentVersion = changelogVersion;
    setChangelogVersion("");
    if (user && currentVersion) {
      void AsyncStorage.setItem(changelogSeenKey(user.uid, currentVersion), "true").catch(() => undefined);
    }
  }

  function closeBadgeUnlock() {
    const currentBadge = badgeUnlock;
    setBadgeUnlock(null);
    if (user && currentBadge) {
      void AsyncStorage.setItem(badgeUnlockSeenKey(user.uid, currentBadge.id), "true").catch(() => undefined);
    }
  }

  async function checkActiveEventAnnouncements(appUser: User) {
    if (activeEventCheckInProgress.current === appUser.uid) return;
    activeEventCheckInProgress.current = appUser.uid;
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const [swarmStatus, teamStatus, releaseStatus] = await Promise.race([
        Promise.all([
          getSwarmSiegeStatus(appUser).catch(() => null),
          getTeamHuntStatus(appUser).catch(() => null),
          getReleaseBossStatus(appUser).catch(() => null)
        ]),
        new Promise<[null, null, null]>((resolve) => {
          timeout = setTimeout(() => resolve([null, null, null]), activeEventCheckTimeoutMs);
        })
      ]);
      if (timeout) clearTimeout(timeout);
      if (userRef.current?.uid !== appUser.uid) return;
      const announcements: ActiveEventAnnouncement[] = [];
      if (swarmStatus?.active && swarmStatus.eventId) announcements.push({ eventId: swarmStatus.eventId, kind: "swarmSiege" });
      if (teamStatus?.active) announcements.push({ eventId: teamStatus.eventId || teamHuntWindow()?.id || `team-hunt-${localDayId()}`, kind: "teamHunt" });
      if (releaseStatus?.state === "finale" && releaseStatus.seasonId) announcements.push({ eventId: `release-finale-${releaseStatus.seasonId}`, kind: "releaseBoss" });
      const seen = await AsyncStorage.multiGet(announcements.map((announcement) => activeEventSeenKey(appUser.uid, announcement.eventId)));
      if (userRef.current?.uid !== appUser.uid) return;
      const unseen = announcements.filter((_, index) => !seen[index]?.[1]);
      const [next, ...queue] = unseen;
      setActiveEventAnnouncement(next ?? null);
      setActiveEventQueue(queue);
    } finally {
      if (userRef.current?.uid === appUser.uid) setActiveEventCheckComplete(true);
      if (activeEventCheckInProgress.current === appUser.uid) activeEventCheckInProgress.current = "";
    }
  }

  function finishActiveEventAnnouncement(openEvent: boolean) {
    const announcement = activeEventAnnouncement;
    if (!announcement || !user) return;
    void AsyncStorage.setItem(activeEventSeenKey(user.uid, announcement.eventId), "1").catch(() => undefined);
    if (openEvent) {
      setActiveEventAnnouncement(null);
      setActiveEventQueue([]);
      setRoute(announcement.kind === "swarmSiege" ? "swarmSiege" : announcement.kind === "teamHunt" ? "teamHunt" : "seasonFinale");
      return;
    }
    const [next, ...remaining] = activeEventQueue;
    setActiveEventAnnouncement(null);
    setActiveEventQueue(remaining);
    if (next) setTimeout(() => setActiveEventAnnouncement(next), 0);
  }

  async function refreshUser() {
    if (!user) return;
    const synced = await syncEngagementPoints(user);
    const updated = await getUserById(synced.uid);
    if (updated) setUser(updated);
  }

  function scheduleEngagementSync(appUser: User) {
    if (engagementSyncInProgress.current.has(appUser.uid)) return;
    engagementSyncInProgress.current.add(appUser.uid);
    setTimeout(() => {
      void syncEngagementPoints(appUser).then((updated) => {
        if (userRef.current?.uid === updated.uid) setUser(updated);
      }).catch(() => undefined).finally(() => {
        engagementSyncInProgress.current.delete(appUser.uid);
      });
    }, startupEngagementSyncDelayMs);
  }

  async function maybeShowBugDexDrop(dropPromise: Promise<BugDexDropResult | null>) {
    try {
      const drop = await dropPromise;
      if (drop?.updatedUser) setUser(drop.updatedUser);
      if (drop) showBugDexDrop(drop);
    } catch {
      // BugDex rewards should never block core app actions.
    }
  }

  function showBugDexDrop(drop: BugDexDropResult) {
    if (drop.rewardType === "bug" && shouldPresentBugDexDropImmediately(drop.source)) {
      presentBugDexDrop(drop, true);
      return;
    }
    if (drop.rewardType === "bug") {
      queueForegroundReward({
        bugId: drop.entry.id as BugArtId,
        entry: drop.entry,
        id: `drop-${drop.source}-${drop.entry.id}-${Date.now()}-${Math.random()}`,
        preparedDrop: drop.source === "daily_login" ? drop : undefined,
        preGrantedDrop: drop.source === "daily_login" ? undefined : drop,
        source: drop.source
      });
      return;
    }
    if (shouldPresentPointDropAsForegroundCatch(drop.source)) {
      const currentUser = drop.updatedUser ?? userRef.current;
      if (currentUser) {
        const entry = pickBugDexRewardEntry(currentUser, drop.source);
        queueForegroundReward({
          bugId: entry.id as BugArtId,
          entry,
          id: `daily-foreground-${entry.id}-${Date.now()}-${Math.random()}`,
          preGrantedDrop: drop,
          source: drop.source
        });
        return;
      }
    }
    presentBugDexDrop(drop);
  }

  function presentBugDexDrop(drop: BugDexDropResult, forceImmediate = false, skipSpin = false) {
    if (!skipSpin && drop.rewardType === "bug" && shouldShowRewardSpin(drop.source)) {
      setRewardSpinDrop((current) => {
        if (current) {
          setRewardSpinQueue((queue) => [...queue, drop]);
          return current;
        }
        return drop;
      });
      return;
    }
    if (drop.rewardType === "bug" && drop.isNew && notificationSettingsRef.current.bugdex) {
      void showBugDexUnlockNotification(bugDexEntryName(drop.entry, t), rarityLabel(drop.entry.rarity, t)).catch(() => undefined);
    }
    if (!forceImmediate && route !== "duel" && (activeForegroundRewardRef.current || pendingForegroundRewardsRef.current.length > 0)) {
      setBugDexDropQueue((queue) => [...queue, drop]);
      return;
    }
    setBugDexDrop((current) => {
      if (current) {
        setBugDexDropQueue((queue) => [...queue, drop]);
        return current;
      }
      return drop;
    });
  }

  function queueForegroundReward(reward: PendingForegroundReward) {
    setPendingForegroundRewards((queue) => {
      const next = [...queue, reward];
      pendingForegroundRewardsRef.current = next;
      return next;
    });
  }

  function queueStarterBoostBugRoll(source: BugDexDropSource, appUser: User, excludeBugId?: string) {
    if (!isStarterBoostActive(appUser) || source === "combine") return;
    const entry = pickQueuedBugDexRewardEntry(appUser, source);
    if (!entry || entry.id === excludeBugId) return;
    queueForegroundReward({
      bugId: entry.id as BugArtId,
      entry,
      id: `starter-boost-${source}-${entry.id}-${Date.now()}-${Math.random()}`,
      source: "starter_boost",
      starterBoostBonus: true
    });
  }

  function bugDropEntryId(drop: BugDexDropResult | null | undefined): string | undefined {
    return drop?.rewardType === "bug" ? drop.entry.id : undefined;
  }

  function queueGuaranteedBugDexReward(source: BugDexDropSource, appUser = userRef.current) {
    if (!appUser) return;
    const entry = pickBugDexRewardEntry(appUser, source);
    queueForegroundReward({
      bugId: entry.id as BugArtId,
      entry,
      id: `reward-${source}-${entry.id}-${Date.now()}-${Math.random()}`,
      source
    });
  }

  function queueRolledBugDexReward(source: BugDexDropSource, appUser = userRef.current) {
    if (!appUser) return;
    const entry = pickQueuedBugDexRewardEntry(appUser, source);
    if (!entry) return;
    queueForegroundReward({
      bugId: entry.id as BugArtId,
      entry,
      id: `roll-${source}-${entry.id}-${Date.now()}-${Math.random()}`,
      source
    });
  }

  async function canQueueBugDexReward(source: BugDexDropSource, appUser: User): Promise<boolean> {
    if (!reportActionRewardSources.has(source)) return true;
    const dayKey = `${appUser.uid}:${localDayId()}`;
    if (reportActionRewardQueuedDay.current === dayKey) return false;
    const available = await hasBugDexRewardAvailable(appUser, source);
    if (available) reportActionRewardQueuedDay.current = dayKey;
    return available;
  }

  async function closeBugDexDrop() {
    if (bugDexDrop?.source === "daily_login" && !bugDexDrop.updatedUser) {
      const currentUser = userRef.current;
      if (!currentUser || bugDexClaiming) return;
      setBugDexClaiming(true);
      try {
        const claimedDrop = await claimDailyLoginBug(currentUser, bugDexDrop);
        if (claimedDrop?.updatedUser) setUser(claimedDrop.updatedUser);
      } catch {
        return;
      } finally {
        setBugDexClaiming(false);
      }
    }
    await dismissPresentedNotificationsForTarget({ type: "bugdex" }).catch(() => undefined);
    const [nextDrop, ...remaining] = bugDexDropQueue;
    setBugDexDrop(nextDrop ?? null);
    setBugDexDropQueue(remaining);
  }

  function rewardActivity(source: BugDexDropSource) {
    if (!user) return;
    const currentUser = user;
    void canQueueBugDexReward(source, currentUser).then((available) => {
      if (available && userRef.current?.uid === currentUser.uid) queueRolledBugDexReward(source, currentUser);
    }).catch(() => undefined);
  }

  function rewardGuaranteedActivity(source: BugDexDropSource) {
    if (!user) return;
    const currentUser = user;
    void canQueueBugDexReward(source, currentUser).then((available) => {
      if (available && userRef.current?.uid === currentUser.uid) queueGuaranteedBugDexReward(source, currentUser);
    }).catch(() => undefined);
  }

  async function showClaimedRadarBugs(rewardIds: MovementRadarRewardId[]) {
    const currentUser = userRef.current;
    if (!currentUser || rewardIds.length === 0) return;
    const bugIds = resolveMovementRadarBugIds(
      rewardIds,
      () => pickBugDexRewardEntry(currentUser, "movement_radar").id as BugArtId
    );
    let grantQueue: Promise<void> = Promise.resolve();
    for (const bugId of bugIds) {
      const entry = entryByBugId(bugId);
      if (!entry) continue;
      const preGrantPromise = grantQueue
        .then(() => rollSpecificBugDexDrop(currentUser, entry.id, "movement_radar", 1))
        .catch(() => null);
      grantQueue = preGrantPromise.then(() => undefined);
      queueForegroundReward({
        bugId,
        entry,
        id: `radar-${bugId}-${Date.now()}-${Math.random()}`,
        preGrantPromise,
        source: "movement_radar"
      });
    }
    try {
      const xpUser = await applyUserPoints(currentUser.uid, bugIds.length * movementRadarXpPerBug, 0);
      if (xpUser) {
        setUser(xpUser);
      }
    } catch {
      // Movement XP is additive; radar BugDex rewards should still be shown.
    }
    await dismissPresentedNotificationsForTarget({ type: "movement" }).catch(() => undefined);
  }

  function rewardBugFixed() {
    if (!user) return;
    rewardGuaranteedActivity("bug_fixed");
  }

  async function handleBugSplat() {
    if (!user) return;
    try {
      const result = await recordBugSplat(user);
      setUser(result.user);
      if (result.milestone) queueRolledBugDexReward("bug_splat", result.user);
    } catch {
      // Background splat rewards should never interrupt normal app use.
    }
  }

  async function handleForegroundBugCaught(xp: number, bugId: string, rarity: "common" | "rare" | "epic" | "legendary" | "mythic") {
    if (!user) return;
    const pendingReward = activeForegroundRewardRef.current?.bugId === bugId ? activeForegroundRewardRef.current : null;
    activeForegroundRewardRef.current = null;
    if (pendingReward) {
      setPendingForegroundRewards((queue) => {
        const next = queue.filter((reward) => reward.id !== pendingReward.id);
        pendingForegroundRewardsRef.current = next;
        return next;
      });
    }
    let rewardUser = user;
    let splatMilestone = false;
    try {
      const updated = await applyUserPoints(user.uid, xp, 0);
      if (updated) {
        rewardUser = updated;
        setUser(updated);
      }
    } catch {
      // XP must never block the foreground BugDex reward.
    }
    try {
      const splatResult = await recordBugSplat(rewardUser);
      rewardUser = splatResult.user;
      splatMilestone = splatResult.milestone;
      setUser(splatResult.user);
    } catch {
      // Splat stats must never block the foreground BugDex reward.
    }
    try {
      if (pendingReward) {
        if (pendingReward.preGrantedDrop) {
          presentBugDexDrop(pendingReward.preGrantedDrop, true);
          if (pendingReward.preGrantedDrop.rewardType === "bug" && !pendingReward.starterBoostBonus) {
            queueStarterBoostBugRoll(pendingReward.preGrantedDrop.source, rewardUser, bugDropEntryId(pendingReward.preGrantedDrop));
          }
          return;
        }
        if (pendingReward.preGrantPromise) {
          const preGrantedDrop = await pendingReward.preGrantPromise;
          if (preGrantedDrop) {
            presentBugDexDrop(preGrantedDrop, true);
            if (preGrantedDrop.rewardType === "bug" && !pendingReward.starterBoostBonus) {
              queueStarterBoostBugRoll(preGrantedDrop.source, rewardUser, bugDropEntryId(preGrantedDrop));
            }
            return;
          }
        }
        if (pendingReward.preparedDrop?.source === "daily_login") {
          const claimedDrop = await claimDailyLoginBug(rewardUser, pendingReward.preparedDrop);
          if (claimedDrop?.updatedUser) setUser(claimedDrop.updatedUser);
          if (claimedDrop) {
            presentBugDexDrop(claimedDrop, true);
            if (!pendingReward.starterBoostBonus) queueStarterBoostBugRoll(claimedDrop.source, claimedDrop.updatedUser ?? rewardUser, bugDropEntryId(claimedDrop));
          }
          return;
        }
        const rewardDrop = await rollSpecificBugDexDrop(rewardUser, pendingReward.entry.id, pendingReward.source, 1);
        if (rewardDrop?.updatedUser) setUser(rewardDrop.updatedUser);
        if (rewardDrop) {
          presentBugDexDrop(rewardDrop, true);
          if (!pendingReward.starterBoostBonus) queueStarterBoostBugRoll(rewardDrop.source, rewardDrop.updatedUser ?? rewardUser, bugDropEntryId(rewardDrop));
        }
        return;
      }
      const caughtBugDrop = await rollSpecificBugDexDrop(rewardUser, bugId, "bug_splat", 1);
      if (caughtBugDrop) {
        presentBugDexDrop(caughtBugDrop, true);
        queueStarterBoostBugRoll(caughtBugDrop.source, rewardUser, bugDropEntryId(caughtBugDrop));
      } else if (splatMilestone) {
        queueRolledBugDexReward("bug_splat", rewardUser);
      }
    } catch {
      // Foreground catch rewards should never interrupt normal app use.
    }
  }

  async function checkMovementRadarBonuses() {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.nameSet !== true || movementCheckInProgress.current) return;
    const check = (async () => {
      try {
        const result = await claimMovementRadarBonusesForApp(currentUser.uid, movementBoostForUser(currentUser));
        await registerMovementKilometers(result.estimatedKm, result.estimatedWeekKm);
        if (result.bugIds.length > 0) await showClaimedRadarBugs(result.bugIds);
      } catch {
        // Movement radar bonuses are optional and must never interrupt the app.
      }
    })();
    movementCheckInProgress.current = check;
    try {
      await check;
    } finally {
      if (movementCheckInProgress.current === check) movementCheckInProgress.current = null;
    }
  }

  async function claimMovementRadarRewards() {
    while (movementCheckInProgress.current) {
      const activeCheck = movementCheckInProgress.current;
      await activeCheck.catch(() => undefined);
      if (movementCheckInProgress.current === activeCheck) movementCheckInProgress.current = null;
    }
    const currentUser = userRef.current;
    if (!currentUser || currentUser.nameSet !== true) return;
    const claim = (async () => {
      try {
        const result = await claimAllMovementRadarRewards(currentUser.uid, movementBoostForUser(currentUser));
        await registerMovementKilometers(result.estimatedKm, result.estimatedWeekKm);
        if (result.bugIds.length > 0) await showClaimedRadarBugs(result.bugIds);
      } catch {
        // Claiming movement rewards must not interrupt normal app use.
      }
    })();
    movementCheckInProgress.current = claim;
    try {
      await claim;
    } finally {
      if (movementCheckInProgress.current === claim) movementCheckInProgress.current = null;
    }
  }

  async function claimRequestedRadarStack() {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.nameSet !== true) return;
    radarClaimRequested.current = false;
    await claimMovementRadarRewards();
  }

  async function registerMovementKilometers(estimatedKm: number, estimatedWeekKm?: number, source: MovementSyncSource = "health_connect") {
    const currentUser = userRef.current;
    if (!currentUser || (estimatedKm <= 0 && (estimatedWeekKm ?? 0) <= 0)) return;
    const fitnessSyncerConnected = source === "fitness_syncer" || Boolean((await getFitnessSyncerStatus())?.connected);
    if (!canRegisterMovementSource(source, fitnessSyncerConnected)) return;
    const updated = await syncMovementKilometers(currentUser, estimatedKm, estimatedWeekKm);
    setUser(updated);
    userRef.current = updated;
  }

  async function checkForVersionUpdate() {
    if (versionCheckInProgress.current) return;
    const currentVersion = currentAppVersion();
    if (!currentVersion) return;
    versionCheckInProgress.current = true;
    try {
      setVersionNotice(await checkLatestVersion(currentVersion));
    } catch {
      // Update checks are optional and should never interrupt app startup.
    } finally {
      versionCheckInProgress.current = false;
    }
  }

  function squadBonuses() {
    return activeBugSquadBonuses(user ?? undefined);
  }

  function movementBoostForUser(currentUser: User | null | undefined = user) {
    return movementBoostWithBugLamp(currentUser ?? undefined, activeBugSquadBonuses(currentUser ?? undefined).movement_boost);
  }

  async function handleActivateBugLamp() {
    if (!user) return;
    setUser(await activateBugLamp(user));
  }

  async function updateNotificationSettings(settings: NotificationSettings) {
    if (!user) return;
    setNotificationSettings(settings);
    await saveNotificationSettings(user, settings);
  }

  async function closeNotification() {
    const current = notification;
    setNotification(null);
    if (user && current) await markNotificationRead(user, current.id);
  }

  async function openNotification(current: AppNotification) {
    await closeNotification();
    await openNotificationTarget(current.type, current.bugId, current.id, current.duelId);
  }

  async function openNotificationTarget(type?: string, bugId?: string, notificationId?: string, duelId?: string) {
    const currentUser = userRef.current;
    if (currentUser && notificationId) {
      await markNotificationRead(currentUser, notificationId).catch(() => undefined);
    }
    await dismissPresentedNotificationsForTarget({ bugId, duelId, notificationId, type }).catch(() => undefined);
    if (type === "trade") {
      openBugDexTrades();
      return;
    }
    if (type === "duel") {
      openBugSmashDuel(undefined, duelId);
      return;
    }
    if (type === "movement") {
      setSelectedBug(null);
      setSelectedUser(null);
      setRoute("home");
      if (currentUser) {
        const result = await claimAllMovementRadarRewards(currentUser.uid, movementBoostForUser(currentUser)).catch(() => null);
        if (result?.estimatedKm) await registerMovementKilometers(result.estimatedKm, result.estimatedWeekKm).catch(() => undefined);
        if (result?.bugIds.length) await showClaimedRadarBugs(result.bugIds);
      }
      return;
    }
    if (!bugId) return;
    const bug = (await listBugs()).find((item) => item.id === bugId);
    if (!bug) return;
    setSelectedBug(bug);
    setRoute("detail");
  }

  function openBugDexTrades() {
    setSelectedBug(null);
    setSelectedUser(null);
    setDuelOpponent(null);
    setOpenDuelId("");
    setRoute("bugdex");
    setOpenBugDexTradeRequest((current) => current + 1);
  }

  function openBugSmashDuel(opponent?: User, duelId = "") {
    setSelectedBug(null);
    setSelectedUser(null);
    setDuelOpponent(opponent ?? null);
    setOpenDuelId(duelId);
    setDuelFullscreen(false);
    setRoute("duel");
  }

  function navigateMain(destination: MainDestination) {
    if (duelFullscreen) return;
    setSelectedBug(null);
    setSelectedUser(null);
    setDuelOpponent(null);
    setOpenDuelId("");
    setDuelFullscreen(false);
    setAppNavigation((current) => navigateTo(current, destination));
    setRoute(destinationRoute(destination));
  }

  function showHelpTour() {
    setHelpVisible(true);
  }

  function navigateHelp(routeName: "home" | "realBugScan" | "duel" | "bugdex" | "museum") {
    setSelectedBug(null);
    setSelectedUser(null);
    setRoute(routeName);
  }

  function openUserProfile(nextUser: User) {
    const currentUser = userRef.current;
    const isOwnProfile = nextUser.uid === currentUser?.uid;
    if (!isOwnProfile) {
      setSelectedUser(nextUser);
    }
    setRoute(isOwnProfile ? "profile" : "userProfile");
    void getUserById(nextUser.uid).then((freshUser) => {
      if (!freshUser) return;
      if (freshUser.uid === userRef.current?.uid) {
        const current = userRef.current;
        const mergedUser = current ? { ...current, ...freshUser, email: current.email || freshUser.email } : freshUser;
        setUser(mergedUser);
        userRef.current = mergedUser;
        return;
      }
      setSelectedUser(freshUser);
    }).catch(() => undefined);
  }

  if (authLoading) {
    return (
      <View style={styles.webStage}>
        <AppBackground />
        <SafeAreaView style={[styles.shell, responsiveShellStyle]}>
          <View style={styles.loadingScreen}>
            <AppLoadingScreen />
          </View>
          <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.webStage}>
        <View style={[styles.fullScreen, styles.shell, responsiveShellStyle]}>
          <LoginScreen error={authError} loading={authLoading} onGoogleSubmit={handleGoogleLogin} onSubmit={handleLogin} />
          <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
        </View>
      </View>
    );
  }

  const duelRouteActive = route === "duel";
  const realBugScanRouteActive = route === "realBugScan";
  const swarmSiegeRouteActive = route === "swarmSiege";
  const fullWidthRouteActive = duelRouteActive || realBugScanRouteActive || swarmSiegeRouteActive || route === "museum";

  return (
    <View style={[styles.webStage, duelFullscreen && styles.gameStage]}>
      {!duelFullscreen && <AppBackground tone={routeScreenTone(route)} />}
      <SafeAreaView style={[styles.shell, !duelFullscreen && responsiveShellStyle, duelFullscreen && styles.gameShell]}>
        {walkingBugsReady && route === "home" && <WalkingBugsLayer onSplat={() => void handleBugSplat()} />}
        <ViewportScreen
          fullWidth={fullWidthRouteActive}
          immersive={duelFullscreen}
          header={!duelRouteActive && !realBugScanRouteActive && !swarmSiegeRouteActive ? (
            <AppHud
              notificationCount={requestTabBadges.duel + requestTabBadges.trade}
              onOpenPlayer={() => setRoute("profile")}
              user={user}
            />
          ) : undefined}
          testID="app-viewport"
        >
        <View style={styles.content}>
        {route === "home" && (
          <WorldScreen
            user={user}
            onStartScan={() => navigateMain("scan")}
            onOpenCollection={() => setRoute("bugdex")}
            onOpenPlay={() => navigateMain("play")}
            onOpenBuddy={() => setAppNavigation((current) => openOverlay(current, { type: "buddy" }))}
            onOpenTeamHunt={() => setRoute("teamHunt")}
            onOpenSwarmSiege={() => setRoute("swarmSiege")}
            onOpenSeasonFinale={() => setRoute("seasonFinale")}
            onClaimMovementRewards={claimMovementRadarRewards}
            onSyncMovement={() => { void checkMovementRadarBonuses(); }}
            onRewardDrop={showBugDexDrop}
            onUserUpdated={setUser}
          />
        )}
        {route === "bugs" && (
          <BugListScreen
            onBack={() => setRoute("home")}
            onNew={() => setRoute("new")}
            onSelect={(bug) => {
              setSelectedBug(bug);
              setRoute("detail");
            }}
          />
        )}
        {route === "new" && (
          <NewBugScreen
            user={user}
            onBack={() => setRoute("bugs")}
            onSaved={(bug) => {
              void notifyNewBug(bug, user).catch(() => undefined);
              void refreshUser();
              if (bug.points > 0) {
                if ((bug.reportType ?? "bug") === "bug") {
                  rewardGuaranteedActivity("bug_reported");
                  setSplatBonusVisible(true);
                } else {
                  rewardActivity("comment");
                }
              }
              setRoute("bugs");
            }}
          />
        )}
        {route === "detail" && selectedBug && (
          <BugDetailScreen
            bug={selectedBug}
            user={user}
            onBack={() => setRoute("bugs")}
            onOpenProfile={openUserProfile}
            onCommentAdded={(comment: BugComment) => {
              void notifyComment(selectedBug, comment, user).catch(() => undefined);
              rewardActivity("comment");
              void refreshUser();
            }}
            onBugChanged={(bug) => {
              if (selectedBug?.status !== bug.status) {
                void notifyBugUpdate(selectedBug, bug, user).catch(() => undefined);
                if (bug.status === "Gefixt") rewardBugFixed();
                else rewardActivity("status_update");
              } else if ((selectedBug?.upvoteCount ?? 0) !== (bug.upvoteCount ?? 0) && user.uid !== bug.reporterId) {
                rewardActivity("upvote_given");
              }
              setSelectedBug(bug);
              void refreshUser();
            }}
            onDeleted={() => {
              setSelectedBug(null);
              void refreshUser();
              setRoute("bugs");
            }}
          />
        )}
        {route === "leaderboard" && (
          <PlayScreen
            initialTab="ranking"
            onBack={() => setRoute("home")}
            onOpenCollection={() => setRoute("bugdex")}
            onSelectUser={openUserProfile}
            user={user}
          />
        )}
        {route === "profile" && (
          <ProfileScreen
            user={user}
            onBack={() => setRoute("home")}
            onLogout={handleLogout}
            onOpenReports={() => setRoute("bugs")}
            onOpenSettings={() => setRoute("settings")}
            onUpdateCharacter={handleCharacterSave}
            onUpdateDisplayName={handleDisplayNameSave}
            onCreateOrganization={handleCreateOrganization}
            onUserUpdated={setUser}
            onSelectBug={(bug) => {
              setSelectedBug(bug);
              setRoute("detail");
            }}
          />
        )}
        {route === "userProfile" && selectedUser && (
          <ProfileScreen
            user={selectedUser}
            isOwnProfile={false}
            onBack={() => setRoute("leaderboard")}
            onSelectBug={(bug) => {
              setSelectedBug(bug);
              setRoute("detail");
            }}
            onChallengeDuel={(opponent) => openBugSmashDuel(opponent)}
          />
        )}
        {route === "bugdex" && <CollectionScreen openTradeRequest={openBugDexTradeRequest} user={user} onBack={() => setRoute("home")} onRewardDrop={showBugDexDrop} onUserUpdated={setUser} />}
        {route === "museum" && <CollectionScreen initialTab="museum" user={user} onBack={() => setRoute("home")} onRewardDrop={showBugDexDrop} onUserUpdated={setUser} />}
        {route === "realBugScan" && <RealBugScanScreen user={user} onBack={() => setRoute("home")} onOpenCollection={() => setRoute("bugdex")} onOpenJournal={() => { setFieldJournalBackRoute("realBugScan"); setRoute("fieldJournal"); }} onOpenWorld={() => setRoute("home")} onRewardDrop={showBugDexDrop} />}
        {route === "fieldJournal" && <CollectionScreen initialTab="journal" user={user} onBack={() => setRoute(fieldJournalBackRoute)} onUserUpdated={setUser} />}
        {route === "teamHunt" && <TeamHuntScreen user={user} onBack={() => setRoute("home")} />}
        {route === "swarmSiege" && <SwarmSiegeScreen user={user} onBack={() => setRoute("home")} onRewardDrop={showBugDexDrop} onUserUpdated={setUser} />}
        {route === "seasonFinale" && <ReleaseBossScreen user={user} onBack={() => setRoute("home")} onOpenJournal={() => { setFieldJournalBackRoute("seasonFinale"); setRoute("fieldJournal"); }} onRewardAwarded={() => { void refreshUser(); }} />}
        {route === "duel" && (
          <PlayScreen
            initialDuelId={openDuelId}
            initialOpponent={duelOpponent}
            initialTab="arcade"
            user={user}
            onBack={() => setRoute("home")}
            onDuelAccepted={(requesterId, duelId) => notifyBugSmashDuelAccepted(requesterId, user, duelId)}
            onDuelRequest={(recipientId, duelId) => notifyBugSmashDuelRequest(recipientId, user, duelId)}
            onFullscreenChange={setDuelFullscreen}
            onOpenCollection={() => setRoute("bugdex")}
            onSelectUser={openUserProfile}
            onUserUpdated={setUser}
            onRewardDrop={(drop) => {
              if (drop.updatedUser) setUser(drop.updatedUser);
              showBugDexDrop(drop);
            }}
          />
        )}
        {route === "settings" && (
          <SettingsScreen
            settings={notificationSettings}
            onBack={() => setRoute("profile")}
            onChange={updateNotificationSettings}
            onHealthPermissionOpen={async () => { await requestHealthConnectPermissions(user.uid); }}
            onMovementRegistered={registerMovementKilometers}
            onShowHelp={showHelpTour}
          />
        )}
        </View>
        </ViewportScreen>
        {!swarmSiegeRouteActive && !(duelRouteActive && duelFullscreen) && (
          <BottomNav
            activeDestination={routeDestination(route)}
            badges={{ play: requestTabBadges.duel, collection: requestTabBadges.trade }}
            onNavigate={navigateMain}
          />
        )}
        {!duelRouteActive && !swarmSiegeRouteActive && <InAppNotificationToast notification={notification && !isRequestNotification(notification) ? notification : null} onClose={closeNotification} onOpen={openNotification} />}
        <DailyMissionCompletionController
          enabled={foregroundUiClear && !duelFullscreen}
          onRewardDrop={showBugDexDrop}
          onUserUpdated={setUser}
          user={user}
        />
        <ForegroundCatchBug
        catchAssist={squadBonuses().catch_assist}
        catchTimeBonus={squadBonuses().catch_time}
        enabled={foregroundBugEnabled || forcedForegroundRewardEnabled}
        forcedBugIds={pendingForegroundRewards.map((reward) => reward.bugId)}
        onCaught={(xp, bugId, rarity) => void handleForegroundBugCaught(xp, bugId, rarity)}
        onForcedBugConsumed={(bugId) => {
          const [nextReward] = pendingForegroundRewards;
          activeForegroundRewardRef.current = nextReward?.bugId === bugId ? nextReward : pendingForegroundRewards.find((reward) => reward.bugId === bugId) ?? null;
        }}
        onForcedBugMissed={(bugId) => {
          const missedReward = activeForegroundRewardRef.current?.bugId === bugId
            ? activeForegroundRewardRef.current
            : pendingForegroundRewardsRef.current.find((reward) => reward.bugId === bugId) ?? null;
          setPendingForegroundRewards((queue) => {
            if (!missedReward) return queue;
            const next = [...queue.filter((reward) => reward.id !== missedReward.id), missedReward];
            pendingForegroundRewardsRef.current = next;
            return next;
          });
          activeForegroundRewardRef.current = null;
        }}
        />
        <RankUpModal tier={rankUpTier} onClose={() => setRankUpTier(null)} />
        <BadgeUnlockModal badge={badgeUnlock} onClose={closeBadgeUnlock} />
        <RewardSpinModal drop={rewardSpinDrop} onComplete={(drop) => {
          setRewardSpinDrop(null);
          setRewardSpinQueue((queue) => {
            const [next, ...remaining] = queue;
            if (next) setTimeout(() => setRewardSpinDrop(next), 0);
            return remaining;
          });
          presentBugDexDrop(drop, true, true);
        }} />
        <BugDexUnlockModal drop={bugDexDrop} busy={bugDexClaiming} onClose={closeBugDexDrop} />
        <DisplayNameModal user={user} visible={Boolean(user && user.nameSet !== true)} onSave={handleDisplayNameSave} />
        <HelpTourOverlay visible={helpVisible && user.nameSet === true} onFinish={finishHelpTour} onNavigate={navigateHelp} />
        <ActiveEventAnnouncementModal
          announcement={helpVisible ? null : activeEventAnnouncement}
          onClose={() => finishActiveEventAnnouncement(false)}
          onOpen={() => finishActiveEventAnnouncement(true)}
        />
        <ChangelogModal version={changelogVersion} onClose={closeChangelog} />
        <BugSplatBonusOverlay visible={splatBonusVisible} onSkip={() => setSplatBonusVisible(false)} />
        <AppOverlayHost
          overlay={appNavigation.overlay}
          onClose={() => setAppNavigation((current) => closeOverlay(current))}
          renderOverlay={(overlay) => overlay.type === "buddy" ? (
            <BuddyOverlay
              user={user}
              onClose={() => setAppNavigation((current) => closeOverlay(current))}
              onOpenCollection={() => {
                setAppNavigation((current) => closeOverlay(current));
                setRoute("bugdex");
              }}
              onRewardDrop={(drop) => {
                setAppNavigation((current) => closeOverlay(current));
                setTimeout(() => showBugDexDrop(drop), 0);
              }}
              onUserUpdated={setUser}
            />
          ) : null}
        />
        <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
      </SafeAreaView>
    </View>
  );
}

function currentAppVersion(): string {
  return String(Application.nativeApplicationVersion || Constants.expoConfig?.version || "");
}

function ChangelogModal({ version, onClose }: { version: string; onClose: () => void }) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const features = usefulChangelogByVersion[version] ?? [];
  return (
    <Modal transparent animationType="fade" visible={Boolean(version && features.length)} onRequestClose={onClose}>
      <View style={styles.changelogBackdrop}>
        <View style={[styles.changelogCard, { maxWidth: layout.modalMaxWidth, padding: layout.isCompact ? 14 : 20 }]}>
          <Text style={styles.changelogKicker}>{t("changelog.kicker", { version })}</Text>
          <Text style={styles.changelogTitle}>{t("changelog.title")}</Text>
          <ScrollView style={styles.changelogScroll} contentContainerStyle={styles.changelogList} showsVerticalScrollIndicator={false}>
            {features.map((feature) => (
              <View key={feature.key} style={[styles.changelogItem, styles[`changelogItem${capitalizeTone(feature.tone)}`]]}>
                <View style={styles.changelogImageFrame}>
                  <Image source={feature.image} style={styles.changelogImage} resizeMode="contain" />
                </View>
                <Text style={styles.changelogText}>{t(feature.key)}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.changelogButton} onPress={onClose}>
            <Text style={styles.changelogButtonText}>{t("common.done")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function capitalizeTone(tone: ChangelogFeature["tone"]): "Gold" | "Green" | "Purple" {
  if (tone === "gold") return "Gold";
  if (tone === "purple") return "Purple";
  return "Green";
}

function VersionToast({ notice, onDismiss }: { notice: VersionNotice | null; onDismiss: () => void }) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  if (!notice) return null;
  const openUpdate = () => {
    void Linking.openURL(notice.releaseUrl).then(onDismiss).catch(() => undefined);
  };
  return (
    <View accessibilityLabel={t("a11y.openLatestRelease")} style={[styles.versionToast, { left: layout.gutter, right: layout.gutter }]}>
      <Text style={styles.versionToastTitle}>{t("version.available")}</Text>
      <Text style={styles.versionToastText}>{t("version.tap", { version: notice.latestVersion })}</Text>
      <View style={styles.versionToastActions}>
        <Pressable style={styles.versionToastSecondaryButton} onPress={onDismiss}>
          <Text style={styles.versionToastSecondaryText}>{t("version.later")}</Text>
        </Pressable>
        <Pressable style={styles.versionToastPrimaryButton} onPress={openUpdate}>
          <Text style={styles.versionToastPrimaryText}>{t("version.open")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function fitnessSyncerResultFromUrl(url: string | null): "connected" | "error" | null {
  if (!url) return null;
  try {
    const result = new URL(url).searchParams.get("fitnessSyncer");
    return result === "connected" || result === "error" ? result : null;
  } catch {
    return null;
  }
}

function radarBugIdFromUrl(url: string | null): BugArtId | null {
  if (!url?.startsWith("bugbaas://radar")) return null;
  const match = url.match(/[?&]bugId=([^&]+)/);
  if (!match) return null;
  const bugId = decodeURIComponent(match[1]);
  return allBugArtIds.includes(bugId as BugArtId) ? bugId as BugArtId : null;
}

function radarStackClaimFromUrl(url: string | null): boolean {
  if (!url?.startsWith("bugbaas://radar")) return false;
  return /[?&]claimAll=1(?:&|$)/.test(url);
}

const styles = StyleSheet.create({
  webStage: {
    alignItems: "center",
    backgroundColor: "#0d1118",
    flex: 1,
    minHeight: 0,
    width: "100%"
  },
  shell: {
    backgroundColor: "transparent",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    width: "100%"
  },
  gameStage: {
    alignItems: "stretch"
  },
  gameShell: {
    maxWidth: "100%",
    overflow: "hidden"
  },
  fullScreen: {
    flex: 1,
    minHeight: 0
  },
  content: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    zIndex: 1
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  changelogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(8,10,24,0.76)",
    justifyContent: "center",
    padding: 24
  },
  changelogCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#c897ff",
    borderRadius: 24,
    borderWidth: 2,
    maxHeight: "86%",
    maxWidth: 460,
    padding: 18,
    width: "100%"
  },
  changelogKicker: {
    color: "#8058ad",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6
  },
  changelogTitle: {
    color: "#2b2140",
    fontSize: 24,
    fontWeight: "900"
  },
  changelogScroll: {
    marginTop: 14,
    maxHeight: 420
  },
  changelogList: {
    gap: 10,
    paddingBottom: 2
  },
  changelogItem: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    padding: 10
  },
  changelogItemGold: {
    backgroundColor: "#fff4d8",
    borderColor: "#d7bd57"
  },
  changelogItemGreen: {
    backgroundColor: "#edf8f1",
    borderColor: "#9fc9ad"
  },
  changelogItemPurple: {
    backgroundColor: "#f4efff",
    borderColor: "#b99df5"
  },
  changelogImageFrame: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(16,32,24,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68
  },
  changelogImage: {
    height: 58,
    width: 58
  },
  changelogText: {
    color: "#283a31",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  changelogButton: {
    alignItems: "center",
    backgroundColor: "#ffbd4a",
    borderColor: "#b5791d",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44
  },
  changelogButtonText: {
    color: "#2b2140",
    fontWeight: "900"
  },
  versionToast: {
    alignSelf: "center",
    backgroundColor: "#211936",
    borderColor: "#c897ff",
    borderRadius: 18,
    borderWidth: 1,
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 2000
  },
  versionToastTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  versionToastText: {
    color: "#dbe8de",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  versionToastActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 10
  },
  versionToastPrimaryButton: {
    backgroundColor: "#ffbd4a",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  versionToastPrimaryText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  versionToastSecondaryButton: {
    borderColor: "#dbe8de",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  versionToastSecondaryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  }
});
