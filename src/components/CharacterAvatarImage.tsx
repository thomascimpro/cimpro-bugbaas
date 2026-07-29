import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { characterOptionById } from "../services/characterService";

type Props = {
  characterId?: string;
  locked?: boolean;
  selected?: boolean;
  size?: number;
  variant?: "avatar" | "hero";
};

export function CharacterAvatarImage({ characterId, locked = false, selected = false, size = 76, variant = "avatar" }: Props) {
  const option = characterOptionById(characterId);
  const inset = variant === "hero" ? 2 : 8;
  return (
    <View
      style={[
        styles.frame,
        variant === "hero" && styles.heroFrame,
        selected && styles.selectedFrame,
        { borderColor: selected ? option.accent : variant === "hero" ? "rgba(255,255,255,0.28)" : "#d7e1d9", height: size, width: size }
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={option.source}
        style={[{ height: size - inset, width: size - inset }, locked && styles.lockedImage]}
      />
      {locked && <View pointerEvents="none" style={styles.lockedOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden"
  },
  heroFrame: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 28
  },
  lockedImage: {
    opacity: 0.34,
    tintColor: "#26342f"
  },
  lockedOverlay: {
    backgroundColor: "rgba(16,32,24,0.18)",
    ...StyleSheet.absoluteFillObject
  },
  selectedFrame: {
    borderWidth: 3,
    elevation: 5,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7
  }
});
