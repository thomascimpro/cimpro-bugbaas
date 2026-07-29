import React from "react";
import { Image, type ImageSourcePropType, StyleSheet, View } from "react-native";

export type GameUiIconName = "back" | "badge" | "check" | "close" | "gallery" | "location" | "next" | "profile" | "report" | "reward" | "scan" | "settings";

const sources: Record<GameUiIconName, ImageSourcePropType> = {
  back: require("../../../assets/buddy/kenney/extracted/ui-pack/PNG/Yellow/Default/arrow_basic_w.png"),
  badge: require("../../../assets/generated/bugbaas-field-emblem-v3.png"),
  check: require("../../../assets/generated/bugbaas-field-emblem-v3.png"),
  close: require("../../../assets/buddy/kenney/extracted/ui-pack/PNG/Yellow/Default/icon_cross.png"),
  gallery: require("../../../assets/new/ChatGPT Image 25 jul 2026, 20_59_15 (9).webp"),
  location: require("../../../assets/generated/bug-radar-request-signal-hd.webp"),
  next: require("../../../assets/buddy/kenney/extracted/ui-pack/PNG/Yellow/Default/arrow_basic_e.png"),
  profile: require("../../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (5).webp"),
  report: require("../../../assets/new/ChatGPT Image 25 jul 2026, 20_59_15 (9).webp"),
  reward: require("../../../assets/generated/bugdex_popup_aura_epic.png"),
  scan: require("../../../assets/generated/bugbaas-scan-medallion-v1.png"),
  settings: require("../../../assets/generated/settings-gear-hd.png")
};

type Props = {
  name: GameUiIconName;
  size?: number;
};

export function GameUiIcon({ name, size = 24 }: Props) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { height: size, width: size }]}>
      <Image resizeMode="contain" source={sources[name]} style={{ height: size, width: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  }
});
