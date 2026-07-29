import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { gameTheme } from "../theme/gameTheme";
import { useReducedMotion } from "../theme/useReducedMotion";

const splashBadge = require("../../assets/generated/bugbaas-splash-badge-hd.webp");

export function AppLoadingScreen() {
  const reduceMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  const loadingMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      loadingMotion.setValue(0.5);
      return;
    }
    const reveal = Animated.spring(entrance, {
      damping: 15,
      mass: 0.8,
      stiffness: 120,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    const loadingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingMotion, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: nativeDriver
        }),
        Animated.timing(loadingMotion, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: nativeDriver
        })
      ])
    );
    reveal.start();
    loadingLoop.start();
    return () => {
      reveal.stop();
      loadingLoop.stop();
    };
  }, [entrance, loadingMotion, reduceMotion]);

  return (
    <View accessibilityLabel="BugBaas is loading" accessibilityRole="progressbar" style={styles.screen}>
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: entrance,
            transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }]
          }
        ]}
      >
        <View style={styles.orbit}>
          <View style={[styles.orbitDot, styles.orbitDotTop]} />
          <View style={[styles.orbitDot, styles.orbitDotBottom]} />
        </View>
        <View style={styles.glow} />
        <Image resizeMode="contain" source={splashBadge} style={styles.badge} />
      </Animated.View>

      <Text style={styles.brand}>BUGBAAS</Text>
      <Text style={styles.subtitle}>Preparing your next field mission</Text>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              opacity: loadingMotion.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }),
              transform: [{ translateX: loadingMotion.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }]
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 142,
    width: 142
  },
  brand: {
    color: gameTheme.colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 2.8,
    marginTop: 22
  },
  glow: {
    backgroundColor: gameTheme.colors.accent,
    borderRadius: 90,
    height: 156,
    position: "absolute",
    width: 156
  },
  orbit: {
    borderColor: "rgba(244, 220, 131, 0.46)",
    borderRadius: 98,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 190,
    position: "absolute",
    width: 190
  },
  orbitDot: {
    backgroundColor: gameTheme.colors.accentStrong,
    borderColor: "#173126",
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    left: 87,
    position: "absolute",
    width: 12
  },
  orbitDotBottom: {
    bottom: -6
  },
  orbitDotTop: {
    top: -6
  },
  progressFill: {
    alignSelf: "center",
    backgroundColor: gameTheme.colors.accentStrong,
    borderRadius: 4,
    height: "100%",
    width: 44
  },
  progressTrack: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 4,
    height: 5,
    marginTop: 18,
    overflow: "hidden",
    width: 112
  },
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  stage: {
    alignItems: "center",
    height: 194,
    justifyContent: "center",
    width: 194
  },
  subtitle: {
    color: gameTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 4
  }
});
