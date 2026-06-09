import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, ImageSourcePropType, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNotification, BugComment, BugReport, BugSeverity, NotificationSettings, User } from "./src/types";
import { activateBugLamp, applyUserPoints, ensureUserDocument, getUserById, login, loginWithGoogle, logout, markHelpSeen, recordBugSplat, register, subscribeAuth, syncEngagementPoints, syncMovementKilometers, updateUserCharacter, updateUserDisplayName } from "./src/services/userService";
import { activeBugSquadBonuses } from "./src/services/bugSquadService";
import { movementBoostWithBugLamp } from "./src/services/bugLampService";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BugListScreen } from "./src/screens/BugListScreen";
import { BugDetailScreen } from "./src/screens/BugDetailScreen";
import { NewBugScreen } from "./src/screens/NewBugScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { BugDexScreen } from "./src/screens/BugDexScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AppBackground } from "./src/components/AppBackground";
import { BottomNav } from "./src/components/BottomNav";
import { WalkingBugsLayer } from "./src/components/WalkingBugsLayer";
import { BugDexUnlockModal } from "./src/components/BugDexUnlockModal";
import { RankUpModal } from "./src/components/RankUpModal";
import { BadgeUnlockModal } from "./src/components/BadgeUnlockModal";
import { BugSplatBonusOverlay } from "./src/components/BugSplatBonusOverlay";
import { ForegroundCatchBug } from "./src/components/ForegroundCatchBug";
import { DisplayNameModal } from "./src/components/DisplayNameModal";
import { InAppNotificationToast } from "./src/components/InAppNotificationToast";
import { HelpTourOverlay } from "./src/components/HelpTourOverlay";
import { allBugArtIds, BugArtId } from "./src/services/bugArt";
import { CharacterId } from "./src/services/characterService";
import { bugDexEntryName, LanguageProvider, rarityLabel, useI18n } from "./src/services/i18n";
import { listBugs } from "./src/services/bugService";
import { BugDexDropResult, BugDexDropSource, claimDailyLoginBug, grantBugDexReward, rollBugDexDrop, rollSpecificBugDexDrop } from "./src/services/bugDexService";
import { badgeDefinitions, getTierForPoints, type BadgeDefinition, type UserTier } from "./src/services/pointsService";
import { claimMovementRadarBonuses } from "./src/services/movementRadarService";
import { checkLatestVersion, VersionNotice } from "./src/services/versionService";
import {
  defaultNotificationSettings,
  getNotificationSettings,
  initializePhoneNotifications,
  markNotificationRead,
  notifyBugUpdate,
  notifyComment,
  notifyNewBug,
  saveNotificationSettings,
  showBugDexUnlockNotification,
  showMovementRewardNotification,
  showPhoneNotification,
  subscribeUserNotifications
} from "./src/services/notificationService";

export type RouteName = "home" | "bugs" | "new" | "detail" | "leaderboard" | "profile" | "userProfile" | "bugdex" | "settings";

const helpTourVersion = "full-help-v2";
const helpTourVersionKey = (uid: string) => `bugbaas:helpTour:${helpTourVersion}:${uid}`;
const changelogSeenKey = (uid: string, version: string) => `bugbaas:changelog:${version}:${uid}`;
const badgeUnlockSeenKey = (uid: string, badgeId: string) => `bugbaas:badgeUnlock:${uid}:${badgeId}`;
const commentForegroundSpawnChance = 0.16;
const upvoteForegroundSpawnChance = 0.1;
const maxQueuedForegroundBugs = 3;

type ChangelogFeature = {
  key: string;
  image: ImageSourcePropType;
  tone: "gold" | "green" | "purple";
};

