import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { getReleaseBossStatus, type ReleaseBossStatus } from "../services/releaseBossService";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { User } from "../types";

const releaseBossArt = require("../../assets/generated/release-boss-v1.jpg");

export function ReleaseBossScreen({ user, onBack, onOpenJournal, onRewardAwarded }: { user: User; onBack: () => void; onOpenJournal: () => void; onRewardAwarded?: () => void }) {
  const layout = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<ReleaseBossStatus | null>(null);
  const [error, setError] = useState("");
  const rewardReported = useRef(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const refresh = () => {
    setError("");
    getReleaseBossStatus(user)
      .then(setStatus)
      .catch((value) => setError(value instanceof Error ? value.message : "Unable to load the event."));
  };

  useEffect(() => { refresh(); }, [user.uid]);
  useEffect(() => {
    if (!status?.claimed || rewardReported.current) return;
    rewardReported.current = true;
    onRewardAwarded?.();
  }, [onRewardAwarded, status?.claimed]);
  useEffect(() => {
    reveal.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(reveal, { duration: 520, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(reveal, { duration: 260, easing: Easing.out(Easing.quad), toValue: 0.88, useNativeDriver: nativeDriver }),
      Animated.timing(reveal, { duration: 240, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: nativeDriver })
    ]).start();
  }, [reducedMotion, reveal, status?.complete]);

  const percentage = status ? Math.min(100, Math.round((status.progress / Math.max(1, status.target)) * 100)) : 0;
  const contentBottom = layout.navigationMode === "bottom" ? layout.bottomNavHeight + 18 : 18;

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { maxWidth: layout.shellMaxWidth, padding: layout.gutter, paddingBottom: contentBottom }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back home" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>COMMUNITY BOSS</Text>
            <Text numberOfLines={1} style={[styles.title, layout.isCompact && styles.titleCompact]}>Conservatory Guardian</Text>
          </View>
          <View style={[styles.statusPill, status?.complete && styles.statusPillComplete]}>
            <Text style={[styles.statusPillText, status?.complete && styles.statusPillTextComplete]}>{status?.complete ? "CALM" : "ACTIVE"}</Text>
          </View>
        </View>

        <View style={[styles.main, layout.isTablet && styles.mainTablet]}>
          <ImageBackground
            imageStyle={styles.stageImage}
            resizeMode="cover"
            source={releaseBossArt}
            style={[styles.stage, layout.isTablet ? styles.stageTablet : styles.stagePhone]}
          >
            <View style={styles.stageShade} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.aura,
                {
                  opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.34] }),
                  transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }]
                }
              ]}
            />
            <View style={styles.eventBadge}><Text style={styles.eventBadgeText}>{status?.complete ? "FINALE COMPLETE" : "LIVE RELEASE"}</Text></View>
            <View style={styles.stageCopy}>
              <Text style={styles.stageKicker}>{status?.complete ? "THE GUARDIAN IS CALM" : "EVERY VERIFIED FIND COUNTS"}</Text>
              <Text numberOfLines={2} style={styles.stageTitle}>{status?.complete ? "The Conservatory is safe" : "Wake the Guardian"}</Text>
              <Text numberOfLines={layout.isTablet ? 3 : 2} style={styles.stageBody}>Build the shared meter with real, verified field observations. Locations and player names remain private.</Text>
            </View>
          </ImageBackground>

          <View style={styles.panelStack}>
            {!status && !error ? (
              <View style={styles.centerCard}><ActivityIndicator color="#ff8a61" size="large" /><Text style={styles.centerHint}>Guardian-status ophalen…</Text></View>
            ) : null}

            {error ? (
              <View style={styles.error}>
                <Text style={styles.errorTitle}>Event niet bereikbaar</Text>
                <Text numberOfLines={3} style={styles.errorText}>{error}</Text>
                <Pressable onPress={refresh} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}><Text style={styles.retryText}>Probeer opnieuw</Text></Pressable>
              </View>
            ) : null}

            {status ? (
              <>
                <View style={styles.progressCard}>
                  <View style={styles.progressTop}>
                    <View style={styles.progressCopy}>
                      <Text style={styles.cardKicker}>SHARED RELEASE METER</Text>
                      <Text numberOfLines={1} style={styles.progressTitle}>{status.progress}/{status.target} observations</Text>
                    </View>
                    <Text style={styles.percent}>{percentage}%</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${percentage}%` }]} /></View>
                  <View style={styles.personalRow}>
                    <Text style={styles.personalLabel}>JOUW BIJDRAGE</Text>
                    <Text style={styles.personalValue}>{status.contributed}</Text>
                  </View>
                </View>

                {status.complete ? (
                  <View style={styles.rewardCard}>
                    <Text style={styles.rewardKicker}>FINALE REWARD</Text>
                    <Text style={styles.rewardTitle}>{status.claimed ? `+${status.rewardXp} XP ontvangen` : `+${status.rewardXp} XP voor iedere contributor`}</Text>
                    <Text numberOfLines={3} style={styles.rewardBody}>
                      {status.claimed
                        ? "Je finale-beloning en Crown Hall-trofee zijn veilig opgeslagen."
                        : status.eligibleForReward
                          ? "De server rondt je automatische beloning af."
                          : "Alleen spelers die voor de finale bijdroegen ontvangen de beloning."}
                    </Text>
                    <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}>
                      <Text style={styles.primaryActionText}>Terug naar de wereld</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.nextCard}>
                    <Text style={styles.nextKicker}>VOLGENDE ACTIE</Text>
                    <Text style={styles.nextTitle}>Voeg één echte vondst toe</Text>
                    <Text numberOfLines={3} style={styles.nextBody}>Een geverifieerde veldnotitie vult de community-meter en je privé Expedition-route.</Text>
                    <Pressable accessibilityRole="button" onPress={onOpenJournal} style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}>
                      <Text style={styles.primaryActionText}>Open Field Journal  →</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#18090a", flex: 1 },
  content: { alignSelf: "center", flex: 1, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 10 },
  headerCopy: { flex: 1 },
  back: { alignItems: "center", backgroundColor: "#fff0e8", borderColor: "#ec7d59", borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: "#601c17", fontSize: 34, lineHeight: 36, marginTop: -3 },
  kicker: { color: "#ff8a61", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#fff1e9", fontSize: 22, fontWeight: "900", marginTop: 1 },
  titleCompact: { fontSize: 19 },
  statusPill: { backgroundColor: "#a62f28", borderColor: "#ff8a61", borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillComplete: { backgroundColor: "#ffd578", borderColor: "#fff0bd" },
  statusPillText: { color: "#fff0e8", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  statusPillTextComplete: { color: "#511b12" },
  main: { flex: 1, gap: 10, minHeight: 0 },
  mainTablet: { flexDirection: "row" },
  stage: { backgroundColor: "#3a0e11", borderColor: "#d8523e", borderRadius: 22, borderWidth: 1, overflow: "hidden", padding: 14 },
  stagePhone: { flexBasis: 254, flexGrow: 0, minHeight: 220 },
  stageTablet: { flex: 1, minHeight: 0 },
  stageImage: { opacity: 0.88 },
  stageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(35,4,7,0.37)" },
  aura: { alignSelf: "center", backgroundColor: "#ff7956", borderColor: "#ffd0ac", borderRadius: 120, borderWidth: 2, height: 240, position: "absolute", top: 10, width: 240 },
  eventBadge: { alignSelf: "flex-start", backgroundColor: "#e65f47", borderColor: "#ffb28b", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  eventBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  stageCopy: { bottom: 14, left: 14, maxWidth: 430, position: "absolute", right: 14 },
  stageKicker: { color: "#ffb477", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  stageTitle: { color: "#fff", fontSize: 27, fontWeight: "900", lineHeight: 30, marginTop: 3, textShadowColor: "rgba(0,0,0,0.72)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 5 },
  stageBody: { color: "#ffe5d7", fontSize: 11, fontWeight: "700", lineHeight: 16, marginTop: 5 },
  panelStack: { flex: 1, gap: 9, minHeight: 0 },
  centerCard: { alignItems: "center", backgroundColor: "#2e1011", borderColor: "#7c2f2a", borderRadius: 18, borderWidth: 1, flex: 1, gap: 10, justifyContent: "center", padding: 18 },
  centerHint: { color: "#e8b8a8", fontSize: 11, fontWeight: "800" },
  error: { backgroundColor: "#ffe4dc", borderColor: "#d85e49", borderRadius: 18, borderWidth: 1, flex: 1, justifyContent: "center", padding: 16 },
  errorTitle: { color: "#721f1b", fontSize: 18, fontWeight: "900" },
  errorText: { color: "#8b4337", fontSize: 12, lineHeight: 17, marginTop: 5 },
  retry: { alignSelf: "flex-start", backgroundColor: "#a62f28", borderRadius: 11, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { color: "#fff", fontWeight: "900" },
  progressCard: { backgroundColor: "#fff0e8", borderColor: "#dd7156", borderRadius: 17, borderWidth: 1, padding: 12 },
  progressTop: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  progressCopy: { flex: 1 },
  cardKicker: { color: "#a43827", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  progressTitle: { color: "#441718", fontSize: 16, fontWeight: "900", marginTop: 2 },
  percent: { color: "#bd3329", fontSize: 22, fontWeight: "900" },
  track: { backgroundColor: "#e7c6ba", borderRadius: 999, height: 10, marginTop: 10, overflow: "hidden" },
  fill: { backgroundColor: "#e1533f", borderRadius: 999, height: "100%" },
  personalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  personalLabel: { color: "#8d6258", fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  personalValue: { color: "#8e2923", fontSize: 15, fontWeight: "900" },
  rewardCard: { backgroundColor: "#ffe3a1", borderColor: "#ef9c40", borderRadius: 18, borderWidth: 1, flex: 1, justifyContent: "center", padding: 14 },
  rewardKicker: { color: "#9b3b19", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  rewardTitle: { color: "#461816", fontSize: 18, fontWeight: "900", marginTop: 3 },
  rewardBody: { color: "#765044", fontSize: 11, lineHeight: 16, marginTop: 5 },
  nextCard: { backgroundColor: "#3d1214", borderColor: "#a84035", borderRadius: 18, borderWidth: 1, flex: 1, justifyContent: "center", padding: 14 },
  nextKicker: { color: "#ff9c72", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  nextTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: 3 },
  nextBody: { color: "#eac2b5", fontSize: 11, lineHeight: 16, marginTop: 5 },
  primaryAction: { alignItems: "center", backgroundColor: "#ff805d", borderColor: "#ffc19f", borderRadius: 13, borderWidth: 1, justifyContent: "center", marginTop: 12, minHeight: 48, paddingHorizontal: 16 },
  primaryActionPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  primaryActionText: { color: "#42110f", fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.72 }
});
