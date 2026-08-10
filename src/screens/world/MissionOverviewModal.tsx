import React, { useEffect, useMemo, useRef, useState } from "react";
import { DimensionValue, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listBugs } from "../../services/bugService";
import { listBugDexInventory, type BugDexDropResult } from "../../services/bugDexService";
import { listBugSmashDuels } from "../../services/bugSmashDuelService";
import {
  claimedDailyMissionIds,
  claimDailyMissionBonusWithReward,
  claimDailyMissionReward,
  dailyMissionSet,
  dailyMissionSetComplete,
  isDailyMissionBonusClaimed
} from "../../services/dailyMissionService";
import { useI18n } from "../../services/i18n";
import { loadSoloCampaignBossProgress, type SoloCampaignBossProgress } from "../../services/missionProgressService";
import { getDailyRealBugScanProgress } from "../../services/realBugScanProgress";
import { autoClaimableMissionIds } from "../../services/rewardAutoClaimService";
import { loadSoloCampaignProgress } from "../../services/soloCampaignProgressService";
import {
  claimedWeeklyMissionIds,
  claimWeeklyMissionBonusWithReward,
  claimWeeklyMissionReward,
  isWeeklyMissionBonusClaimed,
  weeklyMissionLabel,
  weeklyMissionSet,
  weeklyMissionSetComplete
} from "../../services/weeklyMissionService";
import type { BugDexInventoryItem, BugReport, BugSmashDuel, User } from "../../types";
import { gameTheme } from "../../theme/gameTheme";

type MissionTab = "daily" | "weekly";

