import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { InsectIllustration } from "./InsectIllustration";
import { getTierForPoints, pointsUntilNextTier } from "../services/pointsService";

type Props = {
  points: number;
  compact?: boolean;
  rank?: number;
};

export function TierBadge({ points, compact = false, rank }: Props) {
  const tier = rank === 0 ? getTierForPoints(Number.MAX_SAFE_INTEGER) : getTierForPoints(points);
  const next = pointsUntilNextTier(points);

  return (
    <View style={[styles.card, compact && styles.compact, { borderColor: tier.color }]}>
      <InsectIllustration size={compact ? Math.max(36, tier.bugSize * 0.62) : tier.bugSize} variant={tier.insect} evolutionLevel={tier.evolutionLevel} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: tier.color }]}>{rank === 0 ? "Opperbugmeister" : tier.title}</Text>
        <Text style={styles.meta}>{points} pt</Text>
        {!compact && <Text style={styles.next}>{next ? `${next} tot volgende tier` : "Max tier"}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  compact: {
    borderWidth: 0,
    padding: 0
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
  }
});
