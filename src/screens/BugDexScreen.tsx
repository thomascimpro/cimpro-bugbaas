import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugDexUnlockModal } from "../components/BugDexUnlockModal";
import { TradeAnimationModal } from "../components/TradeAnimationModal";
import { BugDexDropResult, DailyUpgradeUsage, bugDexInventoryMap, combineBugDexDuplicates, combineDifferentBugDexUpgrade, combineRequiredCount, entryByBugId, getDailyUpgradeUsage, listBugDexInventory } from "../services/bugDexService";
import { activeBugSquadBonusList, maxActiveBugSquadSize, sanitizeActiveBugSquad, BugSquadBonusCategory } from "../services/bugSquadService";
import { bugDexEntryName, bugDexEntryNote, bugDexEntryTitle, rarityLabel, useI18n } from "../services/i18n";
import { notifyTradeAccepted, notifyTradeRequest } from "../services/notificationService";
import { bugDexEntries, BugDexEntry, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { cancelTradeRequest, createTradeRequest, listTradeRequests, markTradeRequesterSeen, respondToTradeRequest } from "../services/tradeService";
import { listUsers, updateUserBugSquad } from "../services/userService";
import { BugDexInventoryItem, TradeRequest, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  openTradeRequest?: number;
  onUserUpdated?: (user: User) => void;
  user: User;
  onBack: () => void;
};

type UpgradeRarity = Exclude<BugDexRarity, "Mythisch">;

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};
const raritySortOrder: Record<BugDexRarity, number> = {
  Mythisch: 0,
  Legendarisch: 1,
  Episch: 2,
  Zeldzaam: 3,
  Gewoon: 4
};
const upgradeRarities: UpgradeRarity[] = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch"];
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
const bugDexWorkshopImage = require("../../assets/generated/bugdex-workshop-shortcut.png");

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

