import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../../components/BugArtImage";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";

export type BuddySummaryStatus = "empty" | "ready" | "reward" | "running";

type Props = {
  bugId?: string;
  meta: string;
  onPress: () => void;
  progress?: number;
  status: BuddySummaryStatus;
  title: string;
};

export function BuddySummaryCard({ bugId, meta, onPress, progress, status, title }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t("world.buddy")}</Text>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, status === "reward" && styles.cardReward, pressed && styles.cardPressed]}>
        <View style={[styles.icon, status === "reward" && styles.iconReward]}>
          {bugId ? <BugArtImage bugId={bugId} size={40} /> : <Text style={styles.iconText}>✦</Text>}
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            <Text style={[styles.status, status === "reward" && styles.statusReward]}>{t(`world.today.buddyStatus.${status}`)}</Text>
          </View>
          <Text numberOfLines={1} style={styles.meta}>{meta}</Text>
          {typeof progress === "number" ? (
            <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} /></View>
          ) : null}
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 9 },
  sectionLabel: { color: "rgba(247,255,248,0.78)", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  card: { alignItems: "center", backgroundColor: "rgba(233,241,255,0.97)", borderColor: "rgba(72,105,149,0.24)", borderRadius: 16, borderWidth: 1, flexDirection: "row", marginTop: 6, minHeight: 62, paddingHorizontal: 11 },
  cardReward: { backgroundColor: "rgba(255,245,199,0.98)", borderColor: "rgba(205,155,27,0.55)" },
  cardPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  icon: { alignItems: "center", backgroundColor: "#d7e4ff", borderRadius: 12, height: 42, justifyContent: "center", overflow: "hidden", width: 42 },
  iconReward: { backgroundColor: "#f6d665" },
  iconText: { color: "#305787", fontSize: 20, fontWeight: "900" },
  copy: { flex: 1, marginLeft: 10 },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  title: { color: "#153657", flex: 1, fontSize: 13, fontWeight: "900" },
  status: { color: "#315c89", fontSize: 7.5, fontWeight: "900", textTransform: "uppercase" },
  statusReward: { color: "#886200" },
  meta: { color: "#5b7188", fontSize: 8.5, fontWeight: "800", marginTop: 3 },
  track: { backgroundColor: "rgba(48,87,135,0.15)", borderRadius: 999, height: 4, marginTop: 6, overflow: "hidden" },
  fill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, height: "100%" },
  arrow: { color: "#305787", fontSize: 26, fontWeight: "700", marginLeft: 8 }
});
