import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { entryByBugId } from "../services/bugDexService";
import { BugDexRarity, bugDexEntries, getTierForPoints } from "../services/pointsService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { User } from "../types";
import { BugArtImage } from "./BugArtImage";
import { MedalIcon } from "./MedalIcon";

const topThreeStyles = [
  { border: "#d7bd57", background: "#fff7d6", shine: "#f4d76a", pill: "#6f560c", pillText: "#fff7d6", bugId: "doodshoofdvlinder" },
  { border: "#b9c1c8", background: "#f3f6f7", shine: "#dfe5e8", pill: "#5d6870", pillText: "#ffffff", bugId: "boktor" },
  { border: "#b87842", background: "#fff0df", shine: "#e2a56d", pill: "#7b431f", pillText: "#ffffff", bugId: "duizendpoot" }
];

export type LastCatchSummary = {
  bugId: string;
  lastUnlockedAt: string;
  rarity: BugDexRarity;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#6f7f5f",
  Zeldzaam: "#15724f",
  Episch: "#356d7c",
  Legendarisch: "#b83227",
  Mythisch: "#7c3aed"
};

export function LeaderboardRow({ index, lastCatch, user, onPress }: { index: number; lastCatch?: LastCatchSummary; user: User; onPress: () => void }) {
  const { t, tr } = useI18n();
  const isLeader = index === 0;
  const tier = isLeader ? getTierForPoints(Number.MAX_SAFE_INTEGER) : getTierForPoints(user.totalPoints);
  const medal = topThreeStyles[index];
  const title = isLeader ? t("tier.super") : tr(tier.title);
  const status = statusForUser(user, index, t);
  const lastCatchEntry = lastCatch ? entryByBugId(lastCatch.bugId) : null;
  const lastCatchColor = lastCatch ? rarityColors[lastCatch.rarity] : "#c6d3cc";

  return (
    <Pressable style={[styles.row, medal ? { backgroundColor: medal.background, borderColor: medal.border } : styles.standardRow, medal && styles.topThreeRow, isLeader && styles.leader]} onPress={onPress}>
      {medal ? <View style={[styles.shine, { backgroundColor: medal.shine }]} /> : null}
      <View style={styles.rankSlot}>
        <MedalIcon index={index} size={index < 3 ? 52 : 38} />
      </View>
      {medal ? <BugArtImage bugId={medal.bugId} size={isLeader ? 64 : 52} /> : null}
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.78} numberOfLines={1} style={styles.name}>{user.displayName}</Text>
          <Text style={[styles.status, medal && { backgroundColor: medal.pill, color: medal.pillText }]}>{status}</Text>
        </View>
        <Text style={[styles.meta, { color: tier.color }]}>{title}</Text>
        <Text style={styles.subMeta}>{t("leader.bugsDex", { bugs: user.bugCount, caught: user.bugDexCount ?? 0, total: bugDexEntries.length })}</Text>
        <View style={styles.lastCatchRow}>
          {lastCatch && lastCatchEntry ? (
            <>
              <View style={[styles.lastCatchBug, { borderColor: lastCatchColor }]}>
                <BugArtImage bugId={lastCatch.bugId} size={30} />
              </View>
              <View style={styles.lastCatchTextBlock}>
                <Text style={styles.lastCatchTitle} numberOfLines={1}>{bugDexEntryName(lastCatchEntry, t)}</Text>
                <Text style={[styles.lastCatchMeta, { color: lastCatchColor }]} numberOfLines={2}>{rarityLabel(lastCatch.rarity, t)} - {formatLastCaughtAt(lastCatch.lastUnlockedAt, t)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noCatchText}>{t("leader.noLastCatch")}</Text>
          )}
        </View>
      </View>
      <View style={[styles.scorePill, medal && { backgroundColor: medal.pill }]}>
        <Text style={[styles.points, medal && { color: medal.pillText }]}>{user.totalPoints}</Text>
        <Text style={[styles.pointsLabel, medal && { color: medal.pillText }]}>{t("leader.score")}</Text>
      </View>
    </Pressable>
  );
}

function statusForUser(user: User, index: number, t: (key: string) => string): string {
  if (index === 0) return t("leader.statusLeader");
  if (user.totalPoints >= 150) return t("leader.statusActive");
  if (user.bugCount >= 5) return t("leader.statusHunter");
  if (user.bugCount >= 1) return t("leader.statusNew");
  return t("leader.statusStart");
}

function formatLastCaughtAt(value: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return t("leader.timeUnknown");
  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return t("leader.timeNow");
  if (diffMs < hour) return t("leader.timeMinutes", { count: Math.max(1, Math.floor(diffMs / minute)) });
  if (diffMs < day) return t("leader.timeHours", { count: Math.max(1, Math.floor(diffMs / hour)) });
  if (diffMs < 2 * day) return t("leader.timeYesterday");
  return new Date(timestamp).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit" });
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2,
    flexDirection: "row",
    gap: 10,
    minHeight: 128,
    marginBottom: 10,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  standardRow: {
    borderColor: "transparent",
    borderWidth: 0
  },
  leader: {
    borderWidth: 3
  },
  topThreeRow: {
    shadowOpacity: 0.14,
    shadowRadius: 9
  },
  shine: {
    height: 44,
    opacity: 0.55,
    position: "absolute",
    right: -22,
    top: -22,
    transform: [{ rotate: "45deg" }],
    width: 44
  },
  rankSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: 54
  },
  body: {
    flex: 1,
    minWidth: 0
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  name: {
    color: "#17211c",
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    minWidth: 0
  },
  status: {
    backgroundColor: "#e8f1e6",
    borderRadius: 8,
    color: "#15724f",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  leaderStatus: {
    backgroundColor: "#102018",
    color: "#d7bd57"
  },
  meta: {
    fontWeight: "800",
    marginTop: 2
  },
  subMeta: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1
  },
  lastCatchRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
    minHeight: 42
  },
  lastCatchBug: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 2,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  lastCatchTextBlock: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  lastCatchTitle: {
    color: "#17211c",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14
  },
  lastCatchMeta: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13,
    marginTop: 1
  },
  noCatchText: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    color: "#52665d",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  scorePill: {
    alignItems: "center",
    backgroundColor: "#e8f1e6",
    borderRadius: 8,
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  points: {
    color: "#1d6f52",
    fontSize: 18,
    fontWeight: "900"
  },
  pointsLabel: {
    color: "#66756f",
    fontSize: 10,
    fontWeight: "800"
  }
});
