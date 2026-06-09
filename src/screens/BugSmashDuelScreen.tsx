import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugSwatterHit, playBugSwatterFeedback } from "../components/BugSwatterHit";
import { BugDexDropResult, grantBugDexReward } from "../services/bugDexService";
import { activeBugSquadBonuses } from "../services/bugSquadService";
import {
  bugSmashDuelDurationMs,
  cancelBugSmashDuel,
  claimBugSmashDuelReward,
  createBugSmashDuel,
  listBugSmashDuels,
  respondBugSmashDuel,
  submitBugSmashDuelScore,
  subscribeBugSmashDuel
} from "../services/bugSmashDuelService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { BugDexRarity } from "../services/pointsService";
import { entryByBugId } from "../services/bugDexService";
import { playBugSound } from "../services/soundService";
import { listUsers } from "../services/userService";
import { BugSmashDuel, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  initialDuelId?: string;
  initialOpponent?: User | null;
  onBack: () => void;
  onDuelAccepted?: (requesterId: string, duelId: string) => Promise<void>;
  onDuelRequest?: (recipientId: string, duelId: string) => Promise<void>;
  onRewardDrop?: (drop: BugDexDropResult) => void;
};

type DuelAssist = {
  scoreBoost: number;
  speedAssist: number;
  tapAssist: number;
};

const duelHeroImage = require("../../assets/generated/bug-smash-duel-concept.jpg");

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

const baseTapsByRarity: Record<BugDexRarity, number> = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 3,
  Legendarisch: 4,
  Mythisch: 5
};

