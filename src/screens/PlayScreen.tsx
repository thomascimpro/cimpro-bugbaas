import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { listBugDexUnlocks, type BugDexDropResult } from "../services/bugDexService";
import { loadBugBrainDailyStatus, type BugBrainDailyCompletion, type BugBrainDailyStatus } from "../services/bugBrainRewardService";
import { featuredArcadeMode } from "../services/featuredArcadeMode";
import { listBugSmashDuels, listOpenRandomBugSmashDuels } from "../services/bugSmashDuelService";
import { buildPlayUnlocks } from "../services/playUnlockModel";
import { useI18n } from "../services/i18n";
import type { BugSmashDuel, User } from "../types";
import { screenPalette } from "../theme/screenTheme";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { BugBrainScreen } from "./BugBrainScreen";
import { BugSmashDuelScreen } from "./BugSmashDuelScreen";
import { LeaderboardScreen } from "./LeaderboardScreen";
import { playTabs, type PlayTab } from "./PlayScreenModel";
import { encodePlaySessionSnapshot, readRecentPlaySession } from "../services/playSessionRecovery";

const playArt = {
  arcade: require("../../assets/generated/solo-duel-campaign-hd.jpg"),
  ranking: require("../../assets/generated/arena-training-mode-hd.jpg")
} as const;
const bugBrainKeeperArt = require("../../assets/characters/character-knowledge-keeper.png");
const bugBrainCatcherArt = require("../../assets/characters/character-lab-catcher.png");
const playPalette = screenPalette("play");
const playWorkspaceSessionKey = (uid: string) => `bugbaas:play-workspace:v3:${uid}`;
const playTabSessionKey = (uid: string) => `bugbaas:play-tab:v1:${uid}`;
const playRecoveryLocalKey = (uid: string) => `bugbaas:play-recovery:v1:${uid}`;

