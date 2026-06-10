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
import { duelLossXp, duelWinXp } from "../services/rewardBalanceService";
import { playBugSound } from "../services/soundService";
import { soloCampaignConfig, soloCampaignBugIds, soloCampaignMaxLevel, soloCampaignMaxWave, soloCampaignTargetRange, type SoloCampaignConfig } from "../services/soloCampaignBalance";
import { activateSoloLampFocus, consumeSoloBugBomb, emptySoloPowerupInventory, grantSoloBossReward, loadSoloPowerupInventory, soloLampFocusActive, soloLampFocusRemainingMinutes, type SoloPowerupInventory } from "../services/soloPowerupService";
import { applyUserPoints, listUsers, updateUserBugSquad } from "../services/userService";
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
const squadJarImage = require("../../assets/generated/bug-squad-empty-jar-hd.png");
const soloCampaignImage = require("../../assets/generated/solo-duel-campaign-hd.jpg");
const soloPowerupLampImage = require("../../assets/generated/solo-powerup-lamp-hd.jpg");
const soloPowerupBombImage = require("../../assets/generated/solo-powerup-bomb-hd.jpg");
const duelEffectSprites = {
  fireball: require("../../assets/generated/duel_effect_fireball_hd.png"),
  freeze: require("../../assets/generated/duel_effect_iceburst_hd.png"),
  goo: require("../../assets/generated/duel_effect_goo_hd.png"),
  lightning: require("../../assets/generated/duel_effect_lightning_hd.png"),
  shield: require("../../assets/generated/duel_effect_shield_hd.png"),
  slash: require("../../assets/generated/duel_effect_slash_hd.png")
};
const DuelTargetBugArt = React.memo(BugArtImage);
const duelGameTickMs = 33;
const maxVisibleDuelTargets = 10;

type HelperImpactKind = "burst" | "shield" | "splash" | "sticky" | "zap";
type HelperAnimationStyle = "orb" | "pulse" | "slash";
type MythicSpecialKind = "royal_freeze" | "prism_chain" | "pattern_break" | "candy_slow" | "longneck_scout" | "bloom_blade" | "lantern_signal" | "mirror_guard";

type MythicSpecialSpec = {
  animationStyle: HelperAnimationStyle;
  color: string;
  freezeMs?: number;
  kind: MythicSpecialKind;
  label: string;
  symbol: string;
};

type HelperImpact = {
  animationStyle: HelperAnimationStyle;
  id: string;
  bugId: string;
  color: string;
  kind: HelperImpactKind;
  label: string;
  special?: MythicSpecialKind;
  sourceX: number;
  sourceY: number;
  splashPoints: Array<{ id: string; x: number; y: number }>;
  symbol: string;
  x: number;
  y: number;
};

type VisibleDuelTarget = {
  bugId: string;
  entry: NonNullable<ReturnType<typeof entryByBugId>>;
  frozen?: boolean;
  index: number;
  motion: ReturnType<typeof targetMotion>;
};

type FrozenTarget = {
  motion: ReturnType<typeof targetMotion>;
  until: number;
};

