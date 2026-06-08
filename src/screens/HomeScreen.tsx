import React, { useEffect, useState } from "react";
import { Alert, DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteName } from "../../App";
import { BugArtImage } from "../components/BugArtImage";
import { TierBadge } from "../components/TierBadge";
import { listBugs } from "../services/bugService";
import { entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { claimMovementRadarBonuses, getMovementRadarProgress, MovementRadarProgress } from "../services/movementRadarService";
import { BugDexEntry, bugDexEntries, getTierForPoints, userTiers } from "../services/pointsService";
import { languages, useI18n } from "../services/i18n";
import { listUsers } from "../services/userService";
import { weeklyMissionLabel, weeklyMissionSet } from "../services/weeklyMissionService";
import { BugDexInventoryItem, BugReport, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  onNavigate: (route: RouteName) => void;
};

export function HomeScreen({ user, onNavigate }: Props) {
  const { language, setLanguage, t, tr } = useI18n();
  const tier = getTierForPoints(user.totalPoints);
  const [users, setUsers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [movementProgress, setMovementProgress] = useState<MovementRadarProgress | null>(null);
  const [movementClaiming, setMovementClaiming] = useState(false);
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const leaders = users.slice(0, 3);
  const userRank = Math.max(1, users.findIndex((item) => item.uid === user.uid) + 1);
  const dexCount = inventory.length;
  const dexPreviewEntries = inventory.slice(0, 3).map((item) => entryByBugId(item.bugId)).filter((entry): entry is BugDexEntry => Boolean(entry));
  const missions = weeklyMissionSet(user, bugs);
  const canClaimMovement = Boolean(movementProgress && movementProgress.claimableRewards > 0);
  const movementDataTypes = movementProgress?.dataTypes ?? [];
  const hasMovementSourceData = movementDataTypes.some((item) => item.available);
  const showMovementSourceHelp = Boolean(movementProgress && movementDataTypes.length > 0 && !hasMovementSourceData);
  const selectedLanguage = languages.find((item) => item.value === language) ?? languages[0];

  useEffect(() => {
    listUsers().then(setUsers);
    listBugs().then(setBugs);
    listBugDexInventory(user).then(setInventory);
    refreshMovementProgress();
  }, [user.uid, user.totalPoints]);

  async function refreshMovementProgress() {
    try {
      setMovementProgress(await getMovementRadarProgress(user.uid));
    } catch {
      setMovementProgress(null);
    }
  }

  async function handleMovementClaim() {
    if (movementClaiming) return;
    setMovementClaiming(true);
    try {
      await claimMovementRadarBonuses(user.uid);
      await refreshMovementProgress();
    } catch {
      await refreshMovementProgress();
    } finally {
      setMovementClaiming(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <View style={styles.heroNameRow}>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.72} numberOfLines={2} style={[sharedStyles.title, styles.heroTitle]}>{user.displayName}</Text>
            <View style={styles.heroActions}>
              <Pressable style={styles.languagePill} onPress={() => setLanguageOpen((current) => !current)}>
                <Text style={styles.languageFlag}>{selectedLanguage.flag}</Text>
              </Pressable>
              {languageOpen && (
                <View style={styles.languageMenu}>
                  {languages.filter((item) => item.value !== language).map((item) => (
                    <Pressable
                      key={item.value}
                      accessibilityLabel={`${t("language.label")} ${item.label}`}
                      style={styles.languageOption}
                      onPress={() => {
                        setLanguage(item.value);
                        setLanguageOpen(false);
                      }}
                    >
                      <Text style={styles.languageFlag}>{item.flag}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable style={styles.profilePill} onPress={() => onNavigate("profile")}>
                <Text style={styles.profileText}>{t("home.profile")}</Text>
              </Pressable>
              <Pressable style={styles.settingsPill} onPress={() => onNavigate("settings")}>
                <Text style={styles.settingsText}>{t("home.settings")}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.scoreText}>{tr(user.title)}</Text>
        </View>
        <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={tier.bugSize + 20} />
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{user.bugCount}</Text>
          <Text style={styles.statLabel}>{t("home.bugs")}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>#{userRank}</Text>
          <Text style={styles.statLabel}>{t("home.rank")}</Text>
        </View>
        <View style={styles.statTile}>
          <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={Math.max(38, tier.bugSize * 0.58)} />
          <Text style={styles.statLabel}>{tr(tier.title)}</Text>
        </View>
      </View>
      {movementProgress && (
        <View style={styles.movementCard}>
          <View style={styles.movementHeader}>
            <View style={styles.movementTitleRow}>
              <Text style={styles.movementTitle}>{t("home.movementRadar")}</Text>
              <Pressable
                accessibilityLabel={t("home.healthInfo")}
                hitSlop={10}
                onPress={() => showMovementConnectInfo(t)}
                style={({ pressed }) => [styles.movementInfoButton, pressed && styles.movementInfoButtonPressed]}
              >
                <Text style={styles.movementInfoText}>i</Text>
              </Pressable>
            </View>
            <View style={styles.movementHeaderActions}>
              <Text style={styles.movementReward}>{t("home.bugsReward", { awarded: movementProgress.awardedToday, max: movementProgress.maxRewards })}</Text>
              {canClaimMovement && (
                <Pressable
                  disabled={movementClaiming}
                  onPress={handleMovementClaim}
                  style={({ pressed }) => [
                    styles.movementClaimButton,
                    pressed && styles.movementClaimButtonPressed,
                    movementClaiming && styles.movementClaimButtonDisabled
                  ]}
                >
                  <Text style={styles.movementClaimText}>{movementClaiming ? "..." : t("home.claim")}</Text>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.movementGoals}>
            {movementProgress.goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.km / goal.targetKm) * 100));
              return (
                <View key={goal.id} style={styles.movementGoal}>
                  <View style={styles.movementLine}>
                    <Text style={styles.movementLabel}>{movementGoalLabel(goal, t)}</Text>
                    <Text style={styles.movementKm}>{formatKm(goal.km)}/{formatKm(goal.targetKm)} km</Text>
                  </View>
                  <View style={styles.movementTrack}>
                    <View style={[styles.movementFill, { width: `${progress}%` as DimensionValue }]} />
                  </View>
                </View>
              );
            })}
          </View>
          {showMovementSourceHelp && (
            <Text style={styles.movementHelp}>
              {t("home.connectHelp")}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.stage, styles.stageHidden]}>
        {userTiers.map((item) => {
          const current = item.title === tier.title;
          return (
            <View key={item.title} style={[styles.stageTierItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageTierItemActive]}>
              <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
              <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.58)} />
              <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                <Text style={[styles.stageStar, { color: item.frameColor }]}>★</Text>
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.tierWrap}>
        <TierBadge points={user.totalPoints} />
      </View>
      <Pressable style={styles.tierToggle} onPress={() => setShowAllTiers((current) => !current)}>
        <Text style={styles.tierToggleText}>{t("home.showAllTiers")}</Text>
      </Pressable>
      {showAllTiers && (
        <View style={styles.stage}>
          {userTiers.map((item) => {
            const current = item.title === tier.title;
            return (
              <View key={item.title} style={[styles.stageTierItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageTierItemActive]}>
                <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
                <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.58)} />
                <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                  <Text style={[styles.stageStar, { color: item.frameColor }]}>*</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Pressable style={styles.rankingCard} onPress={() => onNavigate("leaderboard")}>
        <View style={styles.rankingHeader}>
          <Text style={styles.sectionTitle}>Top</Text>
          <BugArtImage bugId="goliathkever" size={38} />
        </View>
        <View style={styles.rankingList}>
          {leaders.map((leader, index) => (
            <View key={leader.uid} style={styles.rankingLine}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.rankingName}>{leader.displayName}</Text>
              <Text style={styles.rankingPoints}>{leader.totalPoints}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <Pressable style={styles.dexCard} onPress={() => onNavigate("bugdex")}>
        <View style={styles.dexText}>
          <Text style={styles.dexTitle}>BugDex</Text>
          <Text style={styles.dexMeta}>{dexCount}/{bugDexEntries.length} {t("home.caught")}</Text>
        </View>
        <View style={styles.dexBugs}>
          {dexPreviewEntries.length ? dexPreviewEntries.map((entry) => (
            <BugArtImage key={entry.id} bugId={entry.id} size={50} />
          )) : (
            <Text style={styles.dexEmptyText}>{t("home.emptyDex")}</Text>
          )}
        </View>
      </Pressable>
      <View style={styles.missionCard}>
        <View style={styles.missionHeader}>
          <View>
            <Text style={styles.missionTitle}>{t("home.weeklyMissions")}</Text>
            <Text style={styles.missionWeek}>{weeklyMissionLabel()}</Text>
          </View>
          <BugArtImage bugId="sprinkhaan" size={48} />
        </View>
        <View style={styles.missionList}>
          {missions.map((mission) => {
            const done = mission.progress >= mission.target;
            const width: DimensionValue = `${Math.min(100, Math.round((mission.progress / mission.target) * 100))}%`;
            return (
              <View key={mission.id} style={styles.missionItem}>
                <View style={styles.missionLine}>
                  <Text style={styles.missionName}>{tr(mission.title)}</Text>
                  <Text style={[styles.missionCount, done && styles.missionDone]}>{mission.progress}/{mission.target}</Text>
                </View>
                <View style={styles.missionTrack}>
                  <View style={[styles.missionFill, { width }]} />
                </View>
                <Text style={styles.missionReward}>{done ? t("home.unlockedExtra") : tr(mission.reward)}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.quickCard}>
        <Text style={styles.newsTitle}>{t("home.actions")}</Text>
        <View style={styles.newsGrid}>
          <View style={styles.updatePill}>
            <BugArtImage bugId="pissebed" size={32} />
            <Text style={styles.newsItemTitle}>3 bugs</Text>
          </View>
          <View style={styles.updatePill}>
            <BugArtImage bugId="mestkever" size={32} />
            <Text style={styles.newsItemTitle}>Fix +15</Text>
          </View>
          <Pressable style={styles.updatePill} onPress={() => onNavigate("bugdex")}>
            <BugArtImage bugId="lieveheersbeestje" size={32} />
            <Text style={styles.newsItemTitle}>BugDex</Text>
          </Pressable>
        </View>
      </View>
      <Pressable style={[sharedStyles.button, styles.actionButton]} onPress={() => onNavigate("bugs")}>
        <BugArtImage bugId="neushoornkever" size={38} />
        <Text style={sharedStyles.buttonText}>{t("home.viewBugs")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatKm(km: number): string {
  if (km >= 10) return String(Math.floor(km));
  return km.toFixed(1).replace(".0", "");
}

function movementGoalLabel(goal: MovementRadarProgress["goals"][number], t: (key: string) => string): string {
  return t(`movement.goal.${goal.id}`);
}

function showMovementConnectInfo(t: (key: string) => string): void {
  Alert.alert(
    t("health.connectTitle"),
    t("health.connectBody"),
    [{ text: "OK" }]
  );
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
  heroNameRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  heroTitle: {
    color: "#ffffff",
    flex: 1,
    flexShrink: 1,
    lineHeight: 31,
    minWidth: 0
  },
  profilePill: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  heroActions: {
    alignItems: "stretch",
    gap: 6
  },
  languagePill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(253,254,251,0.6)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  languageMenu: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    padding: 4
  },
  languageOption: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 34
  },
  languageFlag: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900"
  },
  profileText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  settingsPill: {
    backgroundColor: "rgba(253,254,251,0.14)",
    borderColor: "rgba(253,254,251,0.34)",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  settingsText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  scoreText: {
    color: "#dbe8de",
    fontSize: 16,
    fontWeight: "800"
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  statTile: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 82,
    justifyContent: "center",
    padding: 10
  },
  statValue: {
    color: "#102018",
    fontSize: 22,
    fontWeight: "900"
  },
  statLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  movementCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  movementHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  movementTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  movementTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  movementInfoButton: {
    alignItems: "center",
    backgroundColor: "#e8f1eb",
    borderColor: "#b8cbbd",
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  movementInfoButtonPressed: {
    opacity: 0.7
  },
  movementInfoText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  movementReward: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  movementHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  movementClaimButton: {
    backgroundColor: "#15724f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  movementClaimButtonDisabled: {
    opacity: 0.45
  },
  movementClaimButtonPressed: {
    opacity: 0.75
  },
  movementClaimText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  movementGoals: {
    gap: 7
  },
  movementGoal: {
    gap: 4
  },
  movementLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  movementLabel: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  movementKm: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  movementTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 7,
    overflow: "hidden"
  },
  movementFill: {
    backgroundColor: "#15724f",
    height: "100%"
  },
  movementHelp: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 8
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
    marginBottom: 12,
    padding: 12
  },
  stageHidden: {
    display: "none"
  },
  stageTierItem: {
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
  stageTierItemActive: {
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
  tierWrap: {
    marginBottom: 12
  },
  tierToggle: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  tierToggleText: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  rankingCard: {
    backgroundColor: "#102018",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14
  },
  dexCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#cddfd3",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
    padding: 14
  },
  dexText: {
    flex: 1
  },
  dexTitle: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  dexMeta: {
    color: "#52665d",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  dexBugs: {
    alignItems: "center",
    flexDirection: "row",
    gap: 0
  },
  dexEmptyText: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900"
  },
  missionCard: {
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  missionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  missionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  missionWeek: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  missionList: {
    gap: 9
  },
  missionItem: {
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    padding: 10
  },
  missionLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  missionName: {
    color: "#102018",
    flex: 1,
    fontSize: 13,
    fontWeight: "900"
  },
  missionCount: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "900"
  },
  missionDone: {
    color: "#15724f"
  },
  missionTrack: {
    backgroundColor: "#dbe8de",
    borderRadius: 8,
    height: 8,
    marginTop: 7,
    overflow: "hidden"
  },
  missionFill: {
    backgroundColor: "#15724f",
    height: "100%"
  },
  missionReward: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6
  },
  rankingHeader: {
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: 70
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  rankingList: {
    flex: 1,
    gap: 4
  },
  rankingLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  rank: {
    color: "#d7bd57",
    fontWeight: "900",
    width: 18
  },
  rankingName: {
    color: "#ffffff",
    flex: 1,
    flexShrink: 1,
    fontWeight: "800"
  },
  rankingPoints: {
    color: "#d7bd57",
    fontWeight: "900"
  },
  quickCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  newsTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  newsGrid: {
    flexDirection: "row",
    gap: 8
  },
  updatePill: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flex: 1,
    gap: 5,
    padding: 9
  },
  newsItemTitle: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  actionButton: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  }
});
