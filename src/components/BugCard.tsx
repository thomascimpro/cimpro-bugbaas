import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BugReport, ReportType } from "../types";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

const bugArtBySeverity = {
  Laag: ["zilvervisje", "fruitvlieg", "bladluis"],
  Normaal: ["mier", "mot", "pissebed"],
  Hoog: ["sprinkhaan", "lieveheersbeestje", "boktor"],
  Kritiek: ["schorpioen", "neushoornkever", "goliathkever"]
} as const;

const reportTypeMeta: Record<ReportType, { label: string; color: string; background: string; art?: BugArtId }> = {
  bug: { label: "BUG", color: "#b83227", background: "#fff1ef" },
  tip: { label: "TIP", color: "#15724f", background: "#e9f6ef", art: "gaasvlieg" },
  workaround: { label: "TRICK", color: "#6b4bb3", background: "#f0ecff", art: "pissebed" },
  idea: { label: "IDEE", color: "#986b08", background: "#fff7d7", art: "juweelkever" }
};

function bugArtForReport(bug: BugReport) {
  const reportType = bug.reportType ?? "bug";
  if (reportType !== "bug") return reportTypeMeta[reportType].art ?? "zilvervisje";
  const options = bugArtBySeverity[bug.severity];
  const seed = `${bug.id}${bug.title}${bug.project}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return options[seed % options.length];
}

export function BugCard({ bug, onPress }: { bug: BugReport; onPress: () => void }) {
  const upvotes = bug.upvoteCount ?? 0;
  const reportType = bug.reportType ?? "bug";
  const meta = reportTypeMeta[reportType];

  return (
    <Pressable style={[styles.card, { borderColor: meta.color }]} onPress={onPress}>
      <View style={styles.artPanel}>
        <BugArtImage bugId={bugArtForReport(bug)} size={74} />
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.project} numberOfLines={1}>{bug.project}</Text>
          <Text style={styles.date}>{new Date(bug.createdAt).toLocaleDateString("nl-NL")}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{bug.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{bug.reporterName}</Text>
        <View style={styles.row}>
          <View style={[styles.typeBadge, { backgroundColor: meta.background, borderColor: meta.color }]}>
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {reportType === "bug" && (
            <>
              <SeverityBadge severity={bug.severity} />
              <StatusBadge status={bug.status} />
            </>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.upvotes}>+{upvotes}</Text>
          <Text style={styles.bonus}>upvotes</Text>
          <View style={styles.detailButton}>
            <Text style={styles.detailButtonText}>Details</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "stretch",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 154,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  artPanel: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 130,
    width: 104
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  topLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  project: {
    color: "#15724f",
    flex: 1,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#17211c",
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 5
  },
  upvotes: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  meta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  bonus: {
    color: "#53645d",
    flex: 1,
    fontSize: 12,
    fontWeight: "800"
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  typeBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 10
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "900"
  },
  date: {
    color: "#77847f",
    fontSize: 12,
    fontWeight: "800"
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  detailButton: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12
  },
  detailButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  }
});
