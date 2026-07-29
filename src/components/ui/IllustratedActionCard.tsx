import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { nativeDriver } from "../../services/animationPlatform";
import { gameTheme } from "../../theme/gameTheme";
import { screenPalette, type ScreenTone } from "../../theme/screenTheme";
import { useReducedMotion } from "../../theme/useReducedMotion";

type Props = {
  image: ImageSourcePropType;
  kicker?: string;
  meta?: string;
  onPress: () => void;
  progress?: number;
  title: string;
  tone?: ScreenTone;
};

export function IllustratedActionCard({ image, kicker, meta, onPress, progress, title, tone = "neutral" }: Props) {
  const palette = screenPalette(tone);
  const reducedMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      reveal.setValue(1);
      return;
    }
    const animation = Animated.timing(reveal, {
      duration: gameTheme.motion.reveal,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, reveal]);

  return (
    <Animated.View style={{ opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, { borderColor: palette.border }, pressed && styles.pressed]}>
        <ImageBackground imageStyle={styles.image} resizeMode="cover" source={image} style={styles.art}>
          <View style={styles.shade} />
          <View style={styles.copy}>
            {kicker ? <Text style={[styles.kicker, { color: palette.accent }]}>{kicker}</Text> : null}
            <Text numberOfLines={2} style={styles.title}>{title}</Text>
            {meta ? <Text numberOfLines={2} style={styles.meta}>{meta}</Text> : null}
            {typeof progress === "number" ? (
              <View style={styles.track}><View style={[styles.fill, { backgroundColor: palette.accent, width: `${Math.max(0, Math.min(100, progress))}%` }]} /></View>
            ) : null}
          </View>
          <View style={[styles.arrow, { backgroundColor: palette.accent }]}><Text style={[styles.arrowText, { color: palette.ink }]}>→</Text></View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  arrow: {
    alignItems: "center",
    borderRadius: 18,
    bottom: 12,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 36
  },
  arrowText: { fontSize: 18, fontWeight: "900" },
  art: { minHeight: 152 },
  card: {
    borderRadius: gameTheme.radius.lg,
    borderWidth: 1,
    elevation: 7,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 14
  },
  copy: { flex: 1, justifyContent: "flex-end", padding: 16, paddingRight: 58 },
  fill: { borderRadius: 3, height: "100%" },
  image: { transform: [{ scale: 1.02 }] },
  kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  meta: { color: "rgba(255,255,255,0.78)", fontSize: 11, lineHeight: 15, marginTop: 3 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,8,12,0.52)" },
  title: { color: "#ffffff", fontSize: 21, fontWeight: "900", marginTop: 3 },
  track: { backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 3, height: 5, marginTop: 10, overflow: "hidden" }
});
