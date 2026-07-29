import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";

type BugPath = {
  delay: number;
  duration: number;
  top: number;
  size: number;
  bugId: BugArtId;
  direction: "right" | "left";
  crawl: number;
  turn: number;
  sidestep: number;
  opacity: number;
  taps: number;
};

const paths: BugPath[] = [
  { delay: 300, duration: 18500, top: 0.16, size: 42, bugId: "mier", direction: "right", crawl: 18, turn: 11, sidestep: 14, opacity: 0.34, taps: 1 },
  { delay: 1600, duration: 24500, top: 0.29, size: 34, bugId: "zilvervisje", direction: "left", crawl: 12, turn: 13, sidestep: 24, opacity: 0.24, taps: 1 },
  { delay: 3300, duration: 21500, top: 0.43, size: 46, bugId: "pissebed", direction: "right", crawl: 10, turn: 10, sidestep: 18, opacity: 0.28, taps: 1 },
  { delay: 5200, duration: 23000, top: 0.57, size: 44, bugId: "pauwspin", direction: "left", crawl: 22, turn: 18, sidestep: 28, opacity: 0.3, taps: 1 },
  { delay: 7100, duration: 27800, top: 0.7, size: 38, bugId: "duizendpoot", direction: "right", crawl: 8, turn: 9, sidestep: 16, opacity: 0.22, taps: 2 },
  { delay: 9400, duration: 19800, top: 0.82, size: 48, bugId: "orchidee-bidsprinkhaan", direction: "left", crawl: 24, turn: 20, sidestep: 20, opacity: 0.26, taps: 2 },
  { delay: 11800, duration: 29200, top: 0.92, size: 54, bugId: "neushoornkever", direction: "right", crawl: 7, turn: 8, sidestep: 10, opacity: 0.2, taps: 3 },
  { delay: 15100, duration: 34800, top: 0.37, size: 42, bugId: "schorpioen", direction: "left", crawl: 14, turn: 16, sidestep: 34, opacity: 0.16, taps: 3 },
  { delay: 18800, duration: 38500, top: 0.64, size: 50, bugId: "smaragdlibel", direction: "right", crawl: 28, turn: 22, sidestep: 42, opacity: 0.14, taps: 3 },
  { delay: 23100, duration: 42500, top: 0.24, size: 58, bugId: "titanus-kever", direction: "left", crawl: 6, turn: 7, sidestep: 12, opacity: 0.12, taps: 4 },
  { delay: 26000, duration: 32200, top: 0.51, size: 52, bugId: "glasvleugelvlinder", direction: "right", crawl: 30, turn: 24, sidestep: 52, opacity: 0.15, taps: 3 },
  { delay: 29200, duration: 36800, top: 0.76, size: 46, bugId: "doodshoofdvlinder", direction: "left", crawl: 26, turn: 20, sidestep: 36, opacity: 0.14, taps: 3 }
];

const crawlInput = [0, 0.06, 0.1, 0.17, 0.23, 0.31, 0.39, 0.48, 0.56, 0.65, 0.73, 0.82, 0.91, 1];

type Props = {
  onSplat?: () => void;
};

export function WalkingBugsLayer({ onSplat }: Props) {
  const { width, height } = useWindowDimensions();
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
        const side = index % 2 === 0 ? 1 : -1;
        const rightPath = [-90, -56, -53, 24, 27, 116, 121, width * 0.38, width * 0.38 + 8, width * 0.62, width * 0.62 + 12, width - 82, width - 78, width + 90];
        const leftPath = rightPath.map((value) => width - value);
        const left = track.progress.interpolate({
          inputRange: crawlInput,
          outputRange:
            track.direction === "right"
              ? rightPath
              : leftPath
        });
        const translateY = track.progress.interpolate({
          inputRange: crawlInput,
          outputRange: [
            0,
            track.sidestep * 0.12 * side,
            track.sidestep * 0.12 * side,
            -track.sidestep * 0.34 * side,
            -track.sidestep * 0.3 * side,
            track.sidestep * 0.58 * side,
            track.sidestep * 0.45 * side,
            -track.sidestep * 0.22 * side,
            -track.sidestep * 0.12 * side,
            track.sidestep * 0.38 * side,
            track.sidestep * 0.3 * side,
            -track.sidestep * 0.18 * side,
            -track.sidestep * 0.08 * side,
            0
          ]
        });
        const rotate = track.progress.interpolate({
          inputRange: crawlInput,
          outputRange: [
            "0deg",
            `${track.turn * 0.45 * side}deg`,
            `${track.turn * 0.25 * side}deg`,
            `${-track.turn * 0.75 * side}deg`,
            `${-track.turn * 0.45 * side}deg`,
            `${track.turn * side}deg`,
            `${track.turn * 0.55 * side}deg`,
            `${-track.turn * 0.5 * side}deg`,
            `${-track.turn * 0.28 * side}deg`,
            `${track.turn * 0.7 * side}deg`,
            `${track.turn * 0.38 * side}deg`,
            `${-track.turn * 0.32 * side}deg`,
            `${-track.turn * 0.16 * side}deg`,
            "0deg"
          ]
        });
        const lift = track.progress.interpolate({
          inputRange: crawlInput,
          outputRange: [0, -track.crawl, -1, -track.crawl * 0.72, 0, -track.crawl, -1, -track.crawl * 0.58, 0, -track.crawl, -1, -track.crawl * 0.68, -1, 0]
        });
        const scaleY = track.progress.interpolate({
          inputRange: crawlInput,
          outputRange: [1, 0.96, 1.02, 1, 0.97, 1.04, 1, 0.98, 1.03, 1, 0.96, 1.03, 1, 1]
        });
        const scaleX = track.direction === "right" ? 1 : -1;
        return (
          <Animated.View
            key={`${track.bugId}-${index}`}
            style={[
              styles.bug,
              {
                left,
                top: height * track.top,
                opacity: gone[index] ? 0 : splatted[index] ? 0.78 : track.opacity,
                transform: [{ translateY }, { rotate }]
              }
            ]}
          >
            <Pressable disabled={gone[index]} hitSlop={24} onPress={() => tapBug(index, track.taps)} style={[styles.hitbox, { minHeight: track.size + 44, minWidth: track.size * 2.5 }]}>
              {splatted[index] ? (
                <SplatMark size={track.size + 20} />
              ) : (
                <>
                  <Animated.View style={{ transform: [{ translateY: lift }, { scaleY }] }}>
                    <Animated.View style={{ transform: [{ scaleX }] }}>
                      <BugArtImage bugId={track.bugId} size={track.size} />
                    </Animated.View>
                  </Animated.View>
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
