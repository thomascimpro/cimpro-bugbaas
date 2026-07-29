import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { bugCrownGlowPalette, type BugCrownRank } from "../services/bugCrownService";
import { useReducedMotion } from "../theme/useReducedMotion";

type Props = {
  children: React.ReactNode;
  rank: BugCrownRank;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const crownHaloImage = require("../../assets/generated/bug-crown-halo.png");

const crownArtStyleByRank: Record<BugCrownRank, ViewStyle> = {
  none: { opacity: 0 },
  crowned: { opacity: 0.7, transform: [{ scale: 1 }] },
  elite: { opacity: 0.82, transform: [{ scale: 1.04 }] },
  master: { opacity: 0.92, transform: [{ scale: 1.08 }] },
  legend: { opacity: 1, transform: [{ scale: 1.12 }] }
};

export function CrownGlow({ children, rank, size, style }: Props) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const shouldPulse = rank === "elite" || rank === "legend";

  useEffect(() => {
    pulse.stopAnimation();
    if (reducedMotion || !shouldPulse) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { duration: 2600, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(pulse, { duration: 2600, toValue: 0, useNativeDriver: nativeDriver })
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion, shouldPulse]);

  const animatedGlowStyle = shouldPulse && !reducedMotion ? {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.82] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }]
  } : undefined;

  return (
    <View style={[styles.wrap, size ? { height: size, width: size } : null, style]}>
      {rank !== "none" && (
        <View pointerEvents="none" style={[styles.crownArt, crownArtStyleByRank[rank]]}>
          <Image resizeMode="contain" source={crownHaloImage} style={StyleSheet.absoluteFillObject} />
        </View>
      )}
      {rank !== "none" && (
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: bugCrownGlowPalette[rank] }, animatedGlowStyle]}
        />
      )}
      {rank === "master" || rank === "legend" ? <View pointerEvents="none" style={[styles.innerRing, { borderColor: bugCrownGlowPalette[rank] }]} /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative"
  },
  glow: {
    borderRadius: 999,
    bottom: -7,
    left: -7,
    opacity: 0.54,
    position: "absolute",
    right: -7,
    top: -7
  },
  crownArt: {
    height: "145%",
    left: "-22.5%",
    opacity: 0.78,
    position: "absolute",
    top: "-22.5%",
    width: "145%"
  },
  innerRing: {
    borderRadius: 999,
    borderWidth: 1.5,
    bottom: 0,
    left: 0,
    opacity: 0.82,
    position: "absolute",
    right: 0,
    top: 0
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  }
});
