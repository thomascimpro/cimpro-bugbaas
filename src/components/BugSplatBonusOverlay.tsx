import React, { useEffect, useMemo } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { allBugArtIds, BugArtId } from "../services/bugArt";
import { useI18n } from "../services/i18n";
import { BugArtImage } from "./BugArtImage";

type BonusBug = {
  bugId: BugArtId;
  delay: number;
  duration: number;
  drift: number;
  lane: number;
  size: number;
  direction: "left" | "right";
};

type Props = {
  visible: boolean;
  onSkip: () => void;
};

const autoCloseMs = 8000;

export function BugSplatBonusOverlay({ visible, onSkip }: Props) {
  const { t } = useI18n();
  const { height, width } = useWindowDimensions();
  const tracks = useMemo(
    () =>
      allBugArtIds.slice(0, 16).map((bugId, index) => ({
        bugId,
        delay: (index % 8) * 210,
        direction: index % 2 === 0 ? "right" as const : "left" as const,
        drift: 22 + (index % 5) * 12,
        duration: 4700 + (index % 9) * 520,
        lane: 0.12 + ((index * 0.137) % 0.72),
        progress: new Animated.Value(0),
        size: 36 + (index % 6) * 5
      })),
    []
  );

  useEffect(() => {
    if (!visible) return;
    tracks.forEach((track) => track.progress.setValue(0));
  }, [tracks, visible]);

  useEffect(() => {
    if (!visible) return;
    const animations = tracks.map((track) => {
      const animation = Animated.sequence([
          Animated.delay(track.delay),
          Animated.timing(track.progress, {
            duration: track.duration,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: nativeDriver
          })
        ]);
      animation.start();
      return animation;
    });
    return () => animations.forEach((animation) => animation.stop());
  }, [tracks, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onSkip, autoCloseMs);
    return () => clearTimeout(timer);
  }, [onSkip, visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onSkip}>
      <Pressable style={styles.backdrop} onPress={onSkip}>
        <View pointerEvents="none" style={styles.skyGlow} />
        <View pointerEvents="none" style={styles.groundGlow} />
        <View style={styles.header}>
          <View style={styles.rewardSeal}><Text style={styles.rewardSealText}>+</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t("splat.saved")}</Text>
            <Text style={styles.meta}>{t("splat.reward")}</Text>
          </View>
        </View>
        {tracks.map((track, index) => {
          const translateX = track.progress.interpolate({
            inputRange: [0, 1],
            outputRange: track.direction === "right" ? [-90, width + 90] : [width + 90, -90]
          });
          const translateY = track.progress.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, track.drift, -track.drift * 0.75, track.drift * 0.55, 0]
          });
          const rotate = track.progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: track.direction === "right" ? ["72deg", "104deg", "82deg"] : ["-72deg", "-104deg", "-82deg"]
          });
          const scale = track.progress.interpolate({
            inputRange: [0, 0.18, 0.82, 1],
            outputRange: [0.72, 1, 1, 0.72]
          });
          const opacity = track.progress.interpolate({
            inputRange: [0, 0.08, 0.9, 1],
            outputRange: [0, 1, 1, 0]
          });
          return (
            <Animated.View
              key={`${track.bugId}-${index}`}
              style={[
                styles.bug,
                {
                  top: height * track.lane,
                  opacity,
                  transform: [{ translateX }, { translateY }, { rotate }, { scale }]
                }
              ]}
            >
              <View style={styles.hitbox}>
                <BugArtImage bugId={track.bugId} size={track.size} />
              </View>
            </Animated.View>
          );
        })}
        <View style={styles.skipButton}>
          <Text style={styles.skipText}>{t("splat.tap")}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,19,43,0.97)",
    overflow: "hidden"
  },
  skyGlow: {
    backgroundColor: "#51408b",
    borderRadius: 280,
    height: 420,
    left: -100,
    opacity: 0.34,
    position: "absolute",
    top: -170,
    width: 560
  },
  groundGlow: {
    backgroundColor: "#e3ad44",
    borderRadius: 260,
    bottom: -260,
    height: 420,
    opacity: 0.18,
    position: "absolute",
    right: -130,
    width: 520
  },
  header: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(24,27,58,0.94)",
    borderColor: "#e1b753",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    top: 54,
    width: "90%",
    zIndex: 4
  },
  rewardSeal: {
    alignItems: "center",
    backgroundColor: "#e1b753",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginRight: 12,
    width: 44
  },
  rewardSealText: {
    color: "#171a35",
    fontSize: 25,
    fontWeight: "900"
  },
  headerCopy: {
    flex: 1
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  meta: {
    color: "#e1b753",
    fontSize: 13,
    fontWeight: "900"
  },
  bug: {
    position: "absolute"
  },
  hitbox: {
    alignItems: "center",
    justifyContent: "center"
  },
  skipButton: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    borderWidth: 1,
    bottom: 26,
    paddingHorizontal: 18,
    paddingVertical: 9,
    position: "absolute",
    zIndex: 5
  },
  skipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  }
});
