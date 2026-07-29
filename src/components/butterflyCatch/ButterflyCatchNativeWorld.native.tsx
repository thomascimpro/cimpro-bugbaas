import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BUTTERFLY_CATCH_CAPTURE_END_MS,
  BUTTERFLY_CATCH_CAPTURE_START_MS,
  BUTTERFLY_CATCH_SWING_DURATION_MS,
} from "./butterflyCatchGameModel";
import type { ButterflyCatchSceneProps } from "./ButterflyCatchGame.types";

type NativeBugSpec = {
  image: number;
  name: string;
  phase: number;
  points: 1 | 2 | 3;
  speed: number;
  vertical: number;
};

type NativeBugFrame = {
  depth: number;
  index: number;
  x: number;
  y: number;
};

const backgroundImage = require("../../../assets/minigames/butterfly-catch/butterfly-catch-keyart-v1.webp");

const bugSpecs: readonly NativeBugSpec[] = [
  { image: require("../../../assets/bugdex-webp/koninginnenpage.webp"), name: "Koninginnenpage", phase: 0.3, points: 2, speed: 0.82, vertical: 0.18 },
  { image: require("../../../assets/bugdex-webp/smaragdlibel.webp"), name: "Smaragdlibel", phase: 1.5, points: 3, speed: 1.55, vertical: 0.31 },
  { image: require("../../../assets/bugdex-webp/aardhommel.webp"), name: "Aardhommel", phase: 2.7, points: 1, speed: 0.58, vertical: 0.1 },
  { image: require("../../../assets/bugdex-webp/atlasmot.webp"), name: "Atlasmot", phase: 3.8, points: 1, speed: 0.48, vertical: 0.18 },
  { image: require("../../../assets/bugdex-webp/gouden-tor.webp"), name: "Gouden tor", phase: 4.9, points: 2, speed: 1.04, vertical: 0.2 },
  { image: require("../../../assets/bugdex-webp/blauwe-morpho.webp"), name: "Blauwe morpho", phase: 5.8, points: 3, speed: 1.38, vertical: 0.3 },
] as const;

const AIM_LOCK_DURATION_MS = 1_500;

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function frameForBug(spec: NativeBugSpec, index: number, seconds: number, yaw: number, pitch: number): NativeBugFrame {
  const orbit = seconds * spec.speed + spec.phase;
  const depthWave = (Math.sin(orbit * 0.71) + 1) / 2;
  const depth = 0.18 + depthWave * 0.82;
  const worldAngle = wrap01((Math.sin(orbit * 0.43) * 0.36) + index / bugSpecs.length - yaw / (Math.PI * 2));
  const x = 0.5 + Math.sin(worldAngle * Math.PI * 2) * (0.22 + (1 - depth) * 0.2);
  const y = 0.36 + Math.sin(orbit * 1.37) * spec.vertical + pitch * 0.12 + (1 - depth) * 0.08;
  return { depth, index, x, y };
}

