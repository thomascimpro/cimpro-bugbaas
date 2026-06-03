import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BugDexDropResult } from "../services/bugDexService";
import { BugArtImage } from "./BugArtImage";

type Props = {
  drop: BugDexDropResult | null;
  onClose: () => void;
};

export function BugDexUnlockModal({ drop, onClose }: Props) {
  const scale = useRef(new Animated.Value(0.82)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!drop) return;
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
  const title = drop.source === "combine" ? "Combine gelukt" : drop.isNew ? "Bug unlocked" : "Dubbele bug";
  const subtitle = drop.source === "combine" && drop.isNew ? "Nieuwe vondst gemaakt" : drop.isNew ? "Nieuw in je BugDex" : "Extra exemplaar";
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Modal transparent animationType="fade" visible={Boolean(drop)} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.kicker}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.artStage}>
            <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <BugArtImage bugId={drop.entry.id} size={138} />
          </View>
          <Text style={styles.name}>{drop.entry.name}</Text>
          <Text style={styles.meta}>{drop.entry.rarity}{drop.item.count > 1 ? ` - x${drop.item.count}` : ""}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Mooi</Text>
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
  kicker: {
    color: "#15724f",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
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
