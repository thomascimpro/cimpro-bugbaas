import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { InsectVariant } from "../services/pointsService";

type Props = {
  size?: number;
  variant?: InsectVariant;
  direction?: "right" | "left";
};

const palette: Record<InsectVariant, { body: string; shell: string; leg: string }> = {
  larva: { body: "#7b8f6a", shell: "#dce8cb", leg: "#3b4b34" },
  beetle: { body: "#2f6b4f", shell: "#5aa27c", leg: "#12382a" },
  grasshopper: { body: "#587c2d", shell: "#9bc45f", leg: "#263914" },
  dragonfly: { body: "#356d7c", shell: "#9bd7df", leg: "#163845" },
  ladybug: { body: "#b83227", shell: "#f2675a", leg: "#17211c" },
  crawler: { body: "#6b5f2f", shell: "#c7a94c", leg: "#3c3216" }
};

export function WalkingBug({ size = 34, variant = "beetle", direction = "right" }: Props) {
  const step = useRef(new Animated.Value(0)).current;
  const colors = palette[variant];
  const scale = size / 34;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(step, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(step, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [step]);

  const legSwingA = useMemo(
    () =>
      step.interpolate({
        inputRange: [0, 1],
        outputRange: ["-18deg", "20deg"]
      }),
    [step]
  );
  const legSwingB = useMemo(
    () =>
      step.interpolate({
        inputRange: [0, 1],
        outputRange: ["20deg", "-18deg"]
      }),
    [step]
  );
  const lift = step.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -1.2 * scale, 0]
  });

  return (
    <Animated.View style={[styles.wrap, { width: size * 1.5, height: size }, { transform: [{ scaleX: direction === "right" ? 1 : -1 }, { translateY: lift }] }]}>
      <View style={[styles.shadow, { width: size * 0.9, left: size * 0.3 }]} />
      <Animated.View style={[styles.leg, styles.frontTop, { backgroundColor: colors.leg, transform: [{ rotate: legSwingA }] }]} />
      <Animated.View style={[styles.leg, styles.midBottom, { backgroundColor: colors.leg, transform: [{ rotate: legSwingB }] }]} />
      <Animated.View style={[styles.leg, styles.backTop, { backgroundColor: colors.leg, transform: [{ rotate: legSwingB }] }]} />
      <Animated.View style={[styles.leg, styles.frontBottom, { backgroundColor: colors.leg, transform: [{ rotate: legSwingB }] }]} />
      <Animated.View style={[styles.leg, styles.midTop, { backgroundColor: colors.leg, transform: [{ rotate: legSwingA }] }]} />
      <Animated.View style={[styles.leg, styles.backBottom, { backgroundColor: colors.leg, transform: [{ rotate: legSwingA }] }]} />
      <View style={[styles.body, { backgroundColor: colors.shell, width: size * 0.82, height: size * 0.46, borderRadius: size * 0.24, left: size * 0.32, top: size * 0.23 }]}>
        <View style={[styles.backShell, { backgroundColor: colors.body }]} />
        <View style={[styles.bodyLine, { backgroundColor: colors.leg }]} />
      </View>
      <View style={[styles.head, { backgroundColor: colors.leg, width: size * 0.27, height: size * 0.25, borderRadius: size * 0.13, left: size * 1.02, top: size * 0.28 }]} />
      <View style={[styles.antenna, styles.antennaTop, { backgroundColor: colors.leg }]} />
      <View style={[styles.antenna, styles.antennaBottom, { backgroundColor: colors.leg }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative"
  },
  shadow: {
    backgroundColor: "#334238",
    borderRadius: 8,
    bottom: 2,
    height: 4,
    opacity: 0.16,
    position: "absolute"
  },
  body: {
    overflow: "hidden",
    position: "absolute"
  },
  backShell: {
    bottom: 0,
    left: 0,
    opacity: 0.7,
    position: "absolute",
    top: 0,
    width: "42%"
  },
  bodyLine: {
    height: "80%",
    left: "48%",
    opacity: 0.45,
    position: "absolute",
    top: "10%",
    width: 2
  },
  head: {
    position: "absolute"
  },
  antenna: {
    borderRadius: 2,
    height: 2,
    left: "82%",
    position: "absolute",
    width: "20%"
  },
  antennaTop: {
    top: "27%",
    transform: [{ rotate: "-22deg" }]
  },
  antennaBottom: {
    top: "56%",
    transform: [{ rotate: "22deg" }]
  },
  leg: {
    borderRadius: 2,
    height: 3,
    position: "absolute",
    width: "30%"
  },
  frontTop: {
    left: "62%",
    top: "26%"
  },
  frontBottom: {
    left: "62%",
    top: "61%"
  },
  midTop: {
    left: "42%",
    top: "23%"
  },
  midBottom: {
    left: "42%",
    top: "64%"
  },
  backTop: {
    left: "20%",
    top: "28%"
  },
  backBottom: {
    left: "20%",
    top: "59%"
  }
});
