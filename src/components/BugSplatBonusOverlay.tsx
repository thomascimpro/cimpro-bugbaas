import React, { useEffect, useMemo, useRef, useState } from "react";
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
  taps: number;
  direction: "left" | "right";
};

type Props = {
  visible: boolean;
  onSplat: () => void;
  onSkip: () => void;
};

export function BugSplatBonusOverlay({ visible, onSplat, onSkip }: Props) {
  const { height, width } = useWindowDimensions();
  const [splatted, setSplatted] = useState<Record<number, boolean>>({});
  const [hits, setHits] = useState<Record<number, number>>({});
  const tracks = useMemo(
    () =>
      allBugArtIds.map((bugId, index) => ({
        bugId,
        delay: (index % 8) * 210,
        direction: index % 2 === 0 ? "right" as const : "left" as const,
        drift: 26 + (index % 5) * 13,
        duration: 5400 + (index % 9) * 620,
        lane: 0.12 + ((index * 0.137) % 0.72),
        progress: new Animated.Value(0),
        size: 34 + (index % 7) * 5,
        taps: index > 25 ? 3 : index > 16 ? 2 : 1
      })),
    []
  );
  const splatCount = Object.values(splatted).filter(Boolean).length;
  const complete = splatCount >= tracks.length;

  useEffect(() => {
    if (!visible) return;
    setSplatted({});
    setHits({});
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
            easing: Easing.linear,
            toValue: 1,
            useNativeDriver: false
          }),
          Animated.timing(track.progress, {
            duration: 0,
            toValue: 0,
            useNativeDriver: false
          })
        ])
      );
      animation.start();
      return animation;
    });
    return () => animations.forEach((animation) => animation.stop());
  }, [tracks, visible]);

  useEffect(() => {
    if (!complete) return;
    const timer = setTimeout(onSkip, 850);
    return () => clearTimeout(timer);
  }, [complete, onSkip]);

  function tapBug(index: number, bug: BonusBug) {
    if (splatted[index]) return;
    const nextHits = (hits[index] ?? 0) + 1;
    if (nextHits < bug.taps) {
      setHits((current) => ({ ...current, [index]: nextHits }));
      return;
    }
    setHits((current) => ({ ...current, [index]: 0 }));
    setSplatted((current) => ({ ...current, [index]: true }));
    onSplat();
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text style={styles.title}>Splat bonus</Text>
          <Text style={styles.meta}>{splatCount}</Text>
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
            outputRange: track.direction === "right" ? ["86deg", "104deg", "88deg"] : ["-86deg", "-104deg", "-88deg"]
          });
          return (
            <Animated.View
              key={`${track.bugId}-${index}`}
              style={[
                styles.bug,
                {
                  top: height * track.lane,
                  transform: [{ translateX }, { translateY }, { rotate }]
                }
              ]}
            >
              <Pressable hitSlop={24} onPress={() => tapBug(index, track)} style={[styles.hitbox, { minHeight: track.size + 44, minWidth: track.size * 2.5 }]}>
                {splatted[index] ? (
                  <SplatMark size={track.size + 24} />
                ) : (
                  <>
                    <BugArtImage bugId={track.bugId} size={track.size} />
                    {track.taps > 1 && hits[index] > 0 && <View style={[styles.damageRing, { height: track.size + 14, width: track.size + 14 }]} />}
                  </>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>{complete ? "Klaar" : "Skip"}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function SplatMark({ size }: { size: number }) {
  return (
    <View style={[styles.splat, { height: size, width: size }]}>
      <View style={[styles.splatBlob, styles.splatCenter]} />
      <View style={[styles.splatBlob, styles.splatTop]} />
      <View style={[styles.splatBlob, styles.splatRight]} />
      <View style={[styles.splatBlob, styles.splatBottom]} />
      <View style={[styles.splatBlob, styles.splatLeft]} />
    </View>
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
  damageRing: {
    borderColor: "#b83227",
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.75,
    position: "absolute"
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
  },
  splat: {
    alignItems: "center",
    justifyContent: "center"
  },
  splatBlob: {
    backgroundColor: "#2b3a28",
    position: "absolute"
  },
  splatCenter: {
    borderRadius: 18,
    height: 34,
    opacity: 0.9,
    transform: [{ rotate: "-12deg" }],
    width: 40
  },
  splatTop: {
    borderRadius: 10,
    height: 20,
    opacity: 0.72,
    top: 5,
    transform: [{ rotate: "22deg" }],
    width: 14
  },
  splatRight: {
    borderRadius: 12,
    height: 18,
    opacity: 0.72,
    right: 7,
    transform: [{ rotate: "-18deg" }],
    width: 26
  },
  splatBottom: {
    borderRadius: 10,
    bottom: 6,
    height: 16,
    opacity: 0.66,
    transform: [{ rotate: "12deg" }],
    width: 22
  },
  splatLeft: {
    borderRadius: 10,
    height: 18,
    left: 7,
    opacity: 0.7,
    transform: [{ rotate: "18deg" }],
    width: 24
  }
});
