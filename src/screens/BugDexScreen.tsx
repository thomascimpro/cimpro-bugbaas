import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugDexUnlockModal } from "../components/BugDexUnlockModal";
import { TradeAnimationModal } from "../components/TradeAnimationModal";
import { BugDexDropResult, DailyUpgradeUsage, bugDexInventoryMap, combineBugDexDuplicates, combineDifferentBugDexUpgrade, combineRequiredCount, entryByBugId, getDailyUpgradeUsage, listBugDexInventory } from "../services/bugDexService";
import { rarityLabel, useI18n } from "../services/i18n";
import { notifyTradeAccepted, notifyTradeRequest } from "../services/notificationService";
import { bugDexEntries, BugDexEntry, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { createTradeRequest, listTradeRequests, markTradeRequesterSeen, respondToTradeRequest } from "../services/tradeService";
import { listUsers } from "../services/userService";
import { BugDexInventoryItem, TradeRequest, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  onBack: () => void;
};

type UpgradeRarity = Exclude<BugDexRarity, "Legendarisch">;

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227"
};

const upgradeRarities: UpgradeRarity[] = ["Gewoon", "Zeldzaam", "Episch"];
const emptyUpgradeSelections: Record<UpgradeRarity, string[]> = {
  Gewoon: [],
  Zeldzaam: [],
  Episch: []
};
const nextRarityLabel: Record<UpgradeRarity, BugDexRarity> = {
  Gewoon: "Zeldzaam",
  Zeldzaam: "Episch",
  Episch: "Legendarisch"
};
const emptyDailyUpgradeUsage: DailyUpgradeUsage = {
  "Gewoon-Zeldzaam": false,
  "Zeldzaam-Episch": false,
  "Episch-Legendarisch": false
};

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

export function BugDexScreen({ user, onBack }: Props) {
  const { t, tr } = useI18n();
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<BugDexInventoryItem[]>([]);
  const [drop, setDrop] = useState<BugDexDropResult | null>(null);
  const [completedTrade, setCompletedTrade] = useState<TradeRequest | null>(null);
  const [closedCompletedTradeIds, setClosedCompletedTradeIds] = useState<string[]>([]);
  const [closedCompletedTradeIdsLoaded, setClosedCompletedTradeIdsLoaded] = useState(false);
  const [combineBusyId, setCombineBusyId] = useState("");
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
  const inventoryById = bugDexInventoryMap(inventory);
  const tier = getTierForPoints(user.totalPoints);
  const unlockedCount = inventory.length;
  const totalCount = bugDexEntries.length;
  const progress = Math.round((unlockedCount / totalCount) * 100);
  const unlockedEntries = inventory.map((item) => entryByBugId(item.bugId)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const featuredEntries = unlockedEntries.slice(0, 3);
  const headerEntry = unlockedEntries[unlockedEntries.length - 1];
  const dexCards = bugDexEntries
    .map((entry, index) => ({ entry, index, inventoryItem: inventoryById[entry.id] }))
    .filter(({ inventoryItem }) => showLocked || Boolean(inventoryItem));
  const duplicateCount = inventory.reduce((total, item) => total + Math.max(0, item.count - 1), 0);
  const tradeInventory = inventory.filter((item) => item.count > 0);
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
      Episch: current.Episch.filter((bugId) => availableIds.has(bugId))
    }));
  }, [inventory]);

  async function refreshAll() {
    await Promise.all([refreshInventory(), refreshTrades(), refreshDailyUpgradeUsage(), listUsers().then((items) => setUsers(items.filter((item) => item.uid !== user.uid)))]);
  }

  async function refreshInventory() {
    setInventory(await listBugDexInventory(user));
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
    return entryByBugId(bugId)?.name ?? "Bug";
  }

  function bugRarity(bugId: string) {
    return entryByBugId(bugId)?.rarity ?? "Gewoon";
  }

  function bugTradeLabel(bugId: string) {
    return `${bugName(bugId)} (${rarityLabel(bugRarity(bugId), t)})`;
  }

  function upgradeRouteUsedToday(sourceRarity: UpgradeRarity) {
    return dailyUpgradeUsage[`${sourceRarity}-${nextRarityLabel[sourceRarity]}` as keyof DailyUpgradeUsage];
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
    setRecipientInventory(recipient ? await listBugDexInventory(recipient) : []);
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
      await refreshTrades();
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
        <Pressable style={[styles.lockedToggle, showLocked && styles.lockedToggleActive]} onPress={() => setShowLocked((current) => !current)}>
          <Text style={[styles.lockedToggleText, showLocked && styles.lockedToggleTextActive]}>{showLocked ? t("bugdex.hideUnknown") : t("bugdex.showUnknown")}</Text>
        </Pressable>
      </View>

      {dexCards.length ? (
        <View style={styles.grid}>
          {dexCards.map(({ entry, index, inventoryItem }) => {
            const color = rarityColors[entry.rarity];
            const requiredCount = combineRequiredCount(entry.rarity);
            const unlocked = Boolean(inventoryItem);
            const upgradeRarity = entry.rarity === "Legendarisch" ? null : entry.rarity as UpgradeRarity;
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
                  <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>{unlocked ? entry.name : t("bugdex.unknown")}</Text>
                  {unlocked && inventoryItem.count > 1 && <Text style={styles.countPill}>x{inventoryItem.count}</Text>}
                </View>
                <Text style={[styles.title, !unlocked && styles.lockedText]}>{unlocked ? entry.title : t("bugdex.notDiscovered")}</Text>
                <Text style={[styles.note, !unlocked && styles.lockedText]}>
                  {unlocked ? entry.note : t("bugdex.findHint")}
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
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
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

      <View style={styles.preview}>
        {featuredEntries.length ? (
          featuredEntries.map((entry) => (
            <View key={entry.id} style={styles.previewTile}>
              <BugArtImage bugId={entry.id} size={54} />
            </View>
          ))
        ) : (
          <Text style={styles.emptyDexText}>{t("bugdex.emptyHint")}</Text>
        )}
      </View>

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

      <Pressable style={[styles.tradeDropdown, tradeExpanded && styles.tradeDropdownActive]} onPress={() => setTradeExpanded((current) => !current)}>
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
          <Text key={trade.id} style={styles.tradePending}>{t("bugdex.openTo", { bug: bugTradeLabel(trade.offerBugId), name: trade.toUserName })}</Text>
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
    minHeight: 92,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 96
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
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  tradePending: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6
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
    minHeight: 84,
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
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  lockedToggleActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
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
