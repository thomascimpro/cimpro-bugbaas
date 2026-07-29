import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { MainDestination } from "../navigation/appNavigation";
import { useI18n } from "../services/i18n";
import { gameTheme } from "../theme/gameTheme";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { bottomNavItems } from "./BottomNavModel";
import { NavigationArt, type NavigationArtName } from "./NavigationArt";

const scanMedallion = require("../../assets/generated/bugbaas-scan-medallion-v1.png");

type NavBadges = Partial<Record<MainDestination, number>>;

type Props = {
  activeDestination?: MainDestination;
  badges?: NavBadges;
  onNavigate: (destination: MainDestination) => void;
};

const destinationColors: Record<MainDestination, { accent: string; soft: string }> = {
  world: { accent: "#f4c45f", soft: "rgba(244,196,95,0.16)" },
  scan: { accent: "#68e1e8", soft: "rgba(104,225,232,0.16)" },
  play: { accent: "#c897ff", soft: "rgba(200,151,255,0.16)" },
  collection: { accent: "#78b8ff", soft: "rgba(120,184,255,0.16)" }
};

export function BottomNav({ activeDestination, badges = {}, onNavigate }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const isRail = layout.navigationMode === "rail";
  const edgeInset = layout.bottomNavInset;
  const artSize = isRail ? 42 : layout.isTablet ? 39 : layout.isCompact ? 31 : 34;
  const activeArtSize = artSize + (isRail ? 4 : 3);

  return (
    <View
      style={[
        styles.wrap,
        isRail
          ? {
              bottom: 24,
              flexDirection: "column",
              left: 20,
              paddingHorizontal: 7,
              paddingVertical: 12,
              top: 96,
              width: layout.navigationRailWidth
            }
          : {
              bottom: layout.isTablet ? 16 : 10,
              left: edgeInset,
              minHeight: layout.bottomNavHeight,
              paddingHorizontal: layout.isTablet ? 14 : 7,
              right: edgeInset
            }
      ]}
      testID="bottom-nav"
    >
      <View pointerEvents="none" style={styles.topHighlight} />
      {bottomNavItems.map((item) => {
        const active = activeDestination === item.route;
        const scan = item.route === "scan";
        const badgeCount = Math.max(0, Math.floor(badges[item.route] ?? 0));
        const color = destinationColors[item.route];

        return (
          <Pressable
            accessibilityLabel={t(item.labelKey)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item.route}
            onPress={() => onNavigate(item.route)}
            style={({ pressed }) => [
              styles.item,
              { minHeight: isRail ? 74 : layout.bottomNavHeight - 10 },
              isRail && styles.railItem,
              pressed && styles.pressed
            ]}
          >
            {active ? <View pointerEvents="none" style={[styles.activeCapsule, { backgroundColor: color.soft, borderColor: color.accent }]} /> : null}
            <View
              style={[
                styles.navArtwork,
                active && styles.activeArtwork
              ]}
            >
              {scan ? (
                <Image
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  resizeMode="contain"
                  source={scanMedallion}
                  style={{ height: active ? activeArtSize : artSize, width: active ? activeArtSize : artSize }}
                />
              ) : (
                <NavigationArt
                  active={active}
                  name={item.route as NavigationArtName}
                  size={active ? activeArtSize : artSize}
                />
              )}
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                </View>
              ) : null}
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={[
                styles.label,
                { fontSize: layout.isTablet ? 11.5 : layout.isCompact ? 8.5 : 9.5 },
                active && styles.activeLabel,
                active && { color: color.accent }
              ]}
            >
              {t(item.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: "rgba(17,25,35,0.96)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 28,
    borderWidth: 1,
    elevation: 60,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 72,
    overflow: "visible",
    paddingBottom: 5,
    paddingTop: 7,
    position: "absolute",
    shadowColor: "#06130e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    zIndex: 2000
  },
  topHighlight: {
    backgroundColor: "rgba(255,241,177,0.18)",
    borderRadius: 1,
    height: 1,
    left: 24,
    position: "absolute",
    right: 24,
    top: 1
  },
  item: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 3,
    position: "relative"
  },
  railItem: {
    flex: 1,
    maxHeight: 94,
    width: "100%"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }]
  },
  activeCapsule: {
    backgroundColor: "rgba(246,222,132,0.14)",
    borderColor: "rgba(246,222,132,0.34)",
    borderRadius: 20,
    borderWidth: 1,
    bottom: 2,
    left: 3,
    position: "absolute",
    right: 3,
    top: 2
  },
  navArtwork: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: 48
  },
  activeArtwork: {
    transform: [{ translateY: -1 }, { scale: 1.04 }]
  },
  label: {
    color: "#a9bdb3",
    fontWeight: "900",
    letterSpacing: 0.1,
    maxWidth: "100%"
  },
  activeLabel: {
    color: "#ffe88c"
  },
  badge: {
    alignItems: "center",
    backgroundColor: gameTheme.colors.danger,
    borderColor: "#fff5c9",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 4,
    position: "absolute",
    right: -5,
    top: -4
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900"
  }
});
