import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { allBugArtIds, BugArtId } from "../services/bugArt";
import { bugDexEntries } from "../services/pointsService";
import { BugArtImage } from "./BugArtImage";

type SpawnRarity = "common" | "rare" | "epic" | "legendary";

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
  stepBob: number;
  verticalDrift: number;
  wiggle: number;
};

type Props = {
  enabled: boolean;
  forcedBugId?: BugArtId | null;
  onCaught: (xp: number, bugId: BugArtId, rarity: SpawnRarity) => void;
  onForcedBugConsumed?: () => void;
};

const spawnCheckMs = 60000;
const spawnChance = 0.28;
const catchDurationMs = 30000;
const tapDebounceMs = 140;
const movementInput = [0, 0.066, 0.133, 0.2, 0.266, 0.333, 0.4, 0.466, 0.533, 0.6, 0.666, 0.733, 0.8, 0.866, 0.933, 1];
const crawlFractions = [0.16, 0.2, 0.27, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.86, 0.8, 0.71, 0.62, 0.5, 0.32, 0.16];

const raritySettings: Record<SpawnRarity, { motionCycleMs: number; rewardXp: number; requiredTaps: number; size: number; stepBob: number; verticalDrift: number; wiggle: number }> = {
  common: { motionCycleMs: 7600, rewardXp: 1, requiredTaps: 3, size: 68, stepBob: 4, verticalDrift: 0.1, wiggle: 0.015 },
  rare: { motionCycleMs: 6400, rewardXp: 4, requiredTaps: 5, size: 74, stepBob: 5, verticalDrift: 0.16, wiggle: 0.028 },
  epic: { motionCycleMs: 5400, rewardXp: 9, requiredTaps: 7, size: 82, stepBob: 6, verticalDrift: 0.24, wiggle: 0.04 },
  legendary: { motionCycleMs: 4600, rewardXp: 15, requiredTaps: 9, size: 90, stepBob: 7, verticalDrift: 0.3, wiggle: 0.055 }
};

const rarityLabels: Record<SpawnRarity, "Gewoon" | "Zeldzaam" | "Episch" | "Legendarisch"> = {
  common: "Gewoon",
  rare: "Zeldzaam",
  epic: "Episch",
  legendary: "Legendarisch"
};

const rarityByLabel = Object.fromEntries(
  (Object.keys(rarityLabels) as SpawnRarity[]).map((rarity) => [rarityLabels[rarity], rarity])
) as Record<"Gewoon" | "Zeldzaam" | "Episch" | "Legendarisch", SpawnRarity>;

const rarityByBugId = Object.fromEntries(
  bugDexEntries.map((entry) => [entry.id, rarityByLabel[entry.rarity]])
) as Record<string, SpawnRarity>;

const fallbackBugPools: Record<SpawnRarity, BugArtId[]> = {
  common: ["zilvervisje", "fruitvlieg", "bladluis", "mier", "mot", "boekluis"],
  rare: ["pissebed", "schildwants", "houtmier", "loopkever", "waterkever", "soldaatje"],
  epic: ["kakkerlak", "boktor", "duizendpoot", "tijgerkever", "bidsprinkhaan", "zebra-springspin"],
  legendary: ["schorpioen", "neushoornkever", "atlaskever", "pauwspin", "smaragdlibel", "goudwesp"]
};

const availableBugIds = new Set<string>(allBugArtIds);
const bugPools = (Object.keys(rarityLabels) as SpawnRarity[]).reduce((pools, rarity) => {
  const pool = bugDexEntries
    .filter((entry) => entry.rarity === rarityLabels[rarity] && availableBugIds.has(entry.id))
    .map((entry) => entry.id as BugArtId);
  pools[rarity] = pool.length > 0 ? pool : fallbackBugPools[rarity];
  return pools;
}, {} as Record<SpawnRarity, BugArtId[]>);

export function ForegroundCatchBug({ enabled, forcedBugId, onCaught, onForcedBugConsumed }: Props) {
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

  useEffect(() => {
    if (!enabled || !forcedBugId) return;
    clearActiveBug();
    spawnBug(forcedBugId);
    onForcedBugConsumed?.();
  }, [enabled, forcedBugId, onForcedBugConsumed]);

  const translateX = useMemo(() => {
    if (!activeBug) return 0;
    const hitboxWidth = activeBug.size + 130;
    const minLeft = 10;
    const maxLeft = Math.max(minLeft, width - hitboxWidth - 10);
    const range = maxLeft - minLeft;
    const fractions = crawlFractions.map((fraction, index) => {
      const legWiggle = index % 2 === 0 ? activeBug.wiggle : -activeBug.wiggle * 0.65;
      const shifted = clamp(fraction + activeBug.pathShift + legWiggle, 0.08, 0.92);
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
      center + drift * 0.08,
      center - drift * 0.04,
      center + drift * 0.16,
      center - drift * 0.1,
      center + drift * 0.24,
      center - drift * 0.18,
      center + drift * 0.32,
      center - drift * 0.26,
      center + drift * 0.2,
      center - drift * 0.12,
      center + drift * 0.1,
      center - drift * 0.06,
      center + drift * 0.04,
      center - drift * 0.02,
      center
    ];
    return progress.interpolate({
      inputRange: movementInput,
      outputRange: fractions.map((fraction) => minTop + range * clamp(fraction, 0, 1))
    });
  }, [activeBug, height, progress]);

  const transform = useMemo(() => {
    if (!activeBug) return [];
    const bob = activeBug.stepBob;
    const crawlBob = progress.interpolate({
      inputRange: movementInput,
      outputRange: [0, -bob * 0.45, 0, -bob, 1, -bob * 0.7, 0, -bob * 1.1, 1, -bob * 0.85, 0, -bob * 0.65, 1, -bob * 0.4, 0, 0]
    });
    const rotate = progress.interpolate({
      inputRange: movementInput,
      outputRange: activeBug.direction === "right"
        ? ["80deg", "84deg", "88deg", "82deg", "90deg", "86deg", "94deg", "88deg", "96deg", "90deg", "84deg", "80deg", "86deg", "92deg", "84deg", "80deg"]
        : ["-80deg", "-84deg", "-88deg", "-82deg", "-90deg", "-86deg", "-94deg", "-88deg", "-96deg", "-90deg", "-84deg", "-80deg", "-86deg", "-92deg", "-84deg", "-80deg"]
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

  function spawnBug(forcedId?: BugArtId) {
    const rarity = forcedId ? rarityByBugId[forcedId] ?? "common" : pickRarity();
    const bugId = forcedId ?? pickBugId(rarity);
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
      stepBob: settings.stepBob,
      verticalDrift: settings.verticalDrift,
      wiggle: settings.wiggle
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
              <BugArtImage bugId={activeBug.bugId} size={activeBug.size} />
              {activeBug.requiredTaps > 1 && (
                <View style={[styles.hpBar, { width: Math.max(52, activeBug.size * 0.86) }]}>
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

function pickRarity(): SpawnRarity {
  const roll = Math.random();
  if (roll < 0.02) return "legendary";
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
