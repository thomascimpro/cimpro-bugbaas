import React, { useEffect, useRef } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  const scale = useRef(new Animated.Value(0.84)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!badge) return;
    playBugSound("bug_rare_unlock");
    scale.setValue(0.84);
    glow.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { friction: 5, tension: 92, toValue: 1, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { duration: 720, toValue: 1, useNativeDriver: true }),
          Animated.timing(glow, { duration: 720, toValue: 0, useNativeDriver: true })
        ]),
        { iterations: 2 }
      )
    ]).start();
  }, [badge, glow, scale]);

  if (!badge) return null;

  const badgeArt = getBadgeArtSource(badge.id);
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.2] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.36, 0.74] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(badge)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
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
    backgroundColor: "rgba(16,32,24,0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 3,
    maxWidth: 440,
    overflow: "hidden",
    padding: 22,
    width: "100%"
  },
  topBar: {
    backgroundColor: "#d7bd57",
    height: 8,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  kicker: {
    color: "#8a6d12",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textTransform: "uppercase"
  },
  title: {
    color: "#102018",
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
    backgroundColor: "#f4d76a",
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
    color: "#102018",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 12,
    textAlign: "center"
  },
  body: {
    color: "#53645d",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    marginTop: 18,
    minWidth: 150,
    paddingHorizontal: 22,
    paddingVertical: 13
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
