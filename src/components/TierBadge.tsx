import React from "react";
import { DimensionValue, StyleSheet, Text, View } from "react-native";
import { getTierForPoints, pointsUntilNextTier, userTiers } from "../services/pointsService";
import { BugArtImage } from "./BugArtImage";

type Props = {
  points: number;
  compact?: boolean;
  rank?: number;
};

export function TierBadge({ points, compact = false, rank }: Props) {
  const tier = rank === 0 ? getTierForPoints(Number.MAX_SAFE_INTEGER) : getTierForPoints(points);
  const next = pointsUntilNextTier(points);
  const nextTier = userTiers.find((item) => item.minPoints > points);
  const progressWidth: DimensionValue = nextTier
    ? `${Math.min(100, Math.max(4, Math.round(((points - tier.minPoints) / Math.max(1, nextTier.minPoints - tier.minPoints)) * 100)))}%`
    : "100%";

  return (
    <View style={[styles.card, compact && styles.compact, { backgroundColor: tier.frameBackground, borderColor: tier.frameColor }]}>
      <View style={[styles.frameGlow, { backgroundColor: tier.frameAccent }]} />
      <View style={[styles.innerFrame, { borderColor: tier.frameAccent }]}>
        <View style={[styles.cornerPlate, { backgroundColor: tier.frameAccent, borderColor: tier.frameColor }]}>
          <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={compact ? 30 : 38} />
        </View>
        <View style={[styles.circuitLine, styles.circuitTop, { backgroundColor: tier.frameColor }]} />
        <View style={[styles.circuitLine, styles.circuitBottom, { backgroundColor: tier.frameColor }]} />
        <View style={[styles.medal, { backgroundColor: tier.frameAccent, borderColor: tier.frameColor }]}>
          <Text style={[styles.star, { color: tier.frameColor }]}>★</Text>
        </View>
        <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={compact ? Math.max(42, tier.bugSize * 0.68) : Math.max(64, tier.bugSize * 0.86)} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: tier.color }]}>{rank === 0 ? "Opperbugmeister" : tier.title}</Text>
        <Text style={styles.meta}>{points} pt</Text>
        {!compact && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { backgroundColor: tier.frameColor, width: progressWidth }]} />
            </View>
            <Text style={styles.next}>{next ? `${next} tot volgende tier - ${tier.rewardText}` : "Max tier - Crown frame"}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 3,
    elevation: 2,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  compact: {
    borderWidth: 2,
    padding: 8
  },
  frameGlow: {
    bottom: 0,
    left: 0,
    opacity: 0.18,
    position: "absolute",
    right: 0,
    top: 0
  },
  innerFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 8,
    borderWidth: 1,
    height: 92,
    justifyContent: "center",
    minWidth: 104,
    overflow: "visible"
  },
  cornerPlate: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    left: -1,
    position: "absolute",
    top: -1,
    width: 58,
    zIndex: 2
  },
  circuitLine: {
    height: 2,
    opacity: 0.42,
    position: "absolute",
    right: 12,
    width: 34
  },
  circuitTop: {
    top: 14
  },
  circuitBottom: {
    bottom: 14,
    left: 12,
    right: undefined
  },
  medal: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 2,
    bottom: -12,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    width: 42,
    zIndex: 3
  },
  star: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20
  },
  body: {
    flex: 1
  },
  name: {
    fontSize: 15,
    fontWeight: "900"
  },
  meta: {
    color: "#53645d",
    fontSize: 12,
    marginTop: 2
  },
  next: {
    color: "#77847f",
    fontSize: 12,
    marginTop: 5
  },
  progressTrack: {
    backgroundColor: "rgba(16,32,24,0.13)",
    borderRadius: 8,
    height: 7,
    marginTop: 7,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: 8,
    height: "100%"
  }
});