export function ButterflyCatchNativeWorld({
  lookRef,
  onAimChange,
  onCatch,
  onFpsChange,
  onMiss,
  runActive,
  swingFocusRef,
  swingRequestId,
}: ButterflyCatchSceneProps) {
  const { height, width } = useWindowDimensions();
  const [frames, setFrames] = useState<NativeBugFrame[]>([]);
  const [aimProgress, setAimProgress] = useState(0);
  const [aimTargetIndex, setAimTargetIndex] = useState<number | null>(null);
  const hiddenUntilRef = useRef<number[]>(bugSpecs.map(() => 0));
  const latestFramesRef = useRef<NativeBugFrame[]>([]);
  const lastFrameAtRef = useRef(0);
  const lastSwingRef = useRef(0);
  const aimLockRef = useRef<{ index: number | null; startedAt: number }>({ index: null, startedAt: 0 });
  const netSwing = useRef(new Animated.Value(0)).current;
  const captureDelay = Math.round((BUTTERFLY_CATCH_CAPTURE_START_MS + BUTTERFLY_CATCH_CAPTURE_END_MS) / 2);

  useEffect(() => {
    let animationFrame = 0;
    const startedAt = performance.now();
    onFpsChange?.(30);
    const animate = (now: number) => {
      if (now - lastFrameAtRef.current >= 32) {
        const seconds = (now - startedAt) / 1_000;
        const nextFrames = bugSpecs.map((spec, index) => frameForBug(spec, index, seconds, lookRef.current.yaw, lookRef.current.pitch));
        latestFramesRef.current = nextFrames;
        setFrames(nextFrames);

        if (runActive) {
          const candidate = nextFrames
            .filter((frame) => hiddenUntilRef.current[frame.index] <= now)
            .filter((frame) => Math.abs(frame.x - 0.5) <= 0.18 && Math.abs(frame.y - 0.42) <= 0.2)
            .sort((first, second) => {
              const firstOffset = Math.abs(first.x - 0.5) + Math.abs(first.y - 0.42);
              const secondOffset = Math.abs(second.x - 0.5) + Math.abs(second.y - 0.42);
              return firstOffset - secondOffset;
            })[0];

          if (!candidate) {
            aimLockRef.current = { index: null, startedAt: 0 };
            setAimTargetIndex(null);
            setAimProgress(0);
            onAimChange?.({ progress: 0, targetName: null, tracking: false });
          } else {
            if (aimLockRef.current.index !== candidate.index) {
              aimLockRef.current = { index: candidate.index, startedAt: now };
            }
            const progress = Math.max(0, Math.min(1, (now - aimLockRef.current.startedAt) / AIM_LOCK_DURATION_MS));
            setAimTargetIndex(candidate.index);
            setAimProgress(progress);
            onAimChange?.({
              progress,
              targetName: bugSpecs[candidate.index].name,
              tracking: true,
            });
            if (progress >= 1) {
              hiddenUntilRef.current[candidate.index] = now + 1_450;
              aimLockRef.current = { index: null, startedAt: 0 };
              setAimTargetIndex(null);
              setAimProgress(0);
              onAimChange?.({ progress: 0, targetName: null, tracking: false });
              onCatch(bugSpecs[candidate.index].name, bugSpecs[candidate.index].points);
            }
          }
        } else {
          aimLockRef.current = { index: null, startedAt: 0 };
          setAimTargetIndex(null);
          setAimProgress(0);
          onAimChange?.({ progress: 0, targetName: null, tracking: false });
        }

        lastFrameAtRef.current = now;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [lookRef, onAimChange, onCatch, onFpsChange, runActive]);

  useEffect(() => {
    if (!runActive || swingRequestId <= lastSwingRef.current) return;
    lastSwingRef.current = swingRequestId;
    netSwing.stopAnimation();
    netSwing.setValue(0);
    Animated.sequence([
      Animated.timing(netSwing, { duration: 120, toValue: 0.24, useNativeDriver: true }),
      Animated.timing(netSwing, { duration: 190, toValue: 0.82, useNativeDriver: true }),
      Animated.spring(netSwing, { damping: 12, mass: 0.55, stiffness: 150, toValue: 1, useNativeDriver: true }),
      Animated.timing(netSwing, {
        delay: Math.max(0, BUTTERFLY_CATCH_SWING_DURATION_MS - 520),
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      const now = performance.now();
      const candidate = latestFramesRef.current
        .filter((frame) => hiddenUntilRef.current[frame.index] <= now)
        .filter((frame) => frame.depth >= 0.58)
        .filter((frame) => Math.abs(frame.x - 0.5) <= 0.15 && Math.abs(frame.y - 0.42) <= 0.17)
        .sort((a, b) => b.depth - a.depth)[0];
      if (candidate && swingFocusRef.current >= 0.32) {
        hiddenUntilRef.current[candidate.index] = now + 1_450;
        onCatch(bugSpecs[candidate.index].name, bugSpecs[candidate.index].points);
      } else {
        onMiss();
      }
    }, captureDelay);
    return () => clearTimeout(timer);
  }, [captureDelay, netSwing, onCatch, onMiss, runActive, swingFocusRef, swingRequestId]);

  const netTransform = useMemo(() => ([
    { perspective: 900 },
    { translateY: netSwing.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: [height * 0.2, height * 0.08, -height * 0.19, -height * 0.12] }) },
    { translateX: netSwing.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: [width * 0.14, width * 0.05, -width * 0.09, -width * 0.04] }) },
    { rotateZ: netSwing.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: ["-17deg", "-8deg", "13deg", "6deg"] }) },
    { rotateX: netSwing.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: ["20deg", "8deg", "-18deg", "-7deg"] }) },
    { scale: netSwing.interpolate({ inputRange: [0, 0.24, 0.82, 1], outputRange: [0.82, 0.94, 1.28, 1.06] }) },
  ]), [height, netSwing, width]);

  const now = performance.now();

  return (
    <View pointerEvents="none" style={styles.root}>
      <ImageBackground resizeMode="cover" source={backgroundImage} style={styles.background}>
        <View style={styles.atmosphere} />
        <View style={styles.depthHazeFar} />
        <View style={styles.depthHazeNear} />
        {frames.map((frame) => {
          if (hiddenUntilRef.current[frame.index] > now) return null;
          const size = 34 + frame.depth * 78;
          const opacity = 0.42 + frame.depth * 0.58;
          return (
            <View
              key={bugSpecs[frame.index].name}
              style={[
                styles.bugWrap,
                {
                  height: size,
                  left: frame.x * width - size / 2,
                  opacity,
                  top: frame.y * height - size / 2,
                  transform: [
                    { perspective: 700 },
                    { rotateZ: `${Math.sin(frame.x * 19 + frame.y * 13) * 7}deg` },
                    { scale: 0.72 + frame.depth * 0.38 },
                  ],
                  width: size,
                  zIndex: Math.round(frame.depth * 100),
                },
              ]}
            >
              <View style={[styles.bugGlow, { opacity: frame.depth * 0.42 }]} />
              <Image resizeMode="contain" source={bugSpecs[frame.index].image} style={styles.bugImage} />
            </View>
          );
        })}
        <View style={[
          styles.aimRing,
          aimTargetIndex !== null && styles.aimRingTracking,
          aimProgress >= 0.98 && styles.aimRingReady,
        ]}>
          <View style={[styles.aimProgress, { transform: [{ scaleY: Math.max(0.04, aimProgress) }] }]} />
          <View style={styles.aimDot} />
        </View>
        <Animated.View style={[styles.net, { transform: netTransform }]}>
          <View style={styles.netRim}>
            <View style={[styles.meshLine, { transform: [{ rotateZ: "24deg" }] }]} />
            <View style={[styles.meshLine, { transform: [{ rotateZ: "-24deg" }] }]} />
            <View style={[styles.meshLine, { transform: [{ rotateZ: "62deg" }] }]} />
            <View style={[styles.meshLine, { transform: [{ rotateZ: "-62deg" }] }]} />
          </View>
          <View style={styles.netCollar} />
          <View style={styles.netHandle} />
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  aimDot: { backgroundColor: "#fff2ad", borderRadius: 4, height: 7, width: 7, zIndex: 2 },
  aimProgress: { backgroundColor: "rgba(255,226,107,0.28)", borderRadius: 999, height: "100%", position: "absolute", width: "100%" },
  aimRing: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "rgba(255,239,174,0.72)",
    borderRadius: 54,
    borderWidth: 1,
    height: 74,
    justifyContent: "center",
    position: "absolute",
    top: "38%",
    width: 74,
  },
  aimRingTracking: { borderColor: "#ffe26b", borderWidth: 3 },
  aimRingReady: { backgroundColor: "rgba(255,226,107,0.2)", borderColor: "#ffffff", borderWidth: 4 },
  atmosphere: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,35,24,0.17)" },
  background: { flex: 1, overflow: "hidden" },
  bugGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "#fff2a8", borderRadius: 999, transform: [{ scale: 0.74 }] },
  bugImage: { height: "100%", width: "100%" },
  bugWrap: { alignItems: "center", justifyContent: "center", position: "absolute" },
  depthHazeFar: { backgroundColor: "rgba(190,226,199,0.1)", borderRadius: 999, height: 180, left: "5%", position: "absolute", top: "21%", width: "90%" },
  depthHazeNear: { backgroundColor: "rgba(9,31,21,0.15)", bottom: -60, height: "40%", left: "-10%", position: "absolute", width: "120%" },
  meshLine: { backgroundColor: "rgba(224,244,229,0.58)", height: 2, left: -18, position: "absolute", top: 61, width: 168 },
  net: { alignItems: "center", bottom: -80, height: 300, position: "absolute", right: -20, width: 230, zIndex: 200 },
  netCollar: { backgroundColor: "#a8804d", borderColor: "#e2c18a", borderRadius: 8, borderWidth: 2, height: 27, marginTop: -7, width: 34 },
  netHandle: { backgroundColor: "#765333", borderColor: "#bc9060", borderRadius: 12, borderWidth: 3, height: 168, marginTop: -2, width: 20 },
  netRim: {
    backgroundColor: "rgba(218,238,222,0.14)",
    borderColor: "#d8e7d8",
    borderRadius: 999,
    borderWidth: 7,
    height: 126,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { height: 8, width: 3 },
    shadowOpacity: 0.38,
    shadowRadius: 9,
    width: 150,
  },
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a2519" },
});
