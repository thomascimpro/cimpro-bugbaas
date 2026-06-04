import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";

type SpawnRarity = "common" | "rare" | "epic";

type ActiveBug = {
  id: number;
  bugId: BugArtId;
  direction: "left" | "right";
  lane: number;
  rarity: SpawnRarity;
  requiredTaps: number;
  size: number;
};

type Props = {
  enabled: boolean;
  onCaught: () => void;
};

const spawnCheckMs = 60000;
const spawnChance = 0.28;
const visibleMs = 7200;

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
  const activeRef = useRef<ActiveBug | null>(null);

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
    };
  }, []);

  useEffect(() => {
    if (!activeBug) return;
    progress.setValue(0);
    poof.setValue(0);
    setCaught(false);
    setHits(0);

    Animated.timing(progress, {
      duration: visibleMs,
      easing: Easing.inOut(Easing.quad),
      toValue: 1,
      useNativeDriver: true
    }).start();

    clearTimer.current = setTimeout(clearActiveBug, visibleMs);
  }, [activeBug, progress, poof]);

  const transform = useMemo(() => {
    if (!activeBug) return [];
    const translateX = progress.interpolate({
      inputRange: [0, 0.22, 0.46, 0.72, 1],
      outputRange: activeBug.direction === "right"
        ? [-90, width * 0.18, width * 0.44, width * 0.68, width + 90]
        : [width + 90, width * 0.68, width * 0.44, width * 0.18, -90]
    });
    const translateY = progress.interpolate({
      inputRange: [0, 0.28, 0.55, 0.8, 1],
      outputRange: [0, 18, -14, 22, 0]
    });
    const rotate = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: activeBug.direction === "right" ? ["83deg", "97deg", "88deg"] : ["-83deg", "-97deg", "-88deg"]
    });
    const scale = poof.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.28]
    });
    return [{ translateX }, { translateY }, { rotate }, { scale }];
  }, [activeBug, poof, progress, width]);

  function spawnBug() {
    const rarity = pickRarity();
    const bugId = pickBugId(rarity);
    setActiveBug({
      id: Date.now(),
      bugId,
      direction: Math.random() > 0.5 ? "right" : "left",
      lane: 0.18 + Math.random() * 0.52,
      rarity,
      requiredTaps: rarity === "epic" ? 3 : rarity === "rare" ? 2 : 1,
      size: rarity === "epic" ? 62 : rarity === "rare" ? 54 : 46
    });
  }

  function clearActiveBug() {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
    setActiveBug(null);
    setCaught(false);
    setHits(0);
  }

  function tapBug() {
    if (!activeBug || caught) return;
    const nextHits = hits + 1;
    if (nextHits < activeBug.requiredTaps) {
      setHits(nextHits);
      return;
    }

    setCaught(true);
    onCaught();
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
            top: height * activeBug.lane,
            transform
          }
        ]}
      >
        <Pressable hitSlop={28} onPress={tapBug} style={[styles.hitbox, { minHeight: activeBug.size + 44, minWidth: activeBug.size + 62 }]}>
          {caught ? (
            <View style={[styles.poof, { height: activeBug.size + 26, width: activeBug.size + 26 }]}>
              <Text style={styles.poofText}>+1 XP</Text>
            </View>
          ) : (
            <>
              <BugArtImage bugId={activeBug.bugId} size={activeBug.size} />
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
  if (roll < 0.06) return "epic";
  if (roll < 0.28) return "rare";
  return "common";
}

function pickBugId(rarity: SpawnRarity): BugArtId {
  const pool = rarity === "epic" ? epicBugs : rarity === "rare" ? rareBugs : commonBugs;
  return pool[Math.floor(Math.random() * pool.length)];
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
