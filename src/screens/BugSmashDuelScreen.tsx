import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugSwatterHit, playBugSwatterFeedback } from "../components/BugSwatterHit";
import { BugDexDropResult, grantBugDexReward, listBugDexInventory } from "../services/bugDexService";
import { activeBugSquadBonusList, BugSquadAttackKind, bugSquadAttackKindForCategory, BugSquadBonusCategory, maxActiveBugSquadSize, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { bugSmashDuelBalanceForUser, BugSmashDuelBalance } from "../services/bugSquadGameBalance";
import {
  bugSmashDuelBugCount,
  bugSmashDuelDurationMs,
  bugSmashDuelStartDelayMs,
  acknowledgeBugSmashDuelResult,
  cancelBugSmashDuel,
  claimBugSmashDuelReward,
  createBugSmashDuel,
  listBugSmashDuels,
  respondBugSmashDuel,
  submitBugSmashDuelScore,
  subscribeBugSmashDuel
} from "../services/bugSmashDuelService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { dismissPresentedNotificationsForTarget } from "../services/notificationService";
import { presenceLabel } from "../services/presenceService";
import { BugDexRarity, bugDexEntries } from "../services/pointsService";
import { entryByBugId } from "../services/bugDexService";
import { playBugSound } from "../services/soundService";
import { soloCampaignConfig, soloCampaignBugIds, soloCampaignMaxLevel, soloCampaignMaxWave, type SoloCampaignConfig } from "../services/soloCampaignBalance";
import { loadSoloCampaignProgress, saveSoloCampaignProgress } from "../services/soloCampaignProgressService";
import { claimSoloCampaignBossDailyReward } from "../services/soloCampaignRewardService";
import { activateSoloLampFocus, consumeSoloBugBomb, emptySoloPowerupInventory, grantSoloBossReward, loadSoloPowerupInventory, soloLampFocusActive, soloLampFocusRemainingMinutes, type SoloPowerupInventory } from "../services/soloPowerupService";
import { listUsers, updateUserBugSquad } from "../services/userService";
import { BugDexInventoryItem, BugSmashDuel, BugSmashDuelScore, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  initialDuelId?: string;
  initialOpponent?: User | null;
  onBack: () => void;
  onDuelAccepted?: (requesterId: string, duelId: string) => Promise<void>;
  onDuelRequest?: (recipientId: string, duelId: string) => Promise<void>;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

const duelHeroImage = require("../../assets/generated/bug-smash-duel-concept.jpg");
const squadJarImage = require("../../assets/generated/bug-squad-empty-jar-hd.png");
const trainingModeImage = require("../../assets/generated/arena-training-mode-hd.jpg");
const soloCampaignImage = require("../../assets/generated/solo-duel-campaign-hd.jpg");
const soloPowerupLampImage = require("../../assets/generated/solo-powerup-lamp-hd.jpg");
const soloPowerupBombImage = require("../../assets/generated/solo-powerup-bomb-hd.jpg");
const soloBossImages = {
  1: require("../../assets/generated/solo-boss-stag-hd.png"),
  2: require("../../assets/generated/solo-boss-mantis-hd.png"),
  3: require("../../assets/generated/solo-boss-scarab-hd.png"),
  4: require("../../assets/generated/solo-boss-hornet-hd.png"),
  5: require("../../assets/generated/solo-boss-atlas-hd.png")
};
const soloCampaignStartingLives = 3;
const duelRetryScoreThreshold = 30;
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
const duelTargetFinalSpawnBufferMs = 650;
const maxVisibleDuelTargets = 10;
const soloBugBombHitCount = 2;
const soloBugBombMaxTargets = 4;
const soloLampFocusPulseCooldownMs = 4600;
const soloLampFocusTapMultiplier = 0.85;

type HelperImpactKind = BugSquadAttackKind;
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

type ArenaMode = "duel" | "solo" | "training";

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
    freezeMs: 1150,
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
    freezeMs: 900,
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
    freezeMs: 760,
    kind: "mirror_guard",
    label: "Mirror Guard",
    symbol: "MIR"
  }
};

function acknowledgedWaitingDuelStorageKey(uid: string): string {
  return `bugbaas:acknowledged-waiting-duels:${uid}`;
}

function pendingDuelScoresStorageKey(uid: string): string {
  return `bugbaas:pending-duel-scores:${uid}`;
}

async function loadAcknowledgedWaitingDuelIds(uid: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(acknowledgedWaitingDuelStorageKey(uid));
  if (!raw) return new Set();
  const parsed = JSON.parse(raw);
  return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
}

async function saveAcknowledgedWaitingDuelId(uid: string, duelId: string): Promise<void> {
  const current = await loadAcknowledgedWaitingDuelIds(uid);
  if (current.has(duelId)) return;
  await AsyncStorage.setItem(acknowledgedWaitingDuelStorageKey(uid), JSON.stringify([...current, duelId]));
}

async function loadPendingDuelScores(uid: string): Promise<Record<string, BugSmashDuelScore>> {
  const raw = await AsyncStorage.getItem(pendingDuelScoresStorageKey(uid));
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter((item): item is [string, BugSmashDuelScore] => {
    const score = item[1] as Partial<BugSmashDuelScore> | undefined;
    return typeof item[0] === "string"
      && typeof score?.score === "number"
      && Array.isArray(score.caughtBugIds)
      && score.caughtBugIds.every((bugId) => typeof bugId === "string")
      && typeof score.bonusScore === "number"
      && typeof score.submittedAt === "string";
  }));
}

async function savePendingDuelScore(uid: string, duelId: string, score: BugSmashDuelScore): Promise<void> {
  const current = await loadPendingDuelScores(uid);
  await AsyncStorage.setItem(pendingDuelScoresStorageKey(uid), JSON.stringify({ ...current, [duelId]: score }));
}

async function removePendingDuelScore(uid: string, duelId: string): Promise<void> {
  const current = await loadPendingDuelScores(uid);
  delete current[duelId];
  await AsyncStorage.setItem(pendingDuelScoresStorageKey(uid), JSON.stringify(current));
}

