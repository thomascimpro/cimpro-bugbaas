import React, { useEffect, useRef } from "react";
import { Animated, ImageBackground, StyleSheet, View } from "react-native";

const heroBackground = require("../../assets/generated/bugbaas-hero-background-hd.jpg");

export function AppBackground() {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 7600,
          useNativeDriver: true
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 7600,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [drift]);

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10]
  });

  return (
    <View pointerEvents="none" style={styles.background}>
      <ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={heroBackground} style={styles.heroArt} />
      <View style={styles.veil} />
      <View style={styles.headerBand} />
      <View style={styles.midBand} />
      <Animated.View style={[styles.lightSweep, { transform: [{ translateY }, { rotate: "-6deg" }] }]} />
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
  heroArt: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34
  },
  heroImage: {
    transform: [{ scale: 1.04 }]
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(238,244,237,0.58)"
  },
  headerBand: {
    backgroundColor: "rgba(219,234,216,0.66)",
    height: 170,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  midBand: {
    backgroundColor: "rgba(248,251,245,0.78)",
    height: 360,
    left: -40,
    position: "absolute",
    right: -40,
    top: 142,
    transform: [{ rotate: "-6deg" }]
  },
  lightSweep: {
    backgroundColor: "rgba(255,255,255,0.28)",
    height: 86,
    left: -40,
    position: "absolute",
    right: -40,
    top: 210
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
    backgroundColor: "rgba(227,237,225,0.72)",
    bottom: 0,
    height: 180,
    left: 0,
    position: "absolute",
    right: 0
  }
});
