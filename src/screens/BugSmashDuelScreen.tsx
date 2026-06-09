import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugSwatterHit, playBugSwatterFeedback } from "../components/BugSwatterHit";
import { BugDexDropResult, grantBugDexReward, listBugDexInventory } from "../services/bugDexService";
import { activeBugSquadBonusList, BugSquadBonusCategory, maxActiveBugSquadSize, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { bugSmashDuelBalanceForUser, BugSmashDuelBalance } from "../services/bugSquadGameBalance";
import {
  bugSmashDuelBugCount,
  bugSmashDuelDurationMs,
  bugSmashDuelStartDelayMs,
  cancelBugSmashDuel,
  claimBugSmashDuelReward,
  createBugSmashDuel,
  listBugSmashDuels,
  respondBugSmashDuel,
  submitBugSmashDuelScore,
  subscribeBugSmashDuel
} from "../services/bugSmashDuelService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { presenceLabel } from "../services/presenceService";
import { BugDexRarity, bugDexEntries } from "../services/pointsService";
import { entryByBugId } from "../services/bugDexService";
import { playBugSound } from "../services/soundService";
import { listUsers, updateUserBugSquad } from "../services/userService";
import { BugDexInventoryItem, BugSmashDuel, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  initialDuelId?: string;
  initialOpponent?: User | null;
  onBack: () => void;
  onDuelAccepted?: (requesterId: string, duelId: string) => Promise<void>;
  onDuelRequest?: (recipientId: string, duelId: string) => Promise<void>;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

const duelHeroImage = require("../../assets/generated/bug-smash-duel-concept.jpg");
const DuelTargetBugArt = React.memo(BugArtImage);
const duelGameTickMs = 55;
const maxVisibleDuelTargets = 10;

type HelperImpactKind = "burst" | "shield" | "splash" | "sticky" | "zap";

type HelperImpact = {
  id: string;
  bugId: string;
  color: string;
  kind: HelperImpactKind;
  x: number;
  y: number;
};

type VisibleDuelTarget = {
  bugId: string;
  entry: NonNullable<ReturnType<typeof entryByBugId>>;
  index: number;
  motion: ReturnType<typeof targetMotion>;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

const baseTapsByRarity: Record<BugDexRarity, number> = {
  Gewoon: 2,
  Zeldzaam: 3,
  Episch: 5,
  Legendarisch: 7,
  Mythisch: 9
};

const scoreByRarity: Record<BugDexRarity, number> = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 4,
  Legendarisch: 6,
  Mythisch: 9
};

const raritySortOrder: Record<BugDexRarity, number> = {
  Mythisch: 0,
  Legendarisch: 1,
  Episch: 2,
  Zeldzaam: 3,
  Gewoon: 4
};

export function BugSmashDuelScreen({ user, initialDuelId = "", initialOpponent, onBack, onDuelAccepted, onDuelRequest, onRewardDrop, onUserUpdated }: Props) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [activeDuelId, setActiveDuelId] = useState(initialDuelId);
  const [activeDuel, setActiveDuel] = useState<BugSmashDuel | null>(null);
  const [trainingDuel, setTrainingDuel] = useState<BugSmashDuel | null>(null);
  const [activeSquadIds, setActiveSquadIds] = useState<string[]>(sanitizeActiveBugSquad(user.activeBugSquad));
  const [selectedOpponentId, setSelectedOpponentId] = useState(initialOpponent?.uid ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [challengeNotice, setChallengeNotice] = useState("");
  const [squadModalVisible, setSquadModalVisible] = useState(false);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadBusyId, setSquadBusyId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const [caughtBugIds, setCaughtBugIds] = useState<string[]>([]);
  const [helperImpacts, setHelperImpacts] = useState<HelperImpact[]>([]);
  const [requesterStartAtByDuelId, setRequesterStartAtByDuelId] = useState<Record<string, string>>({});
  const submittedRef = useRef(false);
  const scoreRef = useRef(0);
  const caughtBugIdsRef = useRef<string[]>([]);
  const comboRef = useRef(0);
  const hitCountsRef = useRef<Record<string, number>>({});
  const hitFeedbackValues = useRef(new Map<string, Animated.Value>()).current;
  const helperCooldownAtRef = useRef<Record<string, number>>({});
  const helperImpactIdRef = useRef(0);
  const lastCatchAtRef = useRef(0);
  const lastHitSoundAtRef = useRef(0);
  const assist = useMemo(() => bugSmashDuelBalanceForUser({ activeBugSquad: activeSquadIds }), [activeSquadIds]);
  const opponents = useMemo(() => {
    const items = users.filter((item) => item.uid !== user.uid);
    if (initialOpponent && initialOpponent.uid !== user.uid && !items.some((item) => item.uid === initialOpponent.uid)) {
      return [initialOpponent, ...items];
    }
    return items;
  }, [initialOpponent, user.uid, users]);
  const activeSquadBonuses = activeBugSquadBonusList(activeSquadIds);
  const squadChoiceInventory = [...inventory].filter((item) => item.count > 0).sort((a, b) => {
    const firstEntry = entryByBugId(a.bugId);
    const secondEntry = entryByBugId(b.bugId);
    const rarityDiff = (firstEntry ? raritySortOrder[firstEntry.rarity] : 99) - (secondEntry ? raritySortOrder[secondEntry.rarity] : 99);
    if (rarityDiff !== 0) return rarityDiff;
    return bugName(a.bugId, t).localeCompare(bugName(b.bugId, t));
  });

  function resetRunState() {
    submittedRef.current = false;
    scoreRef.current = 0;
    caughtBugIdsRef.current = [];
    comboRef.current = 0;
    hitCountsRef.current = {};
    hitFeedbackValues.clear();
    helperCooldownAtRef.current = {};
    lastCatchAtRef.current = 0;
    lastHitSoundAtRef.current = 0;
    setScore(0);
    setCaughtBugIds([]);
    setHitCounts({});
    setHelperImpacts([]);
  }

  useEffect(() => {
    let active = true;
    void Promise.all([listUsers(), listBugSmashDuels(user), listBugDexInventory(user)]).then(([nextUsers, nextDuels, nextInventory]) => {
      if (!active) return;
      setUsers(nextUsers);
      setDuels(nextDuels);
      setInventory(nextInventory);
      setActiveSquadIds(sanitizeActiveBugSquad(user.activeBugSquad, nextInventory));
      if (!activeDuelId) {
        const pendingReceived = nextDuels.find((duel) => duel.status === "pending" && duel.toUserId === user.uid);
        if (pendingReceived) setActiveDuelId(pendingReceived.id);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user.uid, activeDuelId]);

  useEffect(() => {
    let active = true;
    const interval = setInterval(() => {
      void listUsers().then((nextUsers) => {
        if (active) setUsers(nextUsers);
      }).catch(() => undefined);
    }, 30 * 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user.uid]);

  useEffect(() => {
    if (initialDuelId) setActiveDuelId(initialDuelId);
  }, [initialDuelId]);

  useEffect(() => {
    if (initialOpponent?.uid) setSelectedOpponentId(initialOpponent.uid);
  }, [initialOpponent?.uid]);

  useEffect(() => subscribeBugSmashDuel(activeDuelId, setActiveDuel), [activeDuelId]);

  useEffect(() => {
    resetRunState();
  }, [activeDuel?.id, trainingDuel?.id]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    caughtBugIdsRef.current = caughtBugIds;
  }, [caughtBugIds]);

  useEffect(() => {
    hitCountsRef.current = hitCounts;
  }, [hitCounts]);

  const activeRequesterStartAt = activeDuel ? requesterStartAtByDuelId[activeDuel.id] : "";
  const requesterNeedsManualStart = Boolean(activeDuel?.status === "accepted" && activeDuel.fromUserId === user.uid && !activeRequesterStartAt);
  const playableDuel = activeDuel?.status === "accepted" && activeRequesterStartAt
    ? { ...activeDuel, startAt: activeRequesterStartAt }
    : activeDuel;

  useEffect(() => {
    const runningDuel = trainingDuel ?? activeDuel;
    if (!runningDuel || runningDuel.status !== "accepted" || (!trainingDuel && requesterNeedsManualStart)) return () => undefined;
    const interval = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      const effectiveStartAt = trainingDuel ? runningDuel.startAt : activeRequesterStartAt || runningDuel.startAt;
      const startAt = effectiveStartAt ? Date.parse(effectiveStartAt) : timestamp;
      const endAt = startAt + runningDuel.durationMs;
      if (timestamp >= endAt) {
        if (!submittedRef.current) {
          submittedRef.current = true;
          if (!trainingDuel) {
            const bonusScore = duelBonusScore(scoreRef.current, assist);
            void submitBugSmashDuelScore(user, runningDuel.id, scoreRef.current + bonusScore, caughtBugIdsRef.current, bonusScore)
              .then((duel) => setActiveDuel(duel))
              .catch(() => setError(t("duel.submitFailed")));
          }
        }
        return;
      }
      runHelperTowers(runningDuel, timestamp);
    }, duelGameTickMs);
    return () => clearInterval(interval);
  }, [activeDuel?.id, activeDuel?.status, activeDuel?.startAt, activeDuel?.durationMs, trainingDuel?.id, trainingDuel?.startAt, trainingDuel?.durationMs, activeRequesterStartAt, requesterNeedsManualStart, assist, t, user]);

  async function refreshDuels() {
    setDuels(await listBugSmashDuels(user));
  }

  async function openSquadModal() {
    setSquadModalVisible(true);
    setSquadLoading(true);
    setError("");
    try {
      const nextInventory = await listBugDexInventory(user);
      setInventory(nextInventory);
      setActiveSquadIds(sanitizeActiveBugSquad(activeSquadIds, nextInventory));
    } catch {
      setError(t("duel.squadUpdateFailed"));
    } finally {
      setSquadLoading(false);
    }
  }

  async function startChallenge() {
    const opponent = opponents.find((item) => item.uid === selectedOpponentId);
    if (!opponent || busy) return;
    setTrainingDuel(null);
    setBusy(true);
    setError("");
    setChallengeNotice(t("duel.sendingChallenge"));
    try {
      const duel = await createBugSmashDuel(user, opponent);
      await onDuelRequest?.(opponent.uid, duel.id);
      setActiveDuelId(duel.id);
      setActiveDuel(duel);
      setChallengeNotice(t("duel.challengeSent"));
      await refreshDuels();
    } catch (event) {
      setError(event instanceof Error ? event.message : t("duel.createFailed"));
      setChallengeNotice("");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActiveSquadBug(bugId: string) {
    if (squadBusyId) return;
    const selected = activeSquadIds.includes(bugId);
    if (!selected && activeSquadIds.length >= maxActiveBugSquadSize) return;
    const nextIds = selected ? activeSquadIds.filter((item) => item !== bugId) : [...activeSquadIds, bugId];
    setSquadBusyId(bugId);
    try {
      const updated = await updateUserBugSquad({ ...user, activeBugSquad: activeSquadIds }, nextIds);
      const nextSquad = sanitizeActiveBugSquad(updated.activeBugSquad, inventory);
      setActiveSquadIds(nextSquad);
      onUserUpdated?.(updated);
    } catch {
      setError(t("duel.squadUpdateFailed"));
    } finally {
      setSquadBusyId("");
    }
  }

  async function respond(accepted: boolean) {
    if (!activeDuel || busy) return;
    setBusy(true);
    setError("");
    try {
      const duel = await respondBugSmashDuel(user, activeDuel.id, accepted);
      setActiveDuel(duel);
      if (accepted) await onDuelAccepted?.(duel.fromUserId, duel.id);
      await refreshDuels();
    } catch (event) {
      setError(event instanceof Error ? event.message : t("duel.respondFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!activeDuel || busy) return;
    const duelToCancel = activeDuel;
    setBusy(true);
    setError("");
    setActiveDuel({ ...duelToCancel, status: "cancelled", updatedAt: new Date().toISOString() });
    setActiveDuelId("");
    try {
      const cancelled = await cancelBugSmashDuel(user, duelToCancel.id);
      if (!cancelled) throw new Error(t("duel.cancelFailed"));
      setActiveDuel(null);
      await refreshDuels();
    } catch (event) {
      setActiveDuel(duelToCancel);
      setActiveDuelId(duelToCancel.id);
      setError(event instanceof Error ? event.message : t("duel.cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function claimReward() {
    if (!activeDuel || busy) return;
    setBusy(true);
    setError("");
    try {
      const canClaim = await claimBugSmashDuelReward(user, activeDuel.id);
      if (!canClaim) return;
      const drop = await grantBugDexReward(user, "duel_win");
      onRewardDrop?.(drop);
      await refreshDuels();
    } catch {
      setError(t("duel.rewardFailed"));
    } finally {
      setBusy(false);
    }
  }

  function hitBug(bugId: string) {
    applyBugHit(bugId, "tap");
  }

  function applyBugHit(bugId: string, source: "helper" | "tap") {
    const runningDuel = trainingDuel ?? activeDuel;
    if (!runningDuel || !isRunning(runningDuel, now)) return;
    const entry = entryByBugId(bugId);
    if (!entry || caughtBugIdsRef.current.includes(bugId)) return;
    const targetIndex = runningDuel.bugIds.indexOf(bugId);
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, targetIndex);
    const currentHits = hitCountsRef.current;
    const nextHits = (currentHits[bugId] ?? 0) + 1;
    hitCountsRef.current = { ...currentHits, [bugId]: nextHits };
    if (source === "tap") playBugSwatterFeedback(hitFeedbackFor(bugId));
    setHitCounts(hitCountsRef.current);
    if (nextHits < requiredTaps) {
      const hitAt = Date.now();
      if (source === "tap" && hitAt - lastHitSoundAtRef.current > 90) {
        lastHitSoundAtRef.current = hitAt;
        playBugSound("bug_hit");
      }
      return;
    }
    playBugSound("bug_catch");
    const catchAt = Date.now();
    comboRef.current = catchAt - lastCatchAtRef.current <= assist.comboGraceMs ? comboRef.current + 1 : 1;
    lastCatchAtRef.current = catchAt;
    caughtBugIdsRef.current = caughtBugIdsRef.current.includes(bugId) ? caughtBugIdsRef.current : [...caughtBugIdsRef.current, bugId];
    scoreRef.current += scoreByRarity[entry.rarity] + duelCatchBonusPoints(entry.rarity, bugId, assist) + duelComboBonusPoint(comboRef.current);
    setCaughtBugIds(caughtBugIdsRef.current);
    setScore(scoreRef.current);
  }

  function runHelperTowers(duel: BugSmashDuel, timestamp: number) {
    if (!activeSquadBonuses.length || !isRunning(duel, timestamp)) return;
    const visibleTargets = collectVisibleTargets(duel, timestamp, caughtBugIdsRef.current, assist);
    if (!visibleTargets.length) return;

    activeSquadBonuses.forEach((bonus, helperIndex) => {
      const spec = helperSpecForBonus(bonus);
      const readyAt = helperCooldownAtRef.current[bonus.bugId] ?? 0;
      if (timestamp < readyAt) return;
      const target = selectHelperTarget(visibleTargets, bonus, hitCountsRef.current, timestamp);
      if (!target) return;

      helperCooldownAtRef.current[bonus.bugId] = timestamp + spec.cooldownMs + helperIndex * 260;
      addHelperImpact(bonus.bugId, target.motion.x, target.motion.y, spec.color, spec.kind);
      for (let hit = 0; hit < spec.hits; hit += 1) applyBugHit(target.bugId, "helper");

      if (spec.splashTargets > 0) {
        visibleTargets
          .filter((item) => item.bugId !== target.bugId && distanceBetweenTargets(item, target) <= spec.splashRadius)
          .slice(0, spec.splashTargets)
          .forEach((item) => applyBugHit(item.bugId, "helper"));
      }
    });
  }

  function addHelperImpact(bugId: string, x: number, y: number, color: string, kind: HelperImpactKind) {
    const id = `helper-${helperImpactIdRef.current++}`;
    setHelperImpacts((current) => [...current.slice(-8), { id, bugId, color, kind, x, y }]);
    setTimeout(() => {
      setHelperImpacts((current) => current.filter((item) => item.id !== id));
    }, 520);
  }

  function startAcceptedDuel() {
    if (!activeDuel) return;
    resetRunState();
    setNow(Date.now());
    setRequesterStartAtByDuelId((current) => ({
      ...current,
      [activeDuel.id]: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString()
    }));
  }

  function startTraining() {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    resetRunState();
    setActiveDuelId("");
    setActiveDuel(null);
    setError("");
    setChallengeNotice("");
    setNow(Date.now());
    setTrainingDuel({
      id: `training-${Date.now()}`,
      fromUserId: user.uid,
      fromUserName: user.displayName,
      toUserId: "training",
      toUserName: t("duel.trainingOpponent"),
      status: "accepted",
      seed,
      bugIds: trainingBugIds(seed),
      createdAt: timestamp,
      updatedAt: timestamp,
      startAt: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString(),
      durationMs: bugSmashDuelDurationMs,
      scores: {},
      rewardClaimedBy: []
    });
  }

  function stopTraining() {
    setTrainingDuel(null);
    resetRunState();
    setNow(Date.now());
  }

  function hitFeedbackFor(bugId: string) {
    const current = hitFeedbackValues.get(bugId);
    if (current) return current;
    const created = new Animated.Value(0);
    hitFeedbackValues.set(bugId, created);
    return created;
  }

  const activeScore = activeDuel?.scores?.[user.uid];
  const opponentId = activeDuel ? activeDuel.fromUserId === user.uid ? activeDuel.toUserId : activeDuel.fromUserId : "";
  const opponentScore = opponentId ? activeDuel?.scores?.[opponentId] : undefined;
  const gameDuel = trainingDuel ?? playableDuel;
  const countdown = gameDuel?.status === "accepted" && gameDuel.startAt ? Math.max(0, Math.ceil((Date.parse(gameDuel.startAt) - now) / 1000)) : 0;
  const remainingSeconds = gameDuel?.status === "accepted" && gameDuel.startAt ? Math.max(0, Math.ceil((Date.parse(gameDuel.startAt) + gameDuel.durationMs - now) / 1000)) : 0;
  const activeDuelScore = activeScore?.score ?? (submittedRef.current ? score + duelBonusScore(score, assist) : score);
  const incomingPendingDuel = activeDuel?.status === "pending" && activeDuel.toUserId === user.uid;
  const fullscreenGame = Boolean(trainingDuel) || playableDuel?.status === "accepted" && !requesterNeedsManualStart;
  const gameScore = trainingDuel && submittedRef.current ? score + duelBonusScore(score, assist) : trainingDuel ? score : activeDuelScore;

  if (fullscreenGame && gameDuel) {
    return (
      <View style={styles.fullscreenGame}>
        <View style={styles.gameHud}>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? t("duel.trainingTitle") : opponentLabel(gameDuel, user)}</Text>
            <Text style={styles.gameScore}>{t("duel.yourScore", { score: gameScore })}</Text>
          </View>
          <Text style={styles.gameTimer}>{remainingSeconds}s</Text>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? t("duel.trainingNoRewardsShort") : opponentScore ? t("duel.theirScore", { score: opponentScore.score }) : t("duel.waitingScore")}</Text>
            <Pressable style={styles.gameExitButton} onPress={trainingDuel ? stopTraining : onBack}>
              <Text style={styles.gameExitText}>x</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.fullscreenArena}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : isRunning(gameDuel, now) ? (
            <>
              {renderTargets(gameDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, hitBug)}
              {renderHelperImpacts(helperImpacts)}
              {renderHelperTowers(activeSquadBonuses, helperCooldownAtRef.current, now, t)}
            </>
          ) : trainingDuel && submittedRef.current ? (
            <View style={styles.trainingResult}>
              <Text style={styles.trainingResultTitle}>{t("duel.trainingDone")}</Text>
              <Text style={styles.trainingResultScore}>{t("duel.yourScore", { score: gameScore })}</Text>
              <Text style={styles.trainingResultBody}>{t("duel.trainingNoRewards")}</Text>
              <Pressable style={sharedStyles.button} onPress={startTraining}>
                <Text style={sharedStyles.buttonText}>{t("duel.trainingRetry")}</Text>
              </Pressable>
              <Pressable style={sharedStyles.secondaryButton} onPress={stopTraining}>
                <Text style={sharedStyles.secondaryButtonText}>{t("common.done")}</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator color="#d7bd57" size="large" />
          )}
        </View>
        <View style={styles.gameFooter}>
          <Text style={styles.gameFooterText}>{trainingDuel ? t("duel.trainingFooter") : "Kies je targets. Hoge rarity kost meer taps, maar scoort veel meer."}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={sharedStyles.title}>{t("duel.title")}</Text>
        <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
          <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
        </Pressable>
      </View>

      <Image resizeMode="cover" source={duelHeroImage} style={styles.heroImage} />
      <Text style={styles.intro}>{t("duel.intro")}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!activeDuel && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("duel.challengeTitle")}</Text>
          <View style={styles.opponentGrid}>
            {opponents.map((opponent) => {
              const selected = selectedOpponentId === opponent.uid;
              return (
                <Pressable key={opponent.uid} style={[styles.opponentButton, selected && styles.opponentButtonSelected]} onPress={() => setSelectedOpponentId(opponent.uid)}>
                  <Text style={[styles.opponentName, selected && styles.opponentNameSelected]} numberOfLines={1}>{opponent.displayName}</Text>
                  <Text style={styles.opponentMeta}>{opponent.totalPoints} {t("common.pointsShort")}</Text>
                  <Text style={[styles.opponentPresence, selected && styles.opponentPresenceSelected]} numberOfLines={1}>{presenceLabel(opponent, t)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={!selectedOpponentId || busy} style={[sharedStyles.button, (!selectedOpponentId || busy) && styles.disabled]} onPress={startChallenge}>
            <Text style={sharedStyles.buttonText}>{busy ? "..." : t("duel.challenge")}</Text>
          </Pressable>
          <View style={styles.trainingPanel}>
            <View style={styles.trainingCopy}>
              <Text style={styles.trainingTitle}>{t("duel.trainingTitle")}</Text>
              <Text style={styles.trainingBody}>{t("duel.trainingBody")}</Text>
            </View>
            <Pressable style={styles.trainingButton} onPress={startTraining}>
              <Text style={styles.trainingButtonText}>{t("duel.trainingAction")}</Text>
            </Pressable>
          </View>
          {challengeNotice ? <Text style={styles.noticeText}>{challengeNotice}</Text> : null}
        </View>
      )}

      {activeDuel && (
        <View style={styles.card}>
          <View style={styles.duelTitleRow}>
            <View>
              <Text style={styles.cardTitle}>{incomingPendingDuel ? t("duel.incomingTitle", { name: activeDuel.fromUserName }) : opponentLabel(activeDuel, user)}</Text>
              <Text style={styles.statusText}>{incomingPendingDuel ? t("duel.incomingStatus") : statusLabel(activeDuel, t)}</Text>
            </View>
            {activeDuel.status === "accepted" ? <Text style={styles.timerText}>{remainingSeconds}s</Text> : <Text style={styles.pendingBadge}>{t("duel.pendingBadge")}</Text>}
          </View>

          {activeDuel.status === "pending" && activeDuel.toUserId === user.uid && (
            <View style={styles.incomingPanel}>
              <Text style={styles.incomingBody}>{t("duel.incomingBody", { name: activeDuel.fromUserName })}</Text>
              <Text style={styles.incomingHint}>{t("duel.incomingHint")}</Text>
              <Pressable disabled={busy} style={sharedStyles.button} onPress={() => respond(true)}>
                <Text style={sharedStyles.buttonText}>{t("duel.accept")}</Text>
              </Pressable>
              <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={() => respond(false)}>
                <Text style={sharedStyles.secondaryButtonText}>{t("duel.decline")}</Text>
              </Pressable>
            </View>
          )}

          {activeDuel.status === "pending" && activeDuel.fromUserId === user.uid && (
            <View style={styles.waitingPanel}>
              <Text style={styles.noticeText}>{t("duel.waitingForOpponent")}</Text>
              <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={cancel}>
                <Text style={sharedStyles.secondaryButtonText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          )}

          {activeDuel.status === "accepted" && requesterNeedsManualStart && (
            <View style={styles.startPanel}>
              <Text style={styles.startTitle}>{t("duel.readyTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.readyBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Pressable style={sharedStyles.button} onPress={startAcceptedDuel}>
                <Text style={sharedStyles.buttonText}>{t("duel.startNow")}</Text>
              </Pressable>
            </View>
          )}

          {activeDuel.status === "accepted" && !requesterNeedsManualStart && playableDuel && (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
                <Text style={styles.scoreText}>{opponentScore ? t("duel.theirScore", { score: opponentScore.score }) : t("duel.waitingScore")}</Text>
              </View>
              <View style={styles.arena}>
                {countdown > 0 ? (
                  <Text style={styles.countdown}>{countdown}</Text>
                ) : isRunning(playableDuel, now) ? (
                  <>
                    {renderTargets(playableDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, hitBug)}
                    {renderHelperImpacts(helperImpacts)}
                    {renderHelperTowers(activeSquadBonuses, helperCooldownAtRef.current, now, t)}
                  </>
                ) : (
                  <ActivityIndicator color="#d7bd57" size="large" />
                )}
              </View>
            </>
          )}

          {activeDuel.status === "completed" && (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>{resultLabel(activeDuel, user, t)}</Text>
              <Text style={styles.resultLine}>{activeDuel.fromUserName}: {activeDuel.scores?.[activeDuel.fromUserId]?.score ?? 0}</Text>
              <Text style={styles.resultLine}>{activeDuel.toUserName}: {activeDuel.scores?.[activeDuel.toUserId]?.score ?? 0}</Text>
              {activeDuel.winnerId === user.uid && !(activeDuel.rewardClaimedBy ?? []).includes(user.uid) && (
                <Pressable disabled={busy} style={sharedStyles.button} onPress={claimReward}>
                  <Text style={sharedStyles.buttonText}>{busy ? "..." : t("duel.claimReward")}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.bonusHeader}>
          <Text style={styles.cardTitle}>{t("duel.bonusTitle")}</Text>
          <Pressable style={styles.smallButton} onPress={openSquadModal}>
            <Text style={styles.smallButtonText}>{t("duel.changeSquad")}</Text>
          </Pressable>
        </View>
        {renderSquadJars(activeSquadIds, activeSquadBonuses, t, openSquadModal)}
        <Text style={styles.bonusLine}>{t("duel.tapAssist", { value: Math.round((assist.hitboxMultiplier - 1.05) * 100) })}</Text>
        <Text style={styles.bonusLine}>{t("duel.speedAssist", { value: Math.round((assist.speedMultiplier - 1) * 100) })}</Text>
        <Text style={styles.bonusLine}>{t("duel.scoreAssist", { value: duelBonusScore(12, assist) })}</Text>
      </View>

      <Modal transparent animationType="fade" visible={squadModalVisible} onRequestClose={() => setSquadModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.cardTitle}>{t("duel.changeSquad")}</Text>
                <Text style={styles.modalCounter}>{t("duel.squadSelectedCount", { count: activeSquadIds.length, max: maxActiveBugSquadSize })}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSquadModalVisible(false)}>
                <Text style={styles.closeButtonText}>x</Text>
              </Pressable>
            </View>
            <Text style={styles.modalIntro}>{t("bugdex.activeSquadHint")}</Text>
            {renderSquadJars(activeSquadIds, activeSquadBonuses, t, openSquadModal)}
            {squadLoading ? (
              <View style={styles.modalState}>
                <ActivityIndicator color="#15724f" />
                <Text style={styles.modalStateText}>{t("duel.squadLoading")}</Text>
              </View>
            ) : squadChoiceInventory.length === 0 ? (
              <View style={styles.modalState}>
                <Text style={styles.modalStateText}>{t("duel.squadEmptyCollection")}</Text>
              </View>
            ) : (
              <ScrollView style={styles.squadChoiceList} showsVerticalScrollIndicator={false}>
                <View style={styles.squadChoiceGrid}>
                  {squadChoiceInventory.map((item) => {
                    const entry = entryByBugId(item.bugId);
                    const bonus = activeBugSquadBonusList([item.bugId])[0];
                    if (!entry || !bonus) return null;
                    const selected = activeSquadIds.includes(item.bugId);
                    const disabled = !selected && activeSquadIds.length >= maxActiveBugSquadSize;
                    return (
                      <Pressable
                        key={item.bugId}
                        disabled={disabled || squadBusyId === item.bugId}
                        style={[styles.squadChoice, selected && styles.squadChoiceActive, disabled && styles.disabled, { borderColor: selected ? rarityColors[entry.rarity] : "#d7e1d9" }]}
                        onPress={() => toggleActiveSquadBug(item.bugId)}
                      >
                        <BugArtImage bugId={item.bugId} size={50} />
                        <Text style={[styles.squadChoiceName, selected && styles.squadChoiceNameActive]} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                        <Text style={[styles.rarityPill, { backgroundColor: rarityColors[entry.rarity] }]}>{rarityLabel(entry.rarity, t)}</Text>
                        <Text style={[styles.squadChoiceMeta, selected && styles.squadChoiceMetaActive]} numberOfLines={2}>{squadBonusLabel(bonus.category, t)} {squadBonusValue(bonus.category, bonus.value)}</Text>
                        <Text style={[styles.squadSelectedPill, selected && styles.squadSelectedPillActive]}>{selected ? t("duel.active") : "+"}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
            <Pressable style={sharedStyles.button} onPress={() => setSquadModalVisible(false)}>
              <Text style={sharedStyles.buttonText}>{t("common.done")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {activeDuel?.status === "accepted" && requesterNeedsManualStart && (
        <Modal animationType="fade" transparent visible onRequestClose={startAcceptedDuel}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.readyTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.readyBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Pressable style={sharedStyles.button} onPress={startAcceptedDuel}>
                <Text style={sharedStyles.buttonText}>{t("duel.startNow")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {duels.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("duel.recent")}</Text>
          {duels.slice(0, 6).map((duel) => (
            <Pressable key={duel.id} style={styles.duelRow} onPress={() => setActiveDuelId(duel.id)}>
              <Text style={styles.duelRowTitle} numberOfLines={1}>{opponentLabel(duel, user)}</Text>
              <Text style={styles.duelRowMeta}>{statusLabel(duel, t)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function renderSquadJars(activeSquadIds: string[], bonuses: ReturnType<typeof activeBugSquadBonusList>, t: (key: string, params?: Record<string, string | number>) => string, onOpen: () => void) {
  return (
    <View style={styles.squadJars}>
      {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
        const bugId = activeSquadIds[index];
        const entry = bugId ? entryByBugId(bugId) : null;
        const bonus = bonuses.find((item) => item.bugId === bugId);
        return (
          <Pressable key={index} style={styles.squadJarWrap} onPress={onOpen}>
            <View style={[styles.squadJarLid, entry && { backgroundColor: rarityColors[entry.rarity], borderColor: rarityColors[entry.rarity] }]} />
            <View style={[styles.squadJar, entry && { borderColor: rarityColors[entry.rarity] }]}>
              <View style={styles.squadJarShine} />
              {entry ? (
                <>
                  <BugArtImage bugId={entry.id} size={42} />
                  <Text style={styles.squadJarName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                  {bonus && <Text style={styles.squadJarBonus} numberOfLines={1}>{squadBonusLabel(bonus.category, t)}</Text>}
                </>
              ) : (
                <>
                  <Text style={styles.squadJarEmpty}>+</Text>
                  <Text style={styles.squadJarBonus}>{t("bugdex.squadEmptySlot")}</Text>
                </>
              )}
              <View style={styles.squadJarBase} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function renderHelperTowers(bonuses: ReturnType<typeof activeBugSquadBonusList>, cooldowns: Record<string, number>, timestamp: number, t: (key: string) => string) {
  if (!bonuses.length) return null;
  return (
    <View pointerEvents="none" style={styles.helperTowerDock}>
      {bonuses.map((bonus, index) => {
        const spec = helperSpecForBonus(bonus);
        const readyAt = cooldowns[bonus.bugId] ?? 0;
        const cooldownLeft = Math.max(0, readyAt - timestamp);
        const charge = 1 - Math.min(1, cooldownLeft / spec.cooldownMs);
        return (
          <View key={`${bonus.bugId}:${index}`} style={[styles.helperTower, { borderColor: spec.color }]}>
            <HelperTowerPulse color={spec.color} ready={cooldownLeft <= 0} />
            <BugArtImage bugId={bonus.bugId} size={38} />
            <View style={styles.helperChargeTrack}>
              <View style={[styles.helperChargeFill, { backgroundColor: spec.color, width: `${Math.round(charge * 100)}%` }]} />
            </View>
            <Text style={styles.helperTowerText} numberOfLines={1}>{helperKindLabel(spec.kind, t)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function renderHelperImpacts(impacts: HelperImpact[]) {
  return impacts.map((impact) => <HelperImpactEffect key={impact.id} impact={impact} />);
}

function renderTargets(
  duel: BugSmashDuel,
  timestamp: number,
  caughtBugIds: string[],
  hitCounts: Record<string, number>,
  assist: BugSmashDuelBalance,
  hitFeedbackValues: Map<string, Animated.Value>,
  onHit: (bugId: string) => void
) {
  return collectVisibleTargets(duel, timestamp, caughtBugIds, assist)
    .sort((a, b) => targetPriority(b.entry.rarity, b.motion.progress) - targetPriority(a.entry.rarity, a.motion.progress))
    .slice(0, maxVisibleDuelTargets)
    .map(({ bugId, entry, index, motion }) => {
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, index);
    const hits = hitCounts[bugId] ?? 0;
    const feedback = hitFeedbackValues.get(bugId);
    const targetSize = Math.round(46 * assist.hitboxMultiplier);
    return (
      <Pressable
        key={bugId}
        style={[
          styles.target,
          {
            borderColor: rarityColors[entry.rarity],
            height: targetSize,
            left: `${motion.x}%`,
            top: `${motion.y}%`,
            transform: [{ rotate: `${motion.rotate}deg` }],
            width: targetSize
          }
        ]}
        onPress={() => onHit(bugId)}
      >
        {feedback && <BugSwatterHit bugSize={44} feedback={feedback} style={styles.targetSwatter} />}
        <DuelTargetBugArt bugId={bugId} size={38} />
        <View style={styles.hitTrack}>
          <View style={[styles.hitFill, { backgroundColor: rarityColors[entry.rarity], width: `${Math.min(100, (hits / requiredTaps) * 100)}%` }]} />
        </View>
      </Pressable>
    );
  });
}

function collectVisibleTargets(duel: BugSmashDuel, timestamp: number, caughtBugIds: string[], assist: BugSmashDuelBalance): VisibleDuelTarget[] {
  const startAt = duel.startAt ? Date.parse(duel.startAt) : timestamp;
  const elapsed = timestamp - startAt;
  return duel.bugIds.flatMap((bugId, index) => {
    if (caughtBugIds.includes(bugId)) return [];
    const entry = entryByBugId(bugId);
    if (!entry) return [];
    const motion = targetMotion(index, duel.seed, elapsed, entry.rarity, assist);
    if (!motion.visible) return [];
    return [{ bugId, entry, index, motion }];
  });
}

function selectHelperTarget(targets: VisibleDuelTarget[], bonus: ReturnType<typeof activeBugSquadBonusList>[number], hitCounts: Record<string, number>, timestamp: number) {
  const ranked = [...targets].sort((a, b) => helperTargetScore(b, bonus, hitCounts, timestamp) - helperTargetScore(a, bonus, hitCounts, timestamp));
  return ranked[0];
}

function helperTargetScore(target: VisibleDuelTarget, bonus: ReturnType<typeof activeBugSquadBonusList>[number], hitCounts: Record<string, number>, timestamp: number) {
  const required = baseTapsByRarity[target.entry.rarity];
  const hits = hitCounts[target.bugId] ?? 0;
  const almostCaught = hits >= Math.max(1, required - 1) ? 3 : 0;
  const urgency = target.motion.progress > 0.75 ? 2 : target.motion.progress > 0.55 ? 1 : 0;
  const rarityValue = scoreByRarity[target.entry.rarity] * helperRarityPreference(bonus.category);
  const jitter = (stableHash(`${bonus.bugId}:${target.bugId}:${Math.floor(timestamp / 1800)}`) % 100) / 1000;
  return rarityValue + urgency + almostCaught + jitter;
}

function helperRarityPreference(category: BugSquadBonusCategory) {
  if (category === "focus_boost" || category === "knowledge_boost" || category === "quest_boost" || category === "radar_rarity") return 1.1;
  if (category === "movement_boost" || category === "streak_protection") return 0.5;
  return 0.75;
}

function distanceBetweenTargets(first: VisibleDuelTarget, second: VisibleDuelTarget) {
  const dx = first.motion.x - second.motion.x;
  const dy = first.motion.y - second.motion.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function helperSpecForBonus(bonus: ReturnType<typeof activeBugSquadBonusList>[number]) {
  const rarityBoost = bonus.rarity === "Mythisch" ? 4 : bonus.rarity === "Legendarisch" ? 3 : bonus.rarity === "Episch" ? 2 : bonus.rarity === "Zeldzaam" ? 1 : 0;
  const kind = helperKindForCategory(bonus.category);
  return {
    color: helperColorForKind(kind),
    cooldownMs: 8200 - rarityBoost * 650,
    hits: bonus.rarity === "Mythisch" ? 2 : 1,
    kind,
    splashRadius: kind === "splash" ? 18 + rarityBoost * 2 : 0,
    splashTargets: kind === "splash" && rarityBoost >= 2 ? Math.min(2, rarityBoost - 1) : 0
  };
}

function helperKindForCategory(category: BugSquadBonusCategory): HelperImpactKind {
  if (category === "catch_assist" || category === "catch_time") return "sticky";
  if (category === "radar_spawn" || category === "radar_rarity" || category === "xp_boost") return "splash";
  if (category === "movement_boost" || category === "streak_protection") return "shield";
  if (category === "focus_boost" || category === "knowledge_boost" || category === "support_boost" || category === "quest_boost") return "zap";
  return "burst";
}

function helperColorForKind(kind: HelperImpactKind) {
  if (kind === "splash") return "#f59e0b";
  if (kind === "sticky") return "#65a30d";
  if (kind === "shield") return "#38bdf8";
  if (kind === "zap") return "#a78bfa";
  return "#d7bd57";
}

function helperKindLabel(kind: HelperImpactKind, t: (key: string) => string) {
  return t(`duel.helper.${kind}`);
}

function HelperTowerPulse({ color, ready }: { color: string; ready: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready) {
      pulse.setValue(0);
      return () => undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 720, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 0, toValue: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, ready]);

  return (
    <Animated.View
      style={[
        styles.helperPulse,
        {
          borderColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.45] }) }]
        }
      ]}
    />
  );
}

function HelperImpactEffect({ impact }: { impact: HelperImpact }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pulse, { duration: 480, toValue: 1, useNativeDriver: true }).start();
  }, [pulse]);

  const symbol = impact.kind === "zap" ? "✦" : impact.kind === "sticky" ? "✹" : impact.kind === "shield" ? "◇" : impact.kind === "splash" ? "●" : "✷";
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.helperImpact,
        {
          borderColor: impact.color,
          left: `${impact.x}%`,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] }),
          top: `${impact.y}%`,
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.8] }) }]
        }
      ]}
    >
      <Text style={[styles.helperImpactSymbol, { color: impact.color }]}>{symbol}</Text>
    </Animated.View>
  );
}

function targetPriority(rarity: BugDexRarity, progress: number) {
  const rarityValue = scoreByRarity[rarity];
  const urgency = progress > 0.72 ? 2 : progress > 0.48 ? 1 : 0;
  return rarityValue + urgency;
}

function targetMotion(index: number, seed: number, elapsedMs: number, rarity: BugDexRarity, assist: BugSmashDuelBalance) {
  const lane = (index * 37 + seed) % 82;
  const wave = (index % 5) + 2;
  const rarityLifetime = rarity === "Gewoon" ? 3900 : rarity === "Zeldzaam" ? 5000 : rarity === "Episch" ? 6200 : rarity === "Legendarisch" ? 7400 : 8600;
  const duration = rarityLifetime * assist.speedMultiplier;
  const spawnStart = index * 780 * assist.targetSpacingMultiplier + ((seed + index * 173) % 420);
  const progress = (elapsedMs - spawnStart) / duration;
  if (progress < 0 || progress > 1) return { visible: false, progress, x: 0, y: 0, rotate: 0 };
  const direction = index % 2 === 0 ? 1 : -1;
  const x = direction === 1 ? -12 + progress * 114 : 100 - progress * 114;
  const crawl = Math.sin(progress * Math.PI * wave + index) * 10 + Math.sin(progress * Math.PI * 7 + seed) * 2;
  const y = Math.max(4, Math.min(86, lane + crawl));
  const rotate = direction * (Math.sin(progress * Math.PI * 2 + index) * 15 + 8);
  return { visible: true, progress, x, y, rotate };
}

function requiredTapsForTarget(rarity: BugDexRarity, assist: BugSmashDuelBalance, targetIndex: number) {
  const focusReduction = targetIndex >= 0 && targetIndex < assist.focusEasyHits ? 1 : 0;
  return Math.max(1, baseTapsByRarity[rarity] - focusReduction);
}

function duelCatchBonusPoints(rarity: BugDexRarity, bugId: string, assist: BugSmashDuelBalance) {
  const rareBonus = rarity !== "Gewoon" && stableChance(`${bugId}:rare`, assist.radarRarePointChance) ? 1 : 0;
  const xpBonus = stableChance(`${bugId}:xp`, assist.xpDuplicatePointChance) ? 1 : 0;
  return Math.min(1, rareBonus + xpBonus);
}

function duelComboBonusPoint(combo: number) {
  return combo > 0 && combo % 5 === 0 ? 1 : 0;
}

function duelBonusScore(score: number, assist: BugSmashDuelBalance) {
  const supportBonus = assist.supportBonusEvery > 0 ? Math.min(3, Math.floor(score / assist.supportBonusEvery)) : 0;
  const movementBonus = score >= 12 ? assist.movementFinalBonusCap : 0;
  const streakBonus = score >= 16 ? assist.streakMissForgiveness : 0;
  return supportBonus + movementBonus + streakBonus;
}

function stableChance(seed: string, chance: number) {
  if (chance <= 0) return false;
  const value = seed.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
  return (value % 1000) / 1000 < chance;
}

function trainingBugIds(seed: number) {
  return bugDexEntries
    .map((entry, index) => ({ id: entry.id, sort: stableHash(`${seed}:${entry.id}:${index}`) }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, bugSmashDuelBugCount)
    .map((item) => item.id);
}

function stableHash(seed: string) {
  return seed.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 0);
}

function isRunning(duel: BugSmashDuel, timestamp: number) {
  if (!duel.startAt) return false;
  const startAt = Date.parse(duel.startAt);
  return timestamp >= startAt && timestamp < startAt + duel.durationMs;
}

function opponentLabel(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid ? duel.toUserName : duel.fromUserName;
}

function statusLabel(duel: BugSmashDuel, t: (key: string) => string) {
  return t(`duel.status.${duel.status}`);
}

function resultLabel(duel: BugSmashDuel, user: User, t: (key: string) => string) {
  if (!duel.winnerId) return t("duel.tie");
  return duel.winnerId === user.uid ? t("duel.win") : t("duel.loss");
}

function bugName(bugId: string, t: (key: string) => string) {
  const entry = entryByBugId(bugId);
  return entry ? bugDexEntryName(entry, t) : bugId;
}

function squadBonusLabel(category: BugSquadBonusCategory, t: (key: string) => string): string {
  return t(`bugdex.squadBonus.${category}`);
}

function squadBonusValue(category: BugSquadBonusCategory, value: number): string {
  if (category === "streak_protection") return "1x";
  return `+${Math.round(value * 100)}%`;
}

const styles = StyleSheet.create({
  actionsRow: {
    gap: 10
  },
  arena: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    height: 310,
    justifyContent: "center",
    marginTop: 12,
    overflow: "hidden"
  },
  bonusLine: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  bonusHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  cardTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d7e1d9",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  closeButtonText: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20
  },
  content: {
    paddingBottom: 160
  },
  countdown: {
    color: "#d7bd57",
    fontSize: 82,
    fontWeight: "900",
    textAlign: "center"
  },
  disabled: {
    opacity: 0.55
  },
  duelRow: {
    backgroundColor: "#edf6ea",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 10
  },
  duelRowMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  duelRowTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  duelTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  error: {
    color: "#b83227",
    fontWeight: "900",
    marginTop: 10
  },
  fullscreenArena: {
    backgroundColor: "#0c1d14",
    borderColor: "#d7bd57",
    borderRadius: 0,
    borderTopWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative"
  },
  fullscreenGame: {
    backgroundColor: "#0c1d14",
    flex: 1
  },
  gameExitButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    marginTop: 4,
    width: 38
  },
  gameExitText: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20
  },
  gameFooter: {
    backgroundColor: "#102018",
    borderTopColor: "rgba(215,189,87,0.5)",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  gameFooterText: {
    color: "#dce9df",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  gameHud: {
    alignItems: "center",
    backgroundColor: "#102018",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8
  },
  gameHudPlayer: {
    flex: 1,
    minWidth: 0
  },
  gameOpponent: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  gameScore: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  gameTimer: {
    color: "#d7bd57",
    fontSize: 30,
    fontWeight: "900",
    minWidth: 70,
    textAlign: "center"
  },
  helperChargeFill: {
    borderRadius: 999,
    height: 4
  },
  helperChargeTrack: {
    backgroundColor: "rgba(255,255,255,0.36)",
    borderRadius: 999,
    height: 4,
    marginTop: 3,
    overflow: "hidden",
    width: 40
  },
  helperImpact: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 46,
    justifyContent: "center",
    marginLeft: -23,
    marginTop: -23,
    position: "absolute",
    width: 46,
    zIndex: 8
  },
  helperImpactSymbol: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
    textShadowColor: "rgba(16,32,24,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  helperPulse: {
    borderRadius: 999,
    borderWidth: 2,
    height: 62,
    left: -7,
    position: "absolute",
    top: -7,
    width: 62
  },
  helperTower: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.88)",
    borderRadius: 8,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    paddingTop: 4,
    position: "relative",
    width: 60
  },
  helperTowerDock: {
    alignItems: "flex-end",
    bottom: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 9
  },
  helperTowerText: {
    color: "#dce9df",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 2,
    maxWidth: 52,
    textAlign: "center"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  heroImage: {
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    height: 190,
    marginTop: 10,
    width: "100%"
  },
  hitFill: {
    borderRadius: 999,
    height: 4
  },
  hitTrack: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    height: 4,
    marginTop: 2,
    overflow: "hidden",
    width: 42
  },
  intro: {
    color: "#53645d",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 8
  },
  incomingBody: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  incomingHint: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  incomingPanel: {
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    marginTop: 10,
    padding: 12
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: "88%",
    padding: 14,
    width: "100%"
  },
  modalCounter: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginTop: -4
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  modalHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  modalIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginBottom: 10
  },
  modalState: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
    padding: 18
  },
  modalStateText: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  noticeText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  opponentButton: {
    backgroundColor: "#edf6ea",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    padding: 10
  },
  opponentButtonSelected: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  opponentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  opponentMeta: {
    color: "#6f7f5f",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  opponentPresence: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4
  },
  opponentPresenceSelected: {
    color: "#d7bd57"
  },
  opponentName: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  opponentNameSelected: {
    color: "#ffffff"
  },
  pendingBadge: {
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  resultBox: {
    gap: 6,
    marginTop: 10
  },
  resultLine: {
    color: "#53645d",
    fontSize: 14,
    fontWeight: "800"
  },
  resultTitle: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  scoreRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 8
  },
  scoreText: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  startBody: {
    color: "#53645d",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center"
  },
  startModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  startModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    width: "100%"
  },
  startPanel: {
    alignItems: "stretch",
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
    padding: 12
  },
  startTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  trainingBody: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  trainingButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  trainingButtonText: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900"
  },
  trainingCopy: {
    flex: 1,
    minWidth: 0
  },
  trainingPanel: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 10
  },
  trainingResult: {
    alignItems: "center",
    gap: 10,
    padding: 18
  },
  trainingResultBody: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center"
  },
  trainingResultScore: {
    color: "#d7bd57",
    fontSize: 22,
    fontWeight: "900"
  },
  trainingResultTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  trainingTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 3
  },
  rarityPill: {
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 3,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  smallButton: {
    backgroundColor: "#edf6ea",
    borderColor: "#15724f",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  smallButtonText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  squadChoice: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    minHeight: 148,
    padding: 8
  },
  squadChoiceActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  squadChoiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  squadChoiceList: {
    marginBottom: 10,
    maxHeight: 390
  },
  squadChoiceMeta: {
    color: "#6f7f5f",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    minHeight: 28,
    textAlign: "center"
  },
  squadChoiceMetaActive: {
    color: "#dce9df"
  },
  squadChoiceName: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 5,
    maxWidth: "100%",
    textAlign: "center"
  },
  squadChoiceNameActive: {
    color: "#ffffff"
  },
  squadJar: {
    alignItems: "center",
    backgroundColor: "rgba(232,246,239,0.82)",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 2,
    height: 104,
    justifyContent: "center",
    overflow: "hidden",
    padding: 6
  },
  squadJarBase: {
    backgroundColor: "rgba(16,32,24,0.18)",
    borderRadius: 999,
    bottom: 5,
    height: 5,
    left: 12,
    position: "absolute",
    right: 12
  },
  squadJarBonus: {
    color: "#53645d",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 1,
    textAlign: "center"
  },
  squadJarEmpty: {
    color: "#6f7f5f",
    fontSize: 28,
    fontWeight: "900"
  },
  squadJarLid: {
    alignSelf: "center",
    backgroundColor: "#d7e1d9",
    borderColor: "#c4d2c8",
    borderRadius: 999,
    borderWidth: 1,
    height: 10,
    marginBottom: -2,
    width: 54,
    zIndex: 2
  },
  squadJarName: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center",
    width: "100%"
  },
  squadJarShine: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    height: 42,
    left: 8,
    position: "absolute",
    top: 8,
    width: 10
  },
  squadJars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  squadJarWrap: {
    flex: 1
  },
  squadSelectedPill: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 999,
    borderWidth: 1,
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: "center"
  },
  squadSelectedPillActive: {
    backgroundColor: "#d7bd57",
    borderColor: "#d7bd57",
    color: "#102018"
  },
  statusText: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800"
  },
  target: {
    alignItems: "center",
    backgroundColor: "rgba(253,254,251,0.95)",
    borderRadius: 8,
    borderWidth: 2,
    height: 62,
    justifyContent: "center",
    padding: 5,
    position: "absolute",
    width: 62
  },
  targetSwatter: {
    left: 0,
    top: 0
  },
  timerText: {
    color: "#b83227",
    fontSize: 24,
    fontWeight: "900"
  },
  waitingPanel: {
    gap: 8,
    marginTop: 8
  }
});
