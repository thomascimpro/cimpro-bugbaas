import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { refreshTeamHunt, type TeamHuntCategoryId, type TeamHuntStatus } from "../services/teamHuntService";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { User } from "../types";

const huntArt = require("../../assets/generated/biome-atlas-v1.jpg");
const categoryLabels: Record<TeamHuntCategoryId, string> = {
  beetles: "Kevers",
  wings: "Vleugels",
  crawlers: "Kruipers",
  jumpers: "Springers",
  stingers: "Stekers",
  water: "Water"
};

export function TeamHuntScreen({ user, onBack }: { user: User; onBack: () => void }) {
  const layout = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<TeamHuntStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reveal = useRef(new Animated.Value(0)).current;

  const load = () => {
    setLoading(true);
    setError("");
    refreshTeamHunt(user)
      .then(setStatus)
      .catch((value) => setError(value instanceof Error ? value.message : "Team Hunt is tijdelijk niet beschikbaar."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user.uid]);
  useEffect(() => {
    reveal.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) return;
    Animated.timing(reveal, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: nativeDriver
    }).start();
  }, [reducedMotion, reveal, status?.active]);

  const active = Boolean(status?.active);
  const contentBottom = layout.navigationMode === "bottom" ? layout.bottomNavHeight + 18 : 18;

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { maxWidth: layout.shellMaxWidth, padding: layout.gutter, paddingBottom: contentBottom }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back home" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>TEAM EXPEDITION</Text>
            <Text numberOfLines={1} style={[styles.title, layout.isCompact && styles.titleCompact]}>Team Hunt Weekend</Text>
          </View>
          <View style={[styles.statusPill, active && styles.statusPillLive]}>
            <Text style={[styles.statusText, active && styles.statusTextLive]}>{active ? "LIVE" : "FRI–MON"}</Text>
          </View>
        </View>

        <View style={[styles.main, layout.isTablet && styles.mainTablet]}>
          <Animated.View
            style={[
              styles.hero,
              layout.isTablet ? styles.heroTablet : styles.heroPhone,
              { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }
            ]}
          >
            <Image resizeMode="cover" source={huntArt} style={styles.heroImage} />
            <View style={styles.heroShade} />
            <View pointerEvents="none" style={styles.signal}>
              <View style={styles.signalCore} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>{active ? "UNIQUE FINDS SCORE" : "NEXT WEEKEND"}</Text>
              <Text numberOfLines={2} style={styles.heroTitle}>{active ? "Find what your team has never found" : "The hunt returns Friday"}</Text>
              <Text numberOfLines={layout.isTablet ? 3 : 2} style={styles.heroBody}>
                {active
                  ? "A new server-verified species earns one team point. Duplicate finds never score twice."
                  : "Organizations race with unique verified species. Your field notes stay private."}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.panelStack}>
            {loading ? (
              <View style={styles.centerCard}><ActivityIndicator color="#f6b94a" size="large" /><Text style={styles.centerHint}>Team signal ophalen…</Text></View>
            ) : error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Team Hunt kon niet laden</Text>
                <Text numberOfLines={3} style={styles.noticeBody}>{error}</Text>
                <Pressable onPress={load} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>Probeer opnieuw</Text></Pressable>
              </View>
            ) : !status?.eligible && active ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Sluit je aan bij een organisatie</Text>
                <Text style={styles.noticeBody}>Vind samen unieke soorten, verdien teampunten en klim op het weekendbord.</Text>
              </View>
            ) : active ? (
              <>
                <View style={styles.teamCard}>
                  <View style={styles.teamHeading}>
                    <View style={styles.teamNameWrap}>
                      <Text style={styles.cardKicker}>JOUW ORGANISATIE</Text>
                      <Text numberOfLines={1} style={styles.teamName}>{status?.team?.organizationName}</Text>
                    </View>
                    <Text style={styles.teamRank}>{status?.team?.rank ? `#${status.team.rank}` : "—"}</Text>
                  </View>
                  <View style={styles.stats}>
                    <View style={styles.stat}><Text style={styles.statValue}>{status?.team?.score ?? 0}</Text><Text style={styles.statLabel}>soorten</Text></View>
                    <View style={styles.stat}><Text style={styles.statValue}>{status?.addedSpecies ?? 0}</Text><Text style={styles.statLabel}>door jou</Text></View>
                    <View style={styles.stat}><Text style={styles.statValue}>{status?.missingCategories?.length ?? 0}</Text><Text style={styles.statLabel}>groepen over</Text></View>
                  </View>
                </View>

                <View style={styles.categoryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardKickerDark}>TEAM TARGETS</Text>
                    <Text style={styles.targetCount}>{status?.completedCategories?.length ?? 0}/6</Text>
                  </View>
                  <View style={styles.categoryGrid}>
                    {(Object.keys(categoryLabels) as TeamHuntCategoryId[]).map((categoryId) => {
                      const complete = status?.completedCategories?.includes(categoryId) ?? false;
                      return (
                        <View key={categoryId} style={[styles.categoryChip, complete && styles.categoryChipComplete]}>
                          <Text style={[styles.categoryChipText, complete && styles.categoryChipTextComplete]}>{complete ? "✓ " : ""}{categoryLabels[categoryId]}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.boardCard}>
                  <View style={styles.boardHeader}><Text style={styles.cardKickerDark}>LIVE BOARD</Text><Text style={styles.boardHint}>unieke soorten</Text></View>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.boardScroll}>
                    {(status?.leaderboard || []).length ? status!.leaderboard!.map((row) => (
                      <View key={row.organizationId} style={[styles.row, row.organizationId === status?.team?.organizationId && styles.rowOwn]}>
                        <Text style={styles.rank}>#{row.rank}</Text>
                        <Text numberOfLines={1} style={styles.rowName}>{row.organizationName}</Text>
                        <Text style={styles.score}>{row.score}</Text>
                      </View>
                    )) : <Text style={styles.boardEmpty}>Nog geen unieke vondsten.</Text>}
                  </ScrollView>
                </View>
              </>
            ) : (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Vrijdag start de volgende jacht</Text>
                <Text style={styles.noticeBody}>Scan tijdens het weekend echte insecten. Iedere nieuwe soort voor jouw organisatie telt precies één keer.</Text>
              </View>
            )}

            {!loading && !error ? (
              <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}>
                <Text style={styles.primaryActionText}>{active ? "Ga op jacht  →" : "Terug naar de wereld"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#1a1206", flex: 1 },
  content: { alignSelf: "center", flex: 1, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 10 },
  headerCopy: { flex: 1 },
  back: { alignItems: "center", backgroundColor: "#fff4dc", borderColor: "#f1b448", borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: "#4a2b08", fontSize: 34, lineHeight: 36, marginTop: -3 },
  kicker: { color: "#f6b94a", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#fff8e8", fontSize: 22, fontWeight: "900", marginTop: 1 },
  titleCompact: { fontSize: 19 },
  statusPill: { backgroundColor: "rgba(255,244,220,0.1)", borderColor: "rgba(246,185,74,0.35)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillLive: { backgroundColor: "#f6b94a", borderColor: "#ffe2a0" },
  statusText: { color: "#f3c977", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  statusTextLive: { color: "#402402" },
  main: { flex: 1, gap: 10, minHeight: 0 },
  mainTablet: { flexDirection: "row" },
  hero: { backgroundColor: "#3b2308", borderColor: "#d78e23", borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  heroPhone: { flexBasis: 176, flexGrow: 0, minHeight: 176 },
  heroTablet: { flex: 1, minHeight: 0 },
  heroImage: { ...StyleSheet.absoluteFillObject, height: "100%", opacity: 0.9, width: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(34,18,4,0.48)" },
  signal: { alignItems: "center", backgroundColor: "rgba(255,192,70,0.16)", borderColor: "rgba(255,224,158,0.72)", borderRadius: 32, borderWidth: 1, height: 64, justifyContent: "center", position: "absolute", right: 14, top: 14, width: 64 },
  signalCore: { backgroundColor: "#ffd36f", borderColor: "#fff4cd", borderRadius: 9, borderWidth: 2, height: 18, width: 18 },
  heroCopy: { bottom: 14, left: 14, maxWidth: 430, position: "absolute", right: 14 },
  heroKicker: { color: "#ffd36f", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  heroTitle: { color: "#fff", fontSize: 23, fontWeight: "900", lineHeight: 26, marginTop: 3, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 5 },
  heroBody: { color: "#fff0cf", fontSize: 11, fontWeight: "700", lineHeight: 15, marginTop: 5 },
  panelStack: { flex: 1, gap: 8, minHeight: 0 },
  centerCard: { alignItems: "center", backgroundColor: "#2a1b0a", borderColor: "#79551d", borderRadius: 18, borderWidth: 1, flex: 1, gap: 10, justifyContent: "center", padding: 18 },
  centerHint: { color: "#e9cf9b", fontSize: 11, fontWeight: "800" },
  notice: { backgroundColor: "#fff4dc", borderColor: "#e4a63c", borderRadius: 18, borderWidth: 1, flexGrow: 1, justifyContent: "center", padding: 16 },
  noticeTitle: { color: "#3a2408", fontSize: 18, fontWeight: "900" },
  noticeBody: { color: "#6f5328", fontSize: 12, lineHeight: 17, marginTop: 5 },
  retry: { alignSelf: "flex-start", backgroundColor: "#8d2d16", borderRadius: 11, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { color: "#fff", fontWeight: "900" },
  teamCard: { backgroundColor: "#76270f", borderColor: "#e89330", borderRadius: 17, borderWidth: 1, padding: 11 },
  teamHeading: { alignItems: "center", flexDirection: "row", gap: 8 },
  teamNameWrap: { flex: 1 },
  cardKicker: { color: "#ffc65d", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  teamName: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 1 },
  teamRank: { color: "#ffd77e", fontSize: 25, fontWeight: "900" },
  stats: { borderTopColor: "rgba(255,219,143,0.24)", borderTopWidth: 1, flexDirection: "row", marginTop: 8, paddingTop: 7 },
  stat: { flex: 1 },
  statValue: { color: "#ffe0a1", fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#f4cdb3", fontSize: 8, fontWeight: "800", marginTop: 1 },
  categoryCard: { backgroundColor: "#fff3d8", borderColor: "#e3a33b", borderRadius: 16, borderWidth: 1, padding: 10 },
  cardHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardKickerDark: { color: "#8f3b11", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  targetCount: { color: "#7f4a12", fontSize: 11, fontWeight: "900" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 },
  categoryChip: { backgroundColor: "#fffaf0", borderColor: "#dfc999", borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  categoryChipComplete: { backgroundColor: "#ffd674", borderColor: "#bd7421" },
  categoryChipText: { color: "#755b30", fontSize: 8, fontWeight: "900" },
  categoryChipTextComplete: { color: "#4b2a07" },
  boardCard: { backgroundColor: "#fff8e9", borderColor: "#d8b66f", borderRadius: 16, borderWidth: 1, flex: 1, minHeight: 106, overflow: "hidden" },
  boardHeader: { alignItems: "center", borderBottomColor: "#ead7ae", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 },
  boardHint: { color: "#8b7650", fontSize: 8, fontWeight: "800" },
  boardScroll: { flex: 1 },
  row: { alignItems: "center", borderBottomColor: "#efe0bf", borderBottomWidth: 1, flexDirection: "row", minHeight: 34, paddingHorizontal: 10 },
  rowOwn: { backgroundColor: "#ffe9ad" },
  rank: { color: "#a74716", fontSize: 10, fontWeight: "900", width: 32 },
  rowName: { color: "#422b0e", flex: 1, fontSize: 11, fontWeight: "900" },
  score: { color: "#8e2b13", fontSize: 14, fontWeight: "900" },
  boardEmpty: { color: "#7c6947", fontSize: 11, padding: 12 },
  primaryAction: { alignItems: "center", backgroundColor: "#f2ad32", borderColor: "#ffe09a", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  primaryActionPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  primaryActionText: { color: "#3b2205", fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.72 }
});
