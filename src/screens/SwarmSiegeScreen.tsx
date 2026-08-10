import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SwarmAssaultGame } from "../components/swarm/SwarmAssaultGame";
import { SwarmBossStage } from "../components/swarm/SwarmBossStage";
import { useI18n } from "../services/i18n";
import { awardBugMasteryBattleWin } from "../services/bugMasteryService";
import { entryByBugId, listBugDexInventory, type BugDexDropResult } from "../services/bugDexService";
import { completedPveBattleBugIds, stablePveBattleEventId } from "../services/bugCrownService";
import { sanitizeActiveBugSquad } from "../services/bugSquadService";
import { nativeDriver } from "../services/animationPlatform";
import { swarmEventCountdownTarget } from "../services/swarmEventSchedule";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import {
  claimSwarmSiegeReward,
  getSwarmSiegeStatus,
  startSwarmSiegeRun,
  submitSwarmSiegeRun,
  type SwarmSiegeRunTicket,
  type SwarmSiegeStatus
} from "../services/swarmSiegeService";
import type { ArcadeRunResult, User } from "../types";

const bossArt = require("../../assets/generated/solo-boss-hornet-hd.webp");
const SWARM_PHASES = ["signal_hunt", "armor_break", "nest_surge", "unstable_core"] as const;
type Props = {
  onBack: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
  user: User;
};

type RunState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "running"; ticket: SwarmSiegeRunTicket }
  | { damage: number; kind: "result"; score: number }
  | { kind: "submitting"; ticket: SwarmSiegeRunTicket; score: number };

