import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { entryByBugId } from "../services/bugDexService";
import { TradeRequest, User } from "../types";
import { BugArtImage } from "./BugArtImage";

type Props = {
  currentUser: User;
  trade: TradeRequest | null;
  onClose: () => void;
};

export function TradeAnimationModal({ currentUser, trade, onClose }: Props) {
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

    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, {
          friction: 6,
          tension: 85,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(swap, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(860),
          Animated.timing(flash, { duration: 150, toValue: 1, useNativeDriver: true }),
          Animated.timing(flash, { duration: 460, toValue: 0, useNativeDriver: true })
        ])
      ]),
      Animated.spring(reveal, {
        friction: 5,
        tension: 95,
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [cardScale, flash, reveal, swap, trade]);

  if (!trade) return null;

  const isReceiver = currentUser.uid === trade.toUserId;
  const receivedBugId = isReceiver ? trade.offerBugId : trade.requestBugId;
  const sentBugId = isReceiver ? trade.requestBugId : trade.offerBugId;
  const partnerName = isReceiver ? trade.fromUserName : trade.toUserName;
  const receivedEntry = entryByBugId(receivedBugId);
  const sentEntry = entryByBugId(sentBugId);
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
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          <Text style={styles.kicker}>Ruil voltooid</Text>
          <Text style={styles.subtitle}>Je hebt geruild met {partnerName}</Text>

          <View style={styles.stage}>
            <Animated.View style={[styles.beam, { opacity: beamOpacity }]} />
            <Animated.View style={[styles.orbit, styles.orbitA, { opacity: beamOpacity, transform: [{ rotate }] }]} />
            <Animated.View style={[styles.orbit, styles.orbitB, { opacity: beamOpacity, transform: [{ rotate }] }]} />
            <Animated.View style={[styles.flash, { opacity: flash }]} />

            <Animated.View style={[styles.tradePod, styles.leftPod, { transform: [{ translateX: leftX }, { translateY: leftY }] }]}>
              <BugArtImage bugId={sentBugId} size={78} />
            </Animated.View>
            <Animated.View style={[styles.tradePod, styles.rightPod, { transform: [{ translateX: rightX }, { translateY: rightY }] }]}>
              <BugArtImage bugId={receivedBugId} size={78} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.result, { opacity: reveal, transform: [{ scale: revealScale }] }]}>
            <View style={styles.resultArt}>
              <BugArtImage bugId={receivedBugId} size={116} />
            </View>
            <Text style={styles.resultLabel}>Nieuw ontvangen</Text>
            <Text style={styles.resultName}>{receivedEntry?.name ?? "Bug"}</Text>
            <Text style={styles.resultMeta}>Je gaf {sentEntry?.name ?? "Bug"} terug</Text>
          </Animated.View>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Klaar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(6,18,14,0.68)",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
    padding: 20,
    width: "100%"
  },
  kicker: {
    color: "#15724f",
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
  beam: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    height: 10,
    position: "absolute",
    width: 190
  },
  orbit: {
    borderColor: "#15724f",
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
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    height: 100,
    justifyContent: "center",
    position: "absolute",
    width: 100
  },
  leftPod: {
    left: 18
  },
  rightPod: {
    right: 18
  },
  result: {
    alignItems: "center",
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    width: "100%"
  },
  resultArt: {
    alignItems: "center",
    backgroundColor: "#fff9df",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    height: 136,
    justifyContent: "center",
    width: 136
  },
  resultLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    textTransform: "uppercase"
  },
  resultName: {
    color: "#102018",
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
  button: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
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
