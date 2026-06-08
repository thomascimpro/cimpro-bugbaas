import Constants from "expo-constants";
import * as Application from "expo-application";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AppNotification, BugComment, BugReport, BugSeverity, NotificationSettings, User } from "./src/types";
import { applyUserPoints, ensureUserDocument, getUserById, login, loginWithGoogle, logout, markHelpSeen, recordBugSplat, register, subscribeAuth, syncEngagementPoints, updateUserDisplayName } from "./src/services/userService";
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
import { BugSplatBonusOverlay } from "./src/components/BugSplatBonusOverlay";
import { ForegroundCatchBug } from "./src/components/ForegroundCatchBug";
import { DisplayNameModal } from "./src/components/DisplayNameModal";
import { InAppNotificationToast } from "./src/components/InAppNotificationToast";
import { HelpTourOverlay } from "./src/components/HelpTourOverlay";
import { allBugArtIds, BugArtId } from "./src/services/bugArt";
import { listBugs } from "./src/services/bugService";
import { BugDexDropResult, BugDexDropSource, claimDailyLoginBug, grantBugDexReward, rollBugDexDrop, rollSpecificBugDexDrop } from "./src/services/bugDexService";
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
  showPhoneNotification,
  subscribeUserNotifications
} from "./src/services/notificationService";

export type RouteName = "home" | "bugs" | "new" | "detail" | "leaderboard" | "profile" | "userProfile" | "bugdex" | "settings";