function initialPlaySession(uid: string, explicitlyOpen: boolean, initialTab: PlayTab): { open: boolean; tab: PlayTab } {
  if (explicitlyOpen || typeof window === "undefined") return { open: explicitlyOpen, tab: initialTab };
  try {
    if (window.sessionStorage.getItem(playWorkspaceSessionKey(uid)) === "open") {
      const storedTab = window.sessionStorage.getItem(playTabSessionKey(uid));
      return { open: true, tab: storedTab === "ranking" ? "ranking" : "arcade" };
    }
  } catch {
    // Safari private mode can disable session storage.
  }
  try {
    const recovered = readRecentPlaySession(window.localStorage.getItem(playRecoveryLocalKey(uid)));
    if (recovered?.open) return { open: true, tab: recovered.tab };
  } catch {
    // Safari private mode can also disable local storage.
  }
  return { open: false, tab: initialTab };
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function duelGameLabel(duel: BugSmashDuel, t: Translate): string {
  if (duel.arcadeMode === "bubble_swarm") return t("arcade.bubbleSwarm.title");
  if (duel.arcadeMode === "web_runner") return t("arcade.webRunner.title");
  if (duel.arcadeMode === "nest_defense") return t("arcade.nestDefense.title");
  if (duel.arcadeMode === "bug_glide") return t("arcade.bugGlide.title");
  if (duel.arcadeMode === "butterfly_catch") return t("arcade.butterflyCatch.title");
  if (duel.arcadeMode === "bug_tower") return t("arcade.bugTower.title");
  return t("arcade.tapDuel.title");
}

function duelActivityMeta(duel: BugSmashDuel, user: User, t: Translate): string {
  const ownScore = duel.scores?.[user.uid];
  const opponentId = duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
  const opponentScore = duel.scores?.[opponentId];
  const game = duelGameLabel(duel, t);
  if (ownScore && opponentScore) return `${game} · ${Math.max(0, ownScore.score)} - ${Math.max(0, opponentScore.score)}`;
  if (ownScore) return `${game} · ${t("duel.yourScore", { score: Math.max(0, ownScore.score) })}`;
  const openScore = duel.scores?.[duel.fromUserId];
  if (openScore) return `${game} · ${t("duel.openRandomScore", { score: Math.max(0, openScore.score) })}`;
  return `${game} · ${t(`duel.status.${duel.status}`)}`;
}

type Props = {
  user: User;
  initialDuelId?: string;
  initialOpponent?: User | null;
  initialTab?: PlayTab;
  onBack: () => void;
  onDuelAccepted?: (requesterId: string, duelId: string) => Promise<void>;
  onDuelRequest?: (recipientId: string, duelId: string) => Promise<void>;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onOpenCollection?: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onSelectUser: (user: User) => void;
  onUserUpdated?: (user: User) => void;
};

export function PlayScreen({
  user,
  initialDuelId = "",
  initialOpponent,
  initialTab = "arcade",
  onBack,
  onDuelAccepted,
  onDuelRequest,
  onFullscreenChange,
  onOpenCollection,
  onRewardDrop,
  onSelectUser,
  onUserUpdated
}: Props) {
  const { language, t } = useI18n();
  const layout = useResponsiveLayout();
  const { height: viewportHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const usesSideLayout = layout.contentColumns > 1;
  const [initialSession] = useState(() => initialPlaySession(user.uid, Boolean(initialDuelId || initialOpponent), initialTab));
  const [tab, setTab] = useState<PlayTab>(initialSession.tab);
  const heroHeight = layout.isTablet
    ? Math.min(520, Math.max(400, viewportHeight * 0.46))
    : tab === "arcade"
      ? Math.min(370, Math.max(270, viewportHeight * 0.42))
      : Math.min(270, Math.max(220, viewportHeight * 0.32));
  const heroResizeMode = layout.isTablet ? "cover" as const : "contain" as const;
  const bottomPadding = layout.navigationMode === "rail" ? 24 : layout.bottomNavHeight + (layout.isTablet ? 34 : 20);
  const [workspaceOpen, setWorkspaceOpen] = useState(initialSession.open);
  const [workspaceDuelId, setWorkspaceDuelId] = useState(initialDuelId);
  const [openDuels, setOpenDuels] = useState<BugSmashDuel[]>([]);
  const [recentDuels, setRecentDuels] = useState<BugSmashDuel[]>([]);
  const [openDuelsExpanded, setOpenDuelsExpanded] = useState(false);
  const [recentDuelsExpanded, setRecentDuelsExpanded] = useState(false);
  const [duelActivityLoading, setDuelActivityLoading] = useState(false);
  const [duelActivityError, setDuelActivityError] = useState("");
  const [rankedGameActive, setRankedGameActive] = useState(false);
  const [gameFullscreen, setGameFullscreen] = useState(false);
  const [bugBrainOpen, setBugBrainOpen] = useState(false);
  const [bugBrainActive, setBugBrainActive] = useState(false);
  const [bugBrainStatus, setBugBrainStatus] = useState<BugBrainDailyStatus | null>(null);
  const [discoveredSpecies, setDiscoveredSpecies] = useState(0);
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    listBugDexUnlocks(user).then((items) => {
      if (!active) return;
      setDiscoveredSpecies(new Set(items.map((item) => item.bugId)).size);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    void loadBugBrainDailyStatus(user)
      .then((status) => { if (active) setBugBrainStatus(status); })
      .catch(() => { if (active) setBugBrainStatus(null); });
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    glow.setValue(reduceMotion ? 0 : 0.18);
    if (reduceMotion) return;
    const animation = Animated.sequence([
      Animated.timing(glow, { duration: 520, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(glow, { duration: 680, easing: Easing.inOut(Easing.quad), toValue: 0.42, useNativeDriver: true })
    ]);
    animation.start();
    return () => animation.stop();
  }, [glow, reduceMotion, tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(playWorkspaceSessionKey(user.uid), workspaceOpen ? "open" : "closed");
      window.sessionStorage.setItem(playTabSessionKey(user.uid), tab);
    } catch {
      // Safari private mode can disable session storage.
    }
    try {
      window.localStorage.setItem(playRecoveryLocalKey(user.uid), encodePlaySessionSnapshot(workspaceOpen, tab));
    } catch {
      // Safari private mode can also disable local storage.
    }
  }, [tab, user.uid, workspaceOpen]);

  useEffect(() => {
    if (initialDuelId || initialOpponent || initialTab === "ranking") setTab(initialTab);
    setWorkspaceDuelId(initialDuelId);
    if (initialDuelId || initialOpponent) setWorkspaceOpen(true);
  }, [initialDuelId, initialOpponent, initialTab]);

  useEffect(() => {
    let active = true;
    setDuelActivityLoading(true);
    setDuelActivityError("");
    Promise.all([listOpenRandomBugSmashDuels(user), listBugSmashDuels(user)])
      .then(([nextOpen, nextRecent]) => {
        if (!active) return;
        setOpenDuels(nextOpen.slice(0, 6));
        setRecentDuels(nextRecent.filter((duel) => duel.status !== "cancelled" && duel.matchType !== "random").slice(0, 6));
      })
      .catch(() => {
        if (active) setDuelActivityError(t("duel.loadDuelsFailed"));
      })
      .finally(() => {
        if (active) setDuelActivityLoading(false);
      });
    return () => { active = false; };
  }, [user.uid]);

  const handleRankedActiveChange = useCallback((active: boolean) => {
    setRankedGameActive(active);
  }, []);
  const handleFullscreenChange = useCallback((active: boolean) => {
    setGameFullscreen(active);
    onFullscreenChange?.(active);
  }, [onFullscreenChange]);
  const workspaceCloseBlocked = rankedGameActive;

  const unlocks = useMemo(() => buildPlayUnlocks(discoveredSpecies), [discoveredSpecies]);
  const featuredMode = useMemo(() => featuredArcadeMode(unlocks.unlockedModes, localDayId()), [unlocks.unlockedModes]);
  const locked = tab === "ranking" && !unlocks.duelUnlocked;
  const heroTitle = tab === "arcade" ? t("play.arcade.title") : t("leaderboard.title");
  const heroMeta = tab === "arcade"
    ? `${unlocks.unlockedModes.length} games · ${discoveredSpecies} bugs ontdekt`
    : locked ? t("play.unlockSpecies", { count: 10, current: discoveredSpecies }) : t("leaderboard.subtitle");

  function closeBugBrain() {
    setBugBrainActive(false);
    setBugBrainOpen(false);
  }

  function handleBugBrainCompleted(completion: BugBrainDailyCompletion) {
    setBugBrainStatus({
      awardedXp: completion.awardedXp,
      correctAnswers: completion.correctAnswers,
      rewardBugId: completion.rewardBugId,
      rewardTier: completion.rewardTier,
      seed: bugBrainStatus?.seed ?? null,
      status: "completed"
    });
    if (completion.drop?.rewardType === "bug") {
      void listBugDexUnlocks(completion.user)
        .then((items) => setDiscoveredSpecies(new Set(items.map((item) => item.bugId)).size))
        .catch(() => undefined);
    }
  }

  const bugBrainCardMeta = bugBrainStatus?.status === "completed"
    ? `${bugBrainStatus.correctAnswers}/10 · +${bugBrainStatus.awardedXp} XP`
    : bugBrainStatus?.status === "active"
      ? (language === "nl" ? "Poging gestart · morgen nieuwe vragen" : language === "fr" ? "Tentative commencée · nouvelles questions demain" : "Attempt started · new questions tomorrow")
      : (language === "nl" ? "10 vragen · 30 sec per vraag · max 10 XP" : language === "fr" ? "10 questions · 30 sec chacune · 10 XP max" : "10 questions · 30 sec each · max 10 XP");
  const bugBrainAction = bugBrainStatus?.status === "completed"
    ? (language === "nl" ? "BEKIJK RESULTAAT" : language === "fr" ? "VOIR LE RÉSULTAT" : "VIEW RESULT")
    : bugBrainStatus?.status === "active"
      ? (language === "nl" ? "BEKIJK STATUS" : language === "fr" ? "VOIR LE STATUT" : "VIEW STATUS")
      : (language === "nl" ? "START QUIZ" : language === "fr" ? "COMMENCER" : "START QUIZ");

  function openArcadeWorkspace() {
    setWorkspaceDuelId("");
    setTab("arcade");
    setWorkspaceOpen(true);
  }

  function openRankingWorkspace() {
    setWorkspaceOpen(true);
  }

  function openDuel(duel: BugSmashDuel) {
    setWorkspaceDuelId(duel.id);
    setTab("arcade");
    setWorkspaceOpen(true);
  }

  function duelOpponentName(duel: BugSmashDuel) {
    return duel.fromUserId === user.uid ? duel.toUserName : duel.fromUserName;
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { maxWidth: layout.contentMaxWidth, paddingBottom: bottomPadding, paddingHorizontal: layout.gutter }]}
      showsVerticalScrollIndicator={false}
      style={styles.screenScroll}
    >
      <View style={[styles.header, { paddingTop: layout.isTablet ? 8 : 4 }]}>
        <View>
          <Text style={[styles.kicker, { fontSize: layout.isTablet ? 10 : 9 }]}>{t("play.kicker")}</Text>
          <Text style={[styles.title, { fontSize: layout.isTablet ? 29 : layout.isCompact ? 22 : 24 }]}>{t("play.title")}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.closeButton, { height: layout.touchTarget, width: layout.touchTarget }, pressed && styles.pressed]}>
          <GameUiIcon name="close" size={layout.isTablet ? 26 : 23} />
        </Pressable>
      </View>

      <View style={[styles.tabs, { borderRadius: layout.isTablet ? 18 : 16, marginTop: layout.isTablet ? 14 : 10, padding: layout.isTablet ? 6 : 4 }]}>
        {playTabs.map((item) => {
          const locked = item === "ranking" && !unlocks.duelUnlocked;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ disabled: locked, selected: tab === item }}
              key={item}
              onPress={() => setTab(item)}
              style={({ pressed }) => [styles.tab, { minHeight: layout.touchTarget }, tab === item && styles.tabActive, locked && styles.tabLocked, pressed && styles.pressed]}
            >
              <View style={styles.tabLabelRow}>
                {locked ? <View accessibilityElementsHidden style={styles.lockDot} /> : null}
                <Text style={[styles.tabText, { fontSize: layout.isTablet ? 13 : layout.isCompact ? 10 : 11 }, tab === item && styles.tabTextActive]}>{t(`play.tab.${item}`)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.content, usesSideLayout && styles.contentWide]}>
        <ImageBackground
          imageStyle={[styles.heroImage, !layout.isTablet && styles.heroImageMobile]}
          resizeMode={heroResizeMode}
          source={playArt[tab]}
          style={[styles.hero, !usesSideLayout && { flexBasis: heroHeight, flexGrow: 0, flexShrink: 0, height: heroHeight }]}
        >
          <View pointerEvents="none" style={styles.heroShade} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroGlow,
              {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }]
              }
            ]}
          />
          <View style={styles.heroTop}>
            <Text style={styles.modeKicker}>{t(`play.tab.${tab}`)}</Text>
            <View style={styles.speciesPill}><Text style={styles.speciesPillText}>{discoveredSpecies} BUGS ONTDEKT</Text></View>
          </View>
          <View style={styles.heroCopy}>
            <Text numberOfLines={2} style={[styles.heroTitle, layout.isCompact && styles.heroTitleCompact]}>{heroTitle}</Text>
            <Text numberOfLines={2} style={styles.heroMeta}>{heroMeta}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={locked}
            onPress={tab === "arcade" ? openArcadeWorkspace : openRankingWorkspace}
            style={({ pressed }) => [styles.primaryAction, locked && styles.primaryActionLocked, pressed && styles.primaryActionPressed]}
          >
            <Text style={styles.primaryActionText}>{locked ? "LOCKED" : tab === "ranking" ? "VIEW RANKING" : "PLAY NOW"}</Text>
            <GameUiIcon name="next" size={24} />
          </Pressable>
        </ImageBackground>
        <View style={[styles.progressRow, usesSideLayout && styles.progressRowWide]}>
          <View style={styles.progressItem}><Text style={styles.progressValue}>{unlocks.unlockedModes.length}/7</Text><Text style={styles.progressLabel}>GAMES</Text></View>
          <View style={[styles.progressDivider, usesSideLayout && styles.progressDividerWide]} />
          <View style={styles.progressItem}><Text style={styles.progressValue}>{user.duelWins ?? 0}</Text><Text style={styles.progressLabel}>WINS</Text></View>
          <View style={[styles.progressDivider, usesSideLayout && styles.progressDividerWide]} />
          <View style={styles.progressItem}><Text style={styles.progressValue}>{user.duelRating ?? 1000}</Text><Text style={styles.progressLabel}>RATING</Text></View>
        </View>
      </View>

      {tab === "arcade" ? (
        <>
          <Pressable
            accessibilityLabel="Bug Brain dagelijkse quiz"
            accessibilityRole="button"
            onPress={() => setBugBrainOpen(true)}
            style={({ pressed }) => [styles.bugBrainCard, layout.isTablet && styles.bugBrainCardTablet, pressed && styles.bugBrainCardPressed]}
          >
            <View pointerEvents="none" style={styles.bugBrainGlow} />
            <Image resizeMode="contain" source={bugBrainCatcherArt} style={[styles.bugBrainCatcher, layout.isTablet && styles.bugBrainCatcherTablet]} />
            <Image resizeMode="contain" source={bugBrainKeeperArt} style={[styles.bugBrainKeeper, layout.isTablet && styles.bugBrainKeeperTablet]} />
            <View style={styles.bugBrainCopy}>
              <View style={styles.bugBrainStatusRow}>
                <Text style={styles.bugBrainKicker}>{language === "nl" ? "DAGELIJKSE QUIZ" : language === "fr" ? "QUIZ QUOTIDIEN" : "DAILY QUIZ"}</Text>
                <Text style={styles.bugBrainAvailability}>{bugBrainStatus?.status === "completed" ? "✓" : "30s"}</Text>
              </View>
              <Text style={styles.bugBrainTitle}>Bug Brain</Text>
              <Text numberOfLines={1} style={styles.bugBrainMeta}>{bugBrainCardMeta}</Text>
              <Text numberOfLines={1} style={styles.bugBrainRewards}>{bugBrainAction} →</Text>
            </View>
          </Pressable>

          <View style={styles.duelActivityCard}>
            <Pressable accessibilityRole="button" onPress={() => setOpenDuelsExpanded((current) => !current)} style={styles.duelActivityHeader}>
              <Text style={styles.duelActivityTitle}>{t("duel.openRandom")}</Text>
              <Text style={styles.duelActivityChevron}>{openDuelsExpanded ? "v" : ">"}</Text>
            </Pressable>
            {openDuelsExpanded ? (
              <View>
                {duelActivityLoading ? <Text style={styles.duelActivityEmpty}>{t("duel.loading")}</Text> : null}
                {!duelActivityLoading && openDuels.length === 0 ? <Text style={styles.duelActivityEmpty}>{t("duel.noOpenRandomDuels")}</Text> : null}
                {openDuels.map((duel) => (
                  <Pressable key={duel.id} onPress={() => openDuel(duel)} style={({ pressed }) => [styles.duelActivityRow, pressed && styles.pressed]}>
                    <View style={styles.duelActivityCopy}>
                      <Text numberOfLines={1} style={styles.duelActivityName}>{duelOpponentName(duel)}</Text>
                      <Text style={styles.duelActivityMeta}>{duelActivityMeta(duel, user, t)}</Text>
                    </View>
                    <GameUiIcon name="next" size={20} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.duelActivityCard}>
            <Pressable accessibilityRole="button" onPress={() => setRecentDuelsExpanded((current) => !current)} style={styles.duelActivityHeader}>
              <Text style={styles.duelActivityTitle}>{t("duel.recent")}</Text>
              <Text style={styles.duelActivityChevron}>{recentDuelsExpanded ? "v" : ">"}</Text>
            </Pressable>
            {recentDuelsExpanded ? (
              <View>
                {duelActivityError ? <Text style={styles.duelActivityError}>{duelActivityError}</Text> : null}
                {!duelActivityLoading && recentDuels.length === 0 ? <Text style={styles.duelActivityEmpty}>{t("duel.noRecentDuels")}</Text> : null}
                {recentDuels.map((duel) => (
                  <Pressable key={duel.id} onPress={() => openDuel(duel)} style={({ pressed }) => [styles.duelActivityRow, pressed && styles.pressed]}>
                    <View style={styles.duelActivityCopy}>
                      <Text numberOfLines={1} style={styles.duelActivityName}>{duelOpponentName(duel)}</Text>
                      <Text style={styles.duelActivityMeta}>{duelActivityMeta(duel, user, t)}</Text>
                    </View>
                    <GameUiIcon name="next" size={20} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      <Modal animationType="slide" visible={workspaceOpen} onRequestClose={() => { if (!workspaceCloseBlocked) setWorkspaceOpen(false); }}>
        {workspaceOpen ? (
        <View style={styles.workspace}>
          {tab === "ranking" ? (
            <LeaderboardScreen currentUser={user} onBack={() => setWorkspaceOpen(false)} onSelectUser={onSelectUser} />
          ) : (
            <>
              {!gameFullscreen ? (
                <View style={styles.workspaceHeader}>
                  <Text style={styles.workspaceTitle}>{heroTitle}</Text>
                  {!workspaceCloseBlocked ? (
                    <Pressable accessibilityRole="button" onPress={() => setWorkspaceOpen(false)} style={styles.workspaceClose}>
                      <GameUiIcon name="close" size={24} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.workspaceBody}>
                <BugSmashDuelScreen
                  embedded
                  duelUnlocked={unlocks.duelUnlocked}
                  featuredArcadeMode={featuredMode}
                  ownedSpecies={discoveredSpecies}
                  soloCampaignUnlocked={unlocks.soloCampaignUnlocked}
                  unlockedArcadeModes={unlocks.unlockedModes}
                  initialDuelId={workspaceDuelId}
                  initialOpponent={initialOpponent}
                  onBack={() => setWorkspaceOpen(false)}
                  onDuelAccepted={onDuelAccepted}
                  onDuelRequest={onDuelRequest}
                  onEditSquad={onOpenCollection}
                  onFullscreenChange={handleFullscreenChange}
                  onRankedActiveChange={handleRankedActiveChange}
                  onRewardDrop={onRewardDrop}
                  onUserUpdated={onUserUpdated}
                  user={user}
                  workspaceTab={tab}
                />
              </View>
            </>
          )}
        </View>
        ) : null}
      </Modal>

      <Modal animationType="slide" visible={bugBrainOpen} onRequestClose={() => { if (!bugBrainActive) closeBugBrain(); }}>
        <View style={styles.bugBrainModal}>
          {!bugBrainActive ? (
            <View style={styles.bugBrainModalHeader}>
              <View>
                <Text style={styles.bugBrainModalKicker}>{language === "nl" ? "PLAY · ARCADE" : language === "fr" ? "PLAY · ARCADE" : "PLAY · ARCADE"}</Text>
                <Text style={styles.bugBrainModalTitle}>Bug Brain</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={closeBugBrain} style={styles.bugBrainModalClose}>
                <GameUiIcon name="close" size={24} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.bugBrainModalBody}>
            <BugBrainScreen
              onActiveChange={setBugBrainActive}
              onCompleted={handleBugBrainCompleted}
              onExit={closeBugBrain}
              onRewardDrop={onRewardDrop}
              onUserUpdated={onUserUpdated}
              user={user}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function localDayId(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: "Europe/Amsterdam", year: "numeric" }).format(date);
}

const styles = StyleSheet.create({
  screenScroll: { flex: 1, width: "100%" },
  screen: { alignSelf: "center", flexGrow: 1, minHeight: "100%", paddingHorizontal: 12, paddingBottom: 92, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 4 },
  kicker: { color: playPalette.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "900", marginTop: 2 },
  closeButton: { alignItems: "center", backgroundColor: "rgba(142,115,198,0.22)", borderColor: "rgba(255,189,74,0.34)", borderRadius: 14, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  closeText: { color: "#ffffff", fontSize: 26, lineHeight: 26 },
  tabs: { backgroundColor: "rgba(41,32,68,0.94)", borderColor: "rgba(255,189,74,0.34)", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 4, marginTop: 10, padding: 4, shadowColor: "#000000", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 9 },
  tab: { alignItems: "center", borderRadius: 12, flex: 1, minHeight: 38, justifyContent: "center" },
  tabActive: { backgroundColor: playPalette.accent },
  tabLocked: { opacity: 0.42 },
  tabLabelRow: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center" },
  lockDot: { backgroundColor: playPalette.accent, borderRadius: 3, height: 6, width: 6 },
  tabText: { color: "#cabedf", fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: playPalette.ink },
  content: { flexGrow: 0, gap: 9, marginTop: 8, minHeight: 0, overflow: "hidden" },
  contentWide: { flexDirection: "row", gap: 14 },
  hero: { backgroundColor: playPalette.backgroundSoft, borderColor: "rgba(255,189,74,0.62)", borderRadius: 24, borderWidth: 1, flex: 1, justifyContent: "space-between", minHeight: 0, overflow: "hidden", padding: 16, shadowColor: "#000000", shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.3, shadowRadius: 16 },
  heroImage: { opacity: 0.9 },
  heroImageMobile: { height: "48%", top: 0, width: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(19,15,37,0.52)" },
  heroGlow: { backgroundColor: "#9b78ec", borderRadius: 120, height: 220, position: "absolute", right: -84, top: -80, width: 220 },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", zIndex: 4 },
  modeKicker: { color: "#ffd77c", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  speciesPill: { backgroundColor: "rgba(31,22,58,0.86)", borderColor: "rgba(255,189,74,0.42)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  speciesPillText: { color: "#ffffff", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  heroCopy: { marginTop: "auto", maxWidth: 300, zIndex: 4 },
  heroTitle: { color: "#ffffff", fontSize: 31, fontWeight: "900", lineHeight: 34, textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { height: 2, width: 0 }, textShadowRadius: 6 },
  heroTitleCompact: { fontSize: 25, lineHeight: 28 },
  heroMeta: { color: "#ece3f5", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 6 },
  primaryAction: { alignItems: "center", backgroundColor: playPalette.accent, borderColor: "rgba(255,255,255,0.42)", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 18, minHeight: 54, paddingHorizontal: 16, zIndex: 4 },
  primaryActionLocked: { backgroundColor: "#8c978f", opacity: 0.8 },
  primaryActionPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  primaryActionText: { color: playPalette.ink, fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  primaryActionArrow: { color: playPalette.ink, fontSize: 22, fontWeight: "900" },
  progressRow: { alignItems: "center", backgroundColor: "rgba(41,32,68,0.96)", borderColor: "rgba(142,115,198,0.64)", borderRadius: 17, borderWidth: 1, flexDirection: "row", minHeight: 68, paddingHorizontal: 8 },
  progressRowWide: { flexDirection: "column", justifyContent: "space-around", minWidth: 190, paddingHorizontal: 12, paddingVertical: 16, width: "24%" },
  progressItem: { alignItems: "center", flex: 1 },
  progressValue: { color: "#ffffff", fontSize: 17, fontWeight: "900" },
  progressLabel: { color: "#c5b7d8", fontSize: 7.5, fontWeight: "900", letterSpacing: 0.8, marginTop: 2 },
  progressDivider: { backgroundColor: "rgba(255,255,255,0.12)", height: 30, width: 1 },
  progressDividerWide: { height: 1, width: "72%" },
  bugBrainCard: { backgroundColor: "rgba(31,22,58,0.98)", borderColor: "rgba(255,189,74,0.68)", borderRadius: 18, borderWidth: 1, height: 82, marginTop: 9, overflow: "hidden", paddingHorizontal: 13, paddingVertical: 9, shadowColor: "#000000", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.26, shadowRadius: 10 },
  bugBrainCardTablet: { height: 104, paddingHorizontal: 18, paddingVertical: 13 },
  bugBrainCardPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  bugBrainGlow: { backgroundColor: "rgba(155,120,236,0.30)", borderRadius: 999, height: 170, position: "absolute", right: -20, top: -54, width: 210 },
  bugBrainCopy: { maxWidth: "72%", zIndex: 3 },
  bugBrainStatusRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bugBrainKicker: { color: "#ffd77c", fontSize: 7.5, fontWeight: "900", letterSpacing: 1.1 },
  bugBrainAvailability: { backgroundColor: "rgba(15,10,31,0.78)", borderColor: "rgba(255,215,124,0.26)", borderRadius: 999, borderWidth: 1, color: "#ffe7a7", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 2 },
  bugBrainTitle: { color: "#ffffff", fontSize: 17, fontWeight: "900", letterSpacing: -0.3, marginTop: 2, textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  bugBrainMeta: { color: "#ddd3ed", fontSize: 8.5, fontWeight: "800", lineHeight: 11, marginTop: 2 },
  bugBrainRewards: { color: "#ffd77c", fontSize: 8, fontWeight: "900", letterSpacing: 0.35, marginTop: 2 },
  bugBrainKeeper: { bottom: -18, height: 104, position: "absolute", right: 2, width: 104, zIndex: 2 },
  bugBrainKeeperTablet: { bottom: -24, height: 142, right: 12, width: 142 },
  bugBrainCatcher: { bottom: 4, height: 52, opacity: 0.92, position: "absolute", right: 78, transform: [{ rotate: "-5deg" }], width: 52, zIndex: 1 },
  bugBrainCatcherTablet: { bottom: 8, height: 72, right: 118, width: 72 },
  duelActivityCard: { backgroundColor: "rgba(31,22,58,0.96)", borderColor: "rgba(142,115,198,0.52)", borderRadius: 18, borderWidth: 1, gap: 6, marginTop: 9, padding: 12 },
  duelActivityHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 34 },
  duelActivityTitle: { color: "#ffd77c", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  duelActivityChevron: { color: "#ffd77c", fontSize: 18, fontWeight: "900" },
  duelActivityRow: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", minHeight: 46, paddingHorizontal: 11, paddingVertical: 8 },
  duelActivityCopy: { flex: 1, marginRight: 8 },
  duelActivityName: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  duelActivityMeta: { color: "#cfc3df", fontSize: 9, fontWeight: "700", marginTop: 2 },
  duelActivityEmpty: { color: "#cfc3df", fontSize: 10, fontWeight: "700", paddingVertical: 4 },
  duelActivityError: { color: "#ffb4b4", fontSize: 10, fontWeight: "800", paddingVertical: 4 },
  bugBrainModal: { backgroundColor: playPalette.background, flex: 1 },
  bugBrainModalHeader: { alignItems: "center", backgroundColor: playPalette.backgroundSoft, borderBottomColor: "rgba(255,189,74,0.30)", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  bugBrainModalKicker: { color: playPalette.accent, fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  bugBrainModalTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900", marginTop: 1 },
  bugBrainModalClose: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  bugBrainModalBody: { flex: 1, minHeight: 0 },
  workspace: { backgroundColor: playPalette.background, flex: 1, minHeight: 0 },
  workspaceHeader: { alignItems: "center", backgroundColor: playPalette.backgroundSoft, borderBottomColor: "rgba(255,189,74,0.28)", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  workspaceTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  workspaceClose: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  workspaceCloseText: { color: "#ffffff", fontSize: 27, fontWeight: "700", lineHeight: 28 },
  workspaceBody: { flex: 1, minHeight: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }
});