type SoloRun = {
  mode: "training";
} | SoloCampaignConfig & {
  mode: "campaign";
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

const mythicSpecials: Record<string, MythicSpecialSpec> = {
  "koningin-alexandravlinder": {
    animationStyle: "pulse",
    color: "#60a5fa",
    freezeMs: 900,
    kind: "royal_freeze",
    label: "Royal Freeze",
    symbol: "FRZ"
  },
  "zonsondergangsmot": {
    animationStyle: "orb",
    color: "#f97316",
    kind: "prism_chain",
    label: "Prism Chain",
    symbol: "PRM"
  },
  "picasso-wants": {
    animationStyle: "pulse",
    color: "#22c55e",
    kind: "pattern_break",
    label: "Pattern Break",
    symbol: "ART"
  },
  "roze-esdoornmot": {
    animationStyle: "orb",
    color: "#f472b6",
    freezeMs: 650,
    kind: "candy_slow",
    label: "Candy Slow",
    symbol: "SLOW"
  },
  "giraffekevertje": {
    animationStyle: "orb",
    color: "#facc15",
    kind: "longneck_scout",
    label: "Longneck Scout",
    symbol: "SCAN"
  },
  "doornbloembidsprinkhaan": {
    animationStyle: "slash",
    color: "#fb7185",
    kind: "bloom_blade",
    label: "Bloom Blade",
    symbol: "CUT"
  },
  "lantaarndrager": {
    animationStyle: "pulse",
    color: "#fde047",
    kind: "lantern_signal",
    label: "Lantern Signal",
    symbol: "LAMP"
  },
  "glorieuze-scarabee": {
    animationStyle: "pulse",
    color: "#38bdf8",
    freezeMs: 500,
    kind: "mirror_guard",
    label: "Mirror Guard",
    symbol: "MIR"
  }
};

export function BugSmashDuelScreen({ user, initialDuelId = "", initialOpponent, onBack, onDuelAccepted, onDuelRequest, onRewardDrop, onUserUpdated }: Props) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [activeDuelId, setActiveDuelId] = useState(initialDuelId);
  const [activeDuel, setActiveDuel] = useState<BugSmashDuel | null>(null);
  const [trainingDuel, setTrainingDuel] = useState<BugSmashDuel | null>(null);
  const [soloRun, setSoloRun] = useState<SoloRun | null>(null);
  const [activeSquadIds, setActiveSquadIds] = useState<string[]>(sanitizeActiveBugSquad(user.activeBugSquad));
  const [selectedOpponentId, setSelectedOpponentId] = useState(initialOpponent?.uid ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [challengeNotice, setChallengeNotice] = useState("");
  const [soloPowerups, setSoloPowerups] = useState<SoloPowerupInventory>(emptySoloPowerupInventory);
  const [soloRewardNotice, setSoloRewardNotice] = useState("");
  const [soloBombFlash, setSoloBombFlash] = useState(false);
  const [squadModalVisible, setSquadModalVisible] = useState(false);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadBusyId, setSquadBusyId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const [caughtBugIds, setCaughtBugIds] = useState<string[]>([]);
  const [helperImpacts, setHelperImpacts] = useState<HelperImpact[]>([]);
  const [localStartAtByDuelId, setLocalStartAtByDuelId] = useState<Record<string, string>>({});
  const [acknowledgedWaitingDuelIds, setAcknowledgedWaitingDuelIds] = useState<Set<string>>(new Set());
  const [dismissedResultDuelIds, setDismissedResultDuelIds] = useState<Set<string>>(new Set());
  const submittedRef = useRef(false);
  const scoreRef = useRef(0);
  const caughtBugIdsRef = useRef<string[]>([]);
  const comboRef = useRef(0);
  const hitCountsRef = useRef<Record<string, number>>({});
  const hitFeedbackValues = useRef(new Map<string, Animated.Value>()).current;
  const helperCooldownAtRef = useRef<Record<string, number>>({});
  const helperImpactIdRef = useRef(0);
  const frozenTargetsRef = useRef<Record<string, FrozenTarget>>({});
  const targetTimeOffsetsRef = useRef<Record<string, number>>({});
  const lastCatchAtRef = useRef(0);
  const lastHitSoundAtRef = useRef(0);
  const soloBossRewardedRef = useRef(new Set<string>());
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
    frozenTargetsRef.current = {};
    targetTimeOffsetsRef.current = {};
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

  useEffect(() => {
    let active = true;
    void loadSoloPowerupInventory(user.uid).then((nextInventory) => {
      if (active) setSoloPowerups(nextInventory);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user.uid]);

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

  const activeLocalStartAt = activeDuel ? localStartAtByDuelId[activeDuel.id] : "";
  const activeDuelOwnScore = activeDuel?.scores?.[user.uid];
  const acceptedDuelExpired = Boolean(activeDuel?.status === "accepted" && activeDuel.startAt && Date.parse(activeDuel.startAt) + activeDuel.durationMs <= now);
  const requesterNeedsManualStart = Boolean(activeDuel?.status === "accepted" && activeDuel.fromUserId === user.uid && !activeLocalStartAt);
  const missedAutoStartNeedsManualStart = Boolean(activeDuel?.status === "accepted" && !activeDuelOwnScore && !activeLocalStartAt && !requesterNeedsManualStart && acceptedDuelExpired);
  const playerNeedsManualStart = requesterNeedsManualStart || missedAutoStartNeedsManualStart;
  const playableDuel = activeDuel?.status === "accepted" && activeLocalStartAt
    ? { ...activeDuel, startAt: activeLocalStartAt }
    : activeDuel;

  useEffect(() => {
    const runningDuel = trainingDuel ?? activeDuel;
    if (!runningDuel || runningDuel.status !== "accepted" || (!trainingDuel && playerNeedsManualStart)) return () => undefined;
    const interval = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      const effectiveStartAt = trainingDuel ? runningDuel.startAt : activeLocalStartAt || runningDuel.startAt;
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
  }, [activeDuel?.id, activeDuel?.status, activeDuel?.startAt, activeDuel?.durationMs, trainingDuel?.id, trainingDuel?.startAt, trainingDuel?.durationMs, activeLocalStartAt, playerNeedsManualStart, assist, t, user]);

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
    setSoloRun(null);
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
      const result = await claimBugSmashDuelReward(user, activeDuel.id);
      if (!result) return;
      const updatedUser = await applyUserPoints(user.uid, result === "win" ? duelWinXp : duelLossXp, 0);
      if (updatedUser) onUserUpdated?.(updatedUser);
      if (result === "win") {
        const drop = await grantBugDexReward(updatedUser ?? user, "duel_win");
        onRewardDrop?.(drop);
      }
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

  function applyBugHit(bugId: string, source: "helper" | "tap", timestamp = now, duelOverride?: BugSmashDuel) {
    const runningDuel = duelOverride ?? trainingDuel ?? activeDuel;
    if (!runningDuel || !isRunning(runningDuel, timestamp)) return;
    const entry = entryByBugId(bugId);
    if (!entry || caughtBugIdsRef.current.includes(bugId)) return;
    const targetIndex = runningDuel.bugIds.indexOf(bugId);
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, targetIndex, soloTapMultiplier);
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
    const renderedTargets = collectRenderedTargets(duel, timestamp, caughtBugIdsRef.current, assist, frozenTargetsRef.current, targetTimeOffsetsRef.current);
    if (!renderedTargets.length) return;

    activeSquadBonuses.forEach((bonus, helperIndex) => {
      const spec = helperSpecForBonus(bonus);
      const readyAt = helperCooldownAtRef.current[bonus.bugId];
      if (readyAt === undefined) {
        helperCooldownAtRef.current[bonus.bugId] = timestamp + helperInitialCooldownMs(spec.cooldownMs, helperIndex);
        return;
      }
      if (timestamp < readyAt) return;
      const helperTargets = renderedTargets.filter((item) => item.motion.progress <= helperMaxTargetProgress(bonus));
      if (!helperTargets.length) return;
      const target = selectHelperTarget(helperTargets, bonus, hitCountsRef.current, timestamp, spec.special);
      if (!target) return;

      helperCooldownAtRef.current[bonus.bugId] = timestamp + spec.cooldownMs + helperIndex * 260;
      const targetHits = helperHitsForTarget(bonus, target, hitCountsRef.current, assist, spec.special);
      const splashTargets = helperSplashTargetsForSpecial(spec, helperTargets, target);
      const freezeTargets = helperFreezeTargetsForSpecial(spec.special, target, splashTargets);
      if (spec.special?.freezeMs && freezeTargets.length) freezeDuelTargets(freezeTargets, timestamp, spec.special.freezeMs);
      const controlMs = helperControlMsForKind(spec.kind, bonus.rarity, target.motion.progress);
      if (!spec.special && controlMs > 0) freezeDuelTargets([target], timestamp, controlMs);
      const source = helperTowerSourcePosition(helperIndex, activeSquadBonuses.length);

      addHelperImpact(
        bonus.bugId,
        target.motion.x,
        target.motion.y,
        spec.color,
        spec.kind,
        helperImpactLabel(spec.kind, targetHits, t, spec.special),
        spec.special?.animationStyle ?? helperAnimationStyleForIndex(helperIndex),
        source,
        splashTargets.map((item) => ({ id: item.bugId, x: item.motion.x, y: item.motion.y })),
        spec.special
      );
      for (let hit = 0; hit < targetHits; hit += 1) applyBugHit(target.bugId, "helper", timestamp, duel);

      splashTargets.forEach((item) => {
        const splashHits = helperSplashHitsForTarget(bonus, item, spec.special);
        for (let hit = 0; hit < splashHits; hit += 1) applyBugHit(item.bugId, "helper", timestamp, duel);
      });
    });
  }

  function addHelperImpact(
    bugId: string,
    x: number,
    y: number,
    color: string,
    kind: HelperImpactKind,
    label: string,
    animationStyle: HelperAnimationStyle,
    source: { x: number; y: number },
    splashPoints: Array<{ id: string; x: number; y: number }>,
    special?: MythicSpecialSpec
  ) {
    const id = `helper-${helperImpactIdRef.current++}`;
    setHelperImpacts((current) => [...current.slice(-8), { animationStyle, id, bugId, color, kind, label, sourceX: source.x, sourceY: source.y, special: special?.kind, splashPoints, symbol: special?.symbol ?? helperImpactSymbol(kind), x, y }]);
    setTimeout(() => {
      setHelperImpacts((current) => current.filter((item) => item.id !== id));
    }, 720);
  }

  function freezeDuelTargets(targets: VisibleDuelTarget[], timestamp: number, durationMs: number) {
    for (const target of targets) {
      if (caughtBugIdsRef.current.includes(target.bugId)) continue;
      const currentFreeze = frozenTargetsRef.current[target.bugId];
      const until = Math.max(currentFreeze?.until ?? 0, timestamp + durationMs);
      const extraPause = Math.max(0, until - Math.max(currentFreeze?.until ?? timestamp, timestamp));
      targetTimeOffsetsRef.current[target.bugId] = (targetTimeOffsetsRef.current[target.bugId] ?? 0) + extraPause;
      frozenTargetsRef.current[target.bugId] = { motion: target.motion, until };
    }
  }

  function startAcceptedDuel() {
    if (!activeDuel) return;
    resetRunState();
    setNow(Date.now());
    setLocalStartAtByDuelId((current) => ({
      ...current,
      [activeDuel.id]: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString()
    }));
  }

  function startTraining() {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    resetRunState();
    setSoloRun({ mode: "training" });
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

  function startSoloCampaign(wave = 1) {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    const config = soloCampaignConfig(wave);
    resetRunState();
    setSoloRun({ mode: "campaign", ...config });
    setActiveDuelId("");
    setActiveDuel(null);
    setError("");
    setChallengeNotice("");
    setSoloRewardNotice("");
    setNow(Date.now());
    setTrainingDuel({
      id: `solo-${wave}-${Date.now()}`,
      fromUserId: user.uid,
      fromUserName: user.displayName,
      toUserId: "bugbot",
      toUserName: t("duel.soloPcName"),
      status: "accepted",
      seed,
      bugIds: soloCampaignBugIds(seed, config),
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
    setSoloRun(null);
    resetRunState();
    setNow(Date.now());
  }

  async function activateLampFocus() {
    const result = await activateSoloLampFocus(user.uid);
    setSoloPowerups(result.inventory);
    setSoloRewardNotice(result.activated ? t("duel.powerupLampActivated") : t("duel.powerupEmpty"));
  }

  async function useSoloBugBomb() {
    if (!soloCampaign || !gameDuel || !isRunning(gameDuel, now)) return;
    const result = await consumeSoloBugBomb(user.uid);
    setSoloPowerups(result.inventory);
    if (!result.consumed) {
      setSoloRewardNotice(t("duel.powerupEmpty"));
      return;
    }
    const targets = collectRenderedTargets(gameDuel, now, caughtBugIdsRef.current, assist, frozenTargetsRef.current, targetTimeOffsetsRef.current).slice(0, 6);
    setSoloBombFlash(true);
    setTimeout(() => setSoloBombFlash(false), 620);
    setSoloRewardNotice(t("duel.powerupBombUsed"));
    targets.forEach((target) => {
      const required = requiredTapsForTarget(target.entry.rarity, assist, target.index, soloTapMultiplier);
      const hits = hitCountsRef.current[target.bugId] ?? 0;
      for (let hit = hits; hit < required; hit += 1) applyBugHit(target.bugId, "helper", now, gameDuel);
    });
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
  const awaitingOpponentResult = Boolean(activeDuel?.status === "accepted" && activeScore && !opponentScore);
  const showWaitingResultModal = Boolean(activeDuel && awaitingOpponentResult && !acknowledgedWaitingDuelIds.has(activeDuel.id));
  const showResultModal = Boolean(activeDuel?.status === "completed" && isDuelParticipant(activeDuel, user) && !dismissedResultDuelIds.has(activeDuel.id));
  const gameDuel = trainingDuel ?? playableDuel;
  const countdown = gameDuel?.status === "accepted" && gameDuel.startAt ? Math.max(0, Math.ceil((Date.parse(gameDuel.startAt) - now) / 1000)) : 0;
  const remainingSeconds = gameDuel?.status === "accepted" && gameDuel.startAt ? Math.max(0, Math.ceil((Date.parse(gameDuel.startAt) + gameDuel.durationMs - now) / 1000)) : 0;
  const activeDuelScore = activeScore?.score ?? (submittedRef.current ? score + duelBonusScore(score, assist) : score);
  const incomingPendingDuel = activeDuel?.status === "pending" && activeDuel.toUserId === user.uid;
  const fullscreenGame = Boolean(trainingDuel) || playableDuel?.status === "accepted" && !playerNeedsManualStart && !awaitingOpponentResult;
  const gameScore = trainingDuel && submittedRef.current ? score + duelBonusScore(score, assist) : trainingDuel ? score : activeDuelScore;
  const soloCampaign = soloRun?.mode === "campaign" ? soloRun : null;
  const soloProgress = gameDuel?.startAt ? Math.max(0, Math.min(1, (now - Date.parse(gameDuel.startAt)) / gameDuel.durationMs)) : 0;
  const soloPcScore = soloCampaign ? Math.min(soloCampaign.pcScore, Math.round(soloCampaign.pcScore * soloProgress)) : 0;
  const soloCampaignWon = Boolean(soloCampaign && submittedRef.current && gameScore >= soloCampaign.targetScore && gameScore >= soloCampaign.pcScore);
  const soloCampaignComplete = Boolean(soloCampaignWon && soloCampaign && soloCampaign.wave >= soloCampaignMaxWave);
  const lampFocusActive = soloLampFocusActive(soloPowerups, now);
  const lampFocusMinutes = soloLampFocusRemainingMinutes(soloPowerups, now);
  const soloTapMultiplier = soloCampaign && lampFocusActive ? 0.5 : 1;

  useEffect(() => {
    if (!soloCampaign || !trainingDuel || !soloCampaignWon || !soloCampaign.boss) return;
    const rewardKey = trainingDuel.id;
    if (soloBossRewardedRef.current.has(rewardKey)) return;
    soloBossRewardedRef.current.add(rewardKey);
    void grantSoloBossReward(user.uid, soloCampaign.level).then((result) => {
      setSoloPowerups(result.inventory);
      const labels = result.rewards.map((reward) => reward === "lamp_focus" ? t("duel.powerupLamp") : t("duel.powerupBomb"));
      setSoloRewardNotice(t("duel.bossReward", { reward: labels.join(" + ") }));
    }).catch(() => undefined);
  }, [soloCampaignWon, soloCampaign?.boss, soloCampaign?.level, trainingDuel?.id, user.uid, t]);

  if (fullscreenGame && gameDuel) {
    return (
      <View style={styles.fullscreenGame}>
        <View style={styles.gameHud}>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? soloCampaign ? t("duel.soloCampaignTitle") : t("duel.trainingTitle") : opponentLabel(gameDuel, user)}</Text>
            <Text style={styles.gameScore}>{t("duel.yourScore", { score: gameScore })}</Text>
          </View>
          <Text style={styles.gameTimer}>{remainingSeconds}s</Text>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? soloCampaign ? t("duel.soloPcScore", { score: soloPcScore, target: soloCampaign.targetScore }) : t("duel.trainingNoRewardsShort") : opponentScore ? t("duel.theirScore", { score: opponentScore.score }) : t("duel.waitingScore")}</Text>
            <Pressable style={styles.gameExitButton} onPress={trainingDuel ? stopTraining : onBack}>
              <Text style={styles.gameExitText}>x</Text>
            </Pressable>
          </View>
        </View>
        {soloCampaign ? (
          <View style={styles.soloPowerupHud}>
            <View style={styles.soloPowerupHudItem}>
              <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloPowerupHudImage} />
              <Text style={styles.soloPowerupHudText}>{lampFocusActive ? t("duel.powerupLampActive", { minutes: lampFocusMinutes }) : t("duel.powerupLampShort", { count: soloPowerups.lampFocusCharges })}</Text>
            </View>
            <Pressable disabled={soloPowerups.bugBombCharges <= 0 || !isRunning(gameDuel, now)} style={[styles.soloPowerupHudButton, soloPowerups.bugBombCharges <= 0 && styles.soloPowerupDisabled]} onPress={useSoloBugBomb}>
              <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloPowerupHudImage} />
              <Text style={styles.soloPowerupHudText}>{t("duel.powerupBombShort", { count: soloPowerups.bugBombCharges })}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.fullscreenArena}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : isRunning(gameDuel, now) ? (
            <>
              {renderTargets(gameDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, frozenTargetsRef.current, targetTimeOffsetsRef.current, hitBug)}
              {renderHelperImpacts(helperImpacts)}
              {renderHelperTowers(activeSquadBonuses, helperCooldownAtRef.current, now, t)}
              {soloBombFlash && (
                <View pointerEvents="none" style={styles.soloBombFlash}>
                  <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloBombFlashImage} />
                  <Text style={styles.soloBombFlashText}>BOOM</Text>
                </View>
              )}
            </>
          ) : trainingDuel && submittedRef.current ? (
            <View style={styles.trainingResult}>
              <Text style={styles.trainingResultTitle}>{soloCampaign ? soloCampaignComplete ? t("duel.soloComplete") : soloCampaignWon ? t("duel.soloWin") : t("duel.soloLoss") : t("duel.trainingDone")}</Text>
              <Text style={styles.trainingResultScore}>{t("duel.yourScore", { score: gameScore })}</Text>
              <Text style={styles.trainingResultBody}>{soloCampaign ? t("duel.soloResultBody", { pc: soloCampaign.pcScore, target: soloCampaign.targetScore }) : t("duel.trainingNoRewards")}</Text>
              {soloCampaign ? <Text style={styles.trainingResultBody}>{soloCampaign.boss ? t("duel.soloBossWave", { wave: soloCampaign.wave, level: soloCampaign.level, maxWave: soloCampaignMaxWave }) : t("duel.soloWave", { wave: soloCampaign.wave, level: soloCampaign.level, maxWave: soloCampaignMaxWave })}</Text> : null}
              {soloCampaign && soloRewardNotice ? (
                <View style={styles.soloRewardCard}>
                  <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloRewardImage} />
                  <Text style={styles.soloRewardText}>{soloRewardNotice}</Text>
                </View>
              ) : null}
              <Pressable style={sharedStyles.button} onPress={soloCampaign ? () => startSoloCampaign(soloCampaignComplete ? 1 : soloCampaignWon ? soloCampaign.wave + 1 : soloCampaign.wave) : startTraining}>
                <Text style={sharedStyles.buttonText}>{soloCampaign ? soloCampaignComplete ? t("duel.soloRestart") : soloCampaignWon ? t("duel.soloNextWave") : t("duel.soloRetry") : t("duel.trainingRetry")}</Text>
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
          <Text style={styles.gameFooterText}>{trainingDuel ? soloCampaign ? t("duel.soloCampaignFooter", { wave: soloCampaign.wave, level: soloCampaign.level, maxWave: soloCampaignMaxWave }) : t("duel.trainingFooter") : "Kies je targets. Hoge rarity kost meer taps, maar scoort veel meer."}</Text>
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
        <View style={styles.modeStack}>
          <View style={[styles.card, styles.duelModePanel]}>
            <View style={styles.modeHeader}>
              <View style={styles.modeHeaderText}>
                <Text style={styles.modeEyebrow}>1v1</Text>
                <Text style={styles.modeTitle}>{t("duel.challengeTitle")}</Text>
              </View>
              <Text style={styles.modeBadge}>Duel</Text>
            </View>
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
          </View>
          <View style={styles.trainingPanel}>
            <Image accessibilityIgnoresInvertColors resizeMode="cover" source={duelHeroImage} style={styles.trainingImage} />
            <View style={styles.trainingContent}>
              <View style={styles.trainingCopy}>
                <View style={styles.trainingTitleRow}>
                  <Text style={styles.trainingTitle}>{t("duel.trainingTitle")}</Text>
                  <Text style={styles.trainingBadge}>Practice</Text>
                </View>
                <Text style={styles.trainingBody}>{t("duel.trainingBody")}</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.trainingButton, pressed && styles.trainingButtonPressed]} onPress={startTraining}>
                <Text style={styles.trainingButtonText}>{t("duel.trainingAction")}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.soloCampaignPanel}>
            <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloCampaignImage} style={styles.soloCampaignImage} />
            <View style={styles.soloCampaignContent}>
              <View style={styles.soloCampaignCopy}>
                <View style={styles.soloCampaignTitleRow}>
                  <Text style={styles.soloCampaignTitle}>{t("duel.soloCampaignTitle")}</Text>
                  <Text style={styles.soloCampaignBadge}>Solo</Text>
                </View>
                <Text style={styles.soloCampaignBody}>{t("duel.soloCampaignBody")}</Text>
                <View style={styles.soloCampaignMetaRow}>
                  <Text style={styles.soloCampaignMeta}>{t("duel.soloWave", { wave: 1, level: 1, maxWave: soloCampaignMaxWave })}</Text>
                  <Text style={styles.soloCampaignMeta}>{t("duel.soloTarget", { score: soloCampaignConfig(1).targetScore })}</Text>
                </View>
                <View style={styles.soloTargetBoard}>
                  <Text style={styles.soloTargetBoardTitle}>{t("duel.soloLevelTargets")}</Text>
                  <View style={styles.soloTargetGrid}>
                    {Array.from({ length: soloCampaignMaxLevel }).map((_, index) => {
                      const range = soloCampaignTargetRange(index + 1);
                      return (
                        <View key={index} style={styles.soloTargetChip}>
                          <Text style={styles.soloTargetLevel}>L{index + 1}</Text>
                          <Text style={styles.soloTargetValue}>{range.start}-{range.boss}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                <View style={styles.soloPowerupPanel}>
                  <View style={styles.soloPowerupItem}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloPowerupImage} />
                    <View style={styles.soloPowerupCopy}>
                      <Text style={styles.soloPowerupName}>{t("duel.powerupLamp")}</Text>
                      <Text style={styles.soloPowerupMeta}>{lampFocusActive ? t("duel.powerupLampActive", { minutes: lampFocusMinutes }) : t("duel.powerupLampMeta", { count: soloPowerups.lampFocusCharges })}</Text>
                    </View>
                    <Pressable disabled={soloPowerups.lampFocusCharges <= 0} style={[styles.soloPowerupUseButton, soloPowerups.lampFocusCharges <= 0 && styles.soloPowerupDisabled]} onPress={activateLampFocus}>
                      <Text style={styles.soloPowerupUseText}>{t("duel.powerupUse")}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.soloPowerupItem}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloPowerupImage} />
                    <View style={styles.soloPowerupCopy}>
                      <Text style={styles.soloPowerupName}>{t("duel.powerupBomb")}</Text>
                      <Text style={styles.soloPowerupMeta}>{t("duel.powerupBombMeta", { count: soloPowerups.bugBombCharges })}</Text>
                    </View>
                  </View>
                </View>
                {soloRewardNotice ? <Text style={styles.soloRewardInline}>{soloRewardNotice}</Text> : null}
              </View>
              <Pressable style={styles.soloCampaignButton} onPress={() => startSoloCampaign(1)}>
                <Text style={styles.soloCampaignButtonText}>{t("duel.soloCampaignAction")}</Text>
              </Pressable>
            </View>
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
            {activeDuel.status === "accepted" && !awaitingOpponentResult ? <Text style={styles.timerText}>{remainingSeconds}s</Text> : <Text style={styles.pendingBadge}>{t("duel.pendingBadge")}</Text>}
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

          {activeDuel.status === "accepted" && playerNeedsManualStart && (
            <View style={styles.startPanel}>
              <Text style={styles.startTitle}>{t("duel.readyTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.readyBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Pressable style={sharedStyles.button} onPress={startAcceptedDuel}>
                <Text style={sharedStyles.buttonText}>{t("duel.startNow")}</Text>
              </Pressable>
            </View>
          )}

          {awaitingOpponentResult && (
            <View style={styles.waitingPanel}>
              <Text style={styles.resultTitle}>{t("duel.waitingResultTitle")}</Text>
              <Text style={styles.noticeText}>{t("duel.waitingResultBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Text style={styles.resultLine}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
            </View>
          )}

          {activeDuel.status === "accepted" && !playerNeedsManualStart && !awaitingOpponentResult && playableDuel && (
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
                    {renderTargets(playableDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, frozenTargetsRef.current, targetTimeOffsetsRef.current, hitBug)}
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
              {activeDuel.winnerId && isDuelParticipant(activeDuel, user) && !(activeDuel.rewardClaimedBy ?? []).includes(user.uid) && (
                <Pressable disabled={busy} style={sharedStyles.button} onPress={claimReward}>
                  <Text style={sharedStyles.buttonText}>{busy ? "..." : activeDuel.winnerId === user.uid ? t("duel.claimReward") : t("duel.claimXp")}</Text>
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
        <Text style={styles.helperHint}>{t("duel.helperHint")}</Text>
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
      {activeDuel?.status === "accepted" && playerNeedsManualStart && (
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
      {activeDuel && (
        <Modal animationType="fade" transparent visible={showWaitingResultModal} onRequestClose={() => setAcknowledgedWaitingDuelIds((current) => new Set([...current, activeDuel.id]))}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.waitingResultTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.waitingResultBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Text style={styles.resultLine}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
              <Pressable style={sharedStyles.button} onPress={() => setAcknowledgedWaitingDuelIds((current) => new Set([...current, activeDuel.id]))}>
                <Text style={sharedStyles.buttonText}>{t("common.ok")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      {activeDuel?.status === "completed" && (
        <Modal animationType="fade" transparent visible={showResultModal} onRequestClose={() => setDismissedResultDuelIds((current) => new Set([...current, activeDuel.id]))}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.resultReadyTitle")}</Text>
              <Text style={styles.startBody}>{resultLabel(activeDuel, user, t)}</Text>
              <Text style={styles.resultLine}>{activeDuel.fromUserName}: {activeDuel.scores?.[activeDuel.fromUserId]?.score ?? 0}</Text>
              <Text style={styles.resultLine}>{activeDuel.toUserName}: {activeDuel.scores?.[activeDuel.toUserId]?.score ?? 0}</Text>
              <Text style={styles.noticeText}>{t("duel.resultReadyBody")}</Text>
              {activeDuel.winnerId && isDuelParticipant(activeDuel, user) && !(activeDuel.rewardClaimedBy ?? []).includes(user.uid) ? (
                <Pressable disabled={busy} style={sharedStyles.button} onPress={claimReward}>
                  <Text style={sharedStyles.buttonText}>{busy ? "..." : activeDuel.winnerId === user.uid ? t("duel.claimReward") : t("duel.claimXp")}</Text>
                </Pressable>
              ) : (
                <Pressable style={sharedStyles.button} onPress={() => setDismissedResultDuelIds((current) => new Set([...current, activeDuel.id]))}>
                  <Text style={sharedStyles.buttonText}>{t("common.ok")}</Text>
                </Pressable>
              )}
              {activeDuel.winnerId && isDuelParticipant(activeDuel, user) && !(activeDuel.rewardClaimedBy ?? []).includes(user.uid) && (
                <Pressable style={sharedStyles.secondaryButton} onPress={() => setDismissedResultDuelIds((current) => new Set([...current, activeDuel.id]))}>
                  <Text style={sharedStyles.secondaryButtonText}>{t("common.ok")}</Text>
                </Pressable>
              )}
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
            <View style={[styles.squadJar, entry && { borderColor: rarityColors[entry.rarity] }]}>
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={squadJarImage} style={styles.squadJarImage} />
              {entry ? (
                <>
                  <View pointerEvents="none" style={styles.squadJarBugWrap}>
                    <BugArtImage bugId={entry.id} size={50} />
                  </View>
                  <Text style={styles.squadJarName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                  {bonus && <Text style={styles.squadJarBonus} numberOfLines={1}>{squadBonusLabel(bonus.category, t)}</Text>}
                </>
              ) : (
                <>
                  <Text style={styles.squadJarEmpty}>+</Text>
                  <Text style={styles.squadJarBonus}>{t("bugdex.squadEmptySlot")}</Text>
                </>
              )}
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
        const readyAt = cooldowns[bonus.bugId];
        const cooldownLeft = readyAt === undefined ? spec.cooldownMs : Math.max(0, readyAt - timestamp);
        const charge = readyAt === undefined ? helperInitialCharge(index) : 1 - Math.min(1, cooldownLeft / spec.cooldownMs);
        return (
          <View key={`${bonus.bugId}:${index}`} style={[styles.helperTower, { borderColor: spec.color }]}>
            <HelperTowerPulse color={spec.color} ready={readyAt !== undefined && cooldownLeft <= 0} />
            <BugArtImage bugId={bonus.bugId} size={38} />
            <View style={styles.helperChargeTrack}>
              <View style={[styles.helperChargeFill, { backgroundColor: spec.color, width: `${Math.round(charge * 100)}%` }]} />
            </View>
            <Text style={[styles.helperTowerText, spec.special && { color: spec.color }]} numberOfLines={1}>{spec.special?.symbol ?? helperKindLabel(spec.kind, t)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function renderHelperImpacts(impacts: HelperImpact[]) {
  if (!impacts.length) return null;
  return (
    <View pointerEvents="none" style={styles.helperImpactLayer}>
      {impacts.map((impact) => <HelperImpactEffect key={impact.id} impact={impact} />)}
    </View>
  );
}

function renderTargets(
  duel: BugSmashDuel,
  timestamp: number,
  caughtBugIds: string[],
  hitCounts: Record<string, number>,
  assist: BugSmashDuelBalance,
  hitFeedbackValues: Map<string, Animated.Value>,
  frozenTargets: Record<string, FrozenTarget>,
  targetTimeOffsets: Record<string, number>,
  onHit: (bugId: string) => void
) {
  return collectRenderedTargets(duel, timestamp, caughtBugIds, assist, frozenTargets, targetTimeOffsets)
    .map(({ bugId, entry, index, motion }) => {
    const frozen = Boolean(frozenTargets[bugId] && timestamp < frozenTargets[bugId].until);
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, index);
    const hits = hitCounts[bugId] ?? 0;
    const feedback = hitFeedbackValues.get(bugId);
    const targetSize = Math.round(46 * assist.hitboxMultiplier * targetHitboxMultiplierForRarity(entry.rarity));
    const bugArtSize = Math.min(46, Math.round(38 * targetHitboxMultiplierForRarity(entry.rarity)));
    return (
      <Pressable
        key={bugId}
        style={[
          styles.target,
          frozen && styles.targetFrozen,
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
        {frozen && (
          <View pointerEvents="none" style={styles.targetFreezeBadge}>
            <Text style={styles.targetFreezeText}>TIME</Text>
          </View>
        )}
        <DuelTargetBugArt bugId={bugId} size={bugArtSize} />
        <View style={styles.hitTrack}>
          <View style={[styles.hitFill, { backgroundColor: rarityColors[entry.rarity], width: `${Math.min(100, (hits / requiredTaps) * 100)}%` }]} />
        </View>
      </Pressable>
    );
  });
}

function collectVisibleTargets(
  duel: BugSmashDuel,
  timestamp: number,
  caughtBugIds: string[],
  assist: BugSmashDuelBalance,
  frozenTargets: Record<string, FrozenTarget> = {},
  targetTimeOffsets: Record<string, number> = {}
): VisibleDuelTarget[] {
  const startAt = duel.startAt ? Date.parse(duel.startAt) : timestamp;
  const elapsed = timestamp - startAt;
  return duel.bugIds.flatMap((bugId, index) => {
    if (caughtBugIds.includes(bugId)) return [];
    const entry = entryByBugId(bugId);
    if (!entry) return [];
    const frozenTarget = frozenTargets[bugId];
    const frozen = Boolean(frozenTarget && timestamp < frozenTarget.until);
    const motion = frozen && frozenTarget
      ? frozenTarget.motion
      : targetMotion(index, duel.seed, elapsed - (targetTimeOffsets[bugId] ?? 0), entry.rarity, assist);
    if (!motion.visible) return [];
    return [{ bugId, entry, frozen, index, motion }];
  });
}

function collectRenderedTargets(
  duel: BugSmashDuel,
  timestamp: number,
  caughtBugIds: string[],
  assist: BugSmashDuelBalance,
  frozenTargets: Record<string, FrozenTarget> = {},
  targetTimeOffsets: Record<string, number> = {}
): VisibleDuelTarget[] {
  return collectVisibleTargets(duel, timestamp, caughtBugIds, assist, frozenTargets, targetTimeOffsets)
    .sort((a, b) => targetPriority(b.entry.rarity, b.motion.progress) - targetPriority(a.entry.rarity, a.motion.progress))
    .slice(0, maxVisibleDuelTargets);
}

function selectHelperTarget(targets: VisibleDuelTarget[], bonus: ReturnType<typeof activeBugSquadBonusList>[number], hitCounts: Record<string, number>, timestamp: number, special?: MythicSpecialSpec) {
  const ranked = [...targets].sort((a, b) => helperTargetScore(b, bonus, hitCounts, timestamp, special) - helperTargetScore(a, bonus, hitCounts, timestamp, special));
  return ranked[0];
}

function helperTargetScore(target: VisibleDuelTarget, bonus: ReturnType<typeof activeBugSquadBonusList>[number], hitCounts: Record<string, number>, timestamp: number, special?: MythicSpecialSpec) {
  const required = baseTapsByRarity[target.entry.rarity];
  const hits = hitCounts[target.bugId] ?? 0;
  const almostCaught = hits >= Math.max(1, required - 1) ? 3 : 0;
  const urgency = target.motion.progress > 0.75 ? 2 : target.motion.progress > 0.55 ? 1 : 0;
  const rarityValue = scoreByRarity[target.entry.rarity] * helperRarityPreference(bonus.category);
  const specialValue = helperSpecialTargetScore(target, required, hits, special);
  const jitter = (stableHash(`${bonus.bugId}:${target.bugId}:${Math.floor(timestamp / 1800)}`) % 100) / 1000;
  return rarityValue + urgency + almostCaught + specialValue + jitter;
}

function helperRarityPreference(category: BugSquadBonusCategory) {
  if (category === "focus_boost" || category === "knowledge_boost" || category === "quest_boost" || category === "radar_rarity") return 1.1;
  if (category === "movement_boost" || category === "streak_protection") return 0.5;
  return 0.75;
}

function targetHitboxMultiplierForRarity(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 1.18;
  if (rarity === "Legendarisch") return 1.14;
  if (rarity === "Episch") return 1.1;
  if (rarity === "Zeldzaam") return 1.05;
  return 1;
}

function helperSpecialTargetScore(target: VisibleDuelTarget, required: number, hits: number, special?: MythicSpecialSpec) {
  if (!special) return 0;
  const targetRank = helperRarityRank(target.entry.rarity);
  const remaining = required - hits;
  if (special.kind === "longneck_scout") return targetRank * 1.1;
  if (special.kind === "bloom_blade") return remaining <= 3 ? 3 : targetRank >= 2 ? 1 : 0;
  if (special.kind === "mirror_guard") return target.motion.progress > 0.7 ? 4 : 0;
  if (special.kind === "lantern_signal") return target.motion.progress > 0.55 ? 1.5 : 0;
  if (special.kind === "pattern_break") return targetRank >= 2 ? 2 : 0;
  if (special.kind === "royal_freeze" || special.kind === "candy_slow") return target.motion.progress > 0.52 ? 1.4 : 0;
  return 0.6;
}

function distanceBetweenTargets(first: VisibleDuelTarget, second: VisibleDuelTarget) {
  const dx = first.motion.x - second.motion.x;
  const dy = first.motion.y - second.motion.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function helperHitsForTarget(bonus: ReturnType<typeof activeBugSquadBonusList>[number], target: VisibleDuelTarget, hitCounts: Record<string, number>, assist: BugSmashDuelBalance, special?: MythicSpecialSpec) {
  const required = requiredTapsForTarget(target.entry.rarity, assist, target.index);
  const remaining = Math.max(1, required - (hitCounts[target.bugId] ?? 0));
  const helperRank = helperRarityRank(bonus.rarity);
  const targetRank = helperRarityRank(target.entry.rarity);
  const kind = helperKindForCategory(bonus.category);
  const baseDamage = helperBaseHitsForRarity(bonus.rarity);
  const resistance = Math.max(0, Math.floor(targetRank / 2));
  const tierAdvantage = helperRank >= targetRank + 2 ? 1 : 0;
  const premiumHelperBonus = helperRank >= 2 && targetRank > 0 && targetRank <= helperRank ? 1 : 0;
  const specialBonus = helperSpecialBonusHits(special, target, remaining);
  const kindBonus = special ? 0 : helperKindBonusHits(kind, target, remaining);
  const damage = Math.max(1, baseDamage - resistance + tierAdvantage + premiumHelperBonus + specialBonus + kindBonus);
  return Math.min(remaining, damage);
}

function helperKindBonusHits(kind: HelperImpactKind, target: VisibleDuelTarget, remaining: number) {
  if (kind === "sticky") return remaining > 1 ? 1 : 0;
  if (kind === "shield") return target.motion.progress > 0.74 ? 2 : target.motion.progress > 0.55 ? 1 : 0;
  return 0;
}

function helperControlMsForKind(kind: HelperImpactKind, rarity: BugDexRarity, progress: number) {
  const rarityBonus = rarity === "Mythisch" ? 260 : rarity === "Legendarisch" ? 210 : rarity === "Episch" ? 150 : rarity === "Zeldzaam" ? 90 : 0;
  if (kind === "sticky") return 360 + rarityBonus;
  if (kind === "shield" && progress > 0.52) return 300 + rarityBonus;
  return 0;
}

function helperSpecialBonusHits(special: MythicSpecialSpec | undefined, target: VisibleDuelTarget, remaining: number) {
  if (!special) return 0;
  const targetRank = helperRarityRank(target.entry.rarity);
  if (special.kind === "bloom_blade") return remaining <= 3 ? 2 : 1;
  if (special.kind === "pattern_break" && targetRank >= 2) return 1;
  if (special.kind === "longneck_scout" && targetRank >= 2) return 1;
  if (special.kind === "mirror_guard" && target.motion.progress > 0.7) return 1;
  return 0;
}

function helperSplashTargetsForSpecial(
  spec: ReturnType<typeof helperSpecForBonus>,
  helperTargets: VisibleDuelTarget[],
  target: VisibleDuelTarget
) {
  const candidates = helperTargets.filter((item) => item.bugId !== target.bugId);
  if (!spec.special) {
    return spec.splashTargets > 0
      ? candidates.filter((item) => distanceBetweenTargets(item, target) <= spec.splashRadius).slice(0, spec.splashTargets)
      : [];
  }
  if (spec.special.kind === "prism_chain") {
    return candidates
      .filter((item) => distanceBetweenTargets(item, target) <= spec.splashRadius + 8)
      .slice(0, 2);
  }
  if (spec.special.kind === "lantern_signal") {
    return candidates
      .sort((a, b) => targetPriority(b.entry.rarity, b.motion.progress) - targetPriority(a.entry.rarity, a.motion.progress))
      .slice(0, 2);
  }
  if (spec.special.kind === "royal_freeze") {
    return candidates.filter((item) => distanceBetweenTargets(item, target) <= 28).slice(0, 2);
  }
  if (spec.special.kind === "candy_slow") {
    return candidates.filter((item) => distanceBetweenTargets(item, target) <= 24).slice(0, 1);
  }
  return [];
}

function helperFreezeTargetsForSpecial(special: MythicSpecialSpec | undefined, target: VisibleDuelTarget, splashTargets: VisibleDuelTarget[]) {
  if (!special?.freezeMs) return [];
  if (special.kind === "mirror_guard") return target.motion.progress > 0.68 ? [target] : [];
  return [target, ...splashTargets];
}

function helperSplashHitsForTarget(bonus: ReturnType<typeof activeBugSquadBonusList>[number], target: VisibleDuelTarget, special?: MythicSpecialSpec) {
  if (special?.kind === "prism_chain" || special?.kind === "lantern_signal") return 1;
  if (special?.kind === "royal_freeze" || special?.kind === "candy_slow") return 0;
  const helperRank = helperRarityRank(bonus.rarity);
  const targetRank = helperRarityRank(target.entry.rarity);
  return helperRank >= 3 && targetRank <= 1 ? 2 : 1;
}

function helperBaseHitsForRarity(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 6;
  if (rarity === "Legendarisch") return 3;
  if (rarity === "Episch") return 3;
  if (rarity === "Zeldzaam") return 2;
  return 1;
}

function helperCooldownMsForRarity(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 4600;
  if (rarity === "Legendarisch") return 5100;
  if (rarity === "Episch") return 6500;
  if (rarity === "Zeldzaam") return 7800;
  return 9000;
}

function helperInitialCooldownMs(cooldownMs: number, helperIndex: number) {
  return Math.round(cooldownMs * Math.max(0.34, 0.62 - helperIndex * 0.12));
}

function helperInitialCharge(helperIndex: number) {
  return Math.min(0.56, Math.max(0.32, 0.38 + helperIndex * 0.08));
}

function helperMaxTargetProgress(bonus: ReturnType<typeof activeBugSquadBonusList>[number]) {
  return helperKindForCategory(bonus.category) === "shield" ? 0.94 : 0.88;
}

function helperRarityRank(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 4;
  if (rarity === "Legendarisch") return 3;
  if (rarity === "Episch") return 2;
  if (rarity === "Zeldzaam") return 1;
  return 0;
}

function helperSpecForBonus(bonus: ReturnType<typeof activeBugSquadBonusList>[number]) {
  const rarityBoost = bonus.rarity === "Mythisch" ? 4 : bonus.rarity === "Legendarisch" ? 3 : bonus.rarity === "Episch" ? 2 : bonus.rarity === "Zeldzaam" ? 1 : 0;
  const kind = helperKindForCategory(bonus.category);
  const special = mythicSpecialForBug(bonus.bugId);
  return {
    color: special?.color ?? helperColorForKind(kind),
    cooldownMs: helperCooldownMsForRarity(bonus.rarity),
    kind,
    splashRadius: kind === "splash" ? 16 + rarityBoost * 4 : 0,
    splashTargets: kind === "splash" && rarityBoost >= 2 ? Math.min(3, rarityBoost - 1) : 0,
    special
  };
}

function mythicSpecialForBug(bugId: string): MythicSpecialSpec | undefined {
  return mythicSpecials[bugId];
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

function helperImpactLabel(kind: HelperImpactKind, hits: number, t: (key: string) => string, special?: MythicSpecialSpec) {
  const label = special?.label ?? helperKindLabel(kind, t);
  return hits > 1 ? `${label} x${hits}` : label;
}

function helperImpactSymbol(kind: HelperImpactKind) {
  if (kind === "zap") return "ZAP";
  if (kind === "sticky") return "STK";
  if (kind === "shield") return "SH";
  if (kind === "splash") return "AOE";
  return "HIT";
}

type DuelEffectSpriteKey = keyof typeof duelEffectSprites;

function helperSpriteKeyForImpact(impact: HelperImpact): DuelEffectSpriteKey {
  if (impact.special === "royal_freeze" || impact.special === "candy_slow") return "freeze";
  if (impact.special === "bloom_blade") return "slash";
  if (impact.special === "mirror_guard") return "shield";
  if (impact.special === "pattern_break") return "goo";
  if (impact.special === "prism_chain" || impact.special === "lantern_signal" || impact.special === "longneck_scout") return "lightning";
  if (impact.kind === "zap") return "lightning";
  if (impact.kind === "sticky") return "goo";
  if (impact.kind === "shield") return "shield";
  if (impact.kind === "splash") return "fireball";
  return "fireball";
}

function helperProjectileStepsForSprite(sprite: DuelEffectSpriteKey) {
  if (sprite === "shield" || sprite === "freeze") return [0.86];
  if (sprite === "slash") return [0.58, 0.82];
  if (sprite === "goo") return [0.34, 0.62, 0.84];
  return [0.28, 0.54, 0.8];
}

function helperProjectileCurve(sprite: DuelEffectSpriteKey, step: number, index: number) {
  if (sprite === "slash" || sprite === "lightning") return 0;
  if (sprite === "shield" || sprite === "freeze") return -2;
  return Math.sin(step * Math.PI) * (index % 2 === 0 ? -3.2 : 3.2);
}

function helperProjectileSize(sprite: DuelEffectSpriteKey) {
  if (sprite === "slash") return 58;
  if (sprite === "lightning") return 52;
  if (sprite === "shield" || sprite === "freeze") return 46;
  if (sprite === "goo") return 42;
  return 48;
}

function helperImpactSpriteSize(sprite: DuelEffectSpriteKey) {
  if (sprite === "freeze") return 112;
  if (sprite === "slash") return 108;
  if (sprite === "shield") return 98;
  if (sprite === "lightning") return 96;
  if (sprite === "goo") return 82;
  return 92;
}

function helperTowerSourcePosition(index: number, count: number) {
  const spacing = 13;
  const start = 50 - ((count - 1) * spacing) / 2;
  return { x: start + index * spacing, y: 91 };
}

function helperAnimationStyleForIndex(index: number): HelperAnimationStyle {
  return index % 3 === 0 ? "orb" : index % 3 === 1 ? "slash" : "pulse";
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
    Animated.timing(pulse, { duration: 680, toValue: 1, useNativeDriver: true }).start();
  }, [pulse]);

  const angle = Math.atan2(impact.y - impact.sourceY, impact.x - impact.sourceX) * 180 / Math.PI;
  const spriteKey = helperSpriteKeyForImpact(impact);
  const spriteSource = duelEffectSprites[spriteKey];
  const projectileSteps = helperProjectileStepsForSprite(spriteKey);
  const projectileSize = helperProjectileSize(spriteKey);
  const impactSize = helperImpactSpriteSize(spriteKey);
  const rotatesWithPath = spriteKey === "fireball" || spriteKey === "lightning" || spriteKey === "slash";
  const mythicRingSteps = impact.special ? [0, 1, 2] : [];
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.helperMuzzleFlash,
          impact.animationStyle === "slash" && styles.helperMuzzleFlashSlash,
          impact.animationStyle === "pulse" && styles.helperMuzzleFlashPulse,
          {
            backgroundColor: impact.animationStyle === "pulse" ? "transparent" : impact.color,
            borderColor: impact.color,
            left: `${impact.sourceX}%`,
            opacity: pulse.interpolate({ inputRange: [0, 0.18, 0.52, 1], outputRange: [0, 0.95, 0.38, 0] }),
            top: `${impact.sourceY}%`,
            transform: [
              { rotate: `${angle}deg` },
              { scale: pulse.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.55, 1.55, 0.7] }) }
            ]
          }
        ]}
      />
      {projectileSteps.map((step, index) => {
        const curve = helperProjectileCurve(spriteKey, step, index);
        return (
          <Animated.Image
            key={`${impact.id}:projectile:${index}`}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={spriteSource}
            style={[
              styles.helperProjectileSprite,
              {
                height: projectileSize,
                left: `${impact.sourceX + (impact.x - impact.sourceX) * step}%`,
                marginLeft: -projectileSize / 2,
                marginTop: -projectileSize / 2,
                opacity: pulse.interpolate({ inputRange: [0, 0.1 + index * 0.08, 0.74, 1], outputRange: [0, 0.85, 0.36, 0] }),
                top: `${impact.sourceY + (impact.y - impact.sourceY) * step + curve}%`,
                transform: [
                  { rotate: rotatesWithPath ? `${angle}deg` : "0deg" },
                  { scale: pulse.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0.42, 1.12, 0.55] }) }
                ],
                width: projectileSize
              }
            ]}
          />
        );
      })}
      {impact.animationStyle === "pulse" && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.helperSourcePulse,
            {
              borderColor: impact.color,
              left: `${impact.sourceX}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.75, 0] }),
              top: `${impact.sourceY}%`,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 2.4] }) }]
            }
          ]}
        />
      )}
      <Animated.Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={spriteSource}
        style={[
          styles.helperImpactSprite,
            {
              height: impactSize,
              left: `${impact.x}%`,
              marginLeft: -impactSize / 2,
              marginTop: -impactSize / 2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] }),
              top: `${impact.y}%`,
            transform: [
              { rotate: rotatesWithPath ? `${angle}deg` : "0deg" },
              { scale: pulse.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.55, 1.18, 1.85] }) }
            ],
            width: impactSize
          }
        ]}
      />
      {mythicRingSteps.map((ring) => (
        <Animated.View
          key={`${impact.id}:mythic:${ring}`}
          pointerEvents="none"
          style={[
            styles.helperMythicAura,
            ring === 1 && styles.helperMythicAuraAlt,
            ring === 2 && styles.helperMythicAuraSpark,
            {
              borderColor: impact.color,
              left: `${impact.x}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.12 + ring * 0.08, 0.86, 1], outputRange: [0, 0.75, 0.22, 0] }),
              top: `${impact.y}%`,
              transform: [
                { rotate: `${angle + ring * 28}deg` },
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45 + ring * 0.12, 2.25 + ring * 0.32] }) }
              ]
            }
          ]}
        />
      ))}
      {impact.special && (
        <MythicSpecialEffect
          angle={angle}
          impact={impact}
          pulse={pulse}
          spriteSource={spriteSource}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.helperImpactLabel,
          {
            borderColor: impact.color,
            left: `${impact.x}%`,
            opacity: pulse.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 1, 1, 0] }),
            top: `${Math.max(4, impact.y - 9)}%`,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.85, 1, 0.95] }) }]
          }
        ]}
      >
        <Text style={[styles.helperImpactLabelText, { color: impact.color }]}>{impact.label}</Text>
      </Animated.View>
      {impact.splashPoints.map((point) => (
        <Animated.Image
          key={`${impact.id}:splash:${point.id}`}
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={spriteSource}
          style={[
            styles.helperSplashSprite,
            {
              height: Math.round(impactSize * 0.58),
              left: `${point.x}%`,
              marginLeft: -Math.round(impactSize * 0.58) / 2,
              marginTop: -Math.round(impactSize * 0.58) / 2,
              opacity: pulse.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.8, 0] }),
              top: `${point.y}%`,
              transform: [
                { rotate: rotatesWithPath ? `${angle}deg` : "0deg" },
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.42] }) }
              ],
              width: Math.round(impactSize * 0.58)
            }
          ]}
        />
      ))}
      {[0, 1, 2].map((spark) => (
        <Animated.View
          key={`${impact.id}:spark:${spark}`}
          pointerEvents="none"
          style={[
            styles.helperImpactSpark,
            {
              backgroundColor: impact.color,
              left: `${impact.x + (spark - 1) * 3}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.18, 0.72, 1], outputRange: [0, 0.9, 0.45, 0] }),
              top: `${impact.y + (spark === 1 ? -4 : 3)}%`,
              transform: [
                { rotate: `${angle + spark * 42}deg` },
                { scale: pulse.interpolate({ inputRange: [0, 0.24, 1], outputRange: [0.4, 1.2, 0.45] }) }
              ]
            }
          ]}
        />
      ))}
    </>
  );
}

function MythicSpecialEffect({
  angle,
  impact,
  pulse,
  spriteSource
}: {
  angle: number;
  impact: HelperImpact;
  pulse: Animated.Value;
  spriteSource: ReturnType<typeof require>;
}) {
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.16, 0.82, 1], outputRange: [0, 0.82, 0.34, 0] });
  const burstScale = pulse.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.35, 1, 2.05] });
  const scanTranslate = pulse.interpolate({ inputRange: [0, 1], outputRange: [-22, 22] });

  if (impact.special === "royal_freeze") {
    return (
      <>
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={duelEffectSprites.freeze}
          style={[styles.mythicFreezeCrown, { left: `${impact.x}%`, opacity: pulseOpacity, top: `${impact.y}%`, transform: [{ rotate: `${angle - 18}deg` }, { scale: burstScale }] }]}
        />
        {[0, 1, 2, 3, 4, 5].map((shard) => (
          <Animated.View
            key={`${impact.id}:freeze-shard:${shard}`}
            pointerEvents="none"
            style={[
              styles.mythicIceShard,
              {
                backgroundColor: shard % 2 === 0 ? "#dbeafe" : "#60a5fa",
                left: `${impact.x + Math.cos(shard) * 7}%`,
                opacity: pulseOpacity,
                top: `${impact.y + Math.sin(shard) * 6}%`,
                transform: [{ rotate: `${shard * 34}deg` }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "prism_chain") {
    return (
      <>
        {impact.splashPoints.map((point, index) => {
          const chainAngle = Math.atan2(point.y - impact.y, point.x - impact.x) * 180 / Math.PI;
          return (
            <Animated.Image
              key={`${impact.id}:prism-chain:${point.id}`}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={duelEffectSprites.lightning}
              style={[
                styles.mythicChainBolt,
                {
                  left: `${impact.x + (point.x - impact.x) * 0.5}%`,
                  opacity: pulse.interpolate({ inputRange: [0, 0.2 + index * 0.08, 0.82, 1], outputRange: [0, 0.92, 0.42, 0] }),
                  top: `${impact.y + (point.y - impact.y) * 0.5}%`,
                  transform: [{ rotate: `${chainAngle}deg` }, { scale: pulse.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.55, 1.15, 0.72] }) }]
                }
              ]}
            />
          );
        })}
        {[0, 1, 2].map((ring) => (
          <Animated.View
            key={`${impact.id}:prism-ring:${ring}`}
            pointerEvents="none"
            style={[
              styles.mythicPrismRing,
              {
                borderColor: ring === 0 ? "#22d3ee" : ring === 1 ? "#f472b6" : "#facc15",
                left: `${impact.x}%`,
                opacity: pulseOpacity,
                top: `${impact.y}%`,
                transform: [{ rotate: `${ring * 38}deg` }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38 + ring * 0.12, 1.85 + ring * 0.22] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "pattern_break") {
    return (
      <>
        {[0, 1, 2, 3, 4].map((tile) => (
          <Animated.View
            key={`${impact.id}:pattern-tile:${tile}`}
            pointerEvents="none"
            style={[
              styles.mythicPatternTile,
              {
                backgroundColor: ["#22c55e", "#f472b6", "#38bdf8", "#facc15", "#ffffff"][tile],
                left: `${impact.x + (tile - 2) * 4}%`,
                opacity: pulseOpacity,
                top: `${impact.y + (tile % 2 === 0 ? -5 : 5)}%`,
                transform: [{ rotate: `${tile * 31 + 12}deg` }, { scale: pulse.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.3, 1.1, 0.62] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "candy_slow") {
    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mythicCandySlowRing,
            {
              borderColor: "#f9a8d4",
              left: `${impact.x}%`,
              opacity: pulseOpacity,
              top: `${impact.y}%`,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 2.15] }) }]
            }
          ]}
        />
        {[0, 1, 2, 3].map((dot) => (
          <Animated.View
            key={`${impact.id}:candy-dot:${dot}`}
            pointerEvents="none"
            style={[
              styles.mythicCandyDot,
              {
                backgroundColor: dot % 2 === 0 ? "#f472b6" : "#fde68a",
                left: `${impact.x + Math.cos(dot * 1.7) * 8}%`,
                opacity: pulseOpacity,
                top: `${impact.y + Math.sin(dot * 1.7) * 7}%`,
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.35, 1.05, 0.55] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "longneck_scout") {
    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mythicScoutReticle,
            {
              borderColor: "#facc15",
              left: `${impact.x}%`,
              opacity: pulseOpacity,
              top: `${impact.y}%`,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.8] }) }]
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mythicScoutScanLine,
            {
              backgroundColor: "#facc15",
              left: `${impact.x}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.18, 0.84, 1], outputRange: [0, 0.9, 0.5, 0] }),
              top: `${impact.y}%`,
              transform: [{ translateY: scanTranslate }, { rotate: `${angle}deg` }]
            }
          ]}
        />
      </>
    );
  }

  if (impact.special === "bloom_blade") {
    return (
      <>
        {[0, 1, 2].map((slash) => (
          <Animated.Image
            key={`${impact.id}:bloom-slash:${slash}`}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={duelEffectSprites.slash}
            style={[
              styles.mythicBloomSlash,
              {
                left: `${impact.x + (slash - 1) * 3}%`,
                opacity: pulseOpacity,
                top: `${impact.y + (slash - 1) * 2}%`,
                transform: [{ rotate: `${angle + slash * 24 - 24}deg` }, { scale: pulse.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.45, 1.02, 1.45] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "lantern_signal") {
    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mythicLanternBeam,
            {
              backgroundColor: "#fde047",
              left: `${impact.x}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.58, 0.28, 0] }),
              top: `${impact.y}%`,
              transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.15, 1, 1.45] }) }]
            }
          ]}
        />
        {[0, 1, 2].map((signal) => (
          <Animated.View
            key={`${impact.id}:lantern-signal:${signal}`}
            pointerEvents="none"
            style={[
              styles.mythicLanternSignal,
              {
                borderColor: signal === 1 ? "#ffffff" : "#fde047",
                left: `${impact.x}%`,
                opacity: pulseOpacity,
                top: `${impact.y}%`,
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42 + signal * 0.12, 1.65 + signal * 0.32] }) }]
              }
            ]}
          />
        ))}
      </>
    );
  }

  if (impact.special === "mirror_guard") {
    return (
      <>
        <Animated.Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={duelEffectSprites.shield}
          style={[
            styles.mythicMirrorShield,
            {
              left: `${impact.x}%`,
              opacity: pulseOpacity,
              top: `${impact.y}%`,
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.5, 1.08, 1.65] }) }]
            }
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.mythicMirrorSweep,
            {
              left: `${impact.x}%`,
              opacity: pulse.interpolate({ inputRange: [0, 0.2, 0.62, 1], outputRange: [0, 0.85, 0.22, 0] }),
              top: `${impact.y}%`,
              transform: [{ translateY: scanTranslate }, { rotate: `${angle + 90}deg` }]
            }
          ]}
        />
      </>
    );
  }

  return (
    <Animated.Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={spriteSource}
      style={[styles.mythicFallbackSprite, { left: `${impact.x}%`, opacity: pulseOpacity, top: `${impact.y}%`, transform: [{ rotate: `${angle}deg` }, { scale: burstScale }] }]}
    />
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

function requiredTapsForTarget(rarity: BugDexRarity, assist: BugSmashDuelBalance, targetIndex: number, multiplier = 1) {
  const focusReduction = targetIndex >= 0 && targetIndex < assist.focusEasyHits ? 1 : 0;
  return Math.max(1, Math.ceil((baseTapsByRarity[rarity] - focusReduction) * multiplier));
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

function isDuelParticipant(duel: BugSmashDuel, user: User) {
  return duel.fromUserId === user.uid || duel.toUserId === user.uid;
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
    overflow: "hidden",
    position: "relative"
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
  duelModePanel: {
    marginTop: 0
  },
  helperImpactLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8
  },
  helperImpactLabel: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    marginLeft: -31,
    minWidth: 62,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    zIndex: 10
  },
  helperImpactLabelText: {
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
    textAlign: "center"
  },
  helperImpactSpark: {
    borderRadius: 999,
    height: 4,
    marginLeft: -2,
    marginTop: -2,
    position: "absolute",
    width: 18,
    zIndex: 10
  },
  helperImpactSprite: {
    position: "absolute",
    zIndex: 9
  },
  helperProjectileSprite: {
    position: "absolute",
    zIndex: 8
  },
  helperSplashSprite: {
    position: "absolute",
    zIndex: 8
  },
  helperImpactOrb: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderStyle: "dotted",
    borderWidth: 3
  },
  helperImpactPulse: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 4,
    height: 62,
    marginLeft: -31,
    marginTop: -31,
    width: 62
  },
  helperImpactShield: {
    backgroundColor: "rgba(56,189,248,0.12)",
    borderRadius: 10,
    borderWidth: 3,
    height: 54,
    marginLeft: -27,
    marginTop: -27,
    width: 54
  },
  helperImpactSplash: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 3,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    width: 58
  },
  helperImpactSlash: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    width: 38
  },
  helperImpactSymbol: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
    textShadowColor: "rgba(16,32,24,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  helperMythicAura: {
    borderRadius: 14,
    borderWidth: 2,
    height: 56,
    marginLeft: -28,
    marginTop: -28,
    position: "absolute",
    width: 56,
    zIndex: 7
  },
  helperMythicAuraAlt: {
    borderRadius: 999,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    width: 64
  },
  helperMythicAuraSpark: {
    borderRadius: 4,
    borderWidth: 3,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    width: 82
  },
  mythicBloomSlash: {
    height: 118,
    marginLeft: -59,
    marginTop: -59,
    position: "absolute",
    width: 118,
    zIndex: 11
  },
  mythicCandyDot: {
    borderRadius: 999,
    height: 9,
    marginLeft: -4,
    marginTop: -4,
    position: "absolute",
    width: 9,
    zIndex: 11
  },
  mythicCandySlowRing: {
    backgroundColor: "rgba(244,114,182,0.12)",
    borderRadius: 999,
    borderWidth: 3,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    position: "absolute",
    width: 58,
    zIndex: 10
  },
  mythicChainBolt: {
    height: 92,
    marginLeft: -46,
    marginTop: -46,
    position: "absolute",
    width: 92,
    zIndex: 10
  },
  mythicFallbackSprite: {
    height: 112,
    marginLeft: -56,
    marginTop: -56,
    position: "absolute",
    width: 112,
    zIndex: 10
  },
  mythicFreezeCrown: {
    height: 132,
    marginLeft: -66,
    marginTop: -66,
    position: "absolute",
    width: 132,
    zIndex: 10
  },
  mythicIceShard: {
    borderRadius: 2,
    height: 18,
    marginLeft: -3,
    marginTop: -9,
    position: "absolute",
    width: 6,
    zIndex: 11
  },
  mythicLanternBeam: {
    borderRadius: 999,
    height: 150,
    marginLeft: -13,
    marginTop: -75,
    position: "absolute",
    width: 26,
    zIndex: 9
  },
  mythicLanternSignal: {
    backgroundColor: "rgba(253,224,71,0.1)",
    borderRadius: 999,
    borderWidth: 2,
    height: 54,
    marginLeft: -27,
    marginTop: -27,
    position: "absolute",
    width: 54,
    zIndex: 10
  },
  mythicMirrorShield: {
    height: 118,
    marginLeft: -59,
    marginTop: -59,
    position: "absolute",
    width: 118,
    zIndex: 10
  },
  mythicMirrorSweep: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    height: 5,
    marginLeft: -34,
    marginTop: -2,
    position: "absolute",
    width: 68,
    zIndex: 12
  },
  mythicPatternTile: {
    borderColor: "rgba(16,32,24,0.26)",
    borderRadius: 3,
    borderWidth: 1,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    position: "absolute",
    width: 16,
    zIndex: 11
  },
  mythicPrismRing: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 2,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    position: "absolute",
    width: 50,
    zIndex: 10
  },
  mythicScoutReticle: {
    backgroundColor: "rgba(250,204,21,0.08)",
    borderRadius: 999,
    borderWidth: 2,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    position: "absolute",
    width: 64,
    zIndex: 10
  },
  mythicScoutScanLine: {
    borderRadius: 999,
    height: 4,
    marginLeft: -34,
    marginTop: -2,
    position: "absolute",
    width: 68,
    zIndex: 11
  },
  helperHint: {
    color: "#7a5f18",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8
  },
  helperMuzzleFlash: {
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    position: "absolute",
    width: 28,
    zIndex: 8
  },
  helperMuzzleFlashPulse: {
    borderWidth: 2,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    width: 26
  },
  helperMuzzleFlashSlash: {
    borderRadius: 2,
    height: 8,
    marginLeft: -15,
    marginTop: -4,
    width: 30
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
  helperSlashStreak: {
    borderRadius: 999,
    height: 7,
    marginLeft: -18,
    marginTop: -4,
    position: "absolute",
    width: 36,
    zIndex: 7
  },
  helperSourcePulse: {
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    position: "absolute",
    width: 34,
    zIndex: 6
  },
  helperSplashEcho: {
    borderRadius: 999,
    borderWidth: 2,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    position: "absolute",
    width: 34,
    zIndex: 8
  },
  helperTrailDot: {
    borderRadius: 999,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    position: "absolute",
    width: 10,
    zIndex: 7
  },
  helperTrailDotLarge: {
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    width: 14
  },
  helperWaveDot: {
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    position: "absolute",
    width: 20,
    zIndex: 7
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
  modeBadge: {
    backgroundColor: "#102018",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  modeEyebrow: {
    color: "#15724f",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 2
  },
  modeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 10
  },
  modeHeaderText: {
    flex: 1,
    minWidth: 0
  },
  modeStack: {
    gap: 12,
    marginTop: 12
  },
  modeTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  trainingBody: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  trainingButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderRadius: 8,
    elevation: 3,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8
  },
  trainingButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }]
  },
  trainingButtonText: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  trainingContent: {
    gap: 12,
    padding: 12
  },
  trainingCopy: {
    minWidth: 0
  },
  trainingImage: {
    height: 118,
    width: "100%"
  },
  trainingPanel: {
    backgroundColor: "#0f241d",
    borderColor: "rgba(215,189,87,0.8)",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  trainingBadge: {
    backgroundColor: "rgba(215,189,87,0.18)",
    borderColor: "rgba(215,189,87,0.65)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#f8e6a4",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
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
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    flex: 1
  },
  trainingTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 5
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
  soloCampaignBody: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  soloCampaignButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    justifyContent: "center",
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  soloCampaignButtonText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  soloCampaignContent: {
    gap: 10
  },
  soloCampaignCopy: {
    padding: 12
  },
  soloCampaignImage: {
    height: 124,
    width: "100%"
  },
  soloCampaignMeta: {
    backgroundColor: "rgba(56,189,248,0.14)",
    borderColor: "rgba(56,189,248,0.5)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#e0f2fe",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  soloCampaignMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9
  },
  soloTargetBoard: {
    backgroundColor: "rgba(3,14,18,0.34)",
    borderColor: "rgba(125,211,252,0.28)",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 8
  },
  soloTargetBoardTitle: {
    color: "#bae6fd",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  soloTargetChip: {
    alignItems: "center",
    backgroundColor: "rgba(15,118,110,0.22)",
    borderColor: "rgba(94,234,212,0.3)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 48,
    paddingHorizontal: 5,
    paddingVertical: 6
  },
  soloTargetGrid: {
    flexDirection: "row",
    gap: 6
  },
  soloTargetLevel: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900"
  },
  soloTargetValue: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1
  },
  soloCampaignPanel: {
    backgroundColor: "#0f241d",
    borderColor: "#38bdf8",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  soloCampaignBadge: {
    backgroundColor: "rgba(56,189,248,0.14)",
    borderColor: "rgba(56,189,248,0.5)",
    borderRadius: 999,
    borderWidth: 1,
    color: "#e0f2fe",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  soloCampaignTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    flex: 1
  },
  soloCampaignTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 5
  },
  soloBombFlash: {
    alignItems: "center",
    backgroundColor: "rgba(14,165,233,0.22)",
    borderColor: "rgba(125,211,252,0.9)",
    borderRadius: 8,
    borderWidth: 2,
    bottom: 30,
    justifyContent: "center",
    left: 30,
    position: "absolute",
    right: 30,
    top: 30,
    zIndex: 12
  },
  soloBombFlashImage: {
    borderRadius: 8,
    height: 116,
    width: 116
  },
  soloBombFlashText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  soloPowerupCopy: {
    flex: 1,
    minWidth: 0
  },
  soloPowerupDisabled: {
    opacity: 0.45
  },
  soloPowerupHud: {
    alignItems: "center",
    backgroundColor: "#132820",
    borderBottomColor: "rgba(215,189,87,0.35)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  soloPowerupHudButton: {
    alignItems: "center",
    backgroundColor: "rgba(56,189,248,0.16)",
    borderColor: "rgba(56,189,248,0.5)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  soloPowerupHudImage: {
    borderRadius: 6,
    height: 26,
    width: 26
  },
  soloPowerupHudItem: {
    alignItems: "center",
    backgroundColor: "rgba(215,189,87,0.13)",
    borderColor: "rgba(215,189,87,0.45)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  soloPowerupHudText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  soloPowerupImage: {
    borderRadius: 8,
    height: 46,
    width: 46
  },
  soloPowerupItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 8
  },
  soloPowerupMeta: {
    color: "#bcd5cf",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2
  },
  soloPowerupName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  soloPowerupPanel: {
    gap: 7,
    marginTop: 10
  },
  soloPowerupUseButton: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  soloPowerupUseText: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900"
  },
  soloRewardCard: {
    alignItems: "center",
    backgroundColor: "rgba(215,189,87,0.15)",
    borderColor: "rgba(215,189,87,0.55)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 9
  },
  soloRewardImage: {
    borderRadius: 8,
    height: 42,
    width: 42
  },
  soloRewardInline: {
    color: "#f8e6a4",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8
  },
  soloRewardText: {
    color: "#ffffff",
    flex: 1,
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
    backgroundColor: "rgba(232,246,239,0.54)",
    borderColor: "rgba(16,32,24,0.12)",
    borderRadius: 8,
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    overflow: "hidden",
    padding: 6
  },
  squadJarBugWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#102018",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    zIndex: 3
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
    textAlign: "center",
    zIndex: 4
  },
  squadJarEmpty: {
    color: "#6f7f5f",
    fontSize: 28,
    fontWeight: "900",
    zIndex: 4
  },
  squadJarGlow: {
    backgroundColor: "rgba(215,189,87,0.15)",
    borderRadius: 999,
    bottom: 12,
    height: 54,
    position: "absolute",
    width: 58,
    zIndex: 1
  },
  squadJarImage: {
    bottom: -5,
    left: -8,
    opacity: 0.95,
    position: "absolute",
    right: -8,
    top: -4,
    zIndex: 0
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
    width: "100%",
    zIndex: 4
  },
  squadJarShine: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    height: 42,
    left: 8,
    position: "absolute",
    top: 8,
    width: 10,
    zIndex: 2
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
  targetFreezeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(96,165,250,0.88)",
    borderRadius: 999,
    left: -8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: "absolute",
    top: -9,
    zIndex: 4
  },
  targetFreezeText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "900"
  },
  targetFrozen: {
    backgroundColor: "rgba(239,246,255,0.98)",
    shadowColor: "#60a5fa",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8
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
