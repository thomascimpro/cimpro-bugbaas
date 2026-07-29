import React from "react";
import { StyleSheet, View } from "react-native";
import type { Language } from "../services/i18n";
import { flagPatternForLanguage } from "./LanguageFlagModel";

type Props = {
  language: Language;
  size?: number;
};

export function LanguageFlag({ language, size = 24 }: Props) {
  const pattern = flagPatternForLanguage(language);
  const width = size;
  const height = Math.round(size * 0.66);

  return (
    <View accessibilityLabel={language} style={[styles.frame, { height, width }]}>
      {pattern === "netherlands" ? (
        <>
          <View style={[styles.horizontalBand, styles.nlRed]} />
          <View style={[styles.horizontalBand, styles.white]} />
          <View style={[styles.horizontalBand, styles.nlBlue]} />
        </>
      ) : null}
      {pattern === "france" ? (
        <View style={styles.row}>
          <View style={[styles.verticalBand, styles.frBlue]} />
          <View style={[styles.verticalBand, styles.white]} />
          <View style={[styles.verticalBand, styles.frRed]} />
        </View>
      ) : null}
      {pattern === "united-kingdom" ? (
        <View style={[styles.ukBase, { height, width }]}>
          <View style={[styles.ukDiagonal, styles.ukDiagonalOne, { width: size * 1.3 }]} />
          <View style={[styles.ukDiagonal, styles.ukDiagonalTwo, { width: size * 1.3 }]} />
          <View style={styles.ukWhiteHorizontal} />
          <View style={styles.ukWhiteVertical} />
          <View style={styles.ukRedHorizontal} />
          <View style={styles.ukRedVertical} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderColor: "rgba(255,255,255,0.55)", borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  row: { flex: 1, flexDirection: "row" },
  horizontalBand: { flex: 1 },
  verticalBand: { flex: 1 },
  nlRed: { backgroundColor: "#ae1c28" },
  nlBlue: { backgroundColor: "#21468b" },
  frBlue: { backgroundColor: "#0055a4" },
  frRed: { backgroundColor: "#ef4135" },
  white: { backgroundColor: "#ffffff" },
  ukBase: { backgroundColor: "#21468b", overflow: "hidden", position: "relative" },
  ukDiagonal: { backgroundColor: "#ffffff", height: 4, left: -5, position: "absolute", top: "42%" },
  ukDiagonalOne: { transform: [{ rotate: "32deg" }] },
  ukDiagonalTwo: { transform: [{ rotate: "-32deg" }] },
  ukWhiteHorizontal: { backgroundColor: "#ffffff", height: "34%", left: 0, position: "absolute", right: 0, top: "33%" },
  ukWhiteVertical: { backgroundColor: "#ffffff", bottom: 0, left: "36%", position: "absolute", top: 0, width: "28%" },
  ukRedHorizontal: { backgroundColor: "#cf142b", height: "16%", left: 0, position: "absolute", right: 0, top: "42%" },
  ukRedVertical: { backgroundColor: "#cf142b", bottom: 0, left: "43%", position: "absolute", top: 0, width: "14%" }
});
