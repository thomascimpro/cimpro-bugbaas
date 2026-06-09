import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import { allBugArtIds, BugArtId } from "../services/bugArt";
import { bugDexEntries } from "../services/pointsService";
import { playBugSound } from "../services/soundService";
import { BugArtImage } from "./BugArtImage";

type SpawnRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

type MotionPath = {
  rotate: string[];
  x: number[];
  y: number[];
};

type ActiveBug = {
  id: number;
  bugId: BugArtId;
  durationMs: number;
  facingScale: number;
  motionCycleMs: number;
  pathRotate: string[];
  pathX: number[];
  pathY: number[];
  rarity: SpawnRarity;
  requiredTaps: number;
  rewardXp: number;
  size: number;
  stepBob: number;
};

type Props = {
  catchAssist?: number;
  catchTimeBonus?: number;
  enabled: boolean;
  forcedBugIds?: BugArtId[];
  onCaught: (xp: number, bugId: BugArtId, rarity: SpawnRarity) => void;
  onForcedBugConsumed?: (bugId: BugArtId) => void;
};

const catchDurationMs = 30000;
const tapDebounceMs = 140;
const bugSwatterImage = require("../../assets/generated/bug-swatter-hd.png");
const movementInput = [0, 0.055, 0.1, 0.16, 0.22, 0.3, 0.37, 0.45, 0.53, 0.61, 0.69, 0.76, 0.83, 0.9, 0.96, 1];
const timerSegments = Array.from({ length: 24 }, (_, index) => index);

const raritySettings: Record<SpawnRarity, { motionCycleMs: number; rewardXp: number; requiredTaps: number; size: number; stepBob: number; turn: number; verticalDrift: number; wiggle: number }> = {
  common: { motionCycleMs: catchDurationMs, rewardXp: 1, requiredTaps: 3, size: 68, stepBob: 4, turn: 12, verticalDrift: 0.1, wiggle: 0.015 },
  rare: { motionCycleMs: catchDurationMs, rewardXp: 4, requiredTaps: 5, size: 74, stepBob: 5, turn: 17, verticalDrift: 0.16, wiggle: 0.028 },
  epic: { motionCycleMs: catchDurationMs, rewardXp: 9, requiredTaps: 7, size: 82, stepBob: 6, turn: 22, verticalDrift: 0.24, wiggle: 0.04 },
  legendary: { motionCycleMs: catchDurationMs, rewardXp: 15, requiredTaps: 9, size: 90, stepBob: 7, turn: 28, verticalDrift: 0.3, wiggle: 0.055 },
  mythic: { motionCycleMs: catchDurationMs, rewardXp: 22, requiredTaps: 11, size: 96, stepBob: 8, turn: 32, verticalDrift: 0.34, wiggle: 0.065 }
};

const rarityLabels: Record<SpawnRarity, "Gewoon" | "Zeldzaam" | "Episch" | "Legendarisch" | "Mythisch"> = {
  common: "Gewoon",
  rare: "Zeldzaam",
  epic: "Episch",
  legendary: "Legendarisch",
  mythic: "Mythisch"
};

const rarityByLabel = Object.fromEntries(
  (Object.keys(rarityLabels) as SpawnRarity[]).map((rarity) => [rarityLabels[rarity], rarity])
) as Record<"Gewoon" | "Zeldzaam" | "Episch" | "Legendarisch" | "Mythisch", SpawnRarity>;

const rarityByBugId = Object.fromEntries(
  bugDexEntries.map((entry) => [entry.id, rarityByLabel[entry.rarity]])
) as Record<string, SpawnRarity>;

const fallbackBugPools: Record<SpawnRarity, BugArtId[]> = {
  common: ["zilvervisje", "fruitvlieg", "bladluis", "mier", "mot", "boekluis"],
  rare: ["pissebed", "schildwants", "houtmier", "loopkever", "waterkever", "soldaatje"],
  epic: ["kakkerlak", "boktor", "duizendpoot", "tijgerkever", "bidsprinkhaan", "zebra-springspin"],
  legendary: ["schorpioen", "neushoornkever", "atlaskever", "pauwspin", "smaragdlibel", "goudwesp"],
  mythic: ["koningin-alexandravlinder", "zonsondergangsmot", "picasso-wants", "roze-esdoornmot", "giraffekevertje", "doornbloembidsprinkhaan", "lantaarndrager", "glorieuze-scarabee"]
};

const availableBugIds = new Set<string>(allBugArtIds);
const bugPools = (Object.keys(rarityLabels) as SpawnRarity[]).reduce((pools, rarity) => {
  const pool = bugDexEntries
    .filter((entry) => entry.rarity === rarityLabels[rarity] && availableBugIds.has(entry.id))
    .map((entry) => entry.id as BugArtId);
  pools[rarity] = pool.length > 0 ? pool : fallbackBugPools[rarity];
  return pools;
}, {} as Record<SpawnRarity, BugArtId[]>);

