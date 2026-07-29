import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { entryByBugId } from "../../services/bugDexService";
import { missingSpeciesRoute, type CollectionCompletion } from "../../services/collectionCompletionModel";
import { useI18n } from "../../services/i18n";
import { BugDexCategoryEmblem, CompletedCategoryMedal, ResearchLabel } from "./SpecimenArchiveVisuals";

const visibleProfiles = ["field", "research", "campaign", "event"] as const;

export function CollectionProgressHeader({ compact = false, completion }: { compact?: boolean; completion: CollectionCompletion }) {
  const { t } = useI18n();
  const nextMissing = completion.missing[0];
  const complete = completion.percent >= 100;
  return (
    <View style={[styles.archiveIndex, compact && styles.archiveIndexCompact, complete && styles.archiveIndexComplete]}>
      <View style={styles.binding} />
      <View style={[styles.emblemColumn, compact && styles.emblemColumnCompact]}>
        <BugDexCategoryEmblem completed={complete} progress={completion.percent} size={compact ? 46 : 62} />
        {complete && !compact ? <CompletedCategoryMedal size={30} /> : null}
      </View>
      <View style={styles.indexBody}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.kicker}>{t("collection.completion")}</Text>
            <Text style={styles.title}>{completion.percent}%</Text>
          </View>
          <ResearchLabel dark>{completion.owned}/{completion.total}</ResearchLabel>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${completion.percent}%` }]} /></View>
        {!compact ? <ScrollView contentContainerStyle={styles.routes} horizontal showsHorizontalScrollIndicator={false}>
          {visibleProfiles.map((profile) => {
            const item = completion.byAcquisition[profile];
            return (
              <View key={profile} style={styles.route}>
                <Text style={styles.routeName}>{t(`collection.source.${profile}`)}</Text>
                <Text style={styles.routeValue}>{item.owned}/{item.total}</Text>
              </View>
            );
          })}
        </ScrollView> : null}
        {nextMissing ? (
          <View style={styles.nextRow}>
            <View style={styles.nextCopy}>
              <Text style={styles.nextLabel}>{t("collection.nextMissing")}</Text>
              <Text numberOfLines={1} style={styles.nextName}>{entryByBugId(nextMissing.bugId)?.name ?? nextMissing.bugId}</Text>
            </View>
            <Text style={styles.nextRoute}>{t(missingSpeciesRoute(nextMissing))}</Text>
          </View>
        ) : <Text style={styles.complete}>{t("collection.complete")}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  archiveIndex: { alignItems: "center", alignSelf: "center", backgroundColor: "#fffaf0", borderColor: "#d6c8aa", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 4, minHeight: 126, overflow: "hidden", padding: 11, paddingLeft: 16, width: "100%" },
  archiveIndexCompact: { minHeight: 76, paddingBottom: 8, paddingTop: 8 },
  archiveIndexComplete: { borderColor: "#d7bd57", shadowColor: "#d7bd57", shadowOpacity: 0.2, shadowRadius: 10 },
  binding: { backgroundColor: "#4f46a5", bottom: 0, left: 0, position: "absolute", top: 0, width: 7 },
  emblemColumn: { alignItems: "center", gap: 1, justifyContent: "center", width: 70 },
  emblemColumnCompact: { width: 52 },
  indexBody: { flex: 1, minWidth: 0 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: "#755d31", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#242047", fontSize: 23, fontWeight: "900", marginTop: 1 },
  track: { backgroundColor: "rgba(79,70,165,0.14)", borderRadius: 99, height: 6, marginTop: 6, overflow: "hidden" },
  fill: { backgroundColor: "#d39b35", borderRadius: 99, height: "100%" },
  routes: { gap: 5, paddingTop: 7 },
  route: { backgroundColor: "rgba(23,52,38,0.07)", borderColor: "rgba(93,78,46,0.18)", borderRadius: 7, borderWidth: 1, minWidth: 70, paddingHorizontal: 7, paddingVertical: 4 },
  routeName: { color: "#6b6c60", fontSize: 7, fontWeight: "900", textTransform: "uppercase" },
  routeValue: { color: "#173426", fontSize: 10, fontWeight: "900", marginTop: 1 },
  nextRow: { alignItems: "center", borderTopColor: "rgba(23,52,38,0.11)", borderTopWidth: 1, flexDirection: "row", marginTop: 7, paddingTop: 6 },
  nextCopy: { flex: 1, paddingRight: 8 },
  nextLabel: { color: "#777163", fontSize: 7, fontWeight: "900", textTransform: "uppercase" },
  nextName: { color: "#242047", fontSize: 10, fontWeight: "900", marginTop: 1 },
  nextRoute: { color: "#8a642c", fontSize: 8, fontWeight: "900", maxWidth: "48%", textAlign: "right" },
  complete: { color: "#2d6749", fontSize: 9, fontWeight: "900", marginTop: 7, textAlign: "center" }
});
