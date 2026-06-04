import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from "react-native";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";

type BugPath = {
  delay: number;
  duration: number;
  top: number;
  size: number;
  bugId: BugArtId;
  direction: "right" | "left";
  drift: number;
  opacity: number;
  taps: number;
};

const paths: BugPath[] = [
  { delay: 300, duration: 17500, top: 0.16, size: 42, bugId: "mier", direction: "right", drift: 38, opacity: 0.34, taps: 1 },
  { delay: 1600, duration: 24000, top: 0.29, size: 34, bugId: "zilvervisje", direction: "left", drift: 54, opacity: 0.24, taps: 1 },
  { delay: 3300, duration: 20500, top: 0.43, size: 46, bugId: "pissebed", direction: "right", drift: 72, opacity: 0.28, taps: 1 },
  { delay: 5200, duration: 22500, top: 0.57, size: 44, bugId: "pauwspin", direction: "left", drift: 46, opacity: 0.3, taps: 1 },
  { delay: 7100, duration: 26800, top: 0.7, size: 38, bugId: "duizendpoot", direction: "right", drift: 62, opacity: 0.22, taps: 2 },
  { delay: 9400, duration: 19000, top: 0.82, size: 48, bugId: "orchidee-bidsprinkhaan", direction: "left", drift: 58, opacity: 0.26, taps: 2 },
  { delay: 11800, duration: 28500, top: 0.92, size: 54, bugId: "neushoornkever", direction: "right", drift: 32, opacity: 0.2, taps: 3 },
  { delay: 15100, duration: 34000, top: 0.37, size: 42, bugId: "schorpioen", direction: "left", drift: 86, opacity: 0.16, taps: 3 },
  { delay: 18800, duration: 38000, top: 0.64, size: 50, bugId: "smaragdlibel", direction: "right", drift: 74, opacity: 0.14, taps: 3 },
  { delay: 23100, duration: 42000, top: 0.24, size: 58, bugId: "titanus-kever", direction: "left", drift: 40, opacity: 0.12, taps: 4 },
  { delay: 26000, duration: 31500, top: 0.51, size: 52, bugId: "glasvleugelvlinder", direction: "right", drift: 96, opacity: 0.15, taps: 3 },
  { delay: 29200, duration: 36000, top: 0.76, size: 46, bugId: "doodshoofdvlinder", direction: "left", drift: 82, opacity: 0.14, taps: 3 }
];

type Props = {
  onSplat?: () => void;
};

export function WalkingBugsLayer({ onSplat }: Props) {
  const { width, height } = Dimensions.get("window");
  const [gone, setGone] = useState<Record<number, boolean>>({});
  const [splatted, setSplatted] = useState<Record<number, boolean>>({});
  const [hits, setHits] = useState<Record<number, number>>({});
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
            useNativeDriver: false
          }),
          Animated.timing(track.progress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false
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

  function tapBug(index: number, taps: number) {
    if (splatted[index] || gone[index]) return;
    const nextHits = (hits[index] ?? 0) + 1;
    if (nextHits < taps) {
      setHits((current) => ({ ...current, [index]: nextHits }));
      return;
    }
    setHits((current) => ({ ...current, [index]: 0 }));
    setSplatted((current) => ({ ...current, [index]: true }));
    onSplat?.();
    const hideTimer = setTimeout(() => {
      setGone((current) => ({ ...current, [index]: true }));
    }, 520);
    const respawnTimer = setTimeout(() => {
      setSplatted((current) => ({ ...current, [index]: false }));
      setGone((current) => ({ ...current, [index]: false }));
    }, 9000);
    splatTimers.current.push(hideTimer, respawnTimer);
  }

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {tracks.map((track, index) => {
        const translateX = track.progress.interpolate({
          inputRange: [0, 1],
          outputRange: track.direction === "right" ? [-80, width + 80] : [width + 80, -80]
        });
        const translateY = track.progress.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [0, track.drift, -track.drift * 0.5, track.drift * 0.72, 0]
        });
        const rotate = track.progress.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange:
            track.direction === "right"
              ? ["82deg", "96deg", "77deg", "101deg", "88deg"]
              : ["-82deg", "-96deg", "-77deg", "-101deg", "-88deg"]
        });
        return (
          <Animated.View
            key={`${track.bugId}-${index}`}
            style={[
              styles.bug,
              {
                top: height * track.top,
                opacity: gone[index] ? 0 : splatted[index] ? 0.78 : track.opacity,
                transform: [{ translateX }, { translateY }, { rotate }]
              }
            ]}
          >
            <Pressable disabled={gone[index]} hitSlop={24} onPress={() => tapBug(index, track.taps)} style={[styles.hitbox, { minHeight: track.size + 44, minWidth: track.size * 2.5 }]}>
              {splatted[index] ? (
                <SplatMark size={track.size + 20} />
              ) : (
                <>
                  <BugArtImage bugId={track.bugId} size={track.size} />
                  {track.taps > 1 && hits[index] > 0 && <View style={[styles.damageRing, { height: track.size + 10, width: track.size + 10 }]} />}
                </>
              )}
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
    elevation: 0,
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
  damageRing: {
    borderColor: "#b83227",
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.65,
    position: "absolute"
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