export function ForegroundCatchBug({ catchAssist = 0, catchTimeBonus = 0, enabled, forcedBugIds = [], onCaught, onForcedBugConsumed }: Props) {
  const { height, width } = useWindowDimensions();
  const [activeBug, setActiveBug] = useState<ActiveBug | null>(null);
  const [hits, setHits] = useState(0);
  const [caught, setCaught] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const hitFeedback = useRef(new Animated.Value(0)).current;
  const poof = useRef(new Animated.Value(0)).current;
  const timerProgress = useRef(new Animated.Value(0)).current;
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const timerAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const activeRef = useRef<ActiveBug | null>(null);
  const caughtRef = useRef(false);
  const hitsRef = useRef(0);
  const lastTapAtRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeBug;
  }, [activeBug]);

  useEffect(() => {
    if (!enabled) clearActiveBug();
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      moveAnimation.current?.stop();
      timerAnimation.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!activeBug) return;
    progress.setValue(0);
    hitFeedback.setValue(0);
    poof.setValue(0);
    timerProgress.setValue(0);
    setCaught(false);
    caughtRef.current = false;
    setHits(0);
    hitsRef.current = 0;
    lastTapAtRef.current = 0;

    const animation = Animated.timing(progress, {
      duration: activeBug.motionCycleMs,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: true
    });
    moveAnimation.current = animation;
    animation.start();

    const timer = Animated.timing(timerProgress, {
      duration: activeBug.durationMs,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: false
    });
    timerAnimation.current = timer;
    timer.start();

    clearTimer.current = setTimeout(clearActiveBug, activeBug.durationMs);
    return () => {
      animation.stop();
      timer.stop();
      if (moveAnimation.current === animation) moveAnimation.current = null;
      if (timerAnimation.current === timer) timerAnimation.current = null;
    };
  }, [activeBug, hitFeedback, progress, poof, timerProgress]);

  useEffect(() => {
    if (!enabled || activeRef.current || forcedBugIds.length === 0) return;
    const [nextBugId] = forcedBugIds;
    spawnBug(nextBugId);
    onForcedBugConsumed?.(nextBugId);
  }, [enabled, forcedBugIds, onForcedBugConsumed]);

  const translateX = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxWidth = activeBug.size + 130;
    const minLeft = 10;
    const maxLeft = Math.max(minLeft, width - hitboxWidth - 10);
    const range = maxLeft - minLeft;
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.pathX.map((fraction) => minLeft + range * fraction)
    });
  }, [activeBug, progress, width]);

  const translateY = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxHeight = activeBug.size + 90;
    const minTop = Math.max(24, height * 0.1);
    const maxTop = Math.max(minTop, height - hitboxHeight - 96);
    const range = maxTop - minTop;
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.pathY.map((fraction) => minTop + range * clamp(fraction, 0, 1))
    });
  }, [activeBug, height, progress]);

  const transform = useMemo(() => {
    if (!activeBug) return [];
    const bob = activeBug.stepBob;
    const crawlBob = progress.interpolate({
      inputRange: movementInput,
      outputRange: [0, -bob * 0.55, -1, -bob * 0.92, 0, -bob * 0.35, -1, -bob, 0, -bob * 0.75, -1, -bob * 0.45, 0, -bob * 0.85, -1, 0]
    });
    const rotate = progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.pathRotate
    });
    const scale = poof.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.28]
    });
    const hitShake = hitFeedback.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [0, -8, 7, -4, 0]
    });
    const hitScale = hitFeedback.interpolate({
      inputRange: [0, 0.45, 1],
      outputRange: [1, 1.12, 1]
    });
    return [{ translateX }, { translateY }, { translateY: crawlBob }, { translateX: hitShake }, { rotate }, { scale }, { scale: hitScale }];
  }, [activeBug, hitFeedback, poof, progress, translateX, translateY]);

  const bugArtTransform = useMemo(() => {
    if (!activeBug) return [];
    const bodySquash = progress.interpolate({
      inputRange: movementInput,
      outputRange: [1, 0.97, 1.02, 1, 0.96, 1.03, 1, 0.98, 1.02, 1, 0.97, 1.03, 1, 0.98, 1.01, 1]
    });
    return [{ scaleX: activeBug.facingScale }, { scaleY: bodySquash }];
  }, [activeBug, progress]);

  const swatterStyle = useMemo(() => {
    if (!activeBug) return null;
    const size = activeBug.size * 2.4;
    const opacity = hitFeedback.interpolate({
      inputRange: [0, 0.06, 0.72, 1],
      outputRange: [0, 1, 0.88, 0],
      extrapolate: "clamp"
    });
    const translateX = hitFeedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: [activeBug.size * 0.65, activeBug.size * 0.24, -activeBug.size * 0.06, activeBug.size * 0.02, activeBug.size * 0.72],
      extrapolate: "clamp"
    });
    const translateY = hitFeedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: [-activeBug.size * 1.3, -activeBug.size * 0.72, -activeBug.size * 0.2, -activeBug.size * 0.34, -activeBug.size * 1.36],
      extrapolate: "clamp"
    });
    const rotate = hitFeedback.interpolate({
      inputRange: [0, 0.16, 0.34, 0.58, 1],
      outputRange: ["-48deg", "-24deg", "7deg", "-8deg", "-52deg"],
      extrapolate: "clamp"
    });
    const scale = hitFeedback.interpolate({
      inputRange: [0, 0.3, 0.52, 1],
      outputRange: [0.8, 1.08, 0.98, 0.84],
      extrapolate: "clamp"
    });
    return {
      height: size,
      opacity,
      transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      width: size
    };
  }, [activeBug, hitFeedback]);

  function spawnBug(forcedId?: BugArtId) {
    const rarity = forcedId ? rarityByBugId[forcedId] ?? "common" : pickRarity();
    const bugId = forcedId ?? pickBugId(rarity);
    const settings = raritySettings[rarity];
    const requiredTaps = Math.max(1, Math.ceil(settings.requiredTaps * (1 - clamp(catchAssist, 0, 0.2))));
    const durationMs = Math.round(catchDurationMs * (1 + clamp(catchTimeBonus, 0, 0.2)));
    const direction = Math.random() > 0.5 ? "right" : "left";
    const motionPath = createMotionPath(rarity, direction);
    setActiveBug({
      id: Date.now(),
      bugId,
      durationMs,
      facingScale: direction === "right" ? 1 : -1,
      motionCycleMs: settings.motionCycleMs,
      pathRotate: motionPath.rotate,
      pathX: motionPath.x,
      pathY: motionPath.y,
      rarity,
      requiredTaps,
      rewardXp: settings.rewardXp,
      size: settings.size,
      stepBob: settings.stepBob
    });
  }

  function clearActiveBug() {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    moveAnimation.current?.stop();
    timerAnimation.current?.stop();
    moveAnimation.current = null;
    timerAnimation.current = null;
    setActiveBug(null);
    setCaught(false);
    caughtRef.current = false;
    setHits(0);
    hitsRef.current = 0;
    lastTapAtRef.current = 0;
  }

  function tapBug() {
    const currentBug = activeRef.current;
    const now = Date.now();
    if (!currentBug || caughtRef.current || now - lastTapAtRef.current < tapDebounceMs) return;

    lastTapAtRef.current = now;
    const nextHits = Math.min(hitsRef.current + 1, currentBug.requiredTaps);
    hitsRef.current = nextHits;
    setHits(nextHits);
    playHitFeedback();
    if (nextHits < currentBug.requiredTaps) {
      playBugSound("bug_hit");
      return;
    }

    playBugSound("bug_catch");
    caughtRef.current = true;
    setCaught(true);
    moveAnimation.current?.stop();
    timerAnimation.current?.stop();
    moveAnimation.current = null;
    timerAnimation.current = null;
    onCaught(currentBug.rewardXp, currentBug.bugId, currentBug.rarity);
    Animated.timing(poof, {
      duration: 220,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true
    }).start();

    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(clearActiveBug, 680);
  }

  function playHitFeedback() {
    hitFeedback.stopAnimation();
    hitFeedback.setValue(0);
    Animated.timing(hitFeedback, {
      duration: 240,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true
    }).start();
  }

  if (!enabled || !activeBug) return null;
  const timerSize = 24;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        style={[
          styles.bug,
          {
            opacity: caught ? 0.88 : 1,
            transform
          }
        ]}
      >
        <Pressable hitSlop={42} onPress={tapBug} style={[styles.hitbox, { minHeight: activeBug.size + 90, minWidth: activeBug.size + 130 }]}>
          {swatterStyle && (
            <Animated.Image
              resizeMode="contain"
              source={bugSwatterImage as ImageSourcePropType}
              style={[styles.swatter, swatterStyle]}
            />
          )}
          {!caught && (
            <View pointerEvents="none" style={[styles.timerBadge, { height: timerSize, width: timerSize }]}>
              {timerSegments.map((segment) => {
                const cutoff = (segment + 1) / timerSegments.length;
                const opacity = timerProgress.interpolate({
                  inputRange: [Math.max(0, cutoff - 0.02), cutoff],
                  outputRange: [1, 0.16],
                  extrapolate: "clamp"
                });
                return (
                  <Animated.View
                    key={segment}
                    style={[
                      styles.timerSegment,
                      {
                        opacity,
                        transform: [
                          { rotate: `${segment * (360 / timerSegments.length)}deg` },
                          { translateY: -timerSize / 2 + 2 }
                        ]
                      }
                    ]}
                  />
                );
              })}
            </View>
          )}
          {caught ? (
            <View style={[styles.poof, { height: activeBug.size + 26, width: activeBug.size + 26 }]}>
              <Text style={styles.poofText}>+{activeBug.rewardXp} XP</Text>
            </View>
          ) : (
            <>
              <Animated.View style={{ transform: bugArtTransform }}>
                <BugArtImage bugId={activeBug.bugId} size={activeBug.size} />
              </Animated.View>
              {activeBug.requiredTaps > 1 && (
                <View pointerEvents="none" style={[styles.hpBar, { width: Math.max(52, activeBug.size * 0.86) }]}>
                  {Array.from({ length: activeBug.requiredTaps }).map((_, index) => (
                    <View key={index} style={[styles.hpSegment, index >= activeBug.requiredTaps - hits && styles.hpSegmentLost]} />
                  ))}
                </View>
              )}
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createMotionPath(rarity: SpawnRarity, direction: "left" | "right"): MotionPath {
  const settings = raritySettings[rarity];
  const lane = 0.2 + Math.random() * 0.6;
  const pathShift = (Math.random() - 0.5) * 0.08;
  const side = Math.random() > 0.5 ? 1 : -1;
  const drift = settings.verticalDrift;
  const wiggle = settings.wiggle;
  const baseX = [
    0.1,
    0.14,
    0.14 + wiggle,
    0.22,
    0.27 - wiggle * 0.6,
    0.34,
    0.39 + wiggle,
    0.48,
    0.53 - wiggle,
    0.61,
    0.66 + wiggle * 0.7,
    0.72,
    0.78 - wiggle * 0.5,
    0.84,
    0.88,
    0.9
  ].map((value) => clamp(value + pathShift, 0.06, 0.94));
  const x = direction === "right" ? baseX : baseX.map((value) => 1 - value);
  const yOffsets = [
    0,
    drift * 0.08 * side,
    drift * 0.08 * side,
    -drift * 0.18 * side,
    -drift * 0.18 * side,
    drift * 0.28 * side,
    drift * 0.28 * side,
    -drift * 0.14 * side,
    -drift * 0.14 * side,
    drift * 0.22 * side,
    drift * 0.22 * side,
    -drift * 0.1 * side,
    -drift * 0.1 * side,
    drift * 0.06 * side,
    drift * 0.02 * side,
    0
  ];
  const y = yOffsets.map((offset) => clamp(lane + offset, 0.06, 0.94));
  const rotate = x.map((_, index) => {
    if (index === x.length - 1) return "0deg";
    const dx = x[index + 1] - x[index];
    const dy = y[index + 1] - y[index];
    const degrees = clamp((Math.atan2(dy, Math.max(Math.abs(dx), 0.01)) * 180) / Math.PI, -settings.turn, settings.turn);
    return `${Math.round(degrees)}deg`;
  });
  return { rotate, x, y };
}

function pickRarity(): SpawnRarity {
  const roll = Math.random();
  if (roll < 0.005) return "mythic";
  if (roll < 0.025) return "legendary";
  if (roll < 0.1) return "epic";
  if (roll < 0.35) return "rare";
  return "common";
}

function pickBugId(rarity: SpawnRarity): BugArtId {
  const pool = bugPools[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    elevation: 40,
    overflow: "hidden",
    zIndex: 1400
  },
  bug: {
    position: "absolute"
  },
  hitbox: {
    alignItems: "center",
    justifyContent: "center"
  },
  swatter: {
    position: "absolute",
    zIndex: 5
  },
  hpBar: {
    bottom: 20,
    flexDirection: "row",
    gap: 3,
    height: 8,
    position: "absolute"
  },
  hpSegment: {
    backgroundColor: "#d83a34",
    borderColor: "rgba(82,12,12,0.78)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1
  },
  hpSegmentLost: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(82,12,12,0.28)"
  },
  timerBadge: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.74)",
    borderRadius: 999,
    justifyContent: "center",
    position: "absolute",
    right: 56,
    top: 36,
    zIndex: 2
  },
  timerSegment: {
    backgroundColor: "#d7bd57",
    borderRadius: 999,
    height: 4,
    position: "absolute",
    width: 2
  },
  poof: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.88)",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center"
  },
  poofText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  }
});
