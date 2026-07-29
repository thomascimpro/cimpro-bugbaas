import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { useI18n } from "../services/i18n";
import { type UserTier } from "../services/pointsService";
import { playBugSound } from "../services/soundService";
import { BugArtImage } from "./BugArtImage";

type Props = {
  tier: UserTier | null;
  onClose: () => void;
};

export function RankUpModal({ tier, onClose }: Props) {
  const { t, tr } = useI18n();
  const { height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.84)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tier) return;
    playBugSound("bug_rare_unlock");
    scale.setValue(0.84);
    glow.setValue(0);
    const animation = Animated.parallel([
      Animated.spring(scale, { friction: 5, tension: 90, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { duration: 780, toValue: 1, useNativeDriver: nativeDriver }),
          Animated.timing(glow, { duration: 780, toValue: 0, useNativeDriver: nativeDriver })
        ]),
        { iterations: 2 }
      )
    ]);
    animation.start();
    return () => animation.stop();
  }, [glow, scale, tier]);

  if (!tier) return null;

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.72] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(tier)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, height < 700 && styles.cardCompact, { borderColor: tier.frameColor, transform: [{ scale }] }]}>
          <View style={[styles.topBar, { backgroundColor: tier.frameColor }]} />
          <Text style={[styles.kicker, { color: tier.frameColor }]}>{t("rankup.kicker")}</Text>
          <Text style={styles.title}>{tr(tier.title)}</Text>
          <View style={[styles.stage, { backgroundColor: tier.frameBackground }]}>
            <Animated.View style={[styles.glow, { backgroundColor: tier.frameAccent, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={Math.max(96, tier.bugSize)} />
          </View>
          <Text style={styles.body}>{t("rankup.body", { points: tier.minPoints })}</Text>
          <Text style={[styles.reward, { color: tier.frameColor }]}>{tr(tier.rewardText)}</Text>
          <Pressable style={[styles.button, { backgroundColor: tier.frameColor }]} onPress={onClose}>
            <Text style={styles.buttonText}>{t("rankup.close")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,12,28,0.78)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    alignItems: "center",
    backgroundColor: "#f8f4ff",
    borderRadius: 28,
    borderWidth: 2,
    elevation: 16,
    maxWidth: 440,
    overflow: "hidden",
    padding: 24,
    shadowColor: "#050817",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    width: "100%"
  },
  cardCompact: {
    paddingBottom: 17,
    paddingTop: 19
  },
  topBar: {
    height: 8,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  kicker: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textTransform: "uppercase"
  },
  title: {
    color: "#15172c",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  stage: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 168,
    justifyContent: "center",
    marginTop: 14,
    overflow: "hidden",
    width: 168
  },
  glow: {
    borderRadius: 80,
    height: 160,
    position: "absolute",
    width: 160
  },
  body: {
    color: "#666177",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 14,
    textAlign: "center"
  },
  reward: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    borderRadius: 16,
    elevation: 4,
    marginTop: 18,
    minWidth: 160,
    paddingHorizontal: 22,
    paddingVertical: 13
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