const usefulChangelogByVersion: Record<string, ChangelogFeature[]> = {
  "2.0.3": [
    { key: "changelog.2.0.3.bugdex", image: require("./assets/bugdex/atlaskever.png"), tone: "purple" },
    { key: "changelog.2.0.3.squad", image: require("./assets/generated/active-bug-squad-selection-hd.jpg"), tone: "green" },
    { key: "changelog.2.0.3.radar", image: require("./assets/bugdex/schaatsenrijder.png"), tone: "gold" }
  ],
  "2.0.2": [
    { key: "changelog.2.0.1.movement", image: require("./assets/bugdex/schaatsenrijder.png"), tone: "green" },
    { key: "changelog.2.0.1.bugdex", image: require("./assets/bugdex/koningin-alexandravlinder.png"), tone: "purple" },
    { key: "changelog.2.0.1.badges", image: require("./assets/badges/badge-overview.png"), tone: "gold" },
    { key: "changelog.2.0.1.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" },
    { key: "changelog.2.0.1.squad", image: require("./assets/generated/bug-squad-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.1.apk", image: require("./assets/generated/bugbaas-splash-badge-hd.png"), tone: "purple" }
  ],
  "2.0.1": [
    { key: "changelog.2.0.1.movement", image: require("./assets/bugdex/schaatsenrijder.png"), tone: "green" },
    { key: "changelog.2.0.1.bugdex", image: require("./assets/bugdex/koningin-alexandravlinder.png"), tone: "purple" },
    { key: "changelog.2.0.1.badges", image: require("./assets/badges/badge-overview.png"), tone: "gold" },
    { key: "changelog.2.0.1.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" },
    { key: "changelog.2.0.1.squad", image: require("./assets/generated/bug-squad-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.1.apk", image: require("./assets/generated/bugbaas-splash-badge-hd.png"), tone: "purple" }
  ],
  "2.0.0": [
    { key: "changelog.2.0.0.badges", image: require("./assets/badges/badge-overview.png"), tone: "gold" },
    { key: "changelog.2.0.0.squad", image: require("./assets/generated/bug-squad-jar-hd.png"), tone: "green" },
    { key: "changelog.2.0.0.rank", image: require("./assets/bugdex/atlaskever.png"), tone: "purple" }
  ],
  "1.5.9": [
    { key: "changelog.1.5.9.badges", image: require("./assets/bugdex/lieveheersbeestje.png"), tone: "gold" },
    { key: "changelog.1.5.9.movement", image: require("./assets/bugdex/schaatsenrijder.png"), tone: "green" },
    { key: "changelog.1.5.9.rare", image: require("./assets/bugdex/koningin-alexandravlinder.png"), tone: "purple" },
    { key: "changelog.1.5.9.characters", image: require("./assets/characters/character-golden-net-champion.png"), tone: "gold" }
  ],
  "1.5.8": [
    { key: "changelog.1.5.8.help", image: require("./assets/characters/bugcatcher-classic.png"), tone: "green" },
    { key: "changelog.1.5.8.mythic", image: require("./assets/bugdex/koningin-alexandravlinder.png"), tone: "purple" },
    { key: "changelog.1.5.8.rewards", image: require("./assets/bugdex/pissebed.png"), tone: "gold" }
  ],
  "1.5.7": [
    { key: "changelog.1.5.7.help", image: require("./assets/characters/bugcatcher-classic.png"), tone: "green" },
    { key: "changelog.1.5.7.mythic", image: require("./assets/bugdex/koningin-alexandravlinder.png"), tone: "purple" },
    { key: "changelog.1.5.7.rewards", image: require("./assets/bugdex/pissebed.png"), tone: "gold" }
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
  const { t } = useI18n();
  const [route, setRoute] = useState<RouteName>("home");
  const [user, setUser] = useState<User | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [bugDexDrop, setBugDexDrop] = useState<BugDexDropResult | null>(null);
  const [rankUpTier, setRankUpTier] = useState<UserTier | null>(null);
  const [badgeUnlock, setBadgeUnlock] = useState<BadgeDefinition | null>(null);
  const [bugDexDropQueue, setBugDexDropQueue] = useState<BugDexDropResult[]>([]);
  const [badgeUnlockQueue, setBadgeUnlockQueue] = useState<BadgeDefinition[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [openBugDexTradeRequest, setOpenBugDexTradeRequest] = useState(0);
  const [helpVisible, setHelpVisible] = useState(false);
  const [helpGateChecked, setHelpGateChecked] = useState(false);
  const [changelogVersion, setChangelogVersion] = useState("");
  const [splatBonusVisible, setSplatBonusVisible] = useState(false);
  const [versionNotice, setVersionNotice] = useState<VersionNotice | null>(null);
  const [pendingRadarBugIds, setPendingRadarBugIds] = useState<BugArtId[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const appState = useRef(AppState.currentState);
  const movementCheckInProgress = useRef(false);
  const versionCheckInProgress = useRef(false);
  const userRef = useRef<User | null>(null);
  const previousRankRef = useRef<{ uid: string; minPoints: number } | null>(null);
  const previousBadgesRef = useRef<{ badges: string[]; uid: string } | null>(null);
  const queuedBadgeIdsRef = useRef(new Set<string>());
  const engagementSyncInProgress = useRef(new Set<string>());
  const notificationSettingsRef = useRef<NotificationSettings>(defaultNotificationSettings);
  const handledNotificationResponses = useRef(new Set<string>());
  const dailyLoginClaimedForUsers = useRef(new Set<string>());
  const foregroundBugEnabled = Boolean(
    user
    && user.nameSet === true
    && ["home", "bugs", "new", "bugdex", "leaderboard"].includes(route)
    && !badgeUnlock
    && !bugDexDrop
    && !rankUpTier
    && !notification
    && !helpVisible
    && !changelogVersion
    && !splatBonusVisible
    && !versionNotice
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    if (!user || user.nameSet !== true || !helpGateChecked) return;
    const currentBadges = user.badges ?? [];
    if (!currentBadges.length) return;
    let active = true;
    void queueUnseenBadgeUnlocks(badgeDefinitionsForNames(currentBadges)).then(() => {
      if (!active) return;
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [badgeNamesKey, helpGateChecked, user?.nameSet, user?.uid]);

  useEffect(() => {
    if (badgeUnlock || rankUpTier || bugDexDrop || notification || helpVisible || changelogVersion || splatBonusVisible || versionNotice) return;
    const [nextBadge, ...remaining] = badgeUnlockQueue;
    if (!nextBadge) return;
    setBadgeUnlock(nextBadge);
    setBadgeUnlockQueue(remaining);
  }, [badgeUnlock, badgeUnlockQueue, bugDexDrop, changelogVersion, helpVisible, notification, rankUpTier, splatBonusVisible, versionNotice]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    return subscribeAuth(async (nextUser) => {
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
        setAuthLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    void checkForVersionUpdate();
  }, []);

  useEffect(() => {
    const openRadarBug = (url: string | null) => {
      const bugId = radarBugIdFromUrl(url);
      if (!bugId) return;
      setSelectedBug(null);
      setSelectedUser(null);
      setRoute("home");
      setPendingRadarBugIds((queue) => [...queue, bugId]);
    };

    void Linking.getInitialURL().then(openRadarBug).catch(() => undefined);
    const subscription = Linking.addEventListener("url", (event) => openRadarBug(event.url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appState.current = nextState;
      if (nextState === "active") {
        void checkMovementRadarBonuses();
        void checkForVersionUpdate();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user?.uid || user.nameSet !== true) return;
    void checkMovementRadarBonuses();
    const interval = setInterval(() => void checkMovementRadarBonuses(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid, user?.nameSet]);

  useEffect(() => {
    if (!user) return;
    void getNotificationSettings(user).then(setNotificationSettings);
    void initializePhoneNotifications().catch(() => undefined);
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
    if (!user || user.nameSet !== true || !helpGateChecked || helpVisible || badgeUnlock || bugDexDrop || notification || splatBonusVisible || versionNotice) return;
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
  }, [badgeUnlock, bugDexDrop, helpGateChecked, helpVisible, notification, splatBonusVisible, user?.nameSet, user?.uid, versionNotice]);

  useEffect(() => {
    if (!user || user.nameSet !== true || !helpGateChecked || helpVisible || changelogVersion || badgeUnlock || bugDexDrop || notification || splatBonusVisible || versionNotice) return;
    if (dailyLoginClaimedForUsers.current.has(user.uid)) return;
    dailyLoginClaimedForUsers.current.add(user.uid);
    void maybeShowBugDexDrop(claimDailyLoginBug(user));
  }, [badgeUnlock, bugDexDrop, changelogVersion, helpGateChecked, helpVisible, notification, splatBonusVisible, user?.nameSet, user?.uid, versionNotice]);

  useEffect(() => {
    if (!user) return () => undefined;
    return subscribeUserNotifications(user, notificationSettings, (nextNotification) => {
      if (appState.current === "active") {
        setNotification(nextNotification);
        if (nextNotification.type === "trade" || nextNotification.type === "comment") void showPhoneNotification(nextNotification).catch(() => undefined);
        return;
      }
      void showPhoneNotification(nextNotification).catch(() => undefined);
    });
  }, [notificationSettings, user]);

  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse) {
      const request = response.notification.request;
      const contentData = request.content.data as { bugId?: string; notificationId?: string; type?: string };
      const responseKey = `${request.identifier}:${response.actionIdentifier}`;
      if (handledNotificationResponses.current.has(responseKey)) return;
      handledNotificationResponses.current.add(responseKey);
      void openNotificationTarget(contentData.type, contentData.bugId, contentData.notificationId);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    }).catch(() => undefined);
    return () => subscription.remove();
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

  async function handleGoogleLogin(idToken: string, accessToken?: string) {
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
    setRoute("home");
  }

  async function handleDisplayNameSave(displayName: string) {
    if (!user) return;
    setUser(await updateUserDisplayName(user, displayName));
  }

  async function handleCharacterSave(characterId: CharacterId) {
    if (!user) return;
    setUser(await updateUserCharacter(user, characterId));
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
    }, 1000);
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
    if (drop.rewardType === "bug" && drop.isNew && notificationSettingsRef.current.bugdex) {
      void showBugDexUnlockNotification(bugDexEntryName(drop.entry, t), rarityLabel(drop.entry.rarity, t)).catch(() => undefined);
    }
    setBugDexDrop((current) => {
      if (current) {
        setBugDexDropQueue((queue) => [...queue, drop]);
        return current;
      }
      return drop;
    });
  }

  function closeBugDexDrop() {
    const [nextDrop, ...remaining] = bugDexDropQueue;
    setBugDexDrop(nextDrop ?? null);
    setBugDexDropQueue(remaining);
  }

  function rewardActivity(source: BugDexDropSource) {
    if (!user) return;
    void maybeShowBugDexDrop(rollBugDexDrop(user, source));
  }

  function queueForegroundBug(chance = 1) {
    if (Math.random() > chance) return;
    const bugId = allBugArtIds[Math.floor(Math.random() * allBugArtIds.length)];
    if (!bugId) return;
    setPendingRadarBugIds((queue) => queue.length >= maxQueuedForegroundBugs ? queue : [...queue, bugId]);
  }

  function rewardBugFixed(bug: BugReport) {
    if (!user) return;
    const attempts = fixedRewardAttempts(bug.severity);
    for (let index = 0; index < attempts; index += 1) {
      void maybeShowBugDexDrop(grantBugDexReward(user, "bug_fixed"));
    }
  }

  async function handleBugSplat() {
    if (!user) return;
    try {
      const result = await recordBugSplat(user);
      setUser(result.user);
      if (result.milestone) void maybeShowBugDexDrop(rollBugDexDrop(result.user, "bug_splat"));
    } catch {
      // Background splat rewards should never interrupt normal app use.
    }
  }

  async function handleForegroundBugCaught(xp: number, bugId: string, rarity: "common" | "rare" | "epic" | "legendary" | "mythic") {
    if (!user) return;
    try {
      const updated = await applyUserPoints(user.uid, xp, 0);
      const splatResult = await recordBugSplat(updated ?? user);
      setUser(splatResult.user);
      const caughtBugDrop = await rollSpecificBugDexDrop(splatResult.user, bugId, "bug_splat", 1);
      if (caughtBugDrop) {
        showBugDexDrop(caughtBugDrop);
      } else if (splatResult.milestone) {
        void maybeShowBugDexDrop(rollBugDexDrop(splatResult.user, "bug_splat"));
      }
    } catch {
      // Foreground catch rewards should never interrupt normal app use.
    }
  }

  async function checkMovementRadarBonuses() {
    const currentUser = userRef.current;
    if (!currentUser || currentUser.nameSet !== true || movementCheckInProgress.current) return;
    movementCheckInProgress.current = true;
    try {
      const result = await claimMovementRadarBonuses(currentUser.uid, movementBoostForUser(currentUser));
      await registerMovementKilometers(result.estimatedKm);
      if (result.awarded > 0 && notificationSettingsRef.current.movement) {
        await showMovementRewardNotification(result.awarded);
      }
    } catch {
      // Movement radar bonuses are optional and must never interrupt the app.
    } finally {
      movementCheckInProgress.current = false;
    }
  }

  async function registerMovementKilometers(estimatedKm: number) {
    const currentUser = userRef.current;
    if (!currentUser || estimatedKm <= 0) return;
    const updated = await syncMovementKilometers(currentUser, estimatedKm);
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
    await openNotificationTarget(current.type, current.bugId, current.id);
  }

  async function openNotificationTarget(type?: string, bugId?: string, notificationId?: string) {
    const currentUser = userRef.current;
    if (currentUser && notificationId) {
      await markNotificationRead(currentUser, notificationId).catch(() => undefined);
    }
    if (type === "trade") {
      openBugDexTrades();
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
    setRoute("bugdex");
    setOpenBugDexTradeRequest((current) => current + 1);
  }

  function navigateMain(nextRoute: "home" | "bugs" | "new" | "bugdex" | "leaderboard") {
    setSelectedBug(null);
    setSelectedUser(null);
    setRoute(nextRoute);
  }

  function showHelpTour() {
    setHelpVisible(true);
  }

  function navigateHelp(routeName: "home" | "bugs" | "new" | "bugdex" | "leaderboard" | "settings") {
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
    if (!isOwnProfile) rewardActivity("profile_view");
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.shell}>
        <AppBackground />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#15724f" size="large" />
        </View>
        <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <View style={styles.fullScreen}>
        <LoginScreen error={authError} loading={authLoading} onGoogleSubmit={handleGoogleLogin} onSubmit={handleLogin} />
        <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <AppBackground />
      <WalkingBugsLayer onSplat={() => void handleBugSplat()} />
      <View style={styles.content}>
        {route === "home" && <HomeScreen movementBoost={movementBoostForUser()} user={user} onActivateBugLamp={handleActivateBugLamp} onNavigate={setRoute} onOpenBugDexWorkshop={openBugDexTrades} onMovementRegistered={registerMovementKilometers} />}
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
            onBack={() => setRoute("home")}
            onSaved={(bug) => {
              void notifyNewBug(bug, user).catch(() => undefined);
              void refreshUser();
              queueForegroundBug();
              if ((bug.reportType ?? "bug") === "bug") {
                void maybeShowBugDexDrop(grantBugDexReward(user, "bug_reported"));
                setSplatBonusVisible(true);
              } else {
                rewardActivity("comment");
              }
              setRoute("home");
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
              queueForegroundBug(commentForegroundSpawnChance);
              void refreshUser();
            }}
            onBugChanged={(bug) => {
              if (selectedBug?.status !== bug.status) {
                void notifyBugUpdate(selectedBug, bug, user).catch(() => undefined);
                if (bug.status === "Gefixt") rewardBugFixed(bug);
                else rewardActivity("status_update");
              } else if ((selectedBug?.upvoteCount ?? 0) !== (bug.upvoteCount ?? 0) && user.uid !== bug.reporterId) {
                rewardActivity("upvote_given");
                queueForegroundBug(upvoteForegroundSpawnChance);
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
        {route === "leaderboard" && <LeaderboardScreen onBack={() => setRoute("home")} onSelectUser={openUserProfile} />}
        {route === "profile" && (
          <ProfileScreen
            user={user}
            onBack={() => setRoute("home")}
            onLogout={handleLogout}
            onUpdateCharacter={handleCharacterSave}
            onUpdateDisplayName={handleDisplayNameSave}
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
          />
        )}
        {route === "bugdex" && <BugDexScreen openTradeRequest={openBugDexTradeRequest} user={user} onBack={() => setRoute("home")} onUserUpdated={setUser} />}
        {route === "settings" && (
          <SettingsScreen settings={notificationSettings} onBack={() => setRoute("home")} onChange={updateNotificationSettings} onShowHelp={showHelpTour} />
        )}
      </View>
      <BottomNav activeRoute={route} onNavigate={navigateMain} />
      <InAppNotificationToast notification={notification} onClose={closeNotification} onOpen={openNotification} />
      <ForegroundCatchBug
        catchAssist={squadBonuses().catch_assist}
        catchTimeBonus={squadBonuses().catch_time}
        enabled={foregroundBugEnabled}
        forcedBugIds={pendingRadarBugIds}
        onCaught={(xp, bugId, rarity) => void handleForegroundBugCaught(xp, bugId, rarity)}
        onForcedBugConsumed={() => setPendingRadarBugIds((queue) => queue.slice(1))}
      />
      <RankUpModal tier={rankUpTier} onClose={() => setRankUpTier(null)} />
      <BadgeUnlockModal badge={badgeUnlock} onClose={closeBadgeUnlock} />
      <BugDexUnlockModal drop={bugDexDrop} onClose={closeBugDexDrop} />
      <DisplayNameModal user={user} visible={Boolean(user && user.nameSet !== true)} onSave={handleDisplayNameSave} />
      <HelpTourOverlay visible={helpVisible && user.nameSet === true} onFinish={finishHelpTour} onNavigate={navigateHelp} />
      <ChangelogModal version={changelogVersion} onClose={closeChangelog} />
      <BugSplatBonusOverlay visible={splatBonusVisible} onSkip={() => setSplatBonusVisible(false)} />
      <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
    </SafeAreaView>
  );
}

function currentAppVersion(): string {
  return String(Application.nativeApplicationVersion || Constants.expoConfig?.version || "");
}

function ChangelogModal({ version, onClose }: { version: string; onClose: () => void }) {
  const { t } = useI18n();
  const features = usefulChangelogByVersion[version] ?? [];
  return (
    <Modal transparent animationType="fade" visible={Boolean(version && features.length)} onRequestClose={onClose}>
      <View style={styles.changelogBackdrop}>
        <View style={styles.changelogCard}>
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
  if (!notice) return null;
  const openUpdate = () => {
    void Linking.openURL(notice.releaseUrl).then(onDismiss).catch(() => undefined);
  };
  return (
    <View accessibilityLabel={t("a11y.openLatestRelease")} style={styles.versionToast}>
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

function fixedRewardAttempts(severity: BugSeverity): number {
  if (severity === "Kritiek") return 3;
  if (severity === "Hoog") return 2;
  return 1;
}

function radarBugIdFromUrl(url: string | null): BugArtId | null {
  if (!url?.startsWith("bugbaas://radar")) return null;
  const match = url.match(/[?&]bugId=([^&]+)/);
  if (!match) return null;
  const bugId = decodeURIComponent(match[1]);
  return allBugArtIds.includes(bugId as BugArtId) ? bugId as BugArtId : null;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#eef4ed"
  },
  fullScreen: {
    flex: 1
  },
  content: {
    flex: 1,
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
    backgroundColor: "rgba(16,32,24,0.62)",
    justifyContent: "center",
    padding: 24
  },
  changelogCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    maxHeight: "86%",
    maxWidth: 460,
    padding: 18,
    width: "100%"
  },
  changelogKicker: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6
  },
  changelogTitle: {
    color: "#102018",
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    backgroundColor: "#15724f",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44
  },
  changelogButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  versionToast: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
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
    backgroundColor: "#d7bd57",
    borderRadius: 8,
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
