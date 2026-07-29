import React, { type ReactNode } from "react";
import { Image, type ImageSourcePropType, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { BugDexRarity } from "../../services/pointsService";

export type MuseumVisualStage = "hidden" | "discovered" | "open" | "curated" | "master";

const categoryEmblems: Record<string, ImageSourcePropType> = {
  "bugdex-set-all": require("../../../assets/badges/bugdex-set-all.png"),
  "bugdex-set-beetle-brigade": require("../../../assets/badges/bugdex-set-beetle-brigade.png"),
  "bugdex-set-buzz-squad": require("../../../assets/badges/bugdex-set-buzz-squad.png"),
  "bugdex-set-house-raiders": require("../../../assets/badges/bugdex-set-house-raiders.png"),
  "bugdex-set-jump-and-hide": require("../../../assets/badges/bugdex-set-jump-and-hide.png"),
  "bugdex-set-mythic-showcase": require("../../../assets/badges/bugdex-set-mythic-showcase.png"),
  "bugdex-set-night-crew": require("../../../assets/badges/bugdex-set-night-crew.png"),
  "bugdex-set-pattern-warnings": require("../../../assets/badges/bugdex-set-pattern-warnings.png"),
  "bugdex-set-sting-team": require("../../../assets/badges/bugdex-set-sting-team.png"),
  "bugdex-set-water-hunters": require("../../../assets/badges/bugdex-set-water-hunters.png"),
  "bugdex-set-web-and-sting": require("../../../assets/badges/bugdex-set-web-and-sting.png"),
  "bugdex-set-wings-of-color": require("../../../assets/badges/bugdex-set-wings-of-color.png")
};

export const specimenRarityAccent: Record<BugDexRarity, string> = {
  Gewoon: "#789181",
  Zeldzaam: "#6c8fa1",
  Episch: "#857596",
  Legendarisch: "#b28b46",
  Mythisch: "#b4232f"
};

const rarityLevel: Record<BugDexRarity, number> = {
  Gewoon: 1,
  Zeldzaam: 2,
  Episch: 3,
  Legendarisch: 4,
  Mythisch: 5
};

export function BugDexCategoryEmblem({ badgeId = "bugdex-set-all", completed = false, progress, size = 58 }: {
  badgeId?: string;
  completed?: boolean;
  progress?: number;
  size?: number;
}) {
  const source = categoryEmblems[badgeId] ?? categoryEmblems["bugdex-set-all"];
  return (
    <View style={[styles.emblem, completed && styles.emblemComplete, { height: size, width: size }]}>
      <View style={styles.emblemInset}>
        <Image accessibilityIgnoresInvertColors resizeMode="contain" source={source} style={{ height: size - 10, width: size - 10 }} />
      </View>
      {typeof progress === "number" ? (
        <View style={styles.emblemProgress}><Text style={styles.emblemProgressText}>{Math.round(progress)}%</Text></View>
      ) : null}
    </View>
  );
}

export function RarityMarks({ rarity, compact = false }: { rarity: BugDexRarity; compact?: boolean }) {
  const level = rarityLevel[rarity];
  const accent = specimenRarityAccent[rarity];
  return (
    <View accessibilityLabel={`${level} / 5`} style={styles.rarityMarks}>
      {Array.from({ length: 5 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.rarityMark,
            compact && styles.rarityMarkCompact,
            index < level ? { backgroundColor: accent, borderColor: accent } : styles.rarityMarkEmpty
          ]}
        />
      ))}
    </View>
  );
}

export function SpecimenFrame({ children, rarity, style }: { children: ReactNode; rarity: BugDexRarity; style?: ViewStyle }) {
  const accent = specimenRarityAccent[rarity];
  return (
    <View style={[styles.frame, { borderColor: accent }, style]}>
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerTopRight, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor: accent }]} />
      {children}
    </View>
  );
}

