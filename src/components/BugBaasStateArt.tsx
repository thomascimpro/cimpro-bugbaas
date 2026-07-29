import React, { useEffect, useRef } from "react";
import { Animated, Image, type ImageSourcePropType, StyleSheet, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { BugBaasIcon, type BugBaasIconName } from "./BugBaasIcon";

export type BugBaasStateArtKind = "empty" | "loading" | "location-denied" | "locked" | "maintenance" | "no-results" | "offline" | "reward-error" | "scan" | "search-error";

type RegistryEntry = {
  fallback: BugBaasIconName;
  source?: ImageSourcePropType;
};

const emptyJar = require("../../assets/new/ChatGPT Image 25 jul 2026, 19_32_10.webp");
const loadingBadge = require("../../assets/generated/bugbaas-splash-badge-hd.webp");

export const stateArtRegistry: Record<BugBaasStateArtKind, RegistryEntry> = {
  empty: { fallback: "empty", source: emptyJar },
  loading: { fallback: "loading", source: loadingBadge },
  "location-denied": { fallback: "location" },
  locked: { fallback: "locked" },
  maintenance: { fallback: "maintenance" },
  "no-results": { fallback: "empty", source: emptyJar },
  offline: { fallback: "offline" },
  "reward-error": { fallback: "reward-error" },
  scan: { fallback: "scan" },
  "search-error": { fallback: "search-error" }
};

type Props = {
  kind: BugBaasStateArtKind;
  size?: number;
};

export function BugBaasStateArt({ kind, size = 112 }: Props) {
  const entry = stateArtRegistry[kind];
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, { duration: 1500, toValue: 1, useNativeDriver: nativeDriver }),
        Animated.timing(motion, { duration: 1500, toValue: 0, useNativeDriver: nativeDriver })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [motion]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.slot, { height: size, width: size }]}>
      <Animated.View
        style={{
          opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
          transform: [{ translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
        }}
      >
        {entry.source ? (
          <Image resizeMode="contain" source={entry.source} style={{ height: size, width: size }} />
        ) : (
          <BugBaasIcon name={entry.fallback} size={Math.round(size * 0.72)} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    justifyContent: "center"
  }
});
