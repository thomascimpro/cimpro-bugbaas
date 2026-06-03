import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from "react-native";
import { InsectVariant } from "../services/pointsService";
import { WalkingBug } from "./WalkingBug";

type BugPath = {
  delay: number;
  duration: number;
  top: number;
  size: number;
  variant: InsectVariant;
  direction: "right" | "left";
};

const paths: BugPath[] = [
  { delay: 400, duration: 17000, top: 0.2, size: 34, variant: "beetle", direction: "right" },
  { delay: 3600, duration: 21000, top: 0.53, size: 30, variant: "crawler", direction: "left" },
  { delay: 7200, duration: 19000, top: 0.8, size: 32, variant: "ladybug", direction: "right" }
];

export function WalkingBugsLayer() {
  const { width, height } = Dimensions.get("window");
  const [splatted, setSplatted] = useState<Record<number, boolean>>({});
  const splatTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const tracks = useMemo(
    () =>
      paths.map((path) => ({
        ...path,
        progress: new Animated.Value(0)
      })),
    []
  );
  const animations = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    animations.current = tracks.map((track) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(track.delay),
          Animated.timing(track.progress, {
            toValue: 1,
            duration: track.duration,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.timing(track.progress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      );
      animation.start();
      return animation;
    });

    return () => animations.current.forEach((animation) => animation.stop());
  }, [tracks]);

  useEffect(() => {
    return () => splatTimers.current.forEach((timer) => clearTimeout(timer));
  }, []);

  function splatBug(index: number) {
    setSplatted((current) => ({ ...current, [index]: true }));
    const timer = setTimeout(() => {
      setSplatted((current) => ({ ...current, [index]: false }));
    }, 1300);
    splatTimers.current.push(timer);
  }

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {tracks.map((track, index) => {
        const translateX = track.progress.interpolate({
          inputRange: [0, 1],
          outputRange: track.direction === "right" ? [-80, width + 80] : [width + 80, -80]
        });
        return (
          <Animated.View
            key={track.variant}
            style={[
              styles.bug,
              {
                top: height * track.top,
                opacity: splatted[index] ? 0.78 : index === 1 ? 0.28 : 0.32,
                transform: [{ translateX }]
              }
            ]}
          >
            <Pressable hitSlop={12} onPress={() => splatBug(index)} style={[styles.hitbox, { minHeight: track.size + 18, minWidth: track.size * 1.8 }]}>
              {splatted[index] ? <SplatMark size={track.size + 20} /> : <WalkingBug size={track.size} variant={track.variant} direction={track.direction} />}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
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
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0
  },
  bug: {
    position: "absolute"
  },
  hitbox: {
    alignItems: "center",
    justifyContent: "center"
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
    width: 40,
    transform: [{ rotate: "-12deg" }]
  },
  splatTop: {
    borderRadius: 10,
    height: 20,
    opacity: 0.72,
    top: 5,
    width: 14,
    transform: [{ rotate: "22deg" }]
  },
  splatRight: {
    borderRadius: 12,
    height: 18,
    opacity: 0.72,
    right: 7,
    width: 26,
    transform: [{ rotate: "-18deg" }]
  },
  splatBottom: {
    borderRadius: 10,
    bottom: 6,
    height: 16,
    opacity: 0.66,
    width: 22,
    transform: [{ rotate: "12deg" }]
  },
  splatLeft: {
    borderRadius: 10,
    height: 18,
    left: 7,
    opacity: 0.7,
    width: 24,
    transform: [{ rotate: "18deg" }]
  }
});
