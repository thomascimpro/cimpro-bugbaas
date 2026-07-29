import React, { useEffect, useRef } from "react";
import { Animated, ImageBackground, Platform, StyleSheet, View } from "react-native";
import { screenPalette, type ScreenTone } from "../theme/screenTheme";
import { useReducedMotion } from "../theme/useReducedMotion";

const heroBackground = require("../../assets/generated/conservatory-app-background-v1.jpg");

type Props = {
  tone?: ScreenTone;
};

export function AppBackground({ tone = "neutral" }: Props) {
  const palette = screenPalette(tone);
  const reduceMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 0 : 900,
      useNativeDriver: Platform.OS !== "web"
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, reveal]);

  return (
    <View style={[styles.background, { backgroundColor: palette.background }]}>
      <Animated.View style={[styles.heroArt, { opacity: reveal }]}>
        <ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={heroBackground} style={styles.heroArt} />
      </Animated.View>
      <View style={[styles.veil, { backgroundColor: palette.background }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#09251d",
    pointerEvents: "none"
  },
  heroArt: {
    ...StyleSheet.absoluteFillObject
  },
  heroImage: {
    transform: [{ scale: 1.02 }]
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.46
  }
});
