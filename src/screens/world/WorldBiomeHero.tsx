import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type DimensionValue, type LayoutChangeEvent } from "react-native";
import type { ExpeditionRegionProgress } from "../../services/expeditionWorldProgress";
import type { FieldJournalHabitat } from "../../services/fieldJournalService";
import { useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";
import { WalkingBug } from "../../components/WalkingBug";
import { movementGoalModel } from "./WorldTodayModel";

const biomeAtlas = require("../../../assets/generated/biome-atlas-v1.jpg");

const biomeVisuals: Record<FieldJournalHabitat, { accent: string; column: number; row: number }> = {
  Tuin: { accent: "#86c56f", column: 0, row: 0 },
  Park: { accent: "#d3bc68", column: 1, row: 0 },
  Water: { accent: "#66b7c1", column: 2, row: 0 },
  Nacht: { accent: "#9187c9", column: 0, row: 1 },
  Kantoor: { accent: "#b7c3bd", column: 1, row: 1 },
  Binnen: { accent: "#cb8a6d", column: 2, row: 1 }
};

type Props = {
  isCompact: boolean;
  isTablet: boolean;
  onSelectHabitat: (habitat: FieldJournalHabitat) => void;
  region: ExpeditionRegionProgress;
  regions: ExpeditionRegionProgress[];
  todayKm: number;
  walkGoalKm: number;
  walkingGoalCountToday: number;
  walkingGoalCountMax: number;
  weekKm: number;
};

export function WorldBiomeHero({
  isCompact,
  isTablet,
  onSelectHabitat,
  region,
  regions,
  todayKm,
  walkGoalKm,
  walkingGoalCountToday,
  walkingGoalCountMax,
  weekKm
}: Props) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const visual = biomeVisuals[region.habitat];
  const heroMinHeight = Math.min(isTablet ? 360 : 278, Math.max(isCompact ? 190 : 218, height - 590));
  const routeProgress = region.nextRequirement
    ? Math.min(100, Math.round((region.nextRequirement.current / Math.max(1, region.nextRequirement.target)) * 100))
    : 100;
  const routeGoal = region.nextRequirement?.kind
    ? t(`world.region.next.${region.nextRequirement.kind}`, {
        current: region.nextRequirement.current,
        target: region.nextRequirement.target
      })
    : t("world.region.repeat");
  const movementModel = movementGoalModel(todayKm, walkGoalKm);
  const movementProgress = Math.round(movementModel.progress * 100);

  return (
    <View>
      <View style={[styles.hero, { minHeight: heroMinHeight }]}>
        <BiomeAtlasCrop habitat={region.habitat} />
        <View pointerEvents="none" style={styles.heroShade} />
        <View pointerEvents="none" style={styles.foregroundLeft} />
        <View pointerEvents="none" style={styles.foregroundRight} />

        <View style={styles.heroTopRow}>
          <View style={styles.activeHeader}>
            <Text style={styles.activeKicker}>{t("world.today.fieldStatus")}</Text>
            <View style={styles.activeTitleRow}>
              <View style={[styles.activeDot, { backgroundColor: visual.accent }]} />
              <Text style={[styles.activeTitle, { fontSize: isTablet ? 29 : 23 }]}>{t(`journal.habitat.${region.habitat}`)}</Text>
            </View>
          </View>
        </View>

        {region.verifiedObservations > 0 ? (
          <View pointerEvents="none" style={styles.findMarker}>
            <FindGlyph />
            <Text style={styles.findMarkerText}>{region.verifiedObservations}</Text>
          </View>
        ) : null}

        <View style={styles.heroBottom}>
          <View style={styles.routeHeader}>
            <View>
              <Text style={styles.routeKicker}>{region.tier >= 5 ? t("world.region.master") : t("world.region.level", { tier: region.tier })}</Text>
              <Text style={styles.routeMeta}>{t("map.findings", { count: region.verifiedObservations })}</Text>
              <Text numberOfLines={2} style={styles.routeGoal}>{routeGoal}</Text>
              {region.tier < 5 ? <Text numberOfLines={1} style={styles.routeOutcome}>{t("world.region.outcome")}</Text> : null}
            </View>
            <View style={styles.movementChip}>
              <Text style={styles.movementValue}>{movementModel.currentLabel}/{movementModel.goalLabel}</Text>
              <Text style={styles.movementLabel}>{t("world.today.walking")} · {walkingGoalCountToday}/{walkingGoalCountMax}</Text>
            </View>
          </View>

          <View style={styles.routePath}>
            <View style={styles.routeTrack}><View style={[styles.routeFill, { backgroundColor: visual.accent, width: `${routeProgress}%` as DimensionValue }]} /></View>
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={[styles.routeNode, index < region.tier && { backgroundColor: visual.accent, borderColor: "#ffffff" }, index === region.tier && region.tier < 5 && styles.routeNodeCurrent]} />
            ))}
          </View>

          <MovementBugRail accent={visual.accent} progress={movementProgress} />

          <Text style={styles.weekMeta}>{t("world.today.weekKm", { value: weekKm.toFixed(1) })} · {movementProgress}%</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.biomeRail}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.biomeScroll}
      >
        {regions.map((item) => {
          const selected = item.habitat === region.habitat;
          const locked = item.tier === 0;
          const itemVisual = biomeVisuals[item.habitat];
          return (
            <Pressable
              accessibilityLabel={`${t(`journal.habitat.${item.habitat}`)} · T${item.tier}`}
              accessibilityRole="button"
              key={item.habitat}
              onPress={() => onSelectHabitat(item.habitat)}
              style={[styles.thumbnail, isTablet && styles.thumbnailTablet, selected && { borderColor: itemVisual.accent, borderWidth: 2 }]}
            >
              <BiomeAtlasCrop habitat={item.habitat} />
              <View pointerEvents="none" style={styles.thumbnailShade} />
              {locked ? <View pointerEvents="none" style={styles.lockedOverlay}><LockGlyph /></View> : null}
              <View style={styles.thumbnailLabelRow}>
                <Text numberOfLines={1} style={styles.thumbnailLabel}>{t(`journal.habitat.${item.habitat}`)}</Text>
                <Text style={styles.thumbnailTier}>T{item.tier}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MovementBugRail({ accent, progress }: { accent: string; progress: number }) {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
      toValue: progress,
      useNativeDriver: false
    }).start();
  }, [animatedProgress, progress]);

  const left = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "88%"]
  });

  return (
    <View accessibilityLabel={`${progress}%`} style={styles.movementRoute}>
      <View style={styles.movementTrack}>
        <Animated.View style={[styles.movementFill, { backgroundColor: accent, width: animatedProgress.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Animated.View pointerEvents="none" style={[styles.movementBug, { left }]}>
        <WalkingBug direction="right" size={30} variant="ladybug" />
      </Animated.View>
    </View>
  );
}

function FindGlyph() {
  return (
    <View style={styles.findGlyph}>
      <View style={styles.findGlyphShort} />
      <View style={styles.findGlyphLong} />
    </View>
  );
}

function LockGlyph() {
  return (
    <View style={styles.lockGlyph}>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody}><View style={styles.lockKeyhole} /></View>
    </View>
  );
}

function BiomeAtlasCrop({ habitat }: { habitat: FieldJournalHabitat }) {
  const visual = biomeVisuals[habitat];
  const [layout, setLayout] = useState({ height: 0, width: 0 });
  const tileSize = Math.max(layout.height, layout.width);

  function handleLayout(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    if (height !== layout.height || width !== layout.width) setLayout({ height, width });
  }

  return (
    <View onLayout={handleLayout} pointerEvents="none" style={styles.artCrop}>
      {tileSize > 0 ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="stretch"
          source={biomeAtlas}
          style={[
            styles.atlas,
            {
              height: tileSize * 2,
              left: (layout.width - tileSize) / 2 - visual.column * tileSize,
              top: (layout.height - tileSize) / 2 - visual.row * tileSize,
              width: tileSize * 3
            }
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#102a20", borderColor: gameTheme.colors.borderStrong, borderRadius: 22, borderWidth: 1, overflow: "hidden", padding: 11, position: "relative" },
  artCrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  atlas: { position: "absolute" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,18,13,0.38)" },
  foregroundLeft: { backgroundColor: "rgba(13,59,39,0.58)", borderRadius: 90, bottom: -70, height: 190, left: -58, position: "absolute", transform: [{ rotate: "-18deg" }], width: 112 },
  foregroundRight: { backgroundColor: "rgba(5,28,20,0.68)", borderRadius: 90, height: 180, position: "absolute", right: -62, top: 68, transform: [{ rotate: "22deg" }], width: 104 },
  heroTopRow: { alignItems: "flex-start", flexDirection: "row", zIndex: 3 },
  activeHeader: { backgroundColor: "rgba(5,23,17,0.74)", borderColor: "rgba(255,255,255,0.16)", borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  activeKicker: { color: gameTheme.colors.accentStrong, fontSize: 7, fontWeight: "900", letterSpacing: 1.1 },
  activeTitleRow: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 2 },
  activeDot: { borderColor: "rgba(255,255,255,0.88)", borderRadius: 6, borderWidth: 1, height: 10, width: 10 },
  activeTitle: { color: "#ffffff", fontWeight: "900", textShadowColor: "rgba(0,0,0,0.48)", textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 4 },
  findMarker: { alignItems: "center", backgroundColor: "rgba(5,23,17,0.88)", borderColor: gameTheme.colors.accentStrong, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 4, left: "15%", paddingHorizontal: 8, paddingVertical: 5, position: "absolute", top: "28%", zIndex: 2 },
  findGlyph: { height: 11, position: "relative", width: 13 },
  findGlyphShort: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 2, bottom: 2, height: 2.5, left: 0, position: "absolute", transform: [{ rotate: "42deg" }], width: 6 },
  findGlyphLong: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 2, bottom: 4, height: 2.5, left: 4, position: "absolute", transform: [{ rotate: "-48deg" }], width: 10 },
  findMarkerText: { color: "#ffffff", fontSize: 9, fontWeight: "900" },
  heroBottom: { marginTop: "auto", zIndex: 3 },
  routeHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  routeKicker: { color: gameTheme.colors.accentStrong, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  routeMeta: { color: "#e1ece6", fontSize: 8, fontWeight: "800", marginTop: 2 },
  routeGoal: { color: "#f7f5e9", fontSize: 7.5, fontWeight: "800", lineHeight: 10, marginTop: 3, maxWidth: 235 },
  routeOutcome: { color: "#f7e8a2", fontSize: 6.8, fontWeight: "800", marginTop: 2, maxWidth: 235 },
  movementChip: { alignItems: "flex-end", backgroundColor: "rgba(5,23,17,0.80)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 12, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  movementValue: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  movementLabel: { color: gameTheme.colors.textMuted, fontSize: 6.5, fontWeight: "900", letterSpacing: 0.6, marginTop: 1 },
  routePath: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8, position: "relative" },
  routeTrack: { backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 99, height: 5, left: 5, overflow: "hidden", position: "absolute", right: 5 },
  routeFill: { borderRadius: 99, height: "100%" },
  routeNode: { backgroundColor: "#173329", borderColor: "rgba(255,255,255,0.60)", borderRadius: 7, borderWidth: 2, height: 14, width: 14 },
  routeNodeCurrent: { borderColor: gameTheme.colors.accentStrong, borderWidth: 3, transform: [{ scale: 1.18 }] },
  movementRoute: { height: 27, marginTop: 2, position: "relative" },
  movementTrack: { backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 99, bottom: 5, height: 4, left: 4, overflow: "hidden", position: "absolute", right: 4 },
  movementFill: { borderRadius: 99, height: "100%" },
  movementBug: { bottom: -7, position: "absolute" },
  weekMeta: { color: "rgba(255,255,255,0.76)", fontSize: 7, fontWeight: "800", marginTop: 3, textAlign: "center" },
  biomeScroll: { marginHorizontal: -2, marginTop: 6 },
  biomeRail: { flexDirection: "row", gap: 6, paddingHorizontal: 2, paddingRight: 12 },
  thumbnail: { backgroundColor: "#102a20", borderColor: "rgba(255,255,255,0.16)", borderRadius: 12, borderWidth: 1, minHeight: 54, overflow: "hidden", position: "relative", width: 92 },
  thumbnailTablet: { minHeight: 68, width: 116 },
  thumbnailShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,15,10,0.30)" },
  lockedOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: "rgba(3,18,13,0.58)", justifyContent: "center" },
  lockGlyph: { alignItems: "center", height: 24, justifyContent: "flex-end", width: 22 },
  lockShackle: { borderColor: "rgba(255,255,255,0.68)", borderRadius: 8, borderWidth: 2, height: 13, position: "absolute", top: 1, width: 14 },
  lockBody: { alignItems: "center", backgroundColor: "rgba(8,28,21,0.94)", borderColor: "rgba(255,255,255,0.68)", borderRadius: 5, borderWidth: 1.5, height: 14, justifyContent: "center", width: 20 },
  lockKeyhole: { backgroundColor: gameTheme.colors.accentStrong, borderRadius: 2, height: 5, width: 3 },
  thumbnailLabelRow: { alignItems: "center", backgroundColor: "rgba(3,18,13,0.78)", bottom: 0, flexDirection: "row", justifyContent: "space-between", left: 0, paddingHorizontal: 6, paddingVertical: 4, position: "absolute", right: 0 },
  thumbnailLabel: { color: "#ffffff", flex: 1, fontSize: 7.5, fontWeight: "900" },
  thumbnailTier: { color: gameTheme.colors.accentStrong, fontSize: 7, fontWeight: "900" },
  pressed: { opacity: 0.82 }
});
