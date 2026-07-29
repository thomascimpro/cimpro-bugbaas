import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Animated, Image, Modal, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { CrownGlow } from "../components/CrownGlow";
import { CrownUpgradeModal } from "../components/CrownUpgradeModal";
import { BugJarArt } from "../components/BugJarArt";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugDexUnlockModal } from "../components/BugDexUnlockModal";
import {
  BugDexCategoryEmblem,
  LockedBugSilhouette,
  RarityMarks,
  SpecimenFrame,
  specimenRarityAccent
} from "../components/collection/SpecimenArchiveVisuals";
import { MythicRarityFrame } from "../components/MythicRarityFrame";
import { TradeAnimationModal } from "../components/TradeAnimationModal";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { nativeDriver } from "../services/animationPlatform";
import { BugDexDropResult, DailyUpgradeUsage, bugDexInventoryMap, combineBugDexDuplicates, combineDifferentBugDexUpgrade, combineRequiredCount, differentUpgradeRequiredCount, entryByBugId, getDailyUpgradeUsage, listBugDexInventory, listBugDexUnlocks } from "../services/bugDexService";
import { allBugDexSetId, bugDexSetById, bugDexSets } from "../services/bugDexSetService";
import { bugMasteryLevelCap, bugMasteryNextUnlockLevel, bugMasterySessionSkill, bugMasterySkills, bugMasteryUnlockedSkills, bugMasteryXpForNextLevel, copyBugMasteryForTrade, listBugMastery, normalizeBugMastery } from "../services/bugMasteryService";
import { bugCrownPowerMultiplier, bugCrownProgress, bugCrownRankForMastery, type BugCrownRank } from "../services/bugCrownService";
import { activeBugSquadBonusList, maxActiveBugSquadSize, sanitizeActiveBugSquad, BugSquadBonusCategory } from "../services/bugSquadService";
import { bugSquadHelperInfo, helperEffectDescription } from "../services/bugSquadHelperInfo";
import { bugDexEntryName, bugDexEntryNote, bugDexEntryTitle, rarityLabel, useI18n } from "../services/i18n";
import { notifyTradeAccepted, notifyTradeRequest } from "../services/notificationService";
import { bugDexEntries, BugDexEntry, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { cancelTradeRequest, createTradeRequest, listTradeRequests, markTradeRequesterSeen, respondToTradeRequest } from "../services/tradeService";
import { listUsersLight, updateUserBugSquad } from "../services/userService";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { BugDexInventoryItem, BugDexUnlock, BugMastery, BugMasterySkill, TradeRequest, User } from "../types";
import { sortCollectionEntriesByLatest } from "./CollectionScreenModel";
import { sharedStyles } from "./sharedStyles";

type Props = {
  embedded?: boolean;
  openTradeRequest?: number;
  onOpenMuseum?: () => void;
  onUserUpdated?: (user: User) => void;
  user: User;
  onBack: () => void;
};

type UpgradeRarity = Exclude<BugDexRarity, "Mythisch">;
type DexRarityFilter = BugDexRarity | "all";
type TradeRoleFilter = BugMastery["role"] | "all";
type TradeCopyOption = { bugId: string; copyNumber: number; item: BugDexInventoryItem; key: string; totalCopies: number };

const rarityColors: Record<BugDexRarity, string> = specimenRarityAccent;
const rarityStars: Record<BugDexRarity, string> = {
  Gewoon: "★",
  Zeldzaam: "★★",
  Episch: "★★★",
  Legendarisch: "★★★★",
  Mythisch: "★★★★★"
};
const raritySortOrder: Record<BugDexRarity, number> = {
  Mythisch: 0,
  Legendarisch: 1,
  Episch: 2,
  Zeldzaam: 3,
  Gewoon: 4
};
const upgradeRarities: UpgradeRarity[] = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch"];
const rarityFilters: DexRarityFilter[] = ["all", "Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"];
const tradeRoleFilters: TradeRoleFilter[] = ["all", "attack", "speed", "shield", "chaos", "support"];
const emptyUpgradeSelections: Record<UpgradeRarity, string[]> = {
  Gewoon: [],
  Zeldzaam: [],
  Episch: [],
  Legendarisch: []
};
const nextRarityLabel: Record<UpgradeRarity, BugDexRarity> = {
  Gewoon: "Zeldzaam",
  Zeldzaam: "Episch",
  Episch: "Legendarisch",
  Legendarisch: "Mythisch"
};
const emptyDailyUpgradeUsage: DailyUpgradeUsage = {
  "Gewoon-Zeldzaam": false,
  "Zeldzaam-Episch": false,
  "Episch-Legendarisch": false,
  "Legendarisch-Mythisch": false
};
const activeBugSquadHeroImage = require("../../assets/generated/active-bug-squad-selection-hd.jpg");
const bugDexWorkshopImage = require("../../assets/generated/bugdex-workshop-shortcut.webp");
const bugDexUpgradeImage = require("../../assets/generated/bugdex-upgrades-button-hd.jpg");
const rarityStarImage = require("../../assets/buddy/kenney/extracted/ui-pack/PNG/Yellow/Default/star.png");
const maxTradeBugSelection = 6;
const bugDexCardBatchSize = 24;
const tradeOptionBatchSize = 24;

const completedTradeStorageKey = (uid: string) => `bugbaas:seenCompletedTrades:${uid}`;

async function readClosedCompletedTradeIds(uid: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(completedTradeStorageKey(uid));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function saveClosedCompletedTradeId(uid: string, tradeId: string): Promise<void> {
  const current = await readClosedCompletedTradeIds(uid);
  if (current.includes(tradeId)) return;
  await AsyncStorage.setItem(completedTradeStorageKey(uid), JSON.stringify([...current, tradeId]));
}

function VisibilityIcon({ active, slashed }: { active: boolean; slashed: boolean }) {
  return (
    <View style={styles.visibilityIcon}>
      <View style={[styles.visibilityEye, active && styles.visibilityEyeActive]}>
        <View style={[styles.visibilityPupil, active && styles.visibilityPupilActive]} />
      </View>
      {slashed && <View style={styles.visibilitySlash} />}
    </View>
  );
}

function RarityStars({ compact = false, rarity, style }: { compact?: boolean; rarity: BugDexRarity; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.rarityStarsPill, compact && styles.rarityStarsPillCompact, { backgroundColor: rarityColors[rarity] }, style]}>
      <Text style={[styles.rarityStarsText, compact && styles.rarityStarsTextCompact]}>{rarityStars[rarity]}</Text>
    </View>
  );
}

function RarityStarImages({ rarity, size = 10 }: { rarity: BugDexRarity; size?: number }) {
  return (
    <View style={styles.rarityImageStarsRow}>
      {Array.from({ length: rarityStars[rarity].length }, (_, index) => (
        <Image key={index} resizeMode="contain" source={rarityStarImage} style={{ height: size, width: size }} />
      ))}
    </View>
  );
}

function RarityUpgradeRoute({ rarity, targetRarity, label }: { rarity: BugDexRarity; targetRarity: BugDexRarity; label: string }) {
  return (
    <View accessibilityLabel={label} style={styles.rarityUpgradeRoute}>
      <RarityStars compact rarity={rarity} />
      <Text style={styles.rarityUpgradeArrow}>→</Text>
      <RarityStars compact rarity={targetRarity} />
    </View>
  );
}

