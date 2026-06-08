import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { characterOptionById } from "../services/characterService";

type Props = {
  characterId?: string;
  selected?: boolean;
  size?: number;
};

export function CharacterAvatarImage({ characterId, selected = false, size = 76 }: Props) {
  const option = characterOptionById(characterId);
  return (
    <View style={[styles.frame, { borderColor: selected ? option.accent : "#d7e1d9", height: size, width: size }]}>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={option.source} style={{ height: size - 8, width: size - 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden"
  }
});
