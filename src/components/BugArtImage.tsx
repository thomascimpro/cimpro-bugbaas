import React from "react";
import { Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BugArtId, getBugArtSource } from "../services/bugArt";
import { bugDexFallbackVariantForId } from "../services/bugDexExpansion";
import { InsectVariant } from "../services/pointsService";
import { InsectIllustration } from "./InsectIllustration";

type Props = {
  bugId?: BugArtId | string;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  fallbackVariant?: InsectVariant;
  fallbackLevel?: number;
};

export function BugArtImage({ bugId, size = 56, opacity = 1, style, fallbackVariant, fallbackLevel = 2 }: Props) {
  const source = getBugArtSource(bugId);

  return (
    <View style={[styles.wrap, { height: size, opacity, width: size }, style]}>
      {source ? (
        <Image accessibilityLabel={bugId ? `${bugId} bug art` : "bug art"} resizeMode="contain" source={source} style={styles.image} />
      ) : (
        <InsectIllustration size={size} variant={fallbackVariant ?? (bugId ? bugDexFallbackVariantForId(bugId) : "beetle")} evolutionLevel={fallbackLevel} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    height: "100%",
    width: "100%"
  }
});