export default function App() {
  const [route, setRoute] = useState<RouteName>("home");
  const [user, setUser] = useState<User | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [bugDexDrop, setBugDexDrop] = useState<BugDexDropResult | null>(null);
  const [bugDexDropQueue, setBugDexDropQueue] = useState<BugDexDropResult[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [splatBonusVisible, setSplatBonusVisible] = useState(false);
  const [versionNotice, setVersionNotice] = useState<VersionNotice | null>(null);
  const [pendingRadarBugIds, setPendingRadarBugIds] = useState<BugArtId[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const appState = useRef(AppState.currentState);
  const movementCheckInProgress = useRef(false);
  const versionCheckInProgress = useRef(false);
  const userRef = useRef<User | null>(null);
  const foregroundBugEnabled = Boolean(
    user
    && user.nameSet === true
    && ["home", "bugs", "new", "bugdex", "leaderboard"].includes(route)
    && !bugDexDrop
    && !notification
    && !helpVisible
    && !splatBonusVisible
    && !versionNotice
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    return subscribeAuth(async (nextUser) => {
      try {
        if (nextUser) {
          const appUser = await ensureUserDocument(nextUser);
          setUser(appUser);
          void maybeShowBugDexDrop(claimDailyLoginBug(appUser));
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
    if (!user || user.nameSet !== true || user.helpSeen !== false) return;
    setHelpVisible(true);
  }, [user?.helpSeen, user?.nameSet, user?.uid]);

  useEffect(() => {
    if (!user) return () => undefined;
    return subscribeUserNotifications(user, notificationSettings, (nextNotification) => {
      if (appState.current === "active") {
        setNotification(nextNotification);
        return;
      }
      void showPhoneNotification(nextNotification).catch(() => undefined);
    });
  }, [notificationSettings, user]);

  async function handleLogin(email: string, password: string, createAccount: boolean, displayName?: string) {
    setAuthError("");
    try {
      const appUser = createAccount ? await register(email, password, displayName) : await login(email, password);
      setUser(appUser);
      void maybeShowBugDexDrop(claimDailyLoginBug(appUser));
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
      void maybeShowBugDexDrop(claimDailyLoginBug(appUser));
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

  async function finishHelpTour() {
    setHelpVisible(false);
    if (!user || user.helpSeen === true) return;
    try {
      setUser(await markHelpSeen(user));
    } catch {
      setUser({ ...user, helpSeen: true });
    }
  }

  async function refreshUser() {
    if (!user) return;
    const synced = await syncEngagementPoints(user);
    const updated = await getUserById(synced.uid);
    if (updated) setUser(updated);
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

  async function handleForegroundBugCaught(xp: number, bugId: string, rarity: "common" | "rare" | "epic" | "legendary") {
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
      await claimMovementRadarBonuses(currentUser.uid);
    } catch {
      // Movement radar bonuses are optional and must never interrupt the app.
    } finally {
      movementCheckInProgress.current = false;
    }
  }

  async function checkForVersionUpdate() {
    if (versionCheckInProgress.current) return;
    const currentVersion = String(Application.nativeApplicationVersion || Constants.expoConfig?.version || "");
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
    if (!current.bugId) return;
    const bug = (await listBugs()).find((item) => item.id === current.bugId);
    if (!bug) return;
    setSelectedBug(bug);
    setRoute("detail");
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
    setSelectedUser(nextUser);
    setRoute(nextUser.uid === user?.uid ? "profile" : "userProfile");
    if (nextUser.uid !== user?.uid) rewardActivity("profile_view");
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
        {route === "home" && <HomeScreen user={user} onNavigate={setRoute} />}
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
              void refreshUser();
            }}
            onBugChanged={(bug) => {
              if (selectedBug?.status !== bug.status) {
                void notifyBugUpdate(selectedBug, bug, user).catch(() => undefined);
                if (bug.status === "Gefixt") rewardBugFixed(bug);
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
        {route === "leaderboard" && <LeaderboardScreen onBack={() => setRoute("home")} onSelectUser={openUserProfile} />}
        {route === "profile" && (
          <ProfileScreen
            user={user}
            onBack={() => setRoute("home")}
            onLogout={handleLogout}
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
        {route === "bugdex" && <BugDexScreen user={user} onBack={() => setRoute("home")} />}
        {route === "settings" && (
          <SettingsScreen settings={notificationSettings} onBack={() => setRoute("home")} onChange={updateNotificationSettings} onShowHelp={showHelpTour} />
        )}
      </View>
      <BottomNav activeRoute={route} onNavigate={navigateMain} />
      <InAppNotificationToast notification={notification} onClose={closeNotification} onOpen={openNotification} />
      <ForegroundCatchBug
        enabled={foregroundBugEnabled}
        forcedBugIds={pendingRadarBugIds}
        onCaught={(xp, bugId, rarity) => void handleForegroundBugCaught(xp, bugId, rarity)}
        onForcedBugConsumed={() => setPendingRadarBugIds((queue) => queue.slice(1))}
      />
      <BugDexUnlockModal drop={bugDexDrop} onClose={closeBugDexDrop} />
      <DisplayNameModal user={user} visible={Boolean(user && user.nameSet !== true)} onSave={handleDisplayNameSave} />
      <HelpTourOverlay visible={helpVisible && user.nameSet === true} onFinish={finishHelpTour} onNavigate={navigateHelp} />
      <BugSplatBonusOverlay visible={splatBonusVisible} onSkip={() => setSplatBonusVisible(false)} />
      <VersionToast notice={versionNotice} onDismiss={() => setVersionNotice(null)} />
    </SafeAreaView>
  );
}

function VersionToast({ notice, onDismiss }: { notice: VersionNotice | null; onDismiss: () => void }) {
  if (!notice) return null;
  const openUpdate = () => {
    void Linking.openURL(notice.releaseUrl).then(onDismiss).catch(() => undefined);
  };
  return (
    <View accessibilityLabel="Open latest release" style={styles.versionToast}>
      <Text style={styles.versionToastTitle}>Nieuwe versie beschikbaar</Text>
      <Text style={styles.versionToastText}>Tik voor versie {notice.latestVersion}.</Text>
      <View style={styles.versionToastActions}>
        <Pressable style={styles.versionToastSecondaryButton} onPress={onDismiss}>
          <Text style={styles.versionToastSecondaryText}>Later</Text>
        </Pressable>
        <Pressable style={styles.versionToastPrimaryButton} onPress={openUpdate}>
          <Text style={styles.versionToastPrimaryText}>Open release</Text>
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
