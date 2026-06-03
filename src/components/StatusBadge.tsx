import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BugStatus } from "../types";

const colors: Record<BugStatus, string> = {
  Nieuw: "#e9f3ff",
  Bevestigd: "#eaf7ee",
  "In behandeling": "#fff4d8",
  Gefixt: "#dff5e8",
  Afgekeurd: "#fde7e7",
  Dubbel: "#eceaf6"
};

export function StatusBadge({ status }: { status: BugStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[status] }]}>
      <Text style={styles.text}>{status}</Text>
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
