import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BugReport } from "../types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export function BugCard({ bug, onPress }: { bug: BugReport; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{bug.title}</Text>
        <View style={styles.scoreWrap}>
          <Text style={styles.points}>{bug.points} pt</Text>
          <Text style={styles.upvotes}>+{bug.upvoteCount ?? 0}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{bug.project} · {bug.reporterName}</Text>
      <View style={styles.row}>
        <SeverityBadge severity={bug.severity} />
        <StatusBadge status={bug.status} />
      </View>
      <Text style={styles.date}>{new Date(bug.createdAt).toLocaleDateString("nl-NL")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dde3df",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  title: {
    color: "#17211c",
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  points: {
    color: "#1d6f52",
    fontSize: 14,
    fontWeight: "800"
  },
  scoreWrap: {
    alignItems: "flex-end",
    gap: 4
  },
  upvotes: {
    backgroundColor: "#eef4ed",
    borderRadius: 6,
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  meta: {
    color: "#53645d",
    marginTop: 4
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10
  },
  date: {
    color: "#77847f",
    fontSize: 12,
    marginTop: 10
  }
});
