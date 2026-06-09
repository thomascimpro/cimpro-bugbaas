import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugArtImage } from "../components/BugArtImage";
import { DisplayNameModal } from "../components/DisplayNameModal";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { TierBadge } from "../components/TierBadge";
import { getBadgeArtSource } from "../services/badgeArt";
import { listBugs } from "../services/bugService";
import { entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { bugSquadBonusForEntry, BugSquadBonusCategory } from "../services/bugSquadService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { BadgeDefinition, badgeDefinitions, BugDexEntry, BugDexRarity, bugDexEntries, getTierForPoints, userTiers } from "../services/pointsService";
import { bestUnlockedCharacterId, CharacterId, characterOptions, isCharacterUnlocked, safeCharacterId } from "../services/characterService";
import { upvotePointValue } from "../services/userService";
import { BugDexInventoryItem, BugReport, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  isOwnProfile?: boolean;
  onBack: () => void;
  onLogout?: () => void;
  onUpdateCharacter?: (characterId: CharacterId) => Promise<void>;
  onUpdateDisplayName?: (displayName: string) => Promise<void>;
  onSelectBug?: (bug: BugReport) => void;
};

export function ProfileScreen({ user, isOwnProfile = true, onBack, onLogout, onUpdateCharacter, onUpdateDisplayName, onSelectBug }: Props) {
  const { t, tr } = useI18n();
  const tier = getTierForPoints(user.totalPoints);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [characterBusy, setCharacterBusy] = useState("");
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [badgeInfoVisible, setBadgeInfoVisible] = useState(false);
  const [bugDexVisible, setBugDexVisible] = useState(false);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [loadingBugDex, setLoadingBugDex] = useState(true);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const storedCharacterId = safeCharacterId(user.characterId);
  const selectedCharacterId = isCharacterUnlocked(storedCharacterId, user.totalPoints) ? storedCharacterId : bestUnlockedCharacterId(user.totalPoints);
  const selectedCharacter = characterOptions.find((item) => item.id === selectedCharacterId) ?? characterOptions[0];
  const unlockedBadges = badgeDefinitions.filter((badge) => badgeUnlocked(user, badge));
  const bugDexItems = inventory
    .map((item) => {
      const entry = entryByBugId(item.bugId);
      const index = bugDexEntries.findIndex((bug) => bug.id === item.bugId);
      return entry ? { entry, index, item } : null;
    })
    .filter((item): item is { entry: BugDexEntry; index: number; item: BugDexInventoryItem } => Boolean(item))
    .sort((a, b) => a.index - b.index);

  useEffect(() => {
    setLoadingBugs(true);
    listBugs()
      .then((items) => setBugs(items.filter((bug) => (bug.reportType ?? "bug") === "bug" && bug.reporterId === user.uid)))
      .finally(() => setLoadingBugs(false));
    setLoadingBugDex(true);
    listBugDexInventory(user)
      .then(setInventory)
      .finally(() => setLoadingBugDex(false));
  }, [user.uid]);

  function squadBonusLabel(category: BugSquadBonusCategory): string {
    return t(`bugdex.squadBonus.${category}`);
  }

  function squadBonusValue(category: BugSquadBonusCategory, value: number): string {
    if (category === "streak_protection") return value > 0 ? "1x" : "0x";
    return `+${Math.round(value * 100)}%`;
  }

  const renderBadge = (badge: BadgeDefinition) => {
    const unlocked = badgeUnlocked(user, badge);
    const badgeArt = getBadgeArtSource(badge.id);
    return (
      <View key={badge.id} style={[styles.badge, !unlocked && styles.badgeLocked]}>
        {badgeArt ? (
          <Image source={badgeArt} style={[styles.badgeImage, !unlocked && styles.badgeImageLocked]} />
        ) : (
          <BugArtImage bugId="lieveheersbeestje" size={42} />
        )}
        <View style={styles.badgeTextBlock}>
          <Text style={[styles.badgeText, !unlocked && styles.badgeTextLocked]} numberOfLines={1}>{tr(badge.name)}</Text>
          <Text style={styles.badgeRequirement} numberOfLines={2}>
            {unlocked ? t("profile.badgeUnlocked") : t("profile.badgeLocked")} - {badgeRequirementText(badge, t)}
          </Text>
          <Text style={styles.badgeRequirement} numberOfLines={2}>{t(badge.descriptionKey)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>{isOwnProfile ? t("profile.own") : t("profile.colleague")}</Text>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          {isOwnProfile && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
          {isOwnProfile && onUpdateDisplayName && (
            <Pressable style={styles.nameButton} onPress={() => setEditNameVisible(true)}>
              <Text style={styles.nameButtonText}>{t("profile.changeName")}</Text>
            </Pressable>
          )}
        </View>
        <CharacterAvatarImage characterId={selectedCharacterId} size={112} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.totalPoints}</Text>
          <Text style={styles.label}>{t("profile.points")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugCount}</Text>
          <Text style={styles.label}>{t("home.bugs")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugDexCount ?? 0}/{bugDexEntries.length}</Text>
          <Text style={styles.label}>BugDex</Text>
        </View>
      </View>

      <TierBadge points={user.totalPoints} />

      <View style={styles.card}>
        <View style={styles.bugDexHeader}>
          <View style={styles.bugDexHeaderText}>
            <Text style={styles.cardTitle}>{t("profile.bugdexCollection")}</Text>
            <Text style={styles.bugDexIntro}>{t("profile.bugdexReadOnly")}</Text>
          </View>
          <Pressable style={styles.bugDexOpenButton} onPress={() => setBugDexVisible(true)}>
            <Text style={styles.bugDexOpenButtonText}>{t("profile.viewBugDex")}</Text>
          </Pressable>
        </View>
        {loadingBugDex ? <ActivityIndicator /> : (
          <View style={styles.bugDexPreview}>
            {bugDexItems.length ? bugDexItems.slice(0, 5).map(({ entry, index, item }) => (
              <View key={entry.id} style={styles.bugDexPreviewItem}>
                <Text style={styles.bugDexNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <BugArtImage bugId={entry.id} size={42} />
                {item.count > 1 && <Text style={styles.bugDexCount}>x{item.count}</Text>}
              </View>
            )) : <Text style={styles.emptyText}>{t("profile.noBugDex")}</Text>}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.characterHeader}>
          <View>
            <Text style={styles.cardTitle}>{t("profile.character")}</Text>
            <Text style={styles.characterSubtitle}>{t("profile.characterSubtitle")}</Text>
          </View>
          <CharacterAvatarImage characterId={selectedCharacterId} size={74} />
        </View>
        {isOwnProfile && onUpdateCharacter ? (
          <>
            <Pressable style={[styles.characterDropdown, characterPickerOpen && styles.characterDropdownOpen]} onPress={() => setCharacterPickerOpen((current) => !current)}>
              <View style={styles.characterDropdownText}>
                <Text style={[styles.characterDropdownTitle, characterPickerOpen && styles.characterDropdownTitleOpen]}>{selectedCharacter.label}</Text>
                <Text style={[styles.characterDropdownMeta, characterPickerOpen && styles.characterDropdownMetaOpen]}>{t("profile.changeCharacter")}</Text>
              </View>
            </Pressable>
            {characterPickerOpen && (
              <View style={styles.characterGrid}>
                {characterOptions.map((option) => {
                  const selected = option.id === selectedCharacterId;
                  const unlocked = isCharacterUnlocked(option.id, user.totalPoints);
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.characterOption, !unlocked && styles.characterOptionLocked, selected && { borderColor: option.accent, backgroundColor: "#fff9df" }]}
                      disabled={Boolean(characterBusy) || !unlocked}
                      onPress={async () => {
                        setCharacterBusy(option.id);
                        try {
                          await onUpdateCharacter(option.id);
                        } finally {
                          setCharacterBusy("");
                        }
                      }}
                    >
                      <CharacterAvatarImage characterId={option.id} selected={selected} size={66} />
                      <Text style={styles.characterName} numberOfLines={2}>{characterBusy === option.id ? "..." : option.label}</Text>
                      {!unlocked && <Text style={styles.characterLockText} numberOfLines={1}>{t("profile.characterUnlock", { points: option.unlockPoints })}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.characterSubtitle}>{selectedCharacter.label}</Text>
        )}
      </View>

      <View style={styles.stage}>
        {userTiers.map((item) => {
          const current = item.title === tier.title;
          return (
            <View key={item.title} style={[styles.stageItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageItemActive]}>
              <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
              <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.54)} />
              <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                <Text style={[styles.stageStar, { color: item.frameColor }]}>★</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("profile.status")}</Text>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.title")}</Text>
          <Text style={styles.statusValue}>{tr(user.title)}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.tier")}</Text>
          <Text style={[styles.statusValue, { color: tier.color }]}>{tr(tier.title)}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.splats")}</Text>
          <Text style={styles.statusValue}>{user.splatCount ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.badgeHeader}>
          <View style={styles.badgeHeaderText}>
            <Text style={styles.cardTitle}>{t("profile.badges")}</Text>
            <Text style={styles.badgeIntro}>{t("profile.badgesIntro")}</Text>
          </View>
          <Pressable style={styles.badgeInfoButton} onPress={() => setBadgeInfoVisible(true)}>
            <Text style={styles.badgeInfoButtonText}>{t("profile.showAllBadges")}</Text>
          </Pressable>
        </View>
        <View style={styles.badges}>
          {unlockedBadges.length ? unlockedBadges.map(renderBadge) : <Text style={styles.emptyText}>{t("profile.noBadges")}</Text>}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("home.bugs")}</Text>
        {loadingBugs ? <ActivityIndicator /> : (
          <View style={styles.bugList}>
            {bugs.length ? bugs.map((bug) => (
              <Pressable key={bug.id} style={styles.bugItem} onPress={() => onSelectBug?.(bug)}>
                <View style={styles.bugText}>
                  <Text style={styles.bugTitle} numberOfLines={1}>{bug.title}</Text>
                  <Text style={styles.bugMeta} numberOfLines={1}>{t("profile.bugMeta", { project: bug.project, points: bug.points, upvotes: bug.upvoteCount ?? 0 })}</Text>
                  <Text style={styles.bugBonus}>{t("profile.upvoteBonus", { points: upvotePointValue })}</Text>
                </View>
                <View style={styles.bugBadges}>
                  <SeverityBadge severity={bug.severity} />
                  <StatusBadge status={bug.status} />
                </View>
              </Pressable>
            )) : <Text style={styles.emptyText}>{t("profile.noBugs")}</Text>}
          </View>
        )}
      </View>

      {isOwnProfile && onLogout && (
        <Pressable style={sharedStyles.dangerButton} onPress={onLogout}>
          <Text style={sharedStyles.buttonText}>{t("profile.logout")}</Text>
        </Pressable>
      )}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
      </Pressable>
      {isOwnProfile && onUpdateDisplayName && (
        <DisplayNameModal
          user={user}
          visible={editNameVisible}
          onCancel={() => setEditNameVisible(false)}
          onSave={async (displayName) => {
            await onUpdateDisplayName(displayName);
            setEditNameVisible(false);
          }}
        />
      )}
      <Modal transparent animationType="fade" visible={badgeInfoVisible} onRequestClose={() => setBadgeInfoVisible(false)}>
        <View style={styles.badgeModalBackdrop}>
          <View style={styles.badgeModalCard}>
            <Text style={styles.badgeModalTitle}>{t("profile.badgeOverview")}</Text>
            <Text style={styles.badgeModalIntro}>{t("profile.badgesIntro")}</Text>
            <ScrollView style={styles.badgeModalList} showsVerticalScrollIndicator={false}>
              <View style={styles.badges}>{badgeDefinitions.map(renderBadge)}</View>
            </ScrollView>
            <Pressable style={styles.badgeModalButton} onPress={() => setBadgeInfoVisible(false)}>
              <Text style={styles.badgeModalButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="fade" visible={bugDexVisible} onRequestClose={() => setBugDexVisible(false)}>
        <View style={styles.bugDexModalBackdrop}>
          <View style={styles.bugDexModalCard}>
            <Text style={styles.bugDexModalTitle}>{t("profile.bugdexOf", { name: user.displayName })}</Text>
            <Text style={styles.bugDexModalIntro}>{t("profile.bugdexReadOnly")}</Text>
            <ScrollView style={styles.bugDexModalList} showsVerticalScrollIndicator={false}>
              {loadingBugDex ? <ActivityIndicator /> : (
                <View style={styles.bugDexGrid}>
                  {bugDexItems.length ? bugDexItems.map(({ entry, index, item }) => {
                    const bonus = bugSquadBonusForEntry(entry);
                    const color = rarityColor(entry.rarity);
                    return (
                      <View key={entry.id} style={[styles.bugDexCard, { borderColor: color }]}>
                        <View style={styles.bugDexCardTop}>
                          <Text style={[styles.bugDexCardNumber, { backgroundColor: color }]}>{String(index + 1).padStart(2, "0")}</Text>
                          <Text style={[styles.bugDexCardRarity, { color }]} numberOfLines={1}>{rarityLabel(entry.rarity, t)}</Text>
                        </View>
                        <View style={styles.bugDexImageWrap}>
                          <BugArtImage bugId={entry.id} size={68} />
                        </View>
                        <Text style={styles.bugDexName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                        <Text style={styles.bugDexOwned}>{t("profile.bugdexOwned", { count: item.count })}</Text>
                        <Text style={styles.bugDexBuff} numberOfLines={2}>
                          {squadBonusLabel(bonus.category)} {squadBonusValue(bonus.category, bonus.value)}
                        </Text>
                      </View>
                    );
                  }) : <Text style={styles.emptyText}>{t("profile.noBugDex")}</Text>}
                </View>
              )}
            </ScrollView>
            <Pressable style={styles.bugDexModalButton} onPress={() => setBugDexVisible(false)}>
              <Text style={styles.bugDexModalButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function rarityColor(rarity: BugDexRarity): string {
  const colors: Record<BugDexRarity, string> = {
    Gewoon: "#6f7f5f",
    Zeldzaam: "#15724f",
    Episch: "#356d7c",
    Legendarisch: "#b83227",
    Mythisch: "#7c3aed"
  };
  return colors[rarity];
}

function badgeUnlocked(user: User, badge: BadgeDefinition): boolean {
  return (badge.minBugReports === undefined || user.bugCount >= badge.minBugReports) &&
    (badge.minBugDexCaught === undefined || (user.bugDexCount ?? 0) >= badge.minBugDexCaught) &&
    (badge.minComments === undefined || (user.commentPointCount ?? 0) >= badge.minComments) &&
    (badge.minLegendaryBugDex === undefined || (user.legendaryBugDexCount ?? 0) >= badge.minLegendaryBugDex) &&
    (badge.minMovementKm === undefined || (user.movementKmTotal ?? 0) >= badge.minMovementKm) &&
    (badge.minMythicBugDex === undefined || (user.mythicBugDexCount ?? 0) >= badge.minMythicBugDex) &&
    (badge.minPoints === undefined || user.totalPoints >= badge.minPoints) &&
    (badge.minSplats === undefined || (user.splatCount ?? 0) >= badge.minSplats) &&
    (badge.minTradedBugDex === undefined || (user.tradedBugDexCount ?? 0) >= badge.minTradedBugDex) &&
    (badge.minUpgradedBugDex === undefined || (user.upgradedBugDexCount ?? 0) >= badge.minUpgradedBugDex) &&
    (badge.minUpvotesGiven === undefined || (user.upvoteGivenPointCount ?? 0) >= badge.minUpvotesGiven);
}

function badgeRequirementText(badge: BadgeDefinition, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (badge.minBugReports !== undefined) return t("profile.badgeNeedBugs", { count: badge.minBugReports });
  if (badge.minBugDexCaught !== undefined) return t("profile.badgeNeedBugDex", { count: badge.minBugDexCaught });
  if (badge.minComments !== undefined) return t("profile.badgeNeedComments", { count: badge.minComments });
  if (badge.minLegendaryBugDex !== undefined) return t("profile.badgeNeedLegendary", { count: badge.minLegendaryBugDex });
  if (badge.minMovementKm !== undefined) return t("profile.badgeNeedKm", { count: badge.minMovementKm });
  if (badge.minMythicBugDex !== undefined) return t("profile.badgeNeedMythic", { count: badge.minMythicBugDex });
  if (badge.minPoints !== undefined) return t("profile.badgeNeedPoints", { count: badge.minPoints });
  if (badge.minSplats !== undefined) return t("profile.badgeNeedSplats", { count: badge.minSplats });
  if (badge.minTradedBugDex !== undefined) return t("profile.badgeNeedTrades", { count: badge.minTradedBugDex });
  if (badge.minUpgradedBugDex !== undefined) return t("profile.badgeNeedUpgrades", { count: badge.minUpgradedBugDex });
  if (badge.minUpvotesGiven !== undefined) return t("profile.badgeNeedUpvotes", { count: badge.minUpvotesGiven });
  return t("profile.badgeUnlocked");
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  hero: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    padding: 16
  },
  heroText: {
    flex: 1
  },
  kicker: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  name: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900"
  },
  email: {
    color: "#dbe8de",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5
  },
  nameButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  nameButtonText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  stat: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 78,
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    justifyContent: "center"
  },
  value: {
    color: "#17211c",
    fontSize: 22,
    fontWeight: "900"
  },
  label: {
    color: "#53645d",
    fontWeight: "700",
    marginTop: 4
  },
  stage: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d0dfcf",
    borderRadius: 8,
    borderWidth: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    padding: 10
  },
  stageItem: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 3,
    height: 72,
    justifyContent: "center",
    overflow: "visible",
    paddingTop: 5,
    width: 72
  },
  stageItemActive: {
    elevation: 4,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6
  },
  stageShine: {
    height: 28,
    opacity: 0.58,
    position: "absolute",
    right: -14,
    top: -14,
    transform: [{ rotate: "45deg" }],
    width: 28
  },
  stageMedal: {
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    bottom: -7,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    width: 28
  },
  stageStar: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14
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
    marginBottom: 10
  },
  bugDexHeader: {
    alignItems: "flex-start",
    gap: 10
  },
  bugDexHeaderText: {
    minWidth: 0
  },
  bugDexIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 2
  },
  bugDexOpenButton: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bugDexOpenButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  bugDexPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  bugDexPreviewItem: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 82,
    padding: 7,
    width: 64
  },
  bugDexNumber: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderRadius: 6,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  bugDexCount: {
    color: "#53645d",
    fontSize: 10,
    fontWeight: "900"
  },
  characterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  characterSubtitle: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800"
  },
  characterDropdown: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 11
  },
  characterDropdownOpen: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  characterDropdownText: {
    flex: 1,
    minWidth: 0
  },
  characterDropdownTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  characterDropdownTitleOpen: {
    color: "#ffffff"
  },
  characterDropdownMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  characterDropdownMetaOpen: {
    color: "#dce9df"
  },
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  characterOption: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 8,
    width: "31%"
  },
  characterOptionLocked: {
    opacity: 0.45
  },
  characterName: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
    marginTop: 6,
    minHeight: 26,
    textAlign: "center"
  },
  characterLockText: {
    color: "#53645d",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5
  },
  statusLabel: {
    color: "#53645d",
    fontWeight: "800"
  },
  statusValue: {
    color: "#17211c",
    flex: 1,
    fontWeight: "900",
    marginLeft: 12,
    textAlign: "right"
  },
  badges: {
    gap: 8
  },
  badgeIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  badgeHeader: {
    gap: 4,
    marginBottom: 10
  },
  badgeHeaderText: {
    minWidth: 0
  },
  badgeInfoButton: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  badgeInfoButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 9
  },
  badgeImage: {
    height: 48,
    width: 48
  },
  badgeImageLocked: {
    opacity: 0.48
  },
  badgeLocked: {
    opacity: 0.62
  },
  badgeTextBlock: {
    flex: 1,
    minWidth: 0
  },
  badgeText: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  badgeTextLocked: {
    color: "#53645d"
  },
  badgeRequirement: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2
  },
  badgeModalBackdrop: {
    backgroundColor: "rgba(16, 32, 24, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  badgeModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    maxHeight: "86%",
    padding: 14
  },
  badgeModalTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6
  },
  badgeModalIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  badgeModalList: {
    marginBottom: 12
  },
  badgeModalButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    paddingVertical: 11
  },
  badgeModalButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  bugDexModalBackdrop: {
    backgroundColor: "rgba(16, 32, 24, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 14
  },
  bugDexModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    maxHeight: "88%",
    padding: 12
  },
  bugDexModalTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5
  },
  bugDexModalIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  bugDexModalList: {
    marginBottom: 12
  },
  bugDexGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  bugDexCard: {
    backgroundColor: "#f7faf6",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 172,
    padding: 8,
    width: "48%"
  },
  bugDexCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  bugDexCardNumber: {
    borderRadius: 6,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  bugDexCardRarity: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 5
  },
  bugDexImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66
  },
  bugDexName: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  bugDexOwned: {
    color: "#53645d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
    textAlign: "center"
  },
  bugDexBuff: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    textAlign: "center"
  },
  bugDexModalButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    paddingVertical: 11
  },
  bugDexModalButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  bugList: {
    gap: 8
  },
  bugItem: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  bugText: {
    flex: 1,
    minWidth: 0
  },
  bugTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  bugMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  bugBonus: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  bugBadges: {
    alignItems: "flex-end",
    gap: 5
  },
  emptyText: {
    color: "#77847f",
    fontWeight: "800"
  }
});
