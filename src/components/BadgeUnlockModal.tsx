import React, { useEffect, useRef } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { getBadgeArtSource } from "../services/badgeArt";
import { useI18n } from "../services/i18n";
import { BadgeDefinition } from "../services/pointsService";
import { playBugSound } from "../services/soundService";

type Props = {
  badge: BadgeDefinition | null;
  onClose: () => void;
};

export function BadgeUnlockModal({ badge, onClose }: Props) {
  const { t, tr } = useI18n();
  const { height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.84)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;
    playBugSound("bug_rare_unlock");
    scale.setValue(0.84);
    glow.setValue(0);
    const animation = Animated.parallel([
      Animated.spring(scale, { friction: 5, tension: 92, toValue: 1, useNativeDriver: nativeDriver }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { duration: 720, toValue: 1, useNativeDriver: nativeDriver }),
          Animated.timing(glow, { duration: 720, toValue: 0, useNativeDriver: nativeDriver })
        ]),
        { iterations: 2 }
      )
    ]);
    animation.start();
    return () => animation.stop();
  }, [badge, glow, scale]);

  if (!badge) return null;

  const badgeArt = getBadgeArtSource(badge.id);
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.2] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.36, 0.74] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(badge)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, height < 700 && styles.cardCompact, { transform: [{ scale }] }]}>
          <View style={styles.topBar} />
          <Text style={styles.kicker}>{t("badgeUnlock.kicker")}</Text>
          <Text style={styles.title}>{tr(badge.name)}</Text>
          <View style={styles.stage}>
            <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            {badgeArt ? (
              <Image source={badgeArt} style={styles.badgeImage} resizeMode="contain" />
            ) : (
              <Text style={styles.fallbackBadge}>*</Text>
            )}
          </View>
          <Text style={styles.description}>{t(badge.descriptionKey)}</Text>
          <Text style={styles.body}>{t("badgeUnlock.body")}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{t("badgeUnlock.close")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,12,28,0.76)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fff9e9",
    borderColor: "#f0bd45",
    borderRadius: 28,
    borderWidth: 2,
    elevation: 16,
    maxWidth: 440,
    overflow: "hidden",
    padding: 24,
    shadowColor: "#050817",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    width: "100%"
  },
  cardCompact: {
    paddingBottom: 17,
    paddingTop: 19
  },
  topBar: {
    backgroundColor: "#f0bd45",
    height: 7,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  kicker: {
    color: "#9a6414",
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
    height: 172,
    justifyContent: "center",
    marginTop: 14,
    width: 172
  },
  glow: {
    backgroundColor: "#ffd978",
    borderRadius: 86,
    height: 172,
    position: "absolute",
    width: 172
  },
  badgeImage: {
    height: 150,
    width: 150
  },
  fallbackBadge: {
    color: "#8a6d12",
    fontSize: 88,
    fontWeight: "900"
  },
  description: {
    color: "#15172c",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 12,
    textAlign: "center"
  },
  body: {
    color: "#6f665b",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#6b3fc6",
    borderRadius: 16,
    elevation: 4,
    marginTop: 18,
    minWidth: 150,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: "#392066",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