export function BugSmashDuelScreen({ user, initialDuelId = "", initialOpponent, onBack, onDuelAccepted, onDuelRequest, onRewardDrop }: Props) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [activeDuelId, setActiveDuelId] = useState(initialDuelId);
  const [activeDuel, setActiveDuel] = useState<BugSmashDuel | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState(initialOpponent?.uid ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const [caughtBugIds, setCaughtBugIds] = useState<string[]>([]);
  const submittedRef = useRef(false);
  const scoreRef = useRef(0);
  const caughtBugIdsRef = useRef<string[]>([]);
  const hitCountsRef = useRef<Record<string, number>>({});
  const hitFeedbackValues = useRef(new Map<string, Animated.Value>()).current;
  const assist = useMemo(() => duelAssistForUser(user), [user.activeBugSquad, user.uid]);
  const opponents = users.filter((item) => item.uid !== user.uid);

  useEffect(() => {
    let active = true;
    void Promise.all([listUsers(), listBugSmashDuels(user)]).then(([nextUsers, nextDuels]) => {
      if (!active) return;
      setUsers(nextUsers);
      setDuels(nextDuels);
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
    if (initialDuelId) setActiveDuelId(initialDuelId);
  }, [initialDuelId]);

  useEffect(() => {
    if (initialOpponent?.uid) setSelectedOpponentId(initialOpponent.uid);
  }, [initialOpponent?.uid]);

  useEffect(() => subscribeBugSmashDuel(activeDuelId, setActiveDuel), [activeDuelId]);

  useEffect(() => {
    submittedRef.current = false;
    scoreRef.current = 0;
    caughtBugIdsRef.current = [];
    hitCountsRef.current = {};
    hitFeedbackValues.clear();
    setScore(0);
    setCaughtBugIds([]);
    setHitCounts({});
  }, [activeDuel?.id]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    caughtBugIdsRef.current = caughtBugIds;
  }, [caughtBugIds]);

  useEffect(() => {
    hitCountsRef.current = hitCounts;
  }, [hitCounts]);

  useEffect(() => {
    if (!activeDuel || activeDuel.status !== "accepted") return () => undefined;
    const interval = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      const startAt = activeDuel.startAt ? Date.parse(activeDuel.startAt) : timestamp;
      const endAt = startAt + activeDuel.durationMs;
      if (timestamp >= endAt && !submittedRef.current) {
        submittedRef.current = true;
        const bonusScore = duelBonusScore(scoreRef.current, assist.scoreBoost);
        void submitBugSmashDuelScore(user, activeDuel.id, scoreRef.current + bonusScore, caughtBugIdsRef.current, bonusScore)
          .then((duel) => setActiveDuel(duel))
          .catch(() => setError(t("duel.submitFailed")));
      }
    }, 90);
    return () => clearInterval(interval);
  }, [activeDuel?.id, activeDuel?.status, activeDuel?.startAt, activeDuel?.durationMs, assist.scoreBoost, t, user]);

  async function refreshDuels() {
    setDuels(await listBugSmashDuels(user));
  }

  async function startChallenge() {
    const opponent = opponents.find((item) => item.uid === selectedOpponentId);
    if (!opponent || busy) return;
    setBusy(true);
    setError("");
    try {
      const duel = await createBugSmashDuel(user, opponent);
      await onDuelRequest?.(opponent.uid, duel.id);
      setActiveDuelId(duel.id);
      setActiveDuel(duel);
      await refreshDuels();
    } catch (event) {
      setError(event instanceof Error ? event.message : t("duel.createFailed"));
    } finally {
      setBusy(false);
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
    setBusy(true);
    try {
      await cancelBugSmashDuel(user, activeDuel.id);
      setActiveDuel(null);
      setActiveDuelId("");
      await refreshDuels();
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
    if (!activeDuel || !isRunning(activeDuel, now)) return;
    const entry = entryByBugId(bugId);
    if (!entry || caughtBugIdsRef.current.includes(bugId)) return;
    const requiredTaps = requiredTapsForRarity(entry.rarity, assist.tapAssist);
    const nextHits = (hitCountsRef.current[bugId] ?? 0) + 1;
    playBugSwatterFeedback(hitFeedbackFor(bugId));
    setHitCounts((current) => ({ ...current, [bugId]: nextHits }));
    if (nextHits < requiredTaps) {
      playBugSound("bug_hit");
      return;
    }
    playBugSound("bug_catch");
    setCaughtBugIds((current) => current.includes(bugId) ? current : [...current, bugId]);
    setScore((current) => current + 1);
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
  const countdown = activeDuel?.status === "accepted" && activeDuel.startAt ? Math.max(0, Math.ceil((Date.parse(activeDuel.startAt) - now) / 1000)) : 0;
  const remainingSeconds = activeDuel?.status === "accepted" && activeDuel.startAt ? Math.max(0, Math.ceil((Date.parse(activeDuel.startAt) + activeDuel.durationMs - now) / 1000)) : 0;
  const activeDuelScore = activeScore?.score ?? (submittedRef.current ? score + duelBonusScore(score, assist.scoreBoost) : score);

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
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={!selectedOpponentId || busy} style={[sharedStyles.button, (!selectedOpponentId || busy) && styles.disabled]} onPress={startChallenge}>
            <Text style={sharedStyles.buttonText}>{busy ? "..." : t("duel.challenge")}</Text>
          </Pressable>
        </View>
      )}

      {activeDuel && (
        <View style={styles.card}>
          <View style={styles.duelTitleRow}>
            <View>
              <Text style={styles.cardTitle}>{opponentLabel(activeDuel, user)}</Text>
              <Text style={styles.statusText}>{statusLabel(activeDuel, t)}</Text>
            </View>
            <Text style={styles.timerText}>{activeDuel.status === "accepted" ? remainingSeconds : 30}s</Text>
          </View>

          {activeDuel.status === "pending" && activeDuel.toUserId === user.uid && (
            <View style={styles.actionsRow}>
              <Pressable disabled={busy} style={sharedStyles.button} onPress={() => respond(true)}>
                <Text style={sharedStyles.buttonText}>{t("duel.accept")}</Text>
              </Pressable>
              <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={() => respond(false)}>
                <Text style={sharedStyles.secondaryButtonText}>{t("duel.decline")}</Text>
              </Pressable>
            </View>
          )}

          {activeDuel.status === "pending" && activeDuel.fromUserId === user.uid && (
            <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={cancel}>
              <Text style={sharedStyles.secondaryButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          )}

          {activeDuel.status === "accepted" && (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
                <Text style={styles.scoreText}>{opponentScore ? t("duel.theirScore", { score: opponentScore.score }) : t("duel.waitingScore")}</Text>
              </View>
              <View style={styles.arena}>
                {countdown > 0 ? (
                  <Text style={styles.countdown}>{countdown}</Text>
                ) : isRunning(activeDuel, now) ? (
                  renderTargets(activeDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, hitBug)
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
        <Text style={styles.cardTitle}>{t("duel.bonusTitle")}</Text>
        <Text style={styles.bonusLine}>{t("duel.tapAssist", { value: Math.round(assist.tapAssist * 100) })}</Text>
        <Text style={styles.bonusLine}>{t("duel.speedAssist", { value: Math.round(assist.speedAssist * 100) })}</Text>
        <Text style={styles.bonusLine}>{t("duel.scoreAssist", { value: Math.round(assist.scoreBoost * 100) })}</Text>
      </View>

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

function renderTargets(
  duel: BugSmashDuel,
  timestamp: number,
  caughtBugIds: string[],
  hitCounts: Record<string, number>,
  assist: DuelAssist,
  hitFeedbackValues: Map<string, Animated.Value>,
  onHit: (bugId: string) => void
) {
  const startAt = duel.startAt ? Date.parse(duel.startAt) : timestamp;
  const elapsed = timestamp - startAt;
  return duel.bugIds.map((bugId, index) => {
    if (caughtBugIds.includes(bugId)) return null;
    const entry = entryByBugId(bugId);
    if (!entry) return null;
    const motion = targetMotion(index, duel.seed, elapsed, entry.rarity, assist.speedAssist);
    if (!motion.visible) return null;
    const requiredTaps = requiredTapsForRarity(entry.rarity, assist.tapAssist);
    const hits = hitCounts[bugId] ?? 0;
    const feedback = hitFeedbackValues.get(bugId);
    return (
      <Pressable
        key={bugId}
        style={[
          styles.target,
          {
            borderColor: rarityColors[entry.rarity],
            left: `${motion.x}%`,
            top: `${motion.y}%`,
            transform: [{ rotate: `${motion.rotate}deg` }]
          }
        ]}
        onPress={() => onHit(bugId)}
      >
        {feedback && <BugSwatterHit bugSize={44} feedback={feedback} style={styles.targetSwatter} />}
        <BugArtImage bugId={bugId} size={44} />
        <View style={styles.hitTrack}>
          <View style={[styles.hitFill, { backgroundColor: rarityColors[entry.rarity], width: `${Math.min(100, (hits / requiredTaps) * 100)}%` }]} />
        </View>
      </Pressable>
    );
  });
}

function targetMotion(index: number, seed: number, elapsedMs: number, rarity: BugDexRarity, speedAssist: number) {
  const lane = (index * 37 + seed) % 76;
  const wave = (index % 5) + 2;
  const raritySpeed = rarity === "Gewoon" ? 1 : rarity === "Zeldzaam" ? 0.92 : rarity === "Episch" ? 0.84 : rarity === "Legendarisch" ? 0.78 : 0.72;
  const duration = 9500 * raritySpeed * (1 + speedAssist);
  const waveStart = Math.floor(index / 8) * 9000;
  const spawnStart = waveStart + (index % 8) * 950;
  const progress = (elapsedMs - spawnStart) / duration;
  if (progress < 0 || progress > 1) return { visible: false, x: 0, y: 0, rotate: 0 };
  const direction = index % 2 === 0 ? 1 : -1;
  const x = direction === 1 ? -10 + progress * 116 : 106 - progress * 116;
  const crawl = Math.sin(progress * Math.PI * wave + index) * 8 + Math.sin(progress * Math.PI * 9 + seed) * 2;
  const y = Math.max(5, Math.min(82, lane + crawl));
  const rotate = direction * (Math.sin(progress * Math.PI * 2 + index) * 18 + 8);
  return { visible: true, x, y, rotate };
}

function requiredTapsForRarity(rarity: BugDexRarity, tapAssist: number) {
  return Math.max(1, Math.ceil(baseTapsByRarity[rarity] * (1 - tapAssist)));
}

function duelAssistForUser(user: User): DuelAssist {
  const bonuses = activeBugSquadBonuses(user);
  return {
    tapAssist: Math.min(0.25, bonuses.catch_assist + bonuses.knowledge_boost * 0.6 + bonuses.support_boost * 0.4),
    speedAssist: Math.min(0.18, bonuses.catch_time + bonuses.knowledge_boost * 0.3),
    scoreBoost: Math.min(0.1, bonuses.support_boost * 0.7 + bonuses.knowledge_boost * 0.5)
  };
}

function duelBonusScore(score: number, boost: number) {
  return Math.min(3, Math.floor(score * boost));
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
  opponentName: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  opponentNameSelected: {
    color: "#ffffff"
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
  }
});
