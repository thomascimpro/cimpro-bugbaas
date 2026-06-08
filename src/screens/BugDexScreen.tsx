import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugDexUnlockModal } from "../components/BugDexUnlockModal";
import { TradeAnimationModal } from "../components/TradeAnimationModal";
import { BugDexDropResult, bugDexInventoryMap, combineBugDexDuplicates, combineDifferentBugDexUpgrade, combineRequiredCount, entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { notifyTradeRequest } from "../services/notificationService";
import { bugDexEntries, BugDexEntry, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { createTradeRequest, listTradeRequests, respondToTradeRequest } from "../services/tradeService";
import { listUsers } from "../services/userService";
import { BugDexInventoryItem, TradeRequest, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  onBack: () => void;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227"
};

const upgradeRarities: Array<Exclude<BugDexRarity, "Legendarisch">> = ["Gewoon", "Zeldzaam", "Episch"];
const nextRarityLabel: Record<Exclude<BugDexRarity, "Legendarisch">, BugDexRarity> = {
  Gewoon: "Zeldzaam",
  Zeldzaam: "Episch",
  Episch: "Legendarisch"
};

const characterPalettes = [
  { body: "#15724f", face: "#d9f2df", accent: "#d7bd57" },
  { body: "#356d7c", face: "#e0f6ff", accent: "#47b7d0" },
  { body: "#b83227", face: "#ffe5dd", accent: "#f5b84b" },
  { body: "#6f7f5f", face: "#f1f5df", accent: "#a8bd6b" },
  { body: "#5d3f84", face: "#eee5ff", accent: "#c6a8ff" }
];

export function BugDexScreen({ user, onBack }: Props) {
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [trades, setTrades] = useState<TradeRequest[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<BugDexInventoryItem[]>([]);
  const [drop, setDrop] = useState<BugDexDropResult | null>(null);
  const [completedTrade, setCompletedTrade] = useState<TradeRequest | null>(null);
  const [combineBusyId, setCombineBusyId] = useState("");
  const [tradeOfferId, setTradeOfferId] = useState("");
  const [tradeRecipientId, setTradeRecipientId] = useState("");
  const [tradeRequestId, setTradeRequestId] = useState("");
  const [tradeBusy, setTradeBusy] = useState("");
  const [tradeError, setTradeError] = useState("");
  const [showLocked, setShowLocked] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState("");
  const inventoryById = bugDexInventoryMap(inventory);
  const recipientInventoryById = bugDexInventoryMap(recipientInventory);
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

  async function refreshAll() {
    await Promise.all([refreshInventory(), refreshTrades(), listUsers().then((items) => setUsers(items.filter((item) => item.uid !== user.uid)))]);
  }

  async function refreshInventory() {
    setInventory(await listBugDexInventory(user));
  }

  async function refreshTrades() {
    setTrades(await listTradeRequests(user));
  }

  async function combine(bugId: string) {
    setCombineBusyId(bugId);
    try {
      const result = await combineBugDexDuplicates(user, bugId);
      setDrop(result);
      await refreshInventory();
    } finally {
      setCombineBusyId("");
    }
  }

  async function upgradeDifferent(rarity: Exclude<BugDexRarity, "Legendarisch">, bugIds: string[]) {
    setUpgradeBusy(rarity);
    try {
      const result = await combineDifferentBugDexUpgrade(user, bugIds);
      setDrop(result);
      await refreshInventory();
    } finally {
      setUpgradeBusy("");
    }
  }

  function bugName(bugId: string) {
    return entryByBugId(bugId)?.name ?? "Bug";
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
      await refreshTrades();
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : "Ruilverzoek mislukt.");
    } finally {
      setTradeBusy("");
    }
  }

  async function respondTrade(trade: TradeRequest, accept: boolean) {
    setTradeBusy(trade.id);
    setTradeError("");
    try {
      const result = await respondToTradeRequest(user, trade, accept);
      if (accept) setCompletedTrade(result);
      await refreshAll();
    } catch (error) {
      setTradeError(error instanceof Error ? error.message : "Ruil verwerken mislukt.");
    } finally {
      setTradeBusy("");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[sharedStyles.title, styles.headerTitle]}>BugDex</Text>
          <Text style={styles.headerMeta}>{unlockedCount}/{totalCount} ontdekt - {progress}%</Text>
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
          <Text style={styles.emptyDexText}>Nog geen vondsten. Gebruik de app om je eerste BugDex te vinden.</Text>
        )}
      </View>

      <View style={styles.tierPanel}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierPanelTitle}>Tiers</Text>
          <Text style={styles.tierPanelMeta}>{tier.title}</Text>
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
                <Text style={[styles.tierTitle, { color: item.color }]} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.tierMeta}>{item.minPoints}+ pt</Text>
                <Text style={styles.tierDescription} numberOfLines={2}>{item.description}</Text>
                <Text style={[styles.tierReward, { color: item.frameColor }]} numberOfLines={1}>{item.rewardText}</Text>
                {current && <Text style={styles.tierCurrentPill}>Huidig</Text>}
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
          <Text style={styles.summaryLabel}>gevangen</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{duplicateCount}</Text>
          <Text style={styles.summaryLabel}>dubbel</Text>
        </View>
        <View style={styles.summaryTile}>
          <Text style={styles.summaryValue}>{totalCount - unlockedCount}</Text>
          <Text style={styles.summaryLabel}>te gaan</Text>
        </View>
      </View>

      <View style={styles.tradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>Ruilen</Text>
          <Text style={styles.tradeMeta}>{incomingTrades.length} inkomend - {outgoingTrades.length} open</Text>
        </View>
        <Text style={styles.tradeHint}>Je kunt nu ook je laatste exemplaar ruilen. Kies bewust: die bug verdwijnt dan uit jouw BugDex.</Text>
        {tradeInventory.length ? (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>Bied een bug aan</Text>
            <View style={styles.chipRow}>
              {tradeInventory.map((item) => (
                <Pressable key={item.bugId} style={[styles.tradeBugChip, tradeOfferId === item.bugId && styles.tradeChipActive]} onPress={() => setTradeOfferId(item.bugId)}>
                  <BugArtImage bugId={item.bugId} size={34} />
                  <Text style={[styles.tradeChipText, tradeOfferId === item.bugId && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                  <Text style={[styles.tradeChipMeta, tradeOfferId === item.bugId && styles.tradeChipTextActive]}>{item.count === 1 ? "laatste" : `x${item.count}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.tradeEmpty}>Je hebt nog geen bugs om te ruilen.</Text>
        )}
        {!!tradeOfferId && inventoryById[tradeOfferId]?.count === 1 && <Text style={styles.tradeWarning}>Let op: dit is je laatste {bugName(tradeOfferId)}.</Text>}
        {!!tradeOfferId && (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>Kies collega</Text>
            <View style={styles.characterGrid}>
              {users.map((item) => (
                <Pressable key={item.uid} style={[styles.characterCard, tradeRecipientId === item.uid && styles.tradeChipActive]} onPress={() => chooseRecipient(item.uid)}>
                  <UserCharacter user={item} active={tradeRecipientId === item.uid} />
                  <Text style={[styles.characterName, tradeRecipientId === item.uid && styles.tradeChipTextActive]} numberOfLines={1}>{item.displayName}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!!selectedRecipient && (
          <View style={styles.tradeSection}>
            <Text style={styles.tradeLabel}>Vraag een bug terug</Text>
            {recipientTradeInventory.length ? (
              <View style={styles.chipRow}>
                {recipientTradeInventory.map((item) => (
                  <Pressable key={item.bugId} style={[styles.tradeBugChip, tradeRequestId === item.bugId && styles.tradeChipActive]} onPress={() => setTradeRequestId(item.bugId)}>
                    <BugArtImage bugId={item.bugId} size={34} />
                    <Text style={[styles.tradeChipText, tradeRequestId === item.bugId && styles.tradeChipTextActive]} numberOfLines={1}>{bugName(item.bugId)}</Text>
                    <Text style={[styles.tradeChipMeta, tradeRequestId === item.bugId && styles.tradeChipTextActive]}>{item.count === 1 ? "laatste" : `x${item.count}`}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.tradeEmpty}>Deze collega heeft geen bugs om terug te ruilen.</Text>
            )}
          </View>
        )}
        {!!tradeRequestId && recipientInventoryById[tradeRequestId]?.count === 1 && <Text style={styles.tradeWarning}>Voor {selectedRecipient?.displayName ?? "deze collega"} is dit het laatste exemplaar.</Text>}
        {!!tradeRequestId && (
          <Pressable style={styles.tradeButton} disabled={tradeBusy === "send"} onPress={sendTradeRequest}>
            <Text style={styles.tradeButtonText}>{tradeBusy === "send" ? "..." : "Ruilverzoek sturen"}</Text>
          </Pressable>
        )}
        {incomingTrades.map((trade) => (
          <View key={trade.id} style={styles.tradeRequest}>
            <Text style={styles.tradeRequestTitle}>{trade.fromUserName}</Text>
            <Text style={styles.tradeRequestText}>{bugName(trade.offerBugId)} voor {bugName(trade.requestBugId)}</Text>
            <View style={styles.tradeActions}>
              <Pressable style={styles.acceptButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, true)}>
                <Text style={styles.actionText}>Accepteer</Text>
              </Pressable>
              <Pressable style={styles.rejectButton} disabled={tradeBusy === trade.id} onPress={() => respondTrade(trade, false)}>
                <Text style={styles.actionText}>Weiger</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {outgoingTrades.map((trade) => (
          <Text key={trade.id} style={styles.tradePending}>Open: {bugName(trade.offerBugId)} naar {trade.toUserName}</Text>
        ))}
        {!!tradeError && <Text style={sharedStyles.error}>{tradeError}</Text>}
      </View>

      <View style={styles.upgradePanel}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradeTitle}>Upgrades</Text>
          <Text style={styles.tradeMeta}>{"3 verschillend -> hoger"}</Text>
        </View>
        <Text style={styles.tradeHint}>Combineer 3 verschillende bugs van dezelfde lagere rarity voor 1 bug uit de volgende rarity. De gekozen bugs worden verbruikt.</Text>
        {upgradeOptions.map(({ items, rarity, targetRarity }) => {
          const ready = items.length >= 3;
          const selected = items.slice(0, 3);
          return (
            <View key={rarity} style={[styles.upgradeRow, ready && { borderColor: rarityColors[targetRarity] }]}>
              <View style={styles.upgradeTextBlock}>
                <Text style={styles.upgradeTitle}>{`${rarity} x3 -> ${targetRarity}`}</Text>
                <Text style={styles.upgradeMeta}>{ready ? selected.map((item) => bugName(item.bugId)).join(" + ") : `${items.length}/3 verschillende beschikbaar`}</Text>
              </View>
              {ready ? (
                <Pressable style={[styles.upgradeButton, { backgroundColor: rarityColors[targetRarity] }]} disabled={upgradeBusy === rarity} onPress={() => upgradeDifferent(rarity, selected.map((item) => item.bugId))}>
                  <Text style={styles.upgradeButtonText}>{upgradeBusy === rarity ? "..." : "Upgrade"}</Text>
                </Pressable>
              ) : (
                <Text style={styles.upgradeLocked}>Nog niet</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.dexToolbar}>
        <View>
          <Text style={styles.dexToolbarTitle}>BugDex lijst</Text>
          <Text style={styles.dexToolbarMeta}>{showLocked ? "Alle bugs zichtbaar" : "Standaard verborgen: onbekende bugs"}</Text>
        </View>
        <Pressable style={[styles.lockedToggle, showLocked && styles.lockedToggleActive]} onPress={() => setShowLocked((current) => !current)}>
          <Text style={[styles.lockedToggleText, showLocked && styles.lockedToggleTextActive]}>{showLocked ? "Verberg onbekend" : "Toon onbekend"}</Text>
        </Pressable>
      </View>

      {dexCards.length ? (
        <View style={styles.grid}>
          {dexCards.map(({ entry, index, inventoryItem }) => {
          const color = rarityColors[entry.rarity];
          const requiredCount = combineRequiredCount(entry.rarity);
          const unlocked = Boolean(inventoryItem);
          const canCombine = unlocked && Number.isFinite(requiredCount) && inventoryItem.count >= requiredCount;
          return (
            <View key={entry.id} style={[styles.card, !unlocked && styles.lockedCard, { borderColor: unlocked ? color : "#cbd8d1" }]}>
              <View style={styles.cardTop}>
                <View style={[styles.numberPill, { backgroundColor: unlocked ? color : "#87958e" }]}>
                  <Text style={styles.numberText}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
                <Text style={[styles.rarity, { color: unlocked ? color : "#87958e" }]}>{unlocked ? entry.rarity : "???"}</Text>
              </View>
              <View style={[styles.bugWrap, !unlocked && styles.lockedBugWrap]}>
                {unlocked ? <BugArtImage bugId={entry.id} size={70} /> : <Text style={styles.lockedMark}>?</Text>}
              </View>
              <View style={styles.nameRow}>
                <Text style={[styles.name, !unlocked && styles.lockedName]} numberOfLines={1}>{unlocked ? entry.name : "Onbekend"}</Text>
                {unlocked && inventoryItem.count > 1 && <Text style={styles.countPill}>x{inventoryItem.count}</Text>}
              </View>
              <Text style={[styles.title, !unlocked && styles.lockedText]}>{unlocked ? entry.title : "Nog niet ontdekt"}</Text>
              <Text style={[styles.note, !unlocked && styles.lockedText]}>
                {unlocked ? entry.note : "Gebruik de app om deze bug te vinden."}
              </Text>
              {canCombine && (
                <Pressable style={styles.combineButton} disabled={combineBusyId === entry.id} onPress={() => combine(entry.id)}>
                  <Text style={styles.combineText}>{combineBusyId === entry.id ? "..." : `Combine x${requiredCount}`}</Text>
                </Pressable>
              )}
            </View>
          );
          })}
        </View>
      ) : (
        <View style={styles.emptyDexCard}>
          <Text style={styles.emptyDexTitle}>Nog geen bugs gevonden</Text>
          <Text style={styles.emptyDexText}>Zet onbekende bugs aan om de volledige BugDex alvast te bekijken.</Text>
        </View>
      )}

      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
      <BugDexUnlockModal drop={drop} onClose={() => setDrop(null)} />
      <TradeAnimationModal currentUser={user} trade={completedTrade} onClose={() => setCompletedTrade(null)} />
    </ScrollView>
  );
}

function UserCharacter({ active, user }: { active: boolean; user: User }) {
  const palette = characterPalettes[Math.abs(hashText(user.uid || user.displayName)) % characterPalettes.length];
  const initial = (user.displayName.trim()[0] || "?").toUpperCase();
  return (
    <View style={[styles.characterAvatar, { backgroundColor: palette.body, borderColor: active ? palette.accent : "#c6d3cc" }]}>
      <View style={[styles.characterAntenna, styles.characterAntennaLeft, { backgroundColor: palette.accent }]} />
      <View style={[styles.characterAntenna, styles.characterAntennaRight, { backgroundColor: palette.accent }]} />
      <View style={[styles.characterFace, { backgroundColor: palette.face }]}>
        <View style={styles.characterEyes}>
          <View style={[styles.characterEye, { backgroundColor: palette.body }]} />
          <View style={[styles.characterEye, { backgroundColor: palette.body }]} />
        </View>
        <Text style={[styles.characterInitial, { color: palette.body }]}>{initial}</Text>
      </View>
      <View style={[styles.characterBody, { backgroundColor: palette.accent }]} />
    </View>
  );
}

function hashText(value: string) {
  return value.split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
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
  characterAvatar: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    height: 64,
    justifyContent: "center",
    overflow: "visible",
    width: 58
  },
  characterAntenna: {
    borderRadius: 999,
    height: 16,
    position: "absolute",
    top: -9,
    width: 4
  },
  characterAntennaLeft: {
    left: 17,
    transform: [{ rotate: "-28deg" }]
  },
  characterAntennaRight: {
    right: 17,
    transform: [{ rotate: "28deg" }]
  },
  characterFace: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  characterEyes: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2
  },
  characterEye: {
    borderRadius: 999,
    height: 5,
    width: 5
  },
  characterInitial: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16
  },
  characterBody: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    bottom: 5,
    height: 8,
    position: "absolute",
    width: 26
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
  combineText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  }
});
