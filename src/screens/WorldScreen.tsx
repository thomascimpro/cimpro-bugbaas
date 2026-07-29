import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugWorldMap } from "../components/map/BugWorldMap";
import { loadBuddyState, type BuddyState } from "../services/bugBuddyService";
import { entryByBugId, listBugDexInventory, type BugDexDropResult } from "../services/bugDexService";
import { movementBoostWithBugLamp } from "../services/bugLampService";
import { bugProgressionCatalog } from "../services/bugProgressionCatalog";
import { listBugMastery } from "../services/bugMasteryService";
import { deriveJourneyStage } from "../services/playerJourneyModel";
import { listBugs } from "../services/bugService";
import { listBugSmashDuels } from "../services/bugSmashDuelService";
import { dailyMissionSet, type DailyMission } from "../services/dailyMissionService";
import { listFieldJournalEntries, type FieldJournalEntry, type FieldJournalHabitat } from "../services/fieldJournalService";
import { buildExpeditionRegionProgress, expeditionHabitats } from "../services/expeditionWorldProgress";
import { useI18n } from "../services/i18n";
import { loadSoloCampaignBossProgress, type SoloCampaignBossProgress } from "../services/missionProgressService";
import { getMovementRadarProgress, getQueuedRadarBugIds, type MovementRadarProgress } from "../services/movementRadarService";
import { getDailyRealBugScanProgress } from "../services/realBugScanProgress";
import { buildResearchTargetOptions, type ResearchTargetStatus } from "../services/researchTargetModel";
import { claimResearchEncounter, getResearchTargetStatus, startResearchTarget } from "../services/researchTargetService";
import { loadResearchFocusWing } from "../services/researchFocusService";
import type { ResearchFocusWing } from "../services/researchFocusModel";
import { getReleaseBossStatus, type ReleaseBossStatus } from "../services/releaseBossService";
import { loadSoloCampaignProgress } from "../services/soloCampaignProgressService";
import { activeBugSquadBonuses, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { getSwarmSiegeStatus, type SwarmSiegeStatus } from "../services/swarmSiegeService";
import { teamHuntActiveNow } from "../services/teamHuntService";
import { weeklyMissionSet, type WeeklyMission } from "../services/weeklyMissionService";
import { weeklyFieldSpotlight } from "../services/weeklyFieldSpotlightModel";
import { gameTheme } from "../theme/gameTheme";
import { screenPalette } from "../theme/screenTheme";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { BugDexInventoryItem, BugMastery, User } from "../types";
import { buildMuseumWings, type MuseumWingId } from "./MuseumScreenModel";
import { worldEventCards } from "./WorldScreenModel";
import type { BuddySummaryStatus } from "./world/BuddySummaryCard";
import { MissionOverviewModal } from "./world/MissionOverviewModal";
import { ResearchProgressCard } from "./world/ResearchProgressCard";
import { WeeklyFieldSpotlightCard } from "./world/WeeklyFieldSpotlightCard";
import { WorldBiomeHero } from "./world/WorldBiomeHero";
import { missionProgressSummary } from "./world/WorldTodayModel";

const swarmBossArt = require("../../assets/generated/release-boss-v1.jpg");
const worldSceneArt = require("../../assets/generated/expedition-world-v2.jpg");
const worldPalette = screenPalette("world");
const emptyBossProgress: SoloCampaignBossProgress = { dayCount: 0, dayId: "", updatedAt: "", weekCount: 0, weekId: "" };
const habitatWing: Record<FieldJournalHabitat, MuseumWingId> = {
  Tuin: "crawlers",
  Park: "wings",
  Water: "water",
  Nacht: "night",
  Kantoor: "crawlers",
  Binnen: "crawlers"
};
type WorldTab = "today" | "events" | "map";
type MissionTab = "daily" | "weekly";

type Props = {
  user: User;
  onStartScan: () => void;
  onOpenCollection: () => void;
  onOpenPlay: () => void;
  onOpenBuddy: () => void;
  onOpenTeamHunt: () => void;
  onOpenSwarmSiege: () => void;
  onOpenSeasonFinale: () => void;
  onClaimMovementRewards?: () => void | Promise<void>;
  onSyncMovement: () => void | Promise<void>;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

export function WorldScreen({ user, onStartScan, onOpenCollection, onOpenBuddy, onOpenTeamHunt, onOpenSwarmSiege, onOpenSeasonFinale, onClaimMovementRewards, onSyncMovement, onRewardDrop, onUserUpdated }: Props) {
  const { language, t } = useI18n();
  const layout = useResponsiveLayout();
  const usesSideLayout = layout.contentColumns > 1;
  const bottomPadding = layout.navigationMode === "rail" ? 24 : layout.bottomNavHeight + (layout.isTablet ? 20 : 12);
  const [tab, setTab] = useState<WorldTab>("today");
  const [entries, setEntries] = useState<FieldJournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<FieldJournalEntry>();
  const [swarmStatus, setSwarmStatus] = useState<SwarmSiegeStatus | null>(null);
  const [seasonFinaleStatus, setSeasonFinaleStatus] = useState<ReleaseBossStatus>();
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [masteries, setMasteries] = useState<BugMastery[]>([]);
  const [trackedHabitat, setTrackedHabitat] = useState<FieldJournalHabitat>();
  const [researchStatus, setResearchStatus] = useState<ResearchTargetStatus>({ options: [] });
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchFocusWing, setResearchFocusWing] = useState<ResearchFocusWing>();
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [missionTab, setMissionTab] = useState<MissionTab>("daily");
  const [buddyState, setBuddyState] = useState<BuddyState | null>(null);
  const [movementProgress, setMovementProgress] = useState<MovementRadarProgress | null>(null);
  const [queuedMovementRewards, setQueuedMovementRewards] = useState(0);
  const [movementClaiming, setMovementClaiming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const activeSquadIds = useMemo(() => sanitizeActiveBugSquad(user.activeBugSquad), [user.activeBugSquad]);
  const fallbackBuddyId = activeSquadIds[0] ?? "";
  const movementBoost = movementBoostWithBugLamp(user, activeBugSquadBonuses(user).movement_boost);

  useEffect(() => {
    let active = true;
    listFieldJournalEntries(user).then((items) => { if (active) setEntries(items); }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    getSwarmSiegeStatus(user).then((value) => { if (active) setSwarmStatus(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listBugs().catch(() => []),
      listBugSmashDuels(user).catch(() => []),
      listBugDexInventory(user).catch(() => []),
      loadSoloCampaignBossProgress(user.uid).catch(() => emptyBossProgress),
      loadSoloCampaignProgress(user.uid).catch(() => ({ wave: 1 })),
      getDailyRealBugScanProgress(user).catch(() => 0),
      listBugMastery(user).catch(() => [])
    ]).then(([bugs, duels, inventory, bossProgress, soloProgress, scanProgress, masteryItems]) => {
      if (!active) return;
      setInventory(inventory);
      setMasteries(masteryItems);
      setDailyMissions(dailyMissionSet(user, { bossProgress, duels, realBugScanProgress: scanProgress }));
      setWeeklyMissions(weeklyMissionSet(user, bugs, { bossProgress, duels, inventory, soloCampaignWave: soloProgress.wave }));
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    getReleaseBossStatus(user)
      .then((status) => { if (active) setSeasonFinaleStatus(status); })
      .catch(() => { if (active) setSeasonFinaleStatus(undefined); });
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    let active = true;
    loadResearchFocusWing(user.uid).then((wingId) => { if (active) setResearchFocusWing(wingId); }).catch(() => undefined);
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    let active = true;
    setResearchLoading(true);
    setResearchError("");
    getResearchTargetStatus(user)
      .then(async (status) => {
        if (!active) return;
        setResearchStatus(status);
        if (status.awardedBugId && !status.duplicate) {
          const nextInventory = await listBugDexInventory(user, { force: true }).catch(() => undefined);
          if (active && nextInventory) setInventory(nextInventory);
        }
      })
      .catch((error) => { if (active) setResearchError(error instanceof Error ? error.message : t("research.unavailable")); })
      .finally(() => { if (active) setResearchLoading(false); });
    return () => { active = false; };
  }, [t, user.uid]);

  useEffect(() => {
    let active = true;
    void refreshMovementProgress(user.uid, movementBoost).then(({ progress, queuedRewards }) => {
      if (!active) return;
      setMovementProgress(progress);
      setQueuedMovementRewards(queuedRewards);
    });
    return () => { active = false; };
  }, [movementBoost, user.uid]);

  useEffect(() => {
    let active = true;
    if (!fallbackBuddyId) {
      setBuddyState(null);
      return () => { active = false; };
    }
    const refresh = (preferCache: boolean) => {
      void loadBuddyState(user.uid, fallbackBuddyId, localDayId(), { preferCache })
        .then((state) => {
          if (!active) return;
          setBuddyState(activeSquadIds.includes(state.bugId) ? state : { ...state, bugId: fallbackBuddyId });
        })
        .catch(() => undefined);
    };
    refresh(false);
    const timer = setInterval(() => {
      setNow(Date.now());
      refresh(true);
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [activeSquadIds, fallbackBuddyId, user.uid]);

  const dailyProgress = missionProgressSummary(dailyMissions);
  const weeklyProgress = missionProgressSummary(weeklyMissions);
  const dailyWalkMission = dailyMissions.find((mission) => mission.title === "mission.dailyWalk1");
  const weeklyWalkMission = weeklyMissions
    .filter((mission) => mission.id.includes("-walk-"))
    .sort((a, b) => b.target - a.target)[0];
  const walkingRadarGoal = movementProgress?.goals.find((goal) => goal.id === "walking");
  const todayKm = walkingRadarGoal?.km ?? dailyWalkMission?.progress ?? 0;
  const walkGoalKm = walkingRadarGoal?.targetKm ?? dailyWalkMission?.target ?? 3;
  const weekKm = movementProgress?.estimatedWeekKm ?? weeklyWalkMission?.progress ?? 0;
  const claimableMovementRewards = Math.max(movementProgress?.claimableRewards ?? 0, queuedMovementRewards);
  const teamHuntActive = teamHuntActiveNow();
  const eventCards = worldEventCards({
    swarmActive: Boolean(swarmStatus?.active),
    swarmComplete: Boolean(swarmStatus?.complete),
    swarmState: swarmStatus?.state ?? "upcoming",
    teamHuntActive
  });
  const swarmPercent = swarmStatus ? Math.min(100, Math.round((swarmStatus.progress / Math.max(1, swarmStatus.target)) * 100)) : 0;
  const buddySummary = useMemo(() => buildBuddySummary(buddyState, fallbackBuddyId, now, t), [buddyState, fallbackBuddyId, now, t]);
  const ownedSpecies = useMemo(() => new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId)).size, [inventory]);
  const museumWings = useMemo(() => buildMuseumWings(inventory.filter((item) => item.count > 0), masteries, entries), [entries, inventory, masteries]);
  const masteryLevels = useMemo(() => Object.fromEntries(masteries.map((item) => [item.bugId, item.level])), [masteries]);
  const expeditionRegions = useMemo(() => expeditionHabitats.map((habitat) => buildExpeditionRegionProgress({
    coreSpeciesIds: bugProgressionCatalog.filter((definition) => definition.acquisition === "field" && definition.habitats.includes(habitat)).map((definition) => definition.bugId),
    entries,
    habitat,
    linkedWingStage: museumWings.find((wing) => wing.id === habitatWing[habitat])?.stage ?? "hidden",
    masteryLevels
  })), [entries, masteryLevels, museumWings]);
  const trackedRegion = expeditionRegions.find((region) => region.habitat === trackedHabitat) ?? expeditionRegions.find((region) => region.tier < 5) ?? expeditionRegions[0];
  const journeyStage = deriveJourneyStage({
    completedRegions: expeditionRegions.filter((region) => region.tier >= 5).length,
    masteredMuseumWings: museumWings.filter((wing) => wing.id !== "crown" && wing.stage === "master").length,
    masteredSpecies: masteries.filter((item) => item.level >= 20).length,
    ownedSpecies
  });
  useEffect(() => {
    if (!trackedHabitat && trackedRegion) setTrackedHabitat(trackedRegion.habitat);
  }, [trackedHabitat, trackedRegion]);
  const researchOptions = useMemo(() => buildResearchTargetOptions({
    context: {
      ...(entries[0]?.habitat ? { activeHabitat: entries[0].habitat } : {}),
      ...(researchFocusWing ? { activeMuseumWing: researchFocusWing } : {})
    },
    inventory,
    rotationKey: localDayId(),
    stage: journeyStage
  }), [entries, inventory, journeyStage, researchFocusWing]);
  const activeResearch = researchStatus.activeTarget && !researchStatus.activeTarget.claimedAt ? researchStatus.activeTarget : undefined;
  const weeklySpotlight = weeklyFieldSpotlight(new Date(now));
  const seasonFinaleVisible = seasonFinaleStatus?.state === "finale";
  function openMissions(nextTab: MissionTab) {
    setMissionTab(nextTab);
    setMissionsOpen(true);
  }

  async function syncMovement() {
    await onSyncMovement();
    const { progress, queuedRewards } = await refreshMovementProgress(user.uid, movementBoost);
    setMovementProgress(progress);
    setQueuedMovementRewards(queuedRewards);
  }

  async function claimMovementRewards() {
    if (movementClaiming) return;
    setMovementClaiming(true);
    try {
      await (onClaimMovementRewards ?? onSyncMovement)();
      const { progress, queuedRewards } = await refreshMovementProgress(user.uid, movementBoost);
      setMovementProgress(progress);
      setQueuedMovementRewards(queuedRewards);
    } finally {
      setMovementClaiming(false);
    }
  }

  async function chooseResearchTarget(bugId: string) {
    setResearchLoading(true);
    setResearchError("");
    try {
      setResearchStatus(await startResearchTarget(user, bugId));
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : t("research.unavailable"));
    } finally {
      setResearchLoading(false);
    }
  }

  async function continueResearch() {
    if (activeResearch?.completedAt) {
      setResearchLoading(true);
      setResearchError("");
      try {
        const status = await claimResearchEncounter(user);
        setResearchStatus(status);
        if (status.awardedBugId) {
          const nextInventory = await listBugDexInventory(user, { force: true }).catch(() => undefined);
          if (nextInventory) setInventory(nextInventory);
        }
      } catch (error) {
        setResearchError(error instanceof Error ? error.message : t("research.unavailable"));
      } finally {
        setResearchLoading(false);
      }
      return;
    }
    onStartScan();
  }

  return (
    <View style={[styles.screen, { maxWidth: layout.contentMaxWidth, paddingBottom: bottomPadding, paddingHorizontal: layout.gutter, paddingTop: layout.headerTop }]}>
      <View style={[styles.tabs, { maxWidth: layout.isTablet ? 620 : undefined, padding: layout.isTablet ? 5 : 3, width: layout.isTablet ? "62%" : "90%" }]}>
        {(["today", "events", "map"] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={({ pressed }) => [styles.tab, { minHeight: layout.isTablet ? 44 : 38 }, tab === item && styles.tabActive, pressed && styles.tabPressed]}>
            <Text style={[styles.tabText, { fontSize: layout.isTablet ? 12 : 10 }, tab === item && styles.tabTextActive]}>{t(`world.tab.${item}`)}</Text>
          </Pressable>
        ))}
      </View>

      <ImageBackground imageStyle={styles.sceneImage} resizeMode="cover" source={worldSceneArt} style={styles.scene}>
        <View style={styles.veil}>
          {tab === "today" ? (
            <ScrollView
              contentContainerStyle={[
                styles.todayScrollContent,
                {
                  padding: layout.isTablet ? 20 : 8,
                  paddingBottom: layout.navigationMode === "rail" ? 24 : layout.bottomNavHeight + 32
                }
              ]}
              showsVerticalScrollIndicator={false}
              style={styles.todayScroll}
            >
              <View style={styles.todayContent}>
                <View style={[styles.todayLayout, usesSideLayout && styles.todayLayoutWide]}>
                <View style={[styles.todayHeroColumn, usesSideLayout && styles.todayHeroColumnWide]}>
                  {trackedRegion ? (
                    <WorldBiomeHero
                      isCompact={layout.isCompact}
                      isTablet={layout.isTablet}
                      onSelectHabitat={setTrackedHabitat}
                      region={trackedRegion}
                      regions={expeditionRegions}
                      todayKm={todayKm}
                      walkGoalKm={walkGoalKm}
                      weekKm={weekKm}
                    />
                  ) : null}
                </View>
                <View style={[styles.quickGrid, usesSideLayout && styles.quickGridWide]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={movementClaiming}
                  onPress={() => { void (claimableMovementRewards > 0 ? claimMovementRewards() : syncMovement()); }}
                  style={({ pressed }) => [styles.quickAction, usesSideLayout && styles.quickActionWide, claimableMovementRewards > 0 && styles.quickActionReward, pressed && styles.quickActionPressed]}
                >
                  <Text style={styles.quickKicker}>{claimableMovementRewards > 0 ? "REWARD" : t("world.today.walking")}</Text>
                  <Text numberOfLines={1} style={styles.quickTitle}>{claimableMovementRewards > 0 ? `${claimableMovementRewards} ready` : `${todayKm.toFixed(1)}/${walkGoalKm.toFixed(1)} km`}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onOpenBuddy} style={({ pressed }) => [styles.quickAction, styles.quickBuddyAction, usesSideLayout && styles.quickActionWide, pressed && styles.quickActionPressed]}>
                  <View style={styles.quickBuddyRow}>
                    <View style={styles.quickBuddyCopy}>
                      <Text style={styles.quickKicker}>{t("world.buddy")}</Text>
                      <Text numberOfLines={1} style={styles.quickTitle}>{buddySummary.title}</Text>
                      <Text numberOfLines={1} style={styles.quickBuddyMeta}>{buddySummary.meta}</Text>
                      {typeof buddySummary.progress === "number" ? (
                        <View style={styles.quickBuddyTrack}>
                          <View style={[styles.quickBuddyFill, { width: `${buddySummary.progress}%` }]} />
                        </View>
                      ) : null}
                    </View>
                    {buddySummary.bugId ? <View style={styles.quickBuddyVisual}><BugArtImage bugId={buddySummary.bugId} size={36} /></View> : null}
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setResearchOpen(true)} style={({ pressed }) => [styles.quickAction, usesSideLayout && styles.quickActionWide, pressed && styles.quickActionPressed]}>
                  <Text style={styles.quickKicker}>{t("research.quick")}</Text>
                  <Text numberOfLines={1} style={styles.quickTitle}>{activeResearch ? `${activeResearch.progress}/${activeResearch.target}` : `${researchOptions.length} targets`}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => openMissions("daily")} style={({ pressed }) => [styles.quickAction, usesSideLayout && styles.quickActionWide, pressed && styles.quickActionPressed]}>
                  <Text style={styles.quickKicker}>{t("world.today.missions")}</Text>
                  <Text numberOfLines={1} style={styles.quickTitle}>{dailyProgress.done}/{dailyProgress.total} daily · {weeklyProgress.done}/{weeklyProgress.total} weekly</Text>
                </Pressable>
                </View>
              </View>
                <WeeklyFieldSpotlightCard bugIds={weeklySpotlight.bugIds} onStartScan={onStartScan} />
                {researchError ? <Text style={styles.inlineError}>{t("research.unavailable")}</Text> : null}
              </View>
            </ScrollView>
          ) : null}

          {tab === "events" ? (
            <View style={[styles.panelContent, { padding: layout.isTablet ? 20 : 14 }]}>
              <Text style={styles.kicker}>{t("world.events.kicker")}</Text>
              <Text style={[styles.title, { fontSize: layout.isTablet ? 32 : 26 }]}>{t("world.events.title")}</Text>
              <View style={[styles.eventList, usesSideLayout && styles.eventListWide]}>
                {seasonFinaleVisible ? (
                  <Pressable accessibilityRole="button" onPress={onOpenSeasonFinale} style={({ pressed }) => [styles.seasonFinaleCard, usesSideLayout && styles.eventCardWide, pressed && styles.seasonFinaleCardPressed]}>
                    <View style={styles.seasonFinaleCopy}>
                      <Text style={styles.seasonFinaleKicker}>{t("seasonFinale.kicker")}</Text>
                      <Text style={styles.seasonFinaleTitle}>{t("seasonFinale.title")}</Text>
                      <Text style={styles.seasonFinaleMeta}>{t("seasonFinale.progress", { current: seasonFinaleStatus?.progress ?? 0, target: seasonFinaleStatus?.target ?? 0 })}</Text>
                    </View>
                    <Text style={styles.seasonFinaleArrow}>›</Text>
                  </Pressable>
                ) : null}
                {eventCards.map((card) => {
                  if (card === "team-hunt") {
                    return <Pressable key={card} onPress={onOpenTeamHunt} style={[styles.eventCard, usesSideLayout && styles.eventCardWide]}><Text style={styles.eventTitle}>Team Hunt</Text><Text style={styles.eventMeta}>{t("world.events.active")}</Text></Pressable>;
                  }
                  const isLive = card === "swarm-live";
                  const isResult = card === "swarm-result";
                  const resultMeta = !swarmStatus || swarmStatus.personalDamage < 1
                    ? t("swarm.noContribution")
                    : swarmStatus.claimed
                      ? t("swarm.reward.claimed")
                      : t("swarm.reward.ready", { xp: swarmStatus.rewardXp });
                  const eventMeta = isLive
                    ? t(`swarm.phase.${swarmStatus?.phaseId ?? "signal_hunt"}`)
                    : isResult
                      ? resultMeta
                      : card === "swarm-preview"
                        ? t("swarm.previewHint")
                        : t("swarm.upcomingHint");
                  const actionLabel = isLive
                    ? t("swarm.attack", { count: swarmStatus?.attacksRemaining ?? 0 })
                    : isResult
                      ? t("swarm.viewResult")
                      : t("swarm.openEvent");
                  return (
                    <Pressable key={card} onPress={onOpenSwarmSiege} style={[styles.eventCard, styles.eventCardPrimary, usesSideLayout && styles.eventCardWide]}>
                      <ImageBackground source={swarmBossArt} imageStyle={styles.eventArtImage} resizeMode="cover" style={styles.eventArt}>
                        <View style={styles.eventShade} />
                        <View style={styles.eventHeader}>
                          <View style={styles.eventCopy}>
                            <View style={styles.eventStatusRow}>
                              <Text style={styles.eventKicker}>{isLive ? t("swarm.live") : isResult ? t("swarm.state.result") : card === "swarm-preview" ? t("swarm.state.preview") : t("swarm.upcoming")}</Text>
                              {isLive && swarmStatus?.endsAt ? (
                                <Text style={styles.eventCountdown}>{t("swarm.endsIn")} {formatDuration(new Date(swarmStatus.endsAt).getTime() - now)}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.eventTitle}>{t("swarm.title")}</Text>
                            <Text numberOfLines={2} style={styles.eventMeta}>{eventMeta}</Text>
                          </View>
                        </View>
                        <View style={styles.eventTrack}><View style={[styles.eventFill, { width: `${swarmPercent}%` }]} /></View>
                        {swarmStatus ? (
                          <>
                            <Text style={styles.eventProgress}>{t("swarm.communityGoal", { current: swarmStatus.progress, target: swarmStatus.target })}</Text>
                            <View style={styles.eventStats}>
                              <View style={styles.eventStat}><Text style={styles.eventStatValue}>{swarmStatus.attacksRemaining}/3</Text><Text style={styles.eventStatLabel}>{t("swarm.attacks")}</Text></View>
                              <View style={styles.eventStat}><Text style={styles.eventStatValue}>{swarmStatus.personalDamage}</Text><Text style={styles.eventStatLabel}>{t("swarm.personalLabel")}</Text></View>
                              <View style={styles.eventStat}><Text style={styles.eventStatValue}>{swarmStatus.personalDamage > 0 ? `+${swarmStatus.rewardXp}` : "—"}</Text><Text style={styles.eventStatLabel}>XP</Text></View>
                            </View>
                          </>
                        ) : null}
                        <View style={styles.eventAction}><Text style={styles.eventActionText}>{actionLabel}</Text><Text style={styles.eventActionArrow}>→</Text></View>
                      </ImageBackground>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {tab === "map" ? (
            <View style={[styles.panelContent, styles.mapPanelContent, { padding: layout.isTablet ? 20 : 10 }]}>
              <View style={styles.mapHeader}><View><Text style={styles.kicker}>{t("world.map.kicker")}</Text><Text style={[styles.title, { fontSize: layout.isTablet ? 32 : 24 }]}>{t("world.map.title")}</Text></View><Text style={[styles.mapScore, { fontSize: layout.isTablet ? 30 : 24 }]}>{entries.filter((entry) => entry.privateLocation || entry.locationCell).length}</Text></View>
              <BugWorldMap entries={entries} onSelectEntry={setSelectedEntry} onStartScan={onStartScan} />
              {selectedEntry ? <View style={styles.sightingSheet}>
                <View style={styles.sightingTop}><View><Text style={styles.sightingKicker}>{t("map.sighting.kicker")}</Text><Text style={styles.sightingTitle}>{selectedEntry.speciesName}</Text></View><Pressable onPress={() => setSelectedEntry(undefined)} style={styles.sightingClose}><Text style={styles.sightingCloseText}>×</Text></Pressable></View>
                <Text style={styles.sightingMeta}>{t(`journal.habitat.${selectedEntry.habitat}`)} · {selectedEntry.behavior} · {new Date(selectedEntry.observedAt).toLocaleDateString(language === "nl" ? "nl-NL" : language === "fr" ? "fr-FR" : "en-GB")}</Text>
                <Pressable onPress={onOpenCollection} style={styles.sightingAction}><Text style={styles.sightingActionText}>{t("map.sighting.openCollection")}</Text><Text style={styles.sightingActionText}>→</Text></Pressable>
              </View> : null}
            </View>
          ) : null}
        </View>
      </ImageBackground>
      <Modal animationType="slide" transparent visible={researchOpen} onRequestClose={() => setResearchOpen(false)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.quickKicker}>{t("research.sheetKicker")}</Text>
                <Text style={styles.detailTitle}>{t("research.sheetTitle")}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setResearchOpen(false)} style={styles.detailClose}>
                <Text style={styles.detailCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              <ResearchProgressCard
                activeTarget={activeResearch}
                loading={researchLoading}
                onChoose={(bugId) => { void chooseResearchTarget(bugId); }}
                onContinue={() => { setResearchOpen(false); void continueResearch(); }}
                options={researchOptions}
              />
              {researchError ? <Text style={styles.inlineError}>{researchError}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <MissionOverviewModal initialTab={missionTab} onClose={() => setMissionsOpen(false)} onUserUpdated={onUserUpdated} user={user} visible={missionsOpen} />
    </View>
  );
}

function buildBuddySummary(
  state: BuddyState | null,
  fallbackBugId: string,
  now: number,
  t: (key: string, params?: Record<string, string | number>) => string
): { bugId?: string; meta: string; progress?: number; status: BuddySummaryStatus; title: string } {
  if (!fallbackBugId) {
    return { meta: t("world.today.buddyEmpty"), status: "empty", title: t("world.today.buddyChoose") };
  }
  const bugId = state?.bugId || fallbackBugId;
  const entry = entryByBugId(bugId);
  const task = state?.care.activeTask;
  if (!task) {
    return { bugId, meta: t("world.today.buddyReadyMeta"), status: "ready", title: entry?.name ?? t("world.buddy") };
  }
  const label = t(`buddy.action.${task.action}.label`);
  if (task.endsAt <= now) {
    return { bugId, meta: t("world.today.buddyRewardMeta", { xp: task.xp }), progress: 100, status: "reward", title: label };
  }
  const duration = Math.max(1, task.endsAt - task.startedAt);
  const progress = Math.min(100, Math.max(0, Math.round(((now - task.startedAt) / duration) * 100)));
  return {
    bugId,
    meta: t("world.today.buddyRunningMeta", { time: formatDuration(task.endsAt - now) }),
    progress,
    status: "running",
    title: label
  };
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}u ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

async function refreshMovementProgress(uid: string, movementBoost: number): Promise<{ progress: MovementRadarProgress | null; queuedRewards: number }> {
  try {
    const [progress, queuedBugIds] = await Promise.all([
      getMovementRadarProgress(uid, movementBoost),
      getQueuedRadarBugIds()
    ]);
    return { progress, queuedRewards: queuedBugIds.length };
  } catch {
    return { progress: null, queuedRewards: 0 };
  }
}

function localDayId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  screen: { alignSelf: "center", flex: 1, minHeight: 0, paddingBottom: 88, paddingHorizontal: 12, paddingTop: 8, width: "100%" },
  tabs: { alignSelf: "center", backgroundColor: "rgba(243,237,220,0.94)", borderColor: worldPalette.border, borderRadius: gameTheme.radius.pill, borderWidth: 1, flexDirection: "row", marginBottom: 8, padding: 3, shadowColor: "#000000", shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.18, shadowRadius: 10, width: "90%" },
  tab: { alignItems: "center", borderRadius: gameTheme.radius.pill, flex: 1, minHeight: 38, justifyContent: "center" },
  tabActive: { backgroundColor: worldPalette.accent },
  tabPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  tabText: { color: worldPalette.muted, fontSize: 10, fontWeight: "900" },
  tabTextActive: { color: worldPalette.ink },
  scene: { backgroundColor: worldPalette.backgroundSoft, borderColor: worldPalette.border, borderRadius: gameTheme.radius.xl, borderWidth: 1, flex: 1, minHeight: 0, overflow: "hidden", shadowColor: "#000000", shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.22, shadowRadius: 14 },
  sceneImage: { opacity: 0.42 },
  veil: { backgroundColor: "rgba(11,36,27,0.42)", flex: 1 },
  todayScroll: { flex: 1 },
  todayScrollContent: { flexGrow: 1 },
  todayContent: { minHeight: 0, width: "100%" },
  todayLayout: { minHeight: 0 },
  todayLayoutWide: { flex: 1, flexDirection: "row", gap: 14 },
  todayHeroColumn: { minHeight: 0 },
  todayHeroColumnWide: { flex: 2 },
  todayHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  kicker: { color: worldPalette.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  todayTitle: { color: "#f7fff8", fontSize: 22, fontWeight: "900", marginTop: 2 },
  todayLive: { alignItems: "center", backgroundColor: "rgba(8,35,26,0.78)", borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  todayLiveDot: { color: "#78c762", fontSize: 8 },
  todayLiveText: { color: "#c8d8d0", fontSize: 8, fontWeight: "900" },
  inlineError: { color: "#ffb0a6", fontSize: 9, fontWeight: "800", marginTop: 7, textAlign: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  quickGridWide: { flex: 0.72, marginTop: 0 },
  quickAction: { backgroundColor: "rgba(9,43,32,0.94)", borderColor: "rgba(244,220,131,0.72)", borderRadius: 13, borderWidth: 1.5, flexBasis: "47%", flexGrow: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: 10, paddingVertical: 7, shadowColor: "#000000", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.24, shadowRadius: 6 },
  quickActionWide: { flexBasis: "auto", flexGrow: 1, minHeight: 72, width: "100%" },
  quickActionReward: { backgroundColor: "#f4dc92", borderColor: worldPalette.accent },
  quickActionPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  quickBuddyAction: { minHeight: 68 },
  quickBuddyCopy: { flex: 1, minWidth: 0 },
  quickBuddyFill: { backgroundColor: gameTheme.colors.success, borderRadius: 999, height: "100%" },
  quickBuddyMeta: { color: "rgba(247,255,248,0.72)", fontSize: 7.5, fontWeight: "800", marginTop: 2 },
  quickBuddyRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  quickBuddyTrack: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, height: 5, marginTop: 5, overflow: "hidden" },
  quickBuddyVisual: { alignItems: "center", backgroundColor: "rgba(244,220,131,0.16)", borderRadius: 11, height: 40, justifyContent: "center", overflow: "hidden", width: 40 },
  quickKicker: { color: gameTheme.colors.accentStrong, fontSize: 7, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  quickTitle: { color: "#f7fff8", fontSize: 10, fontWeight: "900", marginTop: 3 },
  missionAccess: { backgroundColor: "rgba(7,30,22,0.88)", borderColor: gameTheme.colors.border, borderRadius: 15, borderWidth: 1, marginTop: 8, padding: 9 },
  missionAccessLabel: { color: gameTheme.colors.accentStrong, fontSize: 8, fontWeight: "900", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  missionAccessActions: { flexDirection: "row", gap: 7 },
  missionAccessButton: { alignItems: "center", backgroundColor: gameTheme.colors.surfaceRaised, borderRadius: 11, flex: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 38, paddingHorizontal: 10 },
  missionAccessText: { color: gameTheme.colors.text, fontSize: 9, fontWeight: "900" },
  missionAccessCount: { color: gameTheme.colors.accentStrong, fontSize: 9, fontWeight: "900" },
  seasonFinaleCard: { alignItems: "center", backgroundColor: "rgba(84,45,122,0.95)", borderColor: "rgba(226,190,255,0.5)", borderRadius: 16, borderWidth: 1, flexDirection: "row", marginTop: 8, minHeight: 72, paddingHorizontal: 13, paddingVertical: 10 },
  seasonFinaleCardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  seasonFinaleCopy: { flex: 1, paddingRight: 10 },
  seasonFinaleKicker: { color: "#e2beff", fontSize: 7, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  seasonFinaleTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  seasonFinaleMeta: { color: "#d7c5df", fontSize: 8.5, fontWeight: "800", marginTop: 4 },
  seasonFinaleArrow: { color: "#ffffff", fontSize: 28, fontWeight: "900" },
  panelContent: { flexGrow: 1, minHeight: 0 },
  mapPanelContent: { flex: 1, minHeight: 0, paddingBottom: 6 },
  title: { color: "#f7fff8", fontSize: 26, fontWeight: "900", marginTop: 3, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 5 },
  scanAction: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderColor: "rgba(255,255,255,0.20)", borderRadius: 17, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 9, minHeight: 54, paddingHorizontal: 16 },
  scanActionPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  scanKicker: { color: "rgba(45,38,15,0.70)", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  scanTitle: { color: gameTheme.colors.accentInk, fontSize: 17, fontWeight: "900", marginTop: 1 },
  scanIcon: { color: gameTheme.colors.accentInk, fontSize: 29, fontWeight: "900" },
  eventList: { marginTop: 12 },
  eventListWide: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  eventCard: { backgroundColor: "#49351f", borderColor: worldPalette.border, borderRadius: 18, borderWidth: 1, marginBottom: 10, minHeight: 76, padding: 14 },
  eventCardWide: { flexBasis: "48%", flexGrow: 1, marginBottom: 0 },
  eventCardPrimary: { backgroundColor: worldPalette.background, borderColor: worldPalette.accent, minHeight: 268, overflow: "hidden", padding: 0 },
  eventArt: { flex: 1, minHeight: 268, padding: 15 },
  eventArtImage: { opacity: 0.72 },
  eventShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,18,11,0.67)" },
  eventHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  eventCopy: { flex: 1 },
  eventStatusRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eventKicker: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, color: gameTheme.colors.accentInk, fontSize: 8, fontWeight: "900", letterSpacing: 1, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  eventCountdown: { color: "#f7e7a2", fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  eventTitle: { color: "#ffffff", fontSize: 23, fontWeight: "900", marginTop: 10, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 5 },
  eventMeta: { color: "#dbe9df", fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 4, maxWidth: 250 },
  eventTrack: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, height: 9, marginTop: 14, overflow: "hidden" },
  eventFill: { backgroundColor: worldPalette.accent, borderRadius: 999, height: "100%" },
  eventProgress: { color: "#dbe9df", fontSize: 9, fontWeight: "900", marginTop: 6 },
  eventStats: { flexDirection: "row", gap: 7, marginTop: 11 },
  eventStat: { backgroundColor: "rgba(5,25,18,0.82)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 11, borderWidth: 1, flex: 1, minHeight: 49, paddingHorizontal: 8, paddingVertical: 7 },
  eventStatValue: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  eventStatLabel: { color: "#aebfb4", fontSize: 7.5, fontWeight: "900", marginTop: 2 },
  eventAction: { alignItems: "center", backgroundColor: worldPalette.accent, borderRadius: 13, flexDirection: "row", justifyContent: "space-between", marginTop: 11, minHeight: 45, paddingHorizontal: 13 },
  eventActionText: { color: worldPalette.ink, fontSize: 11, fontWeight: "900" },
  eventActionArrow: { color: worldPalette.ink, fontSize: 18, fontWeight: "900" },
  mapHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  mapScore: { color: worldPalette.accent, fontSize: 24, fontWeight: "900" },
  sightingSheet: { backgroundColor: "rgba(255,250,240,0.98)", borderColor: worldPalette.border, borderRadius: 18, borderWidth: 1, bottom: 66, left: 8, padding: 14, position: "absolute", right: 8 },
  sightingTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  sightingKicker: { color: "#8d6420", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  sightingTitle: { color: worldPalette.ink, fontSize: 18, fontWeight: "900", marginTop: 2 },
  sightingMeta: { color: worldPalette.muted, fontSize: 10, marginTop: 6 },
  sightingClose: { alignItems: "center", backgroundColor: worldPalette.accentSoft, borderRadius: 15, height: 30, justifyContent: "center", width: 30 },
  sightingCloseText: { color: worldPalette.ink, fontSize: 20, fontWeight: "900", lineHeight: 22 },
  sightingAction: { alignItems: "center", backgroundColor: worldPalette.accent, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", marginTop: 12, minHeight: 40, paddingHorizontal: 12 },
  sightingActionText: { color: worldPalette.ink, fontSize: 10, fontWeight: "900" },
  detailBackdrop: { backgroundColor: "rgba(2,12,8,0.76)", flex: 1, justifyContent: "flex-end" },
  detailSheet: { backgroundColor: worldPalette.surface, borderColor: worldPalette.border, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, maxHeight: "78%", minHeight: 340, overflow: "hidden" },
  detailHeader: { alignItems: "center", borderBottomColor: "rgba(178,141,69,0.35)", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 15 },
  detailTitle: { color: worldPalette.ink, fontSize: 20, fontWeight: "900", marginTop: 2 },
  detailClose: { alignItems: "center", backgroundColor: worldPalette.accentSoft, borderRadius: 15, height: 42, justifyContent: "center", width: 42 },
  detailCloseText: { color: worldPalette.ink, fontSize: 27, fontWeight: "700", lineHeight: 28 },
  detailBody: { padding: 14, paddingBottom: 30 }
});
