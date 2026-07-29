import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { entryByBugId } from "../services/bugDexService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { BugDexRarity } from "../services/pointsService";
import { TradeRequest, User } from "../types";
import { BugArtImage } from "./BugArtImage";

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#2f9e44",
  Zeldzaam: "#228be6",
  Episch: "#9c36b5",
  Legendarisch: "#f59f00",
  Mythisch: "#ef4444"
};

type Props = {
  currentUser: User;
  trade: TradeRequest | null;
  onClose: () => void;
};

function tradeBugIds(trade: TradeRequest, side: "offer" | "request") {
  const ids = side === "offer" ? trade.offerBugIds : trade.requestBugIds;
  const fallback = side === "offer" ? trade.offerBugId : trade.requestBugId;
  return (Array.isArray(ids) && ids.length ? ids : [fallback]).filter(Boolean);
}

export function TradeAnimationModal({ currentUser, trade, onClose }: Props) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const swap = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trade) return;
    cardScale.setValue(0.94);
    swap.setValue(0);
    flash.setValue(0);
    reveal.setValue(0);

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, {
          friction: 6,
          tension: 85,
          toValue: 1,
          useNativeDriver: nativeDriver
        }),
        Animated.timing(swap, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: nativeDriver
        }),
        Animated.sequence([
          Animated.delay(860),
          Animated.timing(flash, { duration: 150, toValue: 1, useNativeDriver: nativeDriver }),
          Animated.timing(flash, { duration: 460, toValue: 0, useNativeDriver: nativeDriver })
        ])
      ]),
      Animated.spring(reveal, {
        friction: 5,
        tension: 95,
        toValue: 1,
        useNativeDriver: nativeDriver
      })
    ]);
    animation.start();
    return () => animation.stop();
  }, [cardScale, flash, reveal, swap, trade]);

  if (!trade) return null;

  const isReceiver = currentUser.uid === trade.toUserId;
  const receivedBugIds = isReceiver ? tradeBugIds(trade, "offer") : tradeBugIds(trade, "request");
  const sentBugIds = isReceiver ? tradeBugIds(trade, "request") : tradeBugIds(trade, "offer");
  const partnerName = isReceiver ? trade.fromUserName : trade.toUserName;
  const receivedEntries = receivedBugIds.map(entryByBugId).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const sentEntries = sentBugIds.map(entryByBugId).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const receivedRarity = receivedEntries[0]?.rarity ?? "Gewoon";
  const sentRarity = sentEntries[0]?.rarity ?? "Gewoon";
  const receivedNames = receivedEntries.map((entry) => bugDexEntryName(entry, t)).join(" + ") || "Bug";
  const sentNames = sentEntries.map((entry) => bugDexEntryName(entry, t)).join(" + ") || "Bug";
  const leftX = swap.interpolate({ inputRange: [0, 0.2, 0.76, 1], outputRange: [0, 0, 104, 104] });
  const rightX = swap.interpolate({ inputRange: [0, 0.2, 0.76, 1], outputRange: [0, 0, -104, -104] });
  const leftY = swap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -34, 0] });
  const rightY = swap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 34, 0] });
  const rotate = swap.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const beamOpacity = swap.interpolate({ inputRange: [0, 0.18, 0.85, 1], outputRange: [0.18, 0.72, 0.72, 0.18] });
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(trade)} statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, height < 720 && styles.cardCompact, { transform: [{ scale: cardScale }] }]}>
          <Text style={styles.kicker}>{t("trade.completed")}</Text>
          <Text style={styles.subtitle}>{t("trade.with", { name: partnerName })}</Text>

          <View style={[styles.stage, height < 720 && styles.stageCompact]}>
            <Animated.View style={[styles.beam, { opacity: beamOpacity }]} />
            <Animated.View style={[styles.orbit, styles.orbitA, { opacity: beamOpacity, transform: [{ rotate }] }]} />
            <Animated.View style={[styles.orbit, styles.orbitB, { opacity: beamOpacity, transform: [{ rotate }] }]} />
            <Animated.View style={[styles.flash, { opacity: flash }]} />

            <Animated.View style={[styles.tradePod, styles.leftPod, { transform: [{ translateX: leftX }, { translateY: leftY }] }]}>
              <View style={styles.podBugGrid}>
                {sentBugIds.slice(0, 4).map((bugId, index) => (
                  <BugArtImage key={`${bugId}-${index}`} bugId={bugId} size={sentBugIds.length > 1 ? 42 : 78} />
                ))}
              </View>
              <Text style={[styles.podRarity, { backgroundColor: rarityColors[sentRarity] }]}>{rarityLabel(sentRarity, t)}</Text>
            </Animated.View>
            <Animated.View style={[styles.tradePod, styles.rightPod, { transform: [{ translateX: rightX }, { translateY: rightY }] }]}>
              <View style={styles.podBugGrid}>
                {receivedBugIds.slice(0, 4).map((bugId, index) => (
                  <BugArtImage key={`${bugId}-${index}`} bugId={bugId} size={receivedBugIds.length > 1 ? 42 : 78} />
                ))}
              </View>
              <Text style={[styles.podRarity, { backgroundColor: rarityColors[receivedRarity] }]}>{rarityLabel(receivedRarity, t)}</Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.result, { opacity: reveal, transform: [{ scale: revealScale }] }]}>
            <View style={[styles.resultArt, height < 720 && styles.resultArtCompact]}>
              <View style={styles.resultBugGrid}>
                {receivedBugIds.slice(0, 6).map((bugId, index) => (
                  <BugArtImage key={`${bugId}-${index}`} bugId={bugId} size={receivedBugIds.length > 1 ? 46 : 116} />
                ))}
              </View>
            </View>
            <Text style={styles.resultLabel}>{t("trade.received")}</Text>
            <Text style={styles.resultName}>{receivedNames}</Text>
            <Text style={[styles.resultRarity, { backgroundColor: rarityColors[receivedRarity] }]}>{rarityLabel(receivedRarity, t)}</Text>
            <Text style={styles.resultMeta}>{t("trade.gave", { name: sentNames })}</Text>
            <Text style={[styles.sentRarity, { color: rarityColors[sentRarity] }]}>{rarityLabel(sentRarity, t)}</Text>
          </Animated.View>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{t("common.done")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8,12,28,0.8)",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fff9e9",
    borderColor: "#d9ad50",
    borderRadius: 28,
    borderWidth: 2,
    elevation: 16,
    maxHeight: "95%",
    maxWidth: 480,
    overflow: "hidden",
    padding: 20,
    shadowColor: "#050817",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    width: "100%"
  },
  cardCompact: {
    paddingBottom: 14,
    paddingTop: 14
  },
  kicker: {
    color: "#6b3fc6",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  subtitle: {
    color: "#52665d",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  stage: {
    alignItems: "center",
    height: 174,
    justifyContent: "center",
    marginTop: 14,
    width: "100%"
  },
  stageCompact: {
    height: 142,
    marginTop: 8,
    transform: [{ scale: 0.88 }]
  },
  beam: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    height: 10,
    position: "absolute",
    width: 190
  },
  orbit: {
    borderColor: "#6b3fc6",
    borderRadius: 75,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 150,
    position: "absolute",
    width: 150
  },
  orbitA: {
    transform: [{ rotate: "16deg" }]
  },
  orbitB: {
    borderColor: "#d7bd57",
    transform: [{ rotate: "-16deg" }]
  },
  flash: {
    backgroundColor: "#fff4b8",
    borderRadius: 90,
    height: 180,
    position: "absolute",
    width: 180
  },
  tradePod: {
    alignItems: "center",
    backgroundColor: "#f4efff",
    borderColor: "#cbb8ed",
    borderRadius: 18,
    borderWidth: 1,
    height: 112,
    justifyContent: "center",
    position: "absolute",
    width: 100
  },
  podRarity: {
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
    marginTop: -4,
    maxWidth: 88,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  podBugGrid: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    justifyContent: "center",
    maxHeight: 82,
    width: 88
  },
  leftPod: {
    left: 18
  },
  rightPod: {
    right: 18
  },
  result: {
    alignItems: "center",
    backgroundColor: "#f8f2e5",
    borderColor: "#dfca9d",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    width: "100%"
  },
  resultArt: {
    alignItems: "center",
    backgroundColor: "#fff9df",
    borderColor: "#d7bd57",
    borderRadius: 20,
    borderWidth: 1,
    height: 136,
    justifyContent: "center",
    width: 136
  },
  resultArtCompact: {
    height: 100,
    width: 100
  },
  resultBugGrid: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    padding: 6
  },
  resultLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    textTransform: "uppercase"
  },
  resultName: {
    color: "#17182b",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
  },
  resultMeta: {
    color: "#52665d",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  resultRarity: {
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlign: "center"
  },
  sentRarity: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
    textAlign: "center"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#6b3fc6",
    borderRadius: 16,
    elevation: 4,
    marginTop: 16,
    paddingHorizontal: 30,
    paddingVertical: 13
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  }
});
