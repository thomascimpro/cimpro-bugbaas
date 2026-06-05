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
const movementInput = [0, 0.12, 0.24, 0.38, 0.52, 0.66, 0.8, 0.92, 1];

const raritySettings: Record<SpawnRarity, { motionCycleMs: number; rewardXp: number; requiredTaps: number; size: number; verticalDrift: number }> = {
  common: { motionCycleMs: 2300, rewardXp: 1, requiredTaps: 2, size: 64, verticalDrift: 0.24 },
  rare: { motionCycleMs: 1650, rewardXp: 4, requiredTaps: 4, size: 78, verticalDrift: 0.42 },
  epic: { motionCycleMs: 1180, rewardXp: 10, requiredTaps: 6, size: 94, verticalDrift: 0.62 }
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
  const poof = useRef(new Animated.Value(0)).current;
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const activeRef = useRef<ActiveBug | null>(null);
  const hitsRef = useRef(0);

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
    poof.setValue(0);
    setCaught(false);
    setHits(0);
    hitsRef.current = 0;

    const animation = Animated.loop(
      Animated.timing(progress, {
        duration: activeBug.motionCycleMs,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: false
      })
    );
    moveAnimation.current = animation;
    animation.start();

    clearTimer.current = setTimeout(clearActiveBug, activeBug.durationMs);
    return () => {
      animation.stop();
      if (moveAnimation.current === animation) moveAnimation.current = null;
    };
  }, [activeBug, progress, poof]);

  const left = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxWidth = activeBug.size + 130;
    const minLeft = 10;
    const maxLeft = Math.max(minLeft, width - hitboxWidth - 10);
    const range = maxLeft - minLeft;
    const fractions = activeBug.direction === "right"
      ? [0.05, 0.82, 0.28, 0.96, 0.16, 0.68, 0.42, 0.88, 0.05]
      : [0.95, 0.18, 0.72, 0.04, 0.84, 0.32, 0.58, 0.12, 0.95];
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: fractions.map((fraction) => minLeft + range * fraction)
    });
  }, [activeBug, progress, width]);

  const top = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxHeight = activeBug.size + 90;
    const minTop = Math.max(24, height * 0.1);
    const maxTop = Math.max(minTop, height - hitboxHeight - 96);
    const range = maxTop - minTop;
    const center = activeBug.lane;
    const drift = activeBug.verticalDrift;
    const fractions = [
      center,
      center + drift * 0.56,
      center - drift * 0.38,
      center + drift,
      center - drift * 0.74,
      center + drift * 0.24,
      center - drift,
      center + drift * 0.48,
      center
    ];
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: fractions.map((fraction) => minTop + range * clamp(fraction, 0, 1))
    });
  }, [activeBug, height, progress]);

  const transform = useMemo(() => {
    if (!activeBug) return [];
    const rotate = progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.direction === "right"
        ? ["83deg", "101deg", "76deg", "96deg", "82deg", "104deg", "78deg", "92deg", "83deg"]
        : ["-83deg", "-101deg", "-76deg", "-96deg", "-82deg", "-104deg", "-78deg", "-92deg", "-83deg"]
    });
    const scale = poof.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.28]
    });
    return [{ rotate }, { scale }];
  }, [activeBug, poof, progress]);

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
    setHits(0);
    hitsRef.current = 0;
  }

  function tapBug() {
    if (!activeBug || caught) return;
    const nextHits = hitsRef.current + 1;
    hitsRef.current = nextHits;
    if (nextHits < activeBug.requiredTaps) {
      setHits(nextHits);
      return;
    }

    setCaught(true);
    moveAnimation.current?.stop();
    moveAnimation.current = null;
    onCaught(activeBug.rewardXp, activeBug.bugId, activeBug.rarity);
    Animated.timing(poof, {
      duration: 220,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true
    }).start();

    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(clearActiveBug, 680);
  }

  if (!enabled || !activeBug) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Animated.View
        style={[
          styles.bug,
          {
            opacity: caught ? 0.88 : 1,
            left,
            top,
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
              <BugArtImage bugId={activeBug.bugId} size={activeBug.size} />
              <View style={styles.tapCounter}>
                <Text style={styles.tapCounterText}>{hits}/{activeBug.requiredTaps}</Text>
              </View>
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
  damageRing: {
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.78,
    position: "absolute"
  },
  tapCounter: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.82)",
    borderColor: "#d7bd57",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 18,
    height: 24,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 8,
    position: "absolute"
  },
  tapCounterText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
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
