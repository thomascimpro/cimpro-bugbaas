import React, { useEffect, useRef } from "react";
import { Animated, Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { BugDexDropResult } from "../services/bugDexService";
import { bugDexEntryFact, bugDexEntryName, useI18n } from "../services/i18n";
import { BugDexRarity } from "../services/pointsService";
import { playBugSound } from "../services/soundService";
import { BugArtImage } from "./BugArtImage";
import { specimenRarityAccent } from "./collection/SpecimenArchiveVisuals";
import { MythicRarityFrame } from "./MythicRarityFrame";

type Props = {
  busy?: boolean;
  drop: BugDexDropResult | null;
  onClose: () => void;
};

const rarityColors: Record<BugDexRarity, string> = specimenRarityAccent;

const rarityStars: Record<BugDexRarity, number> = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 3,
  Legendarisch: 4,
  Mythisch: 5
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

export function BugDexUnlockModal({ busy = false, drop, onClose }: Props) {
  const { language, t } = useI18n();
  const { height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.82)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drop) return;
    playBugSound(drop.rewardType === "bug" && (drop.entry.rarity === "Episch" || drop.entry.rarity === "Legendarisch" || drop.entry.rarity === "Mythisch") ? "bug_rare_unlock" : "bug_unlock");
    scale.setValue(0.82);
    glow.setValue(0);
    const animation = Animated.parallel([
      Animated.spring(scale, {
        friction: 5,
        tension: 95,
        toValue: 1,
        useNativeDriver: nativeDriver
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { duration: 760, toValue: 1, useNativeDriver: nativeDriver }),
          Animated.timing(glow, { duration: 760, toValue: 0, useNativeDriver: nativeDriver })
        ]),
        { iterations: 2 }
      )
    ]);
    animation.start();
    return () => animation.stop();
  }, [drop, glow, scale]);

  if (!drop) return null;
  const isPointsReward = drop.rewardType === "points";
  const isDailyReward = drop.source === "daily_login";
  const rarityColor = isPointsReward ? "#d7bd57" : rarityColors[drop.entry.rarity];
  const premiumStyle = !isPointsReward && (drop.entry.rarity === "Episch" || drop.entry.rarity === "Legendarisch" || drop.entry.rarity === "Mythisch")
    ? premiumRarityStyles[drop.entry.rarity]
    : null;
  const isMythicBugReward = !isPointsReward && drop.entry.rarity === "Mythisch";
  const premiumLabel = premiumStyle && !isPointsReward
    ? drop.entry.rarity === "Episch"
      ? t("bugdex.epicFind")
      : drop.entry.rarity === "Legendarisch"
        ? t("bugdex.legendary")
        : t("bugdex.mythic")
    : "";
  const bugFact = isPointsReward ? t("bugdex.dailyLogin") : bugDexEntryFact(drop.entry, t);
  const bugName = isPointsReward ? "" : bugDexEntryName(drop.entry, t);
  const sourceLabel = rewardSourceLabel(drop.source, language);
  const title = isPointsReward
    ? isDailyReward ? t("bugdex.daily") : t("bugdex.pointsFound")
    : language === "en"
      ? `${bugName} discovered!`
      : language === "fr"
        ? `${bugName} découvert !`
        : `${bugName} ontdekt!`;
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
          height < 700 && styles.cardCompact,
          premiumStyle && styles.premiumCard,
          { borderColor: rarityColor },
          { transform: [{ scale }] }
        ]}>
          {premiumStyle && <View style={[styles.premiumTopBar, { backgroundColor: rarityColor }]} />}
          {premiumStyle && (
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Text style={styles.rarityBadgeText}>{premiumLabel}</Text>
            </View>
          )}
          <Text style={[styles.kicker, { color: rarityColor }]}>{title}</Text>
          <View style={[styles.sourceBadge, { borderColor: rarityColor }]}>
            <Text style={[styles.sourceBadgeText, { color: rarityColor }]}>{sourceLabel}</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.artStage}>
            {premiumStyle && (
              <>
                <Image accessibilityIgnoresInvertColors source={premiumStyle.auraSource} style={styles.premiumAuraImage} />
                <Animated.View style={[styles.burstRing, { borderColor: premiumStyle.border, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                <Animated.View style={[styles.burstRingAlt, { borderColor: premiumStyle.accent, opacity: ringOpacity, transform: [{ scale: glowScale }] }]} />
              </>
            )}
            <Animated.View style={[styles.glow, { backgroundColor: premiumStyle?.glow ?? rarityColor, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <View style={[styles.rarityBackdrop, { backgroundColor: rarityColor }]} />
            {isPointsReward ? (
              <Text style={styles.pointsReward}>+{drop.points}</Text>
            ) : (
              <>
                {isMythicBugReward && <MythicRarityFrame size={166} style={styles.mythicUnlockFrame} />}
                <BugArtImage bugId={drop.entry.id} size={138} style={isMythicBugReward && styles.mythicBugArt} />
              </>
            )}
          </View>
          <Text style={styles.name}>{isPointsReward ? t("bugdex.pointsFound") : bugName}</Text>
          {!isPointsReward ? (
            <View style={styles.rarityStarsRow}>
              {Array.from({ length: rarityStars[drop.entry.rarity] }).map((_, index) => (
                <Text key={index} style={[styles.rarityStar, { color: rarityColor }]}>★</Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.meta}>{bugFact}</Text>
          {!!streakText && <Text style={[styles.streak, { color: rarityColor }]}>{streakText}</Text>}
          <Pressable disabled={busy} style={[styles.button, { backgroundColor: rarityColor }, busy && styles.buttonDisabled]} onPress={onClose}>
            <Text style={styles.buttonText}>{busy ? "..." : t("bugdex.nice")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function rewardSourceLabel(source: BugDexDropResult["source"], language: "nl" | "en" | "fr"): string {
  const category =
    source === "real_bug_scan" ? "photo"
      : source === "duel_win" || source === "rank_up" ? "duel"
        : source.startsWith("weekly_") ? "weekly"
          : source === "daily_login" || source === "daily_mission_bonus" ? "daily"
            : source.startsWith("solo_") ? "campaign"
              : source.startsWith("buddy_") ? "buddy"
                : source === "museum_reward" ? "museum"
                  : source === "research_encounter" ? "research"
                    : source === "bug_splat" ? "arcade"
                      : source === "combine" ? "combine"
                        : "activity";
  const labels = {
    nl: { photo: "VAN JE BUGFOTO", duel: "VAN EEN DUEL", weekly: "VAN JE WEEKMISSIE", daily: "VAN JE DAGBELONING", campaign: "VAN SOLO CAMPAIGN", buddy: "VAN JE BUDDY", museum: "VAN HET MUSEUM", research: "VAN ONDERZOEK", arcade: "VAN DE ARCADE", combine: "DOOR COMBINEREN", activity: "VAN JE ACTIVITEIT" },
    en: { photo: "FROM YOUR BUG PHOTO", duel: "FROM A DUEL", weekly: "FROM YOUR WEEKLY MISSION", daily: "FROM YOUR DAILY REWARD", campaign: "FROM SOLO CAMPAIGN", buddy: "FROM YOUR BUDDY", museum: "FROM THE MUSEUM", research: "FROM RESEARCH", arcade: "FROM THE ARCADE", combine: "FROM COMBINING", activity: "FROM YOUR ACTIVITY" },
    fr: { photo: "DE TA PHOTO", duel: "D'UN DUEL", weekly: "DE TA MISSION HEBDO", daily: "DE TA RÉCOMPENSE DU JOUR", campaign: "DE LA CAMPAGNE SOLO", buddy: "DE TON COMPAGNON", museum: "DU MUSÉE", research: "DE LA RECHERCHE", arcade: "DE L'ARCADE", combine: "PAR COMBINAISON", activity: "DE TON ACTIVITÉ" }
  } as const;
  return labels[language][category];
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,12,28,0.78)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7bd57",
    borderRadius: 28,
    borderWidth: 2,
    elevation: 16,
    maxHeight: "94%",
    maxWidth: 460,
    padding: 22,
    shadowColor: "#050817",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    width: "100%"
  },
  cardCompact: {
    paddingBottom: 15,
    paddingTop: 17
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
    color: "#6b3fc6",
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
    color: "#706658",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10
  },
  sourceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 11,
    paddingVertical: 4
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8
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
  rarityBackdrop: {
    borderRadius: 78,
    height: 156,
    opacity: 0.42,
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
  mythicUnlockFrame: {
    zIndex: 3
  },
  mythicBugArt: {
    zIndex: 4
  },
  name: {
    color: "#17182b",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  rarityStarsRow: {
    flexDirection: "row",
    marginTop: 7
  },
  rarityStar: {
    fontSize: 22,
    fontWeight: "900",
    marginHorizontal: 2
  },
  meta: {
    color: "#706658",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4
  },
  pointsReward: {
    color: "#17182b",
    fontSize: 54,
    fontWeight: "900"
  },
  streak: {
    color: "#6b3fc6",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#6b3fc6",
    borderRadius: 16,
    elevation: 4,
    marginTop: 18,
    paddingHorizontal: 28,
    paddingVertical: 14
  },
  buttonDisabled: {
    opacity: 0.64
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
