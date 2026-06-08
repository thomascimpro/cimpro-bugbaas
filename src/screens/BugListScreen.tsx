import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugCard } from "../components/BugCard";
import { listBugs } from "../services/bugService";
import { statusLabel, useI18n } from "../services/i18n";
import { BugReport, BugStatus, ReportType } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Nieuw", "Bevestigd", "In behandeling", "Gefixt", "Afgekeurd", "Dubbel"];
const reportFilters: Array<{ value: ReportType | "all"; labelKey: string }> = [
  { value: "all", labelKey: "filter.all" },
  { value: "bug", labelKey: "filter.bugs" },
  { value: "tip", labelKey: "filter.tips" },
  { value: "workaround", labelKey: "filter.tricks" },
  { value: "idea", labelKey: "filter.idea" }
];
const projectFilters = ["TBox", "TConnect", "SkySpark", "Infinite", "VTScada", "Alert", "Anders"];
const reportTypeLabels: Record<ReportType, string> = {
  bug: "bug",
  tip: "tip",
  workaround: "trick",
  idea: "idee"
};

type Props = {
  onBack: () => void;
  onNew: () => void;
  onSelect: (bug: BugReport) => void;
};

export function BugListScreen({ onBack, onNew, onSelect }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<BugStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<ReportType | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string | undefined>();
  const [projectOpen, setProjectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedSearch = normalizeSearch(searchQuery);
  const hasActiveFilters = Boolean(filter || projectFilter || typeFilter !== "all" || normalizedSearch);
  const visibleReports = reports.filter((report) => {
    const reportType = report.reportType ?? "bug";
    if (typeFilter !== "all" && reportType !== typeFilter) return false;
    if (projectFilter && report.project !== projectFilter) return false;
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
    setProjectFilter(undefined);
    setProjectOpen(false);
    setSearchQuery("");
  }

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={sharedStyles.title}>{t("buglist.title")}</Text>
          <Text style={styles.subtitle}>{t("buglist.count", { count: visibleReports.length })}</Text>
        </View>
        <Pressable style={styles.newButton} onPress={onNew}>
          <BugArtImage bugId="lieveheersbeestje" size={32} />
          <Text style={styles.newButtonText}>{t("common.new")}</Text>
        </Pressable>
      </View>

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

      <Pressable style={styles.projectButton} onPress={() => setProjectOpen((current) => !current)}>
        <Text style={[styles.projectButtonText, !projectFilter && styles.projectButtonPlaceholder]}>{t("buglist.product", { value: projectFilter ?? t("common.all") })}</Text>
      </Pressable>
      {projectOpen && (
        <View style={styles.projectMenu}>
          <Pressable
            style={[styles.projectOption, !projectFilter && styles.projectOptionActive]}
            onPress={() => {
              setProjectFilter(undefined);
              setProjectOpen(false);
            }}
          >
            <Text style={[styles.projectOptionText, !projectFilter && styles.projectOptionTextActive]}>{t("common.all")}</Text>
          </Pressable>
          {projectFilters.map((project) => {
            const active = projectFilter === project;
            return (
              <Pressable
                key={project}
                style={[styles.projectOption, active && styles.projectOptionActive]}
                onPress={() => {
                  setProjectFilter(project);
                  setProjectOpen(false);
                }}
              >
                <Text style={[styles.projectOptionText, active && styles.projectOptionTextActive]}>{project}</Text>
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
    report.project,
    report.reporterName,
    report.description,
    report.steps,
    report.status,
    report.severity,
    reportTypeLabels[reportType]
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 150
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 10
  },
  headerText: {
    flex: 1
  },
  subtitle: {
    color: "#52665d",
    fontSize: 14,
    fontWeight: "800"
  },
  newButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
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
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    color: "#17211c",
    flex: 1,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: 12
  },
  resetButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
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
    backgroundColor: "#fdfefb",
    borderColor: "#cbd8d1",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  filterPillActive: {
    backgroundColor: "#15724f",
    borderColor: "#15724f"
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
    backgroundColor: "#fdfefb",
    borderColor: "#cbd8d1",
    borderRadius: 8,
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
    backgroundColor: "#fdfefb",
    borderColor: "#cbd8d1",
    borderRadius: 8,
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
    backgroundColor: "#15724f"
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
    backgroundColor: "#fdfefb",
    borderColor: "#d8e2dc",
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  statusPillActive: {
    backgroundColor: "#102018",
    borderColor: "#102018"
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
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
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
    backgroundColor: "#fdfefb",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48
  },
  backButtonText: {
    color: "#17211c",
    fontWeight: "900"
  }
});
