import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BugSeverity } from "../types";

const colors: Record<BugSeverity, string> = {
  Laag: "#edf7ed",
  Normaal: "#eef2ff",
  Hoog: "#fff0d9",
  Kritiek: "#ffe1dc"
};

export function SeverityBadge({ severity }: { severity: BugSeverity }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[severity] }]}>
      <Text style={styles.text}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start"
  },
  text: {
    color: "#263238",
    fontSize: 12,
    fontWeight: "700"
  }
});