export function BugDexScreen({ embedded = false, openTradeRequest = 0, onOpenMuseum, onUserUpdated, user, onBack }: Props) {
  const { t, tr } = useI18n();
  const layout = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [unlockHistory, setUnlockHistory] = useState<BugDexUnlock[]>([]);
  const [masteryByBugId, setMasteryByBugId] = useState<Record<string, BugMastery>>({});
  const [masteryByUserId, setMasteryByUserId] = useState<Record<string, Record<string, BugMastery>>>({});
  const [inventoriesByUserId, setInventoriesByUserId] = useState<Record<string, BugDexInventoryItem[]>>({});
  const [unlocksByUserId, setUnlocksByUserId] = useState<Record<string, BugDexUnlock[]>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<BugDexInventoryItem[]>([]);
  const [recipientUnlockHistory, setRecipientUnlockHistory] = useState<BugDexUnlock[]>([]);
  const [recipientUnlocksLoaded, setRecipientUnlocksLoaded] = useState(false);
  const [drop, setDrop] = useState<BugDexDropResult | null>(null);
  const [completedTrade, setCompletedTrade] = useState<TradeRequest | null>(null);
  const [closedCompletedTradeIds, setClosedCompletedTradeIds] = useState<string[]>([]);
  const [closedCompletedTradeIdsLoaded, setClosedCompletedTradeIdsLoaded] = useState(false);
  const [activeSquadIds, setActiveSquadIds] = useState<string[]>(sanitizeActiveBugSquad(user.activeBugSquad));
  const [squadBusyId, setSquadBusyId] = useState("");
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [tradeOfferCopyKeys, setTradeOfferCopyKeys] = useState<string[]>([]);
  const [tradeOfferRarityFilter, setTradeOfferRarityFilter] = useState<DexRarityFilter>("all");
  const [tradeOfferRoleFilter, setTradeOfferRoleFilter] = useState<TradeRoleFilter>("all");
  const [tradeOfferSearch, setTradeOfferSearch] = useState("");
  const [tradeRecipientId, setTradeRecipientId] = useState("");
  const [tradeRequestCopyKeys, setTradeRequestCopyKeys] = useState<string[]>([]);
  const [tradeRequestRarityFilter, setTradeRequestRarityFilter] = useState<DexRarityFilter>("all");
  const [tradeRequestRoleFilter, setTradeRequestRoleFilter] = useState<TradeRoleFilter>("all");
  const [tradeRequestSearch, setTradeRequestSearch] = useState("");
  const [tradeBusy, setTradeBusy] = useState("");
  const [tradeError, setTradeError] = useState("");
  const [showLocked, setShowLocked] = useState(false);
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<DexRarityFilter>("all");
  const [selectedSetId, setSelectedSetId] = useState(allBugDexSetId);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [tradeExpanded, setTradeExpanded] = useState(false);
  const [upgradeExpanded, setUpgradeExpanded] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [dailyUpgradeUsage, setDailyUpgradeUsage] = useState<DailyUpgradeUsage>(emptyDailyUpgradeUsage);
  const [upgradeSelections, setUpgradeSelections] = useState<Record<UpgradeRarity, string[]>>(emptyUpgradeSelections);
  const [selectedBugId, setSelectedBugId] = useState("");
  const [crownUpgrade, setCrownUpgrade] = useState<{ bugId: string; rank: Exclude<BugCrownRank, "none"> } | null>(null);
  const [visibleCardCount, setVisibleCardCount] = useState(bugDexCardBatchSize);
  const [visibleTradeOfferCount, setVisibleTradeOfferCount] = useState(tradeOptionBatchSize);
  const [visibleTradeRequestCount, setVisibleTradeRequestCount] = useState(tradeOptionBatchSize);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [dashboardPage, setDashboardPage] = useState(0);
  const dashboardIntro = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const squadSectionY = useRef(0);
  const tradeSectionY = useRef(0);
  const upgradeSectionY = useRef(0);
  const dexSectionY = useRef(0);
  const previousCrownRanks = useRef<Record<string, BugCrownRank>>({});
  const crownRanksInitialized = useRef(false);
  const inventoryById = bugDexInventoryMap(inventory);
  const unlockById = Object.fromEntries(unlockHistory.map((item) => [item.bugId, item]));
  const tier = getTierForPoints(user.totalPoints);
  const unlockedCount = inventory.length;
  const unlockedBugIds = new Set([...inventory.map((item) => item.bugId), ...unlockHistory.map((item) => item.bugId)]);
  const everUnlockedCount = unlockedBugIds.size;
  const totalCount = bugDexEntries.length;
  const progress = Math.round((everUnlockedCount / totalCount) * 100);
  const selectedSet = selectedSetId === allBugDexSetId ? null : bugDexSetById(selectedSetId);
  const selectedSetBugIds = selectedSet ? new Set(selectedSet.bugIds) : null;
  const selectedEntries = selectedSetBugIds ? bugDexEntries.filter((entry) => selectedSetBugIds.has(entry.id)) : bugDexEntries;
  const selectedSetOwnedCount = selectedSetBugIds ? [...unlockedBugIds].filter((bugId) => selectedSetBugIds.has(bugId)).length : everUnlockedCount;
  const selectedSetTotalCount = selectedEntries.length;
  const selectedSetProgress = selectedSetTotalCount ? Math.round((selectedSetOwnedCount / selectedSetTotalCount) * 100) : 0;
  const selectedSetLabel = selectedSet ? t(selectedSet.labelKey) : t("bugdex.set.all");
  const selectedSetDescription = selectedSet ? t(selectedSet.descriptionKey) : t("bugdex.set.all.description");
  const unlockedEntries = inventory.map((item) => entryByBugId(item.bugId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const activeSquadEntries = activeSquadIds.map((bugId) => entryByBugId(bugId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const activeSquadCounts = activeSquadIds.reduce<Record<string, number>>((counts, bugId) => {
    counts[bugId] = (counts[bugId] ?? 0) + 1;
    return counts;
  }, {});
  const latestUnlockedEntries = sortCollectionEntriesByLatest(unlockedEntries, inventory, unlockHistory);
  const headerEntry = latestUnlockedEntries[0];
  const dexCards = selectedEntries
    .filter((entry) => selectedRarityFilter === "all" || entry.rarity === selectedRarityFilter)
    .map((entry) => ({ entry, index: bugDexEntries.findIndex((item) => item.id === entry.id), inventoryItem: inventoryById[entry.id], unlockItem: unlockById[entry.id] }))
    .filter(({ inventoryItem }) => showLocked || Boolean(inventoryItem));
  const visibleDexCards = dexCards.slice(0, visibleCardCount);
  const dashboardEntries = latestUnlockedEntries;
  const dashboardPageSize = layout.isCompact ? 2 : 4;
  const dashboardPageCount = Math.max(1, Math.ceil(dashboardEntries.length / dashboardPageSize));
  const dashboardCards = dashboardEntries.slice(dashboardPage * dashboardPageSize, (dashboardPage + 1) * dashboardPageSize);
  const tradeInventory = sortTradeInventory(inventory.filter((item) => item.count > 0));
  const tradeCopyOptions = tradeInventory
    .map((item) => tradeCopyOptionsForItem(item, spendableCountForItem(item))[0])
    .filter((option): option is TradeCopyOption => Boolean(option));
  const filteredTradeCopyOptions = filterTradeOptions(tradeCopyOptions, tradeOfferRarityFilter, tradeOfferRoleFilter, tradeOfferSearch, masteryByBugId);
  const visibleTradeCopyOptions = filteredTradeCopyOptions.slice(0, visibleTradeOfferCount);
  const tradeOfferIds = tradeOfferCopyKeys.map(tradeCopyBugId);
  const squadChoiceInventory = [...tradeInventory].sort((a, b) => {
    const firstEntry = entryByBugId(a.bugId);
    const secondEntry = entryByBugId(b.bugId);
    const rarityDiff = (firstEntry ? raritySortOrder[firstEntry.rarity] : 99) - (secondEntry ? raritySortOrder[secondEntry.rarity] : 99);
    if (rarityDiff !== 0) return rarityDiff;
    return bugName(a.bugId).localeCompare(bugName(b.bugId));
  });
  const recipientTradeInventory = sortTradeInventory(recipientInventory.filter((item) => item.count > 0));
  const recipientMasteryMap = tradeRecipientId ? masteryMapForUser(tradeRecipientId) : {};
  const recipientTradeCopyOptions = recipientTradeInventory
    .map((item) => tradeCopyOptionsForItem(item, item.count)[0])
    .filter((option): option is TradeCopyOption => Boolean(option));
  const filteredRecipientTradeCopyOptions = filterTradeOptions(recipientTradeCopyOptions, tradeRequestRarityFilter, tradeRequestRoleFilter, tradeRequestSearch, recipientMasteryMap);
  const visibleRecipientTradeCopyOptions = filteredRecipientTradeCopyOptions.slice(0, visibleTradeRequestCount);
  const tradeRequestIds = tradeRequestCopyKeys.map(tradeCopyBugId);
  const recipientUnlockedTradeBugIds = new Set([...recipientInventory.map((item) => item.bugId), ...recipientUnlockHistory.map((item) => item.bugId)]);
  const upgradeOptions = upgradeRarities.map((rarity) => {
    const items = inventory
      .filter((item) => item.count > 0 && entryByBugId(item.bugId)?.rarity === rarity)
      .sort((a, b) => b.count - a.count || bugName(a.bugId).localeCompare(bugName(b.bugId)));
    return { items, rarity, targetRarity: nextRarityLabel[rarity] };
  });
  const duplicateUpgradeOptions = upgradeOptions.flatMap(({ items, rarity, targetRarity }) => {
    const requiredSameCount = combineRequiredCount(rarity);
    return items
      .filter((item) => spendableCountForItem(item) >= requiredSameCount)
      .map((item) => ({ item, rarity, requiredSameCount, targetRarity }));
  });
  const selectedRecipient = users.find((item) => item.uid === tradeRecipientId);
  const incomingTrades = trades.filter((trade) => trade.toUserId === user.uid && trade.status === "Open");
  const outgoingTrades = trades.filter((trade) => trade.fromUserId === user.uid && trade.status === "Open");
  const tradeHistory = trades.filter((trade) => trade.status !== "Open").slice(0, 8);

  function activeCountForBug(bugId: string) {
    return activeSquadCounts[bugId] ?? 0;
  }

  function spendableCountForItem(item: BugDexInventoryItem | null | undefined) {
    return item ? Math.max(0, item.count - activeCountForBug(item.bugId)) : 0;
  }

  function canSpendBugCopy(item: BugDexInventoryItem | null | undefined) {
    return spendableCountForItem(item) > 0;
  }

  function tradeCopyKey(bugId: string, copyNumber: number) {
    return `${bugId}#${copyNumber}`;
  }

  function tradeCopyBugId(copyKey: string) {
    return copyKey.split("#")[0] || copyKey;
  }

  function tradeCopyOptionsForItem(item: BugDexInventoryItem, count: number): TradeCopyOption[] {
    return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => ({
      bugId: item.bugId,
      copyNumber: index + 1,
      item,
      key: tradeCopyKey(item.bugId, index + 1),
      totalCopies: Math.max(0, Math.floor(count))
    }));
  }

  function copyLabel(option: Pick<TradeCopyOption, "copyNumber" | "totalCopies">) {
    return option.totalCopies > 1 ? t("bugdex.copyLabel", { copy: option.copyNumber }) : "";
  }

  useEffect(() => {
    void refreshAll();
  }, [user.uid]);

  useEffect(() => {
    dashboardIntro.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) return;
    Animated.timing(dashboardIntro, {
      duration: 360,
      toValue: 1,
      useNativeDriver: nativeDriver
    }).start();
  }, [dashboardIntro, reducedMotion]);

  useEffect(() => {
    setDashboardPage((current) => Math.min(current, dashboardPageCount - 1));
  }, [dashboardPageCount]);

  useEffect(() => {
    if (openTradeRequest <= 0) return;
    setWorkspaceOpen(true);
    setSquadExpanded(false);
    setTradeExpanded(true);
    setUpgradeExpanded(false);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, tradeSectionY.current - 16) });
    }, 80);
    return () => clearTimeout(timer);
  }, [openTradeRequest]);

  useEffect(() => {
    let active = true;
    setClosedCompletedTradeIdsLoaded(false);
    setClosedCompletedTradeIds([]);
    void readClosedCompletedTradeIds(user.uid).then((ids) => {
      if (!active) return;
      setClosedCompletedTradeIds(ids);
      setClosedCompletedTradeIdsLoaded(true);
    }).catch(() => {
      if (!active) return;
      setClosedCompletedTradeIdsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [user.uid]);

  useEffect(() => {
    if (!closedCompletedTradeIdsLoaded) return;
    const acceptedOwnTrade = trades.find((trade) =>
      trade.fromUserId === user.uid &&
      trade.status === "Geaccepteerd" &&
      !trade.requesterSeenAt &&
      !closedCompletedTradeIds.includes(trade.id)
    );
    if (!acceptedOwnTrade || completedTrade) return;
    setCompletedTrade(acceptedOwnTrade);
  }, [closedCompletedTradeIds, closedCompletedTradeIdsLoaded, completedTrade, trades, user.uid]);

  useEffect(() => {
    const availableIds = new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId));
    const activeCounts = activeSquadIds.reduce<Record<string, number>>((counts, bugId) => {
      counts[bugId] = (counts[bugId] ?? 0) + 1;
      return counts;
    }, {});
    const isSelectable = (bugId: string) => {
      const item = inventory.find((candidate) => candidate.bugId === bugId);
      return availableIds.has(bugId) && Boolean(item && item.count - (activeCounts[bugId] ?? 0) > 0);
    };
    setUpgradeSelections((current) => ({
      Gewoon: current.Gewoon.filter(isSelectable),
      Zeldzaam: current.Zeldzaam.filter(isSelectable),
      Episch: current.Episch.filter(isSelectable),
      Legendarisch: current.Legendarisch.filter(isSelectable)
    }));
  }, [activeSquadIds, inventory]);

  useEffect(() => {
    setVisibleCardCount(bugDexCardBatchSize);
  }, [selectedRarityFilter, selectedSetId, showLocked]);

  useEffect(() => {
    setVisibleTradeOfferCount(tradeOptionBatchSize);
  }, [tradeOfferRarityFilter, tradeOfferRoleFilter, tradeOfferSearch]);

  useEffect(() => {
    setVisibleTradeRequestCount(tradeOptionBatchSize);
  }, [tradeRecipientId, tradeRequestRarityFilter, tradeRequestRoleFilter, tradeRequestSearch]);

  useEffect(() => {
    const validKeys = new Set(tradeCopyOptions.map((item) => item.key));
    const nextOfferKeys = tradeOfferCopyKeys.filter((key) => validKeys.has(key));
    if (nextOfferKeys.length === tradeOfferCopyKeys.length) return;
    setTradeOfferCopyKeys(nextOfferKeys);
    setTradeRecipientId("");
    setTradeRequestCopyKeys([]);
    setRecipientInventory([]);
  }, [activeSquadIds, inventory, tradeCopyOptions, tradeOfferCopyKeys]);

  async function refreshAll() {
    await Promise.all([refreshInventory(), refreshMastery(), refreshTrades(), refreshDailyUpgradeUsage(), refreshTradeUsers()]);
  }

  async function refreshMastery() {
    const items = await listBugMastery(user).catch(() => []);
    setMasteryByBugId(Object.fromEntries(items.map((item) => [item.bugId, item])));
  }

  useEffect(() => {
    previousCrownRanks.current = {};
    crownRanksInitialized.current = false;
    setCrownUpgrade(null);
  }, [user.uid]);

  useEffect(() => {
    const nextRanks = Object.fromEntries(Object.entries(masteryByBugId).map(([bugId, mastery]) => {
      const entry = entryByBugId(bugId);
      return [bugId, entry ? bugCrownRankForMastery(entry, mastery) : "none"];
    })) as Record<string, BugCrownRank>;
    if (!crownRanksInitialized.current) {
      previousCrownRanks.current = nextRanks;
      crownRanksInitialized.current = true;
      return;
    }
    const rankOrder: BugCrownRank[] = ["none", "crowned", "elite", "master", "legend"];
    const upgraded = Object.entries(nextRanks).find(([bugId, rank]) => rankOrder.indexOf(rank) > rankOrder.indexOf(previousCrownRanks.current[bugId] ?? "none"));
    if (upgraded && upgraded[1] !== "none") {
      setCrownUpgrade({ bugId: upgraded[0], rank: upgraded[1] as Exclude<BugCrownRank, "none"> });
    }
    previousCrownRanks.current = nextRanks;
  }, [masteryByBugId]);

  async function refreshTradeUsers() {
    const tradeUsers = (await listUsersLight()).filter((item) => item.uid !== user.uid);
    setUsers(tradeUsers);
  }

  async function refreshInventory() {
    setInventoryLoading(true);
    setInventoryError("");
    try {
      const items = await listBugDexInventory(user);
      const unlocks = await listBugDexUnlocks(user).catch(() => []);
      setInventory(items);
      setUnlockHistory(unlocks);
      const storedSquad = sanitizeActiveBugSquad(user.activeBugSquad);
      const availableSquad = sanitizeActiveBugSquad(storedSquad, items);
      setActiveSquadIds(availableSquad);
      if (storedSquad.join("|") !== availableSquad.join("|")) {
        const updated = await updateUserBugSquad({ ...user, activeBugSquad: storedSquad }, availableSquad);
        onUserUpdated?.(updated);
      }
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : t("bugdex.archiveLoadError"));
    } finally {
      setInventoryLoading(false);
    }
  }

  async function refreshTrades() {
    setTrades(await listTradeRequests(user));
  }

  async function refreshDailyUpgradeUsage() {
    setDailyUpgradeUsage(await getDailyUpgradeUsage(user));
  }

  async function upgradeDifferent(rarity: UpgradeRarity, bugIds: string[]) {
    if (bugIds.some((bugId) => !canSpendBugCopy(inventoryById[bugId]))) {
      setUpgradeError(t("bugdex.activeSquadLocked"));
      return;
    }
    setUpgradeBusy(rarity);
    setUpgradeError("");
    try {
      const result = await combineDifferentBugDexUpgrade(user, bugIds);
      setDrop(result);
      setUpgradeSelections((current) => ({ ...current, [rarity]: [] }));
      await Promise.all([refreshInventory(), refreshDailyUpgradeUsage()]);
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : t("bugdex.upgradeFailed"));
    } finally {
      setUpgradeBusy("");
    }
  }

  async function upgradeSame(rarity: UpgradeRarity, bugId: string) {
    const item = inventoryById[bugId];
    const requiredCount = combineRequiredCount(rarity);
    if (spendableCountForItem(item) < requiredCount) {
      setUpgradeError(t("bugdex.needCount", { count: requiredCount }));
      return;
    }
    const busyKey = `${rarity}:${bugId}`;
    setUpgradeBusy(busyKey);
    setUpgradeError("");
    try {
      const result = await combineBugDexDuplicates(user, bugId);
      setDrop(result);
      setUpgradeSelections((current) => ({ ...current, [rarity]: [] }));
      await Promise.all([refreshInventory(), refreshDailyUpgradeUsage()]);
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : t("bugdex.upgradeFailed"));
    } finally {
      setUpgradeBusy("");
    }
  }

  function toggleUpgradeSelection(rarity: UpgradeRarity, bugId: string) {
    if (!canSpendBugCopy(inventoryById[bugId])) return;
    setUpgradeSelections((current) => {
      const selected = current[rarity];
      const requiredCount = differentUpgradeRequiredCount(rarity);
      if (selected.includes(bugId)) return { ...current, [rarity]: selected.filter((item) => item !== bugId) };
      if (selected.length >= requiredCount) return current;
      return { ...current, [rarity]: [...selected, bugId] };
    });
  }

  function bugName(bugId: string) {
    const entry = entryByBugId(bugId);
    return entry ? bugDexEntryName(entry, t) : "Bug";
  }

  function bugRarity(bugId: string) {
    return entryByBugId(bugId)?.rarity ?? "Gewoon";
  }

  function bugTradeLabel(bugId: string) {
    return `${bugName(bugId)} (${rarityStars(bugRarity(bugId))})`;
  }

  function rarityStars(rarity: BugDexRarity) {
    const counts: Record<BugDexRarity, number> = {
      Gewoon: 1,
      Zeldzaam: 2,
      Episch: 3,
      Legendarisch: 4,
      Mythisch: 5
    };
    return "★".repeat(counts[rarity]);
  }

  function tradeBugIds(trade: TradeRequest, side: "offer" | "request") {
    const ids = side === "offer" ? trade.offerBugIds : trade.requestBugIds;
    const fallback = side === "offer" ? trade.offerBugId : trade.requestBugId;
    return (Array.isArray(ids) && ids.length ? ids : [fallback]).filter(Boolean);
  }

  function bugTradeListLabel(bugIds: string[]) {
    if (bugIds.length <= 1) return bugIds[0] ? bugTradeLabel(bugIds[0]) : "";
    return bugIds.map(bugTradeLabel).join(" + ");
  }

  function sortTradeInventory(items: BugDexInventoryItem[]) {
    return [...items].sort((a, b) => {
      const rarityDiff = raritySortOrder[bugRarity(a.bugId)] - raritySortOrder[bugRarity(b.bugId)];
      if (rarityDiff !== 0) return rarityDiff;
      return bugName(a.bugId).localeCompare(bugName(b.bugId));
    });
  }

  function filterTradeOptions(options: TradeCopyOption[], rarityFilter: DexRarityFilter, roleFilter: TradeRoleFilter, search: string, masteryMap: Record<string, BugMastery>) {
    const normalizedSearch = search.trim().toLowerCase();
    return options.filter((option) => {
      const entry = entryByBugId(option.bugId);
      const mastery = masteryForBugId(option.bugId, masteryMap);
      const matchesRarity = rarityFilter === "all" || entry?.rarity === rarityFilter;
      const matchesRole = roleFilter === "all" || mastery.role === roleFilter;
      const matchesSearch = !normalizedSearch || bugName(option.bugId).toLowerCase().includes(normalizedSearch) || (entry ? bugDexEntryTitle(entry, t).toLowerCase().includes(normalizedSearch) : false);
      return matchesRarity && matchesRole && matchesSearch;
    });
  }

  function toggleTradeOfferRarityFilter(rarity: BugDexRarity) {
    setTradeOfferRarityFilter((current) => current === rarity ? "all" : rarity);
  }

  function toggleTradeRequestRarityFilter(rarity: BugDexRarity) {
    setTradeRequestRarityFilter((current) => current === rarity ? "all" : rarity);
  }

  function toggleTradeOfferRoleFilter(role: BugMastery["role"]) {
    setTradeOfferRoleFilter((current) => current === role ? "all" : role);
  }

  function toggleTradeRequestRoleFilter(role: BugMastery["role"]) {
    setTradeRequestRoleFilter((current) => current === role ? "all" : role);
  }

  function renderTradeFilters(selectedRarity: DexRarityFilter, onSelectRarity: (rarity: BugDexRarity) => void, selectedRole: TradeRoleFilter, onSelectRole: (role: BugMastery["role"]) => void, search: string, onSearch: (value: string) => void) {
    return (
      <View style={styles.tradeFilterBlock}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("bugdex.tradeSearchPlaceholder")}
          placeholderTextColor="#7b9086"
          style={styles.tradeSearchInput}
          value={search}
          onChangeText={onSearch}
        />
        <View style={styles.tradeRarityFilterRow}>
          {rarityFilters.filter((rarity): rarity is BugDexRarity => rarity !== "all").map((rarity) => {
            const active = selectedRarity === rarity;
            return (
              <Pressable
                key={rarity}
                accessibilityLabel={rarityLabel(rarity, t)}
                style={[styles.tradeRarityFilterButton, active && styles.tradeRarityFilterButtonActive, { borderColor: active ? rarityColors[rarity] : "#c6d3cc" }]}
                onPress={() => onSelectRarity(rarity)}
              >
                <RarityStarImages rarity={rarity} size={8} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.tradeRarityFilterRow}>
          {tradeRoleFilters.filter((role): role is BugMastery["role"] => role !== "all").map((role) => {
            const active = selectedRole === role;
            return (
              <Pressable
                key={role}
                accessibilityLabel={masteryRoleLabel(role)}
                style={[styles.tradeRoleFilterButton, active && styles.tradeChipActive]}
                onPress={() => onSelectRole(role)}
              >
                <Text style={[styles.tradeRoleFilterText, active && styles.tradeChipTextActive]}>{masteryRoleLabel(role)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function tradePartnerName(trade: TradeRequest) {
    return trade.fromUserId === user.uid ? trade.toUserName : trade.fromUserName;
  }

  function tradeStatusLabel(status: TradeRequest["status"]) {
    if (status === "Geaccepteerd") return t("bugdex.tradeStatusAccepted");
    if (status === "Afgewezen") return t("bugdex.tradeStatusRejected");
    if (status === "Geannuleerd") return t("bugdex.tradeStatusCancelled");
    return t("bugdex.tradeStatusOpen");
  }

  function bugBuffText(bugId: string) {
    const bonus = activeBugSquadBonusList([bugId])[0];
    return bonus ? `${squadBonusLabel(bonus.category)} ${squadBonusValue(bonus.category, bonus.value)}` : "";
  }

  function masteryForEntry(entry: BugDexEntry) {
    return masteryByBugId[entry.id] ?? normalizeBugMastery(entry.id);
  }

  function masteryMapForUser(uid: string) {
    return uid === user.uid ? masteryByBugId : masteryByUserId[uid] ?? {};
  }

  function masteryForBugId(bugId: string, masteryMap: Record<string, BugMastery> = masteryByBugId) {
    return masteryMap[bugId] ?? normalizeBugMastery(bugId);
  }

  function tradeMasteryText(bugId: string, masteryMap: Record<string, BugMastery> = masteryByBugId) {
    const mastery = masteryForBugId(bugId, masteryMap);
    return `${t("bugdex.mastery.levelShort", { level: mastery.level })} - ${masteryRankLabel(mastery.rank)} - ${masteryRoleLabel(mastery.role)}`;
  }

  function masteryRoleLabel(role: BugMastery["role"]) {
    return t(`bugdex.mastery.role.${role}`);
  }

  function masteryRankLabel(rank: BugMastery["rank"]) {
    return t(`bugdex.mastery.rank.${rank}`);
  }

  function masterySkillLabel(skillId: string) {
    return t(`bugdex.mastery.skill.${skillId}`);
  }

  function masterySkillDescription(skillId: string) {
    return t(`bugdex.mastery.skillDesc.${skillId}`);
  }

  function masteryRoleSummary(role: BugMastery["role"]) {
    return t(`bugdex.mastery.roleSummary.${role}`);
  }

  function masterySkillMode(skill: BugMasterySkill) {
    return skill.kind === "passive" ? t("bugdex.mastery.alwaysOn") : skill.kind === "master" ? t("bugdex.mastery.oncePerRun") : t("bugdex.mastery.canTrigger");
  }

  function renderMasterySkillCard(skill: BugMasterySkill, state: "current" | "next") {
    return (
      <View key={`${state}-${skill.id}`} style={[styles.masteryFocusCard, state === "next" && styles.masteryFocusCardNext]}>
        <Text style={styles.masteryFocusLabel}>{state === "current" ? t("bugdex.mastery.now") : t("bugdex.mastery.next")}</Text>
        <View style={styles.skillTitleRow}>
          <Text style={styles.skillName}>{masterySkillLabel(skill.id)}</Text>
          <Text style={styles.skillLevel}>Lv. {skill.unlockedAtLevel}</Text>
        </View>
        <Text style={styles.skillMeta}>{masterySkillMode(skill)}</Text>
        <Text style={styles.skillDescription}>{masterySkillDescription(skill.id)}</Text>
      </View>
    );
  }

  function masteryNextText(mastery: BugMastery) {
    const nextLevel = bugMasteryNextUnlockLevel(mastery.level);
    return nextLevel ? t("bugdex.mastery.nextLevel", { level: nextLevel }) : t("bugdex.mastery.maxed");
  }

  function masteryCardMeta(entry: BugDexEntry) {
    const mastery = masteryForEntry(entry);
    const firstSkill = bugMasteryUnlockedSkills(mastery.role, mastery.level).find((skill) => skill.kind !== "passive");
    return firstSkill
      ? t("bugdex.mastery.cardSkill", { skill: masterySkillLabel(firstSkill.id) })
      : masteryNextText(mastery);
  }

  function masteryProgress(entry: BugDexEntry, mastery = masteryForEntry(entry)) {
    const xpNeeded = mastery.level >= bugMasteryLevelCap ? 0 : bugMasteryXpForNextLevel(mastery.level, entry.rarity);
    return xpNeeded > 0 ? Math.min(100, Math.round((mastery.xp / xpNeeded) * 100)) : 100;
  }

  function renderTradeBugSummary(bugIds: string[], masteryMap: Record<string, BugMastery>) {
    const copyCounts: Record<string, number> = {};
    return (
      <View style={styles.tradeSummaryList}>
        {bugIds.map((bugId, index) => {
          copyCounts[bugId] = (copyCounts[bugId] ?? 0) + 1;
          const duplicateCount = bugIds.filter((item) => item === bugId).length;
          const option = { copyNumber: copyCounts[bugId], totalCopies: duplicateCount };
          return (
            <View key={`${bugId}-${index}`} style={styles.tradeSummaryItem}>
              <Text style={styles.tradeRequestText}>{bugTradeLabel(bugId)} {copyLabel(option)}</Text>
              <Text style={styles.tradeMasteryText}>{tradeMasteryText(bugId, masteryMap)}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  async function copyAcceptedTradeMastery(trade: TradeRequest) {
    const offerIds = tradeBugIds(trade, "offer");
    const requestIds = tradeBugIds(trade, "request");
    await Promise.all([
      ...offerIds.map((bugId) => copyBugMasteryForTrade({ uid: trade.fromUserId }, { uid: trade.toUserId }, bugId, trade.id)),
      ...requestIds.map((bugId) => copyBugMasteryForTrade({ uid: trade.toUserId }, { uid: trade.fromUserId }, bugId, trade.id))
    ]);
  }

  function openCollectionWorkspace(section: "squad" | "trade" | "upgrade" | "dex") {
    setWorkspaceOpen(true);
    if (section === "squad") {
      setSquadExpanded(true);
      setTradeExpanded(false);
      setUpgradeExpanded(false);
    }
    if (section === "trade") {
      setSquadExpanded(false);
      setTradeExpanded(true);
      setUpgradeExpanded(false);
    }
    if (section === "upgrade") {
      setSquadExpanded(false);
      setTradeExpanded(false);
      setUpgradeExpanded(true);
    }
    setTimeout(() => {
      const targetY = section === "squad"
        ? squadSectionY.current
        : section === "trade"
          ? tradeSectionY.current
          : section === "upgrade"
            ? upgradeSectionY.current
            : dexSectionY.current;
      scrollRef.current?.scrollTo({ animated: false, y: Math.max(0, targetY - 12) });
    }, 120);
  }

  function openTradeWorkshop() {
    setWorkspaceOpen(true);
    setSquadExpanded(false);
    setTradeExpanded(true);
    setUpgradeExpanded(false);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, tradeSectionY.current - 16) });
    }, 80);
  }

  function upgradeRouteUsedToday(sourceRarity: UpgradeRarity) {
    return dailyUpgradeUsage[`${sourceRarity}-${nextRarityLabel[sourceRarity]}` as keyof DailyUpgradeUsage];
  }

  async function toggleActiveSquadBug(bugId: string) {
    if (squadBusyId) return;
    const selected = activeSquadIds.includes(bugId);
    const nextIds = selected
      ? activeSquadIds.filter((item) => item !== bugId)
      : activeSquadIds.length >= maxActiveBugSquadSize
        ? activeSquadIds
        : [...activeSquadIds, bugId];
    if (nextIds.join("|") === activeSquadIds.join("|")) return;

    setSquadBusyId(bugId);
    try {
      const updated = await updateUserBugSquad({ ...user, activeBugSquad: activeSquadIds }, nextIds);
      const nextSquad = sanitizeActiveBugSquad(updated.activeBugSquad, inventory);
      setActiveSquadIds(nextSquad);
      onUserUpdated?.(updated);
    } finally {
      setSquadBusyId("");
    }
  }

  function squadBonusLabel(category: BugSquadBonusCategory): string {
    return t(`bugdex.squadBonus.${category}`);
  }

  function squadBonusValue(category: BugSquadBonusCategory, value: number): string {
    return `+${Math.round(value * 100)}%`;
  }

  function bugDexSourceLabel(source: string) {
    const keyBySource: Record<string, string> = {
      bug_fixed: "bugdex.source.fixed",
      bug_reported: "bugdex.source.report",
      bug_splat: "bugdex.source.arcade",
      combine: "bugdex.source.combine",
      comment: "bugdex.source.teamwork",
      daily_login: "bugdex.source.daily",
      duel_reward: "bugdex.source.duel",
      rank_up: "bugdex.source.rank",
      rank_unlock: "bugdex.source.rank",
      real_bug_scan: "bugdex.source.scan",
      status_update: "bugdex.source.teamwork",
      upvote_given: "bugdex.source.teamwork",
      walking: "bugdex.source.exploration"
    };
    return t(keyBySource[source] ?? "bugdex.source.other");
  }

  function serviceErrorText(message: string) {
    const routeMatch = message.match(/^Vandaag is (.+) -> (.+) al gebruikt\.$/);
    if (routeMatch) return t("bugdex.routeAlreadyUsed", { from: tr(routeMatch[1]), to: tr(routeMatch[2]) });

    const requiredMatch = message.match(/^Je hebt x(\d+) nodig om te combineren\.$/);
    if (requiredMatch) return t("bugdex.needCount", { count: requiredMatch[1] });

    return tr(message);
  }

  async function chooseRecipient(uid: string) {
    const recipient = users.find((item) => item.uid === uid);
    setTradeRecipientId(uid);
    setTradeRequestCopyKeys([]);
    const cachedInventory = inventoriesByUserId[uid];
    const cachedUnlocks = unlocksByUserId[uid];
    setRecipientInventory(cachedInventory ?? []);
    setRecipientUnlockHistory(cachedUnlocks ?? []);
    setRecipientUnlocksLoaded(Boolean(cachedUnlocks));
    if (!recipient) return;
    const [freshInventory, freshMastery, freshUnlocks] = await Promise.all([
      listBugDexInventory(recipient),
      listBugMastery(recipient).catch(() => []),
      listBugDexUnlocks(recipient).catch(() => [])
    ]);
    setRecipientInventory(freshInventory);
    setRecipientUnlockHistory(freshUnlocks);
    setRecipientUnlocksLoaded(true);
    setInventoriesByUserId((current) => ({ ...current, [uid]: freshInventory }));
    setUnlocksByUserId((current) => ({ ...current, [uid]: freshUnlocks }));
    setMasteryByUserId((current) => ({ ...current, [uid]: Object.fromEntries(freshMastery.map((item) => [item.bugId, item])) }));
  }

  async function sendTradeRequest() {
    if (!selectedRecipient || !tradeOfferIds.length || !tradeRequestIds.length) return;
    if (tradeOfferIds.some((bugId) => !canSpendBugCopy(inventoryById[bugId]))) {
      setTradeError(t("bugdex.activeSquadLocked"));
      return;
    }
    setTradeBusy("send");
    setTradeError("");
    try {
      await createTradeRequest(user, selectedRecipient, tradeOfferIds, tradeRequestIds);
      await notifyTradeRequest(selectedRecipient.uid, user, bugTradeListLabel(tradeOfferIds));
      setTradeOfferCopyKeys([]);
      setTradeRecipientId("");
      setTradeRequestCopyKeys([]);
      setRecipientInventory([]);
      setRecipientUnlockHistory([]);
      setRecipientUnlocksLoaded(false);
      setTradeExpanded(false);
      await Promise.all([refreshTrades(), refreshTradeUsers()]);
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : t("bugdex.tradeFailed"));
    } finally {
      setTradeBusy("");
    }
  }

  async function respondTrade(trade: TradeRequest, accept: boolean) {
    setTradeBusy(trade.id);
    setTradeError("");
    try {
      const result = await respondToTradeRequest(user, trade, accept);
      if (accept) {
        await copyAcceptedTradeMastery(trade).catch(() => undefined);
        setCompletedTrade(result);
        setTradeExpanded(false);
        await notifyTradeAccepted(trade.fromUserId, user, bugTradeListLabel(tradeBugIds(trade, "request")));
      }
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("bugdex.tradeProcessFailed");
      setTradeError(message);
      Alert.alert(t("bugdex.trade"), serviceErrorText(message));
    } finally {
      setTradeBusy("");
    }
  }

  async function cancelTrade(trade: TradeRequest) {
    setTradeBusy(trade.id);
    setTradeError("");
    try {
      await cancelTradeRequest(user, trade);
      await Promise.all([refreshTrades(), refreshTradeUsers()]);
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : t("bugdex.tradeProcessFailed"));
    } finally {
      setTradeBusy("");
    }
  }

  function closeTradeResult() {
    const trade = completedTrade;
    if (!trade) return;
    setClosedCompletedTradeIds((current) => current.includes(trade.id) ? current : [...current, trade.id]);
    void saveClosedCompletedTradeId(user.uid, trade.id).catch(() => undefined);
    setCompletedTrade(null);
    setTradeExpanded(false);
    if (trade.fromUserId === user.uid && trade.status === "Geaccepteerd" && !trade.requesterSeenAt) {
      void markTradeRequesterSeen(user, trade).then(refreshTrades).catch(() => undefined);
    }
  }

  const dexList = (
    <>
      <View style={styles.setCard}>
        <View style={styles.setEmblemWrap}>
          <BugDexCategoryEmblem
            badgeId={selectedSet?.badgeId ?? "bugdex-set-all"}
            completed={selectedSetProgress >= 100}
            progress={selectedSetProgress}
            size={62}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.setPickerButton}
          onPress={() => setSetPickerOpen((current) => !current)}
        >
          <View style={styles.setPickerTextBlock}>
            <Text style={styles.setLabel}>{selectedSetLabel}</Text>
            <Text style={styles.setMeta}>
              {t("bugdex.setProgress", { owned: selectedSetOwnedCount, total: selectedSetTotalCount, progress: selectedSetProgress })}
            </Text>
          </View>
          <Text style={styles.setChevron}>{setPickerOpen ? "^" : "v"}</Text>
        </Pressable>
        <Text style={styles.setDescription}>{selectedSetDescription}</Text>
        {setPickerOpen && (
          <View style={styles.setOptions}>
            {[{ id: allBugDexSetId, labelKey: "bugdex.set.all" }, ...bugDexSets].map((set) => {
              const active = selectedSetId === set.id;
              return (
                <Pressable
                  key={set.id}
                  accessibilityRole="button"
                  style={[styles.setOption, active && styles.setOptionActive]}
                  onPress={() => {
                    setSelectedSetId(set.id);
                    setSetPickerOpen(false);
                  }}
                >
                  <Text style={[styles.setOptionText, active && styles.setOptionTextActive]}>{t(set.labelKey)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.dexToolbar}>
        <View>
          <Text style={styles.dexToolbarTitle}>{t("bugdex.discovered")}</Text>
          <Text style={styles.dexToolbarMeta}>{showLocked ? t("bugdex.allVisible") : t("bugdex.focusUnlocked")}</Text>
        </View>
        <Pressable
          accessibilityLabel={showLocked ? t("bugdex.hideUnknown") : t("bugdex.showUnknown")}
          accessibilityRole="button"
          hitSlop={8}
          style={[styles.lockedToggle, showLocked && styles.lockedToggleActive]}
          onPress={() => setShowLocked((current) => !current)}
        >
          <VisibilityIcon active={showLocked} slashed={showLocked} />
        </Pressable>
      </View>

      <View style={styles.rarityFilterCard}>
        <Text style={styles.rarityFilterTitle}>{t("bugdex.filterRarity")}</Text>
        <View style={styles.rarityFilterRow}>
          {rarityFilters.map((rarity) => {
            const active = selectedRarityFilter === rarity;
            const label = rarity === "all" ? t("bugdex.filterAll") : rarityLabel(rarity, t);
            const rarityChipStyle = rarity === "all"
              ? active && styles.rarityFilterChipActive
              : active && { backgroundColor: "#fffdf2", borderColor: rarityColors[rarity] };
            return (
              <Pressable
                key={rarity}
                accessibilityLabel={label}
                accessibilityRole="button"
                style={[styles.rarityFilterChip, rarity !== "all" && styles.rarityFilterStarChip, rarityChipStyle]}
                onPress={() => setSelectedRarityFilter(rarity)}
              >
                {rarity === "all" ? (
                  <Text style={[styles.rarityFilterChipText, active && styles.rarityFilterChipTextActive]}>{label}</Text>
                ) : (
                  <RarityStarImages rarity={rarity} size={11} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {inventoryLoading ? (
        <View style={styles.emptyDexCard}>
          <LockedBugSilhouette size={78} />
          <Text style={styles.emptyDexTitle}>{t("bugdex.archiveLoading")}</Text>
          <Text style={styles.emptyDexText}>{t("bugdex.archiveLoadingMeta")}</Text>
        </View>
      ) : inventoryError ? (
        <View style={[styles.emptyDexCard, styles.errorDexCard]}>
          <LockedBugSilhouette size={78} />
          <Text style={styles.emptyDexTitle}>{t("bugdex.archiveLoadError")}</Text>
          <Text style={styles.emptyDexText}>{inventoryError}</Text>
          <Pressable style={styles.loadMoreButton} onPress={() => void refreshInventory()}>
            <Text style={styles.loadMoreButtonText}>{t("bugdex.archiveRetry")}</Text>
          </Pressable>
        </View>
      ) : dexCards.length ? (
        <View style={styles.grid}>
          {visibleDexCards.map(({ entry, index, inventoryItem, unlockItem }) => {
            const color = rarityColors[entry.rarity];
            const owned = Boolean(inventoryItem);
            const everHad = !owned && Boolean(unlockItem);
            const revealed = owned || everHad;
            const isMythic = owned && entry.rarity === "Mythisch";
            const mastery = masteryForEntry(entry);
            const crownRank = bugCrownRankForMastery(entry, mastery);
            return (
              <Pressable key={entry.id} disabled={!revealed} style={[styles.card, !revealed && styles.lockedCard, everHad && styles.everHadCard, isMythic && styles.mythicCard, { borderColor: revealed ? color : "#cbd8d1" }]} onPress={() => setSelectedBugId(entry.id)}>
                <View style={styles.cardTop}>
                  <View style={[styles.numberPill, { backgroundColor: revealed ? color : "#87958e" }]}>
                    <Text style={styles.numberText}>{String(index + 1).padStart(2, "0")}</Text>
                  </View>
                  {revealed ? <RarityMarks compact rarity={entry.rarity} /> : <RarityMarks compact rarity="Gewoon" />}
                </View>
                <SpecimenFrame rarity={entry.rarity} style={styles.bugWrap}>
                  {revealed ? (
                    <CrownGlow rank={crownRank} size={92}>
                      <BugArtImage bugId={entry.id} size={92} />
                    </CrownGlow>
                  ) : <LockedBugSilhouette size={82} />}
                </SpecimenFrame>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, !revealed && styles.lockedName, everHad && styles.everHadText]} numberOfLines={1}>{revealed ? bugDexEntryName(entry, t) : t("bugdex.unknown")}</Text>
                  {owned && inventoryItem.count > 1 && <Text style={styles.countPill}>x{inventoryItem.count}</Text>}
                </View>
                <Text style={[styles.title, !revealed && styles.lockedText, everHad && styles.everHadText]}>{owned ? bugDexEntryTitle(entry, t) : everHad ? t("bugdex.everHadNotOwned") : t("bugdex.notDiscovered")}</Text>
                {revealed ? (
                  <View style={styles.masteryCardBlock}>
                    <View style={styles.masteryMiniRow}>
                      <Text style={styles.masteryMiniPill}>{t("bugdex.mastery.levelShort", { level: mastery.level })}</Text>
                      <Text style={[styles.masteryMiniPill, styles.masteryRolePill]}>{masteryRoleLabel(mastery.role)}</Text>
                    </View>
                    <Text style={styles.masteryCardMeta} numberOfLines={1}>{masteryCardMeta(entry)}</Text>
                    <View style={styles.masteryCardTrack}>
                      <View style={[styles.masteryCardFill, { backgroundColor: color, width: `${masteryProgress(entry, mastery)}%` }]} />
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.note, styles.lockedText]}>{t("bugdex.findHint")}</Text>
                )}
              </Pressable>
            );
          })}
          {visibleDexCards.length < dexCards.length ? (
            <Pressable style={styles.loadMoreButton} onPress={() => setVisibleCardCount((count) => count + bugDexCardBatchSize)}>
              <Text style={styles.loadMoreButtonText}>{t("bugdex.archiveShowMore", { count: Math.min(bugDexCardBatchSize, dexCards.length - visibleDexCards.length) })}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyDexCard}>
          <Text style={styles.emptyDexTitle}>{t("bugdex.noneFound")}</Text>
          <Text style={styles.emptyDexText}>{t("bugdex.showUnknownHint")}</Text>
        </View>
      )}
    </>
  );

  const collectionWorkspace = (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[sharedStyles.title, styles.headerTitle]}>BugDex</Text>
          <Text style={styles.headerMeta}>{everUnlockedCount}/{totalCount} {t("bugdex.discoveredCount", { count: "", progress }).trim()}</Text>
        </View>
        {headerEntry ? (
          <View style={styles.headerBugWrap}>
            <BugArtImage bugId={headerEntry.id} size={84} />
          </View>
        ) : (
          <View style={styles.headerEmptyIcon}>
            <LockedBugSilhouette size={62} />
          </View>
        )}
      </View>
      {!embedded ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open museum" onPress={onOpenMuseum} style={styles.museumFeature}>
          <Image source={require("../../assets/generated/museum-gallery-v2.jpg")} style={styles.museumFeatureArt} />
          <View style={styles.museumFeatureCopy}><Text style={styles.museumKicker}>BUGBAAS 3.0</Text><Text style={styles.museumTitle}>Museum</Text><Text style={styles.museumMeta}>Bekijk je collectie als levende terrariums.</Text></View>
          <Text style={styles.museumArrow}>›</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.squadFeatureCard, squadExpanded && styles.squadFeatureCardActive]}
        onLayout={(event) => {
          squadSectionY.current = event.nativeEvent.layout.y;
        }}
        onPress={() => setSquadExpanded((current) => !current)}
      >
        <Image source={activeBugSquadHeroImage} style={styles.squadFeatureImage} />
        <View style={styles.squadFeatureOverlay}>
          <View style={styles.squadFeatureCopy}>
            <Text style={styles.squadFeatureTitle}>{t("bugdex.activeSquad")}</Text>
            <Text style={styles.squadFeatureMeta}>{t("bugdex.activeSquadMeta", { count: activeSquadIds.length, max: maxActiveBugSquadSize })}</Text>
          </View>
          <View style={styles.squadFeatureAction}>
            <Text style={styles.squadFeatureActionText}>{squadExpanded ? t("common.close") : t("bugdex.chooseSquad")}</Text>
          </View>
        </View>
        <View style={styles.activeJarPreview}>
          {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
            const entry = activeSquadEntries[index];
            return (
              <View key={entry?.id ?? index} style={styles.activeJarMini}>
                <BugJarArt bugId={entry?.id} rarity={entry?.rarity} size={74} unlocked={Boolean(entry)} />
                <Text style={styles.activeJarMiniName} numberOfLines={1}>
                  {entry ? bugDexEntryName(entry, t) : t("bugdex.squadEmptySlot")}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      {squadExpanded && (
        <View style={styles.squadPanel}>
          <View style={styles.squadJarBugs}>
            {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
              const bugId = activeSquadIds[index];
              const entry = bugId ? entryByBugId(bugId) : null;
              const mastery = entry ? masteryForEntry(entry) : null;
              return (
                <View key={index} style={styles.squadBugJarWrap}>
                  <View style={styles.squadJarSlot}>
                    {entry ? (
                      <>
                        <BugArtImage bugId={entry.id} size={78} />
                        <Text style={styles.squadSlotName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                        {mastery && (
                          <View style={styles.squadMasteryBadge}>
                            <View style={styles.squadMasteryRow}>
                              <Text style={styles.squadMasteryPill}>{t("bugdex.mastery.levelShort", { level: mastery.level })}</Text>
                              <Text style={[styles.squadMasteryPill, styles.squadMasteryRolePill]} numberOfLines={1}>{masteryRoleLabel(mastery.role)}</Text>
                            </View>
                            <Text style={styles.squadMasteryMeta} numberOfLines={1}>{masteryCardMeta(entry)}</Text>
                            <View style={styles.squadMasteryTrack}>
                              <View style={[styles.squadMasteryFill, { backgroundColor: rarityColors[entry.rarity], width: `${masteryProgress(entry, mastery)}%` }]} />
                            </View>
                          </View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.squadEmptyMark}>+</Text>
                        <Text style={styles.squadSlotBonus}>{t("bugdex.squadEmptySlot")}</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.tradeHint}>{t("bugdex.activeSquadHint")}</Text>
          <View style={styles.helperInfoPanel}>
            <View style={styles.helperInfoHeader}>
              <Text style={styles.helperInfoTitle}>{t("duel.helperInfoTitle")}</Text>
              <Text style={styles.helperInfoIntro}>{t("duel.helperInfoIntro")}</Text>
            </View>
            {activeBugSquadBonusList(activeSquadIds).map((bonus) => {
              const entry = entryByBugId(bonus.bugId);
              const info = bugSquadHelperInfo(bonus);
              return (
                <View key={bonus.bugId} style={styles.helperInfoRow}>
                  <BugArtImage bugId={bonus.bugId} size={42} />
                  <View style={styles.helperInfoCopy}>
                    <View style={styles.helperInfoNameRow}>
                      <Text numberOfLines={1} style={styles.helperInfoName}>{entry ? bugDexEntryName(entry, t) : bonus.bugId}</Text>
                      <Text style={styles.helperInfoKind}>{t(`duel.helper.${info.kind}`)}</Text>
                    </View>
                    <Text style={styles.helperInfoBody}>{helperEffectDescription(bonus, t)}</Text>
                    <Text style={styles.helperInfoStats}>{info.cooldownSeconds}s · {info.hits} hit{info.hits === 1 ? "" : "s"}{info.kind === "splash" ? ` · ${info.targets} targets` : ""}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.chipRow}>
            {squadChoiceInventory.map((item) => {
              const entry = entryByBugId(item.bugId);
              if (!entry) return null;
              const selected = activeSquadIds.includes(item.bugId);
              const disabled = !selected && activeSquadIds.length >= maxActiveBugSquadSize;
              const mastery = masteryForEntry(entry);
              return (
                <Pressable
                  key={item.bugId}
                  disabled={disabled || squadBusyId === item.bugId}
                  style={[styles.squadBugChip, selected && styles.squadBugChipActive, disabled && styles.squadBugChipDisabled]}
                  onPress={() => toggleActiveSquadBug(item.bugId)}
                >
                  <BugArtImage bugId={item.bugId} size={34} />
                  <Text style={[styles.squadBugChipText, selected && styles.squadBugChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                  <RarityStars rarity={entry.rarity} compact />
                  <View style={[styles.squadChipMastery, selected && styles.squadChipMasteryActive]}>
                    <Text style={[styles.squadChipMasteryLevel, selected && styles.squadBugChipTextActive]}>{t("bugdex.mastery.levelShort", { level: mastery.level })}</Text>
                    <Text style={[styles.squadBugChipMeta, selected && styles.squadBugChipTextActive]} numberOfLines={1}>{masteryRoleLabel(mastery.role)}</Text>
                    <View style={styles.squadChipTrack}>
                      <View style={[styles.squadChipFill, { backgroundColor: rarityColors[entry.rarity], width: `${masteryProgress(entry, mastery)}%` }]} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
      </View>
      )}

      <Pressable
        style={[styles.workshopFeatureCard, tradeExpanded && styles.workshopFeatureCardActive]}
        onLayout={(event) => {
          tradeSectionY.current = event.nativeEvent.layout.y;
        }}
        onPress={() => setTradeExpanded((current) => !current)}
      >
        <Image resizeMode="cover" source={bugDexWorkshopImage} style={styles.workshopFeatureImage} />
        <View style={styles.workshopFeatureBody}>
          <Text style={styles.workshopFeatureTitle}>{t("bugdex.trade")}</Text>
          <Text style={styles.workshopFeatureMeta}>{t("bugdex.tradeOpenMeta", { incoming: incomingTrades.length, open: outgoingTrades.length })}</Text>
        </View>
        <View style={styles.workshopFeatureAction}>
          <Text style={styles.workshopFeatureActionText}>{tradeExpanded ? t("common.close") : t("common.open")}</Text>
        </View>
      </Pressable>

      {tradeExpanded && (
      <View style={styles.tradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>{t("bugdex.trade")}</Text>
          <Text style={styles.tradeMeta}>{t("bugdex.tradeOpenMeta", { incoming: incomingTrades.length, open: outgoingTrades.length })}</Text>
        </View>
        <Text style={styles.tradeHint}>{t("bugdex.tradeHint")}</Text>
        {tradeCopyOptions.length ? (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>{t("bugdex.offerBug")}</Text>
            {renderTradeFilters(tradeOfferRarityFilter, toggleTradeOfferRarityFilter, tradeOfferRoleFilter, toggleTradeOfferRoleFilter, tradeOfferSearch, setTradeOfferSearch)}
            <View style={styles.chipRow}>
              {visibleTradeCopyOptions.map((option) => {
                const item = option.item;
                const rarity = bugRarity(option.bugId);
                const selected = tradeOfferCopyKeys.includes(option.key);
                const maxSelected = !selected && tradeOfferCopyKeys.length >= maxTradeBugSelection;
                return (
                  <Pressable
                    key={option.key}
                    disabled={maxSelected}
                    style={[styles.tradeBugChip, selected && styles.tradeChipActive, maxSelected && styles.activeSquadLockedChip]}
                    onPress={() => setTradeOfferCopyKeys((current) => current.includes(option.key) ? current.filter((key) => key !== option.key) : [...current, option.key])}
                  >
                    <View style={styles.tradeJarWrap}>
                      <BugJarArt bugId={option.bugId} rarity={rarity} size={48} unlocked />
                    </View>
                    <Text style={[styles.tradeChipText, selected && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(option.bugId)}</Text>
                    <RarityStars rarity={rarity} compact />
                    {option.totalCopies > 1 && <Text style={[styles.tradeCopyMeta, selected && styles.tradeChipTextActive]}>x{option.totalCopies}</Text>}
                    {!!selectedRecipient && recipientUnlocksLoaded && !recipientUnlockedTradeBugIds.has(option.bugId) && (
                      <Text style={[styles.tradeNeedPill, selected && styles.tradeNeedPillActive]}>{t("bugdex.colleagueNeedsThis")}</Text>
                    )}
                    <Text style={[styles.bugBuffMeta, selected && styles.tradeChipTextActive]} numberOfLines={2}>{tradeMasteryText(option.bugId)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {visibleTradeCopyOptions.length < filteredTradeCopyOptions.length ? (
              <Pressable style={styles.loadMoreButton} onPress={() => setVisibleTradeOfferCount((count) => count + tradeOptionBatchSize)}>
                <Text style={styles.loadMoreButtonText}>{t("bugdex.archiveShowMore", { count: Math.min(tradeOptionBatchSize, filteredTradeCopyOptions.length - visibleTradeCopyOptions.length) })}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.tradeEmpty}>{t("bugdex.noTradeBugs")}</Text>
        )}
        {tradeOfferIds.length > 0 && (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>{t("bugdex.chooseColleague")}</Text>
            <View style={styles.characterGrid}>
              {users.map((item) => (
                <Pressable key={item.uid} style={[styles.characterCard, tradeRecipientId === item.uid && styles.tradeChipActive]} onPress={() => chooseRecipient(item.uid)}>
                  <CharacterAvatarImage characterId={item.characterId} selected={tradeRecipientId === item.uid} size={64} />
                  <Text style={[styles.characterName, tradeRecipientId === item.uid && styles.tradeChipTextActive]} numberOfLines={1}>{item.displayName}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!!selectedRecipient && (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>{t("bugdex.requestBug")}</Text>
            {renderTradeFilters(tradeRequestRarityFilter, toggleTradeRequestRarityFilter, tradeRequestRoleFilter, toggleTradeRequestRoleFilter, tradeRequestSearch, setTradeRequestSearch)}
            {recipientTradeCopyOptions.length ? (
              <>
                <View style={styles.chipRow}>
                  {visibleRecipientTradeCopyOptions.map((option) => {
                    const selected = tradeRequestCopyKeys.includes(option.key);
                    const maxSelected = !selected && tradeRequestCopyKeys.length >= maxTradeBugSelection;
                    return (
                      <Pressable key={option.key} disabled={maxSelected} style={[styles.tradeBugChip, selected && styles.tradeChipActive, maxSelected && styles.activeSquadLockedChip]} onPress={() => setTradeRequestCopyKeys((current) => current.includes(option.key) ? current.filter((key) => key !== option.key) : [...current, option.key])}>
                        <BugJarArt bugId={option.bugId} rarity={bugRarity(option.bugId)} size={48} unlocked />
                        <Text style={[styles.tradeChipText, selected && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(option.bugId)}</Text>
                        <RarityStars rarity={bugRarity(option.bugId)} compact />
                        {option.totalCopies > 1 && <Text style={[styles.tradeCopyMeta, selected && styles.tradeChipTextActive]}>x{option.totalCopies}</Text>}
                        {!unlockedBugIds.has(option.bugId) && (
                          <Text style={[styles.tradeNeedPill, selected && styles.tradeNeedPillActive]}>{t("bugdex.youNeedThis")}</Text>
                        )}
                        <Text style={[styles.bugBuffMeta, selected && styles.tradeChipTextActive]} numberOfLines={2}>{tradeMasteryText(option.bugId, recipientMasteryMap)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {visibleRecipientTradeCopyOptions.length < filteredRecipientTradeCopyOptions.length ? (
                  <Pressable style={styles.loadMoreButton} onPress={() => setVisibleTradeRequestCount((count) => count + tradeOptionBatchSize)}>
                    <Text style={styles.loadMoreButtonText}>{t("bugdex.archiveShowMore", { count: Math.min(tradeOptionBatchSize, filteredRecipientTradeCopyOptions.length - visibleRecipientTradeCopyOptions.length) })}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.tradeEmpty}>{t("bugdex.colleagueNoBugs")}</Text>
            )}
          </View>
        )}
        {tradeOfferIds.length > 0 && tradeRequestIds.length > 0 && (
          <Pressable style={styles.tradeButton} disabled={tradeBusy === "send"} onPress={sendTradeRequest}>
            <Text style={styles.tradeButtonText}>{tradeBusy === "send" ? "..." : t("bugdex.sendTrade")}</Text>
          </Pressable>
        )}
        {incomingTrades.map((trade) => (
          <View key={trade.id} style={styles.tradeRequest}>
            <Text style={styles.tradeRequestTitle}>{t("bugdex.tradeIncomingFrom", { name: trade.fromUserName })}</Text>
            {tradeBusy === trade.id && <Text style={styles.tradeRequestText}>...</Text>}
            <View style={styles.tradeSwapBox}>
              <Text style={styles.tradeSwapLabel}>{t("bugdex.theyOffer")}</Text>
              {renderTradeBugSummary(tradeBugIds(trade, "offer"), masteryMapForUser(trade.fromUserId))}
              <Text style={styles.tradeSwapLabel}>{t("bugdex.theyWantFromYou")}</Text>
              {renderTradeBugSummary(tradeBugIds(trade, "request"), masteryMapForUser(trade.toUserId))}
            </View>
            <View style={styles.tradeActions}>
              <Pressable style={styles.acceptButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, true)}>
                <Text style={styles.actionText}>{tradeBusy === trade.id ? "..." : t("bugdex.accept")}</Text>
              </Pressable>
              <Pressable style={styles.rejectButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, false)}>
                <Text style={styles.actionText}>{t("bugdex.reject")}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {outgoingTrades.map((trade) => (
          <View key={trade.id} style={styles.tradeRequest}>
            <Text style={styles.tradeRequestTitle}>{t("bugdex.tradeOutgoingTo", { name: trade.toUserName })}</Text>
            <View style={styles.tradeSwapBox}>
              <Text style={styles.tradeSwapLabel}>{t("bugdex.youOffer")}</Text>
              {renderTradeBugSummary(tradeBugIds(trade, "offer"), masteryMapForUser(trade.fromUserId))}
              <Text style={styles.tradeSwapLabel}>{t("bugdex.youAskFromThem")}</Text>
              {renderTradeBugSummary(tradeBugIds(trade, "request"), masteryMapForUser(trade.toUserId))}
            </View>
            <Pressable style={styles.cancelButton} disabled={tradeBusy === trade.id} onPress={() => cancelTrade(trade)}>
              <Text style={styles.cancelButtonText}>{tradeBusy === trade.id ? "..." : t("bugdex.cancelTrade")}</Text>
            </Pressable>
          </View>
        ))}
        {tradeHistory.length > 0 && (
          <View style={styles.tradeHistoryBlock}>
            <Text style={styles.tradeHistoryTitle}>{t("bugdex.tradeHistory")}</Text>
            {tradeHistory.map((trade) => {
              const receivedIds = trade.toUserId === user.uid ? tradeBugIds(trade, "offer") : tradeBugIds(trade, "request");
              const gaveIds = trade.toUserId === user.uid ? tradeBugIds(trade, "request") : tradeBugIds(trade, "offer");
              return (
                <View key={trade.id} style={styles.tradeHistoryItem}>
                  <View style={styles.tradeHistoryHeader}>
                    <Text style={styles.tradeHistoryName}>{tradePartnerName(trade)}</Text>
                    <Text style={styles.tradeStatusPill}>{tradeStatusLabel(trade.status)}</Text>
                  </View>
                  <Text style={styles.tradeRequestText}>{t("bugdex.youReceived")}: {bugTradeListLabel(receivedIds) || "-"}</Text>
                  <Text style={styles.tradeRequestText}>{t("bugdex.youGave")}: {bugTradeListLabel(gaveIds) || "-"}</Text>
                </View>
              );
            })}
          </View>
        )}
        {!!tradeError && <Text style={sharedStyles.error}>{serviceErrorText(tradeError)}</Text>}
      </View>
      )}

      <Pressable
        style={[styles.workshopFeatureCard, upgradeExpanded && styles.workshopFeatureCardActive]}
        onLayout={(event) => {
          upgradeSectionY.current = event.nativeEvent.layout.y;
        }}
        onPress={() => setUpgradeExpanded((current) => !current)}
      >
        <Image resizeMode="cover" source={bugDexUpgradeImage} style={styles.workshopFeatureImage} />
        <View style={styles.workshopFeatureBody}>
          <Text style={styles.workshopFeatureTitle}>{t("bugdex.upgrades")}</Text>
          <Text style={styles.workshopFeatureMeta}>{t("bugdex.threeDifferent")}</Text>
        </View>
        <View style={styles.workshopFeatureAction}>
          <Text style={styles.workshopFeatureActionText}>{upgradeExpanded ? t("common.close") : t("common.open")}</Text>
        </View>
      </Pressable>

      {upgradeExpanded && (
      <View style={styles.upgradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>{t("bugdex.upgrades")}</Text>
          <Text style={styles.tradeMeta}>{t("bugdex.threeDifferent")}</Text>
        </View>
        <Text style={styles.tradeHint}>{t("bugdex.dailyUpgradeHint")}</Text>
        {upgradeOptions.map(({ items, rarity, targetRarity }) => {
          const requiredDifferentCount = differentUpgradeRequiredCount(rarity);
          const ready = items.length >= requiredDifferentCount;
          const selectedBugIds = upgradeSelections[rarity].filter((bugId) => items.some((item) => item.bugId === bugId));
          const routeUsedToday = upgradeRouteUsedToday(rarity);
          const canUpgrade = selectedBugIds.length === requiredDifferentCount && !routeUsedToday;
          return (
            <View key={rarity} style={[styles.upgradeRow, ready && { borderColor: routeUsedToday ? "#c6d3cc" : rarityColors[targetRarity] }, routeUsedToday && styles.upgradeRowUsed]}>
              <View style={styles.upgradeTextBlock}>
                <RarityUpgradeRoute label={`${rarityLabel(rarity, t)} -> ${rarityLabel(targetRarity, t)}`} rarity={rarity} targetRarity={targetRarity} />
                <Text style={styles.upgradeMeta}>{routeUsedToday ? t("bugdex.routeUsed") : t("bugdex.availableDifferent", { count: items.length, required: requiredDifferentCount })}</Text>
                {items.length >= requiredDifferentCount && !routeUsedToday && (
                  <View style={styles.upgradeChoiceGrid}>
                    {items.map((item) => {
                      const selected = selectedBugIds.includes(item.bugId);
                      const activeLocked = !canSpendBugCopy(item);
                      const disabled = activeLocked || (!selected && selectedBugIds.length >= requiredDifferentCount);
                      const rarityColor = rarityColors[bugRarity(item.bugId)];
                      return (
                        <Pressable
                          key={item.bugId}
                          disabled={disabled}
                          style={[
                            styles.upgradeChoice,
                            selected && { backgroundColor: rarityColors[targetRarity], borderColor: rarityColors[targetRarity] },
                            disabled && styles.upgradeChoiceDisabled,
                            activeLocked && styles.activeSquadLockedChip
                          ]}
                          onPress={() => toggleUpgradeSelection(rarity, item.bugId)}
                        >
                          <View style={styles.tradeJarWrap}>
                            {activeLocked ? <BugJarArt bugId={item.bugId} rarity={bugRarity(item.bugId)} size={46} unlocked /> : <BugArtImage bugId={item.bugId} size={32} />}
                            {activeLocked && (
                              <View style={styles.activeSquadLockBadge}>
                                <Text style={styles.activeSquadLockText}>LOCK</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.upgradeChoiceText, selected && styles.upgradeChoiceTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                          <RarityStars rarity={bugRarity(item.bugId)} compact />
                          {activeLocked && <Text style={[styles.activeSquadLockedText, { borderColor: rarityColor }]}>{t("bugdex.activeSquadLockedShort")}</Text>}
                          <Text style={[styles.bugBuffMeta, selected && styles.upgradeChoiceTextActive]} numberOfLines={2}>{bugBuffText(item.bugId)}</Text>
                          {item.count > 1 && <Text style={[styles.upgradeChoiceCount, selected && styles.upgradeChoiceTextActive]}>x{item.count}</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              {ready ? (
                <Pressable style={[styles.upgradeButton, { backgroundColor: canUpgrade ? rarityColors[targetRarity] : "#87958e" }]} disabled={!canUpgrade || upgradeBusy === rarity} onPress={() => upgradeDifferent(rarity, selectedBugIds)}>
                  <Text style={styles.upgradeButtonText}>{upgradeBusy === rarity ? "..." : routeUsedToday ? t("common.tomorrow") : canUpgrade ? t("bugdex.upgradeAction") : t("bugdex.chooseThree", { required: requiredDifferentCount })}</Text>
                </Pressable>
              ) : (
                <Text style={styles.upgradeLocked}>{t("bugdex.notYet")}</Text>
              )}
            </View>
          );
        })}
        <View style={styles.sameUpgradeSection}>
          <View style={styles.sameUpgradeSectionHeader}>
            <Text style={styles.sameUpgradeSectionTitle}>{t("bugdex.duplicateUpgrades")}</Text>
            <Text style={styles.sameUpgradeSectionMeta}>{t("bugdex.duplicateUpgradesMeta")}</Text>
          </View>
          {duplicateUpgradeOptions.length > 0 ? (
            <View style={styles.sameUpgradeList}>
              {duplicateUpgradeOptions.map(({ item, rarity, requiredSameCount, targetRarity }) => {
                const busyKey = `${rarity}:${item.bugId}`;
                return (
                  <Pressable key={`${rarity}:${item.bugId}`} style={[styles.sameUpgradeButton, { borderColor: rarityColors[targetRarity] }]} disabled={upgradeBusy === busyKey} onPress={() => upgradeSame(rarity, item.bugId)}>
                    <BugArtImage bugId={item.bugId} size={36} />
                    <View style={styles.sameUpgradeTextBlock}>
                      <Text style={styles.sameUpgradeBugName} numberOfLines={1}>{bugName(item.bugId)}</Text>
                      <Text style={styles.sameUpgradeMeta}>{t("bugdex.combineCount", { count: requiredSameCount })} - x{spendableCountForItem(item)}</Text>
                    </View>
                    <Text style={[styles.sameUpgradeCta, { color: rarityColors[targetRarity] }]}>{upgradeBusy === busyKey ? "..." : t("bugdex.upgradeAction")}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.sameUpgradeEmpty}>{t("bugdex.noDuplicateUpgrades")}</Text>
          )}
        </View>
        {!!upgradeError && <Text style={sharedStyles.error}>{serviceErrorText(upgradeError)}</Text>}
      </View>
      )}

      <View style={styles.tierPanel}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierPanelTitle}>{t("bugdex.tiers")}</Text>
          <Text style={styles.tierPanelMeta}>{tr(tier.title)}</Text>
        </View>
        <View style={styles.tierGrid}>
          {userTiers.map((item) => {
            const current = item.title === tier.title;
            return (
              <View key={item.title} style={[styles.tierCard, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.tierCardCurrent]}>
                <View style={[styles.tierGlow, { backgroundColor: item.frameAccent }]} />
                <View style={[styles.tierImageWrap, { backgroundColor: `${item.frameAccent}66`, borderColor: item.frameColor }]}>
                  <View style={[styles.tierCornerBadge, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                    <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={26} />
                  </View>
                  <View style={[styles.tierCircuit, styles.tierCircuitTop, { backgroundColor: item.frameColor }]} />
                  <View style={[styles.tierCircuit, styles.tierCircuitBottom, { backgroundColor: item.frameColor }]} />
                  <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(44, item.bugSize * 0.66)} />
                  <View style={[styles.tierMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                    <Text style={[styles.tierStar, { color: item.frameColor }]}>★</Text>
                  </View>
                </View>
                <Text style={[styles.tierTitle, { color: item.color }]} numberOfLines={1}>{tr(item.title)}</Text>
                <Text style={styles.tierMeta}>{item.minPoints}+ {t("common.pointsShort")}</Text>
                <Text style={styles.tierDescription} numberOfLines={2}>{tr(item.description)}</Text>
                <Text style={[styles.tierReward, { color: item.frameColor }]} numberOfLines={1}>{tr(item.rewardText)}</Text>
                {current && <Text style={styles.tierCurrentPill}>{t("bugdex.current")}</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{unlockedCount}</Text>
          <Text style={styles.summaryLabel}>{t("bugdex.caught")}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{everUnlockedCount}</Text>
          <Text style={styles.summaryLabel}>{t("bugdex.unlockedShort")}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{totalCount - everUnlockedCount}</Text>
          <Text style={styles.summaryLabel}>{t("bugdex.toGo")}</Text>
        </View>
      </View>

      <View
        onLayout={(event) => {
          dexSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        {dexList}
      </View>

      <Pressable style={sharedStyles.secondaryButton} onPress={() => setWorkspaceOpen(false)}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.close")}</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <View style={[
      sharedStyles.screen,
      styles.dashboard,
      {
        paddingBottom: embedded ? 8 : layout.navigationMode === "rail" ? 20 : layout.bottomNavHeight + layout.bottomNavInset + 48,
        paddingHorizontal: layout.gutter
      }
    ]}>
      <Animated.View
        style={[
          styles.dashboardInner,
          { maxWidth: layout.contentMaxWidth },
          {
            opacity: embedded ? 1 : dashboardIntro,
            transform: [{
              translateY: embedded ? 0 : dashboardIntro.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0]
              })
            }]
          }
        ]}
      >
        <View style={[styles.dashboardHeader, layout.isCompact && styles.dashboardHeaderCompact]}>
          <Image accessibilityIgnoresInvertColors source={require("../../assets/generated/bugdex-collection-view-hd.jpg")} style={styles.dashboardHeaderArt} />
          <View style={styles.dashboardHeaderShade} />
          <View style={styles.dashboardHeaderCopy}>
            <Text style={styles.dashboardEyebrow}>{t("bugdex.dashboardKicker")}</Text>
            <Text style={styles.dashboardTitle}>BugDex</Text>
            <Text style={styles.dashboardMeta}>{t("bugdex.dashboardProgress", { owned: everUnlockedCount, total: totalCount, progress })}</Text>
          </View>
          <View style={styles.dashboardHeroBug}>
            {headerEntry ? <BugArtImage bugId={headerEntry.id} size={74} /> : <LockedBugSilhouette size={58} />}
          </View>
        </View>

        {!embedded ? <View style={styles.dashboardProgress}>
          <View style={styles.dashboardProgressTrack}>
            <View style={[styles.dashboardProgressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.dashboardStats}>
            <Text style={styles.dashboardStat}><Text style={styles.dashboardStatValue}>{unlockedCount}</Text> gevangen</Text>
            <Text style={styles.dashboardStat}><Text style={styles.dashboardStatValue}>{totalCount - everUnlockedCount}</Text> te gaan</Text>
          </View>
        </View> : null}

        <View style={styles.dashboardActionRail}>
          {!embedded ? (
            <Pressable accessibilityRole="button" onPress={onOpenMuseum} style={[styles.dashboardAction, layout.isCompact && styles.dashboardActionCompact]}>
              <Image source={require("../../assets/generated/museum-gallery-v2.jpg")} style={styles.dashboardActionImage} />
              <Text style={styles.dashboardActionLabel}>Museum</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => openCollectionWorkspace("squad")} style={[styles.dashboardAction, layout.isCompact && styles.dashboardActionCompact]}>
            <Image source={activeBugSquadHeroImage} style={styles.dashboardActionImage} />
            <Text style={styles.dashboardActionLabel}>{t("bugdex.dashboardSquad")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => openCollectionWorkspace("trade")} style={[styles.dashboardAction, layout.isCompact && styles.dashboardActionCompact]}>
            <Image source={bugDexWorkshopImage} style={styles.dashboardActionImage} />
            <Text style={styles.dashboardActionLabel}>{t("bugdex.trade")}</Text>
            {incomingTrades.length > 0 ? <Text style={styles.dashboardActionBadge}>{incomingTrades.length}</Text> : null}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => openCollectionWorkspace("upgrade")} style={[styles.dashboardAction, layout.isCompact && styles.dashboardActionCompact]}>
            <Image source={bugDexUpgradeImage} style={styles.dashboardActionImage} />
            <Text style={styles.dashboardActionLabel}>{t("bugdex.upgrades")}</Text>
          </Pressable>
        </View>

        <View style={[styles.dashboardCollection, layout.isCompact && styles.dashboardCollectionCompact]}>
          <View style={styles.dashboardCollectionHeader}>
            <View>
              <Text style={styles.dashboardCollectionTitle}>{t("bugdex.dashboardLatest")}</Text>
              <Text style={styles.dashboardCollectionMeta}>{t("bugdex.dashboardLatestHint")}</Text>
            </View>
            <Text style={styles.dashboardPageCount}>{dashboardPage + 1}/{dashboardPageCount}</Text>
          </View>
          {dashboardCards.length ? (
            <View style={styles.dashboardBugGrid}>
              {dashboardCards.map((entry) => {
                const item = inventoryById[entry.id];
                const mastery = masteryForEntry(entry);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={entry.id}
                    onPress={() => setSelectedBugId(entry.id)}
                    style={[
                      styles.dashboardBugCard,
                      layout.isTablet && styles.dashboardBugCardWide,
                      { borderColor: rarityColors[entry.rarity] }
                    ]}
                  >
                    <SpecimenFrame rarity={entry.rarity} style={styles.dashboardBugFrame}>
                      <CrownGlow rank={bugCrownRankForMastery(entry, mastery)} size={58}>
                        <BugArtImage bugId={entry.id} size={58} />
                      </CrownGlow>
                    </SpecimenFrame>
                    <View style={styles.dashboardBugCopy}>
                      <Text numberOfLines={1} style={styles.dashboardBugName}>{bugDexEntryName(entry, t)}</Text>
                      <Text numberOfLines={1} style={styles.dashboardBugMeta}>{rarityLabel(entry.rarity, t)}{item && item.count > 1 ? ` · x${item.count}` : ""}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.dashboardEmpty}>
              <LockedBugSilhouette size={52} />
              <Text style={styles.dashboardEmptyText}>Ontdek je eerste echte insect om je collectie te starten.</Text>
            </View>
          )}
          <View style={styles.dashboardPager}>
            <Pressable disabled={dashboardPage <= 0} onPress={() => setDashboardPage((page) => Math.max(0, page - 1))} style={[styles.dashboardPagerButton, dashboardPage <= 0 && styles.dashboardPagerButtonDisabled]}>
              <GameUiIcon name="back" size={16} />
            </Pressable>
            <Pressable disabled={dashboardPage >= dashboardPageCount - 1} onPress={() => setDashboardPage((page) => Math.min(dashboardPageCount - 1, page + 1))} style={[styles.dashboardPagerButton, dashboardPage >= dashboardPageCount - 1 && styles.dashboardPagerButtonDisabled]}>
              <GameUiIcon name="next" size={16} />
            </Pressable>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => openCollectionWorkspace("dex")} style={styles.dashboardPrimaryButton}>
          <Text style={styles.dashboardPrimaryButtonText}>{t("bugdex.dashboardOpen")}</Text>
          <GameUiIcon name="next" size={20} />
        </Pressable>
        {!embedded ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.dashboardBackButton}>
            <Text style={styles.dashboardBackText}>{t("common.back")}</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      <Modal animationType="slide" visible={workspaceOpen} onRequestClose={() => setWorkspaceOpen(false)}>
        <View style={styles.workspaceShell}>
          <View style={styles.workspaceTopBar}>
            <View>
              <Text style={styles.workspaceEyebrow}>COLLECTION WORKSPACE</Text>
              <Text style={styles.workspaceTitle}>BugDex beheren</Text>
            </View>
            <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" onPress={() => setWorkspaceOpen(false)} style={styles.workspaceClose}>
              <Text style={styles.workspaceCloseText}>×</Text>
            </Pressable>
          </View>
          {collectionWorkspace}
        </View>
      </Modal>
      {renderBugMasteryModal()}
      {crownUpgrade ? <CrownUpgradeModal bugId={crownUpgrade.bugId} rank={crownUpgrade.rank} onClose={() => setCrownUpgrade(null)} /> : null}
      <BugDexUnlockModal drop={drop} onClose={() => setDrop(null)} />
      <TradeAnimationModal currentUser={user} trade={completedTrade} onClose={closeTradeResult} />
    </View>
  );

  function renderBugMasteryModal() {
    const entry = selectedBugId ? entryByBugId(selectedBugId) : null;
    if (!entry) return null;
    const inventoryItem = inventoryById[entry.id];
    const unlockItem = unlockById[entry.id];
    const mastery = masteryForEntry(entry);
    const crown = bugCrownProgress(entry.rarity, mastery.level, mastery.battleWins);
    const color = rarityColors[entry.rarity];
    const xpNeeded = mastery.level >= bugMasteryLevelCap ? 0 : bugMasteryXpForNextLevel(mastery.level, entry.rarity);
    const xpProgress = xpNeeded > 0 ? Math.min(100, Math.round((mastery.xp / xpNeeded) * 100)) : 100;
    const unlockedSkills = bugMasteryUnlockedSkills(mastery.role, mastery.level);
    const currentSkill = bugMasterySessionSkill(mastery) ?? unlockedSkills.find((skill) => skill.kind === "passive") ?? null;
    const nextLevel = bugMasteryNextUnlockLevel(mastery.level);
    const nextSkills = nextLevel ? bugMasterySkills.filter((skill) => skill.role === mastery.role && skill.unlockedAtLevel === nextLevel) : [];
    const nextSkill = nextSkills[0] ?? null;
    const active = activeSquadIds.includes(entry.id);
    const sources = inventoryItem?.sources ?? unlockItem?.sources ?? [];
    return (
      <Modal animationType="slide" transparent visible={Boolean(selectedBugId)} onRequestClose={() => setSelectedBugId("")}>
        <View style={styles.modalBackdrop}>
          <View style={styles.masteryModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeaderRow}>
                <View style={[styles.modalBugArt, { borderColor: color }]}>
                  {entry.rarity === "Mythisch" ? (
                    <>
                      <MythicRarityFrame size={136} style={styles.modalMythicFrame} />
                      <CrownGlow rank={bugCrownRankForMastery(entry, mastery)} size={116}>
                        <BugArtImage bugId={entry.id} size={116} />
                      </CrownGlow>
                    </>
                  ) : (
                    <CrownGlow rank="none" size={124}>
                      <BugArtImage bugId={entry.id} size={124} />
                    </CrownGlow>
                  )}
                </View>
                <View style={styles.modalTitleBlock}>
                  <Text style={styles.modalName}>{bugDexEntryName(entry, t)}</Text>
                  <Text style={styles.modalSubtitle}>{bugDexEntryTitle(entry, t)}</Text>
                  <View style={styles.modalChipRow}>
                    <Text style={[styles.modalChip, { backgroundColor: color }]}>{rarityLabel(entry.rarity, t)}</Text>
                    <Text style={styles.modalChip}>{masteryRoleLabel(mastery.role)}</Text>
                    <Text style={styles.modalChip}>{masteryRankLabel(mastery.rank)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.masteryProgressPanel}>
                <View style={styles.masteryProgressHeader}>
                  <Text style={styles.masteryLevel}>{t("bugdex.mastery.level", { level: mastery.level })}</Text>
                  <Text style={styles.masteryXp}>{xpNeeded > 0 ? t("bugdex.mastery.xp", { current: mastery.xp, total: xpNeeded }) : t("bugdex.mastery.maxed")}</Text>
                </View>
                <View style={styles.masteryTrack}>
                  <View style={[styles.masteryFill, { backgroundColor: color, width: `${xpProgress}%` }]} />
                </View>
                <Text style={styles.masteryNext}>{nextSkills.length ? t("bugdex.mastery.nextSkill", { level: nextLevel ?? 20, skill: nextSkills.map((skill) => masterySkillLabel(skill.id)).join(" + ") }) : masteryNextText(mastery)}</Text>
              </View>

              {entry.rarity === "Mythisch" ? (
                <View style={styles.crownPanel}>
                  <View style={styles.crownHeaderRow}>
                    <View>
                      <Text style={styles.crownKicker}>{t("bugdex.crown.kicker")}</Text>
                      <Text style={styles.crownTitle}>{t(`bugdex.crown.rank.${crown.rank}`)}</Text>
                    </View>
                    <Text style={styles.crownMultiplier}>+{Math.round((bugCrownPowerMultiplier(crown.rank) - 1) * 1000) / 10}% PvE</Text>
                  </View>
                  <Text style={styles.crownWins}>{t("bugdex.crown.wins", { wins: mastery.battleWins })}</Text>
                  {crown.complete ? (
                    <Text style={styles.crownComplete}>{t("bugdex.crown.complete")}</Text>
                  ) : crown.next ? (
                    <>
                      <Text style={styles.crownNext}>{t("bugdex.crown.next", { rank: t(`bugdex.crown.rank.${crown.next.rank}`) })}</Text>
                      <Text style={styles.crownRequirement}>{t("bugdex.crown.requirement", { level: crown.next.level, wins: crown.next.battleWins })}</Text>
                      <View style={styles.crownRequirementRow}>
                        <Text style={[styles.crownRequirementPill, crown.levelReady && styles.crownRequirementPillReady]}>{crown.levelReady ? "✓" : "•"} {t("bugdex.crown.levelCondition", { level: crown.next.level })}</Text>
                        <Text style={[styles.crownRequirementPill, crown.winsReady && styles.crownRequirementPillReady]}>{crown.winsReady ? "✓" : "•"} {t("bugdex.crown.winsCondition", { wins: crown.next.battleWins })}</Text>
                      </View>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t("bugdex.mastery.whatDoesItDo")}</Text>
                <View style={styles.masteryExplainPanel}>
                  <Text style={styles.masteryExplainRole}>{masteryRoleLabel(mastery.role)}</Text>
                  <Text style={styles.masteryExplainText}>{masteryRoleSummary(mastery.role)}</Text>
                  <View style={styles.masteryFocusGrid}>
                    {currentSkill ? renderMasterySkillCard(currentSkill, "current") : <Text style={styles.modalMuted}>{t("bugdex.mastery.noSkills")}</Text>}
                    {nextSkill ? renderMasterySkillCard(nextSkill, "next") : <Text style={styles.masteryMaxPill}>{t("bugdex.mastery.maxed")}</Text>}
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t("bugdex.mastery.allUnlocks")}</Text>
                <View style={styles.skillGrid}>
                  {unlockedSkills.length ? unlockedSkills.map((skill) => (
                    <View key={skill.id} style={styles.skillPill}>
                      <View style={styles.skillTitleRow}>
                        <Text style={styles.skillName}>{masterySkillLabel(skill.id)}</Text>
                        <Text style={styles.skillLevel}>Lv. {skill.unlockedAtLevel}</Text>
                      </View>
                      <Text style={styles.skillMeta}>{t(`bugdex.mastery.skillKind.${skill.kind}`)}</Text>
                      <Text style={styles.skillDescription}>{masterySkillDescription(skill.id)}</Text>
                    </View>
                  )) : (
                    <Text style={styles.modalMuted}>{t("bugdex.mastery.noSkills")}</Text>
                  )}
                  {nextSkills.map((skill) => (
                    <View key={`next-${skill.id}`} style={[styles.skillPill, styles.skillPillLocked]}>
                      <View style={styles.skillTitleRow}>
                        <Text style={styles.skillName}>{masterySkillLabel(skill.id)}</Text>
                        <Text style={styles.skillLevel}>Lv. {skill.unlockedAtLevel}</Text>
                      </View>
                      <Text style={styles.skillMeta}>{t(`bugdex.mastery.skillKind.${skill.kind}`)}</Text>
                      <Text style={styles.skillDescription}>{masterySkillDescription(skill.id)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatValue}>{inventoryItem?.count ?? 0}</Text>
                  <Text style={styles.modalStatLabel}>{t("bugdex.mastery.owned")}</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatValue}>{active ? t("bugdex.mastery.active") : t("bugdex.mastery.inactive")}</Text>
                  <Text style={styles.modalStatLabel}>{t("bugdex.activeSquad")}</Text>
                </View>
                <View style={styles.modalStat}>
                  <Text style={styles.modalStatValue}>{mastery.duelUses + mastery.soloUses}</Text>
                  <Text style={styles.modalStatLabel}>{t("bugdex.mastery.uses")}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t("bugdex.mastery.sources")}</Text>
                <View style={styles.sourceLabels}>
                  {sources.length ? sources.map((source) => <Text key={source} style={styles.sourceLabel}>{bugDexSourceLabel(source)}</Text>) : <Text style={styles.modalMuted}>{t("bugdex.mastery.noSources")}</Text>}
                </View>
              </View>

              <Pressable style={styles.modalCloseButton} onPress={() => setSelectedBugId("")}>
                <Text style={styles.modalCloseText}>{t("common.close")}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  dashboard: {
    backgroundColor: "#f5f0e5",
    paddingVertical: 8
  },
  dashboardInner: {
    alignSelf: "center",
    flex: 1,
    gap: 8,
    minHeight: 0,
    width: "100%"
  },
  dashboardHeader: {
    alignItems: "center",
    backgroundColor: "#171735",
    borderColor: "#504b85",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 82,
    overflow: "hidden",
    paddingHorizontal: 15,
    paddingVertical: 10
  },
  dashboardHeaderCompact: {
    minHeight: 68,
    paddingVertical: 6
  },
  dashboardHeaderArt: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    opacity: 0.44,
    width: "100%"
  },
  dashboardHeaderShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,19,51,0.72)"
  },
  dashboardHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  dashboardEyebrow: {
    color: "#d7bd57",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1
  },
  dashboardTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 28
  },
  dashboardMeta: {
    color: "#d9d5e9",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1
  },
  dashboardHeroBug: {
    alignItems: "center",
    backgroundColor: "rgba(242,197,101,0.15)",
    borderColor: "rgba(215,189,87,0.46)",
    borderRadius: 34,
    borderWidth: 1,
    height: 66,
    justifyContent: "center",
    width: 66
  },
  dashboardProgress: {
    backgroundColor: "#fffaf0",
    borderColor: "#ddd0b5",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  dashboardProgressTrack: {
    backgroundColor: "#e6dfd3",
    borderRadius: 6,
    height: 8,
    overflow: "hidden"
  },
  dashboardProgressFill: {
    backgroundColor: "#d39b35",
    borderRadius: 6,
    height: "100%"
  },
  dashboardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5
  },
  dashboardStat: {
    color: "#6e6a7b",
    fontSize: 10,
    fontWeight: "800"
  },
  dashboardStatValue: {
    color: "#292450",
    fontSize: 12,
    fontWeight: "900"
  },
  dashboardActionRail: {
    flexDirection: "row",
    gap: 7
  },
  dashboardAction: {
    alignItems: "center",
    backgroundColor: "#242047",
    borderColor: "#5d5796",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    height: 72,
    justifyContent: "flex-end",
    minWidth: 0,
    overflow: "hidden",
    padding: 7
  },
  dashboardActionCompact: {
    height: 58
  },
  dashboardActionImage: {
    height: "100%",
    left: 0,
    opacity: 0.56,
    position: "absolute",
    top: 0,
    width: "100%"
  },
  dashboardActionLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  dashboardActionBadge: {
    backgroundColor: "#ec5a45",
    borderRadius: 10,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    right: 5,
    textAlign: "center",
    top: 5
  },
  dashboardCollection: {
    backgroundColor: "#fffaf0",
    borderColor: "#ddd0b5",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 250,
    padding: 10
  },
  dashboardCollectionCompact: {
    minHeight: 168
  },
  dashboardCollectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7
  },
  dashboardCollectionTitle: {
    color: "#292450",
    fontSize: 14,
    fontWeight: "900"
  },
  dashboardCollectionMeta: {
    color: "#746f80",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 1
  },
  dashboardPageCount: {
    backgroundColor: "#eee8f7",
    borderRadius: 10,
    color: "#4f46a5",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  dashboardBugGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  dashboardBugCard: {
    alignItems: "center",
    backgroundColor: "#fbf7ed",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    padding: 6,
    width: "48.8%"
  },
  dashboardBugCardWide: {
    width: "24%"
  },
  dashboardBugFrame: {
    height: 62,
    overflow: "visible",
    width: 62
  },
  dashboardBugCopy: {
    flex: 1,
    marginLeft: 5,
    minWidth: 0
  },
  dashboardBugName: {
    color: "#292450",
    fontSize: 10,
    fontWeight: "900"
  },
  dashboardBugMeta: {
    color: "#716c7c",
    fontSize: 8,
    fontWeight: "800",
    marginTop: 2
  },
  dashboardEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 12
  },
  dashboardEmptyText: {
    color: "#607067",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    maxWidth: 240,
    textAlign: "center"
  },
  dashboardPager: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 7
  },
  dashboardPagerButton: {
    alignItems: "center",
    backgroundColor: "#4f46a5",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  dashboardPagerButtonDisabled: {
    backgroundColor: "#cbd6cf"
  },
  dashboardPagerText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24
  },
  dashboardPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#d39b35",
    borderRadius: 14,
    elevation: 3,
    flexDirection: "row",
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#302457",
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 7
  },
  dashboardPrimaryButtonText: {
    color: "#241f46",
    fontSize: 14,
    fontWeight: "900"
  },
  dashboardPrimaryButtonArrow: {
    color: "#241f46",
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8
  },
  dashboardBackButton: {
    alignItems: "center",
    height: 26,
    justifyContent: "center"
  },
  dashboardBackText: {
    color: "#635e70",
    fontSize: 11,
    fontWeight: "900"
  },
  workspaceShell: {
    backgroundColor: "#f5f0e5",
    flex: 1
  },
  workspaceTopBar: {
    alignItems: "center",
    backgroundColor: "#171735",
    borderBottomColor: "#504b85",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 70,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  workspaceEyebrow: {
    color: "#d7bd57",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1
  },
  workspaceTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 1
  },
  workspaceClose: {
    alignItems: "center",
    backgroundColor: "#302b59",
    borderColor: "#665f9b",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  workspaceCloseText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26
  },
  content: {
    paddingBottom: 120
  },
  header: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14
  },
  squadFeatureCard: {
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden"
  },
  squadFeatureCardActive: {
    borderColor: "#69c88d"
  },
  squadFeatureImage: {
    backgroundColor: "#102018",
    height: 152,
    width: "100%"
  },
  squadFeatureOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.78)",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    left: 0,
    padding: 12,
    position: "absolute",
    right: 0,
    top: 0
  },
  squadFeatureCopy: {
    flex: 1
  },
  squadFeatureTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  squadFeatureMeta: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  squadFeatureAction: {
    backgroundColor: "#69c88d",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  squadFeatureActionText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  workshopFeatureCard: {
    alignItems: "center",
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    overflow: "hidden",
    padding: 10
  },
  workshopFeatureCardActive: {
    backgroundColor: "#fff3cf",
    borderColor: "#b88a1d"
  },
  workshopFeatureImage: {
    backgroundColor: "#102018",
    borderRadius: 8,
    height: 76,
    width: 92
  },
  workshopFeatureBody: {
    flex: 1,
    minWidth: 0
  },
  workshopFeatureTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  workshopFeatureMeta: {
    color: "#6d5a24",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 3
  },
  workshopFeatureAction: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  workshopFeatureActionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  activeJarPreview: {
    alignItems: "center",
    backgroundColor: "#edf7f5",
    borderTopColor: "#a7d2ca",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 92,
    padding: 12
  },
  activeJarMini: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  activeJarMiniName: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
    width: "100%"
  },
  preview: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 92,
    padding: 12
  },
  previewTile: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    height: 68,
    justifyContent: "center",
    width: 68
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    color: "#ffffff"
  },
  headerMeta: {
    color: "#dce9df",
    fontSize: 14,
    fontWeight: "900"
  },
  headerBugWrap: {
    alignItems: "center",
    height: 84,
    justifyContent: "center",
    width: 84
  },
  headerMythicFrame: {
    zIndex: 1
  },
  headerMythicBug: {
    zIndex: 2
  },
  headerEmptyIcon: {
    alignItems: "center",
    backgroundColor: "#294338",
    borderRadius: 8,
    height: 74,
    justifyContent: "center",
    width: 74
  },
  headerEmptyText: {
    color: "#dce9df",
    fontSize: 38,
    fontWeight: "900"
  },
  progressTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 12,
    marginBottom: 12,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: "#15724f",
    height: "100%"
  },
  tierPanel: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    display: "none",
    marginBottom: 12,
    padding: 12
  },
  tierHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  tierPanelTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900"
  },
  tierPanelMeta: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  tierGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  tierCard: {
    backgroundColor: "#f7faf6",
    borderRadius: 8,
    borderWidth: 3,
    minHeight: 226,
    overflow: "visible",
    padding: 9,
    width: "48%"
  },
  tierCardCurrent: {
    backgroundColor: "#fff9df",
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5
  },
  tierImageWrap: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 98,
    justifyContent: "center",
    marginBottom: 14,
    overflow: "visible"
  },
  tierGlow: {
    bottom: 0,
    left: 0,
    opacity: 0.18,
    position: "absolute",
    right: 0,
    top: 0
  },
  tierCornerBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    left: -1,
    position: "absolute",
    top: -1,
    width: 50,
    zIndex: 2
  },
  tierCircuit: {
    height: 2,
    opacity: 0.4,
    position: "absolute",
    width: 30
  },
  tierCircuitTop: {
    right: 10,
    top: 12
  },
  tierCircuitBottom: {
    bottom: 12,
    left: 10
  },
  tierMedal: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    bottom: -12,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    width: 42,
    zIndex: 2
  },
  tierStar: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: "900"
  },
  tierMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  tierDescription: {
    color: "#6d7b73",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 5
  },
  tierReward: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6
  },
  tierCurrentPill: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  summaryTile: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  summaryValue: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  summaryLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  squadDropdown: {
    alignItems: "center",
    backgroundColor: "#f7fbf7",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12
  },
  squadDropdownActive: {
    backgroundColor: "#173126",
    borderColor: "#69c88d"
  },
  squadDropdownTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  squadDropdownTitleActive: {
    color: "#ffffff"
  },
  squadDropdownMeta: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  squadDropdownMetaActive: {
    color: "#dce9df"
  },
  squadPanel: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  helperInfoPanel: {
    backgroundColor: "#eef5f0",
    borderColor: "#c6d3cc",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    marginTop: 10,
    padding: 10
  },
  helperInfoHeader: { gap: 3 },
  helperInfoTitle: { color: "#102018", fontSize: 14, fontWeight: "900" },
  helperInfoIntro: { color: "#52665d", fontSize: 10, fontWeight: "700", lineHeight: 14 },
  helperInfoRow: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#d7e1d9", borderRadius: 9, borderWidth: 1, flexDirection: "row", gap: 9, padding: 8 },
  helperInfoCopy: { flex: 1, minWidth: 0 },
  helperInfoNameRow: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "space-between" },
  helperInfoName: { color: "#102018", flex: 1, fontSize: 11, fontWeight: "900" },
  helperInfoKind: { backgroundColor: "#173126", borderRadius: 999, color: "#ffffff", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  helperInfoBody: { color: "#344a3e", fontSize: 9.5, fontWeight: "700", lineHeight: 13, marginTop: 3 },
  helperInfoStats: { color: "#6c4d00", fontSize: 8.5, fontWeight: "900", marginTop: 4 },
  squadJarBugs: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10
  },
  squadBugJarWrap: {
    alignItems: "center",
    flex: 1
  },
  squadBugJarLid: {
    backgroundColor: "#6d5441",
    borderColor: "#3e2e24",
    borderRadius: 8,
    borderWidth: 1,
    height: 13,
    marginBottom: -4,
    width: 58,
    zIndex: 2
  },
  squadJarShine: {
    backgroundColor: "rgba(255,255,255,0.46)",
    borderRadius: 999,
    height: 76,
    left: 10,
    position: "absolute",
    top: 12,
    transform: [{ rotate: "10deg" }],
    width: 10
  },
  squadJarSlot: {
    alignItems: "center",
    backgroundColor: "#edf7f5",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 142,
    padding: 8,
    width: "100%"
  },
  squadJarBase: {
    backgroundColor: "rgba(41,67,56,0.22)",
    borderRadius: 999,
    bottom: 7,
    height: 8,
    left: 12,
    position: "absolute",
    right: 12
  },
  squadJarMythicFrame: {
    top: 5,
    zIndex: 1
  },
  squadJarMythicBug: {
    zIndex: 2
  },
  squadSlotName: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  squadSlotBonus: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
  },
  squadMasteryBadge: {
    alignSelf: "stretch",
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginTop: 6,
    padding: 6
  },
  squadMasteryRow: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minWidth: 0
  },
  squadMasteryPill: {
    backgroundColor: "#102018",
    borderRadius: 999,
    color: "#ffffff",
    flexShrink: 0,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  squadMasteryRolePill: {
    backgroundColor: "#e7f2eb",
    color: "#15724f",
    flexShrink: 1,
    maxWidth: 58
  },
  squadMasteryMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center"
  },
  squadMasteryTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 999,
    height: 4,
    overflow: "hidden"
  },
  squadMasteryFill: {
    height: "100%"
  },
  squadRoleBadge: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#e2efe7",
    borderColor: "#9db6a8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    paddingHorizontal: 4,
    paddingVertical: 3
  },
  squadRoleLabel: {
    color: "#183326",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  squadRoleValue: {
    color: "#2e6b4d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 1,
    textAlign: "center"
  },
  squadRoleDescription: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    marginTop: 3,
    textAlign: "center"
  },
  squadEmptyMark: {
    color: "#87958e",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 12
  },
  squadBonusList: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    gap: 7,
    marginBottom: 10,
    padding: 8
  },
  squadBonusItem: {
    gap: 2
  },
  squadBonusText: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "800"
  },
  squadBonusDescription: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15
  },
  tradeDropdown: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12
  },
  tradeDropdownActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  tradeDropdownTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  tradeDropdownTitleActive: {
    color: "#ffffff"
  },
  tradeDropdownMeta: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  tradeDropdownMetaActive: {
    color: "#dce9df"
  },
  tradePanel: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  tradeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  tradeTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900"
  },
  tradeMeta: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  tradeSection: {
    marginBottom: 10
  },
  tradeLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6
  },
  tradeFilterBlock: {
    gap: 7,
    marginBottom: 8
  },
  tradeSearchInput: {
    backgroundColor: "#ffffff",
    borderColor: "#c6d3cc",
    borderRadius: 10,
    borderWidth: 1,
    color: "#102018",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  tradeRarityFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  tradeRarityFilterButton: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 44,
    paddingHorizontal: 7,
    paddingVertical: 6
  },
  tradeRarityFilterButtonActive: {
    backgroundColor: "#102018"
  },
  tradeRoleFilterButton: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  tradeRoleFilterText: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900"
  },
  rarityImageStarsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
    justifyContent: "center"
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  tradeChip: {
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  tradeChipActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  tradeBugChip: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 112,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 96
  },
  squadBugChip: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 118,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 108
  },
  tradeJarWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    position: "relative"
  },
  activeSquadLockedChip: {
    backgroundColor: "#f6fbf8",
    borderColor: "#d7bd57",
    opacity: 1
  },
  activeSquadLockBadge: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 28,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    right: -8,
    top: -4
  },
  activeSquadLockText: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "900"
  },
  activeSquadLockedText: {
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    color: "#5c480a",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 3,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  squadBugChipActive: {
    backgroundColor: "#173126",
    borderColor: "#69c88d"
  },
  squadBugChipDisabled: {
    opacity: 0.45
  },
  squadBugChipText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
    width: "100%"
  },
  squadBugChipTextActive: {
    color: "#ffffff"
  },
  squadBugChipMeta: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  squadChipMastery: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: "100%"
  },
  squadChipMasteryActive: {
    backgroundColor: "#234435",
    borderColor: "#69c88d"
  },
  squadChipMasteryLevel: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  squadChipTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 999,
    height: 4,
    marginTop: 4,
    overflow: "hidden"
  },
  squadChipFill: {
    height: "100%"
  },
  squadBugChipAttack: {
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  squadAttackBadge: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    width: "100%"
  },
  squadAttackBadgeActive: {
    backgroundColor: "#234435",
    borderColor: "#69c88d"
  },
  squadAttackIcon: {
    height: 18,
    width: 18
  },
  tradeChipText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
    width: "100%"
  },
  tradeChipTextActive: {
    color: "#ffffff"
  },
  tradeChipMeta: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  tradeCopyMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2
  },
  bugBuffMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
    marginTop: 3,
    textAlign: "center",
    width: "100%"
  },
  tradeNeedPill: {
    backgroundColor: "#fff4c7",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    color: "#5c480a",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 4,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  tradeNeedPillActive: {
    backgroundColor: "#d7bd57",
    color: "#102018"
  },
  tradeRarityPill: {
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 3,
    maxWidth: "100%",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  rarityStarsPill: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 3,
    minHeight: 18,
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  rarityStarsPillCompact: {
    minHeight: 16,
    minWidth: 30,
    paddingHorizontal: 5,
    paddingVertical: 1
  },
  rarityStarsText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
    textAlign: "center"
  },
  rarityStarsTextCompact: {
    fontSize: 8,
    lineHeight: 10
  },
  tradeButton: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    marginBottom: 10,
    paddingVertical: 10
  },
  tradeButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  tradeRequest: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    marginTop: 8,
    padding: 10
  },
  tradeRequestTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  tradeRequestText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  tradeMasteryText: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1
  },
  tradeSummaryItem: {
    backgroundColor: "#f7faf6",
    borderColor: "#e0ebe4",
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 5
  },
  tradeSummaryList: {
    gap: 2
  },
  tradeSwapBox: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    padding: 9
  },
  tradeSwapLabel: {
    color: "#15724f",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4,
    textTransform: "uppercase"
  },
  tradeHistoryBlock: {
    marginTop: 12
  },
  tradeHistoryTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4
  },
  tradeHistoryItem: {
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    padding: 9
  },
  tradeHistoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  tradeHistoryName: {
    color: "#102018",
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  tradeStatusPill: {
    backgroundColor: "#e3eddf",
    borderRadius: 999,
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  tradeActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  acceptButton: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8
  },
  rejectButton: {
    alignItems: "center",
    backgroundColor: "#b83227",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 8
  },
  cancelButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#b83227",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  tradeEmpty: {
    color: "#6d7b73",
    fontSize: 12,
    fontWeight: "800"
  },
  tradeHint: {
    backgroundColor: "#eef4ed",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10,
    padding: 9
  },
  tradeWarning: {
    backgroundColor: "#fff8e8",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    color: "#8a271c",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 10,
    padding: 9
  },
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9
  },
  characterCard: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 8,
    width: 92
  },
  characterName: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
    width: "100%"
  },
  upgradePanel: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  upgradeRow: {
    alignItems: "center",
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    padding: 10
  },
  upgradeRowUsed: {
    opacity: 0.72
  },
  upgradeTextBlock: {
    flex: 1
  },
  rarityUpgradeRoute: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  rarityUpgradeArrow: {
    color: "#52665d",
    fontSize: 16,
    fontWeight: "900"
  },
  upgradeMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3
  },
  sameUpgradeSection: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 10
  },
  sameUpgradeSectionHeader: {
    gap: 3,
    marginBottom: 2
  },
  sameUpgradeSectionTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  sameUpgradeSectionMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15
  },
  sameUpgradeEmpty: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8
  },
  sameUpgradeList: {
    gap: 8,
    marginTop: 10
  },
  sameUpgradeTitle: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  sameUpgradeButton: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  sameUpgradeTextBlock: {
    flex: 1
  },
  sameUpgradeBugName: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  sameUpgradeMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  sameUpgradeCta: {
    fontSize: 12,
    fontWeight: "900"
  },
  upgradeChoiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8
  },
  upgradeChoice: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 86
  },
  upgradeChoiceDisabled: {
    opacity: 0.42
  },
  upgradeChoiceText: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center",
    width: "100%"
  },
  upgradeChoiceCount: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  upgradeChoiceTextActive: {
    color: "#ffffff"
  },
  upgradeButton: {
    alignItems: "center",
    borderRadius: 8,
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  upgradeButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  upgradeLocked: {
    color: "#87958e",
    fontSize: 12,
    fontWeight: "900"
  },
  dexToolbar: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12
  },
  dexToolbarTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  dexToolbarMeta: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  rarityFilterCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  rarityFilterTitle: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  rarityFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  rarityFilterChip: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  rarityFilterStarChip: {
    minWidth: 48,
    paddingHorizontal: 9
  },
  rarityFilterChipActive: {
    backgroundColor: "#102018",
    borderColor: "#102018"
  },
  rarityFilterChipText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  rarityFilterChipTextActive: {
    color: "#ffffff"
  },
  setCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  setEmblemWrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 9
  },
  setPickerButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  setPickerTextBlock: {
    flex: 1
  },
  setLabel: {
    color: "#102018",
    fontSize: 17,
    fontWeight: "900"
  },
  setMeta: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  setChevron: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900"
  },
  setDescription: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 8
  },
  setOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  setOption: {
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  setOptionActive: {
    backgroundColor: "#15724f",
    borderColor: "#15724f"
  },
  setOptionText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  setOptionTextActive: {
    color: "#ffffff"
  },
  lockedToggle: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 46
  },
  lockedToggleActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  visibilityIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 28
  },
  visibilityEye: {
    alignItems: "center",
    borderColor: "#102018",
    borderRadius: 999,
    borderWidth: 2,
    height: 15,
    justifyContent: "center",
    transform: [{ scaleX: 1.35 }],
    width: 18
  },
  visibilityEyeActive: {
    borderColor: "#ffffff"
  },
  visibilityPupil: {
    backgroundColor: "#102018",
    borderRadius: 999,
    height: 6,
    width: 6
  },
  visibilityPupilActive: {
    backgroundColor: "#ffffff"
  },
  visibilitySlash: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    height: 3,
    position: "absolute",
    transform: [{ rotate: "-38deg" }],
    width: 30
  },
  lockedToggleText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  lockedToggleTextActive: {
    color: "#ffffff"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 218,
    padding: 10,
    width: "48%"
  },
  lockedCard: {
    backgroundColor: "#f3f7f2"
  },
  everHadCard: {
    backgroundColor: "#eef4ef",
    opacity: 0.78
  },
  mythicCard: {
    backgroundColor: "#fbf5ff",
    borderWidth: 2,
    shadowColor: "#7c3aed",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  numberPill: {
    backgroundColor: "#87958e",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  numberText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  rarity: {
    fontSize: 11,
    fontWeight: "900"
  },
  bugWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    minHeight: 112,
    overflow: "visible"
  },
  mythicBugWrap: {
    minHeight: 112
  },
  cardMythicFrame: {
    zIndex: 1
  },
  cardMythicBug: {
    zIndex: 2
  },
  lockedBugWrap: {
    opacity: 0.86
  },
  everHadBugWrap: {
    opacity: 0.55
  },
  lockedMark: {
    color: "#87958e",
    fontSize: 44,
    fontWeight: "900"
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  name: {
    color: "#102018",
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  lockedName: {
    color: "#53645d"
  },
  countPill: {
    backgroundColor: "#102018",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  title: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  note: {
    color: "#6d7b73",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 7
  },
  masteryCardBlock: {
    gap: 5,
    marginTop: 8
  },
  masteryMiniRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5
  },
  masteryMiniPill: {
    backgroundColor: "#102018",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  masteryRolePill: {
    backgroundColor: "#e7f2eb",
    color: "#15724f"
  },
  masteryCardMeta: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900"
  },
  masteryCardTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 999,
    height: 5,
    overflow: "hidden"
  },
  masteryCardFill: {
    height: "100%"
  },
  modalBackdrop: {
    backgroundColor: "rgba(16,32,24,0.58)",
    flex: 1,
    justifyContent: "flex-end"
  },
  masteryModal: {
    backgroundColor: "#fdfefb",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "92%",
    padding: 18
  },
  modalHeaderRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16
  },
  modalBugArt: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    borderWidth: 2,
    height: 148,
    justifyContent: "center",
    width: 148
  },
  modalMythicFrame: {
    top: 0
  },
  modalTitleBlock: {
    flex: 1,
    justifyContent: "center"
  },
  modalName: {
    color: "#102018",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28
  },
  modalSubtitle: {
    color: "#52665d",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4
  },
  modalChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  modalChip: {
    backgroundColor: "#102018",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  masteryProgressPanel: {
    backgroundColor: "#eef4ed",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  masteryProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  masteryLevel: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900"
  },
  masteryXp: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  masteryTrack: {
    backgroundColor: "#d7e1d9",
    borderRadius: 999,
    height: 10,
    marginTop: 10,
    overflow: "hidden"
  },
  masteryFill: {
    borderRadius: 999,
    height: "100%"
  },
  masteryNext: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8
  },
  crownPanel: {
    backgroundColor: "#fff8df",
    borderColor: "#d7bd57",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  crownHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  crownKicker: {
    color: "#9c7420",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  crownTitle: {
    color: "#5e4310",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2
  },
  crownMultiplier: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  crownWins: {
    color: "#6f5b2e",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8
  },
  crownNext: {
    color: "#5e4310",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  crownRequirement: {
    color: "#6f5b2e",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3
  },
  crownRequirementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8
  },
  crownRequirementPill: {
    backgroundColor: "#efe4bd",
    borderRadius: 999,
    color: "#6f5b2e",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  crownRequirementPillReady: {
    backgroundColor: "#d9f0dc",
    color: "#15724f"
  },
  crownComplete: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  modalSection: {
    marginBottom: 12
  },
  modalSectionTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8
  },
  masteryExplainPanel: {
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  masteryExplainRole: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  masteryExplainText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3
  },
  masteryFocusGrid: {
    gap: 7,
    marginTop: 10
  },
  masteryFocusCard: {
    backgroundColor: "#eef4ed",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  masteryFocusCardNext: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    opacity: 0.78
  },
  masteryFocusLabel: {
    color: "#15724f",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  masteryMaxPill: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  skillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  skillPill: {
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "48%"
  },
  skillPillLocked: {
    opacity: 0.64
  },
  skillTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between"
  },
  skillName: {
    color: "#102018",
    flex: 1,
    fontSize: 12,
    fontWeight: "900"
  },
  skillLevel: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    color: "#102018",
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  skillMeta: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2
  },
  skillDescription: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 5
  },
  modalStatsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  modalStat: {
    alignItems: "center",
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  modalStatValue: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  modalStatLabel: {
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
  },
  sourceLabels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  sourceLabel: {
    backgroundColor: "#eee2c8",
    borderColor: "#c7b899",
    borderRadius: 7,
    borderWidth: 1,
    color: "#4f493d",
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  modalMuted: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    marginTop: 4,
    paddingVertical: 12
  },
  modalCloseText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  lockedText: {
    color: "#87958e"
  },
  everHadText: {
    color: "#64746c"
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: "#173426",
    borderColor: "#d7bd57",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    width: "100%"
  },
  loadMoreButtonText: {
    color: "#fff6d2",
    fontSize: 11,
    fontWeight: "900"
  },
  errorDexCard: {
    backgroundColor: "#f4e3dc",
    borderColor: "#b97e69"
  },
  emptyDexCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    width: "100%"
  },
  emptyDexTitle: {
    color: "#102018",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 8
  },
  emptyDexText: {
    color: "#52665d",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center"
  },
  combineButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 8
  },
  combineButtonDisabled: {
    backgroundColor: "#87958e"
  },
  combineText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  museumFeature: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    minHeight: 104,
    overflow: "hidden",
    padding: 14,
    position: "relative"
  },
  museumFeatureArt: { height: "100%", opacity: 0.48, position: "absolute", right: 0, top: 0, width: "100%" },
  museumFeatureCopy: { flex: 1, zIndex: 1 },
  museumKicker: {
    color: "#d7bd57",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1
  },
  museumTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  museumMeta: {
    color: "#c9d9cf",
    fontSize: 12,
    marginTop: 3
  },
  museumArrow: {
    color: "#d7bd57",
    fontSize: 34,
    fontWeight: "400",
    zIndex: 1
  }
});
