import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getTierForPoints } from "../services/pointsService";
import { User } from "../types";
import { BugArtImage } from "./BugArtImage";
import { MedalIcon } from "./MedalIcon";

export function LeaderboardRow({ index, user, onPress }: { index: number; user: User; onPress: () => void }) {
  const isLeader = index === 0;
  const tier = isLeader ? getTierForPoints(Number.MAX_SAFE_INTEGER) : getTierForPoints(user.totalPoints);
  const title = isLeader ? "Opperbugmeister" : tier.title;
  const status = statusForUser(user, index);
  const visibleBadges = user.badges.slice(0, 2);
  const extraBadges = user.badges.length - visibleBadges.length;

  return (
    <Pressable style={[styles.row, { backgroundColor: tier.frameBackground, borderColor: tier.frameColor }, isLeader && styles.leader]} onPress={onPress}>
      <View style={[styles.shine, { backgroundColor: tier.frameAccent }]} />
      <View style={styles.rankSlot}>
        <MedalIcon index={index} size={index < 3 ? 52 : 38} />
      </View>
      <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={isLeader ? Math.min(64, tier.bugSize) : Math.min(52, tier.bugSize * 0.72)} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          <Text style={[styles.status, isLeader && styles.leaderStatus]}>{status}</Text>
        </View>
        <Text style={[styles.meta, { color: tier.color }]}>{tier.prestigeLevel} - {title}</Text>
        <Text style={styles.subMeta}>{user.bugCount} bugs - {tier.rewardText}</Text>
        <View style={styles.badgeRow}>
          {visibleBadges.length ? (
            <>
              {visibleBadges.map((badge) => (
                <Text key={badge} style={styles.badgeChip} numberOfLines={1}>{badge}</Text>
              ))}
              {extraBadges > 0 && <Text style={styles.badgeChip}>+{extraBadges}</Text>}
            </>
          ) : (
            <Text style={styles.badgeChip}>0 badges</Text>
          )}
        </View>
      </View>
      <View style={styles.scorePill}>
        <Text style={styles.points}>{user.totalPoints}</Text>
        <Text style={styles.pointsLabel}>pt</Text>
      </View>
    </Pressable>
  );
}

function statusForUser(user: User, index: number): string {
  if (index === 0) return "Leader";
  if (user.totalPoints >= 150) return "Actief";
  if (user.bugCount >= 5) return "Jager";
  if (user.bugCount >= 1) return "Nieuw";
  return "Start";
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
    minHeight: 116,
    marginBottom: 10,
    overflow: "hidden",
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  leader: {
    borderWidth: 2
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
    fontSize: 16,
    fontWeight: "800"
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
  badgeRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 6
  },
  badgeChip: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    color: "#52665d",
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 86,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  badges: {
    color: "#77847f",
    fontSize: 12,
    marginTop: 4
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
