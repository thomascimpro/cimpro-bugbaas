import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";

export type ActiveEventSummaryItem = {
  id: "swarm" | "team-hunt";
  meta?: string;
  onPress: () => void;
  progress?: number;
  title: string;
};

export function ActiveEventsSummary({ events }: { events: ActiveEventSummaryItem[] }) {
  const { t } = useI18n();
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{t("world.today.activeEvents")}</Text>
        {events.length > 0 ? <Text style={styles.live}>{t("world.events.active")}</Text> : null}
      </View>
      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>○</Text>
          <Text style={styles.emptyText}>{t("world.events.empty")}</Text>
        </View>
      ) : (
        <View style={styles.row}>
          {events.slice(0, 2).map((event) => (
            <Pressable key={event.id} onPress={event.onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.cardTop}>
                <Text numberOfLines={1} style={styles.title}>{event.title}</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
              {event.meta ? <Text numberOfLines={1} style={styles.meta}>{event.meta}</Text> : null}
              {typeof event.progress === "number" ? (
                <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(100, event.progress))}%` }]} /></View>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 9 },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  heading: { color: "rgba(247,255,248,0.78)", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  live: { color: gameTheme.colors.accentStrong, fontSize: 8, fontWeight: "900" },
  row: { flexDirection: "row", gap: 9, marginTop: 6 },
  card: { backgroundColor: "rgba(8,35,26,0.94)", borderColor: "rgba(231,194,72,0.34)", borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 82, paddingHorizontal: 11, paddingVertical: 9 },
  cardPressed: { opacity: 0.83, transform: [{ scale: 0.985 }] },
  cardTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  arrow: { color: gameTheme.colors.accentStrong, fontSize: 20, fontWeight: "900", lineHeight: 20 },
  title: { color: "#f7fff8", flex: 1, fontSize: 13, fontWeight: "900", paddingRight: 6 },
  meta: { color: "#9fb3a8", fontSize: 8.5, fontWeight: "800", marginTop: 3 },
  track: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, height: 5, marginTop: 9, overflow: "hidden" },
  fill: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 999, height: "100%" },
  empty: { alignItems: "center", backgroundColor: "rgba(8,35,26,0.72)", borderColor: "rgba(255,255,255,0.10)", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 6, minHeight: 44, paddingHorizontal: 12 },
  emptyIcon: { color: "#799186", fontSize: 16 },
  emptyText: { color: "#9fb3a8", fontSize: 9, fontWeight: "800" }
});
