import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { buddyActionAvailability } from "../services/bugBuddyActionModel";
import { applyBuddyCareAction, buddyCareActions, buddyXpMultiplier, claimBuddyTaskReward, emptyBuddyCareState, loadBuddyState, saveBuddyState, type BuddyCareAction, type BuddyCareState } from "../services/bugBuddyService";
import { entryByBugId, type BugDexDropResult } from "../services/bugDexService";
import { bugMasteryXpForNextLevel, listBugMastery, normalizeBugMastery } from "../services/bugMasteryService";
import { sanitizeActiveBugSquad } from "../services/bugSquadService";
import { dismissPhoneNotification, scheduleBuddyTaskNotification } from "../services/notificationService";
import { useI18n } from "../services/i18n";
import { gameTheme } from "../theme/gameTheme";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { useReducedMotion } from "../theme/useReducedMotion";
import type { BugMastery, User } from "../types";
import { BugArtImage } from "./BugArtImage";

const buddyPetImage = require("../../assets/buddy/kenney/pets/buddy_bee.png");

type Props = {
  user: User;
  onClose: () => void;
  onOpenCollection: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

export function BuddyOverlay({ user, onClose, onOpenCollection, onRewardDrop, onUserUpdated }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const reduceMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(0)).current;
  const autoClaimedTaskRef = useRef<string | null>(null);
  const activeSquadIds = useMemo(() => sanitizeActiveBugSquad(user.activeBugSquad), [user.activeBugSquad]);
  const fallbackBugId = activeSquadIds[0] ?? "";
  const [buddyBugId, setBuddyBugId] = useState(fallbackBugId);
  const [care, setCare] = useState<BuddyCareState>(() => emptyBuddyCareState(localDayId()));
  const [masteryByBugId, setMasteryByBugId] = useState<Record<string, BugMastery>>({});
  const [selectedAction, setSelectedAction] = useState<BuddyCareAction>(buddyCareActions[0]?.id ?? "clean");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [claimPopup, setClaimPopup] = useState<{ action: BuddyCareAction; awardedXp: number; reward: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const buddyEntry = entryByBugId(buddyBugId || fallbackBugId);
  const mastery = buddyEntry ? masteryByBugId[buddyEntry.id] ?? normalizeBugMastery(buddyEntry.id) : null;
  const task = care.activeTask;
  const activeTask = task && task.endsAt > now ? task : undefined;
  const finishedTask = task && task.endsAt <= now ? task : undefined;
  const taskDuration = activeTask ? Math.max(1, activeTask.endsAt - activeTask.startedAt) : 1;
  const taskProgress = activeTask ? Math.min(100, Math.max(0, Math.round(((now - activeTask.startedAt) / taskDuration) * 100))) : finishedTask ? 100 : 0;
  const taskRemaining = activeTask ? Math.max(0, activeTask.endsAt - now) : 0;
  const selectedConfig = buddyCareActions.find((action) => action.id === selectedAction) ?? buddyCareActions[0];
  const selectedAvailability = selectedConfig ? actionAvailability(care, selectedConfig, now) : null;
  const previewStats = selectedConfig ? applyBuddyCareAction(care.stats, selectedConfig.id) : care.stats;
  const previewXp = selectedConfig ? Math.round(selectedConfig.xp * buddyXpMultiplier(previewStats)) : 0;
  const masteryNextXp = buddyEntry && mastery ? bugMasteryXpForNextLevel(mastery.level, buddyEntry.rarity) : 1;
  const masteryCurrentXp = mastery?.xp ?? 0;
  const masteryProgress = Math.min(100, Math.round((masteryCurrentXp / masteryNextXp) * 100));

  useEffect(() => {
    const animation = Animated.spring(reveal, {
      damping: 16,
      stiffness: 170,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web"
    });
    if (reduceMotion) reveal.setValue(1);
    else animation.start();
    return () => animation.stop();
  }, [reduceMotion, reveal]);

  useEffect(() => {
    let active = true;
    const day = localDayId();
    if (!fallbackBugId) {
      setLoading(false);
      return () => { active = false; };
    }
    Promise.all([loadBuddyState(user.uid, fallbackBugId, day), listBugMastery(user)])
      .then(async ([state, masteryItems]) => {
        if (!active) return;
        const nextBugId = activeSquadIds.includes(state.bugId) ? state.bugId : fallbackBugId;
        setBuddyBugId(nextBugId);
        setCare(state.care);
        setMasteryByBugId(Object.fromEntries(masteryItems.map((item) => [item.bugId, item])));
        if (state.bugId !== nextBugId) {
          await saveBuddyState(user.uid, { bugId: nextBugId, care: state.care, updatedAt: new Date().toISOString() }).catch(() => undefined);
        }
      })
      .catch(() => setMessage(t("buddy.message.syncPending")))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeSquadIds.join("|"), fallbackBugId, t, user.uid]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || !finishedTask || busy) return;
    const taskKey = `${buddyBugId}:${finishedTask.action}:${finishedTask.startedAt}`;
    if (autoClaimedTaskRef.current === taskKey) return;
    autoClaimedTaskRef.current = taskKey;
    void claimReward(true);
  }, [buddyBugId, busy, finishedTask?.action, finishedTask?.startedAt, loading]);

  async function startAction() {
    if (!buddyEntry || !selectedConfig || !selectedAvailability?.ready || task || busy) return;
    const startedAt = Date.now();
    const day = localDayId();
    const current = care.day === day ? care : emptyBuddyCareState(day);
    const nextStats = applyBuddyCareAction(current.stats, selectedConfig.id);
    const xp = Math.round(selectedConfig.xp * buddyXpMultiplier(nextStats));
    const activeTaskValue = { action: selectedConfig.id, endsAt: startedAt + selectedConfig.cooldownMs, startedAt, xp };
    const nextCare: BuddyCareState = {
      ...current,
      activeTask: activeTaskValue,
      actions: { ...current.actions, [selectedConfig.id]: startedAt },
      day,
      lastAction: selectedConfig.id,
      lastAt: startedAt,
      lastXp: 0,
      stats: nextStats
    };
    setBusy("start");
    setCare(nextCare);
    setNow(startedAt);
    setMessage(t("buddy.message.starting", { action: actionLabel(selectedConfig.id, t) }));
    try {
      await saveBuddyState(user.uid, { bugId: buddyEntry.id, care: nextCare, updatedAt: new Date().toISOString() });
      const notificationId = await scheduleBuddyTaskNotification({
        actionLabel: actionLabel(selectedConfig.id, t),
        body: t("buddy.notification.body", { action: actionLabel(selectedConfig.id, t), xp }),
        endsAt: activeTaskValue.endsAt,
        taskId: `buddy:${day}:${buddyEntry.id}:${selectedConfig.id}:${startedAt}`,
        xp
      }).catch(() => "");
      if (notificationId) {
        const savedCare: BuddyCareState = { ...nextCare, activeTask: { ...activeTaskValue, notificationId } };
        setCare(savedCare);
        await saveBuddyState(user.uid, { bugId: buddyEntry.id, care: savedCare, updatedAt: new Date().toISOString() }).catch(() => undefined);
      }
      setMessage(t("buddy.message.huntStarted"));
    } catch {
      setMessage(t("buddy.message.syncPending"));
    } finally {
      setBusy("");
    }
  }

  async function claimReward(showPopup = false) {
    if (!buddyEntry || !finishedTask || busy) return;
    const taskToClaim = finishedTask;
    setBusy("claim");
    try {
      if (taskToClaim.notificationId) await dismissPhoneNotification(taskToClaim.notificationId).catch(() => undefined);
      const result = await claimBuddyTaskReward(user, { bugId: buddyEntry.id, care, updatedAt: new Date().toISOString() });
      setCare(result.state.care);
      setMasteryByBugId((current) => ({ ...current, [buddyEntry.id]: result.masteryResult.mastery }));
      if (result.drop?.updatedUser) onUserUpdated?.(result.drop.updatedUser);
      if (result.drop) onRewardDrop?.(result.drop);
      setMessage(result.masteryResult.awarded
        ? t("buddy.message.doneXp", { action: actionLabel(taskToClaim.action, t), xp: result.awardedXp })
        : t("buddy.message.capReached"));
      if (showPopup) {
        setClaimPopup({ action: taskToClaim.action, awardedXp: result.awardedXp, reward: rewardLabel(taskToClaim.action, t) });
      }
    } catch {
      autoClaimedTaskRef.current = null;
      setMessage(t("buddy.message.xpSaveFailed", { action: actionLabel(taskToClaim.action, t) }));
    } finally {
      setBusy("");
    }
  }

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          maxWidth: layout.modalMaxWidth,
          opacity: reveal,
          paddingHorizontal: layout.isCompact ? 12 : 16,
          transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }]
        }
      ]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BUG BUDDY</Text>
          <Text style={styles.title}>{t("buddy.title")}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={gameTheme.colors.accentStrong} /></View>
      ) : !buddyEntry ? (
        <View style={styles.emptyState}>
          <Image source={buddyPetImage} style={styles.emptyImage} resizeMode="contain" />
          <Text style={styles.emptyTitle}>{t("buddy.message.needSquad")}</Text>
          <Pressable onPress={onOpenCollection} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{t("bugdex.chooseSquad")}</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.buddyArtWrap}>
              <Image source={buddyPetImage} style={styles.buddyPet} resizeMode="contain" />
              <View style={styles.bugBadge}><BugArtImage bugId={buddyEntry.id} size={48} /></View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.buddyName} numberOfLines={1}>{buddyEntry.name}</Text>
              <Text style={styles.status}>{activeTask ? t("buddy.status.active") : finishedTask ? t("buddy.status.rewardReady") : selectedAvailability?.ready ? t("buddy.status.chooseHunt") : t("buddy.status.resting")}</Text>
              <Text style={styles.masteryText}>{t("buddy.progress", { level: mastery?.level ?? 1, current: masteryCurrentXp, next: masteryNextXp })}</Text>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${masteryProgress}%` }]} /></View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label={t("buddy.stat.happy")} value={care.stats.happy} />
            <Stat label={t("buddy.stat.energy")} value={care.stats.energy} />
            <Stat label={t("buddy.stat.bond")} value={care.stats.care} />
          </View>

          {activeTask ? (
            <View style={styles.actionCard}>
              <Text style={styles.actionEyebrow}>{t("buddy.status.active")}</Text>
              <Text style={styles.actionTitle}>{actionLabel(activeTask.action, t)}</Text>
              <Text style={styles.actionMeta}>{t("buddy.taskMeta", { time: formatDuration(taskRemaining, t), xp: activeTask.xp })}</Text>
              <View style={styles.progressTrack}><View style={[styles.actionProgressFill, { width: `${taskProgress}%` }]} /></View>
            </View>
          ) : finishedTask ? (
            <View style={[styles.actionCard, styles.rewardCard]}>
              <Text style={styles.actionEyebrow}>{t("buddy.status.rewardReady")}</Text>
              <Text style={styles.actionTitle}>{actionLabel(finishedTask.action, t)}</Text>
              <Text style={styles.actionMeta}>+{finishedTask.xp} mastery XP · {rewardLabel(finishedTask.action, t)}</Text>
              <Pressable disabled={Boolean(busy)} onPress={() => void claimReward()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{busy === "claim" ? "..." : t("buddy.claimReward")}</Text>
              </Pressable>
            </View>
          ) : selectedConfig ? (
            <>
              <View style={styles.choiceHeader}>
                <Text style={styles.choiceTitle}>{t("buddy.chooseHunt")}</Text>
                <Text style={styles.choiceCount}>{buddyCareActions.length}</Text>
              </View>
              <View style={styles.choiceList}>
                {buddyCareActions.map((action) => {
                  const availability = actionAvailability(care, action, now);
                  const nextStats = applyBuddyCareAction(care.stats, action.id);
                  const xp = Math.round(action.xp * buddyXpMultiplier(nextStats));
                  const selected = selectedAction === action.id;
                  return (
                    <Pressable key={action.id} onPress={() => setSelectedAction(action.id)} style={({ pressed }) => [styles.choiceCard, selected && styles.choiceCardSelected, !availability.ready && styles.choiceCardUnavailable, pressed && styles.choiceCardPressed]}>
                      <View style={styles.choiceTop}>
                        <View style={styles.choiceCopy}>
                          <Text style={[styles.choiceName, selected && styles.choiceNameSelected]}>{actionLabel(action.id, t)}</Text>
                          <Text style={[styles.choiceShort, selected && styles.choiceMutedSelected]}>{t(`buddy.action.${action.id}.short`)}</Text>
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                      </View>
                      <Text style={[styles.choiceMeta, selected && styles.choiceMetaSelected]}>{formatDuration(action.cooldownMs, t)} · +{xp} mastery · {rewardLabel(action.id, t)}</Text>
                      <Text style={[styles.choiceImpact, selected && styles.choiceMutedSelected]}>{t(`buddy.action.${action.id}.impact`)}</Text>
                      {!availability.ready ? <Text style={styles.choiceDisabled}>{availabilityLabel(availability.reason, availability.remainingMs, care.stats.energy, action, t)}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.selectedSummary}>
                <View style={styles.selectedCopy}>
                  <Text style={styles.selectedKicker}>{t("buddy.chooseHunt")}</Text>
                  <Text style={styles.selectedTitle}>{actionLabel(selectedConfig.id, t)}</Text>
                  <Text style={styles.selectedMeta}>{t("buddy.choiceMeta", { time: formatDuration(selectedConfig.cooldownMs, t), xp: previewXp })} · {rewardLabel(selectedConfig.id, t)}</Text>
                </View>
                <Pressable disabled={!selectedAvailability?.ready || Boolean(busy)} onPress={() => void startAction()} style={[styles.startButton, (!selectedAvailability?.ready || Boolean(busy)) && styles.buttonDisabled]}>
                  <Text style={styles.startButtonText}>{busy === "start" ? "..." : selectedAvailability?.ready ? t("buddy.start") : t("buddy.disabled.cooldown")}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
      )}

      <Modal animationType="fade" transparent visible={Boolean(claimPopup)} onRequestClose={() => setClaimPopup(null)}>
        <View style={styles.claimBackdrop}>
          <View style={styles.claimSheet}>
            <Text style={styles.claimKicker}>{t("buddy.status.rewardReady")}</Text>
            <Text style={styles.claimTitle}>{claimPopup ? actionLabel(claimPopup.action, t) : ""}</Text>
            <Text style={styles.claimReward}>{claimPopup ? `+${claimPopup.awardedXp} mastery XP · ${claimPopup.reward}` : ""}</Text>
            <View style={styles.claimActions}>
              <Pressable style={styles.claimSecondary} onPress={() => setClaimPopup(null)}>
                <Text style={styles.claimSecondaryText}>{t("common.close")}</Text>
              </Pressable>
              <Pressable style={styles.claimPrimary} onPress={() => { if (!claimPopup) return; setSelectedAction(claimPopup.action); setClaimPopup(null); }}>
                <Text style={styles.claimPrimaryText}>{t("buddy.start")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{Math.round(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statTrack}><View style={[styles.statFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>
    </View>
  );
}

function actionAvailability(care: BuddyCareState, action: (typeof buddyCareActions)[number], now: number) {
  return buddyActionAvailability({
    activeTask: Boolean(care.activeTask),
    energy: care.stats.energy,
    lastStartedAt: care.actions[action.id] ?? 0
  }, {
    cooldownMs: action.cooldownMs,
    energyCost: Math.max(0, -(action.stats.energy ?? 0)),
    id: action.id
  }, now);
}

function availabilityLabel(
  reason: ReturnType<typeof actionAvailability>["reason"],
  remainingMs: number,
  energy: number,
  action: (typeof buddyCareActions)[number],
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (reason === "active_task") return t("buddy.message.waitCurrent");
  if (reason === "energy") return t("buddy.disabled.energy", { energy: Math.round(energy), cost: Math.max(0, -(action.stats.energy ?? 0)) });
  if (reason === "cooldown") return `${t("buddy.disabled.cooldown")} · ${formatDuration(remainingMs, t)}`;
  return "";
}

function actionLabel(action: BuddyCareAction, t: (key: string, params?: Record<string, string | number>) => string) {
  return t(`buddy.action.${action}.label`);
}

function rewardLabel(action: BuddyCareAction, t: (key: string, params?: Record<string, string | number>) => string) {
  if (action === "adventure") return t("buddy.reward.epic");
  if (action === "train") return t("buddy.reward.rareDouble");
  if (action === "play") return t("buddy.reward.rare");
  return t("buddy.reward.common");
}

function formatDuration(ms: number, t: (key: string, params?: Record<string, string | number>) => string) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes >= 60) return t("buddy.time.hoursMinutes", { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 });
  return t("buddy.time.minutes", { minutes: totalMinutes });
}

function localDayId(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  sheet: { alignSelf: "center", backgroundColor: "#19152d", borderColor: "rgba(200,151,255,0.56)", borderTopLeftRadius: gameTheme.radius.xl, borderTopRightRadius: gameTheme.radius.xl, borderWidth: 1, maxHeight: "100%", minHeight: 0, paddingBottom: 10, paddingHorizontal: 16, paddingTop: 8, width: "100%" },
  handle: { alignSelf: "center", backgroundColor: gameTheme.colors.textFaint, borderRadius: gameTheme.radius.pill, height: 4, opacity: 0.65, width: 42 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 10 },
  kicker: { color: gameTheme.colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: gameTheme.colors.text, fontSize: 24, fontWeight: "900", marginTop: 2 },
  closeButton: { alignItems: "center", backgroundColor: gameTheme.colors.surfaceSoft, borderRadius: 16, height: 40, justifyContent: "center", width: 40 },
  closeText: { color: gameTheme.colors.text, fontSize: 27, lineHeight: 28 },
  body: { gap: 10, paddingBottom: 18 },
  loading: { alignItems: "center", minHeight: 240, justifyContent: "center" },
  emptyState: { alignItems: "center", gap: 12, minHeight: 250, justifyContent: "center" },
  emptyImage: { height: 92, width: 92 },
  emptyTitle: { color: gameTheme.colors.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  heroCard: { alignItems: "center", backgroundColor: "#30254c", borderColor: "rgba(200,151,255,0.46)", borderRadius: gameTheme.radius.lg, borderWidth: 1, flexDirection: "row", padding: 12 },
  buddyArtWrap: { height: 82, justifyContent: "center", width: 94 },
  buddyPet: { height: 72, width: 72 },
  bugBadge: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 24, bottom: 0, height: 48, justifyContent: "center", position: "absolute", right: 0, width: 48 },
  heroCopy: { flex: 1, marginLeft: 10 },
  buddyName: { color: gameTheme.colors.text, fontSize: 18, fontWeight: "900" },
  status: { color: gameTheme.colors.accentStrong, fontSize: 11, fontWeight: "900", marginTop: 4 },
  masteryText: { color: gameTheme.colors.textMuted, fontSize: 10, fontWeight: "800", marginTop: 8 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.11)", borderRadius: gameTheme.radius.pill, height: 7, marginTop: 7, overflow: "hidden" },
  progressFill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: gameTheme.radius.pill, height: "100%" },
  actionProgressFill: { backgroundColor: gameTheme.colors.success, borderRadius: gameTheme.radius.pill, height: "100%" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { backgroundColor: "rgba(120,184,255,0.12)", borderColor: "rgba(120,184,255,0.24)", borderRadius: gameTheme.radius.md, borderWidth: 1, flex: 1, padding: 10 },
  statValue: { color: gameTheme.colors.text, fontSize: 18, fontWeight: "900" },
  statLabel: { color: gameTheme.colors.textMuted, fontSize: 9, fontWeight: "900", marginTop: 1 },
  statTrack: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: gameTheme.radius.pill, height: 4, marginTop: 7, overflow: "hidden" },
  statFill: { backgroundColor: gameTheme.colors.success, borderRadius: gameTheme.radius.pill, height: "100%" },
  actionCard: { backgroundColor: "#f6f0d8", borderRadius: gameTheme.radius.lg, padding: 14 },
  rewardCard: { borderColor: gameTheme.colors.accentStrong, borderWidth: 1 },
  actionEyebrow: { color: "#7d6928", fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  actionTitle: { color: "#173126", fontSize: 18, fontWeight: "900", marginTop: 3 },
  actionMeta: { color: "#536559", fontSize: 10, fontWeight: "800", lineHeight: 15, marginTop: 5 },
  choiceHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  choiceTitle: { color: gameTheme.colors.text, fontSize: 14, fontWeight: "900" },
  choiceCount: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, color: gameTheme.colors.accentInk, fontSize: 10, fontWeight: "900", minWidth: 24, paddingHorizontal: 8, paddingVertical: 4, textAlign: "center" },
  choiceList: { gap: 7 },
  choiceCard: { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(200,151,255,0.26)", borderRadius: 14, borderWidth: 1, padding: 11 },
  choiceCardSelected: { backgroundColor: "#f4edf8", borderColor: "#c897ff", borderWidth: 2 },
  choiceCardUnavailable: { opacity: 0.67 },
  choiceCardPressed: { transform: [{ scale: 0.99 }] },
  choiceTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  choiceCopy: { flex: 1 },
  choiceName: { color: gameTheme.colors.text, fontSize: 13, fontWeight: "900" },
  choiceNameSelected: { color: "#173126" },
  choiceShort: { color: gameTheme.colors.textMuted, fontSize: 8.5, fontWeight: "800", marginTop: 2 },
  choiceMeta: { color: gameTheme.colors.accentStrong, fontSize: 8.5, fontWeight: "900", marginTop: 7 },
  choiceImpact: { color: gameTheme.colors.textMuted, fontSize: 8, fontWeight: "800", marginTop: 3 },
  choiceMutedSelected: { color: "#655b70" },
  choiceMetaSelected: { color: "#7c5b20" },
  choiceDisabled: { color: "#e79272", fontSize: 8, fontWeight: "900", marginTop: 5 },
  radio: { alignItems: "center", borderColor: gameTheme.colors.textFaint, borderRadius: 10, borderWidth: 2, height: 20, justifyContent: "center", width: 20 },
  radioSelected: { borderColor: gameTheme.colors.accentStrong },
  radioDot: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 5, height: 10, width: 10 },
  selectedSummary: { alignItems: "center", backgroundColor: "#27203f", borderColor: "#f2bd54", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  selectedCopy: { flex: 1 },
  selectedKicker: { color: gameTheme.colors.accentStrong, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  selectedTitle: { color: gameTheme.colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 },
  selectedMeta: { color: gameTheme.colors.textMuted, fontSize: 8.5, fontWeight: "800", marginTop: 3 },
  startButton: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 12, justifyContent: "center", minHeight: 42, minWidth: 82, paddingHorizontal: 12 },
  startButtonText: { color: gameTheme.colors.accentInk, fontSize: 10, fontWeight: "900" },
  primaryButton: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: gameTheme.radius.md, justifyContent: "center", marginTop: 12, minHeight: 44, paddingHorizontal: 16 },
  primaryButtonText: { color: gameTheme.colors.accentInk, fontSize: 12, fontWeight: "900" },
  buttonDisabled: { opacity: 0.45 },
  message: { color: gameTheme.colors.textMuted, fontSize: 10, fontWeight: "800", textAlign: "center" },
  claimBackdrop: { alignItems: "center", backgroundColor: "rgba(5,3,12,0.78)", flex: 1, justifyContent: "center", padding: 20 },
  claimSheet: { backgroundColor: "#f6f0d8", borderColor: gameTheme.colors.accentStrong, borderRadius: 22, borderWidth: 2, maxWidth: 420, padding: 20, width: "100%" },
  claimKicker: { color: "#7d6928", fontSize: 9, fontWeight: "900", letterSpacing: 1, textAlign: "center", textTransform: "uppercase" },
  claimTitle: { color: "#173126", fontSize: 23, fontWeight: "900", marginTop: 5, textAlign: "center" },
  claimReward: { color: "#536559", fontSize: 12, fontWeight: "800", marginTop: 8, textAlign: "center" },
  claimActions: { flexDirection: "row", gap: 9, marginTop: 18 },
  claimSecondary: { alignItems: "center", borderColor: "rgba(23,49,38,0.30)", borderRadius: 13, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46 },
  claimSecondaryText: { color: "#173126", fontSize: 11, fontWeight: "900" },
  claimPrimary: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 13, flex: 1.25, justifyContent: "center", minHeight: 46, paddingHorizontal: 10 },
  claimPrimaryText: { color: gameTheme.colors.accentInk, fontSize: 11, fontWeight: "900", textAlign: "center" }
});
