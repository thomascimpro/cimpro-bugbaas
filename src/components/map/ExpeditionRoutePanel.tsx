import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ExpeditionRegionProgress } from "../../services/expeditionWorldProgress";
import type { FieldJournalHabitat } from "../../services/fieldJournalService";
import { useI18n } from "../../services/i18n";

export function ExpeditionRoutePanel({ regions, trackedHabitat, onTrack }: { regions: ExpeditionRegionProgress[]; trackedHabitat?: FieldJournalHabitat; onTrack: (habitat: FieldJournalHabitat) => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.panel}>
      <View style={styles.header}><View><Text style={styles.kicker}>{t("world.map.routesKicker")}</Text><Text style={styles.title}>{t("world.map.routesTitle")}</Text></View><Text style={styles.total}>{regions.reduce((sum, region) => sum + region.tier, 0)}/30</Text></View>
      <View style={styles.rail}>
        {regions.map((region) => {
          const selected = trackedHabitat === region.habitat;
          return (
            <Pressable key={region.habitat} onPress={() => onTrack(region.habitat)} style={[styles.card, selected && styles.cardSelected]}>
              <View style={styles.topRow}><Text style={styles.name}>{t(`journal.habitat.${region.habitat}`)}</Text><Text style={styles.tier}>T{region.tier}</Text></View>
              <View style={styles.dots}>{Array.from({ length: 5 }).map((_, index) => <View key={index} style={[styles.dot, index < region.tier && styles.dotDone]} />)}</View>
              <Text numberOfLines={1} style={styles.meta}>{region.uniqueSpecies}/{region.coreSpeciesTarget} · {region.observationDays}d</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "rgba(7,30,22,0.96)", borderColor: "rgba(244,220,121,0.32)", borderRadius: 16, borderWidth: 1, marginBottom: 8, padding: 10 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: "#f4dc79", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#ffffff", fontSize: 13, fontWeight: "900", marginTop: 2 },
  total: { color: "#f4dc79", fontSize: 17, fontWeight: "900" },
  rail: { flexDirection: "row", flexWrap: "wrap", gap: 5, paddingTop: 8 },
  card: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, borderWidth: 1, flexBasis: "31%", flexGrow: 1, minHeight: 48, padding: 6 },
  cardSelected: { backgroundColor: "rgba(244,220,121,0.13)", borderColor: "#f4dc79" },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  name: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  tier: { color: "#f4dc79", fontSize: 9, fontWeight: "900" },
  dots: { flexDirection: "row", gap: 2, marginTop: 5 },
  dot: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, height: 4, flex: 1 },
  dotDone: { backgroundColor: "#f4dc79" },
  meta: { color: "#b9cdc1", fontSize: 6.5, fontWeight: "700", marginTop: 4 }
});
