import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { AppNotification, BugComment, NotificationSettings, User } from "./src/types";
import { ensureUserDocument, getUserById, login, loginWithGoogle, logout, markHelpSeen, recordBugSplat, register, subscribeAuth, updateUserDisplayName } from "./src/services/userService";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BugListScreen } from "./src/screens/BugListScreen";
import { BugDetailScreen } from "./src/screens/BugDetailScreen";
import { NewBugScreen } from "./src/screens/NewBugScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { BugDexScreen } from "./src/screens/BugDexScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { BugReport } from "./src/types";
import { AppBackground } from "./src/components/AppBackground";
import { BottomNav } from "./src/components/BottomNav";
import { WalkingBugsLayer } from "./src/components/WalkingBugsLayer";
import { BugDexUnlockModal } from "./src/components/BugDexUnlockModal";
import { BugSplatBonusOverlay } from "./src/components/BugSplatBonusOverlay";
import { DisplayNameModal } from "./src/components/DisplayNameModal";
import { InAppNotificationToast } from "./src/components/InAppNotificationToast";
import { HelpTourOverlay } from "./src/components/HelpTourOverlay";
import { listBugs } from "./src/services/bugService";
import { BugDexDropResult, BugDexDropSource, claimDailyLoginBug, rollBugDexDrop } from "./src/services/bugDexService";
import { checkLatestVersion, VersionNotice } from "./src/services/versionService";
import {
  defaultNotificationSettings,
  getNotificationSettings,
  markNotificationRead,
  notifyBugUpdate,
  notifyComment,
  notifyNewBug,
  saveNotificationSettings,
  subscribeUserNotifications
} from "./src/services/notificationService";

export type RouteName = "home" | "bugs" | "new" | "detail" | "leaderboard" | "profile" | "userProfile" | "bugdex" | "settings";

export default function App() {
  const [route, setRoute] = useState<RouteName>("home");
  const [user, setUser] = useState<User | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [bugDexDrop, setBugDexDrop] = useState<BugDexDropResult | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [splatBonusVisible, setSplatBonusVisible] = useState(false);
  const [versionNotice, setVersionNotice] = useState<VersionNotice | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

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
    const currentVersion = String(Constants.expoConfig?.version || "");
    if (!currentVersion) return;
    void checkLatestVersion(currentVersion).then(setVersionNotice).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!versionNotice) return;
    const timeout = setTimeout(() => setVersionNotice(null), 4800);
    return () => clearTimeout(timeout);
  }, [versionNotice]);

  useEffect(() => {
    if (!user) return;
    void getNotificationSettings(user).then(setNotificationSettings);
  }, [user?.uid]);

  useEffect(() => {
    if (!user || user.nameSet !== true || user.helpSeen !== false) return;
    setHelpVisible(true);
  }, [user?.helpSeen, user?.nameSet, user?.uid]);

  useEffect(() => {
    if (!user) return () => undefined;
    return subscribeUserNotifications(user, notificationSettings, setNotification);
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
    const updated = await getUserById(user.uid);
    if (updated) setUser(updated);
  }

  async function maybeShowBugDexDrop(dropPromise: Promise<BugDexDropResult | null>) {
    try {
      const drop = await dropPromise;
      if (drop?.updatedUser) setUser(drop.updatedUser);
      if (drop) setBugDexDrop(drop);
    } catch {
      // BugDex rewards should never block core app actions.
    }
  }

  function rewardActivity(source: BugDexDropSource) {
    if (!user) return;
    void maybeShowBugDexDrop(rollBugDexDrop(user, source));
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

  function openSettings() {
    setSelectedBug(null);
    setSelectedUser(null);
    setRoute("settings");
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
        <VersionToast notice={versionNotice} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <View style={styles.fullScreen}>
        <LoginScreen error={authError} loading={authLoading} onGoogleSubmit={handleGoogleLogin} onSubmit={handleLogin} />
        <VersionToast notice={versionNotice} />
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
              rewardActivity("bug_reported");
              setSplatBonusVisible(true);
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
            }}
            onBugChanged={(bug) => {
              if (selectedBug?.status !== bug.status) {
                void notifyBugUpdate(selectedBug, bug, user).catch(() => undefined);
                rewardActivity(bug.status === "Gefixt" ? "bug_fixed" : "status_update");
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
        <Pressable
          accessibilityLabel="Instellingen"
          style={styles.settingsButton}
          onPress={openSettings}
          onTouchEnd={openSettings}
        >
          <View style={[styles.settingsSurface, route === "settings" && styles.settingsButtonActive]}>
            <Text style={[styles.settingsGear, route === "settings" && styles.settingsGearActive]}>⚙</Text>
          </View>
        </Pressable>
      </View>
      <BottomNav activeRoute={route} onNavigate={navigateMain} />
      <InAppNotificationToast notification={notification} onClose={closeNotification} onOpen={openNotification} />
      <BugDexUnlockModal drop={bugDexDrop} onClose={() => setBugDexDrop(null)} />
      <DisplayNameModal user={user} visible={Boolean(user && user.nameSet !== true)} onSave={handleDisplayNameSave} />
      <HelpTourOverlay visible={helpVisible && user.nameSet === true} onFinish={finishHelpTour} onNavigate={navigateHelp} />
      <BugSplatBonusOverlay visible={splatBonusVisible} onSplat={() => void handleBugSplat()} onSkip={() => setSplatBonusVisible(false)} />
      <VersionToast notice={versionNotice} />
    </SafeAreaView>
  );
}

function VersionToast({ notice }: { notice: VersionNotice | null }) {
  if (!notice) return null;
  return (
    <View style={styles.versionToast}>
      <Text style={styles.versionToastTitle}>Nieuwe versie beschikbaar</Text>
      <Text style={styles.versionToastText}>Versie {notice.latestVersion} staat op GitHub Releases.</Text>
    </View>
  );
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
    zIndex: 0
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  settingsButton: {
    alignItems: "center",
    elevation: 30,
    height: 52,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 52,
    zIndex: 1000
  },
  settingsSurface: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    width: 48
  },
  settingsButtonActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  settingsGear: {
    color: "#102018",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36
  },
  settingsGearActive: {
    color: "#d7bd57"
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
  }
});
