import React from "react";
import { StyleSheet, View } from "react-native";

export function AppBackground() {
  return (
    <View pointerEvents="none" style={styles.background}>
      <View style={styles.headerBand} />
      <View style={styles.midBand} />
      <View style={styles.trackOne} />
      <View style={styles.trackTwo} />
      <View style={styles.footerBand} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#eef4ed"
  },
  headerBand: {
    backgroundColor: "#dbead8",
    height: 170,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  midBand: {
    backgroundColor: "#f8fbf5",
    height: 360,
    left: -40,
    position: "absolute",
    right: -40,
    top: 142,
    transform: [{ rotate: "-6deg" }]
  },
  trackOne: {
    backgroundColor: "#c9d9c4",
    height: 2,
    left: 22,
    opacity: 0.65,
    position: "absolute",
    right: 70,
    top: 310,
    transform: [{ rotate: "-6deg" }]
  },
  trackTwo: {
    backgroundColor: "#c9d9c4",
    height: 2,
    left: 80,
    opacity: 0.5,
    position: "absolute",
    right: 24,
    top: 570,
    transform: [{ rotate: "5deg" }]
  },
  footerBand: {
    backgroundColor: "#e3ede1",
    bottom: 0,
    height: 180,
    left: 0,
    position: "absolute",
    right: 0
  }
});
