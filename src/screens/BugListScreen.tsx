import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugCard } from "../components/BugCard";
import { listBugs } from "../services/bugService";
import { statusLabel, useI18n } from "../services/i18n";
import { BugReport, BugStatus, ReportType } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Nieuw", "Bevestigd", "In behandeling", "Gefixt"];
const reportFilters: Array<{ value: ReportType | "all"; labelKey: string }> = [
  { value: "all", labelKey: "filter.all" },
  { value: "bug", labelKey: "filter.bugs" },
  { value: "tip", labelKey: "filter.tips" },
  { value: "workaround", labelKey: "filter.tricks" },
  { value: "idea", labelKey: "filter.idea" }
];
const timeFilters = [
  { value: "all", labelKey: "buglist.periodAll" },
  { value: "today", labelKey: "buglist.periodToday" },
  { value: "thisWeek", labelKey: "buglist.periodThisWeek" }
] as const;
type TimeFilter = typeof timeFilters[number]["value"];
const reportTypeLabels: Record<ReportType, string> = {
  bug: "bug",
  tip: "tip",
  workaround: "trick",
  idea: "idee"
};
const fieldOperationsBoard = require("../../assets/generated/field-operations-board-v1.jpg");

type Props = {
  onBack: () => void;
  onNew: () => void;
  onSelect: (bug: BugReport) => void;
};

