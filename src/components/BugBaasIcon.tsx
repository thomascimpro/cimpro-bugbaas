import React from "react";
import { Image, type ImageSourcePropType, StyleSheet, View } from "react-native";

export type BugBaasIconName = "empty" | "loading" | "location" | "locked" | "maintenance" | "offline" | "reward-error" | "scan" | "search-error";

type Props = {
  name: BugBaasIconName;
  size?: number;
};

const stateArt: Record<BugBaasIconName, ImageSourcePropType> = {
  empty: require("../../assets/generated/bug-squad-empty-jar-hd.png"),
  loading: require("../../assets/generated/bugbaas-splash-badge-hd.webp"),
  location: require("../../assets/generated/bug-radar-request-signal-hd.webp"),
  locked: require("../../assets/generated/bug-squad-empty-jar-hd.png"),
  maintenance: require("../../assets/generated/settings-gear-hd.png"),
  offline: require("../../assets/generated/bugbaas-field-emblem-v3.png"),
  "reward-error": require("../../assets/generated/bug-squad-empty-jar-hd.png"),
  scan: require("../../assets/generated/bugbaas-scan-medallion-v1.png"),
  "search-error": require("../../assets/generated/bug-radar-request-signal-hd.webp")
};

export function BugBaasIcon({ name, size = 72 }: Props) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { borderRadius: size / 2, height: size, width: size }]}
    >
      <Image resizeMode="contain" source={stateArt[name]} style={{ height: size * 0.82, width: size * 0.82 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "rgba(238,244,235,0.94)",
    borderColor: "rgba(215,189,87,0.72)",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden"
  }
});
