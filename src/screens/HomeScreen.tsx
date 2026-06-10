import React, { useEffect, useState } from "react";
import { DimensionValue, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteName } from "../../App";
import { BugArtImage } from "../components/BugArtImage";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { TierBadge } from "../components/TierBadge";
import { listBugs } from "../services/bugService";
import { BugArtId } from "../services/bugArt";
import { BugDexDropResult, entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { bugLampStatus } from "../services/bugLampService";
import { maxActiveBugSquadSize, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { listBugSmashDuels } from "../services/bugSmashDuelService";
import { claimMovementRadarBonusesForApp, claimQueuedRadarBugs, getMovementRadarProgress, getQueuedRadarBugIds, MovementRadarProgress } from "../services/movementRadarService";
import { bugDexEntries, BugDexRarity, getTierForPoints, userTiers } from "../services/pointsService";
import { languages, useI18n } from "../services/i18n";
import { listUsers } from "../services/userService";
import { claimedWeeklyMissionIds, claimWeeklyMissionBonusWithReward, claimWeeklyMissionReward, isWeeklyMissionBonusClaimed, weeklyMissionLabel, weeklyMissionSet, weeklyMissionSetComplete } from "../services/weeklyMissionService";
import { BugDexInventoryItem, BugReport, BugSmashDuel, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  movementBoost?: number;
  onActivateBugLamp?: () => Promise<void>;
  onMovementRadarClaimed?: (bugIds: BugArtId[]) => void;
  onMovementRegistered?: (estimatedKm: number) => Promise<void>;
  onOpenBugDexWorkshop?: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
  user: User;
  onNavigate: (route: RouteName) => void;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

const settingsGearImage = require("../../assets/generated/settings-gear-hd.png");

export function HomeScreen({ movementBoost = 0, onActivateBugLamp, onMovementRadarClaimed, onMovementRegistered, onOpenBugDexWorkshop, onRewardDrop, onUserUpdated, user, onNavigate }: Props) {
  const { language, setLanguage, t, tr } = useI18n();
  const tier = getTierForPoints(user.totalPoints);
  const [users, setUsers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [movementProgress, setMovementProgress] = useState<MovementRadarProgress | null>(null);
  const [queuedRadarBugIds, setQueuedRadarBugIds] = useState<BugArtId[]>([]);
  const [bugLampActivating, setBugLampActivating] = useState(false);
  const [movementClaiming, setMovementClaiming] = useState(false);
  const [claimedMissionIds, setClaimedMissionIds] = useState<Set<string>>(new Set());
  const [claimingMissionId, setClaimingMissionId] = useState("");
  const [weeklyBonusClaimed, setWeeklyBonusClaimed] = useState(false);
  const [weeklyBonusClaiming, setWeeklyBonusClaiming] = useState(false);
  const [weeklyBonusError, setWeeklyBonusError] = useState("");
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const leaders = users.slice(0, 3);
  const userRank = Math.max(1, users.findIndex((item) => item.uid === user.uid) + 1);
  const dexCount = inventory.length;
  const activeSquadEntries = sanitizeActiveBugSquad(user.activeBugSquad, inventory)
    .map((bugId) => entryByBugId(bugId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const missions = weeklyMissionSet(user, bugs, { duels, inventory });
  const missionIdsKey = missions.map((mission) => mission.id).join("|");
  const canClaimMovement = Boolean((movementProgress && movementProgress.claimableRewards > 0) || queuedRadarBugIds.length > 0);
  const selectedLanguage = languages.find((item) => item.value === language) ?? languages[0];
  const lampStatus = bugLampStatus(user);
  const showBugLamp = lampStatus.active || lampStatus.count > 0;

  useEffect(() => {
    listUsers().then(setUsers);
    listBugs().then(setBugs);
    listBugSmashDuels(user).then(setDuels).catch(() => setDuels([]));
    listBugDexInventory(user).then(setInventory);
    refreshMovementProgress();
  }, [movementBoost, user.uid, user.totalPoints]);

  useEffect(() => {
    claimedWeeklyMissionIds(user, missions.map((mission) => mission.id)).then(setClaimedMissionIds).catch(() => setClaimedMissionIds(new Set()));
    isWeeklyMissionBonusClaimed(user, missions).then(setWeeklyBonusClaimed).catch(() => setWeeklyBonusClaimed(false));
  }, [missionIdsKey, user.uid]);

  async function refreshMovementProgress() {
    try {
      const [progress, queuedBugIds] = await Promise.all([
        getMovementRadarProgress(user.uid, movementBoost),
        getQueuedRadarBugIds()
      ]);
      setMovementProgress(progress);
      setQueuedRadarBugIds(queuedBugIds);
    } catch {
      setMovementProgress(null);
      setQueuedRadarBugIds([]);
    }
  }

  async function handleMovementClaim() {
    if (movementClaiming) return;
    setMovementClaiming(true);
    try {
      const queuedBugIds = await claimQueuedRadarBugs();
      if (queuedBugIds.length > 0) {
        onMovementRadarClaimed?.(queuedBugIds);
        await refreshMovementProgress();
        return;
      }

      const result = await claimMovementRadarBonusesForApp(user.uid, movementBoost);
      if (result.estimatedKm > 0) await onMovementRegistered?.(result.estimatedKm);
      if (result.bugIds.length > 0) onMovementRadarClaimed?.(result.bugIds);
      await refreshMovementProgress();
    } catch {
      await refreshMovementProgress();
    } finally {
      setMovementClaiming(false);
    }
  }

  async function handleActivateBugLamp() {
    if (bugLampActivating || !onActivateBugLamp) return;
    setBugLampActivating(true);
    try {
      await onActivateBugLamp();
      await refreshMovementProgress();
    } finally {
      setBugLampActivating(false);
    }
  }

  async function handleWeeklyMissionClaim(mission: typeof missions[number]) {
    if (claimingMissionId || mission.progress < mission.target || claimedMissionIds.has(mission.id)) return;
    setClaimingMissionId(mission.id);
    setWeeklyBonusError("");
    try {
      const result = await claimWeeklyMissionReward(user, mission);
      if (result?.user) onUserUpdated?.(result.user);
      if (result?.drop) {
        onRewardDrop?.(result.drop);
        listBugDexInventory(user).then(setInventory).catch(() => undefined);
      }
      const refreshed = await claimedWeeklyMissionIds(user, missions.map((item) => item.id));
      setClaimedMissionIds(refreshed);
      if (!refreshed.has(mission.id)) setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } catch {
      const refreshed = await claimedWeeklyMissionIds(user, missions.map((item) => item.id)).catch(() => claimedMissionIds);
      setClaimedMissionIds(refreshed);
      if (!refreshed.has(mission.id)) setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } finally {
      setClaimingMissionId("");
    }
  }

  async function handleWeeklyBonusClaim() {
    if (weeklyBonusClaiming || weeklyBonusClaimed || !weeklyMissionSetComplete(missions)) return;
    setWeeklyBonusClaiming(true);
    setWeeklyBonusError("");
    try {
      const result = await claimWeeklyMissionBonusWithReward(user, missions);
      if (!result) {
        setWeeklyBonusClaimed(await isWeeklyMissionBonusClaimed(user, missions));
        return;
      }
      onUserUpdated?.(result.user);
      onRewardDrop?.(result.drop);
      setWeeklyBonusClaimed(true);
    } catch {
      setWeeklyBonusError(t("home.weeklyBonusFailed"));
    } finally {
      setWeeklyBonusClaiming(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroNameRow}>
          <View style={styles.heroText}>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.62} numberOfLines={1} style={[sharedStyles.title, styles.heroTitle]}>{user.displayName}</Text>
            <Text style={styles.scoreText}>{tr(user.title)}</Text>
          </View>
          <View style={styles.heroActions}>
            <View style={styles.languageWrap}>
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
            </View>
            <Pressable accessibilityLabel={t("home.profile")} accessibilityRole="button" hitSlop={8} style={styles.profilePill} onPress={() => onNavigate("profile")}>
              <CharacterAvatarImage characterId={user.characterId} size={36} />
            </Pressable>
            <Pressable accessibilityLabel={t("home.settings")} accessibilityRole="button" hitSlop={8} style={styles.settingsPill} onPress={() => onNavigate("settings")}>
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={settingsGearImage} style={styles.settingsImage} />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.statValue}>{dexCount}/{bugDexEntries.length}</Text>
          <Text style={styles.statLabel}>BugDex</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>#{userRank}</Text>
          <Text style={styles.statLabel}>{t("home.rank")}</Text>
        </View>
        <View style={styles.statTile}>
          <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={Math.max(34, tier.bugSize * 0.5)} />
          <Text style={styles.statLabel}>{tr(tier.title)}</Text>
        </View>
      </View>
      {movementProgress && (
        <View style={styles.movementCard}>
          <View style={styles.movementHeader}>
            <Text style={styles.movementTitle}>{t("home.movementRadar")}</Text>
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
        </View>
      )}
      {showBugLamp && (
        <View style={[styles.movementCard, styles.bugLampCard]}>
          <View style={styles.bugLampHeader}>
            <View style={styles.bugLampIcon}>
              <Text style={styles.bugLampIconText}>L</Text>
            </View>
            <View style={styles.bugLampText}>
              <Text style={[styles.movementTitle, styles.bugLampTitle]}>{t("home.bugLamp")}</Text>
              <Text style={styles.bugLampMeta}>
                {lampStatus.active ? t("home.bugLampActive", { time: formatRemaining(lampStatus.remainingMs) }) : t("home.bugLampCount", { count: lampStatus.count })}
              </Text>
            </View>
            {!lampStatus.active && lampStatus.count > 0 && (
              <Pressable
                disabled={bugLampActivating}
                onPress={handleActivateBugLamp}
                style={({ pressed }) => [
                  styles.bugLampButton,
                  pressed && styles.movementClaimButtonPressed,
                  bugLampActivating && styles.movementClaimButtonDisabled
                ]}
              >
                <Text style={styles.bugLampButtonText}>{bugLampActivating ? "..." : t("home.activate")}</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.bugLampEffect}>{t("home.bugLampEffect")}</Text>
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
          {Array.from({ length: maxActiveBugSquadSize }).map((_, index) => {
            const entry = activeSquadEntries[index];
            return (
              <View key={entry?.id ?? index} style={styles.dexBugJar}>
                <View style={[styles.dexBugJarLid, entry && { backgroundColor: rarityColors[entry.rarity] }]} />
                <View style={[styles.dexBugSlot, entry && { borderColor: rarityColors[entry.rarity] }]}>
                  <View style={styles.dexBugJarShine} />
                  {entry ? <BugArtImage bugId={entry.id} size={34} /> : <Text style={styles.dexEmptySlot}>+</Text>}
                  <View style={styles.dexBugJarBase} />
                </View>
              </View>
            );
          })}
        </View>
      </Pressable>
      <Pressable style={styles.workshopCard} onPress={onOpenBugDexWorkshop ?? (() => onNavigate("bugdex"))}>
        <Image source={require("../../assets/generated/bugdex-workshop-shortcut.png")} style={styles.workshopImage} />
        <View style={styles.workshopText}>
          <Text style={styles.workshopTitle}>{t("home.workshopTitle")}</Text>
          <Text style={styles.workshopBody} numberOfLines={2}>{t("home.workshopBody")}</Text>
          <Text style={styles.workshopCta}>{t("home.workshopCta")}</Text>
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
            const claimed = claimedMissionIds.has(mission.id);
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
                {done && !claimed ? (
                  <Pressable style={styles.missionClaimButton} disabled={claimingMissionId === mission.id} onPress={() => handleWeeklyMissionClaim(mission)}>
                    <Text style={styles.missionClaimText}>{claimingMissionId === mission.id ? "..." : t("home.claimWeeklyReward")}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.missionReward}>
                    {done && claimed ? t("home.claimedWeeklyReward", { reward: tr(mission.reward) }) : t("home.weeklyReward", { reward: tr(mission.reward) })}
                  </Text>
                )}
              </View>
            );
          })}
          {weeklyMissionSetComplete(missions) && !weeklyBonusClaimed && (
            <Pressable style={styles.missionBonusButton} disabled={weeklyBonusClaiming} onPress={handleWeeklyBonusClaim}>
              <Text style={styles.missionBonusText}>{weeklyBonusClaiming ? "..." : t("home.claimWeeklyBugDex")}</Text>
            </Pressable>
          )}
          {weeklyMissionSetComplete(missions) && weeklyBonusClaimed && (
            <Text style={styles.missionReward}>{t("home.claimedWeeklyBugDex")}</Text>
          )}
          {weeklyBonusError ? <Text style={styles.missionError}>{weeklyBonusError}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

function formatRemaining(ms: number): string {
  const hours = Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
  return `${hours}h`;
}

function formatKm(km: number): string {
  if (km >= 10) return String(Math.floor(km));
  return km.toFixed(1).replace(".0", "");
}

function movementGoalLabel(goal: MovementRadarProgress["goals"][number], t: (key: string) => string): string {
  return t(`movement.goal.${goal.id}`);
}

function ProfileIcon() {
  return (
    <View style={styles.profileIcon}>
      <View style={styles.profileIconHead} />
      <View style={styles.profileIconBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  hero: {
    alignItems: "stretch",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  heroText: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  heroTitle: {
    color: "#ffffff",
    flex: 1,
    flexShrink: 1,
    lineHeight: 30,
    marginBottom: 1,
    minWidth: 0
  },
  profilePill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 5
  },
  languageWrap: {
    position: "relative",
    zIndex: 5
  },
  languagePill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(253,254,251,0.6)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 48
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
    padding: 4,
    position: "absolute",
    right: 0,
    top: 46
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
  profileIcon: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22
  },
  profileIconHead: {
    backgroundColor: "#102018",
    borderRadius: 999,
    height: 8,
    marginBottom: 2,
    width: 8
  },
  profileIconBody: {
    backgroundColor: "#102018",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 9,
    width: 16
  },
  profileText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  settingsPill: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "rgba(253,254,251,0.62)",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42
  },
  settingsImage: {
    height: 40,
    width: 40
  },
  scoreText: {
    color: "#dbe8de",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  statTile: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 68,
    justifyContent: "center",
    padding: 8
  },
  statValue: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
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
  bugLampCard: {
    backgroundColor: "#1f1a2e",
    borderColor: "#8e6cff"
  },
  bugLampHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  bugLampIcon: {
    alignItems: "center",
    backgroundColor: "#f1d36b",
    borderColor: "#fff4b0",
    borderRadius: 999,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  bugLampIconText: {
    color: "#2c2207",
    fontSize: 20,
    fontWeight: "900"
  },
  bugLampText: {
    flex: 1
  },
  bugLampTitle: {
    color: "#ffffff"
  },
  bugLampMeta: {
    color: "#ddd6ff",
    fontSize: 12,
    fontWeight: "800"
  },
  bugLampButton: {
    backgroundColor: "#f1d36b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bugLampButtonText: {
    color: "#2c2207",
    fontSize: 12,
    fontWeight: "900"
  },
  bugLampEffect: {
    color: "#f8edb5",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10
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
    gap: 6
  },
  dexBugJar: {
    alignItems: "center",
    width: 42
  },
  dexBugJarLid: {
    backgroundColor: "#6d5441",
    borderColor: "#3e2e24",
    borderRadius: 5,
    borderWidth: 1,
    height: 7,
    marginBottom: -2,
    width: 28,
    zIndex: 2
  },
  dexBugSlot: {
    alignItems: "center",
    backgroundColor: "rgba(220,244,250,0.62)",
    borderColor: "rgba(16,32,24,0.16)",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderRadius: 10,
    borderWidth: 2,
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
    width: 46
  },
  dexBugJarShine: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderRadius: 999,
    height: 28,
    left: 7,
    position: "absolute",
    top: 7,
    transform: [{ rotate: "9deg" }],
    width: 5
  },
  dexBugJarBase: {
    backgroundColor: "rgba(41,67,56,0.18)",
    borderRadius: 999,
    bottom: 4,
    height: 4,
    left: 8,
    position: "absolute",
    right: 8
  },
  dexEmptySlot: {
    color: "#8ca099",
    fontSize: 18,
    fontWeight: "900"
  },
  workshopCard: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    overflow: "hidden",
    padding: 10
  },
  workshopImage: {
    borderRadius: 8,
    height: 86,
    width: 86
  },
  workshopText: {
    flex: 1,
    minWidth: 0
  },
  workshopTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  workshopBody: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3
  },
  workshopCta: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6
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
  missionClaimButton: {
    alignSelf: "flex-start",
    backgroundColor: "#15724f",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  missionClaimText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  missionBonusButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  missionBonusText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  missionReward: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6
  },
  missionError: {
    color: "#b9382f",
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
});