export function BugSmashDuelScreen({ user, initialDuelId = "", initialOpponent, onBack, onDuelAccepted, onDuelRequest, onFullscreenChange, onRewardDrop, onUserUpdated }: Props) {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [activeDuelId, setActiveDuelId] = useState(initialDuelId);
  const [activeDuel, setActiveDuel] = useState<BugSmashDuel | null>(null);
  const [trainingDuel, setTrainingDuel] = useState<BugSmashDuel | null>(null);
  const [soloRun, setSoloRun] = useState<SoloRun | null>(null);
  const [soloWaveCleared, setSoloWaveCleared] = useState(false);
  const [runSubmitted, setRunSubmitted] = useState(false);
  const [arenaMode, setArenaMode] = useState<ArenaMode>("duel");
  const [activeSquadIds, setActiveSquadIds] = useState<string[]>(sanitizeActiveBugSquad(user.activeBugSquad));
  const [selectedOpponentId, setSelectedOpponentId] = useState(initialOpponent?.uid ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [challengeNotice, setChallengeNotice] = useState("");
  const [soloPowerups, setSoloPowerups] = useState<SoloPowerupInventory>(emptySoloPowerupInventory);
  const [soloRewardNotice, setSoloRewardNotice] = useState("");
  const [soloBombFlash, setSoloBombFlash] = useState(false);
  const [soloBombPrimed, setSoloBombPrimed] = useState(false);
  const [soloCampaignUnlockedWave, setSoloCampaignUnlockedWave] = useState(1);
  const [soloCampaignLives, setSoloCampaignLives] = useState(soloCampaignStartingLives);
  const [squadModalVisible, setSquadModalVisible] = useState(false);
  const [helperInfoVisible, setHelperInfoVisible] = useState(false);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadBusyId, setSquadBusyId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [hitCounts, setHitCounts] = useState<Record<string, number>>({});
  const [caughtBugIds, setCaughtBugIds] = useState<string[]>([]);
  const [helperImpacts, setHelperImpacts] = useState<HelperImpact[]>([]);
  const [localStartAtByDuelId, setLocalStartAtByDuelId] = useState<Record<string, string>>({});
  const [localSubmittedScores, setLocalSubmittedScores] = useState<Record<string, BugSmashDuelScore>>({});
  const [acknowledgedWaitingDuelIds, setAcknowledgedWaitingDuelIds] = useState<Set<string>>(new Set());
  const [acknowledgedWaitingLoaded, setAcknowledgedWaitingLoaded] = useState(false);
  const [dismissedResultDuelIds, setDismissedResultDuelIds] = useState<Set<string>>(new Set());
  const [retryingDuelIds, setRetryingDuelIds] = useState<Set<string>>(new Set());
  const submittedRef = useRef(false);
  const scoreSubmitPromisesRef = useRef<Record<string, Promise<BugSmashDuel> | undefined>>({});
  const soloWaveClearedRef = useRef(false);
  const scoreRef = useRef(0);
  const caughtBugIdsRef = useRef<string[]>([]);
  const comboRef = useRef(0);
  const hitCountsRef = useRef<Record<string, number>>({});
  const hitFeedbackValues = useRef(new Map<string, Animated.Value>()).current;
  const helperCooldownAtRef = useRef<Record<string, number>>({});
  const helperImpactIdRef = useRef(0);
  const frozenTargetsRef = useRef<Record<string, FrozenTarget>>({});
  const targetTimeOffsetsRef = useRef<Record<string, number>>({});
  const soloBombPrimedRef = useRef(false);
  const soloLampPulseAtRef = useRef(0);
  const lastCatchAtRef = useRef(0);
  const lastHitSoundAtRef = useRef(0);
  const soloBossRewardedRef = useRef(new Set<string>());
  const soloCampaignClearRewardedRef = useRef(new Set<string>());
  const assist = useMemo(() => bugSmashDuelBalanceForUser({ activeBugSquad: activeSquadIds }), [activeSquadIds]);
  const opponents = useMemo(() => {
    const items = users.filter((item) => item.uid !== user.uid);
    if (initialOpponent && initialOpponent.uid !== user.uid && !items.some((item) => item.uid === initialOpponent.uid)) {
      return [initialOpponent, ...items];
    }
    return items;
  }, [initialOpponent, user.uid, users]);
  const activeSquadBonuses = activeBugSquadBonusList(activeSquadIds);
  const selectedOpponentBlocked = selectedOpponentId ? duels.some((duel) => isActiveDuelBetweenUsers(duel, user.uid, selectedOpponentId)) : false;
  const canStartChallenge = Boolean(selectedOpponentId && !selectedOpponentBlocked && !busy);
  const isAcknowledgedWaitingDuel = (duel: BugSmashDuel) => {
    const opponentId = duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
    return acknowledgedWaitingDuelIds.has(duel.id)
      && (duel.status === "pending" || duel.status === "accepted")
      && Boolean(duel.scores?.[user.uid])
      && !duel.scores?.[opponentId];
  };
  const squadChoiceInventory = [...inventory].filter((item) => item.count > 0).sort((a, b) => {
    const firstEntry = entryByBugId(a.bugId);
    const secondEntry = entryByBugId(b.bugId);
    const rarityDiff = (firstEntry ? raritySortOrder[firstEntry.rarity] : 99) - (secondEntry ? raritySortOrder[secondEntry.rarity] : 99);
    if (rarityDiff !== 0) return rarityDiff;
    return bugName(a.bugId, t).localeCompare(bugName(b.bugId, t));
  });

  function resetRunState() {
    submittedRef.current = false;
    soloWaveClearedRef.current = false;
    scoreRef.current = 0;
    caughtBugIdsRef.current = [];
    comboRef.current = 0;
    hitCountsRef.current = {};
    hitFeedbackValues.clear();
    helperCooldownAtRef.current = {};
    frozenTargetsRef.current = {};
    targetTimeOffsetsRef.current = {};
    soloLampPulseAtRef.current = 0;
    lastCatchAtRef.current = 0;
    lastHitSoundAtRef.current = 0;
    setRunSubmitted(false);
    setSoloWaveCleared(false);
    setScore(0);
    setCaughtBugIds([]);
    setHitCounts({});
    setHelperImpacts([]);
  }

  function buildCurrentDuelScore(): BugSmashDuelScore {
    const caughtIds = [...caughtBugIdsRef.current];
    const baseScore = Math.max(scoreRef.current, score, minimumDuelScoreForCaughtBugIds(caughtIds, 0));
    const bonusScore = duelBonusScore(baseScore, assist);
    return normalizeDuelScore({
      score: baseScore + bonusScore,
      caughtBugIds: caughtIds,
      bonusScore,
      submittedAt: new Date().toISOString()
    });
  }

  async function saveDuelScoreNow(duel: BugSmashDuel, submittedScore: BugSmashDuelScore): Promise<BugSmashDuel> {
    const safeSubmittedScore = preferredDuelScore(localSubmittedScores[duel.id], normalizeDuelScore(submittedScore));
    await savePendingDuelScore(user.uid, duel.id, safeSubmittedScore).catch(() => undefined);
    setLocalSubmittedScores((current) => ({ ...current, [duel.id]: preferredDuelScore(current[duel.id], safeSubmittedScore) }));
    const existingSubmit = scoreSubmitPromisesRef.current[duel.id];
    if (existingSubmit) return existingSubmit;
    const submit = submitBugSmashDuelScore(user, duel.id, safeSubmittedScore.score, safeSubmittedScore.caughtBugIds, safeSubmittedScore.bonusScore)
      .then((savedDuel) => {
        void removePendingDuelScore(user.uid, savedDuel.id).catch(() => undefined);
        setActiveDuel((current) => current?.id === savedDuel.id ? savedDuel : current);
        void refreshDuels().catch(() => undefined);
        setRetryingDuelIds((current) => {
          const next = new Set(current);
          next.delete(savedDuel.id);
          return next;
        });
        return savedDuel;
      })
      .finally(() => {
        delete scoreSubmitPromisesRef.current[duel.id];
      });
    scoreSubmitPromisesRef.current[duel.id] = submit;
    return submit;
  }

  async function rememberSoloCampaignProgress(wave: number, lives = soloCampaignLives) {
    const nextWave = Math.max(1, Math.min(soloCampaignMaxWave, Math.floor(wave)));
    const nextLives = Math.max(1, Math.min(soloCampaignStartingLives, Math.floor(lives)));
    setSoloCampaignUnlockedWave(nextWave);
    setSoloCampaignLives(nextLives);
    await saveSoloCampaignProgress(user.uid, { lives: nextLives, wave: nextWave }).catch(() => undefined);
  }

  useEffect(() => {
    let active = true;
    setAcknowledgedWaitingLoaded(false);
    void loadAcknowledgedWaitingDuelIds(user.uid).then((ids) => {
      if (!active) return;
      setAcknowledgedWaitingDuelIds(ids);
      setAcknowledgedWaitingLoaded(true);
    }).catch(() => {
      if (active) setAcknowledgedWaitingLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [user.uid]);

  useEffect(() => {
    if (!acknowledgedWaitingLoaded) return () => undefined;
    let active = true;
    void Promise.all([listUsers(), listBugSmashDuels(user), listBugDexInventory(user)]).then(([nextUsers, nextDuels, nextInventory]) => {
      if (!active) return;
      setUsers(nextUsers);
      setDuels(nextDuels);
      setInventory(nextInventory);
      setActiveSquadIds(sanitizeActiveBugSquad(user.activeBugSquad, nextInventory));
      if (!activeDuelId) {
        const actionableDuel = nextDuels.find((duel) => duel.status === "pending" && duel.fromUserId === user.uid && Boolean(duel.scores?.[user.uid]) && !isAcknowledgedWaitingDuel(duel))
          ?? nextDuels.find((duel) => duel.status === "accepted" && !duel.scores?.[user.uid] && !isAcknowledgedWaitingDuel(duel))
          ?? nextDuels.find((duel) => duel.status === "completed" && isDuelParticipant(duel, user) && !duelResultSeenByUser(duel, user));
        if (actionableDuel) setActiveDuelId(actionableDuel.id);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user.uid, activeDuelId, acknowledgedWaitingLoaded, acknowledgedWaitingDuelIds]);

  useEffect(() => {
    let active = true;
    void loadSoloCampaignProgress(user.uid).then((progress) => {
      if (!active) return;
      setSoloCampaignUnlockedWave(progress.wave);
      setSoloCampaignLives(progress.lives);
    }).catch(() => {
      if (!active) return;
      setSoloCampaignUnlockedWave(1);
      setSoloCampaignLives(soloCampaignStartingLives);
    });
    return () => {
      active = false;
    };
  }, [user.uid]);

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
    if (!duels.length) return () => undefined;
    let active = true;
    void loadPendingDuelScores(user.uid).then((pendingScores) => {
      if (!active) return;
      const activePendingScores: Record<string, BugSmashDuelScore> = {};
      duels.forEach((duel) => {
        const pendingScore = pendingScores[duel.id];
        if (!pendingScore || !isDuelParticipant(duel, user)) return;
        if (duel.scores?.[user.uid]) {
          void removePendingDuelScore(user.uid, duel.id).catch(() => undefined);
          return;
        }
        const opponentUserId = duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
        const isOwnSentWaitingDuel = duel.fromUserId === user.uid
          && (duel.status === "pending" || duel.status === "accepted")
          && !duel.scores?.[opponentUserId];
        if (!isOwnSentWaitingDuel) {
          void removePendingDuelScore(user.uid, duel.id).catch(() => undefined);
          return;
        }
        const safePendingScore = normalizeDuelScore(pendingScore);
        activePendingScores[duel.id] = safePendingScore;
        void saveDuelScoreNow(duel, safePendingScore).catch(() => undefined);
      });
      setLocalSubmittedScores((current) => ({ ...activePendingScores, ...current }));
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [duels, user.uid]);

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

  useEffect(() => {
    if (!activeDuel) return;
    const localScore = localSubmittedScores[activeDuel.id];
    if (!localScore || activeDuel.scores?.[user.uid]) return;
    const retry = setTimeout(() => {
      void saveDuelScoreNow(activeDuel, localScore)
        .then((duel) => {
          setRetryingDuelIds((current) => {
            const next = new Set(current);
            next.delete(duel.id);
            return next;
          });
        })
        .catch(() => undefined);
    }, 1800);
    return () => clearTimeout(retry);
  }, [activeDuel?.id, activeDuel?.scores, localSubmittedScores, user]);

  useEffect(() => {
    if (!activeDuel) return;
    const ownScore = activeDuel.scores?.[user.uid];
    if (!ownScore) return;
    const fixedScore = displayDuelScore(ownScore);
    if (fixedScore <= ownScore.score) return;
    const otherUserId = activeDuel.fromUserId === user.uid ? activeDuel.toUserId : activeDuel.fromUserId;
    if (activeDuel.scores?.[otherUserId]) return;
    void submitBugSmashDuelScore(user, activeDuel.id, fixedScore, ownScore.caughtBugIds, ownScore.bonusScore)
      .then((duel) => {
        setActiveDuel(duel);
        void refreshDuels().catch(() => undefined);
      })
      .catch(() => undefined);
  }, [activeDuel?.id, activeDuel?.scores, user]);

  const activeLocalStartAt = activeDuel ? localStartAtByDuelId[activeDuel.id] : "";
  const activeDuelOwnScore = activeDuel?.scores?.[user.uid];
  const retryingActiveDuel = Boolean(activeDuel && retryingDuelIds.has(activeDuel.id));
  const requesterCanPreplay = Boolean(activeDuel?.status === "pending" && activeDuel.fromUserId === user.uid);
  const duelCanRun = Boolean(activeDuel?.status === "accepted" || requesterCanPreplay);
  const playerNeedsManualStart = Boolean(duelCanRun && (!activeDuelOwnScore || retryingActiveDuel) && !activeLocalStartAt);
  const playableDuel: BugSmashDuel | null = activeDuel && duelCanRun && activeLocalStartAt
    ? { ...activeDuel, startAt: activeLocalStartAt }
    : activeDuel;

  useEffect(() => {
    const runningDuel = trainingDuel ?? activeDuel;
    if (!runningDuel) return () => undefined;
    const canRunDuel = runningDuel.status === "accepted" || (!trainingDuel && runningDuel.status === "pending" && runningDuel.fromUserId === user.uid);
    if (!canRunDuel || (!trainingDuel && playerNeedsManualStart)) return () => undefined;
    const interval = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      const effectiveStartAt = trainingDuel ? runningDuel.startAt : activeLocalStartAt || runningDuel.startAt;
      const startAt = effectiveStartAt ? Date.parse(effectiveStartAt) : timestamp;
      const endAt = startAt + runningDuel.durationMs;
      if (timestamp >= endAt) {
        if (!submittedRef.current) {
          const finalScore = scoreRef.current + duelBonusScore(scoreRef.current, assist);
          if (trainingDuel && soloRun?.mode === "campaign" && finalScore >= soloRun.targetScore) {
            soloWaveClearedRef.current = true;
            setSoloWaveCleared(true);
          }
          submittedRef.current = true;
          setRunSubmitted(true);
          if (!trainingDuel) {
            void saveDuelScoreNow(runningDuel, buildCurrentDuelScore()).catch(() => setError(t("duel.submitFailed")));
          }
        }
        return;
      }
      if (trainingDuel && submittedRef.current) return;
      if (trainingDuel && soloRun?.mode === "campaign" && soloLampFocusActive(soloPowerups, timestamp)) runSoloLampFocusPulse(runningDuel, timestamp);
      const helperDuel = !trainingDuel && activeLocalStartAt ? { ...runningDuel, startAt: activeLocalStartAt } : runningDuel;
      runHelperTowers(helperDuel, timestamp);
    }, duelGameTickMs);
    return () => clearInterval(interval);
  }, [activeDuel?.id, activeDuel?.status, activeDuel?.startAt, activeDuel?.durationMs, trainingDuel?.id, trainingDuel?.startAt, trainingDuel?.durationMs, activeLocalStartAt, playerNeedsManualStart, assist, soloPowerups.lampFocusActiveUntil, soloRun?.mode, t, user]);

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
    if (!opponent || !canStartChallenge) return;
    setTrainingDuel(null);
    setSoloRun(null);
    setBusy(true);
    setError("");
    setChallengeNotice(t("duel.sendingChallenge"));
    try {
      const duel = await createBugSmashDuel(user, opponent);
      await onDuelRequest?.(opponent.uid, duel.id);
      const startAt = new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString();
      resetRunState();
      setActiveDuelId(duel.id);
      setActiveDuel(duel);
      setLocalStartAtByDuelId((current) => ({ ...current, [duel.id]: startAt }));
      setNow(Date.now());
      setChallengeNotice("");
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
      await dismissPresentedNotificationsForTarget({ duelId: duel.id, type: "duel" }).catch(() => undefined);
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
      await dismissPresentedNotificationsForTarget({ duelId: duelToCancel.id, type: "duel" }).catch(() => undefined);
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
      const claim = await claimBugSmashDuelReward(user, activeDuel.id);
      setDismissedResultDuelIds((current) => new Set([...current, activeDuel.id]));
      await dismissPresentedNotificationsForTarget({ duelId: activeDuel.id, type: "duel" }).catch(() => undefined);
      if (!claim) {
        await acknowledgeBugSmashDuelResult(user, activeDuel.id).catch(() => undefined);
        await refreshDuels();
        return;
      }
      if (claim.rewardGranted) onUserUpdated?.(claim.user);
      if (claim.rewardGranted && claim.result === "win") {
        try {
          const drop = await grantBugDexReward(claim.user, "duel_win");
          onRewardDrop?.(drop);
        } catch {
          setError(t("duel.rewardFailed"));
        }
      }
      await refreshDuels();
    } catch {
      setError(t("duel.rewardFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function acknowledgeResult() {
    if (!activeDuel || busy) return;
    setBusy(true);
    setError("");
    setDismissedResultDuelIds((current) => new Set([...current, activeDuel.id]));
    try {
      await acknowledgeBugSmashDuelResult(user, activeDuel.id);
      await dismissPresentedNotificationsForTarget({ duelId: activeDuel.id, type: "duel" }).catch(() => undefined);
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
    const runningDuel = duelOverride ?? trainingDuel ?? (activeDuel && activeLocalStartAt ? { ...activeDuel, startAt: activeLocalStartAt } : activeDuel);
    if (!runningDuel || !isRunning(runningDuel, timestamp)) return;
    const entry = entryByBugId(bugId);
    if (!entry || caughtBugIdsRef.current.includes(bugId)) return;
    const targetIndex = runningDuel.bugIds.indexOf(bugId);
    const bossLevel = soloBossLevelForTarget(runningDuel, targetIndex, soloCampaign);
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, targetIndex, soloTapMultiplier, bossLevel);
    const bossBreakBonus = soloBossBreakBonusForCatch(runningDuel, targetIndex, soloCampaign, timestamp, assist, targetTimeOffsetsRef.current[bugId] ?? 0);
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
    scoreRef.current += scoreByRarity[entry.rarity] + soloBossScoreBonus(bossLevel) + bossBreakBonus + duelCatchBonusPoints(entry.rarity, bugId, assist) + duelComboBonusPoint(comboRef.current, assist.comboBonusEvery);
    if (bossBreakBonus > 0) setSoloRewardNotice(`Boss break +${bossBreakBonus}`);
    setCaughtBugIds(caughtBugIdsRef.current);
    setScore(scoreRef.current);
    if (runningDuel.toUserId === "bugbot" && soloCampaign && scoreRef.current + duelBonusScore(scoreRef.current, assist) >= soloCampaign.targetScore) {
      soloWaveClearedRef.current = true;
      setSoloWaveCleared(true);
      submittedRef.current = true;
      setRunSubmitted(true);
    }
  }

  function runSoloLampFocusPulse(duel: BugSmashDuel, timestamp: number) {
    const campaign = soloRun?.mode === "campaign" ? soloRun : null;
    if (!campaign || !isRunning(duel, timestamp)) return;
    if (!soloLampPulseAtRef.current) {
      soloLampPulseAtRef.current = timestamp + 1200;
      return;
    }
    if (timestamp < soloLampPulseAtRef.current) return;
    const targets = collectRenderedTargets(duel, timestamp, caughtBugIdsRef.current, assist, frozenTargetsRef.current, targetTimeOffsetsRef.current, campaign)
      .filter((item) => item.motion.progress <= 0.88)
      .sort((a, b) => targetPriority(b.entry.rarity, b.motion.progress, soloBossLevelForTarget(duel, b.index, campaign)) - targetPriority(a.entry.rarity, a.motion.progress, soloBossLevelForTarget(duel, a.index, campaign)));
    const target = targets[0];
    if (!target) return;
    soloLampPulseAtRef.current = timestamp + soloLampFocusPulseCooldownMs;
    addHelperImpact(
      "lamp_focus",
      target.motion.x,
      target.motion.y,
      "#fde047",
      "zap",
      t("duel.powerupLampPulse"),
      "pulse",
      { x: 50, y: 92 },
      []
    );
    applyBugHit(target.bugId, "helper", timestamp, duel);
  }

  function runHelperTowers(duel: BugSmashDuel, timestamp: number) {
    if (!activeSquadBonuses.length || !isRunning(duel, timestamp)) return;
    const renderedTargets = collectRenderedTargets(duel, timestamp, caughtBugIdsRef.current, assist, frozenTargetsRef.current, targetTimeOffsetsRef.current, soloCampaign);
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

  function retryOwnDuelScore() {
    if (!activeDuel || !canRetryOwnDuelScore) return;
    resetRunState();
    setAcknowledgedWaitingDuelIds((current) => {
      const next = new Set(current);
      next.delete(activeDuel.id);
      return next;
    });
    setRetryingDuelIds((current) => new Set([...current, activeDuel.id]));
    setLocalSubmittedScores((current) => {
      const next = { ...current };
      delete next[activeDuel.id];
      return next;
    });
    setLocalStartAtByDuelId((current) => ({
      ...current,
      [activeDuel.id]: new Date(Date.now() + bugSmashDuelStartDelayMs).toISOString()
    }));
    setNow(Date.now());
  }

  async function closeWaitingResultAndGoHome() {
    if (busy) return;
    if (activeDuel) {
      const duelToClose = activeDuel;
      const savedScore = duelToClose.scores?.[user.uid];
      const localScore = localSubmittedScores[duelToClose.id];
      setBusy(true);
      setError("");
      try {
        if (!savedScore) {
          await saveDuelScoreNow(duelToClose, localScore ?? buildCurrentDuelScore());
        }
        setAcknowledgedWaitingDuelIds((current) => new Set([...current, duelToClose.id]));
        await saveAcknowledgedWaitingDuelId(user.uid, duelToClose.id).catch(() => undefined);
      } catch {
        setError(t("duel.submitFailed"));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setActiveDuelId("");
    setActiveDuel(null);
    void refreshDuels().catch(() => undefined);
  }

  function startTraining() {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const timestamp = new Date().toISOString();
    resetRunState();
    soloBombPrimedRef.current = false;
    setSoloBombPrimed(false);
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
      durationMs: config.boss ? bugSmashDuelDurationMs + 15000 : bugSmashDuelDurationMs,
      scores: {},
      rewardClaimedBy: []
    });
  }

  function stopTraining() {
    setTrainingDuel(null);
    setSoloRun(null);
    soloBombPrimedRef.current = false;
    setSoloBombPrimed(false);
    resetRunState();
    setNow(Date.now());
  }

  function requestStopTraining() {
    if (soloRun?.mode !== "campaign") {
      stopTraining();
      return;
    }
    Alert.alert(t("duel.soloCancelTitle"), t("duel.soloCancelBody"), [
      { text: t("common.keepPlaying"), style: "cancel" },
      { text: t("common.exit"), style: "destructive", onPress: stopTraining }
    ]);
  }

  function handleSoloCampaignResultAction() {
    const campaign = soloRun?.mode === "campaign" ? soloRun : null;
    if (!campaign) return;
    if (soloCampaignComplete) {
      void rememberSoloCampaignProgress(1, soloCampaignStartingLives);
      startSoloCampaign(1);
      return;
    }
    if (soloCampaignWon) {
      const nextWave = Math.min(soloCampaignMaxWave, campaign.wave + 1);
      void rememberSoloCampaignProgress(nextWave, soloCampaignLives);
      startSoloCampaign(nextWave);
      return;
    }
    if (soloCampaignLives > 1) {
      const nextLives = Math.max(1, soloCampaignLives - 1);
      void rememberSoloCampaignProgress(campaign.wave, nextLives);
      startSoloCampaign(campaign.wave);
      return;
    }
    void rememberSoloCampaignProgress(1, soloCampaignStartingLives);
    startSoloCampaign(1);
  }

  async function activateLampFocus() {
    const result = await activateSoloLampFocus(user.uid);
    setSoloPowerups(result.inventory);
    setSoloRewardNotice(result.activated ? t("duel.powerupLampActivated") : t("duel.powerupEmpty"));
  }

  async function primeSoloBugBomb() {
    if (soloBombPrimed) return;
    const result = await consumeSoloBugBomb(user.uid);
    setSoloPowerups(result.inventory);
    if (!result.consumed) {
      setSoloRewardNotice(t("duel.powerupEmpty"));
      return;
    }
    soloBombPrimedRef.current = true;
    setSoloBombPrimed(true);
    setSoloRewardNotice(t("duel.powerupBombPrimed"));
  }

  async function useSoloBugBombNow(duel: BugSmashDuel | null | undefined, timestamp = Date.now()) {
    const campaign = soloRun?.mode === "campaign" ? soloRun : null;
    if (!campaign || !duel || !isRunning(duel, timestamp)) return;
    if (!soloBombPrimedRef.current) {
      const result = await consumeSoloBugBomb(user.uid);
      setSoloPowerups(result.inventory);
      if (!result.consumed) {
        setSoloRewardNotice(t("duel.powerupEmpty"));
        return;
      }
    }
    soloBombPrimedRef.current = false;
    setSoloBombPrimed(false);
    detonateSoloBugBomb(duel, timestamp);
  }

  function detonateSoloBugBomb(duel: BugSmashDuel, timestamp: number) {
    const campaign = soloRun?.mode === "campaign" ? soloRun : null;
    if (!campaign || !isRunning(duel, timestamp)) return;
    const targets = collectRenderedTargets(duel, timestamp, caughtBugIdsRef.current, assist, frozenTargetsRef.current, targetTimeOffsetsRef.current, campaign)
      .filter((target) => target.motion.progress <= 0.92)
      .slice(0, soloBugBombMaxTargets);
    setSoloBombFlash(true);
    setTimeout(() => setSoloBombFlash(false), 620);
    setSoloRewardNotice(t("duel.powerupBombUsed"));
    targets.forEach((target) => {
      const bossLevel = soloBossLevelForTarget(duel, target.index, campaign);
      const required = requiredTapsForTarget(target.entry.rarity, assist, target.index, soloTapMultiplier, bossLevel);
      const hits = hitCountsRef.current[target.bugId] ?? 0;
      const bombHits = Math.min(soloBugBombHitCount, Math.max(0, required - hits));
      addHelperImpact(
        "bug_bomb",
        target.motion.x,
        target.motion.y,
        "#f97316",
        "splash",
        t("duel.powerupBombHit", { hits: bombHits }),
        "orb",
        { x: 50, y: 50 },
        []
      );
      for (let hit = 0; hit < bombHits; hit += 1) applyBugHit(target.bugId, "helper", timestamp, duel);
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
  const localSubmittedScore = activeDuel ? localSubmittedScores[activeDuel.id] : undefined;
  const ownSubmittedScore = activeScore ?? localSubmittedScore;
  const opponentId = activeDuel ? activeDuel.fromUserId === user.uid ? activeDuel.toUserId : activeDuel.fromUserId : "";
  const opponentScore = opponentId ? activeDuel?.scores?.[opponentId] : undefined;
  const ownRetryScore = ownSubmittedScore?.score ?? (activeDuel && runSubmitted && !opponentScore ? score + duelBonusScore(score, assist) : undefined);
  const ownRetryCaughtCount = ownSubmittedScore?.caughtBugIds.length ?? 0;
  const ownSentDuelWaitingForOpponent = Boolean(activeDuel?.fromUserId === user.uid && (activeDuel.status === "pending" || activeDuel.status === "accepted") && ownSubmittedScore && !opponentScore);
  const canRetryOwnDuelScore = Boolean(activeDuel && ownRetryScore !== undefined && !opponentScore && ownSentDuelWaitingForOpponent && (ownRetryCaughtCount === 0 || ownRetryScore < duelRetryScoreThreshold));
  const awaitingOpponentResult = Boolean(ownSentDuelWaitingForOpponent && !retryingActiveDuel);
  const showWaitingResultModal = Boolean(activeDuel && awaitingOpponentResult && !acknowledgedWaitingDuelIds.has(activeDuel.id));
  const resultRewardPending = Boolean(activeDuel?.winnerId && isDuelParticipant(activeDuel, user) && !(activeDuel.rewardClaimedBy ?? []).includes(user.uid));
  const showResultModal = Boolean(activeDuel?.status === "completed" && isDuelParticipant(activeDuel, user) && !duelResultSeenByUser(activeDuel, user) && !dismissedResultDuelIds.has(activeDuel.id));
  const helperInfoItems = [
    { body: t("duel.helperInfo.zap"), name: t("duel.helper.zap") },
    { body: t("duel.helperInfo.sticky"), name: t("duel.helper.sticky") },
    { body: t("duel.helperInfo.shield"), name: t("duel.helper.shield") },
    { body: t("duel.helperInfo.splash"), name: t("duel.helper.splash") },
    { body: t("duel.helperInfo.burst"), name: t("duel.helper.burst") },
    { body: t("duel.helperInfo.mythic"), name: t("duel.helperInfo.mythicName") }
  ];
  const visibleRecentDuels = duels.filter((duel) => duel.status !== "cancelled");
  const gameDuel = trainingDuel ?? playableDuel;
  const gameStartAt = gameDuel?.startAt ?? "";
  const countdown = gameStartAt ? Math.max(0, Math.ceil((Date.parse(gameStartAt) - now) / 1000)) : 0;
  const remainingSeconds = gameStartAt && gameDuel ? Math.max(0, Math.ceil((Date.parse(gameStartAt) + gameDuel.durationMs - now) / 1000)) : 0;
  const activeDuelScore = retryingActiveDuel ? (runSubmitted ? score + duelBonusScore(score, assist) : score) : ownSubmittedScore ? displayDuelScore(ownSubmittedScore) : (runSubmitted ? score + duelBonusScore(score, assist) : score);
  const incomingPendingDuel = activeDuel?.status === "pending" && activeDuel.toUserId === user.uid;
  const fullscreenGame = Boolean(trainingDuel) || Boolean(duelCanRun && activeLocalStartAt && !playerNeedsManualStart && !awaitingOpponentResult && !runSubmitted);
  const gameScore = trainingDuel && runSubmitted ? score + duelBonusScore(score, assist) : trainingDuel ? score : activeDuelScore;
  const soloCampaign = soloRun?.mode === "campaign" ? soloRun : null;
  const soloProgress = gameStartAt && gameDuel ? Math.max(0, Math.min(1, (now - Date.parse(gameStartAt)) / gameDuel.durationMs)) : 0;
  const soloPcScore = soloCampaign ? Math.min(soloCampaign.pcScore, Math.round(soloCampaign.pcScore * soloProgress)) : 0;
  const soloCampaignWon = Boolean(soloCampaign && submittedRef.current && (soloWaveCleared || soloWaveClearedRef.current || gameScore >= soloCampaign.targetScore));
  const soloCampaignComplete = Boolean(soloCampaignWon && soloCampaign && soloCampaign.wave >= soloCampaignMaxWave);
  const lampFocusActive = soloLampFocusActive(soloPowerups, now);
  const lampFocusMinutes = soloLampFocusRemainingMinutes(soloPowerups, now);
  const soloTapMultiplier = soloCampaign && lampFocusActive ? soloLampFocusTapMultiplier : 1;
  const canUseSoloBugBombInGame = Boolean(gameDuel && soloCampaign && isRunning(gameDuel, now) && (soloBombPrimed || soloPowerups.bugBombCharges > 0));

  useEffect(() => {
    onFullscreenChange?.(fullscreenGame);
    return () => onFullscreenChange?.(false);
  }, [fullscreenGame, onFullscreenChange]);

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
    void claimSoloCampaignBossDailyReward(user, soloCampaign.level).then((result) => {
      if (!result) return;
      if (result.user) onUserUpdated?.(result.user);
      if (result.drop?.rewardType === "bug") {
        onRewardDrop?.(result.drop);
        setSoloRewardNotice(t("duel.bossReward", { reward: bugDexEntryName(result.drop.entry, t) }));
        return;
      }
      if (result.reward.kind === "xp") setSoloRewardNotice(t("duel.bossReward", { reward: `+${result.reward.xp} XP` }));
    }).catch(() => undefined);
  }, [onRewardDrop, onUserUpdated, soloCampaignWon, soloCampaign?.boss, soloCampaign?.level, trainingDuel?.id, user, t]);

  useEffect(() => {
    if (!soloCampaignComplete || !trainingDuel) return;
    const rewardKey = trainingDuel.id;
    if (soloCampaignClearRewardedRef.current.has(rewardKey)) return;
    soloCampaignClearRewardedRef.current.add(rewardKey);
    void grantBugDexReward(user, "solo_campaign_clear").then((drop) => {
      onRewardDrop?.(drop);
      setSoloRewardNotice(t("duel.soloCampaignClearReward"));
    }).catch(() => {
      setSoloRewardNotice(t("duel.soloCampaignClearRewardUsed"));
    });
  }, [onRewardDrop, soloCampaignComplete, trainingDuel?.id, user, t]);

  if (fullscreenGame && gameDuel) {
    return (
      <View style={styles.fullscreenGame}>
        <View style={styles.gameHud}>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? soloCampaign ? t("duel.soloCampaignTitle") : t("duel.trainingTitle") : opponentLabel(gameDuel, user)}</Text>
            <Text style={styles.gameScore}>{soloCampaign ? t("duel.yourCampaignScore", { score: gameScore, target: soloCampaign.targetScore }) : t("duel.yourScore", { score: gameScore })}</Text>
          </View>
          <Text style={styles.gameTimer}>{remainingSeconds}s</Text>
          <View style={styles.gameHudPlayer}>
            <Text style={styles.gameOpponent} numberOfLines={1}>{trainingDuel ? soloCampaign ? t("duel.soloPcScore", { score: soloPcScore, target: soloCampaign.targetScore }) : t("duel.trainingNoRewardsShort") : opponentScore ? `${opponentLabel(gameDuel, user)}: ${displayDuelScore(opponentScore)}` : t("duel.waitingScore")}</Text>
            {trainingDuel ? (
              <Pressable style={styles.gameExitButton} onPress={requestStopTraining}>
                <Text style={styles.gameExitText}>x</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.fullscreenArena}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : trainingDuel && runSubmitted ? (
            <View style={styles.trainingResult}>
              <Text style={styles.trainingResultTitle}>{soloCampaign ? soloCampaignComplete ? t("duel.soloComplete") : soloCampaignWon ? t("duel.soloWin") : t("duel.soloLoss") : t("duel.trainingDone")}</Text>
              <Text style={styles.trainingResultScore}>{t("duel.yourScore", { score: gameScore })}</Text>
              <Text style={styles.trainingResultBody}>{soloCampaign ? t("duel.soloResultBody", { pc: soloCampaign.pcScore, target: soloCampaign.targetScore }) : t("duel.trainingNoRewards")}</Text>
              {soloCampaign ? <Text style={styles.trainingResultBody}>{t("duel.soloLives", { lives: soloCampaignLives, max: soloCampaignStartingLives })}</Text> : null}
              {soloCampaign ? <Text style={styles.trainingResultBody}>{soloCampaign.boss ? t("duel.soloBossWave", { wave: soloCampaign.wave, level: soloCampaign.level, maxWave: soloCampaignMaxWave }) : t("duel.soloWave", { wave: soloCampaign.wave, level: soloCampaign.level, maxWave: soloCampaignMaxWave })}</Text> : null}
              {soloCampaign && soloRewardNotice ? (
                <View style={styles.soloRewardCard}>
                  <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloRewardImage} />
                  <Text style={styles.soloRewardText}>{soloRewardNotice}</Text>
                </View>
              ) : null}
              <Pressable style={sharedStyles.button} onPress={soloCampaign ? handleSoloCampaignResultAction : startTraining}>
                <Text style={sharedStyles.buttonText}>{soloCampaign ? soloCampaignComplete ? t("duel.soloRestart") : soloCampaignWon ? t("duel.soloNextWave") : soloCampaignLives > 1 ? t("duel.soloRetryWave") : t("duel.soloRetry") : t("duel.trainingRetry")}</Text>
              </Pressable>
              {!(soloCampaign && soloCampaignWon) && (
                <Pressable style={sharedStyles.secondaryButton} onPress={soloCampaign ? requestStopTraining : stopTraining}>
                  <Text style={sharedStyles.secondaryButtonText}>{t("common.done")}</Text>
                </Pressable>
              )}
            </View>
          ) : isRunning(gameDuel, now) ? (
            <>
              {renderTargets(gameDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, frozenTargetsRef.current, targetTimeOffsetsRef.current, hitBug, t, soloCampaign)}
              {renderHelperImpacts(helperImpacts)}
              {renderHelperTowers(activeSquadBonuses, helperCooldownAtRef.current, now, t)}
              {soloCampaign && (
                <View style={styles.soloPowerupGameBar}>
                  <Pressable disabled={lampFocusActive || soloPowerups.lampFocusCharges <= 0} style={[styles.soloPowerupGameButton, (lampFocusActive || soloPowerups.lampFocusCharges <= 0) && styles.soloPowerupDisabled]} onPress={activateLampFocus}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloPowerupGameIcon} />
                    <Text style={styles.soloPowerupGameText}>{lampFocusActive ? t("duel.powerupLampActive", { minutes: lampFocusMinutes }) : t("duel.powerupLampShort", { count: soloPowerups.lampFocusCharges })}</Text>
                  </Pressable>
                  <Pressable disabled={!canUseSoloBugBombInGame} style={[styles.soloPowerupGameButton, !canUseSoloBugBombInGame && styles.soloPowerupDisabled]} onPress={() => void useSoloBugBombNow(gameDuel, Date.now())}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloPowerupGameIcon} />
                    <Text style={styles.soloPowerupGameText}>{soloBombPrimed ? t("duel.powerupPrimed") : t("duel.powerupBombShort", { count: soloPowerups.bugBombCharges })}</Text>
                  </Pressable>
                </View>
              )}
              {soloBombFlash && (
                <View pointerEvents="none" style={styles.soloBombFlash}>
                  <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloBombFlashImage} />
                  <Text style={styles.soloBombFlashText}>BOOM</Text>
                </View>
              )}
            </>
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
          <View style={styles.arenaModeRow}>
            <Pressable style={[styles.arenaModeButton, arenaMode === "duel" && styles.arenaModeButtonActive]} onPress={() => setArenaMode("duel")}>
              <Image accessibilityIgnoresInvertColors resizeMode="cover" source={duelHeroImage} style={styles.arenaModeImage} />
              <View style={styles.arenaModeCopy}>
                <Text numberOfLines={1} style={[styles.arenaModeText, arenaMode === "duel" && styles.arenaModeTextActive]}>Duel</Text>
                <Text numberOfLines={1} style={[styles.arenaModeMeta, arenaMode === "duel" && styles.arenaModeMetaActive]}>{t("duel.modeDuelHint")}</Text>
              </View>
            </Pressable>
            <Pressable style={[styles.arenaModeButton, arenaMode === "training" && styles.arenaModeButtonActive]} onPress={() => setArenaMode("training")}>
              <Image accessibilityIgnoresInvertColors resizeMode="cover" source={trainingModeImage} style={styles.arenaModeImage} />
              <View style={styles.arenaModeCopy}>
                <Text numberOfLines={1} style={[styles.arenaModeText, arenaMode === "training" && styles.arenaModeTextActive]}>{t("duel.trainingTitle")}</Text>
                <Text numberOfLines={1} style={[styles.arenaModeMeta, arenaMode === "training" && styles.arenaModeMetaActive]}>{t("duel.modeTrainingHint")}</Text>
              </View>
            </Pressable>
            <Pressable style={[styles.arenaModeButton, arenaMode === "solo" && styles.arenaModeButtonActive]} onPress={() => setArenaMode("solo")}>
              <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloCampaignImage} style={styles.arenaModeImage} />
              <View style={styles.arenaModeCopy}>
                <Text numberOfLines={1} style={[styles.arenaModeText, arenaMode === "solo" && styles.arenaModeTextActive]}>{t("duel.soloCampaignTitle")}</Text>
                <Text numberOfLines={1} style={[styles.arenaModeMeta, arenaMode === "solo" && styles.arenaModeMetaActive]}>{t("duel.modeSoloHint")}</Text>
              </View>
            </Pressable>
          </View>
          <View style={styles.arenaSquadPreview}>
            <View style={styles.arenaSquadPreviewHeader}>
              <View style={styles.modeHeaderText}>
                <Text style={styles.arenaSquadPreviewTitle}>{t("duel.bonusTitle")}</Text>
                <Text style={styles.arenaSquadPreviewMeta}>{t("duel.squadSelectedCount", { count: activeSquadIds.length, max: maxActiveBugSquadSize })}</Text>
              </View>
              <View style={styles.helperHeaderActions}>
                <Pressable accessibilityLabel={t("duel.helperInfoTitle")} style={styles.infoButton} onPress={() => setHelperInfoVisible(true)}>
                  <Text style={styles.infoButtonText}>i</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={openSquadModal}>
                  <Text style={styles.smallButtonText}>{t("duel.changeSquad")}</Text>
                </Pressable>
              </View>
            </View>
            {renderSquadJars(activeSquadIds, activeSquadBonuses, t, openSquadModal, { compact: true })}
          </View>
          {arenaMode === "duel" && (
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
                const activePairDuel = duels.find((duel) => isActiveDuelBetweenUsers(duel, user.uid, opponent.uid));
                const blocked = Boolean(activePairDuel);
                const pairOwnScore = activePairDuel ? activePairDuel.scores?.[user.uid] ?? localSubmittedScores[activePairDuel.id] : undefined;
                const pairOpponentScore = activePairDuel ? activePairDuel.scores?.[opponent.uid] : undefined;
                const incomingDuelAction = Boolean(activePairDuel?.status === "pending" && activePairDuel.toUserId === user.uid);
                const needsPlayAction = Boolean(activePairDuel?.status === "accepted" && !pairOwnScore);
                const opponentActionCount = incomingDuelAction || needsPlayAction ? 1 : 0;
                const showOwnWaitingScore = Boolean(activePairDuel?.fromUserId === user.uid && (activePairDuel.status === "pending" || activePairDuel.status === "accepted") && pairOwnScore && !pairOpponentScore);
                const showOpponentWaitingScore = Boolean(activePairDuel?.fromUserId === opponent.uid && (activePairDuel.status === "pending" || activePairDuel.status === "accepted") && pairOpponentScore && !pairOwnScore);
                const dailyRewardClaimed = duelDailyRewardClaimedAgainstOpponent(duels, user.uid, opponent.uid);
                const opponentMeta = incomingDuelAction
                  ? t("duel.incomingStatus")
                  : showOwnWaitingScore
                  ? t("duel.yourScore", { score: displayDuelScore(pairOwnScore) })
                  : showOpponentWaitingScore
                    ? `${opponent.displayName}: ${displayDuelScore(pairOpponentScore)}`
                  : blocked && activePairDuel
                    ? statusLabel(activePairDuel, t)
                    : dailyRewardClaimed
                      ? t("duel.dailyRewardClaimed")
                      : t("duel.dailyRewardAvailable");
                const opponentPresence = incomingDuelAction ? t("duel.pendingBadge") : blocked ? t("duel.activeBetween") : dailyRewardClaimed ? t("duel.noDailyRewardShort") : presenceLabel(opponent, t);
                return (
                  <Pressable
                    key={opponent.uid}
                    style={[styles.opponentButton, selected && styles.opponentButtonSelected, blocked && !opponentActionCount && styles.opponentButtonBlocked]}
                    onPress={() => {
                      if (activePairDuel) {
                        setActiveDuelId(activePairDuel.id);
                        setActiveDuel(activePairDuel);
                        return;
                      }
                      setSelectedOpponentId(opponent.uid);
                    }}
                  >
                    {opponentActionCount > 0 && (
                      <View style={styles.opponentActionBadge}>
                        <Text style={styles.opponentActionBadgeText}>{opponentActionCount}</Text>
                      </View>
                    )}
                    <Text style={[styles.opponentName, selected && styles.opponentNameSelected]} numberOfLines={1}>{opponent.displayName}</Text>
                    <Text style={styles.opponentMeta}>{opponentMeta}</Text>
                    <Text style={[styles.opponentPresence, selected && styles.opponentPresenceSelected]} numberOfLines={1}>{opponentPresence}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable disabled={!canStartChallenge} style={[sharedStyles.button, !canStartChallenge && styles.disabled]} onPress={startChallenge}>
              <Text style={sharedStyles.buttonText}>{busy ? "..." : t("duel.challenge")}</Text>
            </Pressable>
          </View>
          )}
          {arenaMode === "training" && (
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
          )}
          {arenaMode === "solo" && (
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
                  <Text style={styles.soloCampaignMeta}>{t("duel.soloContinueWave", { wave: soloCampaignUnlockedWave, maxWave: soloCampaignMaxWave })}</Text>
                  <Text style={styles.soloCampaignMeta}>{t("duel.soloLives", { lives: soloCampaignLives, max: soloCampaignStartingLives })}</Text>
                </View>
                <View style={styles.soloPowerupPanel}>
                  <View style={styles.soloPowerupItem}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupLampImage} style={styles.soloPowerupImage} />
                    <View style={styles.soloPowerupCopy}>
                      <Text style={styles.soloPowerupName}>{t("duel.powerupLamp")}</Text>
                      <Text style={styles.soloPowerupMeta}>{lampFocusActive ? t("duel.powerupLampActive", { minutes: lampFocusMinutes }) : t("duel.powerupLampMeta", { count: soloPowerups.lampFocusCharges })}</Text>
                    </View>
                    <Pressable disabled={lampFocusActive || soloPowerups.lampFocusCharges <= 0} style={[styles.soloPowerupUseButton, (lampFocusActive || soloPowerups.lampFocusCharges <= 0) && styles.soloPowerupDisabled]} onPress={activateLampFocus}>
                      <Text style={styles.soloPowerupUseText}>{t("duel.powerupUse")}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.soloPowerupItem}>
                    <Image accessibilityIgnoresInvertColors resizeMode="cover" source={soloPowerupBombImage} style={styles.soloPowerupImage} />
                    <View style={styles.soloPowerupCopy}>
                      <Text style={styles.soloPowerupName}>{t("duel.powerupBomb")}</Text>
                      <Text style={styles.soloPowerupMeta}>{soloBombPrimed ? t("duel.powerupBombPrimed") : t("duel.powerupBombMeta", { count: soloPowerups.bugBombCharges })}</Text>
                    </View>
                    <Pressable disabled={soloPowerups.bugBombCharges <= 0 || soloBombPrimed} style={[styles.soloPowerupUseButton, (soloPowerups.bugBombCharges <= 0 || soloBombPrimed) && styles.soloPowerupDisabled]} onPress={primeSoloBugBomb}>
                      <Text style={styles.soloPowerupUseText}>{soloBombPrimed ? t("duel.powerupPrimed") : t("duel.powerupUse")}</Text>
                    </Pressable>
                  </View>
                </View>
                {soloRewardNotice ? <Text style={styles.soloRewardInline}>{soloRewardNotice}</Text> : null}
              </View>
              <Pressable style={styles.soloCampaignButton} onPress={() => startSoloCampaign(soloCampaignUnlockedWave)}>
                <Text style={styles.soloCampaignButtonText}>{soloCampaignUnlockedWave > 1 ? t("duel.soloContinueAction") : t("duel.soloCampaignAction")}</Text>
              </Pressable>
            </View>
          </View>
          )}
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
            {duelCanRun && !awaitingOpponentResult ? <Text style={styles.timerText}>{remainingSeconds}s</Text> : <Text style={styles.pendingBadge}>{t("duel.pendingBadge")}</Text>}
          </View>

          {activeDuel.status === "pending" && activeDuel.toUserId === user.uid && (
            <View style={styles.incomingPanel}>
              <Text style={styles.incomingBody}>{t("duel.incomingBody", { name: activeDuel.fromUserName })}</Text>
              {opponentScore ? <Text style={styles.resultLine}>{activeDuel.fromUserName}: {displayDuelScore(opponentScore)}</Text> : null}
              <Text style={styles.incomingHint}>{t("duel.incomingHint")}</Text>
              <Pressable disabled={busy} style={sharedStyles.button} onPress={() => respond(true)}>
                <Text style={sharedStyles.buttonText}>{t("duel.accept")}</Text>
              </Pressable>
              <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={() => respond(false)}>
                <Text style={sharedStyles.secondaryButtonText}>{t("duel.decline")}</Text>
              </Pressable>
            </View>
          )}

          {activeDuel.status === "pending" && activeDuel.fromUserId === user.uid && !playerNeedsManualStart && !awaitingOpponentResult && !activeLocalStartAt && (
            <View style={styles.waitingPanel}>
              <Text style={styles.noticeText}>{t("duel.waitingForOpponent")}</Text>
              <Pressable disabled={busy} style={sharedStyles.secondaryButton} onPress={cancel}>
                <Text style={sharedStyles.secondaryButtonText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          )}

          {playerNeedsManualStart && (
            <View style={styles.startPanel}>
              <Text style={styles.startTitle}>{t("duel.readyTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.asyncReadyBody", { name: opponentLabel(activeDuel, user) })}</Text>
              {opponentScore ? <Text style={styles.resultLine}>{opponentLabel(activeDuel, user)}: {displayDuelScore(opponentScore)}</Text> : null}
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
              {canRetryOwnDuelScore ? (
                <Pressable style={sharedStyles.button} onPress={retryOwnDuelScore}>
                  <Text style={sharedStyles.buttonText}>{t("duel.retryLowScore", { score: duelRetryScoreThreshold })}</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {duelCanRun && !playerNeedsManualStart && !awaitingOpponentResult && playableDuel && (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreText}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
                <Text style={styles.scoreText}>{opponentScore ? `${opponentLabel(activeDuel, user)}: ${displayDuelScore(opponentScore)}` : t("duel.waitingScore")}</Text>
              </View>
              <View style={styles.arena}>
                {countdown > 0 ? (
                  <Text style={styles.countdown}>{countdown}</Text>
                ) : isRunning(playableDuel, now) ? (
                  <>
                    {renderTargets(playableDuel, now, caughtBugIds, hitCounts, assist, hitFeedbackValues, frozenTargetsRef.current, targetTimeOffsetsRef.current, hitBug, t)}
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
              <Text style={styles.resultLine}>{activeDuel.fromUserName}: {displayDuelScore(activeDuel.scores?.[activeDuel.fromUserId])}</Text>
              <Text style={styles.resultLine}>{activeDuel.toUserName}: {displayDuelScore(activeDuel.scores?.[activeDuel.toUserId])}</Text>
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
          <View style={styles.helperHeaderActions}>
            <Pressable accessibilityLabel={t("duel.helperInfoTitle")} style={styles.infoButton} onPress={() => setHelperInfoVisible(true)}>
              <Text style={styles.infoButtonText}>i</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={openSquadModal}>
              <Text style={styles.smallButtonText}>{t("duel.changeSquad")}</Text>
            </Pressable>
          </View>
        </View>
        {renderSquadJars(activeSquadIds, activeSquadBonuses, t, openSquadModal)}
        {renderSquadEffectCards(activeSquadBonuses, t)}
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
                    const spec = helperSpecForBonus(bonus);
                    const selected = activeSquadIds.includes(item.bugId);
                    const disabled = !selected && activeSquadIds.length >= maxActiveBugSquadSize;
                    const spriteKey = helperSpriteKeyForSpec(spec.kind, spec.special);
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
                        <View style={[styles.squadChoiceAttackBadge, selected && styles.squadChoiceAttackBadgeActive]}>
                          <Image accessibilityIgnoresInvertColors resizeMode="contain" source={duelEffectSprites[spriteKey]} style={styles.squadChoiceAttackIcon} />
                          <Text style={[styles.squadChoiceAttack, selected && styles.squadChoiceNameActive]} numberOfLines={1}>{t("duel.helperAttack", { attack: spec.special?.label ?? helperKindLabel(spec.kind, t) })}</Text>
                        </View>
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
      <Modal transparent animationType="fade" visible={helperInfoVisible} onRequestClose={() => setHelperInfoVisible(false)}>
        <View style={styles.startModalBackdrop}>
          <View style={styles.startModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.cardTitle}>{t("duel.helperInfoTitle")}</Text>
                <Text style={styles.modalIntro}>{t("duel.helperInfoIntro")}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setHelperInfoVisible(false)}>
                <Text style={styles.closeButtonText}>x</Text>
              </Pressable>
            </View>
            <View style={styles.helperInfoList}>
              {helperInfoItems.map((item) => (
                <View key={item.name} style={styles.helperInfoItem}>
                  <Text style={styles.helperInfoName}>{item.name}</Text>
                  <Text style={styles.helperInfoBody}>{item.body}</Text>
                </View>
              ))}
            </View>
            <Pressable style={sharedStyles.button} onPress={() => setHelperInfoVisible(false)}>
              <Text style={sharedStyles.buttonText}>{t("common.ok")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {activeDuel && playerNeedsManualStart && (
        <Modal animationType="fade" transparent visible onRequestClose={startAcceptedDuel}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.readyTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.asyncReadyBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Pressable style={sharedStyles.button} onPress={startAcceptedDuel}>
                <Text style={sharedStyles.buttonText}>{t("duel.startNow")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      {activeDuel && (
        <Modal animationType="fade" transparent visible={showWaitingResultModal} onRequestClose={() => void closeWaitingResultAndGoHome()}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.waitingResultTitle")}</Text>
              <Text style={styles.startBody}>{t("duel.waitingResultBody", { name: opponentLabel(activeDuel, user) })}</Text>
              <Text style={styles.resultLine}>{t("duel.yourScore", { score: activeDuelScore })}</Text>
              {canRetryOwnDuelScore ? (
                <Pressable style={sharedStyles.button} onPress={retryOwnDuelScore}>
                  <Text style={sharedStyles.buttonText}>{t("duel.retryLowScore", { score: duelRetryScoreThreshold })}</Text>
                </Pressable>
              ) : null}
              <Pressable disabled={busy} style={sharedStyles.button} onPress={() => void closeWaitingResultAndGoHome()}>
                <Text style={sharedStyles.buttonText}>{busy ? "..." : t("common.ok")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      {activeDuel?.status === "completed" && (
        <Modal animationType="fade" transparent visible={showResultModal} onRequestClose={() => {
          if (!resultRewardPending) void acknowledgeResult();
        }}>
          <View style={styles.startModalBackdrop}>
            <View style={styles.startModalCard}>
              <Text style={styles.startTitle}>{t("duel.resultReadyTitle")}</Text>
              <Text style={styles.startBody}>{resultLabel(activeDuel, user, t)}</Text>
              <Text style={styles.resultLine}>{activeDuel.fromUserName}: {displayDuelScore(activeDuel.scores?.[activeDuel.fromUserId])}</Text>
              <Text style={styles.resultLine}>{activeDuel.toUserName}: {displayDuelScore(activeDuel.scores?.[activeDuel.toUserId])}</Text>
              <Text style={styles.noticeText}>{t("duel.resultReadyBody")}</Text>
              {resultRewardPending ? (
                <Pressable disabled={busy} style={sharedStyles.button} onPress={claimReward}>
                  <Text style={sharedStyles.buttonText}>{busy ? "..." : activeDuel.winnerId === user.uid ? t("duel.claimReward") : t("duel.claimXp")}</Text>
                </Pressable>
              ) : (
                <Pressable disabled={busy} style={sharedStyles.button} onPress={acknowledgeResult}>
                  <Text style={sharedStyles.buttonText}>{busy ? "..." : t("common.ok")}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>
      )}

      {visibleRecentDuels.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("duel.recent")}</Text>
          {visibleRecentDuels.slice(0, 6).map((duel) => {
            const rowOpponentId = duel.fromUserId === user.uid ? duel.toUserId : duel.fromUserId;
            const rowOwnScore = duel.scores?.[user.uid];
            const rowOpponentScore = duel.scores?.[rowOpponentId];
            const rowMeta = rowOpponentScore && !rowOwnScore
              ? `${opponentLabel(duel, user)}: ${displayDuelScore(rowOpponentScore)}`
              : rowOwnScore && !rowOpponentScore
                ? t("duel.yourScore", { score: displayDuelScore(rowOwnScore) })
                : statusLabel(duel, t);
            return (
              <Pressable key={duel.id} style={styles.duelRow} onPress={() => setActiveDuelId(duel.id)}>
                <Text style={styles.duelRowTitle} numberOfLines={1}>{opponentLabel(duel, user)}</Text>
                <Text style={styles.duelRowMeta}>{rowMeta}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function renderSquadJars(
  activeSquadIds: string[],
  bonuses: ReturnType<typeof activeBugSquadBonusList>,
  t: (key: string, params?: Record<string, string | number>) => string,
  onOpen: () => void,
  options: { compact?: boolean; interactive?: boolean } = {}
) {
  const compact = options.compact ?? false;
  const interactive = options.interactive ?? true;
  return (
    <View style={[styles.squadJars, compact && styles.squadJarsCompact]}>
      {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
        const bugId = activeSquadIds[index];
        const entry = bugId ? entryByBugId(bugId) : null;
        const bonus = bonuses.find((item) => item.bugId === bugId);
        return (
          <Pressable key={index} disabled={!interactive} style={styles.squadJarWrap} onPress={onOpen}>
            <View style={[styles.squadJar, compact && styles.squadJarCompact, entry && { borderColor: rarityColors[entry.rarity] }]}>
              <View pointerEvents="none" style={[styles.squadJarLid, compact && styles.squadJarLidCompact, entry && { backgroundColor: rarityColors[entry.rarity], borderColor: rarityColors[entry.rarity] }]} />
              <View pointerEvents="none" style={[styles.squadJarGlow, compact && styles.squadJarGlowCompact, entry && { backgroundColor: `${rarityColors[entry.rarity]}26` }]} />
              <View pointerEvents="none" style={[styles.squadJarShine, compact && styles.squadJarShineCompact]} />
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={squadJarImage} style={[styles.squadJarImage, compact && styles.squadJarImageCompact]} />
              {entry ? (
                <>
                  <View pointerEvents="none" style={[styles.squadJarBugWrap, compact && styles.squadJarBugWrapCompact]}>
                    <BugArtImage bugId={entry.id} size={compact ? 30 : 50} />
                  </View>
                  <Text style={[styles.squadJarRarity, compact && styles.squadJarRarityCompact, { backgroundColor: rarityColors[entry.rarity] }]} numberOfLines={1}>{rarityLabel(entry.rarity, t)}</Text>
                  {!compact && <Text style={styles.squadJarName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>}
                  {!compact && bonus && <Text style={styles.squadJarBonus} numberOfLines={1}>{squadBonusLabel(bonus.category, t)}</Text>}
                </>
              ) : (
                <>
                  <Text style={[styles.squadJarEmpty, compact && styles.squadJarEmptyCompact]}>+</Text>
                  {!compact && <Text style={styles.squadJarBonus}>{t("bugdex.squadEmptySlot")}</Text>}
                </>
              )}
              <View pointerEvents="none" style={[styles.squadJarBase, compact && styles.squadJarBaseCompact]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function renderSquadEffectCards(bonuses: ReturnType<typeof activeBugSquadBonusList>, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!bonuses.length) {
    return <Text style={styles.helperHint}>{t("duel.squadEmptyCollection")}</Text>;
  }
  return (
    <View style={styles.squadEffectList}>
      {bonuses.map((bonus) => {
        const entry = entryByBugId(bonus.bugId);
        const spec = helperSpecForBonus(bonus);
        const title = spec.special?.label ?? helperKindLabel(spec.kind, t);
        return (
          <View key={bonus.bugId} style={[styles.squadEffectCard, { borderColor: spec.color }]}>
            <View style={styles.squadEffectIcon}>
              <BugArtImage bugId={bonus.bugId} size={36} />
            </View>
            <View style={styles.squadEffectCopy}>
              <View style={styles.squadEffectTitleRow}>
                <Text style={styles.squadEffectName} numberOfLines={1}>{entry ? bugDexEntryName(entry, t) : bonus.bugId}</Text>
                <Text style={[styles.squadEffectRole, { color: spec.color }]} numberOfLines={1}>{title}</Text>
              </View>
              <Text style={styles.squadEffectBody}>{helperEffectDescription(bonus, spec, t)}</Text>
            </View>
          </View>
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
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={squadJarImage} style={styles.helperTowerJarImage} />
            <HelperTowerPulse color={spec.color} ready={readyAt !== undefined && cooldownLeft <= 0} />
            <View style={styles.helperTowerBugWrap}>
              <BugArtImage bugId={bonus.bugId} size={38} />
            </View>
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
  onHit: (bugId: string) => void,
  t: ReturnType<typeof useI18n>["t"],
  soloCampaign?: SoloCampaignConfig | null
) {
  return collectRenderedTargets(duel, timestamp, caughtBugIds, assist, frozenTargets, targetTimeOffsets, soloCampaign)
    .map(({ bugId, entry, index, motion }) => {
    const frozen = Boolean(frozenTargets[bugId] && timestamp < frozenTargets[bugId].until);
    const bossLevel = soloBossLevelForTarget(duel, index, soloCampaign);
    const requiredTaps = requiredTapsForTarget(entry.rarity, assist, index, 1, bossLevel);
    const hits = hitCounts[bugId] ?? 0;
    const feedback = hitFeedbackValues.get(bugId);
    const targetSize = bossLevel ? 112 + bossLevel * 7 : Math.round(46 * assist.hitboxMultiplier * targetHitboxMultiplierForRarity(entry.rarity));
    const bugArtSize = bossLevel ? targetSize - 12 : Math.min(46, Math.round(38 * targetHitboxMultiplierForRarity(entry.rarity)));
    const bossMechanic = bossLevel ? soloBossMechanicForLevel(bossLevel, motion.progress) : null;
    return (
      <Pressable
        key={bugId}
        style={[
          styles.target,
          bossLevel > 0 && styles.bossTarget,
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
        onPressIn={() => onHit(bugId)}
      >
        {feedback && <BugSwatterHit bugSize={44} feedback={feedback} style={styles.targetSwatter} />}
        {frozen && (
          <View pointerEvents="none" style={styles.targetFreezeBadge}>
            <Text style={styles.targetFreezeText}>TIME</Text>
          </View>
        )}
        <View pointerEvents="none" style={[styles.targetRarityBadge, { backgroundColor: rarityColors[entry.rarity] }]}>
          <Text style={styles.targetRarityText} numberOfLines={1}>{rarityLabel(entry.rarity, t)}</Text>
        </View>
        {bossLevel > 0 ? (
          <>
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={soloBossImageForLevel(bossLevel)} style={{ height: bugArtSize, width: bugArtSize }} />
            <Text style={styles.bossTargetLabel}>BOSS L{bossLevel}</Text>
            {bossMechanic && (
              <View pointerEvents="none" style={[styles.bossMechanicBadge, bossMechanic.active && styles.bossMechanicBadgeActive, { borderColor: bossMechanic.color }]}>
                <Text style={[styles.bossMechanicText, bossMechanic.active && { color: bossMechanic.color }]}>{bossMechanic.active ? `${bossMechanic.activeLabel} +${bossMechanic.bonus}` : bossMechanic.label}</Text>
              </View>
            )}
          </>
        ) : (
          <DuelTargetBugArt bugId={bugId} size={bugArtSize} />
        )}
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
  targetTimeOffsets: Record<string, number> = {},
  soloCampaign?: SoloCampaignConfig | null
): VisibleDuelTarget[] {
  const startAt = duel.startAt ? Date.parse(duel.startAt) : timestamp;
  const elapsed = timestamp - startAt;
  return duel.bugIds.flatMap((bugId, index) => {
    if (caughtBugIds.includes(bugId)) return [];
    const entry = entryByBugId(bugId);
    if (!entry) return [];
    const bossLevel = soloBossLevelForTarget(duel, index, soloCampaign);
    const frozenTarget = frozenTargets[bugId];
    const frozen = Boolean(frozenTarget && timestamp < frozenTarget.until);
    const motion = frozen && frozenTarget
      ? frozenTarget.motion
      : targetMotion(index, duel.seed, elapsed - (targetTimeOffsets[bugId] ?? 0), entry.rarity, assist, bossLevel, soloCampaign?.spawnSpacingMultiplier ?? 1, duel.durationMs, duel.bugIds.length);
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
  targetTimeOffsets: Record<string, number> = {},
  soloCampaign?: SoloCampaignConfig | null
): VisibleDuelTarget[] {
  return collectVisibleTargets(duel, timestamp, caughtBugIds, assist, frozenTargets, targetTimeOffsets, soloCampaign)
    .sort((a, b) => targetPriority(b.entry.rarity, b.motion.progress, soloBossLevelForTarget(duel, b.index, soloCampaign)) - targetPriority(a.entry.rarity, a.motion.progress, soloBossLevelForTarget(duel, a.index, soloCampaign)))
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
  if (category === "movement_boost") return 0.5;
  if (category === "combo_boost") return 0.9;
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
  const tierAdvantage = kind === "burst" && helperRank >= targetRank + 2 ? 1 : 0;
  const premiumHelperBonus = kind === "zap" && helperRank >= 3 && targetRank > 0 && targetRank <= helperRank ? 1 : 0;
  const specialBonus = helperSpecialBonusHits(special, target, remaining);
  const kindBonus = special ? 0 : helperKindBonusHits(kind, target, remaining);
  const damage = Math.max(1, baseDamage - resistance + tierAdvantage + premiumHelperBonus + specialBonus + kindBonus);
  return Math.min(remaining, damage);
}

function helperKindBonusHits(kind: HelperImpactKind, target: VisibleDuelTarget, remaining: number) {
  if (kind === "sticky") return remaining > 3 ? 1 : 0;
  if (kind === "shield") return target.motion.progress > 0.82 ? 1 : 0;
  if (kind === "zap") return target.entry.rarity !== "Gewoon" ? 1 : 0;
  if (kind === "splash") return remaining > 2 ? 1 : 0;
  return 0;
}

function helperControlMsForKind(kind: HelperImpactKind, rarity: BugDexRarity, progress: number) {
  const rarityBonus = helperControlBonusMsForRarity(rarity);
  if (kind === "sticky") return 520 + rarityBonus;
  if (kind === "shield" && progress > 0.45) return 480 + rarityBonus + (progress > 0.78 ? 180 : 0);
  return 0;
}

function helperSpecialBonusHits(special: MythicSpecialSpec | undefined, target: VisibleDuelTarget, remaining: number) {
  if (!special) return 0;
  const targetRank = helperRarityRank(target.entry.rarity);
  if (special.kind === "bloom_blade") return remaining <= 3 ? 1 : 0;
  if (special.kind === "pattern_break" && targetRank >= 2) return 1;
  if (special.kind === "longneck_scout" && targetRank >= 3) return 1;
  if (special.kind === "mirror_guard" && target.motion.progress > 0.82) return 1;
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
  if (rarity === "Mythisch") return 5;
  if (rarity === "Legendarisch") return 4;
  if (rarity === "Episch") return 3;
  if (rarity === "Zeldzaam") return 2;
  return 1;
}

function helperControlBonusMsForRarity(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 820;
  if (rarity === "Legendarisch") return 620;
  if (rarity === "Episch") return 420;
  if (rarity === "Zeldzaam") return 220;
  return 0;
}

function helperCooldownMsForRarity(rarity: BugDexRarity) {
  if (rarity === "Mythisch") return 4300;
  if (rarity === "Legendarisch") return 5200;
  if (rarity === "Episch") return 6500;
  if (rarity === "Zeldzaam") return 7900;
  return 9400;
}

function helperInitialCooldownMs(cooldownMs: number, helperIndex: number) {
  return Math.round(cooldownMs * Math.max(0.34, 0.62 - helperIndex * 0.12));
}

function helperInitialCharge(helperIndex: number) {
  return Math.min(0.56, Math.max(0.32, 0.38 + helperIndex * 0.08));
}

function helperMaxTargetProgress(bonus: ReturnType<typeof activeBugSquadBonusList>[number]) {
  const rank = helperRarityRank(bonus.rarity);
  if (helperKindForCategory(bonus.category) === "shield") return Math.min(0.97, 0.9 + rank * 0.018);
  return Math.min(0.92, 0.84 + rank * 0.018);
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
  return bugSquadAttackKindForCategory(category);
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

function helperEffectDescription(
  bonus: ReturnType<typeof activeBugSquadBonusList>[number],
  spec: ReturnType<typeof helperSpecForBonus>,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const hits = helperBaseHitsForRarity(bonus.rarity);
  const cooldown = Math.round(spec.cooldownMs / 1000);
  if (spec.special) {
    return t(`duel.helperSpecial.${spec.special.kind}`, { cooldown, hits });
  }
  if (spec.kind === "zap") return t("duel.helperEffect.zap", { cooldown, hits });
  if (spec.kind === "splash") return t("duel.helperEffect.splash", { cooldown, hits, targets: Math.max(1, spec.splashTargets + 1) });
  if (spec.kind === "sticky") return t("duel.helperEffect.sticky", { cooldown, hits });
  if (spec.kind === "shield") return t("duel.helperEffect.shield", { cooldown, hits });
  return t("duel.helperEffect.burst", { cooldown, hits });
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

function helperSpriteKeyForSpec(kind: HelperImpactKind, special?: MythicSpecialSpec): DuelEffectSpriteKey {
  if (special?.kind === "royal_freeze" || special?.kind === "candy_slow") return "freeze";
  if (special?.kind === "bloom_blade") return "slash";
  if (special?.kind === "mirror_guard") return "shield";
  if (special?.kind === "pattern_break") return "goo";
  if (special?.kind === "prism_chain" || special?.kind === "lantern_signal" || special?.kind === "longneck_scout") return "lightning";
  if (kind === "zap") return "lightning";
  if (kind === "sticky") return "goo";
  if (kind === "shield") return "shield";
  if (kind === "splash") return "fireball";
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

function targetPriority(rarity: BugDexRarity, progress: number, bossLevel = 0) {
  const rarityValue = scoreByRarity[rarity];
  const urgency = progress > 0.72 ? 2 : progress > 0.48 ? 1 : 0;
  return rarityValue + urgency + bossLevel * 20;
}

function targetMotion(index: number, seed: number, elapsedMs: number, rarity: BugDexRarity, assist: BugSmashDuelBalance, bossLevel = 0, spawnSpacingMultiplier = 1, duelDurationMs = bugSmashDuelDurationMs, targetCount = bugSmashDuelBugCount) {
  const lane = (index * 37 + seed) % 82;
  const wave = (index % 5) + 2;
  const rarityLifetime = rarity === "Gewoon" ? 3900 : rarity === "Zeldzaam" ? 5000 : rarity === "Episch" ? 6200 : rarity === "Legendarisch" ? 7400 : 8600;
  const duration = rarityLifetime * assist.speedMultiplier * (bossLevel > 0 ? 2.8 + bossLevel * 0.25 : 1);
  const lastSpawnAt = Math.max(0, duelDurationMs - duelTargetFinalSpawnBufferMs);
  const spawnSpacing = (targetCount > 1 ? lastSpawnAt / (targetCount - 1) : lastSpawnAt) * Math.max(0.5, Math.min(1.1, spawnSpacingMultiplier));
  const spawnJitter = Math.min(260, Math.max(0, spawnSpacing * 0.35));
  const spawnStart = bossLevel > 0 ? 260 : Math.min(lastSpawnAt, index * spawnSpacing + ((seed + index * 173) % Math.max(1, Math.round(spawnJitter))));
  const progress = (elapsedMs - spawnStart) / duration;
  if (progress < 0 || progress > 1) return { visible: false, progress, x: 0, y: 0, rotate: 0 };
  if (bossLevel > 0) {
    const x = 5 + progress * 78;
    const y = Math.max(5, Math.min(70, 26 + bossLevel * 5 + Math.sin(progress * Math.PI * 3 + seed) * 9));
    const rotate = Math.sin(progress * Math.PI * 2) * 5;
    return { visible: true, progress, x, y, rotate };
  }
  const direction = index % 2 === 0 ? 1 : -1;
  const x = direction === 1 ? -12 + progress * 114 : 100 - progress * 114;
  const crawl = Math.sin(progress * Math.PI * wave + index) * 10 + Math.sin(progress * Math.PI * 7 + seed) * 2;
  const y = Math.max(4, Math.min(86, lane + crawl));
  const rotate = direction * (Math.sin(progress * Math.PI * 2 + index) * 15 + 8);
  return { visible: true, progress, x, y, rotate };
}

function requiredTapsForTarget(rarity: BugDexRarity, assist: BugSmashDuelBalance, targetIndex: number, multiplier = 1, bossLevel = 0) {
  const focusReduction = bossLevel > 0 ? 0 : targetIndex >= 0 && targetIndex < assist.focusEasyHits ? 1 : 0;
  return Math.max(1, Math.ceil((baseTapsByRarity[rarity] - focusReduction) * multiplier * soloBossTapMultiplier(bossLevel)));
}

function soloBossLevelForTarget(duel: BugSmashDuel, targetIndex: number, soloCampaign?: SoloCampaignConfig | null) {
  if (!soloCampaign?.boss || duel.toUserId !== "bugbot" || targetIndex !== 0) return 0;
  return Math.max(1, Math.min(soloCampaignMaxLevel, soloCampaign.level));
}

function soloBossTapMultiplier(level: number) {
  return level > 0 ? 2.8 + level * 0.9 : 1;
}

function soloBossScoreBonus(level: number) {
  return level > 0 ? 16 + level * 6 : 0;
}

function soloBossBreakBonus(level: number) {
  return level > 0 ? 5 + level * 2 : 0;
}

function soloBossBreakBonusForCatch(
  duel: BugSmashDuel,
  targetIndex: number,
  soloCampaign: SoloCampaignConfig | null,
  timestamp: number,
  assist: BugSmashDuelBalance,
  targetTimeOffset: number
) {
  const bossLevel = soloBossLevelForTarget(duel, targetIndex, soloCampaign);
  if (!bossLevel) return 0;
  const bugId = duel.bugIds[targetIndex];
  const entry = entryByBugId(bugId);
  if (!entry) return 0;
  const startAt = duel.startAt ? Date.parse(duel.startAt) : timestamp;
  const motion = targetMotion(targetIndex, duel.seed, timestamp - startAt - targetTimeOffset, entry.rarity, assist, bossLevel, soloCampaign?.spawnSpacingMultiplier ?? 1, duel.durationMs, duel.bugIds.length);
  const mechanic = soloBossMechanicForLevel(bossLevel, motion.progress);
  return mechanic.active ? mechanic.bonus : 0;
}

function soloBossMechanicForLevel(level: number, progress: number) {
  const specs = [
    { activeLabel: "CRACK", color: "#facc15", label: "ARMOR", windowEnd: 0.72, windowStart: 0.48 },
    { activeLabel: "PUNISH", color: "#fb7185", label: "DASH", windowEnd: 0.66, windowStart: 0.42 },
    { activeLabel: "CORE", color: "#38bdf8", label: "SHIELD", windowEnd: 0.78, windowStart: 0.56 },
    { activeLabel: "CLEAR", color: "#f97316", label: "SWARM", windowEnd: 0.74, windowStart: 0.5 },
    { activeLabel: "RESET", color: "#a78bfa", label: "RAGE", windowEnd: 0.7, windowStart: 0.46 }
  ];
  const spec = specs[Math.max(1, Math.min(soloCampaignMaxLevel, level)) - 1];
  const cycleCount = 3 + level;
  const phase = ((Math.max(0, Math.min(1, progress)) * cycleCount) + level * 0.17) % 1;
  return {
    ...spec,
    active: phase >= spec.windowStart && phase <= spec.windowEnd,
    bonus: soloBossBreakBonus(level)
  };
}

function soloBossImageForLevel(level: number) {
  const safeLevel = Math.max(1, Math.min(soloCampaignMaxLevel, level)) as keyof typeof soloBossImages;
  return soloBossImages[safeLevel];
}

function duelCatchBonusPoints(rarity: BugDexRarity, bugId: string, assist: BugSmashDuelBalance) {
  const rareBonus = rarity !== "Gewoon" && stableChance(`${bugId}:rare`, assist.radarRarePointChance) ? 1 : 0;
  const xpBonus = stableChance(`${bugId}:xp`, assist.xpDuplicatePointChance) ? 1 : 0;
  return Math.min(1, rareBonus + xpBonus);
}

function duelComboBonusPoint(combo: number, comboBonusEvery = 5) {
  const every = Math.max(2, comboBonusEvery);
  return combo > 0 && combo % every === 0 ? 1 : 0;
}

function duelBonusScore(score: number, assist: BugSmashDuelBalance) {
  const supportBonus = assist.supportBonusEvery > 0 ? Math.min(3, Math.floor(score / assist.supportBonusEvery)) : 0;
  const movementBonus = score >= 12 ? assist.movementFinalBonusCap : 0;
  return supportBonus + movementBonus;
}

function displayDuelScore(score?: BugSmashDuelScore) {
  if (!score) return 0;
  return Math.max(score.score, minimumDuelScoreForCaughtBugIds(score.caughtBugIds, score.bonusScore));
}

function normalizeDuelScore(score: BugSmashDuelScore): BugSmashDuelScore {
  return {
    ...score,
    caughtBugIds: [...score.caughtBugIds],
    bonusScore: Math.max(0, score.bonusScore),
    score: Math.max(0, displayDuelScore(score))
  };
}

function preferredDuelScore(existing: BugSmashDuelScore | undefined, candidate: BugSmashDuelScore): BugSmashDuelScore {
  if (!existing) return candidate;
  const existingScore = displayDuelScore(existing);
  const candidateScore = displayDuelScore(candidate);
  if (candidateScore > existingScore) return candidate;
  if (candidateScore === existingScore && candidate.caughtBugIds.length > existing.caughtBugIds.length) return candidate;
  return normalizeDuelScore(existing);
}

function minimumDuelScoreForCaughtBugIds(caughtBugIds: string[], bonusScore: number) {
  return caughtBugIds.reduce((total, bugId, index) => {
    const entry = entryByBugId(bugId);
    const catchScore = entry ? scoreByRarity[entry.rarity] : 0;
    return total + catchScore + duelComboBonusPoint(index + 1);
  }, 0) + Math.max(0, bonusScore);
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

function isActiveDuelBetweenUsers(duel: BugSmashDuel, firstUserId: string, secondUserId: string) {
  const samePair = (duel.fromUserId === firstUserId && duel.toUserId === secondUserId)
    || (duel.fromUserId === secondUserId && duel.toUserId === firstUserId);
  return samePair && (duel.status === "pending" || duel.status === "accepted");
}

function duelDailyRewardClaimedAgainstOpponent(duels: BugSmashDuel[], userId: string, opponentId: string) {
  return duels.some((duel) => {
    const samePair = (duel.fromUserId === userId && duel.toUserId === opponentId)
      || (duel.fromUserId === opponentId && duel.toUserId === userId);
    if (!samePair || duel.status !== "completed" || !(duel.rewardClaimedBy ?? []).includes(userId)) return false;
    return localDayIdFromIso(duel.updatedAt) === localDayIdFromIso(new Date().toISOString());
  });
}

function localDayIdFromIso(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function duelResultSeenByUser(duel: BugSmashDuel, user: User) {
  return (duel.resultSeenBy ?? []).includes(user.uid) || (duel.rewardClaimedBy ?? []).includes(user.uid);
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
  arenaModeButton: {
    backgroundColor: "#f8fbf5",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: "hidden"
  },
  arenaModeButtonActive: {
    borderColor: "#d7bd57",
    borderWidth: 2,
    shadowColor: "#d7bd57",
    shadowOpacity: 0.18,
    shadowRadius: 6
  },
  arenaModeCopy: {
    backgroundColor: "#ffffff",
    minHeight: 46,
    paddingHorizontal: 6,
    paddingVertical: 6
  },
  arenaModeImage: {
    height: 58,
    width: "100%"
  },
  arenaModeMeta: {
    color: "#65736c",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
    textAlign: "center"
  },
  arenaModeMetaActive: {
    color: "#5b4a10"
  },
  arenaModeRow: {
    flexDirection: "row",
    gap: 8
  },
  arenaSquadPreview: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  arenaSquadPreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 8
  },
  arenaSquadPreviewMeta: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  arenaSquadPreviewTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  arenaModeText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center"
  },
  arenaModeTextActive: {
    color: "#8b6f14"
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
  helperHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
  helperInfoBody: {
    color: "#53645d",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  helperInfoItem: {
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  helperInfoList: {
    gap: 8,
    marginBottom: 14,
    marginTop: 8
  },
  helperInfoName: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900",
    width: 68
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
  infoButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  infoButtonText: {
    color: "#d7bd57",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18
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
    backgroundColor: "rgba(16,32,24,0.5)",
    borderRadius: 8,
    borderWidth: 1,
    height: 74,
    justifyContent: "center",
    paddingTop: 4,
    position: "relative",
    overflow: "hidden",
    width: 64
  },
  helperTowerBugWrap: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginTop: 1,
    width: 46,
    zIndex: 2
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
  helperTowerJarImage: {
    bottom: -9,
    left: -10,
    opacity: 0.9,
    position: "absolute",
    right: -10,
    top: -8,
    zIndex: 0
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
    padding: 10,
    position: "relative"
  },
  opponentActionBadge: {
    alignItems: "center",
    backgroundColor: "#c7352b",
    borderColor: "#fdfefb",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -6,
    top: -7,
    zIndex: 2
  },
  opponentActionBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13
  },
  opponentButtonBlocked: {
    opacity: 0.45
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
  soloPowerupGameBar: {
    bottom: 14,
    flexDirection: "row",
    gap: 8,
    left: 14,
    position: "absolute",
    zIndex: 11
  },
  soloPowerupGameButton: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.88)",
    borderColor: "rgba(215,189,87,0.7)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  soloPowerupGameIcon: {
    borderRadius: 6,
    height: 28,
    width: 28
  },
  soloPowerupGameText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  soloPowerupCopy: {
    flex: 1,
    minWidth: 0
  },
  soloPowerupDisabled: {
    opacity: 0.45
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
  squadChoiceAttack: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    flex: 1,
    textAlign: "center"
  },
  squadChoiceAttackBadge: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: "100%"
  },
  squadChoiceAttackBadgeActive: {
    backgroundColor: "#234435",
    borderColor: "#69c88d"
  },
  squadChoiceAttackIcon: {
    height: 20,
    width: 20
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
  squadEffectBody: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3
  },
  squadEffectCard: {
    alignItems: "center",
    backgroundColor: "#f6fbf4",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  squadEffectCopy: {
    flex: 1,
    minWidth: 0
  },
  squadEffectIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4ece5",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  squadEffectList: {
    gap: 8,
    marginTop: 10
  },
  squadEffectName: {
    color: "#102018",
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  squadEffectRole: {
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 118,
    textAlign: "right"
  },
  squadEffectTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
  squadJarCompact: {
    backgroundColor: "rgba(232,246,239,0.3)",
    height: 54,
    padding: 3
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
  squadJarBugWrapCompact: {
    marginTop: 2
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
  squadJarBaseCompact: {
    bottom: 3,
    height: 4,
    left: 9,
    right: 9
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
  squadJarEmptyCompact: {
    color: "#d7bd57",
    fontSize: 20
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
  squadJarGlowCompact: {
    bottom: 7,
    height: 32,
    width: 38
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
  squadJarImageCompact: {
    bottom: -10,
    left: -12,
    opacity: 0.82,
    right: -12,
    top: -8
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
  squadJarLidCompact: {
    height: 7,
    marginBottom: -1,
    width: 42
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
  squadJarRarity: {
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 2,
    maxWidth: "92%",
    overflow: "hidden",
    paddingHorizontal: 5,
    paddingVertical: 1,
    textAlign: "center",
    zIndex: 4
  },
  squadJarRarityCompact: {
    bottom: 2,
    fontSize: 7,
    left: 5,
    marginTop: 0,
    paddingHorizontal: 3,
    position: "absolute",
    right: 5
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
  squadJarShineCompact: {
    height: 24,
    left: 6,
    top: 6,
    width: 7
  },
  squadJars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  squadJarsCompact: {
    gap: 6,
    marginBottom: 6
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
  bossTarget: {
    backgroundColor: "rgba(16,32,24,0.9)",
    borderRadius: 12,
    borderWidth: 3,
    shadowColor: "#d7bd57",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12
  },
  bossTargetLabel: {
    backgroundColor: "#d7bd57",
    borderRadius: 6,
    color: "#102018",
    fontSize: 8,
    fontWeight: "900",
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    top: -10
  },
  bossMechanicBadge: {
    backgroundColor: "rgba(16,32,24,0.88)",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    bottom: -10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    position: "absolute"
  },
  bossMechanicBadgeActive: {
    backgroundColor: "rgba(253,254,251,0.94)",
    shadowColor: "#d7bd57",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8
  },
  bossMechanicText: {
    color: "#d7bd57",
    fontSize: 8,
    fontWeight: "900"
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
  targetRarityBadge: {
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    borderWidth: 1,
    left: -5,
    minWidth: 40,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    top: -11,
    zIndex: 5
  },
  targetRarityText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "900",
    lineHeight: 9,
    textAlign: "center"
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
