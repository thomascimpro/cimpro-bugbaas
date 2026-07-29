import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import type { BugDexDropResult } from "../services/bugDexService";
import { rarityLabel, useI18n } from "../services/i18n";
import type { BugDexRarity } from "../services/pointsService";
import { rewardSpinSchedule } from "../services/rewardSpinTiming";

const rarities: BugDexRarity[] = ["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"];
const colors: Record<BugDexRarity, string> = {
  Gewoon: "#35c46a",
  Zeldzaam: "#4b9eff",
  Episch: "#b56cff",
  Legendarisch: "#f6c344",
  Mythisch: "#ff5d79"
};

type Props = {
  drop: BugDexDropResult | null;
  onComplete: (drop: BugDexDropResult) => void;
};

export function RewardSpinModal({ drop, onComplete }: Props) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const target = drop?.rewardType === "bug" ? drop.entry.rarity : "Gewoon";
  const [active, setActive] = useState<BugDexRarity>("Gewoon");
  const [settled, setSettled] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drop || drop.rewardType !== "bug") return;
    setSettled(false);
    setActive("Gewoon");
    pulse.setValue(1);
    reveal.setValue(0);
    orbit.setValue(0);

    const schedule = rewardSpinSchedule(rarities.indexOf(target));
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    schedule.forEach((step, index) => {
      elapsed += step.delayMs;
      timers.push(setTimeout(() => {
        setActive(rarities[step.rarityIndex]);
        Animated.sequence([
          Animated.timing(pulse, { duration: 70, toValue: 1.08, useNativeDriver: nativeDriver }),
          Animated.timing(pulse, { duration: 90, toValue: 1, useNativeDriver: nativeDriver })
        ]).start();
        if (index === schedule.length - 1) {
          setSettled(true);
          Animated.spring(reveal, {
            friction: 5,
            tension: 95,
            toValue: 1,
            useNativeDriver: nativeDriver
          }).start();
        }
      }, elapsed));
    });

    const orbitAnimation = Animated.timing(orbit, {
      duration: elapsed,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    orbitAnimation.start();

    return () => {
      timers.forEach(clearTimeout);
      orbitAnimation.stop();
    };
  }, [drop, orbit, pulse, reveal, target]);

  if (!drop || drop.rewardType !== "bug") return null;

  const activeIndex = rarities.indexOf(active);
  const orbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
  const revealOpacity = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Modal animationType="fade" onRequestClose={() => undefined} transparent visible>
      <View style={styles.backdrop}>
        <View style={[styles.card, height < 700 && styles.cardCompact, { borderColor: colors[active] }]}>
          <View style={styles.topRow}>
            <View style={styles.liveDot} />
            <Text style={styles.kicker}>{t("rewardSpin.kicker")}</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.title}>{t("rewardSpin.title")}</Text>
          <View style={styles.reel}>
            <Image
              accessibilityIgnoresInvertColors
              source={require("../../assets/generated/bugdex_popup_aura_legendary.png")}
              style={[styles.aura, { tintColor: colors[active] }]}
            />
            <Animated.View style={[styles.orbit, { borderColor: colors[active], transform: [{ rotate: orbitRotation }] }]}>
              <View style={[styles.orbitGem, { backgroundColor: colors[active] }]} />
              <View style={[styles.orbitGem, styles.orbitGemOpposite, { backgroundColor: colors[active] }]} />
            </Animated.View>
            <View style={[styles.glow, { backgroundColor: colors[active] }]} />
            <Animated.View style={[styles.orb, { borderColor: colors[active], transform: [{ scale: pulse }] }]}>
              <Image
                accessibilityIgnoresInvertColors
                source={require("../../assets/generated/bugbaas-field-emblem-v3.png")}
                style={styles.emblem}
              />
            </Animated.View>
            <View style={styles.rarityPips}>
              {rarities.map((rarity, index) => (
                <View
                  key={rarity}
                  style={[
                    styles.rarityPip,
                    index === activeIndex && styles.rarityPipActive,
                    { backgroundColor: colors[rarity] }
                  ]}
                />
              ))}
            </View>
          </View>
          <Animated.View style={[styles.resultPlate, { borderColor: colors[active], opacity: revealOpacity, transform: [{ scale: revealScale }] }]}>
            <Text style={[styles.result, { color: settled ? colors[target] : "#c7d5ce" }]}>
              {settled ? rarityLabel(target, t) : "•••"}
            </Text>
            <Text style={[styles.stars, { color: settled ? colors[target] : "#64766d" }]}>
              {"★".repeat(settled ? rarities.indexOf(target) + 1 : activeIndex + 1)}
            </Text>
          </Animated.View>
          <Pressable
            disabled={!settled}
            onPress={() => onComplete(drop)}
            style={[styles.button, { backgroundColor: settled ? colors[target] : "#46534d" }]}
          >
            <Text style={styles.buttonText}>{settled ? t("rewardSpin.reveal") : t("rewardSpin.spinning")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(4,6,20,0.94)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  card: {
    alignItems: "center",
    backgroundColor: "#14172f",
    borderRadius: 30,
    borderWidth: 2,
    elevation: 18,
    maxWidth: 390,
    maxHeight: "94%",
    overflow: "hidden",
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    width: "100%"
  },
  cardCompact: {
    paddingBottom: 16,
    paddingTop: 16
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  liveDot: {
    backgroundColor: "#e7cc72",
    borderRadius: 4,
    height: 6,
    width: 6
  },
  kicker: {
    color: "#e7cc72",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2
  },
  title: {
    color: "#f7fff8",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 7,
    textAlign: "center"
  },
  reel: {
    alignItems: "center",
    backgroundColor: "#090b1c",
    borderColor: "rgba(231,204,114,0.22)",
    borderRadius: 26,
    borderWidth: 1,
    height: 218,
    justifyContent: "center",
    marginTop: 18,
    overflow: "hidden",
    width: "100%"
  },
  aura: {
    height: 280,
    opacity: 0.26,
    position: "absolute",
    width: 280
  },
  glow: {
    borderRadius: 100,
    height: 164,
    opacity: 0.16,
    position: "absolute",
    width: 164
  },
  orbit: {
    borderRadius: 88,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 176,
    position: "absolute",
    width: 176
  },
  orbitGem: {
    borderRadius: 7,
    height: 13,
    left: 12,
    position: "absolute",
    top: 19,
    width: 13
  },
  orbitGemOpposite: {
    bottom: 19,
    left: undefined,
    right: 12,
    top: undefined
  },
  orb: {
    alignItems: "center",
    backgroundColor: "#202550",
    borderRadius: 68,
    borderWidth: 3,
    elevation: 8,
    height: 136,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    width: 136
  },
  emblem: {
    height: 108,
    width: 108
  },
  rarityPips: {
    bottom: 12,
    flexDirection: "row",
    gap: 7,
    position: "absolute"
  },
  rarityPip: {
    borderRadius: 5,
    height: 7,
    opacity: 0.35,
    width: 22
  },
  rarityPipActive: {
    opacity: 1,
    transform: [{ scaleY: 1.45 }]
  },
  resultPlate: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 17,
    borderWidth: 1,
    marginTop: 14,
    paddingVertical: 11
  },
  result: {
    fontSize: 23,
    fontWeight: "900"
  },
  stars: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 3,
    minHeight: 20
  },
  button: {
    alignItems: "center",
    borderRadius: 16,
    elevation: 4,
    marginTop: 14,
    paddingVertical: 14,
    width: "100%"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  }
});