type Props = {
  user: User;
  visible: boolean;
  onClose: () => void;
  initialTab?: MissionTab;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

const emptyBossProgress: SoloCampaignBossProgress = { dayCount: 0, dayId: "", updatedAt: "", weekCount: 0, weekId: "" };

export function MissionOverviewModal({ user, visible, onClose, initialTab = "daily", onRewardDrop, onUserUpdated }: Props) {
  const { t, tr } = useI18n();
  const [tab, setTab] = useState<MissionTab>(initialTab);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [duels, setDuels] = useState<BugSmashDuel[]>([]);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [bossProgress, setBossProgress] = useState<SoloCampaignBossProgress>(emptyBossProgress);
  const [soloCampaignWave, setSoloCampaignWave] = useState(1);
  const [realBugScanProgress, setRealBugScanProgress] = useState(0);
  const [claimedDailyIds, setClaimedDailyIds] = useState<Set<string>>(new Set());
  const [claimedWeeklyIds, setClaimedWeeklyIds] = useState<Set<string>>(new Set());
  const [autoClaimMessage, setAutoClaimMessage] = useState("");
  const autoClaimSnapshotRef = useRef("");

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      setAutoClaimMessage("");
    } else {
      autoClaimSnapshotRef.current = "";
    }
  }, [initialTab, visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    Promise.all([
      listBugs().catch(() => []),
      listBugSmashDuels(user).catch(() => []),
      listBugDexInventory(user).catch(() => []),
      loadSoloCampaignBossProgress(user.uid).catch(() => emptyBossProgress),
      loadSoloCampaignProgress(user.uid).catch(() => ({ wave: 1 })),
      getDailyRealBugScanProgress(user).catch(() => 0)
    ]).then(([nextBugs, nextDuels, nextInventory, nextBossProgress, soloProgress, scanProgress]) => {
      if (!active) return;
      setBugs(nextBugs);
      setDuels(nextDuels);
      setInventory(nextInventory);
      setBossProgress(nextBossProgress);
      setSoloCampaignWave(soloProgress.wave);
      setRealBugScanProgress(scanProgress);
    });
    return () => { active = false; };
  }, [user, visible]);

  const dailyMissions = useMemo(
    () => dailyMissionSet(user, { bossProgress, duels, realBugScanProgress }),
    [bossProgress, duels, realBugScanProgress, user]
  );
  const weeklyMissions = useMemo(
    () => weeklyMissionSet(user, bugs, { bossProgress, duels, inventory, soloCampaignWave }),
    [bossProgress, bugs, duels, inventory, soloCampaignWave, user]
  );
  const missions = tab === "daily" ? dailyMissions : weeklyMissions;
  const claimedIds = tab === "daily" ? claimedDailyIds : claimedWeeklyIds;

  useEffect(() => {
    if (!visible || (!dailyMissions.length && !weeklyMissions.length)) return;
    const snapshotKey = JSON.stringify({
      daily: dailyMissions.map((mission) => [mission.id, mission.progress, mission.target]),
      userId: user.uid,
      weekly: weeklyMissions.map((mission) => [mission.id, mission.progress, mission.target])
    });
    if (autoClaimSnapshotRef.current === snapshotKey) return;
    autoClaimSnapshotRef.current = snapshotKey;
    let active = true;

    void (async () => {
      const [nextClaimedDaily, nextClaimedWeekly, dailyBonusClaimed, weeklyBonusClaimed] = await Promise.all([
        claimedDailyMissionIds(user, dailyMissions.map((mission) => mission.id)),
        claimedWeeklyMissionIds(user, weeklyMissions.map((mission) => mission.id)),
        isDailyMissionBonusClaimed(user),
        isWeeklyMissionBonusClaimed(user, weeklyMissions)
      ]);
      if (!active) return;
      let currentUser = user;
      let awardedCount = 0;
      const bugRewards: BugDexDropResult[] = [];

      for (const missionId of autoClaimableMissionIds(dailyMissions, nextClaimedDaily)) {
        const mission = dailyMissions.find((item) => item.id === missionId);
        if (!mission) continue;
        const result = await claimDailyMissionReward(currentUser, mission);
        if (!result) continue;
        currentUser = result.user;
        if (result.drop?.rewardType === "bug") bugRewards.push(result.drop);
        nextClaimedDaily.add(missionId);
        awardedCount += 1;
      }
      if (!dailyBonusClaimed && dailyMissionSetComplete(dailyMissions)) {
        const result = await claimDailyMissionBonusWithReward(currentUser, dailyMissions);
        if (result) {
          currentUser = result.user;
          if (result.drop.rewardType === "bug") bugRewards.push(result.drop);
          awardedCount += 1;
        }
      }

      for (const missionId of autoClaimableMissionIds(weeklyMissions, nextClaimedWeekly)) {
        const mission = weeklyMissions.find((item) => item.id === missionId);
        if (!mission) continue;
        const result = await claimWeeklyMissionReward(currentUser, mission);
        if (!result) continue;
        currentUser = result.user;
        if (result.drop?.rewardType === "bug") bugRewards.push(result.drop);
        nextClaimedWeekly.add(missionId);
        awardedCount += 1;
      }
      if (!weeklyBonusClaimed && weeklyMissionSetComplete(weeklyMissions)) {
        const result = await claimWeeklyMissionBonusWithReward(currentUser, weeklyMissions);
        if (result) {
          currentUser = result.user;
          if (result.drop.rewardType === "bug") bugRewards.push(result.drop);
          awardedCount += 1;
        }
      }

      if (!active) return;
      setClaimedDailyIds(new Set(nextClaimedDaily));
      setClaimedWeeklyIds(new Set(nextClaimedWeekly));
      if (awardedCount > 0) {
        setAutoClaimMessage(t("mission.autoAwarded", { count: awardedCount }));
        onUserUpdated?.(currentUser);
      }
      if (bugRewards.length > 0) {
        onClose();
        setTimeout(() => bugRewards.forEach((drop) => onRewardDrop?.(drop)), 0);
      }
    })().catch(() => {
      if (active) setAutoClaimMessage(t("mission.autoAwardUnavailable"));
    });

    return () => { active = false; };
  }, [dailyMissions, onClose, onRewardDrop, onUserUpdated, t, user, visible, weeklyMissions]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>{t("world.today.missions")}</Text>
              <Text style={styles.title}>{tab === "daily" ? t("home.dailyMissions") : t("home.weeklyMissions")}</Text>
              <Text style={styles.meta}>{tab === "daily" ? t("home.dailyMissionsMeta") : weeklyMissionLabel()}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(["daily", "weekly"] as const).map((item) => (
              <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === "daily" ? t("home.dailyMissions") : t("home.weeklyMissions")}</Text>
              </Pressable>
            ))}
          </View>

          {autoClaimMessage ? <Text style={styles.autoClaimMessage}>{autoClaimMessage}</Text> : null}
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {missions.map((mission) => {
              const done = mission.progress >= mission.target;
              const width: DimensionValue = `${Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100))}%`;
              return (
                <View key={mission.id} style={[styles.missionCard, done && styles.missionCardDone]}>
                  <View style={styles.missionHeader}>
                    <Text style={styles.missionName}>{tr(mission.title)}</Text>
                    <Text style={[styles.missionCount, done && styles.missionCountDone]}>{formatMissionValue(mission.progress)}/{formatMissionValue(mission.target)}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width }]} /></View>
                  <Text style={styles.reward}>{claimedIds.has(mission.id) ? t("mission.rewardReceived") : done ? t("mission.rewardProcessing") : tr(mission.reward)}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatMissionValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(3,14,10,0.72)", flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#edf3e9", borderColor: gameTheme.colors.borderStrong, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, maxHeight: "88%", paddingBottom: 18, paddingHorizontal: 16, paddingTop: 16 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: "#6d7f3d", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#17372c", fontSize: 23, fontWeight: "900", marginTop: 2 },
  meta: { color: "#66766d", fontSize: 10, fontWeight: "800", marginTop: 3 },
  closeButton: { alignItems: "center", backgroundColor: "#dce6d8", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  closeText: { color: "#17372c", fontSize: 24, fontWeight: "900", lineHeight: 26 },
  tabs: { backgroundColor: "#dce6d8", borderRadius: 16, flexDirection: "row", marginTop: 14, padding: 4 },
  tab: { alignItems: "center", borderRadius: 13, flex: 1, minHeight: 40, justifyContent: "center" },
  tabActive: { backgroundColor: gameTheme.colors.accentStrong },
  tabText: { color: "#66766d", fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: gameTheme.colors.accentInk },
  list: { gap: 9, paddingBottom: 12, paddingTop: 12 },
  missionCard: { backgroundColor: "#ffffff", borderColor: "rgba(23,55,44,0.10)", borderRadius: 16, borderWidth: 1, padding: 13 },
  missionCardDone: { backgroundColor: "#eef8dc", borderColor: "rgba(108,143,54,0.35)" },
  missionHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  missionName: { color: "#17372c", flex: 1, fontSize: 12, fontWeight: "900" },
  missionCount: { color: "#6f7d74", fontSize: 11, fontWeight: "900" },
  missionCountDone: { color: "#53742c" },
  track: { backgroundColor: "#dfe7dd", borderRadius: 999, height: 8, marginTop: 10, overflow: "hidden" },
  fill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, height: "100%" },
  reward: { color: "#6f7d74", fontSize: 9, fontWeight: "800", marginTop: 7 },
  autoClaimMessage: { backgroundColor: "#eef8dc", borderRadius: 10, color: "#53742c", fontSize: 9, fontWeight: "900", marginTop: 10, padding: 9, textAlign: "center" }
});