export function LockedBugSilhouette({ size = 78 }: { size?: number }) {
  const scale = size / 78;
  return (
    <View accessibilityLabel="Undiscovered specimen" style={[styles.silhouette, { height: size, width: size }]}>
      <View style={[styles.wing, styles.wingLeft, { transform: [{ rotate: "-21deg" }, { scale }] }]} />
      <View style={[styles.wing, styles.wingRight, { transform: [{ rotate: "21deg" }, { scale }] }]} />
      <View style={[styles.body, { transform: [{ scale }] }]} />
      <View style={[styles.head, { transform: [{ scale }] }]} />
      <View style={[styles.antenna, styles.antennaLeft, { transform: [{ rotate: "-28deg" }, { scale }] }]} />
      <View style={[styles.antenna, styles.antennaRight, { transform: [{ rotate: "28deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legLeftTop, { transform: [{ rotate: "24deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legRightTop, { transform: [{ rotate: "-24deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legLeftBottom, { transform: [{ rotate: "42deg" }, { scale }] }]} />
      <View style={[styles.leg, styles.legRightBottom, { transform: [{ rotate: "-42deg" }, { scale }] }]} />
    </View>
  );
}

export function MuseumStageMark({ stage, accent = "#d7bd57", size = 22 }: { stage: MuseumVisualStage; accent?: string; size?: number }) {
  const reached = stage !== "hidden";
  const innerScale = stage === "master" ? 0.48 : stage === "curated" ? 0.38 : stage === "open" ? 0.28 : 0.18;
  return (
    <View style={[styles.stageMark, { borderColor: reached ? accent : "#718079", height: size, width: size }]}>
      {stage === "hidden" ? (
        <View style={styles.stageLock}>
          <View style={[styles.stageLockLoop, { borderColor: "#718079" }]} />
          <View style={styles.stageLockBody} />
        </View>
      ) : (
        <View style={[styles.stageMarkInner, { backgroundColor: accent, height: size * innerScale, width: size * innerScale }]} />
      )}
    </View>
  );
}

export function MuseumDisplayCase({ children, accent = "#d7bd57", compact = false }: { children: ReactNode; accent?: string; compact?: boolean }) {
  return (
    <View style={[styles.case, compact && styles.caseCompact, { borderColor: `${accent}99` }]}>
      <View style={styles.caseHighlight} />
      <View style={[styles.caseRail, { backgroundColor: accent }]} />
      <View style={styles.caseContent}>{children}</View>
      <View style={[styles.plinthTop, { borderColor: accent }]} />
      <View style={styles.plinthBase} />
    </View>
  );
}

export function CompletedCategoryMedal({ size = 38 }: { size?: number }) {
  return (
    <View style={[styles.medal, { height: size + 14, width: size + 8 }]}>
      <View style={styles.ribbonLeft} />
      <View style={styles.ribbonRight} />
      <View style={[styles.medalDisc, { borderRadius: size / 2, height: size, width: size }]}>
        <View style={styles.medalDiamond} />
      </View>
    </View>
  );
}

export function JournalStamp({ text }: { text: string }) {
  return <View style={styles.stamp}><Text numberOfLines={1} style={styles.stampText}>{text}</Text></View>;
}

export function ResearchLabel({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.label, dark && styles.labelDark]}>
      <Text style={[styles.labelText, dark && styles.labelTextDark]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emblem: { alignItems: "center", backgroundColor: "#201d45", borderColor: "#917b49", borderRadius: 999, borderWidth: 1.5, justifyContent: "center", padding: 3 },
  emblemComplete: { borderColor: "#e1c56d", borderWidth: 2.5 },
  emblemInset: { alignItems: "center", backgroundColor: "#fff8e7", borderRadius: 999, height: "100%", justifyContent: "center", overflow: "hidden", width: "100%" },
  emblemProgress: { backgroundColor: "#2a2552", borderColor: "#d7bd57", borderRadius: 99, borderWidth: 1, bottom: -4, paddingHorizontal: 5, paddingVertical: 2, position: "absolute", right: -5 },
  emblemProgressText: { color: "#fff5d2", fontSize: 8, fontWeight: "900" },
  rarityMarks: { alignItems: "center", flexDirection: "row", gap: 4 },
  rarityMark: { borderRadius: 2, borderWidth: 1, height: 8, transform: [{ rotate: "45deg" }], width: 8 },
  rarityMarkCompact: { height: 6, width: 6 },
  rarityMarkEmpty: { backgroundColor: "transparent", borderColor: "#aebbb4" },
  frame: { alignItems: "center", backgroundColor: "#f8f1e3", borderRadius: 14, borderWidth: 1.5, justifyContent: "center", overflow: "hidden", position: "relative" },
  corner: { height: 13, position: "absolute", width: 13 },
  cornerTopLeft: { borderLeftWidth: 2, borderTopWidth: 2, left: 5, top: 5 },
  cornerTopRight: { borderRightWidth: 2, borderTopWidth: 2, right: 5, top: 5 },
  cornerBottomLeft: { borderBottomWidth: 2, borderLeftWidth: 2, bottom: 5, left: 5 },
  cornerBottomRight: { borderBottomWidth: 2, borderRightWidth: 2, bottom: 5, right: 5 },
  silhouette: { alignItems: "center", justifyContent: "center", opacity: 0.58, position: "relative" },
  body: { backgroundColor: "#93a59c", borderRadius: 12, height: 38, position: "absolute", width: 17 },
  head: { backgroundColor: "#93a59c", borderRadius: 8, height: 15, position: "absolute", top: 14, width: 15 },
  wing: { backgroundColor: "#b1bdb7", height: 31, position: "absolute", top: 25, width: 25 },
  wingLeft: { borderBottomLeftRadius: 17, borderTopLeftRadius: 17, left: 6 },
  wingRight: { borderBottomRightRadius: 17, borderTopRightRadius: 17, right: 6 },
  antenna: { backgroundColor: "#93a59c", height: 19, position: "absolute", top: 2, width: 2 },
  antennaLeft: { left: 29 },
  antennaRight: { right: 29 },
  leg: { backgroundColor: "#93a59c", height: 2, position: "absolute", width: 25 },
  legLeftTop: { left: 12, top: 39 },
  legRightTop: { right: 12, top: 39 },
  legLeftBottom: { left: 13, top: 52 },
  legRightBottom: { right: 13, top: 52 },
  stageMark: { alignItems: "center", backgroundColor: "rgba(25,22,53,0.92)", borderRadius: 999, borderWidth: 1.5, justifyContent: "center" },
  stageMarkInner: { borderRadius: 2, transform: [{ rotate: "45deg" }] },
  stageLock: { alignItems: "center", height: 14, justifyContent: "flex-end", width: 12 },
  stageLockLoop: { borderRadius: 5, borderWidth: 1.5, height: 8, position: "absolute", top: 0, width: 8 },
  stageLockBody: { backgroundColor: "#718079", borderRadius: 2, height: 7, width: 10 },
  case: { alignItems: "center", backgroundColor: "rgba(237,233,255,0.13)", borderRadius: 16, borderWidth: 1, height: 208, justifyContent: "flex-end", overflow: "hidden", paddingHorizontal: 8, paddingTop: 10, position: "relative" },
  caseCompact: { height: 156 },
  caseHighlight: { backgroundColor: "rgba(255,255,255,0.11)", height: 260, left: 13, position: "absolute", top: -38, transform: [{ rotate: "18deg" }], width: 18 },
  caseRail: { height: 3, left: 0, position: "absolute", right: 0, top: 0 },
  caseContent: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  plinthTop: { backgroundColor: "#ded0b4", borderWidth: 1, height: 9, width: "82%" },
  plinthBase: { backgroundColor: "#aa9d83", height: 30, width: "68%" },
  medal: { alignItems: "center", justifyContent: "flex-end" },
  ribbonLeft: { backgroundColor: "#5a5297", height: 28, left: 9, position: "absolute", top: 0, transform: [{ rotate: "8deg" }], width: 11 },
  ribbonRight: { backgroundColor: "#413b7a", height: 28, position: "absolute", right: 9, top: 0, transform: [{ rotate: "-8deg" }], width: 11 },
  medalDisc: { alignItems: "center", backgroundColor: "#d7bd57", borderColor: "#7d6633", borderWidth: 2, justifyContent: "center" },
  medalDiamond: { backgroundColor: "#3c376e", height: 10, transform: [{ rotate: "45deg" }], width: 10 },
  stamp: { borderColor: "#7b5944", borderRadius: 99, borderWidth: 1.5, maxWidth: 110, paddingHorizontal: 7, paddingVertical: 4, transform: [{ rotate: "-3deg" }] },
  stampText: { color: "#7b5944", fontSize: 8, fontWeight: "900", letterSpacing: 0.4, textTransform: "uppercase" },
  label: { backgroundColor: "#eee2c8", borderColor: "#c7b899", borderRadius: 5, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4 },
  labelDark: { backgroundColor: "#292650", borderColor: "#696393" },
  labelText: { color: "#4f493d", fontSize: 9, fontWeight: "800" },
  labelTextDark: { color: "#eef5ef" }
});
