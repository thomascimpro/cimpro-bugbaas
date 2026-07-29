import React from "react";
import { Image, type ImageSourcePropType, StyleSheet, View } from "react-native";

export type NavigationArtName = "world" | "collection" | "play" | "missions" | "profile" | "settings" | "bugdex" | "museum" | "journal";

const navigationArt: Record<NavigationArtName, ImageSourcePropType> = {
  world: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_11 (1).webp"),
  collection: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (2).webp"),
  play: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (3).webp"),
  missions: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (4).webp"),
  profile: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (5).webp"),
  settings: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (6).webp"),
  bugdex: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_15 (7).webp"),
  museum: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_15 (8).webp"),
  journal: require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_15 (9).webp")
};

type Props = {
  active?: boolean;
  name: NavigationArtName;
  size?: number;
};

export function NavigationArt({ active = false, name, size = 36 }: Props) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { height: size, width: size }, active && styles.active]}>
      <Image resizeMode="contain" source={navigationArt[name]} style={{ height: size, width: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center"
  },
  active: {
    transform: [{ scale: 1.06 }]
  }
});
