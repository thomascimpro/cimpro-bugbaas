import React from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import type { SwarmSiegeStatus } from "../../services/swarmSiegeService";

const SWARM_DOTS = [
  { left: "8%", scale: 0.7, top: "18%" }, { left: "22%", scale: 1, top: "34%" },
  { left: "38%", scale: 0.65, top: "14%" }, { left: "54%", scale: 0.9, top: "28%" },
  { left: "69%", scale: 0.75, top: "17%" }, { left: "82%", scale: 1.05, top: "37%" },
  { left: "91%", scale: 0.62, top: "21%" }, { left: "13%", scale: 0.55, top: "58%" },
  { left: "31%", scale: 0.85, top: "66%" }, { left: "47%", scale: 0.62, top: "52%" },
  { left: "63%", scale: 0.95, top: "63%" }, { left: "78%", scale: 0.58, top: "54%" },
  { left: "88%", scale: 0.8, top: "70%" }
] as const;

type Props = {
  bossArt: ImageSourcePropType;
  bossPulse: Animated.Value;
  compact?: boolean;
  impactFlash: Animated.Value;
  status: SwarmSiegeStatus;
  swarmDrift: Animated.Value;
  swarmDriftReverse: Animated.Value;
  t: (key: string, values?: Record<string, string | number>) => string;
};

export function SwarmBossStage({ bossArt, bossPulse, compact = false, impactFlash, status, swarmDrift, swarmDriftReverse, t }: Props) {
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <Image resizeMode="contain" source={bossArt} style={styles.bossArt} />
      <View style={styles.heroShade} />
      <Animated.View pointerEvents="none" style={[styles.swarmLayer, styles.swarmLayerOne, { transform: [{ translateX: swarmDrift.interpolate({ inputRange: [0, 1], outputRange: [-18, 20] }) }, { translateY: swarmDrift.interpolate({ inputRange: [0, 1], outputRange: [5, -12] }) }] }]}>
        {SWARM_DOTS.slice(0, 7).map((dot, index) => <View key={`a-${index}`} style={[styles.swarmDot, { left: dot.left, top: dot.top, transform: [{ scale: dot.scale }] }]} />)}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.swarmLayer, styles.swarmLayerTwo, { transform: [{ translateX: swarmDriftReverse.interpolate({ inputRange: [0, 1], outputRange: [22, -24] }) }, { translateY: swarmDriftReverse.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] }) }] }]}>
        {SWARM_DOTS.slice(7).map((dot, index) => <View key={`b-${index}`} style={[styles.swarmDot, styles.swarmDotSoft, { left: dot.left, top: dot.top, transform: [{ scale: dot.scale }] }]} />)}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.bossCore, { opacity: bossPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.78] }), transform: [{ scale: bossPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }] }]} />
      <Animated.View pointerEvents="none" style={[styles.impactFlash, { opacity: impactFlash }]} />
      <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>{t(`swarm.state.${status.state}`)}</Text></View>
      <View style={styles.heroCopy}>
        <Text numberOfLines={2} style={styles.heroTitle}>{status.complete ? t("swarm.complete") : t(`swarm.phase.${status.phaseId}`)}</Text>
        <Text numberOfLines={compact ? 1 : 2} style={styles.heroBody}>{t("swarm.body")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#1d1245", borderColor: "#8068df", borderRadius: 22, borderWidth: 1, flex: 1, justifyContent: "space-between", minHeight: 228, overflow: "hidden", padding: 14, position: "relative" },
  heroCompact: { flex: 0, height: 240, minHeight: 240 },
  bossArt: { height: "100%", left: 0, opacity: 0.94, position: "absolute", top: 0, width: "100%" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,7,42,0.25)" },
  swarmLayer: { ...StyleSheet.absoluteFillObject },
  swarmLayerOne: { opacity: 0.82 },
  swarmLayerTwo: { opacity: 0.48 },
  swarmDot: { backgroundColor: "#ff9b4a", borderColor: "rgba(255,225,188,0.72)", borderRadius: 4, borderWidth: 1, height: 5, position: "absolute", width: 9 },
  swarmDotSoft: { backgroundColor: "#a996ff", height: 4, width: 7 },
  bossCore: { alignSelf: "center", backgroundColor: "rgba(150,117,255,0.2)", borderColor: "rgba(218,203,255,0.72)", borderRadius: 55, borderWidth: 2, height: 110, position: "absolute", top: 42, width: 110 },
  impactFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,157,83,0.72)" },
  liveBadge: { alignSelf: "flex-start", backgroundColor: "#ff8439", borderColor: "#ffc78e", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  liveBadgeText: { color: "#281442", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  heroCopy: { marginTop: "auto" },
  heroTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900", lineHeight: 25, maxWidth: 420, textShadowColor: "rgba(0,0,0,0.76)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 5 },
  heroBody: { color: "#eee9ff", fontSize: 10, fontWeight: "700", lineHeight: 15, marginTop: 4, maxWidth: 430, textShadowColor: "rgba(0,0,0,0.82)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 }
});