export function BugListScreen({ onBack, onNew, onSelect }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<BugStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [timeOpen, setTimeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedSearch = normalizeSearch(searchQuery);
  const hasActiveFilters = Boolean(filter || timeFilter !== "all" || typeFilter !== "all" || normalizedSearch);
  const visibleReports = reports.filter((report) => {
    const reportType = report.reportType ?? "bug";
    if (typeFilter !== "all" && reportType !== typeFilter) return false;
    if (!reportMatchesTimeFilter(report.createdAt, timeFilter)) return false;
    if (filter && reportType === "bug" && report.status !== filter) return false;
    if (filter && reportType !== "bug") return false;
    if (normalizedSearch && !reportMatchesSearch(report, normalizedSearch)) return false;
    return true;
  });

  useEffect(() => {
    setLoading(true);
    listBugs().then(setReports).finally(() => setLoading(false));
  }, []);

  function changeTypeFilter(nextFilter: ReportType | "all") {
    setTypeFilter(nextFilter);
    if (nextFilter !== "bug") setFilter(undefined);
  }

  function resetFilters() {
    setFilter(undefined);
    setTypeFilter("all");
    setTimeFilter("all");
    setTimeOpen(false);
    setSearchQuery("");
  }

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <ImageBackground imageStyle={styles.headerImage} resizeMode="cover" source={fieldOperationsBoard} style={styles.header}>
        <View style={styles.headerVeil}>
        <View style={styles.headerText}>
          <Text style={[sharedStyles.title, styles.headerTitle]}>{t("buglist.title")}</Text>
          <Text style={styles.subtitle}>{t("buglist.count", { count: visibleReports.length })}</Text>
        </View>
        <Pressable style={styles.newButton} onPress={onNew}>
          <BugArtImage bugId="lieveheersbeestje" size={32} />
          <Text style={styles.newButtonText}>{t("common.new")}</Text>
        </Pressable>
        </View>
      </ImageBackground>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel={t("buglist.search")}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          placeholder={t("buglist.searchPlaceholder")}
          placeholderTextColor="#77847f"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {hasActiveFilters && (
          <Pressable style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>{t("common.reset")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {reportFilters.map((item) => {
          const active = typeFilter === item.value;
          return (
            <Pressable key={item.value} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => changeTypeFilter(item.value)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={styles.projectButton} onPress={() => setTimeOpen((current) => !current)}>
        <Text style={[styles.projectButtonText, timeFilter === "all" && styles.projectButtonPlaceholder]}>
          {t("buglist.period", { value: t(timeFilters.find((item) => item.value === timeFilter)?.labelKey ?? "buglist.periodAll") })}
        </Text>
      </Pressable>
      {timeOpen && (
        <View style={styles.projectMenu}>
          {timeFilters.map((item) => {
            const active = timeFilter === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.projectOption, active && styles.projectOptionActive]}
                onPress={() => {
                  setTimeFilter(item.value);
                  setTimeOpen(false);
                }}
              >
                <Text style={[styles.projectOptionText, active && styles.projectOptionTextActive]}>{t(item.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {(typeFilter === "all" || typeFilter === "bug") && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
          <Pressable style={[styles.statusPill, !filter && styles.statusPillActive]} onPress={() => setFilter(undefined)}>
            <Text style={[styles.statusText, !filter && styles.statusTextActive]}>{t("buglist.allStatuses")}</Text>
          </Pressable>
          {statuses.map((status) => {
            const active = filter === status;
            return (
              <Pressable key={status} style={[styles.statusPill, active && styles.statusPillActive]} onPress={() => setFilter(status)}>
                <Text style={[styles.statusText, active && styles.statusTextActive]}>{statusLabel(status, t)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={visibleReports}
          keyExtractor={(bug) => bug.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BugArtImage bugId="zilvervisje" size={74} opacity={0.72} />
              <Text style={styles.emptyTitle}>{t("buglist.emptyTitle")}</Text>
              <Text style={styles.emptyText}>{t("buglist.emptyText")}</Text>
            </View>
          }
          renderItem={({ item }) => <BugCard bug={item} onPress={() => onSelect(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>{t("common.back")}</Text>
      </Pressable>
    </View>
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function reportMatchesSearch(report: BugReport, query: string): boolean {
  const reportType = report.reportType ?? "bug";
  const haystack = [
    report.title,
    report.reporterName,
    report.description,
    report.steps,
    report.status,
    report.severity,
    report.organizationName,
    reportTypeLabels[reportType]
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function reportMatchesTimeFilter(createdAt: string, filter: TimeFilter): boolean {
  if (filter === "all") return true;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (filter === "today") return date.toDateString() === now.toDateString();
  const weekStart = startOfWeek(now);
  return date >= weekStart && date <= now;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = (next.getDay() + 6) % 7;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day);
  return next;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f5f0e4",
    paddingBottom: 150
  },
  header: {
    alignItems: "center",
    borderColor: "#d7bd57",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    overflow: "hidden"
  },
  headerImage: { opacity: 0.9 },
  headerVeil: {
    alignItems: "center",
    backgroundColor: "rgba(6, 30, 21, 0.38)",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 94,
    padding: 14
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.72)",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 5
  },
  subtitle: {
    color: "#eef8f2",
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.72)",
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 4
  },
  newButton: {
    alignItems: "center",
    backgroundColor: "#143f36",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 14
  },
  newButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10
  },
  searchInput: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    color: "#17211c",
    flex: 1,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: 12
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: "#143f36",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  resetButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 10
  },
  filters: {
    gap: 8,
    paddingRight: 12
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  filterPillActive: {
    backgroundColor: "#174f43",
    borderColor: "#174f43"
  },
  filterText: {
    color: "#17211c",
    fontSize: 13,
    fontWeight: "900"
  },
  filterTextActive: {
    color: "#ffffff"
  },
  projectButton: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    minHeight: 42,
    paddingHorizontal: 12
  },
  projectButtonText: {
    color: "#17211c",
    fontWeight: "900"
  },
  projectButtonPlaceholder: {
    color: "#53645d"
  },
  projectMenu: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
    padding: 8
  },
  projectOption: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  projectOptionActive: {
    backgroundColor: "#174f43"
  },
  projectOptionText: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  projectOptionTextActive: {
    color: "#ffffff"
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  statusPillActive: {
    backgroundColor: "#143f36",
    borderColor: "#143f36"
  },
  statusText: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "900"
  },
  statusTextActive: {
    color: "#ffffff"
  },
  list: {
    flex: 1
  },
  listContent: {
    gap: 10,
    paddingBottom: 18
  },
  empty: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 24
  },
  emptyTitle: {
    color: "#102018",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 8
  },
  emptyText: {
    color: "#53645d",
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48
  },
  backButtonText: {
    color: "#17211c",
    fontWeight: "900"
  }
});