export function BugDexScreen({ openTradeRequest = 0, onUserUpdated, user, onBack }: Props) {
  const { t, tr } = useI18n();
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [inventoriesByUserId, setInventoriesByUserId] = useState<Record<string, BugDexInventoryItem[]>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<BugDexInventoryItem[]>([]);
  const [drop, setDrop] = useState<BugDexDropResult | null>(null);
  const [completedTrade, setCompletedTrade] = useState<TradeRequest | null>(null);
  const [closedCompletedTradeIds, setClosedCompletedTradeIds] = useState<string[]>([]);
  const [closedCompletedTradeIdsLoaded, setClosedCompletedTradeIdsLoaded] = useState(false);
  const [combineBusyId, setCombineBusyId] = useState("");
  const [activeSquadIds, setActiveSquadIds] = useState<string[]>(sanitizeActiveBugSquad(user.activeBugSquad));
  const [squadBusyId, setSquadBusyId] = useState("");
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [tradeOfferId, setTradeOfferId] = useState("");
  const [tradeRecipientId, setTradeRecipientId] = useState("");
  const [tradeRequestId, setTradeRequestId] = useState("");
  const [tradeBusy, setTradeBusy] = useState("");
  const [tradeError, setTradeError] = useState("");
  const [showLocked, setShowLocked] = useState(false);
  const [tradeExpanded, setTradeExpanded] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [dailyUpgradeUsage, setDailyUpgradeUsage] = useState<DailyUpgradeUsage>(emptyDailyUpgradeUsage);
  const [upgradeSelections, setUpgradeSelections] = useState<Record<UpgradeRarity, string[]>>(emptyUpgradeSelections);
  const scrollRef = useRef<ScrollView | null>(null);
  const tradeSectionY = useRef(0);
  const inventoryById = bugDexInventoryMap(inventory);
  const tier = getTierForPoints(user.totalPoints);
  const unlockedCount = inventory.length;
  const totalCount = bugDexEntries.length;
  const progress = Math.round((unlockedCount / totalCount) * 100);
  const unlockedEntries = inventory.map((item) => entryByBugId(item.bugId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const activeSquadEntries = activeSquadIds.map((bugId) => entryByBugId(bugId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const headerEntry = unlockedEntries[unlockedEntries.length - 1];
  const dexCards = bugDexEntries
    .map((entry, index) => ({ entry, index, inventoryItem: inventoryById[entry.id] }))
    .filter(({ inventoryItem }) => showLocked || Boolean(inventoryItem));
  const duplicateCount = inventory.reduce((total, item) => total + Math.max(0, item.count - 1), 0);
  const tradeInventory = inventory.filter((item) => item.count > 0);
  const squadChoiceInventory = [...tradeInventory].sort((a, b) => {
    const firstEntry = entryByBugId(a.bugId);
    const secondEntry = entryByBugId(b.bugId);
    const rarityDiff = (firstEntry ? raritySortOrder[firstEntry.rarity] : 99) - (secondEntry ? raritySortOrder[secondEntry.rarity] : 99);
    if (rarityDiff !== 0) return rarityDiff;
    return bugName(a.bugId).localeCompare(bugName(b.bugId));
  });
  const activeSquadBonuses = activeBugSquadBonusList(activeSquadIds);
  const recipientTradeInventory = recipientInventory.filter((item) => item.count > 0);
  const upgradeOptions = upgradeRarities.map((rarity) => {
    const items = inventory
      .filter((item) => item.count > 0 && entryByBugId(item.bugId)?.rarity === rarity)
      .sort((a, b) => b.count - a.count || bugName(a.bugId).localeCompare(bugName(b.bugId)));
    return { items, rarity, targetRarity: nextRarityLabel[rarity] };
  });
  const selectedRecipient = users.find((item) => item.uid === tradeRecipientId);
  const incomingTrades = trades.filter((trade) => trade.toUserId === user.uid && trade.status === "Open");
  const outgoingTrades = trades.filter((trade) => trade.fromUserId === user.uid && trade.status === "Open");

  useEffect(() => {
    void refreshAll();
  }, [user.uid]);

  useEffect(() => {
    if (openTradeRequest <= 0) return;
    setTradeExpanded(true);
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
    setUpgradeSelections((current) => ({
      Gewoon: current.Gewoon.filter((bugId) => availableIds.has(bugId)),
      Zeldzaam: current.Zeldzaam.filter((bugId) => availableIds.has(bugId)),
      Episch: current.Episch.filter((bugId) => availableIds.has(bugId)),
      Legendarisch: current.Legendarisch.filter((bugId) => availableIds.has(bugId))
    }));
  }, [inventory]);

  async function refreshAll() {
    await Promise.all([refreshInventory(), refreshTrades(), refreshDailyUpgradeUsage(), refreshTradeUsers()]);
  }

  async function refreshTradeUsers() {
    const tradeUsers = (await listUsers()).filter((item) => item.uid !== user.uid);
    setUsers(tradeUsers);
    const inventories = await Promise.all(
      tradeUsers.map(async (item) => [item.uid, await listBugDexInventory(item)] as const)
    );
    setInventoriesByUserId(Object.fromEntries(inventories));
  }

  async function refreshInventory() {
    const items = await listBugDexInventory(user);
    setInventory(items);
    const storedSquad = sanitizeActiveBugSquad(user.activeBugSquad);
    const availableSquad = sanitizeActiveBugSquad(storedSquad, items);
    setActiveSquadIds(availableSquad);
    if (storedSquad.join("|") !== availableSquad.join("|")) {
      const updated = await updateUserBugSquad({ ...user, activeBugSquad: storedSquad }, availableSquad);
      onUserUpdated?.(updated);
    }
  }

  async function refreshTrades() {
    setTrades(await listTradeRequests(user));
  }

  async function refreshDailyUpgradeUsage() {
    setDailyUpgradeUsage(await getDailyUpgradeUsage(user));
  }

  async function combine(bugId: string) {
    setCombineBusyId(bugId);
    setUpgradeError("");
    try {
      const result = await combineBugDexDuplicates(user, bugId);
      setDrop(result);
      await Promise.all([refreshInventory(), refreshDailyUpgradeUsage()]);
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : t("bugdex.upgradeFailed"));
    } finally {
      setCombineBusyId("");
    }
  }

  async function upgradeDifferent(rarity: UpgradeRarity, bugIds: string[]) {
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

  function toggleUpgradeSelection(rarity: UpgradeRarity, bugId: string) {
    setUpgradeSelections((current) => {
      const selected = current[rarity];
      if (selected.includes(bugId)) return { ...current, [rarity]: selected.filter((item) => item !== bugId) };
      if (selected.length >= 3) return current;
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
    return `${bugName(bugId)} (${rarityLabel(bugRarity(bugId), t)})`;
  }

  function bugBuffText(bugId: string) {
    const bonus = activeBugSquadBonusList([bugId])[0];
    return bonus ? `${squadBonusLabel(bonus.category)} ${squadBonusValue(bonus.category, bonus.value)}` : "";
  }

  function openTradeWorkshop() {
    setTradeExpanded(true);
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

  function squadBonusDescription(category: BugSquadBonusCategory): string {
    return t(`bugdex.squadBonusDescription.${category}`);
  }

  function squadBonusValue(category: BugSquadBonusCategory, value: number): string {
    if (category === "streak_protection") return value > 0 ? "1x" : "0x";
    return `+${Math.round(value * 100)}%`;
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
    setTradeRequestId("");
    const cachedInventory = inventoriesByUserId[uid];
    setRecipientInventory(cachedInventory ?? []);
    if (!recipient) return;
    const freshInventory = await listBugDexInventory(recipient);
    setRecipientInventory(freshInventory);
    setInventoriesByUserId((current) => ({ ...current, [uid]: freshInventory }));
  }

  async function sendTradeRequest() {
    if (!selectedRecipient || !tradeOfferId || !tradeRequestId) return;
    setTradeBusy("send");
    setTradeError("");
    try {
      await createTradeRequest(user, selectedRecipient, tradeOfferId, tradeRequestId);
      await notifyTradeRequest(selectedRecipient.uid, user, bugName(tradeOfferId));
      setTradeOfferId("");
      setTradeRecipientId("");
      setTradeRequestId("");
      setRecipientInventory([]);
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
        setCompletedTrade(result);
        setTradeExpanded(false);
        await notifyTradeAccepted(trade.fromUserId, user, bugName(trade.requestBugId));
      }
      await refreshAll();
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : t("bugdex.tradeProcessFailed"));
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

      {dexCards.length ? (
        <View style={styles.grid}>
          {dexCards.map(({ entry, index, inventoryItem }) => {
            const color = rarityColors[entry.rarity];
            const requiredCount = combineRequiredCount(entry.rarity);
            const unlocked = Boolean(inventoryItem);
            const upgradeRarity = entry.rarity === "Mythisch" ? null : entry.rarity as UpgradeRarity;
            const routeUsedToday = upgradeRarity ? upgradeRouteUsedToday(upgradeRarity) : false;
            const hasEnoughToCombine = unlocked && Number.isFinite(requiredCount) && inventoryItem.count >= requiredCount;
            const canCombine = hasEnoughToCombine && !routeUsedToday;
            return (
              <View key={entry.id} style={[styles.card, !unlocked && styles.lockedCard, { borderColor: unlocked ? color : "#cbd8d1" }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.numberPill, { backgroundColor: unlocked ? color : "#87958e" }]}>
                    <Text style={styles.numberText}>{String(index + 1).padStart(2, "0")}</Text>
                  </View>
                  <Text style={[styles.rarity, { color: unlocked ? color : "#87958e" }]}>{unlocked ? rarityLabel(entry.rarity, t) : "???"}</Text>
                </View>
                <View style={[styles.bugWrap, !unlocked && styles.lockedBugWrap]}>
                  {unlocked ? <BugArtImage bugId={entry.id} size={70} /> : <Text style={styles.lockedMark}>?</Text>}
                </View>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>{unlocked ? bugDexEntryName(entry, t) : t("bugdex.unknown")}</Text>
                  {unlocked && inventoryItem.count > 1 && <Text style={styles.countPill}>x{inventoryItem.count}</Text>}
                </View>
                <Text style={[styles.title, !unlocked && styles.lockedText]}>{unlocked ? bugDexEntryTitle(entry, t) : t("bugdex.notDiscovered")}</Text>
                <Text style={[styles.note, !unlocked && styles.lockedText]}>
                  {unlocked ? bugDexEntryNote(entry, t) : t("bugdex.findHint")}
                </Text>
                {hasEnoughToCombine && (
                  <Pressable style={[styles.combineButton, !canCombine && styles.combineButtonDisabled]} disabled={!canCombine || combineBusyId === entry.id} onPress={() => combine(entry.id)}>
                    <Text style={styles.combineText}>{combineBusyId === entry.id ? "..." : routeUsedToday ? t("bugdex.tomorrowAgain") : t("bugdex.combineCount", { count: requiredCount })}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyDexCard}>
          <Text style={styles.emptyDexTitle}>{t("bugdex.noneFound")}</Text>
          <Text style={styles.emptyDexText}>{t("bugdex.showUnknownHint")}</Text>
        </View>
      )}
    </>
  );

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[sharedStyles.title, styles.headerTitle]}>BugDex</Text>
          <Text style={styles.headerMeta}>{unlockedCount}/{totalCount} {t("bugdex.discoveredCount", { count: "", progress }).trim()}</Text>
        </View>
        {headerEntry ? (
          <BugArtImage bugId={headerEntry.id} size={74} />
        ) : (
          <View style={styles.headerEmptyIcon}>
            <Text style={styles.headerEmptyText}>?</Text>
          </View>
        )}
      </View>

      <Pressable style={[styles.squadFeatureCard, squadExpanded && styles.squadFeatureCardActive]} onPress={() => setSquadExpanded((current) => !current)}>
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
              <View style={[styles.activeJarMiniLid, entry && { backgroundColor: rarityColors[entry.rarity] }]} />
              <View style={[styles.activeJarSlot, entry && { borderColor: rarityColors[entry.rarity] }]}>
                <View style={styles.activeJarShine} />
                {entry ? <BugArtImage bugId={entry.id} size={44} /> : <Text style={styles.activeJarEmpty}>+</Text>}
                <View style={styles.activeJarBase} />
              </View>
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
              const bonus = activeSquadBonuses.find((item) => item.bugId === bugId);
              return (
                <View key={index} style={styles.squadBugJarWrap}>
                  <View style={[styles.squadBugJarLid, entry && { backgroundColor: rarityColors[entry.rarity], borderColor: rarityColors[entry.rarity] }]} />
                  <View style={[styles.squadJarSlot, entry && { borderColor: rarityColors[entry.rarity] }]}>
                    <View style={styles.squadJarShine} />
                    {entry ? (
                      <>
                        <BugArtImage bugId={entry.id} size={54} />
                        <Text style={styles.squadSlotName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                        {bonus && <Text style={styles.squadSlotBonus}>{squadBonusLabel(bonus.category)}</Text>}
                      </>
                    ) : (
                      <>
                        <Text style={styles.squadEmptyMark}>+</Text>
                        <Text style={styles.squadSlotBonus}>{t("bugdex.squadEmptySlot")}</Text>
                      </>
                    )}
                    <View style={styles.squadJarBase} />
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={styles.tradeHint}>{t("bugdex.activeSquadHint")}</Text>
          {activeSquadBonuses.length > 0 && (
            <View style={styles.squadBonusList}>
              {activeSquadBonuses.map((bonus) => (
                <View key={bonus.bugId} style={styles.squadBonusItem}>
                  <Text style={styles.squadBonusText}>{`${bugName(bonus.bugId)}: ${squadBonusLabel(bonus.category)} ${squadBonusValue(bonus.category, bonus.value)}`}</Text>
                  <Text style={styles.squadBonusDescription}>{squadBonusDescription(bonus.category)}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.chipRow}>
            {squadChoiceInventory.map((item) => {
              const entry = entryByBugId(item.bugId);
              if (!entry) return null;
              const selected = activeSquadIds.includes(item.bugId);
              const disabled = !selected && activeSquadIds.length >= maxActiveBugSquadSize;
              const bonus = activeBugSquadBonusList([item.bugId])[0];
              return (
                <Pressable
                  key={item.bugId}
                  disabled={disabled || squadBusyId === item.bugId}
                  style={[styles.squadBugChip, selected && styles.squadBugChipActive, disabled && styles.squadBugChipDisabled]}
                  onPress={() => toggleActiveSquadBug(item.bugId)}
                >
                  <BugArtImage bugId={item.bugId} size={34} />
                  <Text style={[styles.squadBugChipText, selected && styles.squadBugChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                  <Text style={[styles.tradeRarityPill, { backgroundColor: rarityColors[entry.rarity] }]}>{rarityLabel(entry.rarity, t)}</Text>
                  {bonus && <Text style={[styles.squadBugChipMeta, selected && styles.squadBugChipTextActive]}>{`${squadBonusLabel(bonus.category)} ${squadBonusValue(bonus.category, bonus.value)}`}</Text>}
                </Pressable>
              );
            })}
          </View>
      </View>
      )}

      <Pressable style={styles.workshopFeatureCard} onPress={openTradeWorkshop}>
        <Image resizeMode="cover" source={bugDexWorkshopImage} style={styles.workshopFeatureImage} />
        <View style={styles.workshopFeatureBody}>
          <Text style={styles.workshopFeatureTitle}>{t("bugdex.tradeAndUpgrades")}</Text>
          <Text style={styles.workshopFeatureMeta}>{t("bugdex.tradeMeta", { incoming: incomingTrades.length, open: outgoingTrades.length, duplicate: duplicateCount })}</Text>
        </View>
        <View style={styles.workshopFeatureAction}>
          <Text style={styles.workshopFeatureActionText}>{t("common.open")}</Text>
        </View>
      </Pressable>

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
          <Text style={styles.summaryValue}>{duplicateCount}</Text>
          <Text style={styles.summaryLabel}>{t("bugdex.duplicateShort")}</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{totalCount - unlockedCount}</Text>
          <Text style={styles.summaryLabel}>{t("bugdex.toGo")}</Text>
        </View>
      </View>

      {dexList}

      <Pressable
        style={[styles.tradeDropdown, tradeExpanded && styles.tradeDropdownActive]}
        onLayout={(event) => {
          tradeSectionY.current = event.nativeEvent.layout.y;
        }}
        onPress={() => setTradeExpanded((current) => !current)}
      >
        <View>
          <Text style={[styles.tradeDropdownTitle, tradeExpanded && styles.tradeDropdownTitleActive]}>{t("bugdex.tradeAndUpgrades")}</Text>
          <Text style={[styles.tradeDropdownMeta, tradeExpanded && styles.tradeDropdownMetaActive]}>{t("bugdex.tradeMeta", { incoming: incomingTrades.length, open: outgoingTrades.length, duplicate: duplicateCount })}</Text>
        </View>
      </Pressable>

      {tradeExpanded && (
        <>
      <View style={styles.tradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>{t("bugdex.trade")}</Text>
          <Text style={styles.tradeMeta}>{t("bugdex.tradeOpenMeta", { incoming: incomingTrades.length, open: outgoingTrades.length })}</Text>
        </View>
        <Text style={styles.tradeHint}>{t("bugdex.tradeHint")}</Text>
        {tradeInventory.length ? (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>{t("bugdex.offerBug")}</Text>
            <View style={styles.chipRow}>
              {tradeInventory.map((item) => (
                <Pressable key={item.bugId} style={[styles.tradeBugChip, tradeOfferId === item.bugId && styles.tradeChipActive]} onPress={() => setTradeOfferId(item.bugId)}>
                  <BugArtImage bugId={item.bugId} size={34} />
                  <Text style={[styles.tradeChipText, tradeOfferId === item.bugId && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                  <Text style={[styles.tradeRarityPill, { backgroundColor: rarityColors[bugRarity(item.bugId)] }]}>{rarityLabel(bugRarity(item.bugId), t)}</Text>
                  <Text style={[styles.bugBuffMeta, tradeOfferId === item.bugId && styles.tradeChipTextActive]} numberOfLines={2}>{bugBuffText(item.bugId)}</Text>
                  {item.count > 1 && <Text style={[styles.tradeChipMeta, tradeOfferId === item.bugId && styles.tradeChipTextActive]}>x{item.count}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.tradeEmpty}>{t("bugdex.noTradeBugs")}</Text>
        )}
        {!!tradeOfferId && (
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
            {recipientTradeInventory.length ? (
              <View style={styles.chipRow}>
                {recipientTradeInventory.map((item) => (
                  <Pressable key={item.bugId} style={[styles.tradeBugChip, tradeRequestId === item.bugId && styles.tradeChipActive]} onPress={() => setTradeRequestId(item.bugId)}>
                    <BugArtImage bugId={item.bugId} size={34} />
                    <Text style={[styles.tradeChipText, tradeRequestId === item.bugId && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                    <Text style={[styles.tradeRarityPill, { backgroundColor: rarityColors[bugRarity(item.bugId)] }]}>{rarityLabel(bugRarity(item.bugId), t)}</Text>
                    <Text style={[styles.bugBuffMeta, tradeRequestId === item.bugId && styles.tradeChipTextActive]} numberOfLines={2}>{bugBuffText(item.bugId)}</Text>
                    {item.count > 1 && <Text style={[styles.tradeChipMeta, tradeRequestId === item.bugId && styles.tradeChipTextActive]}>x{item.count}</Text>}
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.tradeEmpty}>{t("bugdex.colleagueNoBugs")}</Text>
            )}
          </View>
        )}
        {!!tradeRequestId && (
          <Pressable style={styles.tradeButton} disabled={tradeBusy === "send"} onPress={sendTradeRequest}>
            <Text style={styles.tradeButtonText}>{tradeBusy === "send" ? "..." : t("bugdex.sendTrade")}</Text>
          </Pressable>
        )}
        {incomingTrades.map((trade) => (
          <View key={trade.id} style={styles.tradeRequest}>
            <Text style={styles.tradeRequestTitle}>{trade.fromUserName}</Text>
            <Text style={styles.tradeRequestText}>{t("bugdex.tradeFor", { offer: bugTradeLabel(trade.offerBugId), request: bugTradeLabel(trade.requestBugId) })}</Text>
            <View style={styles.tradeActions}>
              <Pressable style={styles.acceptButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, true)}>
                <Text style={styles.actionText}>{t("bugdex.accept")}</Text>
              </Pressable>
              <Pressable style={styles.rejectButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, false)}>
                <Text style={styles.actionText}>{t("bugdex.reject")}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {outgoingTrades.map((trade) => (
          <View key={trade.id} style={styles.tradeRequest}>
            <Text style={styles.tradeRequestTitle}>{t("bugdex.pendingTrade")}</Text>
            <Text style={styles.tradeRequestText}>{t("bugdex.openTo", { bug: bugTradeLabel(trade.offerBugId), name: trade.toUserName })}</Text>
            <Pressable style={styles.cancelButton} disabled={tradeBusy === trade.id} onPress={() => cancelTrade(trade)}>
              <Text style={styles.cancelButtonText}>{tradeBusy === trade.id ? "..." : t("bugdex.cancelTrade")}</Text>
            </Pressable>
          </View>
        ))}
        {!!tradeError && <Text style={sharedStyles.error}>{serviceErrorText(tradeError)}</Text>}
      </View>

      <View style={styles.upgradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>{t("bugdex.upgrades")}</Text>
          <Text style={styles.tradeMeta}>{t("bugdex.threeDifferent")}</Text>
        </View>
        <Text style={styles.tradeHint}>{t("bugdex.dailyUpgradeHint")}</Text>
        {upgradeOptions.map(({ items, rarity, targetRarity }) => {
          const ready = items.length >= 3;
          const selectedBugIds = upgradeSelections[rarity].filter((bugId) => items.some((item) => item.bugId === bugId));
          const routeUsedToday = upgradeRouteUsedToday(rarity);
          const canUpgrade = selectedBugIds.length === 3 && !routeUsedToday;
          return (
            <View key={rarity} style={[styles.upgradeRow, ready && { borderColor: routeUsedToday ? "#c6d3cc" : rarityColors[targetRarity] }, routeUsedToday && styles.upgradeRowUsed]}>
              <View style={styles.upgradeTextBlock}>
                <Text style={styles.upgradeTitle}>{`${rarityLabel(rarity, t)} x3 -> ${rarityLabel(targetRarity, t)}`}</Text>
                <Text style={styles.upgradeMeta}>{routeUsedToday ? t("bugdex.routeUsed") : ready ? t("bugdex.chosen", { count: selectedBugIds.length }) : t("bugdex.availableDifferent", { count: items.length })}</Text>
                {ready && !routeUsedToday && (
                  <View style={styles.upgradeChoiceGrid}>
                    {items.map((item) => {
                      const selected = selectedBugIds.includes(item.bugId);
                      const disabled = !selected && selectedBugIds.length >= 3;
                      return (
                        <Pressable
                          key={item.bugId}
                          style={[
                            styles.upgradeChoice,
                            selected && { backgroundColor: rarityColors[targetRarity], borderColor: rarityColors[targetRarity] },
                            disabled && styles.upgradeChoiceDisabled
                          ]}
                          onPress={() => toggleUpgradeSelection(rarity, item.bugId)}
                        >
                          <BugArtImage bugId={item.bugId} size={32} />
                          <Text style={[styles.upgradeChoiceText, selected && styles.upgradeChoiceTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
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
                  <Text style={styles.upgradeButtonText}>{upgradeBusy === rarity ? "..." : routeUsedToday ? t("common.tomorrow") : canUpgrade ? t("bugdex.upgradeAction") : t("bugdex.chooseThree")}</Text>
                </Pressable>
              ) : (
                <Text style={styles.upgradeLocked}>{t("bugdex.notYet")}</Text>
              )}
            </View>
          );
        })}
        {!!upgradeError && <Text style={sharedStyles.error}>{serviceErrorText(upgradeError)}</Text>}
      </View>
        </>
      )}

      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
      </Pressable>
      <BugDexUnlockModal drop={drop} onClose={() => setDrop(null)} />
      <TradeAnimationModal currentUser={user} trade={completedTrade} onClose={closeTradeResult} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120
  },
  header: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
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
    width: 74
  },
  activeJarMiniLid: {
    backgroundColor: "#6d5441",
    borderColor: "#3e2e24",
    borderRadius: 6,
    borderWidth: 1,
    height: 9,
    marginBottom: -2,
    width: 42,
    zIndex: 2
  },
  activeJarSlot: {
    alignItems: "center",
    backgroundColor: "rgba(220,244,250,0.62)",
    borderColor: "rgba(16,32,24,0.18)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderRadius: 14,
    borderWidth: 2,
    height: 70,
    justifyContent: "center",
    overflow: "hidden",
    width: 62
  },
  activeJarShine: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderRadius: 999,
    height: 42,
    left: 9,
    position: "absolute",
    top: 9,
    transform: [{ rotate: "9deg" }],
    width: 7
  },
  activeJarBase: {
    backgroundColor: "rgba(41,67,56,0.18)",
    borderRadius: 999,
    bottom: 5,
    height: 6,
    left: 10,
    position: "absolute",
    right: 10
  },
  activeJarEmpty: {
    color: "#8ca099",
    fontSize: 24,
    fontWeight: "900"
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
    backgroundColor: "rgba(220,244,250,0.62)",
    borderColor: "rgba(16,32,24,0.18)",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 128,
    overflow: "hidden",
    padding: 8,
    paddingTop: 12,
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
  bugBuffMeta: {
    color: "#52665d",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
    marginTop: 3,
    textAlign: "center",
    width: "100%"
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
  upgradeTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  upgradeMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3
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
    minHeight: 62
  },
  lockedBugWrap: {
    backgroundColor: "#e8efe9",
    borderColor: "#cbd8d1",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1
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
  lockedText: {
    color: "#87958e"
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
  }
});
