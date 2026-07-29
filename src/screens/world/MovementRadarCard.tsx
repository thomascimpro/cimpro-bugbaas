import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WalkingBug } from "../../components/WalkingBug";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";
import { movementGoalModel } from "./WorldTodayModel";

type Props = {
  awardedToday: number;
  claimableRewards: number;
  claiming?: boolean;
  goalKm: number;
  maxRewards: number;
  onClaim: () => void;
  onPress: () => void;
  todayKm: number;
  weekKm: number;
};

export function MovementRadarCard({ awardedToday, claimableRewards, claiming = false, goalKm, maxRewards, onClaim, onPress, todayKm, weekKm }: Props) {
  const { t } = useI18n();
  const model = movementGoalModel(todayKm, goalKm);
  const weekLabel = movementGoalModel(weekKm, Math.max(goalKm, weekKm + 1)).currentLabel;
  const remainingLabel = model.remainingLabel === "Doel behaald"
    ? t("world.today.walkGoalReached")
    : model.remainingLabel;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{t("world.today.walkGoal")}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{model.currentLabel}</Text>
            <Text style={styles.goal}>/ {model.goalLabel}</Text>
          </View>
        </View>
        <View style={styles.weekBadge}>
          <Text style={styles.weekValue}>{weekLabel}</Text>
          <Text style={styles.weekLabel}>{t("world.today.thisWeek")}</Text>
        </View>
      </View>

      <View style={styles.routeArea}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(model.progress * 100)}%` }]} />
        </View>
        <View pointerEvents="none" style={styles.bugRail}>
          <View style={{ flex: model.progress }} />
          <WalkingBug size={30} variant="beetle" />
          <View style={{ flex: Math.max(0.001, 1 - model.progress) }} />
        </View>
      </View>

      <View style={styles.rewardRow}>
        <View style={styles.rewardCopy}>
          <Text style={styles.rewardLabel}>{t("home.bugsReward", { awarded: awardedToday, max: maxRewards })}</Text>
          <Text style={styles.rewardMeta}>{claimableRewards > 0 ? `${claimableRewards} reward${claimableRewards === 1 ? "" : "s"} klaar` : remainingLabel}</Text>
        </View>
        {claimableRewards > 0 ? (
          <Pressable accessibilityRole="button" disabled={claiming} onPress={onClaim} style={({ pressed }) => [styles.claimButton, pressed && styles.syncButtonPressed, claiming && styles.buttonDisabled]}>
            <Text style={styles.claimButtonText}>{claiming ? "..." : t("home.claim")}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.remaining, model.progress >= 1 && styles.remainingDone]}>{remainingLabel}</Text>
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.syncButton, pressed && styles.syncButtonPressed]}>
          <Text style={styles.syncButtonText}>{t("world.today.syncMovement")}</Text>
          <Text style={styles.syncArrow}>↻</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(8,35,26,0.96)",
    borderColor: "rgba(231,194,72,0.55)",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 9,
    minHeight: 186,
    padding: 14
  },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: gameTheme.colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  valueRow: { alignItems: "baseline", flexDirection: "row", marginTop: 4 },
  value: { color: "#f7fff8", fontSize: 29, fontWeight: "900" },
  goal: { color: "#a9bdb2", fontSize: 14, fontWeight: "900", marginLeft: 5 },
  weekBadge: { alignItems: "flex-end", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  weekValue: { color: "#f5f3dc", fontSize: 13, fontWeight: "900" },
  weekLabel: { color: "#91aa9d", fontSize: 8, fontWeight: "900", marginTop: 1 },
  routeArea: { height: 45, justifyContent: "center", marginTop: 5 },
  track: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, height: 10, overflow: "hidden" },
  fill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, height: "100%" },
  bugRail: { alignItems: "center", flexDirection: "row", height: 34, left: -8, position: "absolute", right: -8, top: 0 },
  rewardRow: { alignItems: "center", backgroundColor: "rgba(231,194,72,0.10)", borderColor: "rgba(231,194,72,0.24)", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 3, paddingHorizontal: 10, paddingVertical: 8 },
  rewardCopy: { flex: 1 },
  rewardLabel: { color: gameTheme.colors.accentStrong, fontSize: 9, fontWeight: "900" },
  rewardMeta: { color: "#b8c9c0", fontSize: 8, fontWeight: "800", marginTop: 2 },
  claimButton: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 10, justifyContent: "center", minHeight: 34, minWidth: 74, paddingHorizontal: 12 },
  claimButtonText: { color: gameTheme.colors.accentInk, fontSize: 9, fontWeight: "900" },
  buttonDisabled: { opacity: 0.55 },
  footer: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 8 },
  remaining: { color: "#b8c9c0", flex: 1, fontSize: 10, fontWeight: "900" },
  remainingDone: { color: gameTheme.colors.accentStrong },
  syncButton: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 12, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 38, paddingHorizontal: 13 },
  syncButtonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  syncButtonText: { color: gameTheme.colors.accentInk, fontSize: 9, fontWeight: "900" },
  syncArrow: { color: gameTheme.colors.accentInk, fontSize: 15, fontWeight: "900" }
});
