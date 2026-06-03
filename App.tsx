import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { User } from "./src/types";
import { ensureUserDocument, getUserById, login, loginWithGoogle, logout, register, subscribeAuth } from "./src/services/userService";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BugListScreen } from "./src/screens/BugListScreen";
import { BugDetailScreen } from "./src/screens/BugDetailScreen";
import { NewBugScreen } from "./src/screens/NewBugScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { BugReport } from "./src/types";
import { AppBackground } from "./src/components/AppBackground";
import { BottomNav } from "./src/components/BottomNav";
import { WalkingBugsLayer } from "./src/components/WalkingBugsLayer";

export type RouteName = "home" | "bugs" | "new" | "detail" | "leaderboard" | "profile";

export default function App() {
  const [route, setRoute] = useState<RouteName>("home");
  const [user, setUser] = useState<User | null>(null);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    return subscribeAuth(async (nextUser) => {
      try {
        if (nextUser) {
          const appUser = await ensureUserDocument(nextUser);
          setUser(appUser);
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

  async function handleLogin(email: string, password: string, createAccount: boolean) {
    setAuthError("");
    try {
      const appUser = createAccount ? await register(email, password) : await login(email, password);
      setUser(appUser);
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
      setRoute("home");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Google-login mislukt.");
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setSelectedBug(null);
    setRoute("home");
  }

  async function refreshUser() {
    if (!user) return;
    const updated = await getUserById(user.uid);
    if (updated) setUser(updated);
  }

  function navigateMain(nextRoute: "home" | "new" | "leaderboard") {
    setSelectedBug(null);
    setRoute(nextRoute);
  }

  if (!user) {
    return <LoginScreen error={authError} loading={authLoading} onGoogleSubmit={handleGoogleLogin} onSubmit={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.shell}>
      <AppBackground />
      <WalkingBugsLayer />
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
            onSaved={() => {
              void refreshUser();
              setRoute("home");
            }}
          />
        )}
        {route === "detail" && selectedBug && (
          <BugDetailScreen
            bug={selectedBug}
            user={user}
            onBack={() => setRoute("bugs")}
            onBugChanged={(bug) => {
              setSelectedBug(bug);
              void refreshUser();
            }}
          />
        )}
        {route === "leaderboard" && <LeaderboardScreen onBack={() => setRoute("home")} />}
        {route === "profile" && <ProfileScreen user={user} onBack={() => setRoute("home")} onLogout={handleLogout} />}
      </View>
      <BottomNav activeRoute={route} onNavigate={navigateMain} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#eef4ed"
  },
  content: {
    flex: 1,
    zIndex: 1
  }
});
