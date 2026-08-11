import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugBaasStateArt } from "../components/BugBaasStateArt";
import { JournalStamp, LockedBugSilhouette, ResearchLabel } from "../components/collection/SpecimenArchiveVisuals";
import { NavigationArt } from "../components/NavigationArt";
import { getFieldPhotoStamps } from "../services/fieldPhotoStampService";
import { fieldJournalHabitats, listFieldJournalEntries, type FieldJournalEntry } from "../services/fieldJournalService";
import { useI18n } from "../services/i18n";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { User } from "../types";

export function FieldJournalScreen({ user, onBack, embedded = false }: { user: User; onBack: () => void; embedded?: boolean }) {
  const { language, t, tr } = useI18n();
  const layout = useResponsiveLayout();
  const dense = !layout.isTablet;
  const [entries, setEntries] = useState<FieldJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setEntries(await listFieldJournalEntries(user));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadJournal();
  }, [loadJournal]);

  const completedHabitats = useMemo(() => new Set(entries.map((entry) => entry.habitat)), [entries]);
  const bingoCount = fieldJournalHabitats.filter((habitat) => completedHabitats.has(habitat)).length;
  const privateMapMarkerCount = entries.filter((entry) => entry.locationCell).length;
  const dateLocale = language === "nl" ? "nl-NL" : language === "fr" ? "fr-FR" : "en-GB";

  const header = (
    <View>
      <View style={[styles.header, dense && styles.headerDense]}>
        {!embedded ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>{t("journal.back")}</Text>
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{t("journal.kicker")}</Text>
          <Text style={styles.title}>{t("journal.title")}</Text>
          <Text style={styles.intro}>{t("journal.intro")}</Text>
        </View>
        <JournalStamp text={t("journal.researchStamp")} />
      </View>

      <ImageBackground source={require("../../assets/generated/expedition-world-v2.jpg")} imageStyle={styles.bingoArtwork} style={styles.bingoCard}>
        <View style={[styles.bingoShade, dense && styles.bingoShadeDense]}>
          <View style={styles.bingoHeader}>
            <View>
              <Text style={styles.bingoKicker}>{t("journal.bingoKicker")}</Text>
              <Text style={styles.bingoTitle}>{t("journal.bingoTitle")}</Text>
            </View>
            <View style={styles.bingoSeal}>
              <Text style={styles.bingoCount}>{bingoCount}</Text>
              <Text style={styles.bingoTotal}>/{fieldJournalHabitats.length}</Text>
            </View>
          </View>
          {!dense ? <Text style={styles.bingoBody}>{t("journal.bingoBody")}</Text> : null}
          <View style={[styles.bingoGrid, dense && styles.bingoGridDense]}>
            {fieldJournalHabitats.map((habitat) => {
              const complete = completedHabitats.has(habitat);
              return (
                <View key={habitat} style={[styles.bingoTile, dense && styles.bingoTileDense, complete && styles.bingoTileDone]}>
                  <View style={[styles.habitatMark, complete && styles.habitatMarkDone]}>
                    <View style={[styles.habitatMarkInner, complete && styles.habitatMarkInnerDone]} />
                  </View>
                  <Text style={[styles.bingoLabel, complete && styles.bingoLabelDone]}>{t(`journal.habitat.${habitat}`)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.privateMapCard, dense && styles.privateMapCardDense]}>
        <View style={styles.privateMapGlyph}>
          <NavigationArt name="world" size={36} />
        </View>
        <View style={styles.privateMapCopy}>
          <Text style={styles.privateMapTitle}>{t("journal.mapTitle")}</Text>
          <Text numberOfLines={dense ? 1 : undefined} style={styles.privateMapBody}>{privateMapMarkerCount === 0 ? t("journal.mapEmpty") : t("journal.mapCount", { count: privateMapMarkerCount })}</Text>
        </View>
        <ResearchLabel>{privateMapMarkerCount}</ResearchLabel>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <BugBaasStateArt kind="loading" size={92} />
          <ActivityIndicator color="#d7bd57" size="small" />
          <Text style={styles.stateTitle}>{t("journal.loading")}</Text>
          <Text style={styles.stateText}>{t("journal.loadingBody")}</Text>
        </View>
      ) : loadError ? (
        <View style={[styles.stateCard, styles.errorCard]}>
          <BugBaasStateArt kind="search-error" size={92} />
          <Text style={styles.stateTitle}>{t("journal.errorTitle")}</Text>
          <Text style={styles.stateText}>{t("journal.errorBody")}</Text>
          <Pressable onPress={() => void loadJournal()} style={styles.retryButton}>
            <Text style={styles.retryText}>{t("journal.retry")}</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={[styles.empty, dense && styles.emptyDense]}>
          <BugBaasStateArt kind="empty" size={dense ? 76 : 148} />
          <View style={styles.emptyCopy}>
            <Text style={[styles.emptyTitle, dense && styles.emptyTitleDense]}>{t("journal.emptyTitle")}</Text>
            <Text style={[styles.emptyText, dense && styles.emptyTextDense]}>{t("journal.emptyBody")}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.logHeader}>
          <Text style={styles.logKicker}>{t("journal.logKicker")}</Text>
          <Text style={styles.logCount}>{entries.length}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
    <FlatList
      contentContainerStyle={[
        styles.content,
        embedded && styles.contentEmbedded,
        embedded && dense && styles.contentEmbeddedDense,
        {
          maxWidth: layout.contentMaxWidth,
          paddingBottom: layout.bottomNavHeight + layout.bottomNavInset + 48,
          paddingHorizontal: layout.gutter
        }
      ]}
      data={loading || loadError ? [] : entries}
      initialNumToRender={8}
      keyExtractor={(entry) => entry.id}
      ListHeaderComponent={header}
      maxToRenderPerBatch={8}
      overScrollMode="never"
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      style={styles.list}
      windowSize={5}
      renderItem={({ item: entry, index }) => {
        const stamps = getFieldPhotoStamps(entry, entries);
        return (
          <View style={styles.card}>
            <View style={styles.timelineColumn}>
              <View style={styles.timelineDot} />
              {index < entries.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.specimenFrame}>
              {entry.bugId ? <BugArtImage bugId={entry.bugId as never} size={66} /> : <LockedBugSilhouette size={62} />}
            </View>
            <View style={styles.copy}>
              <View style={styles.entryTopRow}>
                <View style={styles.entryTitleCopy}>
                  <Text style={styles.name}>{entry.speciesName}</Text>
                  {entry.scientificName ? <Text style={styles.scientific}>{entry.scientificName}</Text> : null}
                </View>
                <JournalStamp text={new Date(entry.observedAt).toLocaleDateString(dateLocale)} />
              </View>
              <View style={styles.researchLabels}>
                <ResearchLabel>{t(`journal.habitat.${entry.habitat}`)}</ResearchLabel>
                <ResearchLabel>{tr(entry.behavior)}</ResearchLabel>
                {(entry.tags ?? []).map((tag) => <ResearchLabel key={tag}>{tag}</ResearchLabel>)}
              </View>
              {stamps.length > 0 ? (
                <View style={styles.entryStamps}>
                  {stamps.slice(0, 3).map((stamp) => <JournalStamp key={stamp.id} text={tr(stamp.title)} />)}
                </View>
              ) : null}
            </View>
          </View>
        );
      }}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#f5f0e5", flex: 1 },
  list: { backgroundColor: "#f5f0e5", flex: 1 },
  content: { alignSelf: "center", flexGrow: 1, maxWidth: 840, padding: 18, paddingBottom: 150, width: "100%" },
  contentEmbedded: { paddingBottom: 24 },
  contentEmbeddedDense: { paddingBottom: 92, paddingTop: 8 },
  header: { alignItems: "center", backgroundColor: "#fff8e7", borderColor: "#d8c49b", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 12, minHeight: 104, overflow: "hidden", padding: 14 },
  headerDense: { marginBottom: 8, minHeight: 82, padding: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  back: { alignItems: "center", backgroundColor: "#292450", borderColor: "#d39b35", borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", paddingHorizontal: 10 },
  backText: { color: "#fff6d2", fontSize: 11, fontWeight: "900" },
  kicker: { color: "#8a642c", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#292450", fontSize: 23, fontWeight: "900", marginTop: 2 },
  intro: { color: "#5b6c61", fontSize: 11, lineHeight: 16, marginTop: 5 },
  bingoCard: { borderColor: "#d7bd57", borderRadius: 20, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  bingoArtwork: { opacity: 0.62 },
  bingoShade: { backgroundColor: "rgba(24, 21, 53, 0.88)", padding: 15 },
  bingoShadeDense: { padding: 10 },
  bingoHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bingoKicker: { color: "#d7bd57", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  bingoTitle: { color: "#fff8df", fontSize: 19, fontWeight: "900", marginTop: 2 },
  bingoSeal: { alignItems: "baseline", backgroundColor: "rgba(239,228,201,0.12)", borderColor: "rgba(215,189,87,0.55)", borderRadius: 99, borderWidth: 1, flexDirection: "row", paddingHorizontal: 10, paddingVertical: 6 },
  bingoCount: { color: "#d7bd57", fontSize: 21, fontWeight: "900" },
  bingoTotal: { color: "#dce8df", fontSize: 11, fontWeight: "900" },
  bingoBody: { color: "#e1ddec", fontSize: 11, lineHeight: 17, marginTop: 9 },
  bingoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  bingoGridDense: { gap: 6, marginTop: 8 },
  bingoTile: { alignItems: "center", backgroundColor: "rgba(65,56,112,0.9)", borderColor: "#756ca4", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 7, minWidth: "30%", paddingHorizontal: 8, paddingVertical: 8 },
  bingoTileDense: { paddingHorizontal: 7, paddingVertical: 6 },
  bingoTileDone: { backgroundColor: "#efe8cf", borderColor: "#d7bd57" },
  habitatMark: { alignItems: "center", borderColor: "#87a497", borderRadius: 99, borderWidth: 1, height: 15, justifyContent: "center", width: 15 },
  habitatMarkDone: { borderColor: "#8d7333" },
  habitatMarkInner: { backgroundColor: "transparent", borderRadius: 99, height: 5, width: 5 },
  habitatMarkInnerDone: { backgroundColor: "#2e6b4c" },
  bingoLabel: { color: "#e4f0e5", fontSize: 10, fontWeight: "900" },
  bingoLabelDone: { color: "#292450" },
  privateMapCard: { alignItems: "center", backgroundColor: "#f3ead5", borderColor: "#c9bd9f", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 14, padding: 13 },
  privateMapCardDense: { gap: 8, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 8 },
  privateMapGlyph: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  privateMapCopy: { flex: 1 },
  privateMapTitle: { color: "#292450", fontSize: 14, fontWeight: "900" },
  privateMapBody: { color: "#526b5d", fontSize: 10, lineHeight: 15, marginTop: 3 },
  stateCard: { alignItems: "center", backgroundColor: "#f2e8d2", borderColor: "#c9bd9f", borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 22 },
  errorCard: { backgroundColor: "#f4e3dc", borderColor: "#b97e69" },
  stateTitle: { color: "#292450", fontSize: 17, fontWeight: "900", marginTop: 9 },
  stateText: { color: "#5b6c61", fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: "center" },
  retryButton: { backgroundColor: "#4f46a5", borderRadius: 12, marginTop: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: "#fff6d2", fontSize: 10, fontWeight: "900" },
  empty: { alignItems: "center", backgroundColor: "#f2e8d2", borderColor: "#c9bd9f", borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 20 },
  emptyDense: { flexDirection: "row", gap: 10, padding: 10 },
  emptyCopy: { flex: 1, minWidth: 0 },
  emptyCase: { alignItems: "center", borderColor: "rgba(55,91,72,0.38)", borderRadius: 14, borderWidth: 1, height: 138, justifyContent: "flex-end", paddingTop: 8, width: 148 },
  emptyPlinthTop: { backgroundColor: "#d7bd57", height: 8, width: 104 },
  emptyPlinthBase: { backgroundColor: "#9b8e75", height: 25, width: 82 },
  emptyTitle: { color: "#292450", fontSize: 18, fontWeight: "900", marginTop: 12 },
  emptyTitleDense: { fontSize: 15, marginTop: 0 },
  emptyText: { color: "#587064", lineHeight: 19, marginTop: 5, textAlign: "center" },
  emptyTextDense: { fontSize: 10, lineHeight: 14, textAlign: "left" },
  logHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginTop: 3 },
  logKicker: { color: "#6f5d3b", fontSize: 9, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  logCount: { backgroundColor: "#4f46a5", borderRadius: 99, color: "#fff6d2", fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  card: { alignItems: "stretch", backgroundColor: "#f4ead5", borderColor: "#d0c2a4", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 10, minHeight: 110, overflow: "hidden", padding: 10 },
  timelineColumn: { alignItems: "center", width: 17 },
  timelineDot: { backgroundColor: "#d7bd57", borderColor: "#f4ead5", borderRadius: 6, borderWidth: 2, height: 12, marginTop: 8, width: 12 },
  timelineLine: { backgroundColor: "#c2b59a", flex: 1, marginTop: 3, width: 2 },
  specimenFrame: { alignItems: "center", backgroundColor: "#e6dcc6", borderColor: "#c3b696", borderRadius: 11, borderWidth: 1, height: 88, justifyContent: "center", marginRight: 10, width: 88 },
  copy: { flex: 1, minWidth: 0 },
  entryTopRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  entryTitleCopy: { flex: 1, minWidth: 0 },
  name: { color: "#292450", fontSize: 15, fontWeight: "900" },
  scientific: { color: "#6a6c61", fontSize: 11, fontStyle: "italic", marginTop: 2 },
  researchLabels: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 10 },
  entryStamps: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }
});
