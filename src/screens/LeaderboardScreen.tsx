import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { LastCatchSummary, LeaderboardRow } from "../components/LeaderboardRow";
import { MedalIcon } from "../components/MedalIcon";
import { entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { bugDexEntryName, useI18n } from "../services/i18n";
import { BugDexRarity } from "../services/pointsService";
import { defaultOrganizationId, organizationIdsForUser, organizationNamesForUser } from "../services/organizationService";
import { presenceLabel } from "../services/presenceService";
import { currentDuelSeasonId, duelSeasonEndLabel, duelSeasonRank, duelSeasonRewardForRank, effectiveDuelRating, getDuelSeasonSummary } from "../services/duelSeasonService";
import { visibleRankUsers } from "../services/leaderboardRank";
import { listLeaderboardUsers } from "../services/userService";
import { User } from "../types";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { sharedStyles } from "./sharedStyles";

type Props = {
  currentUser: User;
  onBack: () => void;
  onSelectUser: (user: User) => void;
};

const podiumStyles = [
  { border: "#d7bd57", background: "#fff7d6", shine: "#f4d76a", text: "#6f560c", bugId: "doodshoofdvlinder" },
  { border: "#b9c1c8", background: "#f3f6f7", shine: "#dfe5e8", text: "#4d5960", bugId: "boktor" },
  { border: "#b87842", background: "#fff0df", shine: "#e2a56d", text: "#6e3f1e", bugId: "duizendpoot" }
];
type RankingMode = "score" | "duel" | "bugs";

const seasonRewardBadges = [
  { color: "#ef4444", label: "#1 ★★★★★" },
  { color: "#f59f00", label: "#2 ★★★★" },
  { color: "#9c36b5", label: "#3 ★★★ ×2" },
  { color: "#9c36b5", label: "#4 ★★★" },
  { color: "#228be6", label: "#5 ★★ ×2" }
];

const seasonRewardVisuals = {
  Zeldzaam: { color: "#228be6", stars: "★★" },
  Episch: { color: "#9c36b5", stars: "★★★" },
  Legendarisch: { color: "#f59f00", stars: "★★★★" },
  Mythisch: { color: "#ef4444", stars: "★★★★★" }
};

const rarityVisuals: Record<BugDexRarity, { color: string; stars: string }> = {
  Gewoon: { color: "#2f9e44", stars: "★" },
  Zeldzaam: { color: "#228be6", stars: "★★" },
  Episch: { color: "#9c36b5", stars: "★★★" },
  Legendarisch: { color: "#f59f00", stars: "★★★★" },
  Mythisch: { color: "#ef4444", stars: "★★★★★" }
};

function duelRating(user: User): number {
  return effectiveDuelRating(user);
}

export function LeaderboardScreen({ currentUser, onBack, onSelectUser }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const reveal = useRef(new Animated.Value(0)).current;
  const [users, setUsers] = useState<User[]>([]);
  const [lastCatches, setLastCatches] = useState<Record<string, LastCatchSummary>>({});
  const [loading, setLoading] = useState(true);
  const [lastSeasonWinner, setLastSeasonWinner] = useState("");
  const [organizationPickerOpen, setOrganizationPickerOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [rankingMode, setRankingMode] = useState<RankingMode>("duel");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(defaultOrganizationId);
  const organizationIds = organizationIdsForUser(currentUser);
  const organizationNames = organizationNamesForUser(currentUser);
  const organizationOptions = [
    { id: defaultOrganizationId, name: t("leaderboard.globalRank") },
    ...organizationIds.map((id) => ({ id, name: organizationNames[id] ?? id }))
  ];
  const selectedOrganizationName = organizationOptions.find((item) => item.id === selectedOrganizationId)?.name ?? t("leaderboard.globalRank");
  const scopedUsers = visibleRankUsers(users, currentUser);
  const filteredUsers = selectedOrganizationId === defaultOrganizationId
    ? scopedUsers
    : scopedUsers.filter((item) => organizationIdsForUser(item).includes(selectedOrganizationId));
  const unlockedBugCount = (user: User) => Math.max(0, Math.floor(user.bugDexCount ?? 0));
  const metricLabel = rankingMode === "duel"
    ? t("leader.duelRating")
    : rankingMode === "bugs"
      ? t("leader.unlockedBugs")
      : t("leader.score");
  const metricValue = (user: User) => rankingMode === "duel" ? duelRating(user) : rankingMode === "bugs" ? unlockedBugCount(user) : user.totalPoints;
  const visibleUsers = [...filteredUsers].sort((a, b) => {
    const metricDifference = metricValue(b) - metricValue(a);
    return metricDifference || b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName);
  });
  const ownDuelRank = duelSeasonRank(filteredUsers, currentUser.uid, currentDuelSeasonId());
  const ownSeasonReward = ownDuelRank ? duelSeasonRewardForRank(ownDuelRank) : null;

  useEffect(() => {
    let active = true;
    async function load() {
      const [nextUsers, previousSeason] = await Promise.all([listLeaderboardUsers({ complete: true, fresh: true }), getDuelSeasonSummary().catch(() => null)]);
      const catchUsers = nextUsers;
      const catchPairs = await Promise.all(catchUsers.map(async (item) => [item.uid, await latestCatchForUser(item)] as const));
      if (!active) return;
      setUsers(nextUsers);
      setLastSeasonWinner(previousSeason?.top5[0]?.displayName ?? "");
      setLastCatches(Object.fromEntries(catchPairs.filter((item): item is readonly [string, LastCatchSummary] => Boolean(item[1]))));
      setLoading(false);
    }
    void load().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    Animated.timing(reveal, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [reveal]);

  return (
    <View
      style={[
        sharedStyles.screen,
        styles.screen,
        {
          maxWidth: layout.contentMaxWidth,
          paddingHorizontal: layout.gutter
        },
        layout.isTablet && styles.screenWide
      ]}
    >
      <Animated.View
        style={[
          styles.header,
          layout.isTablet && styles.headerWide,
          {
            opacity: reveal,
            transform: [{
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0]
              })
            }]
          }
        ]}
      >
        <Pressable accessibilityLabel={t("common.back")} accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.headerBackButton, pressed && styles.controlPressed]}>
          <GameUiIcon name="back" size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerKicker}>BUGBAAS LEAGUE</Text>
          <Text style={[sharedStyles.title, styles.headerTitle]}>{t("leaderboard.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("leaderboard.subtitle")}</Text>
        </View>
        <View style={styles.headerBugWrap}>
          <MedalIcon index={0} size={layout.isTablet ? 84 : 70} />
          <View style={styles.headerChampionBug}>
            <BugArtImage bugId="atlaskever" size={layout.isTablet ? 42 : 36} />
          </View>
        </View>
      </Animated.View>
      {organizationIds.length > 0 && (
        <View style={styles.filterCard}>
          <Pressable style={styles.filterHeader} onPress={() => setOrganizationPickerOpen((current) => !current)}>
            <View style={styles.filterTextBlock}>
              <Text style={styles.filterLabel}>{t("leaderboard.rankFilter")}</Text>
              <Text style={styles.filterValue} numberOfLines={1}>{selectedOrganizationName}</Text>
            </View>
            <Text style={styles.filterAction}>{organizationPickerOpen ? t("common.close") : t("common.open")}</Text>
          </Pressable>
          {organizationPickerOpen && (
            <View style={styles.filterOptions}>
              {organizationOptions.map((option) => {
                const active = option.id === selectedOrganizationId;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.filterOption, active && styles.filterOptionActive]}
                    onPress={() => {
                      setSelectedOrganizationId(option.id);
                      setOrganizationPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]} numberOfLines={1}>{option.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
      <View style={styles.seasonCard}>
        <Pressable style={styles.seasonHeaderRow} onPress={() => setSeasonOpen((current) => !current)}>
          <View style={styles.seasonHeaderText}>
            <Text style={styles.seasonTitle}>Maandelijkse Duel Season</Text>
            <Text style={styles.seasonMeta}>Eindigt: {duelSeasonEndLabel()} · jij {ownDuelRank ? `#${ownDuelRank}` : "-"}</Text>
          </View>
          <Text style={styles.seasonDropdownIcon}>{seasonOpen ? "▲" : "▼"}</Text>
        </Pressable>
        {seasonOpen && (
          <View style={styles.seasonDetails}>
            <Text style={styles.seasonRule}>Alleen ranked/random duels tellen mee. Na maandafsluiting reset iedereen naar 1000.</Text>
            <View style={styles.seasonRewardRow}>
              {seasonRewardBadges.map((reward) => (
                <View key={reward.label} style={[styles.seasonRewardChip, { borderColor: reward.color }]}>
                  <Text style={[styles.seasonRewardChipText, { color: reward.color }]}>{reward.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.seasonOwnReward}>
              Mogelijke reward: {ownSeasonReward ? `${seasonRewardVisuals[ownSeasonReward.rarity].stars}${ownSeasonReward.count > 1 ? ` ×${ownSeasonReward.count}` : ""}` : "geen top 5 reward"}
            </Text>
            {lastSeasonWinner ? <Text style={styles.seasonMeta}>Vorige winnaar: {lastSeasonWinner}</Text> : null}
          </View>
        )}
      </View>
      <View style={styles.rankModeRow}>
        {(["duel", "score", "bugs"] as RankingMode[]).map((mode) => {
          const active = rankingMode === mode;
          return (
            <Pressable key={mode} style={[styles.rankModeButton, active && styles.rankModeButtonActive]} onPress={() => setRankingMode(mode)}>
              <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[styles.rankModeText, active && styles.rankModeTextActive]}>{mode === "duel" ? t("leaderboard.duelRank") : mode === "score" ? t("leaderboard.scoreRank") : t("leaderboard.bugsRank")}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={visibleUsers.slice(3)}
          keyExtractor={(user) => user.uid}
          ListHeaderComponent={visibleUsers.length ? (
            <Animated.View
              style={{
                opacity: reveal,
                transform: [{
                  scale: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1]
                  })
                }]
              }}
            >
              <Podium
                lastCatches={lastCatches}
                metricLabel={metricLabel}
                metricValue={metricValue}
                onSelectUser={onSelectUser}
                users={visibleUsers.slice(0, 3)}
                wide={layout.isTablet}
              />
            </Animated.View>
          ) : null}
          ListEmptyComponent={visibleUsers.length ? null : <Text style={sharedStyles.subtitle}>{t("leaderboard.empty")}</Text>}
          renderItem={({ item, index }) => <LeaderboardRow metricLabel={metricLabel} metricValue={metricValue(item)} user={item} lastCatch={lastCatches[item.uid]} index={index + 3} onPress={() => onSelectUser(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}
    </View>
  );
}

async function latestCatchForUser(user: User): Promise<LastCatchSummary | null> {
  try {
    const inventory = await listBugDexInventory(user);
    const latest = inventory
      .filter((item) => item.lastUnlockedAt)
      .sort((a, b) => Date.parse(b.lastUnlockedAt) - Date.parse(a.lastUnlockedAt))[0];
    if (!latest) return null;
    const entry = entryByBugId(latest.bugId);
    return {
      bugId: latest.bugId,
      lastUnlockedAt: latest.lastUnlockedAt,
      rarity: entry?.rarity ?? "Gewoon"
    };
  } catch {
    return null;
  }
}

function Podium({ lastCatches, metricLabel, metricValue, users, onSelectUser, wide }: { lastCatches: Record<string, LastCatchSummary>; metricLabel: string; metricValue: (user: User) => number; users: User[]; onSelectUser: (user: User) => void; wide: boolean }) {
  const { t } = useI18n();
  return (
    <View style={[styles.podium, wide && styles.podiumWide]}>
      {users.map((user, index) => {
        const medal = podiumStyles[index] ?? podiumStyles[0];
        const lastCatch = lastCatches[user.uid];
        const lastCatchEntry = lastCatch ? entryByBugId(lastCatch.bugId) : null;
        const rarityVisual = lastCatch ? rarityVisuals[lastCatch.rarity] : null;
        return (
          <Pressable
            accessibilityRole="button"
            key={user.uid}
            style={({ pressed }) => [
              styles.podiumCard,
              wide && styles.podiumCardWide,
              { backgroundColor: medal.background, borderColor: medal.border },
              index === 0 && styles.podiumLeader,
              pressed && styles.controlPressed
            ]}
            onPress={() => onSelectUser(user)}
          >
            <View style={[styles.podiumShine, { backgroundColor: medal.shine }]} />
            <MedalIcon index={index} size={index === 0 ? 76 : 58} />
            <CharacterAvatarImage characterId={user.characterId} size={index === 0 ? 66 : 56} />
            <BugArtImage bugId={medal.bugId} size={index === 0 ? 42 : 34} />
            <Text style={[styles.podiumRank, { color: medal.text }]}>#{index + 1}</Text>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.8} numberOfLines={1} style={[styles.podiumName, { color: medal.text }]}>{user.displayName}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.podiumPoints}>{metricValue(user)} {metricLabel}</Text>
            <View style={styles.podiumFooter}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.podiumPresence, { color: medal.text }]}>{presenceLabel(user, t)}</Text>
              {lastCatch && lastCatchEntry && rarityVisual ? (
                <View style={styles.podiumLastCatch}>
                  <View style={[styles.podiumLastCatchBug, { borderColor: rarityVisual.color }]}>
                    <BugArtImage bugId={lastCatch.bugId} size={22} />
                  </View>
                  <View style={styles.podiumLastCatchInfo}>
                    <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.podiumLastCatchText, { color: medal.text }]}>{bugDexEntryName(lastCatchEntry, t)}</Text>
                    <Text numberOfLines={1} style={[styles.podiumRarityStars, { color: rarityVisual.color }]}>{rarityVisual.stars}</Text>
                  </View>
                </View>
              ) : (
                <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.podiumLastCatchText, { color: medal.text }]}>{t("leader.noLastCatch")}</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: "center",
    paddingBottom: 0,
    paddingTop: 14,
    width: "100%"
  },
  screenWide: {
    paddingTop: 20
  },
  header: {
    alignItems: "center",
    backgroundColor: "#222743",
    borderColor: "#e0ad4f",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    minHeight: 122,
    overflow: "hidden",
    padding: 16
  },
  headerBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,34,50,0.96)",
    borderColor: "#2c829b",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  headerWide: {
    minHeight: 154,
    paddingHorizontal: 26
  },
  headerText: {
    flex: 1
  },
  headerKicker: {
    color: "#ffcb67",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 3
  },
  headerTitle: {
    color: "#ffffff",
    marginBottom: 4
  },
  headerSubtitle: {
    color: "#d7ddf5",
    fontSize: 13,
    fontWeight: "800"
  },
  headerBugWrap: {
    alignItems: "center",
    backgroundColor: "rgba(226,174,75,0.12)",
    borderColor: "rgba(255,203,103,0.44)",
    borderRadius: 24,
    borderWidth: 1,
    height: 92,
    justifyContent: "center",
    width: 92
  },
  headerChampionBug: {
    alignItems: "center",
    bottom: -2,
    justifyContent: "center",
    position: "absolute",
    right: -1
  },
  filterCard: {
    backgroundColor: "#f2f6ff",
    borderColor: "#c4d1eb",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 10
  },
  filterHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  filterTextBlock: {
    flex: 1,
    minWidth: 0
  },
  filterLabel: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  filterValue: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  filterAction: {
    backgroundColor: "#dfe8f8",
    borderColor: "#b9c9e5",
    borderRadius: 999,
    borderWidth: 1,
    color: "#3c5688",
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  filterOptions: {
    gap: 8,
    marginTop: 10
  },
  filterOption: {
    backgroundColor: "#ffffff",
    borderColor: "#c4d1eb",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  filterOptionActive: {
    backgroundColor: "#3c5688",
    borderColor: "#3c5688"
  },
  filterOptionText: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  filterOptionTextActive: {
    color: "#ffffff"
  },
  podium: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  podiumWide: {
    gap: 14
  },
  podiumCard: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 20,
    borderWidth: 3,
    elevation: 3,
    flex: 1,
    minHeight: 186,
    overflow: "hidden",
    padding: 10,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8
  },
  podiumCardWide: {
    minHeight: 224,
    padding: 14
  },
  podiumLeader: {
    minHeight: 198
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }]
  },
  podiumShine: {
    height: 40,
    opacity: 0.52,
    position: "absolute",
    right: -20,
    top: -20,
    transform: [{ rotate: "45deg" }],
    width: 40
  },
  podiumRank: {
    color: "#17211c",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  podiumName: {
    color: "#17211c",
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2,
    maxWidth: "100%",
    minWidth: 0,
    textAlign: "center"
  },
  podiumLeaderName: {
    fontSize: 16,
    lineHeight: 20
  },
  podiumPoints: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
    maxWidth: "100%",
    textAlign: "center"
  },
  podiumFooter: {
    alignItems: "center",
    gap: 3,
    marginTop: 7,
    maxWidth: "100%"
  },
  podiumPresence: {
    fontSize: 9,
    fontWeight: "900",
    opacity: 0.86
  },
  podiumLastCatch: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    maxWidth: "100%"
  },
  podiumLastCatchBug: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 7,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  podiumLastCatchInfo: {
    flexShrink: 1,
    minWidth: 0
  },
  podiumLastCatchText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: "900",
    maxWidth: "100%",
    opacity: 0.88
  },
  podiumRarityStars: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 10
  },
  list: {
    flex: 1,
    minHeight: 0
  },
  listContent: {
    paddingBottom: 120
  },
  seasonCard: {
    backgroundColor: "#fff8e8",
    borderColor: "#e2bd68",
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    marginBottom: 10,
    padding: 10
  },
  seasonHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  seasonDetails: {
    gap: 7,
    paddingTop: 8
  },
  seasonDropdownIcon: {
    color: "#d7bd57",
    fontSize: 15,
    fontWeight: "900"
  },
  seasonHeaderText: {
    flex: 1,
    minWidth: 0
  },
  seasonMeta: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14
  },
  seasonOwnRankLabel: {
    color: "#53645d",
    fontSize: 9,
    fontWeight: "900"
  },
  seasonOwnRankPill: {
    alignItems: "center",
    backgroundColor: "#222743",
    borderColor: "#d7bd57",
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  seasonOwnRankValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  seasonOwnReward: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900"
  },
  seasonRewardChip: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  seasonRewardChipText: {
    fontSize: 10,
    fontWeight: "900"
  },
  seasonRewardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5
  },
  seasonRule: {
    color: "#33443c",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14
  },
  seasonTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  rankModeButton: {
    alignItems: "center",
    backgroundColor: "#f1f3fa",
    borderColor: "#ccd2e2",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9
  },
  rankModeButtonActive: {
    backgroundColor: "#65458b",
    borderColor: "#b89bd5"
  },
  rankModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  rankModeText: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  rankModeTextActive: {
    color: "#ffffff"
  }
});
