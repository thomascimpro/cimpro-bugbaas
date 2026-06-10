import React from "react";
import { ImageBackground, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BugDexRarity } from "../services/pointsService";
import { BugArtImage } from "./BugArtImage";
import { MythicRarityFrame } from "./MythicRarityFrame";

type Props = {
  bugId?: string;
  rarity?: BugDexRarity;
  size?: number;
  style?: StyleProp<ViewStyle>;
  unlocked?: boolean;
};

const jarImage = require("../../assets/generated/bug-squad-empty-jar-hd.png");

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

export function BugJarArt({ bugId, rarity = "Gewoon", size = 88, style, unlocked = true }: Props) {
  const color = rarityColors[rarity];
  const bugSize = Math.round(size * 0.58);

  return (
    <View style={[styles.wrap, { height: size, width: size }, style]}>
      <ImageBackground imageStyle={styles.jarImage} resizeMode="cover" source={jarImage} style={styles.jar}>
        <View style={[styles.tint, { backgroundColor: `${color}30`, borderColor: color }]} />
        <View style={[styles.lid, { backgroundColor: color }]} />
        <View style={styles.shine} />
        {unlocked && bugId ? (
          <>
            {rarity === "Mythisch" && <MythicRarityFrame size={Math.round(size * 0.9)} style={styles.mythicFrame} />}
            <BugArtImage bugId={bugId} size={bugSize} style={styles.bug} />
          </>
        ) : (
          <Text style={styles.locked}>?</Text>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    overflow: "hidden"
  },
  jar: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  jarImage: {
    opacity: 0.72
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 2
  },
  lid: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    height: 8,
    left: 14,
    opacity: 0.92,
    position: "absolute",
    right: 14,
    top: 8
  },
  shine: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 999,
    height: "48%",
    left: "20%",
    position: "absolute",
    top: "22%",
    transform: [{ rotate: "12deg" }],
    width: 7
  },
  mythicFrame: {
    position: "absolute",
    zIndex: 2
  },
  bug: {
    zIndex: 3
  },
  locked: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5
  }
});
