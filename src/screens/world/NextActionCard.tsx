import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PlayerNextAction } from "../../services/nextActionModel";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";

type Props = {
  action: PlayerNextAction;
  onPress: () => void;
};

export function NextActionCard({ action, onPress }: Props) {
  const { t } = useI18n();
  const progress = Math.min(100, Math.round((action.progressCurrent / Math.max(1, action.progressTarget)) * 100));
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{t("world.nextAction")}</Text>
          <Text style={styles.title}>{t(action.titleKey)}</Text>
          <Text style={styles.reason}>{t(action.reasonKey)}</Text>
        </View>
        <View style={styles.icon}><Text style={styles.iconText}>→</Text></View>
      </View>
      <View style={styles.rewardRow}>
        <Text style={styles.rewardLabel}>{t("world.nextReward")}</Text>
        <Text style={styles.reward}>{t(action.rewardKey)}</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
      <Text style={styles.progress}>{action.progressCurrent}/{action.progressTarget}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(246,240,216,0.98)", borderColor: "rgba(231,194,72,0.62)", borderRadius: 19, borderWidth: 1, minHeight: 132, padding: 14 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  topRow: { alignItems: "center", flexDirection: "row" },
  copy: { flex: 1, paddingRight: 12 },
  kicker: { color: "#857128", fontSize: 8, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  title: { color: "#29230d", fontSize: 18, fontWeight: "900", marginTop: 3 },
  reason: { color: "#665c37", fontSize: 9.5, fontWeight: "700", lineHeight: 14, marginTop: 4 },
  icon: { alignItems: "center", backgroundColor: gameTheme.colors.accentStrong, borderRadius: 18, height: 44, justifyContent: "center", width: 44 },
  iconText: { color: gameTheme.colors.accentInk, fontSize: 24, fontWeight: "900" },
  rewardRow: { alignItems: "center", flexDirection: "row", marginTop: 10 },
  rewardLabel: { color: "#857128", fontSize: 8, fontWeight: "900", marginRight: 6, textTransform: "uppercase" },
  reward: { color: "#3b3214", flex: 1, fontSize: 9, fontWeight: "900" },
  track: { backgroundColor: "rgba(61,52,20,0.14)", borderRadius: 999, height: 5, marginTop: 9, overflow: "hidden" },
  fill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, height: "100%" },
  progress: { color: "#786b3a", fontSize: 8, fontWeight: "900", marginTop: 4, textAlign: "right" }
});
