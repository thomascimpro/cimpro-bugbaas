import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";

type MissionProgress = { done: number; total: number };

type Props = {
  daily: MissionProgress;
  onOpenDaily: () => void;
  onOpenWeekly: () => void;
  weekly: MissionProgress;
};

export function MissionSummaryCard({ daily, onOpenDaily, onOpenWeekly, weekly }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{t("world.today.missions")}</Text>
      <View style={styles.row}>
        <MissionButton label={t("home.dailyMissions")} progress={daily} onPress={onOpenDaily} />
        <MissionButton label={t("home.weeklyMissions")} progress={weekly} onPress={onOpenWeekly} />
      </View>
    </View>
  );
}

function MissionButton({ label, onPress, progress }: { label: string; onPress: () => void; progress: MissionProgress }) {
  const complete = progress.total > 0 && progress.done >= progress.total;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, complete && styles.buttonDone, pressed && styles.buttonPressed]}>
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, complete && styles.valueDone]}>{complete ? "✓" : `${progress.done}/${progress.total}`}</Text>
      </View>
      <Text style={[styles.chevron, complete && styles.chevronDone]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 9 },
  sectionLabel: { color: "rgba(247,255,248,0.78)", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  row: { flexDirection: "row", gap: 9, marginTop: 6 },
  button: {
    alignItems: "center",
    backgroundColor: "rgba(246,240,216,0.97)",
    borderColor: "rgba(231,194,72,0.28)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 13
  },
  buttonDone: { backgroundColor: "rgba(225,244,202,0.98)", borderColor: "rgba(135,178,71,0.50)" },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  label: { color: "#6d5a20", fontSize: 9, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  value: { color: "#2d260f", fontSize: 19, fontWeight: "900", marginTop: 1 },
  valueDone: { color: "#53742c" },
  chevron: { color: gameTheme.colors.accentInk, fontSize: 27, fontWeight: "900" },
  chevronDone: { color: "#53742c" }
});
