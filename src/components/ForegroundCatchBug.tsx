import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";

type SpawnRarity = "common" | "rare" | "epic";

type ActiveBug = {
  id: number;
  bugId: BugArtId;
  durationMs: number;
  direction: "left" | "right";
  lane: number;
  motionCycleMs: number;
  pathShift: number;
  rarity: SpawnRarity;
  requiredTaps: number;
  rewardXp: number;
  size: number;
  verticalDrift: number;
};

type Props = {
  enabled: boolean;
  onCaught: (xp: number, bugId: BugArtId, rarity: SpawnRarity) => void;
};

const spawnCheckMs = 60000;
const spawnChance = 0.28;
const catchDurationMs = 20000;
const tapDebounceMs = 140;
const movementInput = [0, 0.05, 0.1, 0.16, 0.22, 0.3, 0.38, 0.46, 0.55, 0.64, 0.72, 0.8, 0.88, 0.94, 1];
const crawlFractions = [0.12, 0.2, 0.18, 0.31, 0.38, 0.46, 0.42, 0.57, 0.68, 0.63, 0.79, 0.88, 0.7, 0.36, 0.12];

const raritySettings: Record<SpawnRarity, { motionCycleMs: number; rewardXp: number; requiredTaps: number; size: number; verticalDrift: number }> = {
  common: { motionCycleMs: 6200, rewardXp: 1, requiredTaps: 2, size: 64, verticalDrift: 0.18 },
  rare: { motionCycleMs: 5000, rewardXp: 4, requiredTaps: 4, size: 78, verticalDrift: 0.28 },
  epic: { motionCycleMs: 4100, rewardXp: 10, requiredTaps: 6, size: 94, verticalDrift: 0.38 }
};

const commonBugs: BugArtId[] = ["zilvervisje", "fruitvlieg", "mier", "pissebed", "mot", "boekluis"];
const rareBugs: BugArtId[] = ["pauwspin", "bidsprinkhaan", "schildwants", "tijgerkever", "smaragdlibel"];
const epicBugs: BugArtId[] = ["schorpioen", "orchidee-bidsprinkhaan", "neushoornkever", "goudwesp"];