export function SwarmSiegeScreen({ onBack, onRewardDrop, onUserUpdated, user }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<SwarmSiegeStatus | null>(null);
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rewardReveal, setRewardReveal] = useState<{ awardedBugId?: string; duplicate?: boolean; medalId?: string; xp: number } | null>(null);
  const [pendingBugDrop, setPendingBugDrop] = useState<BugDexDropResult | null>(null);
  const autoClaimedEventRef = useRef("");
  const swarmDrift = useRef(new Animated.Value(0)).current;
  const swarmDriftReverse = useRef(new Animated.Value(0)).current;
  const bossPulse = useRef(new Animated.Value(0)).current;
  const impactFlash = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    setError("");
    try {
      setStatus(await getSwarmSiegeStatus(user));
    } catch (value) {
      setError(value instanceof Error ? value.message : t("swarm.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (reducedMotion) {
      swarmDrift.setValue(0.5);
      swarmDriftReverse.setValue(0.5);
      bossPulse.setValue(0.5);
      return;
    }
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(swarmDrift, { duration: 4200, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(swarmDrift, { duration: 4200, toValue: 0, useNativeDriver: nativeDriver })
    ]), { iterations: 4 });
    const reverse = Animated.loop(Animated.sequence([
      Animated.timing(swarmDriftReverse, { duration: 5600, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(swarmDriftReverse, { duration: 5600, toValue: 0, useNativeDriver: nativeDriver })
    ]), { iterations: 3 });
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(bossPulse, { duration: 1200, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(bossPulse, { duration: 1200, toValue: 0, useNativeDriver: nativeDriver })
    ]), { iterations: 6 });
    drift.start();
    reverse.start();
    pulse.start();
    return () => {
      drift.stop();
      reverse.stop();
      pulse.stop();
    };
  }, [bossPulse, reducedMotion, swarmDrift, swarmDriftReverse]);

  useEffect(() => {
    if (!status) return;
    const next = Math.min(1, status.progress / Math.max(1, status.target));
    Animated.timing(progressAnimation, { duration: reducedMotion ? 0 : 650, toValue: next, useNativeDriver: false }).start();
  }, [progressAnimation, reducedMotion, status]);

  async function startAttack() {
    setRunState({ kind: "starting" });
    setError("");
    try {
      const ticket = await startSwarmSiegeRun(user);
      setRunState({ kind: "running", ticket });
    } catch (value) {
      setRunState({ kind: "idle" });
      setError(value instanceof Error ? value.message : t("swarm.error.start"));
    }
  }

  async function finishAttack(ticket: SwarmSiegeRunTicket, result: ArcadeRunResult) {
    setRunState({ kind: "submitting", score: result.score, ticket });
    setError("");
    try {
      const submitted = await submitSwarmSiegeRun(user, ticket.runId, result.score);
      setStatus(submitted.status);
      setRunState({ damage: submitted.damage, kind: "result", score: submitted.score });
      if (!submitted.duplicate && submitted.damage > 0) {
        const squadIds = sanitizeActiveBugSquad(user.activeBugSquad);
        const battleBugIds = completedPveBattleBugIds({
          battleId: `${ticket.eventId}:${ticket.runId}`,
          kind: "swarm",
          usedSquadIds: squadIds,
          won: true
        });
        void Promise.allSettled(battleBugIds.map((bugId) => {
          const eventId = stablePveBattleEventId("swarm", `${ticket.eventId}:${ticket.runId}`, bugId);
          return awardBugMasteryBattleWin(user, bugId, eventId);
        }));
      }
      impactFlash.setValue(0);
      if (!reducedMotion) {
        Animated.sequence([
          Animated.timing(impactFlash, { duration: 90, toValue: 1, useNativeDriver: nativeDriver }),
          Animated.timing(impactFlash, { duration: 320, toValue: 0, useNativeDriver: nativeDriver })
        ]).start();
      }
    } catch (value) {
      setRunState({ kind: "idle" });
      setError(value instanceof Error ? value.message : t("swarm.error.submit"));
      await refresh();
    }
  }

  const claimReward = useCallback(async (targetStatus: SwarmSiegeStatus) => {
    if (claiming) return;
    setClaiming(true);
    setError("");
    try {
      const result = await claimSwarmSiegeReward(user, targetStatus.eventId);
      setStatus((current) => current ? { ...current, claimed: true, medalId: result.medalId } : current);
      if (result.awardedBugId) {
        const items = await listBugDexInventory(user, { force: true }).catch(() => []);
        const entry = entryByBugId(result.awardedBugId);
        const item = items.find((candidate) => candidate.bugId === result.awardedBugId);
        if (entry && item) {
          setPendingBugDrop({ rewardType: "bug", entry, item, isNew: !result.duplicate && item.count === 1, source: "swarm_event" });
        }
      }
      setRewardReveal({
        awardedBugId: result.awardedBugId,
        duplicate: result.duplicate,
        medalId: result.medalId,
        xp: result.awardedXp
      });
      if (result.awardedXp > 0) onUserUpdated?.({ ...user, totalPoints: user.totalPoints + result.awardedXp });
    } catch (value) {
      setError(value instanceof Error ? value.message : t("swarm.error.claim"));
    } finally {
      setClaiming(false);
    }
  }, [claiming, onUserUpdated, t, user]);

  function closeRewardReveal() {
    setRewardReveal(null);
    if (pendingBugDrop) {
      onRewardDrop?.(pendingBugDrop);
      setPendingBugDrop(null);
    }
  }

  useEffect(() => {
    if (!status || status.state !== "result" || status.personalDamage < 1 || status.claimed || claiming) return;
    if (autoClaimedEventRef.current === status.eventId) return;
    autoClaimedEventRef.current = status.eventId;
    void claimReward(status);
  }, [claimReward, claiming, status]);

  if (runState.kind === "running") {
    const { ticket } = runState;
    return (
      <SwarmAssaultGame
        onBack={() => {
          setRunState({ kind: "idle" });
          void refresh();
        }}
        onResult={(result) => { void finishAttack(ticket, result); }}
        phaseId={status?.phaseId ?? "signal_hunt"}
        ticket={ticket}
        user={user}
      />
    );
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color="#e7c96a" size="large" /></View>;
  }

  if (!status) {
    return (
      <View style={styles.loading}>
        <View style={styles.offlineArtFrame}>
          <Image source={bossArt} resizeMode="contain" style={styles.offlineArt} />
        </View>
        <Text style={styles.offlineKicker}>{t("swarm.title")}</Text>
        <Text style={styles.errorText}>{error || t("swarm.error.load")}</Text>
        <Pressable onPress={() => { setLoading(true); void refresh(); }} style={styles.retryButton}>
          <Text style={styles.retryText}>{t("swarm.retry")}</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.backLink}><Text style={styles.backLinkText}>{t("swarm.back")}</Text></Pressable>
      </View>
    );
  }

  const busy = runState.kind === "starting" || runState.kind === "submitting";
  const canAttack = status.active && !status.complete && status.attacksRemaining > 0 && !busy;
  const countdownTarget = swarmEventCountdownTarget(status);
  const activePhaseIndex = Math.max(0, SWARM_PHASES.indexOf(status.phaseId as (typeof SWARM_PHASES)[number]));
  const primaryActionLabel = canAttack
    ? t("swarm.attack", { count: status.attacksRemaining })
    : status.state === "result"
      ? status.personalDamage > 0
        ? status.claimed
          ? t("swarm.reward.claimed")
          : claiming
            ? t("swarm.reward.claiming")
            : t("swarm.reward.ready", { xp: status.rewardXp })
        : t("swarm.eventFinished")
      : status.state === "preview"
        ? t("swarm.state.preview")
        : status.state === "upcoming"
          ? t("swarm.state.upcoming")
          : t("swarm.noAttacksShort");
  const actionHint = status.state === "preview"
    ? t("swarm.previewHint")
    : status.state === "upcoming"
      ? t("swarm.upcomingHint")
      : status.state === "result"
        ? status.personalDamage > 0 ? t("swarm.resultHint") : t("swarm.noContribution")
        : status.attacksRemaining < 1 ? t("swarm.noAttacks") : "";

  return (
    <>
      <View style={styles.screen}>
      <View style={[styles.content, { maxWidth: layout.shellMaxWidth, padding: layout.gutter, paddingBottom: layout.navigationMode === "bottom" ? layout.bottomNavHeight + 16 : 16 }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel={t("swarm.back")} accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>{t("swarm.kicker")}</Text>
          <Text numberOfLines={1} style={[styles.screenTitle, layout.isCompact && styles.screenTitleCompact]}>{t("swarm.title")}</Text>
        </View>
        <View style={styles.livePill}><Text style={styles.livePillText}>{t(`swarm.state.${status.state}`)}</Text></View>
      </View>

      <View style={[styles.eventGrid, layout.isTablet && styles.eventGridTablet]}>
      <View style={styles.primaryColumn}>
      <SwarmBossStage
        bossArt={bossArt}
        bossPulse={bossPulse}
        compact={!layout.isTablet}
        impactFlash={impactFlash}
        status={status}
        swarmDrift={swarmDrift}
        swarmDriftReverse={swarmDriftReverse}
        t={t}
      />

      <View style={styles.actionPanel}>
        <Text style={styles.actionKicker}>{t("swarm.nextAction")}</Text>
        <Pressable
          disabled={!canAttack}
          onPress={() => { void startAttack(); }}
          style={({ pressed }) => [styles.attackButton, !canAttack && styles.buttonDisabled, pressed && canAttack && styles.attackPressed]}
        >
          {busy ? <ActivityIndicator color="#102018" /> : <Text style={styles.attackButtonText}>{primaryActionLabel}</Text>}
        </Pressable>
        <View style={styles.loopRow}>
          <View style={styles.loopStep}><Text style={styles.loopNumber}>1</Text><Text style={styles.loopLabel}>{t("swarm.loop.play")}</Text></View>
          <Text style={styles.loopArrow}>→</Text>
          <View style={styles.loopStep}><Text style={styles.loopNumber}>2</Text><Text style={styles.loopLabel}>{t("swarm.loop.damage")}</Text></View>
          <Text style={styles.loopArrow}>→</Text>
          <View style={styles.loopStep}><Text style={styles.loopNumber}>3</Text><Text style={styles.loopLabel}>{t("swarm.loop.reward")}</Text></View>
        </View>
        {actionHint ? <Text style={styles.disabledHint}>{actionHint}</Text> : null}
      </View>
      </View>

      <ScrollView contentContainerStyle={styles.detailsContent} nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.detailsScroll}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.cardKicker}>{t("swarm.sharedProgress")}</Text>
            <Text style={styles.progressValue}>{status.progress}/{status.target}</Text>
          </View>
          <View style={styles.countdownPill}>
            <Text style={styles.countdownLabel}>{status.state === "result" ? t("swarm.finalTier") : status.state === "live" ? t("swarm.endsIn") : t("swarm.startsIn")}</Text>
            <Text style={styles.countdown}>{status.state === "result" ? t(`swarm.rewardTier.${status.rewardTierId}`) : formatSwarmCountdown(countdownTarget)}</Text>
          </View>
        </View>
        <View style={styles.track}><Animated.View style={[styles.fill, { width: progressAnimation.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} /></View>
        <View style={styles.phaseRail}>
          {SWARM_PHASES.map((phaseId, index) => (
            <View key={phaseId} style={styles.phaseStep}>
              <View style={[styles.phaseDot, index <= activePhaseIndex && styles.phaseDotActive]}>
                <Text style={[styles.phaseDotText, index <= activePhaseIndex && styles.phaseDotTextActive]}>{index + 1}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.phaseLabel, index === activePhaseIndex && styles.phaseLabelActive]}>{t(`swarm.phaseShort.${phaseId}`)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{status.personalDamage}</Text><Text style={styles.statLabel}>{t("swarm.personalLabel")}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{status.contributorCount}</Text><Text style={styles.statLabel}>{t("swarm.contributors")}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{status.attacksRemaining}/3</Text><Text style={styles.statLabel}>{t("swarm.attacks")}</Text></View>
        </View>
      </View>

      <View style={styles.directiveCard}>
        <Text style={styles.directiveKicker}>{t("swarm.aiDirector")}</Text>
        <Text style={styles.directiveTitle}>{t(`swarm.modifier.${status.modifier}`)}</Text>
        <Text style={styles.directiveBody}>{t(`swarm.modifierBody.${status.modifier}`)}</Text>
      </View>

      {runState.kind === "result" ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultKicker}>{t("swarm.result")}</Text>
          <Text style={styles.resultTitle}>+{runState.damage} {t("swarm.damage")}</Text>
          <Text style={styles.resultBody}>{t("swarm.resultBody", { score: runState.score })}</Text>
          <Pressable onPress={() => setRunState({ kind: "idle" })} style={styles.resultClose}>
            <Text style={styles.resultCloseText}>{t("swarm.continue")}</Text>
          </Pressable>
        </View>
      ) : null}

      {status.state === "result" && status.personalDamage > 0 ? (
        <View style={styles.rewardCard}>
          <Text style={styles.rewardKicker}>{t("swarm.reward.kicker")}</Text>
          <Text style={styles.rewardTitle}>{status.claimed ? t("swarm.reward.claimed") : t("swarm.reward.ready", { xp: status.rewardXp })}</Text>
          <Text style={styles.rewardBody}>{t("swarm.reward.tier", { tier: t(`swarm.rewardTier.${status.rewardTierId}`), xp: status.rewardXp })}</Text>
          {!status.claimed ? (
            <Pressable disabled={claiming} onPress={() => { void claimReward(status); }} style={[styles.claimButton, claiming && styles.buttonDisabled]}>
              <Text style={styles.claimButtonText}>{claiming ? t("swarm.reward.claiming") : t("swarm.reward.claim")}</Text>
            </Pressable>
          ) : null}
          {status.medalId ? <Text style={styles.medal}>◆ {t("swarm.reward.medal")}</Text> : null}
        </View>
      ) : null}

      {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>
      </View>
      </View>
      </View>

      <Modal animationType="fade" onRequestClose={closeRewardReveal} transparent visible={Boolean(rewardReveal)}>
        <View style={styles.rewardBackdrop}>
          <View style={styles.rewardModal}>
            <Text style={styles.rewardModalKicker}>{t("swarm.reward.kicker")}</Text>
            <Text style={styles.rewardModalTitle}>{t("swarm.reward.received")}</Text>
            {rewardReveal?.awardedBugId ? <Text style={styles.rewardModalBugMeta}>{t("swarm.reward.bugCatchReady")}</Text> : null}
            <Text style={styles.rewardModalXp}>+{rewardReveal?.xp ?? 0} XP</Text>
            {rewardReveal?.medalId ? <Text style={styles.rewardModalMedal}>◆ {t("swarm.reward.medal")}</Text> : null}
            <Pressable onPress={closeRewardReveal} style={styles.rewardModalButton}>
              <Text style={styles.rewardModalButtonText}>{t("swarm.reward.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function formatSwarmCountdown(iso: string, now = Date.now()) {
  const remaining = Math.max(0, new Date(iso).getTime() - now);
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days > 0 ? `${days}d ${hours}u` : `${hours}u ${minutes}m`;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#100b28", flex: 1 },
  content: { alignSelf: "center", flex: 1, width: "100%" },
  loading: { alignItems: "center", backgroundColor: "#100b28", flex: 1, gap: 16, justifyContent: "center", padding: 24 },
  offlineArtFrame: {
    alignItems: "center",
    backgroundColor: "#2a174e",
    borderColor: "#ffb34d",
    borderRadius: 28,
    borderWidth: 2,
    height: 180,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#ff8439",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    width: 240
  },
  offlineArt: { height: 164, width: 220 },
  offlineKicker: { color: "#ffcf66", fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  topBar: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 10 },
  backButton: { alignItems: "center", backgroundColor: "#24184f", borderColor: "#745be0", borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: "#ffffff", fontSize: 34, lineHeight: 36, marginTop: -3 },
  topCopy: { flex: 1 },
  kicker: { color: "#a996ff", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  screenTitle: { color: "#ffffff", fontSize: 23, fontWeight: "900", marginTop: 1 },
  screenTitleCompact: { fontSize: 20 },
  livePill: { backgroundColor: "#e96730", borderColor: "#ffac66", borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  livePillText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  eventGrid: { flex: 1, gap: 9, minHeight: 0 },
  eventGridTablet: { flexDirection: "row" },
  primaryColumn: { flex: 1, gap: 9, minHeight: 0 },
  actionPanel: { backgroundColor: "#21164a", borderColor: "#745be0", borderRadius: 18, borderWidth: 1, padding: 11 },
  actionKicker: { color: "#b8a7ff", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  attackButton: { alignItems: "center", backgroundColor: "#ff8a3d", borderColor: "#ffd09c", borderRadius: 14, borderWidth: 1, justifyContent: "center", marginTop: 7, minHeight: 50, paddingHorizontal: 16 },
  attackButtonText: { color: "#281442", fontSize: 15, fontWeight: "900" },
  attackPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  buttonDisabled: { opacity: 0.42 },
  loopRow: { alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 8 },
  loopStep: { alignItems: "center", flex: 1 },
  loopNumber: { alignItems: "center", backgroundColor: "rgba(169,150,255,0.18)", borderColor: "rgba(169,150,255,0.54)", borderRadius: 12, borderWidth: 1, color: "#cfbeff", fontSize: 9, fontWeight: "900", height: 22, lineHeight: 20, textAlign: "center", width: 22 },
  loopLabel: { color: "#ded7ff", fontSize: 8, fontWeight: "900", marginTop: 3, textAlign: "center" },
  loopArrow: { color: "#7f70b2", fontSize: 12, fontWeight: "900", marginTop: -8 },
  disabledHint: { color: "#ada4d1", fontSize: 9, lineHeight: 13, marginTop: 6, textAlign: "center" },
  detailsScroll: { flex: 1, minHeight: 0 },
  detailsContent: { gap: 9, paddingBottom: 4 },
  progressCard: { backgroundColor: "#21164a", borderColor: "#624bb8", borderRadius: 18, borderWidth: 1, padding: 12 },
  progressHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  cardKicker: { color: "#aaa0cf", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  progressValue: { color: "#ffffff", fontSize: 23, fontWeight: "900", marginTop: 1 },
  countdownPill: { alignItems: "flex-end", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6 },
  countdownLabel: { color: "#aaa0cf", fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  countdown: { color: "#ff9b4a", fontSize: 14, fontWeight: "900", marginTop: 1 },
  track: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, height: 11, marginTop: 10, overflow: "hidden" },
  fill: { backgroundColor: "#ff8439", borderRadius: 999, height: "100%" },
  phaseRail: { flexDirection: "row", gap: 4, marginTop: 9 },
  phaseStep: { alignItems: "center", flex: 1 },
  phaseDot: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.16)", borderRadius: 11, borderWidth: 1, height: 22, justifyContent: "center", width: 22 },
  phaseDotActive: { backgroundColor: "#8e73ff", borderColor: "#cabdff" },
  phaseDotText: { color: "#8479aa", fontSize: 8, fontWeight: "900" },
  phaseDotTextActive: { color: "#ffffff" },
  phaseLabel: { color: "#8175ac", fontSize: 7, fontWeight: "800", marginTop: 3, maxWidth: 68, textAlign: "center" },
  phaseLabelActive: { color: "#c7b9ff" },
  statRow: { borderTopColor: "rgba(255,255,255,0.1)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 9 },
  stat: { flex: 1 },
  statValue: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#a79dc9", fontSize: 8, fontWeight: "800", marginTop: 1 },
  directiveCard: { backgroundColor: "#2c1e62", borderColor: "#745be0", borderRadius: 15, borderWidth: 1, padding: 11 },
  directiveKicker: { color: "#ff9b4a", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  directiveTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  directiveBody: { color: "#d3cbf4", fontSize: 10, lineHeight: 14, marginTop: 3 },
  resultCard: { backgroundColor: "#ffd7b6", borderColor: "#ff8a3d", borderRadius: 17, borderWidth: 1, padding: 14 },
  resultKicker: { color: "#8e3116", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  resultTitle: { color: "#271441", fontSize: 22, fontWeight: "900", marginTop: 2 },
  resultBody: { color: "#65475d", fontSize: 11, lineHeight: 16, marginTop: 4 },
  resultClose: { alignSelf: "flex-start", marginTop: 8, paddingVertical: 4 },
  resultCloseText: { color: "#633cb7", fontSize: 12, fontWeight: "900" },
  rewardCard: { backgroundColor: "#f1eaff", borderColor: "#a88cff", borderRadius: 17, borderWidth: 1, padding: 14 },
  rewardKicker: { color: "#6844b3", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  rewardTitle: { color: "#271441", fontSize: 18, fontWeight: "900", marginTop: 3 },
  rewardBody: { color: "#5e5278", fontSize: 11, lineHeight: 16, marginTop: 5 },
  claimButton: { alignItems: "center", backgroundColor: "#ff8439", borderRadius: 12, marginTop: 10, minHeight: 46, justifyContent: "center" },
  claimButtonText: { color: "#281442", fontSize: 13, fontWeight: "900" },
  medal: { color: "#6947b7", fontSize: 11, fontWeight: "900", marginTop: 8 },
  errorCard: { backgroundColor: "rgba(157,48,56,0.32)", borderColor: "#ef725f", borderRadius: 14, borderWidth: 1, padding: 11 },
  errorText: { color: "#ffd8ce", fontSize: 11, fontWeight: "800", lineHeight: 16, textAlign: "center" },
  rewardBackdrop: { alignItems: "center", backgroundColor: "rgba(10,5,30,0.86)", flex: 1, justifyContent: "center", padding: 22 },
  rewardModal: { alignItems: "center", backgroundColor: "#f1eaff", borderColor: "#a88cff", borderRadius: 24, borderWidth: 2, maxWidth: 380, padding: 24, width: "100%" },
  rewardModalKicker: { color: "#6844b3", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  rewardModalTitle: { color: "#271441", fontSize: 22, fontWeight: "900", marginTop: 5, textAlign: "center" },
  rewardModalBug: { alignItems: "center", marginTop: 12 },
  rewardModalBugRarity: { color: "#b95b1d", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 4 },
  rewardModalBugName: { color: "#271441", fontSize: 18, fontWeight: "900", marginTop: 2, textAlign: "center" },
  rewardModalBugMeta: { color: "#65577d", fontSize: 10, fontWeight: "800", marginTop: 2, textAlign: "center" },
  rewardModalXp: { color: "#e65f2f", fontSize: 34, fontWeight: "900", marginTop: 12 },
  rewardModalMedal: { color: "#6844b3", fontSize: 12, fontWeight: "900", marginTop: 8, textAlign: "center" },
  rewardModalButton: { alignItems: "center", backgroundColor: "#6748bd", borderRadius: 13, justifyContent: "center", marginTop: 18, minHeight: 48, width: "100%" },
  rewardModalButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  retryButton: { alignItems: "center", backgroundColor: "#ff8439", borderRadius: 12, minHeight: 46, justifyContent: "center", paddingHorizontal: 20 },
  retryText: { color: "#281442", fontWeight: "900" },
  backLink: { padding: 8 },
  backLinkText: { color: "#d8d0f6", fontWeight: "800" },
  pressed: { opacity: 0.72 }
});
