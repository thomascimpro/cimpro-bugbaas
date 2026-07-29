import React, { useEffect, useRef, useState } from "react";
import { Animated, DimensionValue, Easing, Image, ImageBackground, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteName } from "../../App";
import { nativeDriver } from "../services/animationPlatform";
import { BugArtImage } from "../components/BugArtImage";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { TierBadge } from "../components/TierBadge";
import { listBugs } from "../services/bugService";
import { dailyFieldSignal, dailyFieldSignalBody } from "../services/dailyFieldSignalService";
import { listFieldJournalEntries, type FieldJournalEntry } from "../services/fieldJournalService";
import { BugArtId } from "../services/bugArt";
import { BugDexDropResult, BugDexDropSource, entryByBugId, listBugDexInventory, listBugDexUnlocks } from "../services/bugDexService";
import { bugLampStatus } from "../services/bugLampService";
import { BuddyCareAction, BuddyCareState, applyBuddyCareAction, buddyActionRewardCount, buddyCareActions, buddyXpMultiplier, claimBuddyTaskReward, emptyBuddyCareState, loadBuddyState, saveBuddyState } from "../services/bugBuddyService";
import { awardBugMasteryXp, bugMasteryNextUnlockLevel, bugMasteryUnlockedSkills, bugMasteryXpForNextLevel, listBugMastery, normalizeBugMastery } from "../services/bugMasteryService";
import { maxActiveBugSquadSize, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { dismissPhoneNotification, scheduleBuddyTaskNotification } from "../services/notificationService";
import { listBugSmashDuels } from "../services/bugSmashDuelService";
import { claimMovementRadarBonusesForApp, claimQueuedRadarBugs, getMovementRadarProgress, getQueuedRadarBugIds, MovementRadarProgress } from "../services/movementRadarService";
import { MovementSyncSource } from "../services/movementSyncSource";
import { disconnectFitnessSyncer, FitnessSyncerStatus, getFitnessSyncerStatus, startFitnessSyncerConnection, syncFitnessSyncerActivities } from "../services/fitnessSyncerService";
import { bugDexEntries, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { languages, useI18n } from "../services/i18n";
import { rankForMetric, visibleRankUsers } from "../services/leaderboardRank";
import { listLeaderboardUsers } from "../services/userService";
import { loadSoloCampaignProgress } from "../services/soloCampaignProgressService";
import { claimedDailyMissionIds as fetchClaimedDailyMissionIds, claimDailyMissionBonusWithReward, claimDailyMissionReward, dailyMissionSet, dailyMissionSetComplete, isDailyMissionBonusClaimed } from "../services/dailyMissionService";
import { getDailyRealBugScanProgress } from "../services/realBugScanProgress";
import { loadSoloCampaignBossProgress, SoloCampaignBossProgress } from "../services/missionProgressService";
import { claimedWeeklyMissionIds, claimWeeklyMissionBonusWithReward, claimWeeklyMissionReward, isWeeklyMissionBonusClaimed, weeklyMissionLabel, weeklyMissionSet, weeklyMissionSetComplete } from "../services/weeklyMissionService";
import { BugDexInventoryItem, BugDexUnlock, BugMastery, BugReport, BugSmashDuel, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  movementBoost?: number;
  onActivateBugLamp?: () => Promise<void>;
  onMovementRadarClaimed?: (bugIds: BugArtId[]) => void;
  onMovementRegistered?: (estimatedKm: number, estimatedWeekKm?: number, source?: MovementSyncSource) => Promise<void>;
  onOpenBugDexWorkshop?: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
  user: User;
  onNavigate: (route: RouteName) => void;
};

type BuddyPopup =
  | { kind: "cancel" }
  | { actionId: BuddyCareAction; duration: string; kind: "confirm"; xp: number }
  | { kind: "info" }
  | { actionId: BuddyCareAction; body: string; drop?: BugDexDropResult | null; kind: "claimed" }
  | { actionId: BuddyCareAction; kind: "ready"; xp: number }
  | null;

function duelRating(user: User): number {
  const rating = Math.round(user.duelRating ?? 1000);
  return Number.isFinite(rating) ? Math.max(100, rating) : 1000;
}

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#2f9e44",
  Zeldzaam: "#228be6",
  Episch: "#9c36b5",
  Legendarisch: "#f59f00",
  Mythisch: "#ef4444"
};

const buddyStatColors: Record<BuddyStatKind, string> = {
  care: "#d7bd57",
  energy: "#38bdf8",
  happy: "#69c88d"
};

const buddyFeatureVisible = true;
const buddyHappyImage = require("../../assets/buddy/kenney/stats/stat_happy.webp");
const buddyEnergyImage = require("../../assets/buddy/kenney/stats/stat_energy.webp");
const buddyLoveImage = require("../../assets/buddy/kenney/emotes/buddy_love.png");
const buddyBondImage = require("../../assets/buddy/kenney/stats/stat_bond.webp");
const buddySleepyImage = require("../../assets/buddy/kenney/emotes/buddy_sleepy.png");
const buddyPetImage = require("../../assets/buddy/kenney/pets/buddy_bee.png");
const buddyStateCleanImage = require("../../assets/buddy/kenney/state/buddy_state_clean.png");
const buddyStateDigImage = require("../../assets/buddy/kenney/state/buddy_state_dig.png");
const buddyStateLeafImage = require("../../assets/buddy/kenney/state/buddy_state_leaf.png");
const buddyStateNectarImage = require("../../assets/buddy/kenney/state/buddy_state_nectar.png");
const buddyStateSleepImage = require("../../assets/buddy/kenney/state/buddy_state_sleep.png");
const buddyStateSwarmImage = require("../../assets/buddy/kenney/state/buddy_state_swarm.png");
const settingsGearImage = require("../../assets/generated/settings-gear-hd.png");
const wikiButtonImage = require("../../assets/generated/bugbaas-wiki-button-hd.jpg");
const homeHeroImage = require("../../assets/generated/home-conservatory-hero-v1.jpg");
const conservatoryGoalsImage = require("../../assets/generated/conservatory-goals-board-v1.jpg");
const bugBaasWikiUrl = "https://bugbaas-wiki.netlify.app";

export function HomeScreen({ movementBoost = 0, onActivateBugLamp, onMovementRadarClaimed, onMovementRegistered, onOpenBugDexWorkshop, onRewardDrop, onUserUpdated, user, onNavigate }: Props) {
  const { language, setLanguage, t, tr } = useI18n();
  const tier = getTierForPoints(user.totalPoints);
  const [users, setUsers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [fieldJournalEntries, setFieldJournalEntries] = useState<FieldJournalEntry[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [unlockHistory, setUnlockHistory] = useState<BugDexUnlock[]>([]);
  const [masteryByBugId, setMasteryByBugId] = useState<Record<string, BugMastery>>({});
  const [movementProgress, setMovementProgress] = useState<MovementRadarProgress | null>(null);
  const [queuedRadarBugIds, setQueuedRadarBugIds] = useState<BugArtId[]>([]);
  const [bugLampActivating, setBugLampActivating] = useState(false);
  const [movementClaiming, setMovementClaiming] = useState(false);
  const [fitnessSyncerStatus, setFitnessSyncerStatus] = useState<FitnessSyncerStatus | null>(null);
  const [fitnessSyncerBusy, setFitnessSyncerBusy] = useState(false);
  const [fitnessSyncerMessage, setFitnessSyncerMessage] = useState("");
  const [soloCampaignWave, setSoloCampaignWave] = useState(1);
  const [bossProgress, setBossProgress] = useState<SoloCampaignBossProgress>({ dayCount: 0, dayId: "", updatedAt: "", weekCount: 0, weekId: "" });
  const [realBugScanProgress, setRealBugScanProgress] = useState(0);
  const [claimedDailyIds, setClaimedDailyIds] = useState<Set<string>>(new Set());
  const [claimingDailyMissionId, setClaimingDailyMissionId] = useState("");
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);
  const [dailyBonusClaiming, setDailyBonusClaiming] = useState(false);
  const [dailyBonusError, setDailyBonusError] = useState("");
  const [claimedMissionIds, setClaimedMissionIds] = useState<Set<string>>(new Set());
  const [claimingMissionId, setClaimingMissionId] = useState("");
  const [weeklyBonusClaimed, setWeeklyBonusClaimed] = useState(false);
  const [weeklyBonusClaiming, setWeeklyBonusClaiming] = useState(false);
  const [weeklyBonusError, setWeeklyBonusError] = useState("");
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [buddyBugId, setBuddyBugId] = useState("");
  const [buddyCareState, setBuddyCareState] = useState<BuddyCareState>(() => emptyBuddyCareState(localDayId()));
  const [buddyBusyAction, setBuddyBusyAction] = useState("");
  const [buddyCardOpen, setBuddyCardOpen] = useState(false);
  const [buddyActionsOpen, setBuddyActionsOpen] = useState(false);
  const [buddyMessage, setBuddyMessage] = useState("");
  const [buddyPopup, setBuddyPopup] = useState<BuddyPopup>(null);
  const [buddySelectOpen, setBuddySelectOpen] = useState(false);
  const [buddyNow, setBuddyNow] = useState(() => Date.now());
  const buddyAnim = useRef(new Animated.Value(0)).current;
  const buddyReadyPopupKeyRef = useRef("");
  const rankedUsers = visibleRankUsers(users, user);
  const scoreRankedUsers = [...rankedUsers].sort((a, b) => b.totalPoints - a.totalPoints);
  const scoreLeaders = scoreRankedUsers.slice(0, 3);
  const duelRankedUsers = [...rankedUsers].sort((a, b) => duelRating(b) - duelRating(a));
  const duelLeaders = duelRankedUsers.slice(0, 3);
  const scoreRank = rankForMetric(rankedUsers, user.uid, (item) => item.totalPoints);
  const duelRank = rankForMetric(rankedUsers, user.uid, duelRating);
  const unlockedDexCount = Math.max(user.bugDexCount ?? 0, inventory.length, unlockHistory.length);
  const activeSquadIds = sanitizeActiveBugSquad(user.activeBugSquad, inventory);
  const activeSquadEntries = activeSquadIds
    .map((bugId) => entryByBugId(bugId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const buddyBugIds = Array.from(new Set([...activeSquadIds, ...inventory.map((item) => item.bugId)]));
  const buddyEntry = entryByBugId(buddyBugId) ?? buddyBugIds.map((bugId) => entryByBugId(bugId)).find((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const buddyMastery = buddyEntry ? masteryByBugId[buddyEntry.id] ?? normalizeBugMastery(buddyEntry.id) : null;
  const buddyCanStartHunt = !buddyCareState.activeTask;
  const buddyPendingTask = buddyCareState.activeTask;
  const buddyActiveTask = buddyPendingTask && buddyPendingTask.endsAt > buddyNow ? buddyPendingTask : undefined;
  const buddyFinishedTask = buddyPendingTask && buddyPendingTask.endsAt <= buddyNow ? buddyPendingTask : undefined;
  const buddyActiveAction = buddyActiveTask ? buddyCareActions.find((action) => action.id === buddyActiveTask.action) : undefined;
  const buddyTaskDuration = buddyActiveTask ? Math.max(1, buddyActiveTask.endsAt - buddyActiveTask.startedAt) : 1;
  const buddyTaskRemaining = buddyActiveTask ? Math.max(0, buddyActiveTask.endsAt - buddyNow) : 0;
  const buddyTaskProgress = buddyActiveTask ? Math.min(100, Math.max(0, Math.round(((buddyNow - buddyActiveTask.startedAt) / buddyTaskDuration) * 100))) : 0;
  const buddyReadyActions = buddyPendingTask ? [] : buddyCareActions.filter((action) => buddyNow - (buddyCareState.actions[action.id] ?? 0) >= action.cooldownMs && buddyHasEnergyForAction(buddyCareState.stats.energy, action.id));
  const buddyReadyCount = buddyReadyActions.length;
  const buddyPrimaryAction = buddyReadyActions[0] ?? null;
  const buddyCollapsedSignal = buddyActiveTask
    ? formatBuddyCooldown(buddyTaskRemaining)
    : buddyFinishedTask
      ? "BELONING"
      : buddyReadyCount > 0
        ? "KLAAR"
        : "RUST";
  const buddyMood = buddyCareState.stats.happy;
  const buddyEnergy = buddyCareState.stats.energy;
  const buddyBond = buddyCareState.stats.care;
  const buddyMultiplier = buddyXpMultiplier(buddyCareState.stats);
  const buddyStatus = buddyActiveAction ? t("buddy.status.active") : buddyFinishedTask ? t("buddy.status.rewardReady") : buddyReadyCount > 0 ? t("buddy.status.chooseHunt") : t("buddy.status.resting");
  const buddyMasteryNextXp = buddyEntry ? bugMasteryXpForNextLevel(buddyMastery?.level ?? 1, buddyEntry.rarity) : 1;
  const buddyMasteryQueuedXp = buddyActiveTask || buddyFinishedTask ? buddyCareState.activeTask?.xp ?? 0 : 0;
  const buddyMasteryProgressXp = Math.min(buddyMasteryNextXp, (buddyMastery?.xp ?? 0) + buddyMasteryQueuedXp);
  const buddyMotionStyle = buddyBeeMotionStyle(buddyActiveTask?.action, buddyAnim);
  const buddyProgress = Math.min(100, Math.round((buddyMasteryProgressXp / buddyMasteryNextXp) * 100));
  const buddyLastAction = buddyCareState.lastAction ? buddyActionLabel(buddyCareState.lastAction, t) : t("buddy.noAction");
  const dailyMissions = dailyMissionSet(user, { bossProgress, duels, realBugScanProgress });
  const dailyMissionIdsKey = dailyMissions.map((mission) => mission.id).join("|");
  const missions = weeklyMissionSet(user, bugs, { bossProgress, duels, inventory, soloCampaignWave });
  const missionIdsKey = missions.map((mission) => mission.id).join("|");
  const canClaimMovement = Boolean((movementProgress && movementProgress.claimableRewards > 0) || queuedRadarBugIds.length > 0);
  const selectedLanguage = languages.find((item) => item.value === language) ?? languages[0];
  const lampStatus = bugLampStatus(user);
  const fieldSignal = dailyFieldSignal(fieldJournalEntries);
  const showBugLamp = lampStatus.active || lampStatus.count > 0;

  useEffect(() => {
    listLeaderboardUsers({ complete: true, fresh: true }).then(setUsers);
    listBugs().then(setBugs);
    listFieldJournalEntries(user).then(setFieldJournalEntries).catch(() => setFieldJournalEntries([]));
    listBugSmashDuels(user).then(setDuels).catch(() => setDuels([]));
    listBugDexInventory(user).then(setInventory);
    listBugDexUnlocks(user).then(setUnlockHistory).catch(() => setUnlockHistory([]));
    listBugMastery(user).then((items) => setMasteryByBugId(Object.fromEntries(items.map((item) => [item.bugId, item])))).catch(() => setMasteryByBugId({}));
    loadSoloCampaignProgress(user.uid).then((progress) => setSoloCampaignWave(progress.wave)).catch(() => setSoloCampaignWave(1));
    loadSoloCampaignBossProgress(user.uid).then(setBossProgress).catch(() => undefined);
    getDailyRealBugScanProgress(user).then(setRealBugScanProgress).catch(() => setRealBugScanProgress(0));
  }, [user.uid]);

  useEffect(() => {
    refreshMovementProgress();
    getFitnessSyncerStatus().then(setFitnessSyncerStatus).catch(() => setFitnessSyncerStatus(null));
  }, [movementBoost, user.uid]);

  useEffect(() => {
    buddyAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(buddyAnim, {
          duration: buddyActiveTask ? 760 : 1700,
          easing: buddyActiveTask ? Easing.inOut(Easing.quad) : Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: nativeDriver
        }),
        Animated.timing(buddyAnim, {
          duration: buddyActiveTask ? 760 : 1700,
          easing: buddyActiveTask ? Easing.inOut(Easing.quad) : Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: nativeDriver
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [buddyActiveTask?.action, buddyAnim]);

  useEffect(() => {
    fetchClaimedDailyMissionIds(user, dailyMissions.map((mission) => mission.id)).then(setClaimedDailyIds).catch(() => setClaimedDailyIds(new Set()));
    isDailyMissionBonusClaimed(user).then(setDailyBonusClaimed).catch(() => setDailyBonusClaimed(false));
  }, [dailyMissionIdsKey, user.uid]);

  useEffect(() => {
    claimedWeeklyMissionIds(user, missions.map((mission) => mission.id)).then(setClaimedMissionIds).catch(() => setClaimedMissionIds(new Set()));
    isWeeklyMissionBonusClaimed(user, missions).then(setWeeklyBonusClaimed).catch(() => setWeeklyBonusClaimed(false));
  }, [missionIdsKey, user.uid]);

  useEffect(() => {
    const timer = setInterval(() => setBuddyNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!buddyFinishedTask || buddyBusyAction) return;
    const key = `${buddyFinishedTask.action}:${buddyFinishedTask.startedAt}:${buddyFinishedTask.endsAt}`;
    if (buddyReadyPopupKeyRef.current === key) return;
    buddyReadyPopupKeyRef.current = key;
    setBuddyCardOpen(true);
    setBuddyPopup({ actionId: buddyFinishedTask.action, kind: "ready", xp: buddyFinishedTask.xp });
  }, [buddyBusyAction, buddyFinishedTask?.action, buddyFinishedTask?.endsAt, buddyFinishedTask?.startedAt, buddyFinishedTask?.xp]);


  useEffect(() => {
    if (!buddyBugIds.length) return;
    let active = true;
    const day = localDayId();
    async function loadHomeBuddyState() {
      const state = await loadBuddyState(user.uid, buddyBugIds[0], day);
      const nextBuddyId = buddyBugIds.includes(state.bugId) ? state.bugId : buddyBugIds[0];
      if (!active) return;
      setBuddyBugId(nextBuddyId);
      setBuddyCareState(state.care);
      if (state.bugId !== nextBuddyId) await saveBuddyState(user.uid, { bugId: nextBuddyId, care: state.care, updatedAt: new Date().toISOString() }).catch(() => undefined);
    }
    void loadHomeBuddyState();
    return () => { active = false; };
  }, [buddyBugIds.join("|"), user.uid]);

  async function refreshMovementProgress() {
    try {
      const [progress, queuedBugIds] = await Promise.all([
        getMovementRadarProgress(user.uid, movementBoost),
        getQueuedRadarBugIds()
      ]);
      setMovementProgress(progress);
      setQueuedRadarBugIds(queuedBugIds);
    } catch {
      setMovementProgress(null);
      setQueuedRadarBugIds([]);
    }
  }

  async function handleMovementClaim() {
    if (movementClaiming) return;
    setMovementClaiming(true);
    try {
      const queuedBugIds = await claimQueuedRadarBugs();
      if (queuedBugIds.length > 0) {
        onMovementRadarClaimed?.(queuedBugIds);
        await refreshMovementProgress();
        return;
      }

      const result = await claimMovementRadarBonusesForApp(user.uid, movementBoost);
      if (result.estimatedKm > 0) await onMovementRegistered?.(result.estimatedKm, result.estimatedWeekKm);
      if (result.estimatedKm > 0) await awardWalkingBugMasteryXp(result.estimatedKm);
      if (result.bugIds.length > 0) {
        onMovementRadarClaimed?.(result.bugIds);
        await claimQueuedRadarBugs().catch(() => []);
      }
      await refreshMovementProgress();
    } catch {
      await refreshMovementProgress();
    } finally {
      setMovementClaiming(false);
    }
  }

  async function awardWalkingBugMasteryXp(estimatedKm: number) {
    const fullKmBuckets = Math.floor(Math.max(0, estimatedKm));
    const targetBuddyId = buddyEntry?.id;
    if (!fullKmBuckets || !targetBuddyId) return;
    const day = localDayId();
    const startBucket = Math.floor((movementProgress?.awardedToday ?? 0) * 1.5);
    await Promise.all(Array.from({ length: fullKmBuckets }, (_, index) =>
      awardBugMasteryXp(user, targetBuddyId, 12, "walking", `walking:${day}:${targetBuddyId}:${startBucket + index + 1}`).catch(() => null)
    ));
    const items = await listBugMastery(user).catch(() => []);
    setMasteryByBugId(Object.fromEntries(items.map((item) => [item.bugId, item])));
  }

  function confirmBuddyCare(actionId: BuddyCareAction) {
    const action = buddyCareActions.find((item) => item.id === actionId);
    if (!action) return;
    const previewStats = applyBuddyCareAction(buddyCareState.stats, actionId);
    const previewXp = Math.round(action.xp * buddyXpMultiplier(previewStats));
    setBuddyPopup({ actionId, duration: formatBuddyCooldown(action.cooldownMs), kind: "confirm", xp: previewXp });
  }

  async function handleFitnessSyncerConnect() {
    if (fitnessSyncerBusy) return;
    setFitnessSyncerBusy(true);
    setFitnessSyncerMessage("");
    try {
      await Linking.openURL(await startFitnessSyncerConnection());
    } catch (error) {
      setFitnessSyncerMessage(error instanceof Error ? error.message : "FitnessSyncer connection failed.");
    } finally {
      setFitnessSyncerBusy(false);
    }
  }

  async function handleFitnessSyncerSync() {
    if (fitnessSyncerBusy) return;
    setFitnessSyncerBusy(true);
    setFitnessSyncerMessage("");
    try {
      const result = await syncFitnessSyncerActivities();
      if (result.todayKm > 0 || result.weekKm > 0) await onMovementRegistered?.(result.todayKm, result.weekKm, "fitness_syncer");
      setFitnessSyncerMessage(t("settings.fitnessSynced", { km: formatKm(result.weekKm), steps: result.weekSteps.toLocaleString() }));
      setFitnessSyncerStatus(await getFitnessSyncerStatus());
      await refreshMovementProgress();
    } catch (error) {
      setFitnessSyncerMessage(error instanceof Error ? error.message : "FitnessSyncer sync failed.");
    } finally {
      setFitnessSyncerBusy(false);
    }
  }

  async function handleFitnessSyncerDisconnect() {
    if (fitnessSyncerBusy) return;
    setFitnessSyncerBusy(true);
    setFitnessSyncerMessage("");
    try {
      await disconnectFitnessSyncer();
      setFitnessSyncerStatus(await getFitnessSyncerStatus());
    } catch (error) {
      setFitnessSyncerMessage(error instanceof Error ? error.message : "FitnessSyncer disconnect failed.");
    } finally {
      setFitnessSyncerBusy(false);
    }
  }

  function showBuddySelectPopup() {
    if (buddyPendingTask) {
      setBuddyMessage(t("buddy.message.waitCurrent"));
      return;
    }
    if (!activeSquadEntries.length) {
      setBuddyMessage(t("buddy.message.needSquad"));
      return;
    }
    setBuddySelectOpen(true);
  }

  async function selectBuddy(nextId: string) {
    const day = localDayId();
    const currentState = buddyCareState.day === day ? buddyCareState : emptyBuddyCareState(day);
    setBuddyBugId(nextId);
    setBuddyCareState(currentState);
    setBuddyActionsOpen(false);
    setBuddySelectOpen(false);
    setBuddyMessage(t("buddy.message.selected"));
    await saveBuddyState(user.uid, { bugId: nextId, care: currentState, updatedAt: new Date().toISOString() }).catch(() => undefined);
  }

  function showBuddyInfo() {
    setBuddyPopup({ kind: "info" });
  }

  function confirmCancelBuddyTask() {
    const task = buddyCareState.activeTask;
    if (!task || buddyBusyAction) return;
    setBuddyPopup({ kind: "cancel" });
  }

  async function cancelBuddyTask() {
    const task = buddyCareState.activeTask;
    const target = buddyEntry;
    if (!task || !target || buddyBusyAction) return;
    setBuddyBusyAction("cancel");
    const nextState: BuddyCareState = {
      ...buddyCareState,
      lastXp: 0
    };
    delete nextState.activeTask;
    setBuddyCareState(nextState);
    setBuddyActionsOpen(false);
    try {
      if (task.notificationId) await dismissPhoneNotification(task.notificationId).catch(() => undefined);
      await saveBuddyState(user.uid, { bugId: target.id, care: nextState, updatedAt: new Date().toISOString() });
      setBuddyMessage(t("buddy.message.stoppedNoReward", { action: buddyActionLabel(task.action, t) }));
    } catch {
      setBuddyMessage(t("buddy.message.stopSaveFailed"));
    } finally {
      setBuddyBusyAction("");
    }
  }

  async function finishBuddyTask(openOptionsAfterClaim = false) {
    const task = buddyCareState.activeTask;
    const target = buddyEntry;
    if (!task || !target || task.endsAt > Date.now() || buddyBusyAction) return;
    setBuddyBusyAction("finish");
    const xp = task.xp;
    try {
      if (task.notificationId) await dismissPhoneNotification(task.notificationId).catch(() => undefined);
      const claim = await claimBuddyTaskReward(user, { bugId: target.id, care: buddyCareState, updatedAt: new Date().toISOString() });
      const { awardedXp, drop, masteryResult: result } = claim;
      setBuddyCareState(claim.state.care);
      if (drop?.updatedUser) onUserUpdated?.(drop.updatedUser);
      if (drop) {
        listBugDexInventory(user).then(setInventory).catch(() => undefined);
        listBugDexUnlocks(user).then(setUnlockHistory).catch(() => undefined);
      }
      const items = await listBugMastery(user).catch(() => []);
      setMasteryByBugId({
        ...Object.fromEntries(items.map((item) => [item.bugId, item])),
        [target.id]: result.mastery
      });
      setBuddyMessage(result.awarded ? t("buddy.message.doneXp", { action: buddyActionLabel(task.action, t), xp: awardedXp }) : t("buddy.message.capReached"));
      if (openOptionsAfterClaim) {
        setBuddyCardOpen(true);
        setBuddyActionsOpen(true);
      }
      setBuddyPopup({
        actionId: task.action,
        body: result.awarded ? buddyTaskClaimSummary(task.action, awardedXp, t, drop) : t("buddy.claim.capBody"),
        drop,
        kind: "claimed"
      });
    } catch (error) {
      console.error("Buddy claim failed", error);
      setBuddyCareState(buddyCareState);
      setBuddyMessage(t("buddy.message.xpSaveFailed", { action: buddyActionLabel(task.action, t) }));
    } finally {
      setBuddyBusyAction("");
    }
  }

  function closeBuddyPopup() {
    const popup = buddyPopup;
    setBuddyPopup(null);
    if (popup?.kind === "claimed" && popup.drop) onRewardDrop?.(popup.drop);
  }

  function openBuddyOptionsFromClaim() {
    closeBuddyPopup();
    setBuddyCardOpen(true);
    setBuddyActionsOpen(true);
  }

  async function handleBuddyCare(actionId: BuddyCareAction) {
    const action = buddyCareActions.find((item) => item.id === actionId);
    const target = buddyEntry;
    if (!action || !target || buddyBusyAction || buddyActiveTask) return;
    const now = Date.now();
    const day = localDayId();
    const currentState = buddyCareState.day === day ? buddyCareState : emptyBuddyCareState(day);
    const lastAt = currentState.actions[actionId] ?? 0;
    if (now - lastAt < action.cooldownMs) {
      setBuddyMessage(t("buddy.message.cooldown", { action: buddyActionLabel(actionId, t), time: formatBuddyCooldown(action.cooldownMs - (now - lastAt)) }));
      return;
    }
    const nextStats = applyBuddyCareAction(currentState.stats, actionId);
    const xp = Math.round(action.xp * buddyXpMultiplier(nextStats));
    const activeTask = { action: actionId, endsAt: now + action.cooldownMs, startedAt: now, xp };
    const nextState: BuddyCareState = {
      ...currentState,
      activeTask,
      actions: { ...currentState.actions, [actionId]: now },
      day,
      lastAction: actionId,
      lastAt: now,
      lastXp: 0,
      stats: nextStats
    };
    setBuddyBusyAction(actionId);
    setBuddyCareState(nextState);
    setBuddyMessage(t("buddy.message.starting", { action: buddyActionLabel(actionId, t) }));

    try {
      await saveBuddyState(user.uid, { bugId: target.id, care: nextState, updatedAt: new Date().toISOString() });
      setBuddyActionsOpen(false);
      setBuddyMessage(t("buddy.message.huntStarted"));

      const taskId = `buddy:${day}:${target.id}:${actionId}:${now}`;
      const notificationId = await scheduleBuddyTaskNotification({
        actionLabel: buddyActionLabel(actionId, t),
        body: buddyNotificationBody(actionId, xp, t),
        endsAt: activeTask.endsAt,
        taskId,
        xp
      }).catch(() => "");
      if (notificationId) {
        const savedState: BuddyCareState = { ...nextState, activeTask: { ...activeTask, notificationId } };
        setBuddyCareState(savedState);
        await saveBuddyState(user.uid, { bugId: target.id, care: savedState, updatedAt: new Date().toISOString() }).catch(() => undefined);
      }
    } catch {
      setBuddyMessage(t("buddy.message.syncPending"));
    } finally {
      setBuddyBusyAction("");
    }
  }

  async function rotateBuddy() {
    if (!buddyBugIds.length) return;
    const day = localDayId();
    const currentState = buddyCareState.day === day ? buddyCareState : emptyBuddyCareState(day);
    const currentIndex = Math.max(0, buddyBugIds.indexOf(buddyEntry?.id ?? buddyBugId));
    const nextId = buddyBugIds[(currentIndex + 1) % buddyBugIds.length];
    setBuddyBugId(nextId);
    setBuddyCareState(currentState);
    setBuddyMessage(t("buddy.message.switched"));
    await saveBuddyState(user.uid, { bugId: nextId, care: currentState, updatedAt: new Date().toISOString() }).catch(() => undefined);
  }

  async function handleActivateBugLamp() {
    if (bugLampActivating || !onActivateBugLamp) return;
    setBugLampActivating(true);
    try {
      await onActivateBugLamp();
      await refreshMovementProgress();
    } finally {
      setBugLampActivating(false);
    }
  }

  async function handleWeeklyMissionClaim(mission: typeof missions[number]) {
    if (claimingMissionId || mission.progress < mission.target || claimedMissionIds.has(mission.id)) return;
    setClaimingMissionId(mission.id);
    setWeeklyBonusError("");
    try {
      const result = await claimWeeklyMissionReward(user, mission);
      if (result?.user) onUserUpdated?.(result.user);
      if (result?.drop) {
        onRewardDrop?.(result.drop);
        listBugDexInventory(user).then(setInventory).catch(() => undefined);
      }
      const refreshed = await claimedWeeklyMissionIds(user, missions.map((item) => item.id));
      setClaimedMissionIds(refreshed);
      if (!refreshed.has(mission.id)) setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } catch {
      const refreshed = await claimedWeeklyMissionIds(user, missions.map((item) => item.id)).catch(() => claimedMissionIds);
      setClaimedMissionIds(refreshed);
      if (!refreshed.has(mission.id)) setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } finally {
      setClaimingMissionId("");
    }
  }

  async function handleDailyMissionClaim(mission: typeof dailyMissions[number]) {
    if (claimingDailyMissionId || mission.progress < mission.target || claimedDailyIds.has(mission.id)) return;
    setClaimingDailyMissionId(mission.id);
    setDailyBonusError("");
    try {
      const result = await claimDailyMissionReward(user, mission);
      if (result?.user) onUserUpdated?.(result.user);
      if (result?.drop) {
        onRewardDrop?.(result.drop);
        listBugDexInventory(user).then(setInventory).catch(() => undefined);
      }
      const refreshed = await fetchClaimedDailyMissionIds(user, dailyMissions.map((item) => item.id));
      setClaimedDailyIds(refreshed);
      if (!refreshed.has(mission.id)) setDailyBonusError(t("home.dailyBonusFailed"));
    } catch {
      const refreshed = await fetchClaimedDailyMissionIds(user, dailyMissions.map((item) => item.id)).catch(() => claimedDailyIds);
      setClaimedDailyIds(refreshed);
      if (!refreshed.has(mission.id)) setDailyBonusError(t("home.dailyBonusFailed"));
    } finally {
      setClaimingDailyMissionId("");
    }
  }

  async function handleDailyBonusClaim() {
    if (dailyBonusClaiming || dailyBonusClaimed || !dailyMissionSetComplete(dailyMissions)) return;
    setDailyBonusClaiming(true);
    setDailyBonusError("");
    try {
      const result = await claimDailyMissionBonusWithReward(user, dailyMissions);
      if (!result) {
        setDailyBonusClaimed(await isDailyMissionBonusClaimed(user));
        return;
      }
      onUserUpdated?.(result.user);
      onRewardDrop?.(result.drop);
      setDailyBonusClaimed(true);
      listBugDexInventory(user).then(setInventory).catch(() => undefined);
    } catch {
      setDailyBonusError(t("home.dailyBonusFailed"));
    } finally {
      setDailyBonusClaiming(false);
    }
  }

  async function handleWeeklyBonusClaim() {
    if (weeklyBonusClaiming || weeklyBonusClaimed || !weeklyMissionSetComplete(missions)) return;
    setWeeklyBonusClaiming(true);
    setWeeklyBonusError("");
    try {
      const result = await claimWeeklyMissionBonusWithReward(user, missions);
      if (!result) {
        setWeeklyBonusClaimed(await isWeeklyMissionBonusClaimed(user, missions));
        return;
      }
      onUserUpdated?.(result.user);
      onRewardDrop?.(result.drop);
      setWeeklyBonusClaimed(true);
    } catch {
      setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } finally {
      setWeeklyBonusClaiming(false);
    }
  }

  function openBugBaasWiki() {
    void Linking.openURL(bugBaasWikiUrl);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={homeHeroImage} style={styles.hero}>
        <View style={styles.heroVeil}>
        <View style={styles.heroNameRow}>
          <View style={styles.heroText}>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.62} numberOfLines={1} style={[sharedStyles.title, styles.heroTitle]}>{user.displayName}</Text>
            <Text style={styles.scoreText}>{tr(user.title)}</Text>
          </View>
          <View style={styles.heroActions}>
            <View style={styles.languageWrap}>
              <Pressable style={styles.languagePill} onPress={() => setLanguageOpen((current) => !current)}>
                <Text style={styles.languageFlag}>{selectedLanguage.flag}</Text>
              </Pressable>
              {languageOpen && (
                <View style={styles.languageMenu}>
                  {languages.filter((item) => item.value !== language).map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityLabel={`${t("language.label")} ${item.label}`}
                      style={styles.languageOption}
                      onPress={() => {
                        setLanguage(item.value);
                        setLanguageOpen(false);
                      }}
                    >
                      <Text style={styles.languageFlag}>{item.flag}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <Pressable accessibilityLabel={t("home.profile")} accessibilityRole="button" hitSlop={8} style={styles.profilePill} onPress={() => onNavigate("profile")}>
              <CharacterAvatarImage characterId={user.characterId} size={36} />
            </Pressable>
            <Pressable accessibilityLabel={t("home.settings")} accessibilityRole="button" hitSlop={8} style={styles.settingsPill} onPress={() => onNavigate("settings")}>
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={settingsGearImage} style={styles.settingsImage} />
            </Pressable>
          </View>
        </View>
        </View>
      </ImageBackground>
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.statValue}>{unlockedDexCount}/{bugDexEntries.length}</Text>
          <Text style={styles.statLabel}>BugDex unlocked</Text>
        </View>
        <View style={styles.statTile}>
          <View style={styles.rankStatLine}>
            <Text style={styles.rankStatLabel}>Score</Text>
            <Text style={styles.rankStatValue}>#{scoreRank}</Text>
          </View>
          <View style={styles.rankStatLine}>
            <Text style={styles.rankStatLabel}>Duel</Text>
            <Text style={styles.rankStatValue}>#{duelRank}</Text>
          </View>
        </View>
        <View style={styles.statTile}>
          <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={Math.max(34, tier.bugSize * 0.5)} />
          <Text style={styles.statLabel}>{tr(tier.title)}</Text>
        </View>
      </View>
      <ImageBackground source={conservatoryGoalsImage} resizeMode="cover" imageStyle={styles.goalsImage} style={styles.goalsCard}>
        <View style={styles.goalsVeil}>
          <Text style={styles.goalsKicker}>BUGBAAS 3.0 · TODAY</Text>
          <Text style={styles.goalsTitle}>{fieldSignal.completed ? "Today's discovery is safe" : "Your next real-world discovery"}</Text>
          <Text style={styles.goalsBody}>{fieldSignal.completed ? "Your Field Journal now feeds your private world and collection." : dailyFieldSignalBody(fieldSignal)}</Text>
          <View style={styles.goalContract}>
            <Text style={styles.goalContractLabel}>DO</Text><Text style={styles.goalContractText}>{fieldSignal.completed ? "Explore your private world" : "Photograph one real insect"}</Text>
            <Text style={styles.goalContractLabel}>UNLOCK</Text><Text style={styles.goalContractText}>{fieldSignal.completed ? "Your next collection milestone" : "A Field Journal note and biome progress"}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start today's field signal" onPress={() => onNavigate(fieldSignal.completed ? "home" : "realBugScan")} style={styles.goalsPrimaryAction}>
            <Text style={styles.goalsPrimaryText}>{fieldSignal.completed ? "Explore Expedition World" : "Scan a real bug"}</Text><Text style={styles.goalsPrimaryArrow}>→</Text>
          </Pressable>
          <View style={styles.goalsShortcuts}>
            <Pressable accessibilityRole="button" onPress={() => onNavigate("home")} style={styles.goalsShortcut}><Text style={styles.goalsShortcutLabel}>EXPLORE</Text><Text style={styles.goalsShortcutText}>World & teams</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onNavigate("bugdex")} style={styles.goalsShortcut}><Text style={styles.goalsShortcutLabel}>COLLECT</Text><Text style={styles.goalsShortcutText}>{unlockedDexCount}/{bugDexEntries.length} BugDex</Text></Pressable>
          </View>
        </View>
      </ImageBackground>
      {movementProgress && (
        <View style={styles.movementCard}>
          <View style={styles.movementHeader}>
            <Text style={styles.movementTitle}>{t("home.movementRadar")}</Text>
            <View style={styles.movementHeaderActions}>
              <Text style={styles.movementReward}>{t("home.bugsReward", { awarded: movementProgress.awardedToday, max: movementProgress.maxRewards })}</Text>
              {canClaimMovement && (
                <Pressable
                  disabled={movementClaiming}
                  onPress={handleMovementClaim}
                  style={({ pressed }) => [
                    styles.movementClaimButton,
                    pressed && styles.movementClaimButtonPressed,
                    movementClaiming && styles.movementClaimButtonDisabled
                  ]}
                >
                  <Text style={styles.movementClaimText}>{movementClaiming ? "..." : t("home.claim")}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.movementGoals}>
            {movementProgress.goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.km / goal.targetKm) * 100));
              return (
                <View key={goal.id} style={styles.movementGoal}>
                  <View style={styles.movementLine}>
                    <Text style={styles.movementLabel}>{movementGoalLabel(goal, t)}</Text>
                    <Text style={styles.movementKm}>{formatKm(goal.km)}/{formatKm(goal.targetKm)} km</Text>
                  </View>
                  <View style={styles.movementTrack}>
                    <View style={[styles.movementFill, { width: `${progress}%` as DimensionValue }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
      {fitnessSyncerStatus?.configured && (
        <View style={[styles.movementCard, styles.fitnessSyncerCard]}>
          <View style={styles.fitnessSyncerHeader}>
            <View style={styles.fitnessSyncerCopy}>
              <Text style={styles.movementTitle}>FitnessSyncer</Text>
              <Text style={styles.fitnessSyncerMeta}>
                {fitnessSyncerStatus.connected
                  ? fitnessSyncerStatus.lastSyncAt ? `Last sync ${formatShortDateTime(fitnessSyncerStatus.lastSyncAt)}` : "Connected"
                  : "Import walking, running, and cycling distance on web."}
              </Text>
            </View>
            <Pressable
              disabled={fitnessSyncerBusy}
              onPress={fitnessSyncerStatus.connected ? handleFitnessSyncerSync : handleFitnessSyncerConnect}
              style={[styles.movementClaimButton, fitnessSyncerBusy && styles.movementClaimButtonDisabled]}
            >
              <Text style={styles.movementClaimText}>{fitnessSyncerBusy ? "..." : fitnessSyncerStatus.connected ? "Sync" : "Connect"}</Text>
            </Pressable>
          </View>
          {fitnessSyncerMessage ? <Text style={styles.fitnessSyncerMessage}>{fitnessSyncerMessage}</Text> : null}
          {fitnessSyncerStatus.connected && (
            <Pressable disabled={fitnessSyncerBusy} onPress={handleFitnessSyncerDisconnect}>
              <Text style={styles.fitnessSyncerDisconnect}>Disconnect FitnessSyncer</Text>
            </Pressable>
          )}
        </View>
      )}
      {showBugLamp && (
        <View style={[styles.movementCard, styles.bugLampCard]}>
          <View style={styles.bugLampHeader}>
            <View style={styles.bugLampIcon}>
              <Text style={styles.bugLampIconText}>L</Text>
            </View>
            <View style={styles.bugLampText}>
              <Text style={[styles.movementTitle, styles.bugLampTitle]}>{t("home.bugLamp")}</Text>
              <Text style={styles.bugLampMeta}>
                {lampStatus.active ? t("home.bugLampActive", { time: formatRemaining(lampStatus.remainingMs) }) : t("home.bugLampCount", { count: lampStatus.count })}
              </Text>
            </View>
            {!lampStatus.active && lampStatus.count > 0 && (
              <Pressable
                disabled={bugLampActivating}
                onPress={handleActivateBugLamp}
                style={({ pressed }) => [
                  styles.bugLampButton,
                  pressed && styles.movementClaimButtonPressed,
                  bugLampActivating && styles.movementClaimButtonDisabled
                ]}
              >
                <Text style={styles.bugLampButtonText}>{bugLampActivating ? "..." : t("home.activate")}</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.bugLampEffect}>{t("home.bugLampEffect")}</Text>
        </View>
      )}
      <View style={[styles.stage, styles.stageHidden]}>
        {userTiers.map((item) => {
          const current = item.title === tier.title;
          return (
            <View key={item.title} style={[styles.stageTierItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageTierItemActive]}>
              <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
              <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.58)} />
              <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                <Text style={[styles.stageStar, { color: item.frameColor }]}>★</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.tierWrap}>
        <TierBadge points={user.totalPoints} />
      </View>
      <Pressable style={styles.tierToggle} onPress={() => setShowAllTiers((current) => !current)}>
        <Text style={styles.tierToggleText}>{t("home.showAllTiers")}</Text>
      </Pressable>
      {showAllTiers && (
        <View style={styles.stage}>
          {userTiers.map((item) => {
            const current = item.title === tier.title;
            return (
              <View key={item.title} style={[styles.stageTierItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageTierItemActive]}>
                <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
                <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.58)} />
                <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                  <Text style={[styles.stageStar, { color: item.frameColor }]}>*</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Pressable style={styles.rankingCard} onPress={() => onNavigate("leaderboard")}>
        <View style={styles.rankingHeader}>
          <Text style={styles.sectionTitle}>Top rankings</Text>
          <BugArtImage bugId="goliathkever" size={38} />
        </View>
        <View style={styles.rankingBoards}>
          <View style={styles.rankingColumn}>
            <Text style={styles.rankingColumnLabel}>Score rank</Text>
            {scoreLeaders.map((leader, index) => (
              <View key={leader.uid} style={styles.rankingLine}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.rankingName}>{leader.displayName}</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.rankingPoints}>{leader.totalPoints}</Text>
              </View>
            ))}
          </View>
          <View style={styles.rankingColumn}>
            <Text style={styles.rankingColumnLabel}>Duel rank</Text>
            {duelLeaders.map((leader, index) => (
              <View key={leader.uid} style={styles.rankingLine}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.rankingName}>{leader.displayName}</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.rankingPoints}>{duelRating(leader)}</Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
      <Pressable style={styles.dexCard} onPress={() => onNavigate("bugdex")}>
        <View style={styles.dexText}>
          <Text style={styles.dexTitle}>BugDex</Text>
          <Text style={styles.dexMeta}>{unlockedDexCount}/{bugDexEntries.length} unlocked</Text>
        </View>
        <View style={styles.dexBugs}>
          {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
            const entry = activeSquadEntries[index];
            return (
              <View key={entry?.id ?? index} style={styles.dexBugJar}>
                <View style={[styles.dexBugJarLid, entry && { backgroundColor: rarityColors[entry.rarity] }]} />
                <View style={[styles.dexBugSlot, entry && { borderColor: rarityColors[entry.rarity] }]}>
                  <View style={styles.dexBugJarShine} />
                  {entry ? <BugArtImage bugId={entry.id} size={34} /> : <Text style={styles.dexEmptySlot}>+</Text>}
                  <View style={styles.dexBugJarBase} />
                </View>
              </View>
            );
          })}
        </View>
      </Pressable>
      <Pressable style={styles.workshopCard} onPress={onOpenBugDexWorkshop ?? (() => onNavigate("bugdex"))}>
        <Image source={require("../../assets/generated/bugdex-workshop-shortcut.webp")} style={styles.workshopImage} />
        <View style={styles.workshopText}>
          <Text style={styles.workshopTitle}>{t("home.workshopTitle")}</Text>
          <Text style={styles.workshopBody} numberOfLines={2}>{t("home.workshopBody")}</Text>
          <Text style={styles.workshopCta}>{t("home.workshopCta")}</Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setRoutineOpen((open) => !open)} style={styles.routineToggle}>
        <View><Text style={styles.routineKicker}>ROUTINE</Text><Text style={styles.routineTitle}>Daily & weekly missions</Text><Text style={styles.routineBody}>Optional extra rewards — your discovery goal stays above.</Text></View><Text style={styles.routineChevron}>{routineOpen ? "⌃" : "⌄"}</Text>
      </Pressable>
      {routineOpen && <>
      <View style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <View>
            <Text style={styles.missionTitle}>{t("home.dailyMissions")}</Text>
            <Text style={styles.missionWeek}>{t("home.dailyMissionsMeta")}</Text>
          </View>
          <BugArtImage bugId="lieveheersbeestje" size={48} />
        </View>
        <View style={styles.missionList}>
          {dailyMissions.map((mission) => {
            const done = mission.progress >= mission.target;
            const claimed = claimedDailyIds.has(mission.id);
            const width: DimensionValue = `${Math.min(100, Math.round((mission.progress / mission.target) * 100))}%`;
            return (
              <View key={mission.id} style={styles.missionItem}>
                <View style={styles.missionLine}>
                  <Text style={styles.missionName}>{tr(mission.title)}</Text>
                  <Text style={[styles.missionCount, done && styles.missionDone]}>{formatMissionValue(mission.progress)}/{formatMissionValue(mission.target)}</Text>
                </View>
                <View style={styles.missionTrack}>
                  <View style={[styles.missionFill, { width }]} />
                </View>
                {done && !claimed ? (
                  <Pressable style={styles.missionClaimButton} disabled={claimingDailyMissionId === mission.id} onPress={() => handleDailyMissionClaim(mission)}>
                    <Text style={styles.missionClaimText}>{claimingDailyMissionId === mission.id ? "..." : t("home.claimDailyReward")}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.missionReward}>
                    {done && claimed ? t("home.claimedDailyReward", { reward: tr(mission.reward) }) : t("home.dailyReward", { reward: tr(mission.reward) })}
                  </Text>
                )}
              </View>
            );
          })}
          {dailyMissionSetComplete(dailyMissions) && !dailyBonusClaimed && (
            <Pressable style={styles.missionBonusButton} disabled={dailyBonusClaiming} onPress={handleDailyBonusClaim}>
              <Text style={styles.missionBonusText}>{dailyBonusClaiming ? "..." : t("home.claimDailyBugDex")}</Text>
            </Pressable>
          )}
          {dailyMissionSetComplete(dailyMissions) && dailyBonusClaimed && (
            <Text style={styles.missionReward}>{t("home.claimedDailyBugDex")}</Text>
          )}
          {dailyBonusError ? <Text style={styles.missionError}>{dailyBonusError}</Text> : null}
        </View>
      </View>
      <View style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <View>
            <Text style={styles.missionTitle}>{t("home.weeklyMissions")}</Text>
            <Text style={styles.missionWeek}>{weeklyMissionLabel()}</Text>
          </View>
          <BugArtImage bugId="sprinkhaan" size={48} />
        </View>
        <View style={styles.missionList}>
          {missions.map((mission) => {
            const done = mission.progress >= mission.target;
            const claimed = claimedMissionIds.has(mission.id);
            const width: DimensionValue = `${Math.min(100, Math.round((mission.progress / mission.target) * 100))}%`;
            return (
              <View key={mission.id} style={styles.missionItem}>
                <View style={styles.missionLine}>
                  <Text style={styles.missionName}>{tr(mission.title)}</Text>
                  <Text style={[styles.missionCount, done && styles.missionDone]}>{formatMissionValue(mission.progress)}/{formatMissionValue(mission.target)}</Text>
                </View>
                <View style={styles.missionTrack}>
                  <View style={[styles.missionFill, { width }]} />
                </View>
                {done && !claimed ? (
                  <Pressable style={styles.missionClaimButton} disabled={claimingMissionId === mission.id} onPress={() => handleWeeklyMissionClaim(mission)}>
                    <Text style={styles.missionClaimText}>{claimingMissionId === mission.id ? "..." : t("home.claimWeeklyReward")}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.missionReward}>
                    {done && claimed ? t("home.claimedWeeklyReward", { reward: tr(mission.reward) }) : t("home.weeklyReward", { reward: tr(mission.reward) })}
                  </Text>
                )}
              </View>
            );
          })}
          {weeklyMissionSetComplete(missions) && !weeklyBonusClaimed && (
            <Pressable style={styles.missionBonusButton} disabled={weeklyBonusClaiming} onPress={handleWeeklyBonusClaim}>
              <Text style={styles.missionBonusText}>{weeklyBonusClaiming ? "..." : t("home.claimWeeklyBugDex")}</Text>
            </Pressable>
          )}
          {weeklyMissionSetComplete(missions) && weeklyBonusClaimed && (
            <Text style={styles.missionReward}>{t("home.claimedWeeklyBugDex")}</Text>
          )}
          {weeklyBonusError ? <Text style={styles.missionError}>{weeklyBonusError}</Text> : null}
        </View>
      </View>
      </>}
      {buddyFeatureVisible && buddyEntry && buddyMastery && (
        <View style={styles.buddyCard}>
          <Pressable style={styles.buddyCollapsedHeader} onPress={() => setBuddyCardOpen((open) => !open)}>
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={buddyPetImage} style={styles.buddyCollapsedBee} />
            <Text style={styles.buddyCollapsedTitle}>{t("buddy.title")}</Text>
            <View style={[styles.buddyCollapsedSignal, (buddyFinishedTask || buddyReadyCount > 0) && styles.buddyCollapsedSignalReady]}>
              <Text style={[styles.buddyCollapsedSignalText, (buddyFinishedTask || buddyReadyCount > 0) && styles.buddyCollapsedSignalTextReady]}>{buddyCollapsedSignal}</Text>
            </View>
            <Text style={styles.buddyCollapsedChevron}>{buddyCardOpen ? "⌃" : "⌄"}</Text>
          </Pressable>
          {buddyCardOpen && (
            <>
          <View style={styles.buddyHeader}>
            <View style={styles.buddyIdleScene}>
              <Animated.View style={[styles.buddyGlow, styles.buddyGlowWide, { opacity: buddyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] }), transform: [{ scale: buddyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.16] }) }] }]} />
              <Animated.View style={[styles.buddySpark, { opacity: buddyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.88] }), transform: [{ translateY: buddyAnim.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) }] }]} />
              <View style={[styles.buddyBeePod, buddyActiveTask && styles.buddyBeePodActive]}>
                <Animated.Image accessibilityIgnoresInvertColors resizeMode="contain" source={buddyPetImage} style={[styles.buddyPetImage, buddyMotionStyle]} />
                {(buddyActiveTask || buddyFinishedTask) && (
                  <View style={styles.buddyTimerRing}>
                    <Text style={styles.buddyTimerText}>{buddyFinishedTask ? "✓" : `${buddyTaskProgress}%`}</Text>
                  </View>
                )}
              </View>
              <View style={styles.buddyBugPod}>
                <BugArtImage bugId={buddyEntry.id} size={54} />
              </View>
            </View>
            <View style={styles.buddyText}>
              <View style={styles.buddyTitleRow}>
                <Text style={styles.buddyTitle}>{t("buddy.title")}</Text>
                <View style={styles.buddyTitleActions}>
                  {activeSquadEntries.length > 1 && (
                    <Pressable style={styles.buddyHeaderSwitchButton} onPress={showBuddySelectPopup}>
                      <Text style={styles.buddyHeaderSwitchText}>{t("buddy.switch")}</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.buddyInfoButton} onPress={showBuddyInfo}>
                    <Text style={styles.buddyInfoText}>i</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.buddyName} numberOfLines={1}>{buddyEntry.name}</Text>
              <View style={styles.buddyStatusBadge}>
                <Text style={styles.buddyStatusIcon}>{buddyActiveTask ? "↗" : buddyFinishedTask ? "✓" : buddyReadyCount > 0 ? "!" : "zZ"}</Text>
                <Text style={styles.buddyStatus}>{buddyStatus}</Text>
              </View>
              <View style={styles.buddyTrack}>
                <View style={[styles.buddyFill, { width: `${buddyProgress}%` as DimensionValue }]} />
              </View>
              <Text style={styles.buddyProgressText}>{t("buddy.progress", { level: buddyMastery.level, current: buddyMasteryProgressXp, next: buddyMasteryNextXp })}{buddyMasteryQueuedXp > 0 ? t("buddy.progressQueued", { xp: buddyMasteryQueuedXp }) : ""}</Text>
            </View>
          </View>

          <View style={styles.buddyCompactMeters}>
            <BuddyMeter kind="happy" label={t("buddy.stat.happy")} value={buddyMood} />
            <BuddyMeter kind="energy" label={t("buddy.stat.energy")} value={buddyEnergy} />
            <BuddyMeter kind="care" label={t("buddy.stat.bond")} value={buddyBond} />
          </View>

          {buddyActiveTask && buddyActiveAction ? (
            <View style={styles.buddyTaskBox}>
              <Text style={styles.buddyTaskTitle}>{buddyHuntTitle(buddyActiveTask.action, t)}</Text>
              <Text style={styles.buddyTaskMeta}>{t("buddy.taskMeta", { time: formatBuddyCooldown(buddyTaskRemaining), xp: buddyActiveTask.xp })} · <Text style={[styles.buddyRewardStars, { color: buddyRewardStarColor(buddyActiveTask.action) }]}>{buddyRewardStarsText(buddyActiveTask.action)}</Text></Text>
              <View style={styles.buddyTaskTrack}>
                <View style={[styles.buddyTaskFill, { width: `${buddyTaskProgress}%` as DimensionValue }]} />
              </View>
              <Pressable disabled={Boolean(buddyBusyAction)} style={styles.buddyCancelButton} onPress={confirmCancelBuddyTask}>
                <Text style={styles.buddyCancelText}>{buddyBusyAction === "cancel" ? t("buddy.stopping") : t("buddy.stop")}</Text>
              </Pressable>
            </View>
          ) : buddyFinishedTask ? (
            <Pressable disabled={Boolean(buddyBusyAction)} style={styles.buddyDropdownButton} onPress={() => void finishBuddyTask()}>
              <Text style={styles.buddyDropdownText}>{t("buddy.claimReward")}</Text>
              <Text style={styles.buddyDropdownMeta}>{t("buddy.masteryReady", { xp: buddyFinishedTask.xp })}</Text>
            </Pressable>
          ) : (
            <Pressable disabled={!buddyCanStartHunt} style={[styles.buddyDropdownButton, !buddyCanStartHunt && styles.buddyDropdownButtonDisabled]} onPress={() => setBuddyActionsOpen((open) => !open)}>
              <Text style={styles.buddyDropdownText}>{buddyActionsOpen ? t("buddy.closeHunts") : t("buddy.startHunt")}</Text>
              <Text style={styles.buddyDropdownMeta}>{t("buddy.chooseHunt")}</Text>
            </Pressable>
          )}

          {buddyActionsOpen && !buddyPendingTask && (
            <View style={styles.buddyDropdownPanel}>
              {buddyCareActions.map((action) => {
                const lastAt = buddyCareState.actions[action.id] ?? 0;
                const cooldownReady = buddyNow - lastAt >= action.cooldownMs;
                const enoughEnergy = buddyHasEnergyForAction(buddyCareState.stats.energy, action.id);
                const ready = cooldownReady && enoughEnergy;
                const disabledReason = buddyActionDisabledReason(action.id, buddyCareState.stats.energy, cooldownReady, t);
                const xpReward = Math.round(action.xp * buddyXpMultiplier(applyBuddyCareAction(buddyCareState.stats, action.id)));
                return (
                  <Pressable key={action.id} disabled={Boolean(buddyBusyAction) || !ready} style={[styles.buddyDropdownAction, !ready && styles.buddyActionDisabled]} onPress={() => confirmBuddyCare(action.id)}>
                    <Image source={buddyStateImageForAction(action.id)} style={styles.buddyHuntIcon} />
                    <View style={styles.buddyChoiceText}>
                      <Text style={styles.buddyChoiceTitle}>{buddyBusyAction === action.id ? t("buddy.busy") : buddyActionLabel(action.id, t)}</Text>
                      <Text style={styles.buddyChoiceMeta}>{ready ? t("buddy.choiceMeta", { time: formatBuddyCooldown(action.cooldownMs), xp: xpReward }) : disabledReason}</Text>
                      <BuddyActionStatChips action={action.id} />
                    </View>
                    <Text style={[styles.buddyRewardStars, { color: buddyRewardStarColor(action.id) }]}>{buddyRewardStarsText(action.id)}</Text>
                  </Pressable>
                );
              })}
              <View style={styles.buddyMasteryMini}>
                <BugArtImage bugId={buddyEntry.id} size={34} />
                <View style={styles.buddyMasteryMiniText}>
                  <Text style={styles.buddyMasteryMiniTitle}>{t("buddy.miniTitle", { level: buddyMastery.level, multiplier: buddyMultiplier })}</Text>
                  <Text style={styles.buddyMasteryMiniMeta} numberOfLines={1}>{buddyLastAction}{buddyCareState.lastXp ? t("buddy.lastXp", { xp: buddyCareState.lastXp }) : ""}</Text>
                </View>
              </View>
              {buddyBugIds.length > 1 && (
                <Pressable style={styles.buddySwitchButton} onPress={showBuddySelectPopup}>
                  <Text style={styles.buddySwitchText}>{t("buddy.switch")}</Text>
                </Pressable>
              )}
            </View>
          )}
          {!!buddyMessage && <Text style={styles.buddyMessage}>{buddyMessage}</Text>}
          <Modal animationType="fade" transparent visible={Boolean(buddyPopup)} onRequestClose={closeBuddyPopup}>
            <View style={styles.buddySelectOverlay}>
              <View style={styles.buddyPopupModal}>
                {buddyPopup?.kind === "info" && (
                  <>
                    <View style={styles.buddyPopupHero}>
                      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={buddyPetImage} style={styles.buddyPopupIcon} />
                      <View style={styles.buddyPopupHeroText}>
                        <Text style={styles.buddyPopupKicker}>{t("buddy.title")}</Text>
                        <Text style={styles.buddyPopupTitle}>{t("buddy.info.title")}</Text>
                      </View>
                    </View>
                    <Text style={styles.buddyPopupBody}>{t("buddy.info.body")}</Text>
                    <Pressable style={styles.buddyPopupPrimary} onPress={closeBuddyPopup}>
                      <Text style={styles.buddyPopupPrimaryText}>{t("common.ok")}</Text>
                    </Pressable>
                  </>
                )}
                {buddyPopup?.kind === "confirm" && (
                  <>
                    <View style={styles.buddyPopupHero}>
                      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={buddyStateImageForAction(buddyPopup.actionId)} style={styles.buddyPopupIcon} />
                      <View style={styles.buddyPopupHeroText}>
                        <Text style={styles.buddyPopupKicker}>{buddyHuntTitle(buddyPopup.actionId, t)}</Text>
                        <Text style={styles.buddyPopupTitle}>{buddyActionLabel(buddyPopup.actionId, t)}</Text>
                      </View>
                      <Text style={[styles.buddyPopupStars, { color: buddyRewardStarColor(buddyPopup.actionId) }]}>{buddyRewardStarsText(buddyPopup.actionId)}</Text>
                    </View>
                    <View style={styles.buddyPopupDetails}>
                      <Text style={styles.buddyPopupBody}>{buddyActionShortText(buddyPopup.actionId, t)}</Text>
                      <Text style={styles.buddyPopupLine}>{t("buddy.confirm.time", { duration: buddyPopup.duration })}</Text>
                      <Text style={styles.buddyPopupLine}>{t("buddy.confirm.reward", { xp: buddyPopup.xp })}</Text>
                      <Text style={styles.buddyPopupLine}>{t("buddy.confirm.stats", { stats: buddyActionImpact(buddyPopup.actionId, t) })}</Text>
                      <Text style={styles.buddyPopupLine}>{t("buddy.confirm.bugdex", { reward: buddyActionRewardText(buddyPopup.actionId, t) })}</Text>
                    </View>
                    <View style={styles.buddyPopupActions}>
                      <Pressable style={styles.buddyPopupSecondary} onPress={closeBuddyPopup}>
                        <Text style={styles.buddyPopupSecondaryText}>{t("common.cancel")}</Text>
                      </Pressable>
                      <Pressable style={styles.buddyPopupPrimary} onPress={() => { const actionId = buddyPopup.actionId; closeBuddyPopup(); void handleBuddyCare(actionId); }}>
                        <Text style={styles.buddyPopupPrimaryText}>{t("buddy.start")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {buddyPopup?.kind === "cancel" && (
                  <>
                    <Text style={styles.buddyPopupTitle}>{t("buddy.cancel.title")}</Text>
                    <Text style={styles.buddyPopupBody}>{t("buddy.cancel.body", { action: buddyCareState.activeTask ? buddyActionLabel(buddyCareState.activeTask.action, t) : "" })}</Text>
                    <View style={styles.buddyPopupActions}>
                      <Pressable style={styles.buddyPopupSecondary} onPress={closeBuddyPopup}>
                        <Text style={styles.buddyPopupSecondaryText}>{t("buddy.cancel.keep")}</Text>
                      </Pressable>
                      <Pressable style={styles.buddyPopupDanger} onPress={() => { closeBuddyPopup(); void cancelBuddyTask(); }}>
                        <Text style={styles.buddyPopupDangerText}>{t("buddy.cancel.stop")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {buddyPopup?.kind === "ready" && (
                  <>
                    <View style={styles.buddyPopupHero}>
                      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={buddyStateImageForAction(buddyPopup.actionId)} style={styles.buddyPopupIcon} />
                      <View style={styles.buddyPopupHeroText}>
                        <Text style={styles.buddyPopupKicker}>{t("buddy.status.rewardReady")}</Text>
                        <Text style={styles.buddyPopupTitle}>{t("buddy.ready.title", { action: buddyActionLabel(buddyPopup.actionId, t) })}</Text>
                      </View>
                    </View>
                    <Text style={styles.buddyPopupBody}>{t("buddy.ready.body", { xp: buddyPopup.xp, reward: buddyActionRewardText(buddyPopup.actionId, t) })}</Text>
                    <View style={styles.buddyPopupActionsStack}>
                      <Pressable disabled={Boolean(buddyBusyAction)} style={styles.buddyPopupPrimary} onPress={() => { closeBuddyPopup(); void finishBuddyTask(); }}>
                        <Text style={styles.buddyPopupPrimaryText}>{buddyBusyAction === "finish" ? "..." : t("buddy.claimReward")}</Text>
                      </Pressable>
                      <Pressable disabled={Boolean(buddyBusyAction)} style={styles.buddyPopupSecondary} onPress={() => { closeBuddyPopup(); void finishBuddyTask(true); }}>
                        <Text style={styles.buddyPopupSecondaryText}>{t("buddy.claimAndChoose")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {buddyPopup?.kind === "claimed" && (
                  <>
                    <Text style={styles.buddyPopupKicker}>{t("buddy.claim.title", { action: buddyActionLabel(buddyPopup.actionId, t) })}</Text>
                    <Text style={styles.buddyPopupTitle}>{buddyActionAnimationLabel(buddyPopup.actionId, t)}</Text>
                    <Text style={styles.buddyPopupBody}>{buddyPopup.body}</Text>
                    <View style={styles.buddyPopupActionsStack}>
                      <Pressable style={styles.buddyPopupPrimary} onPress={closeBuddyPopup}>
                        <Text style={styles.buddyPopupPrimaryText}>{t("common.ok")}</Text>
                      </Pressable>
                      <Pressable style={styles.buddyPopupSecondary} onPress={openBuddyOptionsFromClaim}>
                        <Text style={styles.buddyPopupSecondaryText}>{t("buddy.chooseNextHunt")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>
          <Modal animationType="fade" transparent visible={buddySelectOpen} onRequestClose={() => setBuddySelectOpen(false)}>
            <View style={styles.buddySelectOverlay}>
              <View style={styles.buddySelectModal}>
                <View style={styles.buddySelectHeader}>
                  <View>
                    <Text style={styles.buddySelectTitle}>{t("buddy.select.title")}</Text>
                    <Text style={styles.buddySelectMeta}>{t("buddy.select.meta")}</Text>
                  </View>
                  <Pressable style={styles.buddySelectClose} onPress={() => setBuddySelectOpen(false)}>
                    <Text style={styles.buddySelectCloseText}>x</Text>
                  </Pressable>
                </View>
                <View style={styles.buddySelectGrid}>
                  {activeSquadEntries.slice(0, maxActiveBugSquadSize).map((entry) => {
                    const selected = buddyEntry.id === entry.id;
                    const mastery = masteryByBugId[entry.id] ?? normalizeBugMastery(entry.id);
                    const skills = bugMasteryUnlockedSkills(mastery.role, mastery.level).filter((skill) => skill.kind !== "passive");
                    const nextLevel = bugMasteryNextUnlockLevel(mastery.level);
                    const bonus = skills.length ? skills.map((skill) => t(`bugdex.mastery.skill.${skill.id}`)).slice(-2).join(", ") : t("buddy.noBonus");
                    const next = nextLevel ? t("home.nextLevel", { level: nextLevel }) : t("buddy.maxMastery");
                    return (
                      <Pressable key={entry.id} style={[styles.buddySelectCard, selected && styles.buddySelectCardActive]} onPress={() => void selectBuddy(entry.id)}>
                        <View style={[styles.buddySelectBugWrap, { borderColor: rarityColors[entry.rarity] }]}>
                          <BugArtImage bugId={entry.id} size={72} />
                        </View>
                        <View style={styles.buddySelectTextBlock}>
                          <Text style={styles.buddySelectName} numberOfLines={1}>{entry.name}</Text>
                          <Text style={styles.buddySelectLevel}>{t("buddy.select.level", { level: mastery.level, rarity: entry.rarity })}</Text>
                          <Text style={styles.buddySelectBonus} numberOfLines={2}>{bonus}</Text>
                          <Text style={styles.buddySelectNext}>{next}</Text>
                        </View>
                        {selected && <Text style={styles.buddySelectActivePill}>{t("buddy.select.active")}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </Modal>
            </>
          )}
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={t("home.reportCta")} style={styles.reportCard} onPress={() => onNavigate("bugs")}>
        <View style={styles.reportBug}>
          <BugArtImage bugId="pissebed" size={56} />
        </View>
        <View style={styles.reportText}>
          <Text style={styles.reportTitle}>{t("home.reportTitle")}</Text>
          <Text style={styles.reportBody}>{t("home.reportBody")}</Text>
        </View>
        <Text style={styles.reportCta}>{t("home.reportCta")}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("home.wikiCta")} style={styles.wikiCard} onPress={openBugBaasWiki}>
        <Image resizeMode="cover" source={wikiButtonImage} style={styles.wikiImage} />
        <View style={styles.wikiText}>
          <Text style={styles.wikiTitle}>{t("home.wikiTitle")}</Text>
          <Text style={styles.wikiBody}>{t("home.wikiBody")}</Text>
        </View>
        <Text style={styles.wikiCta}>{t("home.wikiCta")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatRemaining(ms: number): string {
  const hours = Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
  return `${hours}h`;
}

function formatMissionValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatKm(km: number): string {
  if (km >= 10) return String(Math.floor(km));
  return km.toFixed(1).replace(".0", "");
}

function formatShortDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleString([], { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit" });
}

function movementGoalLabel(goal: MovementRadarProgress["goals"][number], t: (key: string) => string): string {
  return t(`movement.goal.${goal.id}`);
}

function localDayId(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function formatBuddyCooldown(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (minutes >= 60) return `${Math.ceil(minutes / 60)}h`;
  return `${minutes}m`;
}

function buddyActionLabel(action: BuddyCareAction, t: Translate) {
  return t(`buddy.action.${action}.label`);
}

function buddyActionAnimationLabel(action: BuddyCareAction, t: Translate) {
  return t(`buddy.action.${action}.animation`);
}

function buddyHuntTitle(action: BuddyCareAction, t: Translate) {
  return t(`buddy.action.${action}.huntTitle`);
}

function buddyStateImageForAction(action: BuddyCareAction) {
  if (action === "feed") return buddyStateNectarImage;
  if (action === "play") return buddyStateLeafImage;
  if (action === "train") return buddyStateDigImage;
  if (action === "clean") return buddyStateCleanImage;
  return buddyStateSwarmImage;
}

function buddyBeeMotionStyle(action: BuddyCareAction | undefined, anim: Animated.Value) {
  const floatY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const shakeX = anim.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const digY = anim.interpolate({ inputRange: [0, 1], outputRange: [2, -5] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["-6deg", "6deg"] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });
  if (action === "play") return { transform: [{ translateX: shakeX }, { rotate }] };
  if (action === "train") return { transform: [{ translateY: digY }, { scale }] };
  if (action === "clean") return { transform: [{ rotate }, { scale }] };
  if (action === "adventure") return { transform: [{ translateY: floatY }, { translateX: shakeX }, { rotate }] };
  return { transform: [{ translateY: floatY }, { scale }] };
}

function buddyStateBubbleMotionStyle(action: BuddyCareAction | undefined, anim: Animated.Value) {
  const bubbleY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const bubbleScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const bubbleRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] });
  return { transform: [{ translateY: bubbleY }, { scale: bubbleScale }, { rotate: action ? bubbleRotate : "0deg" }] };
}

function buddyActionConfirmText(action: BuddyCareAction, xp: number, duration: string, t: Translate) {
  return [
    buddyActionShortText(action, t),
    t("buddy.confirm.time", { duration }),
    t("buddy.confirm.reward", { xp }),
    t("buddy.confirm.stats", { stats: buddyActionImpact(action, t) }),
    t("buddy.confirm.bugdex", { reward: buddyActionRewardText(action, t) }),
    t("buddy.confirm.busy")
  ].join("\n");
}

function buddyActionShortText(action: BuddyCareAction, t: Translate) {
  return t(`buddy.action.${action}.short`);
}

function buddyActionImpact(action: BuddyCareAction, t: Translate) {
  return t(`buddy.action.${action}.impact`);
}

function buddyActionRewardText(action: BuddyCareAction, t: Translate) {
  if (action === "adventure") return t("buddy.reward.epic");
  if (action === "train" && buddyActionRewardCount(action) > 1) return t("buddy.reward.rareDouble");
  if (action === "play" || action === "train") return t("buddy.reward.rare");
  return t("buddy.reward.common");
}

function buddyEnergyCost(action: BuddyCareAction) {
  const config = buddyCareActions.find((item) => item.id === action);
  return Math.max(0, -(config?.stats.energy ?? 0));
}

function buddyHasEnergyForAction(energy: number, action: BuddyCareAction) {
  return energy >= buddyEnergyCost(action);
}

function buddyActionDisabledReason(action: BuddyCareAction, energy: number, cooldownReady: boolean, t: Translate) {
  const energyCost = buddyEnergyCost(action);
  if (!cooldownReady) return t("buddy.disabled.cooldown");
  if (energy < energyCost) return t("buddy.disabled.energy", { energy: Math.round(energy), cost: energyCost });
  return t("buddy.disabled.locked");
}

function buddyRewardStarsText(action: BuddyCareAction) {
  if (action === "adventure") return "★★★";
  if (action === "play" || action === "train") return "★★";
  return "★";
}

function buddyRewardStarColor(action: BuddyCareAction) {
  if (action === "adventure") return rarityColors.Episch;
  if (action === "play" || action === "train") return rarityColors.Zeldzaam;
  return rarityColors.Gewoon;
}

function buddyNotificationBody(action: BuddyCareAction, xp: number, t: Translate) {
  return t("buddy.notification.body", { action: buddyActionLabel(action, t), xp });
}

function buddyTaskFinishedSummary(action: BuddyCareAction, xp: number, t: Translate) {
  return t("buddy.finished.summary", { animation: buddyActionAnimationLabel(action, t), xp, reward: buddyActionRewardText(action, t) });
}

function buddyTaskClaimSummary(action: BuddyCareAction, xp: number, t: Translate, drop?: BugDexDropResult | null) {
  const bugDexReward = drop?.rewardType === "bug" ? `${drop.entry.rarity}: ${drop.entry.name}` : buddyActionRewardText(action, t);
  return t("buddy.claim.summary", { animation: buddyActionAnimationLabel(action, t), xp, reward: bugDexReward, stats: buddyActionImpact(action, t) });
}


type BuddyStatKind = "care" | "energy" | "happy";

function buddyStatIconSource(kind: BuddyStatKind) {
  if (kind === "energy") return buddyEnergyImage;
  if (kind === "care") return buddyBondImage;
  return buddyHappyImage;
}

function BuddyStatIcon({ kind, size = 24 }: { kind: BuddyStatKind; size?: number }) {
  return <Image source={buddyStatIconSource(kind)} style={[styles.buddyStatIconImage, { height: size, width: size }]} />;
}

function BuddyMeter({ kind, label, value }: { kind: BuddyStatKind; label: string; value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.buddyMeterRow}>
      <BuddyStatIcon kind={kind} />
      <Text style={styles.buddyMeterLabel}>{label}</Text>
      <View style={styles.buddyMeterTrack}>
        <View style={[styles.buddyMeterFill, { backgroundColor: buddyStatColors[kind], width: `${safeValue}%` as DimensionValue }]} />
      </View>
      <Text style={[styles.buddyMeterValue, { color: buddyStatColors[kind] }]}>{safeValue}/100</Text>
    </View>
  );
}

function BuddyActionStatChips({ action }: { action: BuddyCareAction }) {
  const config = buddyCareActions.find((item) => item.id === action);
  const stats = ([
    { kind: "happy", value: config?.stats.happy ?? 0 },
    { kind: "energy", value: config?.stats.energy ?? 0 },
    { kind: "care", value: config?.stats.care ?? 0 }
  ] as Array<{ kind: BuddyStatKind; value: number }>).filter((item) => item.value !== 0);
  return (
    <View style={styles.buddyStatChips}>
      {stats.map((item) => (
        <View key={item.kind} style={[styles.buddyStatChip, item.value < 0 ? styles.buddyStatChipCost : styles.buddyStatChipGain]}>
          <BuddyStatIcon kind={item.kind} size={17} />
          <Text style={[styles.buddyStatChipText, item.value < 0 && styles.buddyStatChipTextCost]}>{item.value > 0 ? "+" : "-"}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileIcon() {
  return (
    <View style={styles.profileIcon}>
      <View style={styles.profileIconHead} />
      <View style={styles.profileIconBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  hero: {
    alignItems: "stretch",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 94,
    overflow: "hidden"
  },
  heroImage: {
    opacity: 0.9
  },
  heroVeil: {
    backgroundColor: "rgba(5, 27, 19, 0.38)",
    flex: 1,
    justifyContent: "center",
    minHeight: 94,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  heroText: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  heroTitle: {
    color: "#ffffff",
    flex: 1,
    flexShrink: 1,
    lineHeight: 30,
    marginBottom: 1,
    minWidth: 0
  },
  profilePill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5
  },
  languageWrap: {
    position: "relative",
    zIndex: 5
  },
  languagePill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(253,254,251,0.6)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 48
  },
  languageMenu: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    padding: 4,
    position: "absolute",
    right: 0,
    top: 46
  },
  languageOption: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 34
  },
  languageFlag: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  profileIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22
  },
  profileIconHead: {
    backgroundColor: "#102018",
    borderRadius: 999,
    height: 8,
    marginBottom: 2,
    width: 8
  },
  profileIconBody: {
    backgroundColor: "#102018",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 9,
    width: 16
  },
  profileText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  goalsCard: { backgroundColor: "#102018", borderColor: "#d7bd57", borderRadius: 18, borderWidth: 1, marginTop: 12, overflow: "hidden" },
  goalsImage: { opacity: 0.9 },
  goalsVeil: { backgroundColor: "rgba(7, 25, 18, 0.56)", minHeight: 306, padding: 16 },
  goalsKicker: { color: "#f0dc84", fontSize: 10, fontWeight: "900", letterSpacing: 1.15 },
  goalsTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  goalsBody: { color: "#e0ece1", fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 5, maxWidth: "80%" },
  goalContract: { backgroundColor: "rgba(6, 21, 15, 0.7)", borderColor: "rgba(240,220,132,0.38)", borderRadius: 12, borderWidth: 1, gap: 3, marginTop: 13, padding: 10 },
  goalContractLabel: { color: "#e5cc69", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  goalContractText: { color: "#ffffff", fontSize: 12, fontWeight: "800", marginBottom: 4 },
  goalsPrimaryAction: { alignItems: "center", backgroundColor: "#e5cc69", borderRadius: 12, flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 14, paddingVertical: 13 },
  goalsPrimaryText: { color: "#173f31", fontSize: 14, fontWeight: "900" },
  goalsPrimaryArrow: { color: "#173f31", fontSize: 20, fontWeight: "900" },
  goalsShortcuts: { flexDirection: "row", gap: 8, marginTop: 8 },
  goalsShortcut: { backgroundColor: "rgba(9, 33, 23, 0.78)", borderColor: "rgba(240,220,132,0.4)", borderRadius: 11, borderWidth: 1, flex: 1, padding: 10 },
  goalsShortcutLabel: { color: "#e5cc69", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  goalsShortcutText: { color: "#ffffff", fontSize: 12, fontWeight: "900", marginTop: 2 },
  routineToggle: { alignItems: "center", backgroundColor: "#f5f8f4", borderColor: "#cddfd3", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 12, padding: 13 },
  routineKicker: { color: "#6a8474", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  routineTitle: { color: "#173f31", fontSize: 14, fontWeight: "900", marginTop: 2 },
  routineBody: { color: "#607568", fontSize: 11, marginTop: 2 },
  routineChevron: { color: "#15724f", fontSize: 21, fontWeight: "900" },
  expeditionCard: {
    alignItems: "center", backgroundColor: "#102018", borderColor: "#d7bd57", borderRadius: 8, borderWidth: 1,
    flexDirection: "row", gap: 12, marginBottom: 8, overflow: "hidden", padding: 14
  },
  expeditionGlow: { alignItems: "center", backgroundColor: "#1c4a38", borderRadius: 8, height: 62, justifyContent: "center", width: 62 },
  expeditionMedallion: { borderRadius: 8, height: 62, width: 62 },
  expeditionCopy: { flex: 1 },
  expeditionKicker: { color: "#d7bd57", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  expeditionTitle: { color: "#ffffff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  expeditionBody: { color: "#c9d9cf", fontSize: 12, lineHeight: 16, marginTop: 2 },
  expeditionCta: { color: "#d7bd57", fontSize: 11, fontWeight: "900", marginTop: 7 },
  fieldSignalCard: { alignItems: "center", backgroundColor: "#eef5ee", borderColor: "#8bb99b", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 8, padding: 12 },
  fieldSignalCardCompleted: { backgroundColor: "#e5efe4", borderColor: "#d7bd57" },
  fieldSignalMark: { alignItems: "center", backgroundColor: "#173f31", borderRadius: 16, height: 42, justifyContent: "center", width: 42 },
  fieldSignalMarkCompleted: { backgroundColor: "#d7bd57" },
  fieldSignalIcon: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  fieldSignalCopy: { flex: 1, minWidth: 0 },
  fieldSignalKicker: { color: "#15724f", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  fieldSignalTitle: { color: "#102018", fontSize: 14, fontWeight: "900", marginTop: 1 },
  fieldSignalBody: { color: "#52665d", fontSize: 11, fontWeight: "800", lineHeight: 15, marginTop: 2 },
  fieldSignalAction: { color: "#15724f", fontSize: 11, fontWeight: "900" },
  teamHuntShortcut: { alignItems: "center", backgroundColor: "#173f31", borderColor: "#d7bd57", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 12, padding: 12 },
  teamHuntSignal: { alignItems: "center", backgroundColor: "#f1d36b", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  teamHuntSignalText: { color: "#173f31", fontSize: 18, fontWeight: "900" },
  teamHuntCopy: { flex: 1, minWidth: 0 },
  teamHuntKicker: { color: "#e5cc69", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  teamHuntTitle: { color: "#fff", fontSize: 15, fontWeight: "900", marginTop: 1 },
  teamHuntBody: { color: "#c9d9cf", fontSize: 11, fontWeight: "800", marginTop: 2 },
  teamHuntArrow: { color: "#e5cc69", fontSize: 20, fontWeight: "900" },
  guardianCard: { alignItems: "center", backgroundColor: "#efe6bc", borderColor: "#d7bd57", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 11, marginBottom: 8, padding: 12 },
  guardianOrb: { alignItems: "center", backgroundColor: "#173f31", borderColor: "#d7bd57", borderRadius: 23, borderWidth: 2, height: 46, justifyContent: "center", width: 46 }, guardianGlyph: { color: "#f0dc84", fontSize: 23 }, guardianCopy: { flex: 1 }, guardianKicker: { color: "#9b6716", fontSize: 9, fontWeight: "900", letterSpacing: 0.9 }, guardianTitle: { color: "#102018", fontSize: 15, fontWeight: "900", marginTop: 1 }, guardianBody: { color: "#466052", fontSize: 11, marginTop: 2 }, guardianArrow: { color: "#15724f", fontSize: 22, fontWeight: "900" },
  settingsPill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(253,254,251,0.62)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42
  },
  settingsImage: {
    height: 40,
    width: 40
  },
  scoreText: {
    color: "#dbe8de",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  statTile: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 68,
    justifyContent: "center",
    padding: 8
  },
  statValue: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
  },
  rankStatLabel: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900"
  },
  rankStatLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    width: "100%"
  },
  rankStatValue: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  starterBoostCard: {
    backgroundColor: "#fff7d6",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12
  },
  starterBoostText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2
  },
  starterBoostTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  movementCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  movementHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  movementTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  movementReward: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  movementHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  movementGoals: {
    gap: 7
  },
  movementGoal: {
    gap: 4
  },
  movementLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  movementLabel: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  movementKm: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  movementTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 7,
    overflow: "hidden"
  },
  movementFill: {
    backgroundColor: "#15724f",
    height: "100%"
  },
  movementPermissionButton: {
    alignSelf: "flex-start",
    borderColor: "#9fb7aa",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  movementPermissionText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  movementClaimButton: {
    backgroundColor: "#15724f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  movementClaimButtonDisabled: {
    opacity: 0.45
  },
  movementClaimButtonPressed: {
    opacity: 0.75
  },
  movementClaimText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  fitnessSyncerCard: {
    gap: 6
  },
  fitnessSyncerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  fitnessSyncerCopy: {
    flex: 1,
    minWidth: 0
  },
  fitnessSyncerMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2
  },
  fitnessSyncerMessage: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "800"
  },
  fitnessSyncerDisconnect: {
    color: "#8f312a",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyAction: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(215,189,87,0.7)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    padding: 6
  },
  buddyActionDisabled: {
    backgroundColor: "#dfe4de",
    borderColor: "rgba(82,102,93,0.26)",
    opacity: 0.58
  },
  buddyActionIcon: {
    color: "#d7bd57",
    fontSize: 15,
    fontWeight: "900"
  },
  buddyActionMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 1
  },
  buddyActionText: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  buddyActions: {
    flexDirection: "row",
    gap: 6
  },
  buddyChoiceCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(215,189,87,0.42)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 62,
    padding: 8,
    width: "48%"
  },
  buddyChoiceCardReady: {
    borderColor: "#69c88d",
    borderWidth: 2
  },
  buddyChoiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  buddyChoiceMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900"
  },
  buddyChoiceText: {
    flex: 1,
    minWidth: 0
  },
  buddyChoiceTitle: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyRewardStars: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    minWidth: 32,
    textAlign: "right"
  },
  buddyStatIconImage: {
    resizeMode: "contain"
  },
  buddyStatChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4
  },
  buddyStatChip: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 2,
    minWidth: 36,
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  buddyStatChipGain: {
    backgroundColor: "rgba(21,114,79,0.14)",
    borderColor: "rgba(21,114,79,0.32)",
    borderWidth: 1
  },
  buddyStatChipCost: {
    backgroundColor: "rgba(156,47,47,0.13)",
    borderColor: "rgba(156,47,47,0.32)",
    borderWidth: 1
  },
  buddyStatChipIcon: {
    height: 15,
    width: 15
  },
  buddyStatChipText: {
    color: "#15724f",
    fontSize: 10,
    fontWeight: "900"
  },
  buddyStatChipTextCost: {
    color: "#9c2f2f"
  },
  buddyArtWrap: {
    alignItems: "center",
    backgroundColor: "rgba(105,200,141,0.14)",
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    width: 78
  },
  buddyBeePod: {
    alignItems: "center",
    backgroundColor: "rgba(105,200,141,0.14)",
    borderColor: "rgba(249,251,247,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  buddyBeePodActive: {
    borderColor: "#d7bd57",
    borderWidth: 2
  },
  buddyBugPod: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.10)",
    borderColor: "rgba(215,189,87,0.34)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  buddyHeroBug: {
    bottom: 5,
    position: "absolute",
    right: -2,
    transform: [{ scale: 0.72 }]
  },
  buddyCancelButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8
  },
  buddyCancelText: {
    color: "#f9fbf7",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyCard: {
    backgroundColor: "#102018",
    borderColor: "rgba(215,189,87,0.72)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
    overflow: "hidden",
    padding: 8
  },
  buddyCollapsedBee: {
    height: 38,
    width: 38
  },
  buddyCollapsedChevron: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900"
  },
  buddyCollapsedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 48
  },
  buddyCollapsedSignal: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  buddyCollapsedSignalReady: {
    backgroundColor: "#d7bd57",
    borderColor: "#f4dc80"
  },
  buddyCollapsedSignalText: {
    color: "#dce9df",
    fontSize: 9,
    fontWeight: "900"
  },
  buddyCollapsedSignalTextReady: {
    color: "#102018"
  },
  buddyCollapsedTitle: {
    color: "#f8fafc",
    flex: 1,
    fontSize: 17,
    fontWeight: "900"
  },
  buddyFill: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    height: "100%"
  },
  buddyGlow: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    height: 66,
    opacity: 0.22,
    position: "absolute",
    width: 66
  },
  buddyGlowWide: {
    height: 90,
    width: 90
  },
  buddySpark: {
    backgroundColor: "#f6df8a",
    borderRadius: 999,
    height: 7,
    left: 20,
    position: "absolute",
    top: 10,
    width: 7
  },
  buddyFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  buddyHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  buddyHeaderSwitchButton: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  buddyHeaderSwitchText: {
    color: "#102018",
    fontSize: 9,
    fontWeight: "900"
  },
  buddyIdleScene: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2
  },
  buddyControlBadge: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  buddyControlHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  buddyInfoButton: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.18)",
    borderColor: "rgba(249,251,247,0.32)",
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22
  },
  buddyInfoText: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyControlPanel: {
    backgroundColor: "rgba(249,251,247,0.08)",
    borderColor: "rgba(215,189,87,0.32)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 10
  },
  buddyMessage: {
    color: "#d7bd57",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyHelpButton: {
    backgroundColor: "rgba(249,251,247,0.14)",
    borderColor: "rgba(249,251,247,0.28)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  buddyHelpButtonText: {
    color: "#f9fbf7",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyHelpClose: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 11
  },
  buddyHelpCloseText: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  buddyHelpLead: {
    color: "#dce9df",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  buddyHelpModal: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 18,
    padding: 16
  },
  buddyHelpNote: {
    color: "#69c88d",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17
  },
  buddyHelpOverlay: {
    backgroundColor: "rgba(0,0,0,0.62)",
    flex: 1,
    justifyContent: "center"
  },
  buddyHelpStep: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18
  },
  buddyHelpSteps: {
    backgroundColor: "rgba(249,251,247,0.08)",
    borderRadius: 12,
    gap: 4,
    padding: 10
  },
  buddyHelpTitle: {
    color: "#d7bd57",
    fontSize: 18,
    fontWeight: "900"
  },
  buddyLogBox: {
    backgroundColor: "rgba(105,200,141,0.12)",
    borderColor: "rgba(105,200,141,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    padding: 9
  },
  buddyLogText: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16
  },
  buddyLogTitle: {
    color: "#69c88d",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyLoopBox: {
    backgroundColor: "rgba(249,251,247,0.08)",
    borderColor: "rgba(215,189,87,0.32)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 9
  },
  buddyLoopStep: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800"
  },
  buddyLoopSteps: {
    gap: 3
  },
  buddyLoopTitle: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyCompactMeters: {
    gap: 4
  },
  buddyDropdownAction: {
    alignItems: "center",
    backgroundColor: "#f9fbf7",
    borderColor: "rgba(215,189,87,0.28)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  buddyHuntIcon: {
    height: 34,
    width: 34
  },
  buddyDropdownButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderColor: "rgba(249,251,247,0.24)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buddyDropdownButtonDisabled: {
    opacity: 0.55
  },
  buddyDropdownMeta: {
    color: "#294034",
    fontSize: 10,
    fontWeight: "900"
  },
  buddyDropdownPanel: {
    gap: 5
  },
  buddyDropdownText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyTaskBox: {
    backgroundColor: "rgba(215,189,87,0.13)",
    borderColor: "rgba(215,189,87,0.38)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 8
  },
  buddyTaskFill: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    height: "100%"
  },
  buddyTaskMeta: {
    color: "#dce9df",
    fontSize: 10,
    fontWeight: "800"
  },
  buddyTaskTitle: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyTaskTrack: {
    backgroundColor: "rgba(249,251,247,0.18)",
    borderRadius: 999,
    height: 6,
    overflow: "hidden"
  },
  buddyMasteryMini: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.12)",
    borderColor: "rgba(215,189,87,0.35)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 6
  },
  buddyMasteryMiniMeta: {
    color: "#dce9df",
    fontSize: 10,
    fontWeight: "800"
  },
  buddyMasteryMiniText: {
    flex: 1,
    minWidth: 0
  },
  buddyMasteryMiniTitle: {
    color: "#d7bd57",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyMeta: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  buddyMissionLabel: {
    color: "#69c88d",
    fontSize: 10,
    fontWeight: "900"
  },
  buddyMissionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  buddyMissionStars: {
    color: "#d7bd57",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1
  },
  buddyPrimaryAction: {
    borderRadius: 12,
    overflow: "hidden"
  },
  buddyPrimaryIcon: {
    marginRight: 8
  },
  buddyPrimaryImage: {
    borderRadius: 12
  },
  buddyPrimaryImageWrap: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  buddyPrimaryLabel: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  buddyPrimaryText: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  buddyPrimaryTextWrap: {
    flex: 1
  },
  buddyPetImage: {
    height: 60,
    width: 60
  },
  buddyProgressText: {
    color: "#dce9df",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3
  },
  buddyRestBox: {
    backgroundColor: "rgba(105,200,141,0.12)",
    borderColor: "rgba(105,200,141,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10
  },
  buddyRestText: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  buddyRestTitle: {
    color: "#69c88d",
    fontSize: 13,
    fontWeight: "900"
  },

  buddySceneHint: {
    backgroundColor: "rgba(215,189,87,0.14)",
    borderColor: "rgba(215,189,87,0.32)",
    borderRadius: 12,
    borderWidth: 1,
    padding: 9
  },
  buddySceneHintText: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17
  },
  buddySparkOne: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    height: 8,
    left: 15,
    opacity: 0.9,
    position: "absolute",
    top: 16,
    width: 8
  },
  buddySparkThree: {
    backgroundColor: "#f9fbf7",
    borderRadius: 999,
    bottom: 17,
    height: 6,
    opacity: 0.85,
    position: "absolute",
    right: 18,
    width: 6
  },
  buddySparkTwo: {
    backgroundColor: "#69c88d",
    borderRadius: 999,
    height: 10,
    opacity: 0.8,
    position: "absolute",
    right: 13,
    top: 29,
    width: 10
  },
  buddyStatus: {
    color: "#69c88d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1
  },
  buddyStatusBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 1
  },
  buddyStatusIcon: {
    color: "#d7bd57",
    fontSize: 11,
    fontWeight: "900"
  },
  buddyMeterFill: {
    backgroundColor: "#69c88d",
    borderRadius: 999,
    height: "100%"
  },
  buddyMeterIcon: {
    height: 24,
    width: 24
  },
  buddyMeterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  buddyMeterLabel: {
    color: "#dce9df",
    fontSize: 10,
    fontWeight: "900",
    width: 48
  },
  buddyMeterTrack: {
    backgroundColor: "rgba(249,251,247,0.16)",
    borderRadius: 999,
    flex: 1,
    height: 6,
    overflow: "hidden"
  },
  buddyMeterValue: {
    color: "#d7bd57",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "right",
    width: 24
  },
  buddyName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  buddySwitchButton: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  buddySwitchText: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900"
  },
  buddySelectOverlay: {
    backgroundColor: "rgba(0,0,0,0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  buddyPopupModal: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  buddyPopupHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  buddyPopupIcon: {
    backgroundColor: "rgba(249,251,247,0.1)",
    borderColor: "rgba(215,189,87,0.38)",
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    width: 58
  },
  buddyPopupHeroText: {
    flex: 1,
    minWidth: 0
  },
  buddyPopupKicker: {
    color: "#d7bd57",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  buddyPopupTitle: {
    color: "#f9fbf7",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24
  },
  buddyPopupBody: {
    color: "#dce9df",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  buddyPopupPrimary: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  buddyPopupPrimaryText: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  buddyPopupDetails: {
    backgroundColor: "rgba(249,251,247,0.08)",
    borderColor: "rgba(249,251,247,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  buddyPopupLine: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  buddyPopupActions: {
    flexDirection: "row",
    gap: 9
  },
  buddyPopupSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.1)",
    borderColor: "rgba(249,251,247,0.24)",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  buddyPopupSecondaryText: {
    color: "#f9fbf7",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  buddyPopupDanger: {
    alignItems: "center",
    backgroundColor: "#ff5c5c",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  buddyPopupDangerText: {
    color: "#fff8f8",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  buddyPopupStars: {
    fontSize: 16,
    fontWeight: "900"
  },
  buddyPopupActionsStack: {
    gap: 9
  },
  buddySelectModal: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14
  },
  buddySelectHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 12
  },
  buddySelectTitle: {
    color: "#d7bd57",
    fontSize: 18,
    fontWeight: "900"
  },
  buddySelectMeta: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3
  },
  buddySelectClose: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.14)",
    borderColor: "rgba(249,251,247,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  buddySelectCloseText: {
    color: "#f9fbf7",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22
  },
  buddySelectGrid: {
    gap: 9
  },
  buddySelectCard: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.09)",
    borderColor: "rgba(249,251,247,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 96,
    padding: 9
  },
  buddySelectCardActive: {
    backgroundColor: "rgba(215,189,87,0.18)",
    borderColor: "#d7bd57"
  },
  buddySelectBugWrap: {
    alignItems: "center",
    backgroundColor: "#f9fbf7",
    borderRadius: 14,
    borderWidth: 2,
    height: 82,
    justifyContent: "center",
    width: 82
  },
  buddySelectTextBlock: {
    flex: 1,
    minWidth: 0
  },
  buddySelectName: {
    color: "#f9fbf7",
    fontSize: 13,
    fontWeight: "900"
  },
  buddySelectLevel: {
    color: "#d7bd57",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  buddySelectBonus: {
    color: "#dce9df",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 3
  },
  buddySelectNext: {
    color: "#69c88d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  buddySelectActivePill: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    color: "#102018",
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  buddyText: {
    flex: 1,
    minWidth: 0
  },
  buddyTimerRing: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.72)",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 2,
    bottom: -2,
    height: 31,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 31
  },
  buddyTimerText: {
    color: "#f9fbf7",
    fontSize: 9,
    fontWeight: "900"
  },
  buddyTitleActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  buddyTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between"
  },
  buddyTitle: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900"
  },
  buddyTrack: {
    backgroundColor: "rgba(249,251,247,0.18)",
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    overflow: "hidden"
  },
  squadMasteryCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 10
  },
  squadMasteryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  squadMasteryTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  squadMasteryMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900"
  },
  squadMasteryList: {
    gap: 7
  },
  squadMasteryItem: {
    alignItems: "center",
    backgroundColor: "#f3f8f1",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 56,
    padding: 7
  },
  squadMasteryText: {
    flex: 1,
    minWidth: 0
  },
  squadMasteryName: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  squadMasteryDetail: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1
  },
  squadMasteryTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 5,
    marginTop: 5,
    overflow: "hidden"
  },
  squadMasteryFill: {
    backgroundColor: "#f2a000",
    height: "100%"
  },
  squadMasteryBadge: {
    alignItems: "flex-end",
    flexShrink: 0
  },
  squadMasteryLevel: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  squadMasteryRole: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900"
  },
  bugLampCard: {
    backgroundColor: "#1f1a2e",
    borderColor: "#8e6cff"
  },
  bugLampHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  bugLampIcon: {
    alignItems: "center",
    backgroundColor: "#f1d36b",
    borderColor: "#fff4b0",
    borderRadius: 999,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  bugLampIconText: {
    color: "#2c2207",
    fontSize: 20,
    fontWeight: "900"
  },
  bugLampText: {
    flex: 1
  },
  bugLampTitle: {
    color: "#ffffff"
  },
  bugLampMeta: {
    color: "#ddd6ff",
    fontSize: 12,
    fontWeight: "800"
  },
  bugLampButton: {
    backgroundColor: "#f1d36b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bugLampButtonText: {
    color: "#2c2207",
    fontSize: 12,
    fontWeight: "900"
  },
  bugLampEffect: {
    color: "#f8edb5",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10
  },
  stage: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d0dfcf",
    borderRadius: 8,
    borderWidth: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 12,
    padding: 12
  },
  stageHidden: {
    display: "none"
  },
  stageTierItem: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 3,
    height: 72,
    justifyContent: "center",
    overflow: "visible",
    paddingTop: 5,
    width: 72
  },
  stageTierItemActive: {
    elevation: 4,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6
  },
  stageShine: {
    height: 28,
    opacity: 0.58,
    position: "absolute",
    right: -14,
    top: -14,
    transform: [{ rotate: "45deg" }],
    width: 28
  },
  stageMedal: {
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    bottom: -7,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    width: 28
  },
  stageStar: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14
  },
  tierWrap: {
    marginBottom: 12
  },
  tierToggle: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  tierToggleText: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  rankingCard: {
    backgroundColor: "#102018",
    borderRadius: 8,
    gap: 10,
    padding: 14
  },
  dexCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
    padding: 14
  },
  dexText: {
    flex: 1
  },
  dexTitle: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  dexMeta: {
    color: "#52665d",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  dexBugs: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  dexBugJar: {
    alignItems: "center",
    width: 42
  },
  dexBugJarLid: {
    backgroundColor: "#6d5441",
    borderColor: "#3e2e24",
    borderRadius: 5,
    borderWidth: 1,
    height: 7,
    marginBottom: -2,
    width: 28,
    zIndex: 2
  },
  dexBugSlot: {
    alignItems: "center",
    backgroundColor: "rgba(220,244,250,0.62)",
    borderColor: "rgba(16,32,24,0.16)",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderRadius: 10,
    borderWidth: 2,
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
    width: 46
  },
  dexBugJarShine: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderRadius: 999,
    height: 28,
    left: 7,
    position: "absolute",
    top: 7,
    transform: [{ rotate: "9deg" }],
    width: 5
  },
  dexBugJarBase: {
    backgroundColor: "rgba(41,67,56,0.18)",
    borderRadius: 999,
    bottom: 4,
    height: 4,
    left: 8,
    position: "absolute",
    right: 8
  },
  dexEmptySlot: {
    color: "#8ca099",
    fontSize: 18,
    fontWeight: "900"
  },
  workshopCard: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    overflow: "hidden",
    padding: 10
  },
  workshopImage: {
    borderRadius: 8,
    height: 86,
    width: 86
  },
  workshopText: {
    flex: 1,
    minWidth: 0
  },
  workshopTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  workshopBody: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3
  },
  workshopCta: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6
  },
  missionCard: {
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  missionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  missionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  missionWeek: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  missionList: {
    gap: 9
  },
  missionItem: {
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    padding: 10
  },
  missionLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  missionName: {
    color: "#102018",
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  missionCount: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "900"
  },
  missionDone: {
    color: "#15724f"
  },
  missionTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 8,
    marginTop: 7,
    overflow: "hidden"
  },
  missionFill: {
    backgroundColor: "#15724f",
    height: "100%"
  },
  missionClaimButton: {
    alignSelf: "flex-start",
    backgroundColor: "#15724f",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  missionClaimText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  missionBonusButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  missionBonusText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  missionReward: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6
  },
  missionError: {
    color: "#b9382f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6
  },
  reportCard: {
    alignItems: "center",
    backgroundColor: "#eaf7f0",
    borderColor: "#8cc5aa",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    minHeight: 82,
    padding: 12
  },
  reportBug: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#b9dcca",
    borderRadius: 8,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    width: 70
  },
  reportText: {
    flex: 1,
    minWidth: 0
  },
  reportTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  reportBody: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2
  },
  reportCta: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 58,
    textAlign: "right"
  },
  wikiCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    padding: 12
  },
  wikiImage: {
    borderRadius: 8,
    height: 58,
    width: 82
  },
  wikiText: {
    flex: 1,
    minWidth: 0
  },
  wikiTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  wikiBody: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2
  },
  wikiCta: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  rankingHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  rankingBoards: {
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  rankingColumn: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  rankingColumnLabel: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900"
  },
  rankingLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minWidth: 0
  },
  rank: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    width: 24
  },
  rankingName: {
    color: "#ffffff",
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 0
  },
  rankingPoints: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    width: 44
  },
});
