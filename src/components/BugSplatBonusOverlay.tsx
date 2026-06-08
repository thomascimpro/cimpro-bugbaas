import React, { useEffect, useMemo } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { allBugArtIds, BugArtId } from "../services/bugArt";
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
  const { height, width } = useWindowDimensions();
  const tracks = useMemo(
    () =>
      allBugArtIds.slice(0, 36).map((bugId, index) => ({
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
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(track.delay),
          Animated.timing(track.progress, {
            duration: track.duration,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: true
          }),
          Animated.timing(track.progress, {
            duration: 0,
            toValue: 0,
            useNativeDriver: true
          })
        ])
      );
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
        <View style={styles.header}>
          <Text style={styles.title}>Bugmelding opgeslagen</Text>
          <Text style={styles.meta}>BugDex reward onderweg</Text>
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
          <Text style={styles.skipText}>Tik om door te gaan</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(238,246,237,0.94)",
    overflow: "hidden"
  },
  header: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    right: 18,
    top: 54,
    zIndex: 4
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  meta: {
    color: "#d7bd57",
    fontSize: 14,
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
    backgroundColor: "rgba(16,32,24,0.78)",
    borderRadius: 8,
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
