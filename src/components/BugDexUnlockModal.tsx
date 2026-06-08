import React, { useEffect, useRef } from "react";
import { Animated, Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BugDexDropResult } from "../services/bugDexService";
import { bugDexEntryFact, bugDexEntryName, useI18n } from "../services/i18n";
import { BugDexRarity } from "../services/pointsService";
import { playBugSound } from "../services/soundService";
import { BugArtImage } from "./BugArtImage";

type Props = {
  drop: BugDexDropResult | null;
  onClose: () => void;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

const premiumRarityStyles: Record<"Episch" | "Legendarisch" | "Mythisch", {
  accent: string;
  auraSource: ImageSourcePropType;
  background: string;
  border: string;
  glow: string;
  label: string;
  text: string;
}> = {
  Episch: {
    accent: "#47b7d0",
    auraSource: require("../../assets/generated/bugdex_popup_aura_epic.png"),
    background: "#eefaff",
    border: "#1d839b",
    glow: "#78e7ff",
    label: "EPISCHE VONDST",
    text: "#0d5263"
  },
  Legendarisch: {
    accent: "#f5b84b",
    auraSource: require("../../assets/generated/bugdex_popup_aura_legendary.png"),
    background: "#fff8e8",
    border: "#d84b35",
    glow: "#ffd66b",
    label: "LEGENDARISCH",
    text: "#8a271c"
  },
  Mythisch: {
    accent: "#b78cff",
    auraSource: require("../../assets/generated/bugdex_popup_aura_legendary.png"),
    background: "#f7f0ff",
    border: "#7c3aed",
    glow: "#d8b4fe",
    label: "MYTHISCH",
    text: "#4c1d95"
  }
};

export function BugDexUnlockModal({ drop, onClose }: Props) {
  const { t } = useI18n();
  const scale = useRef(new Animated.Value(0.82)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drop) return;
    playBugSound(drop.rewardType === "bug" && (drop.entry.rarity === "Episch" || drop.entry.rarity === "Legendarisch" || drop.entry.rarity === "Mythisch") ? "bug_rare_unlock" : "bug_unlock");
    scale.setValue(0.82);
    glow.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        friction: 5,
        tension: 95,
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { duration: 760, toValue: 1, useNativeDriver: true }),
          Animated.timing(glow, { duration: 760, toValue: 0, useNativeDriver: true })
        ]),
        { iterations: 2 }
      )
    ]).start();
  }, [drop, glow, scale]);

  if (!drop) return null;
  const isPointsReward = drop.rewardType === "points";
  const isDailyReward = drop.source === "daily_login";
  const rarityColor = isPointsReward ? "#d7bd57" : rarityColors[drop.entry.rarity];
  const premiumStyle = !isPointsReward && (drop.entry.rarity === "Episch" || drop.entry.rarity === "Legendarisch" || drop.entry.rarity === "Mythisch")
    ? premiumRarityStyles[drop.entry.rarity]
    : null;
  const premiumLabel = premiumStyle && !isPointsReward
    ? drop.entry.rarity === "Episch"
      ? t("bugdex.epicFind")
      : drop.entry.rarity === "Legendarisch"
        ? t("bugdex.legendary")
        : t("bugdex.mythic")
    : "";
  const bugFact = isPointsReward ? t("bugdex.dailyLogin") : bugDexEntryFact(drop.entry, t);
  const title = isDailyReward ? t("bugdex.daily") : drop.source === "combine" ? t("bugdex.combineDone") : drop.isNew ? t("bugdex.unlocked") : t("bugdex.duplicate");
  const subtitle = isPointsReward
    ? `+${drop.points} ${t("profile.points").toLowerCase()}`
    : drop.source === "combine" && drop.isNew
      ? t("bugdex.newMade")
      : drop.isNew
        ? t("bugdex.newInDex")
        : t("bugdex.extraCopy");
  const streakText = isDailyReward && drop.streakDay
    ? t("bugdex.streak", { day: drop.streakDay, days: drop.daysUntilBetterReward ?? 0 })
    : "";
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, premiumStyle ? 1.24 : 1.12] });
  const ringScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, premiumStyle ? 1.38 : 1.16] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [premiumStyle ? 0.42 : 0.35, premiumStyle ? 0.9 : 0.75] });
  const ringOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.28, premiumStyle ? 0.72 : 0.35] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(drop)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[
          styles.card,
          premiumStyle && styles.premiumCard,
          premiumStyle && { backgroundColor: premiumStyle.background, borderColor: premiumStyle.border },
          !premiumStyle && { borderColor: rarityColor },
          { transform: [{ scale }] }
        ]}>
          {premiumStyle && <View style={[styles.premiumTopBar, { backgroundColor: premiumStyle.accent }]} />}
          {premiumStyle && (
            <View style={[styles.rarityBadge, { backgroundColor: premiumStyle.border }]}>
              <Text style={styles.rarityBadgeText}>{premiumLabel}</Text>
            </View>
          )}
          <Text style={[styles.kicker, premiumStyle && { color: premiumStyle.text }]}>{title}</Text>
          <Text style={[styles.subtitle, premiumStyle && { color: premiumStyle.text }]}>{subtitle}</Text>
          <View style={styles.artStage}>
            {premiumStyle && (
              <>
                <Image accessibilityIgnoresInvertColors source={premiumStyle.auraSource} style={styles.premiumAuraImage} />
                <Animated.View style={[styles.burstRing, { borderColor: premiumStyle.border, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                <Animated.View style={[styles.burstRingAlt, { borderColor: premiumStyle.accent, opacity: ringOpacity, transform: [{ scale: glowScale }] }]} />
              </>
            )}
            <Animated.View style={[styles.glow, { backgroundColor: premiumStyle?.glow ?? rarityColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            {isPointsReward ? <Text style={styles.pointsReward}>+{drop.points}</Text> : <BugArtImage bugId={drop.entry.id} size={138} />}
          </View>
          <Text style={[styles.name, premiumStyle && { color: premiumStyle.text }]}>{isPointsReward ? t("bugdex.pointsFound") : bugDexEntryName(drop.entry, t)}</Text>
          <Text style={[styles.meta, premiumStyle && { color: premiumStyle.text }]}>{bugFact}</Text>
          {!!streakText && <Text style={styles.streak}>{streakText}</Text>}
          <Pressable style={[styles.button, premiumStyle && { backgroundColor: premiumStyle.border }]} onPress={onClose}>
            <Text style={styles.buttonText}>{t("bugdex.nice")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.58)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    padding: 22,
    width: "100%"
  },
  premiumCard: {
    borderWidth: 4,
    elevation: 10,
    paddingTop: 24,
    shadowColor: "#102018",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18
  },
  premiumTopBar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    height: 8,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  kicker: {
    color: "#15724f",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  rarityBadge: {
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 7
  },
  rarityBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  subtitle: {
    color: "#53645d",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10
  },
  artStage: {
    alignItems: "center",
    height: 156,
    justifyContent: "center",
    width: 156
  },
  glow: {
    backgroundColor: "#d7bd57",
    borderRadius: 78,
    height: 156,
    position: "absolute",
    width: 156
  },
  premiumAuraImage: {
    height: 192,
    position: "absolute",
    width: 192
  },
  burstRing: {
    borderRadius: 88,
    borderWidth: 4,
    height: 176,
    position: "absolute",
    width: 176
  },
  burstRingAlt: {
    borderRadius: 72,
    borderWidth: 3,
    height: 144,
    position: "absolute",
    width: 144
  },
  name: {
    color: "#102018",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  meta: {
    color: "#53645d",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4
  },
  pointsReward: {
    color: "#102018",
    fontSize: 54,
    fontWeight: "900"
  },
  streak: {
    color: "#15724f",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: 14
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
