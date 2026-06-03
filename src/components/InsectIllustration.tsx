import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  size?: number;
  variant?: "larva" | "beetle" | "grasshopper" | "dragonfly" | "ladybug" | "crawler";
  evolutionLevel?: number;
};

const palette = {
  larva: { body: "#7b8f6a", shell: "#dce8cb", dot: "#3b4b34" },
  beetle: { body: "#2f6b4f", shell: "#5aa27c", dot: "#12382a" },
  grasshopper: { body: "#587c2d", shell: "#9bc45f", dot: "#263914" },
  dragonfly: { body: "#356d7c", shell: "#9bd7df", dot: "#163845" },
  ladybug: { body: "#b83227", shell: "#f2675a", dot: "#17211c" },
  crawler: { body: "#6b5f2f", shell: "#c7a94c", dot: "#3c3216" }
};

export function InsectIllustration({ size = 56, variant = "beetle", evolutionLevel = 2 }: Props) {
  const colors = palette[variant];
  const scale = size / 56;
  const level = Math.max(1, Math.min(5, evolutionLevel));
  const hasWings = level >= 4 || variant === "dragonfly";
  const hasCrown = level >= 5;

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2, backgroundColor: level >= 4 ? "#edf7f8" : "#eef5ee" }]}>
      {level >= 3 && <View style={[styles.aura, { borderColor: colors.shell, height: size * 0.86, width: size * 0.86, borderRadius: size * 0.43 }]} />}
      {hasWings && (
        <>
          <View style={[styles.wing, styles.leftWing, { backgroundColor: colors.shell, height: size * 0.34, width: size * 0.38, borderRadius: size * 0.18 }]} />
          <View style={[styles.wing, styles.rightWing, { backgroundColor: colors.shell, height: size * 0.34, width: size * 0.38, borderRadius: size * 0.18 }]} />
        </>
      )}
      <View style={[styles.leg, styles.legLeftTop, { transform: [{ rotate: "-28deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legLeftBottom, { transform: [{ rotate: "28deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legRightTop, { transform: [{ rotate: "28deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legRightBottom, { transform: [{ rotate: "-28deg" }, { scale }] }]} />
      <View style={[styles.body, { backgroundColor: colors.body, width: size * 0.56, height: size * 0.64, borderRadius: size * 0.28 }]}>
        <View style={[styles.shell, { backgroundColor: colors.shell }]} />
        {level >= 3 && <View style={[styles.shellPlate, { backgroundColor: colors.body }]} />}
        <View style={[styles.centerLine, { backgroundColor: colors.dot }]} />
        <View style={[styles.dot, styles.dotA, { backgroundColor: colors.dot }]} />
        <View style={[styles.dot, styles.dotB, { backgroundColor: colors.dot }]} />
        {level >= 2 && <View style={[styles.dot, styles.dotC, { backgroundColor: colors.dot }]} />}
        {level >= 4 && <View style={[styles.dot, styles.dotD, { backgroundColor: colors.dot }]} />}
      </View>
      {hasCrown && (
        <View style={[styles.crown, { top: size * 0.05 }]}>
          <View style={[styles.crownSpike, { backgroundColor: "#d7bd57" }]} />
          <View style={[styles.crownSpike, styles.crownSpikeTall, { backgroundColor: "#d7bd57" }]} />
          <View style={[styles.crownSpike, { backgroundColor: "#d7bd57" }]} />
        </View>
      )}
      <View style={[styles.head, { backgroundColor: colors.dot, width: size * 0.28, height: size * 0.22, borderRadius: size * 0.12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"
  },
  aura: {
    borderWidth: 2,
    opacity: 0.48,
    position: "absolute"
  },
  wing: {
    opacity: 0.42,
    position: "absolute",
    top: "28%"
  },
  leftWing: {
    left: 1,
    transform: [{ rotate: "-28deg" }]
  },
  rightWing: {
    right: 1,
    transform: [{ rotate: "28deg" }]
  },
  body: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9
  },
  shellPlate: {
    borderRadius: 20,
    height: "42%",
    opacity: 0.18,
    position: "absolute",
    top: "8%",
    width: "70%"
  },
  centerLine: {
    height: "90%",
    opacity: 0.6,
    position: "absolute",
    width: 2
  },
  head: {
    marginTop: -2
  },
  dot: {
    borderRadius: 10,
    height: 5,
    position: "absolute",
    width: 5
  },
  dotA: {
    left: 8,
    top: 13
  },
  dotB: {
    right: 8,
    bottom: 12
  },
  dotC: {
    right: 10,
    top: 14
  },
  dotD: {
    bottom: 13,
    left: 10
  },
  crown: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 2,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    width: 34,
    zIndex: 2
  },
  crownSpike: {
    borderRadius: 2,
    height: 10,
    width: 7
  },
  crownSpikeTall: {
    height: 15
  },
  leg: {
    backgroundColor: "#17211c",
    borderRadius: 2,
    height: 3,
    position: "absolute",
    width: 22
  },
  legLeftTop: {
    left: 4,
    top: 20
  },
  legLeftBottom: {
    bottom: 18,
    left: 4
  },
  legRightTop: {
    right: 4,
    top: 20
  },
  legRightBottom: {
    bottom: 18,
    right: 4
  }
});
