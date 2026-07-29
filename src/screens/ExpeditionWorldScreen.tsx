import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { listFieldJournalEntries, type FieldJournalEntry } from "../services/fieldJournalService";
import { expeditionBiomes, expeditionWorldProgress, type ExpeditionBiome } from "../services/expeditionWorldProgress";
import type { User } from "../types";

const worldMap = require("../../assets/generated/expedition-world-v2.jpg");
const biomeAtlas = require("../../assets/generated/biome-atlas-v1.jpg");

export function ExpeditionWorldScreen({ user, onBack, onOpenJournal, onOpenSwarmSiege, onOpenTeamHunt }: { user: User; onBack: () => void; onOpenJournal: () => void; onOpenSwarmSiege: () => void; onOpenTeamHunt: () => void }) {
  const [entries, setEntries] = useState<FieldJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const beaconPulse = useRef(new Animated.Value(0)).current;
  const mapReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    setLoading(true);
    listFieldJournalEntries(user)
      .then((next) => { if (active) setEntries(next); })
      .catch(() => { if (active) setEntries([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(beaconPulse, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(beaconPulse, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: nativeDriver })
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [beaconPulse]);

  useEffect(() => {
    mapReveal.setValue(0);
    Animated.timing(mapReveal, { duration: 550, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: nativeDriver }).start();
  }, [loading, mapReveal]);

  const progress = useMemo(() => expeditionWorldProgress(entries), [entries]);
  const beaconScale = beaconPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const beaconOpacity = beaconPulse.interpolate({ inputRange: [0, 1], outputRange: [0.58, 0] });

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back home" accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <View><Text style={styles.kicker}>BUGBAAS 3.0</Text><Text style={styles.title}>Expedition World</Text></View>
    </View>

    <View style={styles.signalPanel}>
      <Text style={styles.signalKicker}>WHAT A VERIFIED FIND DOES</Text>
      <Text style={styles.signalTitle}>One real find, three useful paths</Text>
      <Text style={styles.signalBody}>Scan first. A verified field note fills your private map, while games and unique species power separate community events.</Text>
      <Pressable accessibilityRole="button" onPress={onOpenJournal} style={styles.signalPrimary}><View><Text style={styles.signalPrimaryText}>My Field Journal</Text><Text style={styles.signalReward}>See your verified finds and biome progress</Text></View><Text style={styles.signalArrow}>→</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onOpenSwarmSiege} style={styles.signalSecondary}><View><Text style={styles.signalSecondaryText}>Swarm Siege</Text><Text style={styles.signalRewardSecondary}>Goal: defeat the AI swarm · Reward: event XP</Text></View><Text style={styles.signalArrowSecondary}>→</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onOpenTeamHunt} style={styles.signalSecondary}><View><Text style={styles.signalSecondaryText}>Team Hunt Weekend</Text><Text style={styles.signalRewardSecondary}>Goal: a team-new species · Reward: team score</Text></View><Text style={styles.signalArrowSecondary}>→</Text></Pressable>
    </View>

    <Animated.View style={[styles.mapWrap, { opacity: mapReveal, transform: [{ translateY: mapReveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
    <ImageBackground source={worldMap} resizeMode="cover" imageStyle={styles.mapImage} style={styles.mapCard}>
      <View style={styles.mapShade}>
        <Text style={styles.mapKicker}>YOUR PRIVATE DISCOVERY MAP</Text>
        <Text style={styles.mapTitle}>{progress.unlockedCount === 0 ? "Your first biome is waiting" : `${progress.unlockedCount} of ${expeditionBiomes.length} biomes awake`}</Text>
        <Text style={styles.mapBody}>{progress.nextBiome ? `Next goal: verify a find from ${progress.nextBiome.habitat}. It turns that trail from mist into memory.` : "Collection goal complete: your private habitat passport is full."}</Text>
        <View style={styles.mapProgress}><View style={[styles.mapProgressFill, { width: `${(progress.unlockedCount / expeditionBiomes.length) * 100}%` }]} /></View>
        <View style={[styles.beacon, styles.nonInteractive]}><Animated.View style={[styles.beaconRing, { opacity: beaconOpacity, transform: [{ scale: beaconScale }] }]} /><View style={styles.beaconCore}><Text style={styles.beaconMark}>{progress.nextBiome ? progress.nextBiome.symbol : "OK"}</Text></View></View>
      </View>
    </ImageBackground>
    </Animated.View>

    <View style={styles.routeHeader}>
      <View><Text style={styles.sectionKicker}>THE SIX TRAILS</Text><Text style={styles.sectionTitle}>Follow your finds</Text></View>
      <Text style={styles.counter}>{progress.unlockedCount}/{expeditionBiomes.length}</Text>
    </View>
    <Text style={styles.intro}>No exact locations, no public map and no extra grind. These places only become visible through your own verified observations.</Text>
    <View style={styles.atlasCard}><Image source={biomeAtlas} style={styles.atlasImage} /><View style={styles.atlasShade}><Text style={styles.atlasKicker}>SIX WORLDS TO AWAKEN</Text><Text style={styles.atlasText}>Each verified habitat turns one part of your private world from mist into memory.</Text></View></View>

    {loading ? <ActivityIndicator color="#15724f" size="large" style={styles.loader} /> : <View style={styles.trailList}>
      {expeditionBiomes.map((biome, index) => {
        const latest = progress.latestByHabitat.get(biome.habitat);
        const unlocked = Boolean(latest);
        return <View key={biome.habitat} style={styles.trailRow}>
          <View style={styles.routeRail}>{index > 0 ? <View style={styles.railTop} /> : null}<View style={[styles.marker, unlocked ? styles.markerUnlocked : styles.markerLocked]}><Text style={[styles.markerText, unlocked ? styles.markerTextUnlocked : styles.markerTextLocked]}>{unlocked ? "✓" : biome.symbol}</Text></View>{index < expeditionBiomes.length - 1 ? <View style={styles.railBottom} /> : null}</View>
          <View style={[styles.biomeCard, biomeToneStyle(biome.tone), unlocked && styles.biomeUnlocked]}>
            <View style={styles.biomeTop}><View><Text style={styles.biomeNumber}>BIOME {biome.symbol}</Text><Text style={styles.biomeName}>{biome.habitat}</Text></View><Text style={[styles.state, unlocked ? styles.stateUnlocked : styles.stateLocked]}>{unlocked ? "AWAKE" : "MIST"}</Text></View>
            <Text style={styles.biomeSubtitle}>{unlocked && latest ? `${latest.speciesName} recorded here` : biome.subtitle}</Text>
            <Text style={styles.biomeDetail}>{unlocked && latest ? new Date(latest.observedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "Waiting for a real-world discovery"}</Text>
          </View>
        </View>;
      })}
    </View>}

    <Text style={styles.footer}>Expedition World stays private. Only server-verified field notes can progress its milestones and rewards.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { alignSelf: "center", maxWidth: 840, padding: 18, paddingBottom: 150, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 14 }, back: { alignItems: "center", backgroundColor: "#fff", borderColor: "#cfddd5", borderRadius: 15, borderWidth: 1, height: 46, justifyContent: "center", width: 46 }, backText: { color: "#173f31", fontSize: 34, lineHeight: 36 }, kicker: { color: "#be7a1d", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }, title: { color: "#102018", fontSize: 24, fontWeight: "900" },
  nonInteractive: { pointerEvents: "none" }, mapWrap: { borderRadius: 22 }, mapCard: { backgroundColor: "#183e31", borderColor: "#d7bd57", borderRadius: 22, borderWidth: 1, minHeight: 228, overflow: "hidden" }, mapImage: { opacity: 0.78 }, mapShade: { backgroundColor: "rgba(11, 30, 23, 0.55)", flex: 1, justifyContent: "flex-end", minHeight: 228, padding: 18 }, mapKicker: { color: "#e5cc69", fontSize: 10, fontWeight: "900", letterSpacing: 1.15 }, mapTitle: { color: "#fff", fontSize: 27, fontWeight: "900", marginTop: 5 }, mapBody: { color: "#d8e9dc", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 340 }, mapProgress: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, height: 8, marginTop: 14, overflow: "hidden" }, mapProgressFill: { backgroundColor: "#e5cc69", borderRadius: 8, height: "100%" }, beacon: { alignItems: "center", height: 60, justifyContent: "center", position: "absolute", right: 20, top: 19, width: 60 }, beaconRing: { backgroundColor: "#e5cc69", borderRadius: 29, height: 58, position: "absolute", width: 58 }, beaconCore: { alignItems: "center", backgroundColor: "#173f31", borderColor: "#e5cc69", borderRadius: 19, borderWidth: 2, height: 38, justifyContent: "center", width: 38 }, beaconMark: { color: "#fff", fontSize: 10, fontWeight: "900" },
  routeHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 22 }, sectionKicker: { color: "#be7a1d", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, sectionTitle: { color: "#102018", fontSize: 20, fontWeight: "900", marginTop: 2 }, counter: { color: "#15724f", fontSize: 22, fontWeight: "900" }, intro: { color: "#587064", fontSize: 13, lineHeight: 19, marginTop: 8 }, atlasCard: { borderColor: "#d7bd57", borderRadius: 16, borderWidth: 1, height: 118, marginTop: 16, overflow: "hidden" }, atlasImage: { height: "100%", width: "100%" }, atlasShade: { backgroundColor: "rgba(7, 27, 18, 0.56)", bottom: 0, left: 0, padding: 11, position: "absolute", right: 0 }, atlasKicker: { color: "#f0dc84", fontSize: 9, fontWeight: "900", letterSpacing: 1.05 }, atlasText: { color: "#eef6ed", fontSize: 11, lineHeight: 15, marginTop: 2 }, loader: { marginVertical: 34 }, trailList: { marginTop: 18 }, trailRow: { flexDirection: "row", minHeight: 107 }, routeRail: { alignItems: "center", width: 42 }, railTop: { backgroundColor: "#cfddd5", height: 23, width: 2 }, railBottom: { backgroundColor: "#cfddd5", flex: 1, marginBottom: -1, width: 2 }, marker: { alignItems: "center", borderRadius: 17, height: 34, justifyContent: "center", width: 34, zIndex: 1 }, markerUnlocked: { backgroundColor: "#15724f", borderColor: "#e5cc69", borderWidth: 2 }, markerLocked: { backgroundColor: "#eff4f0", borderColor: "#b7cbc0", borderWidth: 2 }, markerText: { fontSize: 11, fontWeight: "900" }, markerTextUnlocked: { color: "#fff" }, markerTextLocked: { color: "#789083" },
  biomeCard: { borderRadius: 16, flex: 1, marginBottom: 12, padding: 14 }, biomeMoss: { backgroundColor: "#e5efe4" }, biomeWater: { backgroundColor: "#e2eff1" }, biomeAmber: { backgroundColor: "#f4ecd7" }, biomeViolet: { backgroundColor: "#eee8f1" }, biomeSlate: { backgroundColor: "#e5ebed" }, biomeCoral: { backgroundColor: "#f4e5dd" }, biomeUnlocked: { borderColor: "#d7bd57", borderWidth: 1 }, biomeTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" }, biomeNumber: { color: "#587064", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, biomeName: { color: "#102018", fontSize: 18, fontWeight: "900", marginTop: 2 }, state: { borderRadius: 10, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4 }, stateUnlocked: { backgroundColor: "#15724f", color: "#fff" }, stateLocked: { backgroundColor: "#d4ddd7", color: "#587064" }, biomeSubtitle: { color: "#284f3d", fontSize: 13, fontWeight: "800", marginTop: 10 }, biomeDetail: { color: "#587064", fontSize: 11, marginTop: 3 },
  signalPanel: { backgroundColor: "#173f31", borderColor: "#d7bd57", borderRadius: 17, borderWidth: 1, marginTop: 14, padding: 14 }, signalKicker: { color: "#e5cc69", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 }, signalTitle: { color: "#fff", fontSize: 17, fontWeight: "900", marginTop: 3 }, signalBody: { color: "#c9d9cf", fontSize: 12, lineHeight: 17, marginTop: 5 }, signalPrimary: { alignItems: "center", backgroundColor: "#e5cc69", borderRadius: 10, flexDirection: "row", justifyContent: "space-between", marginTop: 11, padding: 12 }, signalPrimaryText: { color: "#173f31", fontSize: 13, fontWeight: "900" }, signalReward: { color: "#365342", fontSize: 10, fontWeight: "800", marginTop: 2 }, signalSecondary: { alignItems: "center", borderColor: "rgba(229,204,105,0.48)", borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 8, padding: 11 }, signalSecondaryText: { color: "#edf6ee", fontSize: 13, fontWeight: "900" }, signalRewardSecondary: { color: "#b9d0bf", fontSize: 10, fontWeight: "800", marginTop: 2 }, signalArrow: { color: "#173f31", fontSize: 19, fontWeight: "900" }, signalArrowSecondary: { color: "#e5cc69", fontSize: 19, fontWeight: "900" }, footer: { color: "#70877a", fontSize: 11, lineHeight: 16, marginHorizontal: 8, marginTop: 14, textAlign: "center" }
});

function biomeToneStyle(tone: ExpeditionBiome["tone"]) {
  return {
    moss: styles.biomeMoss,
    water: styles.biomeWater,
    amber: styles.biomeAmber,
    violet: styles.biomeViolet,
    slate: styles.biomeSlate,
    coral: styles.biomeCoral
  }[tone];
}