export function ForegroundCatchBug({ enabled, onCaught }: Props) {
  const { height, width } = useWindowDimensions();
  const [activeBug, setActiveBug] = useState<ActiveBug | null>(null);
  const [hits, setHits] = useState(0);
  const [caught, setCaught] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const hitFeedback = useRef(new Animated.Value(0)).current;
  const poof = useRef(new Animated.Value(0)).current;
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const activeRef = useRef<ActiveBug | null>(null);
  const caughtRef = useRef(false);
  const hitsRef = useRef(0);
  const lastTapAtRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeBug;
  }, [activeBug]);

  useEffect(() => {
    if (!enabled) {
      clearActiveBug();
      return;
    }

    const interval = setInterval(() => {
      if (activeRef.current || Math.random() > spawnChance) return;
      spawnBug();
    }, spawnCheckMs);

    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      moveAnimation.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!activeBug) return;
    progress.setValue(0);
    hitFeedback.setValue(0);
    poof.setValue(0);
    setCaught(false);
    caughtRef.current = false;
    setHits(0);
    hitsRef.current = 0;
    lastTapAtRef.current = 0;

    const animation = Animated.loop(
      Animated.timing(progress, {
        duration: activeBug.motionCycleMs,
        easing: Easing.inOut(Easing.sin),
        toValue: 1,
        useNativeDriver: true
      })
    );
    moveAnimation.current = animation;
    animation.start();

    clearTimer.current = setTimeout(clearActiveBug, activeBug.durationMs);
    return () => {
      animation.stop();
      if (moveAnimation.current === animation) moveAnimation.current = null;
    };
  }, [activeBug, hitFeedback, progress, poof]);

  const translateX = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxWidth = activeBug.size + 130;
    const minLeft = 10;
    const maxLeft = Math.max(minLeft, width - hitboxWidth - 10);
    const range = maxLeft - minLeft;
    const fractions = crawlFractions.map((fraction, index) => {
      const shifted = clamp(fraction + activeBug.pathShift * (index % 3 === 0 ? 1 : -0.6), 0.08, 0.92);
      return activeBug.direction === "right" ? shifted : 1 - shifted;
    });
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: fractions.map((fraction) => minLeft + range * fraction)
    });
  }, [activeBug, progress, width]);

  const translateY = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxHeight = activeBug.size + 90;
    const minTop = Math.max(24, height * 0.1);
    const maxTop = Math.max(minTop, height - hitboxHeight - 96);
    const range = maxTop - minTop;
    const center = activeBug.lane;
    const drift = activeBug.verticalDrift;
    const fractions = [
      center,
      center + drift * 0.16,
      center + drift * 0.05,
      center + drift * 0.52,
      center - drift * 0.32,
      center - drift * 0.2,
      center + drift * 0.74,
      center + drift * 0.2,
      center - drift * 0.58,
      center - drift * 0.44,
      center + drift * 0.36,
      center + drift * 0.1,
      center - drift * 0.18,
      center + drift * 0.28,
      center
    ];
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: fractions.map((fraction) => minTop + range * clamp(fraction, 0, 1))
    });
  }, [activeBug, height, progress]);

  const transform = useMemo(() => {
    if (!activeBug) return [];
    const crawlBob = progress.interpolate({
      inputRange: movementInput,
      outputRange: [0, -4, 1, -8, 0, -5, 2, -9, 1, -6, 0, -7, 1, -3, 0]
    });
    const rotate = progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.direction === "right"
        ? ["82deg", "96deg", "88deg", "76deg", "102deg", "84deg", "108deg", "80deg", "96deg", "74deg", "104deg", "86deg", "116deg", "92deg", "82deg"]
        : ["-82deg", "-96deg", "-88deg", "-76deg", "-102deg", "-84deg", "-108deg", "-80deg", "-96deg", "-74deg", "-104deg", "-86deg", "-116deg", "-92deg", "-82deg"]
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

  const hitOpacity = hitFeedback.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0, 0.9, 0]
  });

  const hitRingScale = hitFeedback.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1.45]
  });

  function spawnBug() {
    const rarity = pickRarity();
    const bugId = pickBugId(rarity);
    const settings = raritySettings[rarity];
    setActiveBug({
      id: Date.now(),
      bugId,
      durationMs: catchDurationMs,
      direction: Math.random() > 0.5 ? "right" : "left",
      lane: 0.2 + Math.random() * 0.6,
      motionCycleMs: settings.motionCycleMs,
      pathShift: (Math.random() - 0.5) * 0.08,
      rarity,
      requiredTaps: settings.requiredTaps,
      rewardXp: settings.rewardXp,
      size: settings.size,
      verticalDrift: settings.verticalDrift
    });
  }

  function clearActiveBug() {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    moveAnimation.current?.stop();
    moveAnimation.current = null;
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
      return;
    }

    caughtRef.current = true;
    setCaught(true);
    moveAnimation.current?.stop();
    moveAnimation.current = null;
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
          {caught ? (
            <View style={[styles.poof, { height: activeBug.size + 26, width: activeBug.size + 26 }]}>
              <Text style={styles.poofText}>+{activeBug.rewardXp} XP</Text>
            </View>
          ) : (
            <>
              <Animated.View style={[styles.hitFlashWrap, { height: activeBug.size + 18, width: activeBug.size + 18 }, { opacity: hitOpacity, transform: [{ scale: hitRingScale }] }]}>
                <View style={styles.hitFlash} />
              </Animated.View>
              <BugArtImage bugId={activeBug.bugId} size={activeBug.size} />
              {activeBug.requiredTaps > 1 && (
                <View style={[styles.hpBar, { width: Math.max(52, activeBug.size * 0.86) }]}>
                  {Array.from({ length: activeBug.requiredTaps }).map((_, index) => (
                    <View key={index} style={[styles.hpSegment, index >= activeBug.requiredTaps - hits && styles.hpSegmentLost]} />
                  ))}
                </View>
              )}
              {activeBug.requiredTaps > 1 && hits > 0 && <View style={[styles.damageRing, { height: activeBug.size + 12, width: activeBug.size + 12 }]} />}
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function pickRarity(): SpawnRarity {
  const roll = Math.random();
  if (roll < 0.05) return "epic";
  if (roll < 0.22) return "rare";
  return "common";
}

function pickBugId(rarity: SpawnRarity): BugArtId {
  const pool = rarity === "epic" ? epicBugs : rarity === "rare" ? rareBugs : commonBugs;
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
  hitFlashWrap: {
    position: "absolute"
  },
  hitFlash: {
    borderColor: "#fff2a8",
    borderRadius: 999,
    borderWidth: 3,
    flex: 1
  },
  hpBar: {
    bottom: 20,
    flexDirection: "row",
    gap: 3,
    height: 8,
    position: "absolute"
  },
  hpSegment: {
    backgroundColor: "#d7bd57",
    borderColor: "rgba(16,32,24,0.72)",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1
  },
  hpSegmentLost: {
    backgroundColor: "rgba(255,255,255,0.28)"
  },
  damageRing: {
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.78,
    position: "absolute"
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
