import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../../components/BugArtImage";
import { entryByBugId } from "../../services/bugDexService";
import { bugDexEntryName, useI18n } from "../../services/i18n";

type Props = {
  bugIds: readonly [string, string, string];
  onStartScan: () => void;
};

export function WeeklyFieldSpotlightCard({ bugIds, onStartScan }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{t("weeklySpotlight.kicker")}</Text>
          <Text style={styles.title}>{t("weeklySpotlight.title")}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>{t("weeklySpotlight.reward")}</Text>
        </View>
      </View>
      <Text style={styles.body}>{t("weeklySpotlight.body")}</Text>
      <View style={styles.speciesRow}>
        {bugIds.map((bugId) => {
          const entry = entryByBugId(bugId);
          return (
            <View key={bugId} style={styles.speciesTile}>
              <View style={styles.bugStage}>
                <BugArtImage bugId={bugId as never} size={48} />
              </View>
              <Text numberOfLines={2} style={styles.speciesName}>{entry ? bugDexEntryName(entry, t) : bugId}</Text>
            </View>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={onStartScan} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionText}>{t("weeklySpotlight.action")}</Text>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>
      <Text style={styles.reset}>{t("weeklySpotlight.reset")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(20,43,34,0.94)",
    borderColor: "rgba(215,189,87,0.72)",
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 8,
    padding: 12,
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { color: "#d7bd57", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#fff8df", fontSize: 16, fontWeight: "900", marginTop: 2 },
  rewardBadge: { backgroundColor: "rgba(181,108,255,0.2)", borderColor: "#b56cff", borderRadius: 99, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  rewardText: { color: "#ead7ff", fontSize: 9, fontWeight: "900" },
  body: { color: "#c8d9cf", fontSize: 10, lineHeight: 14, marginTop: 5 },
  speciesRow: { flexDirection: "row", gap: 7, marginTop: 10 },
  speciesTile: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, borderWidth: 1, flex: 1, minWidth: 0, paddingHorizontal: 4, paddingVertical: 7 },
  bugStage: { alignItems: "center", height: 52, justifyContent: "center" },
  speciesName: { color: "#f4f1dd", fontSize: 9, fontWeight: "900", lineHeight: 11, minHeight: 22, textAlign: "center" },
  action: { alignItems: "center", backgroundColor: "#d7bd57", borderRadius: 11, flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 12, paddingVertical: 9 },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  actionText: { color: "#202331", fontSize: 11, fontWeight: "900" },
  actionArrow: { color: "#202331", fontSize: 15, fontWeight: "900" },
  reset: { color: "#88a395", fontSize: 8, fontWeight: "800", marginTop: 5, textAlign: "center" }
});
