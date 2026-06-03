import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteName } from "../../App";
import { InsectIllustration } from "../components/InsectIllustration";
import { TierBadge } from "../components/TierBadge";
import { getTierForPoints, userTiers } from "../services/pointsService";
import { listUsers } from "../services/userService";
import { User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  onNavigate: (route: RouteName) => void;
};

export function HomeScreen({ user, onNavigate }: Props) {
  const tier = getTierForPoints(user.totalPoints);
  const [users, setUsers] = useState<User[]>([]);
  const leaders = users.slice(0, 3);
  const userRank = Math.max(1, users.findIndex((item) => item.uid === user.uid) + 1);

  useEffect(() => {
    listUsers().then(setUsers);
  }, [user.totalPoints]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <View style={styles.heroNameRow}>
            <Text style={[sharedStyles.title, styles.heroTitle]} numberOfLines={1}>{user.displayName}</Text>
            <Pressable style={styles.profilePill} onPress={() => onNavigate("profile")}>
              <Text style={styles.profileText}>Profiel</Text>
            </Pressable>
          </View>
          <Text style={styles.scoreText}>{user.totalPoints} pt - {user.title}</Text>
        </View>
        <InsectIllustration size={tier.bugSize + 10} variant={tier.insect} evolutionLevel={tier.evolutionLevel} />
      </View>
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{user.bugCount}</Text>
          <Text style={styles.statLabel}>Bugs</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>#{userRank}</Text>
          <Text style={styles.statLabel}>Rank</Text>
        </View>
        <View style={styles.statTile}>
          <InsectIllustration size={Math.max(34, tier.bugSize * 0.52)} variant={tier.insect} evolutionLevel={tier.evolutionLevel} />
          <Text style={styles.statLabel}>{tier.title}</Text>
        </View>
      </View>
      <View style={styles.stage}>
        {userTiers.map((item) => (
          <InsectIllustration key={item.title} size={Math.max(30, item.bugSize * 0.55)} variant={item.insect} evolutionLevel={item.evolutionLevel} />
        ))}
      </View>
      <View style={styles.tierWrap}>
        <TierBadge points={user.totalPoints} />
      </View>
      <Pressable style={styles.rankingCard} onPress={() => onNavigate("leaderboard")}>
        <View style={styles.rankingHeader}>
          <Text style={styles.sectionTitle}>Top</Text>
          <InsectIllustration size={34} variant="ladybug" />
        </View>
        <View style={styles.rankingList}>
          {leaders.map((leader, index) => (
            <View key={leader.uid} style={styles.rankingLine}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.rankingName}>{leader.displayName}</Text>
              <Text style={styles.rankingPoints}>{leader.totalPoints}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={styles.quickCard}>
        <Text style={styles.newsTitle}>Acties</Text>
        <View style={styles.newsGrid}>
          <View style={styles.updatePill}>
            <InsectIllustration size={28} variant="crawler" />
            <Text style={styles.newsItemTitle}>3 bugs</Text>
          </View>
          <View style={styles.updatePill}>
            <InsectIllustration size={28} variant="beetle" />
            <Text style={styles.newsItemTitle}>Fix +15</Text>
          </View>
          <View style={styles.updatePill}>
            <InsectIllustration size={28} variant="ladybug" />
            <Text style={styles.newsItemTitle}>Badges</Text>
          </View>
        </View>
      </View>
      <Pressable style={[sharedStyles.button, styles.actionButton]} onPress={() => onNavigate("bugs")}>
        <InsectIllustration size={34} variant="beetle" />
        <Text style={sharedStyles.buttonText}>Bugs bekijken</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 18
  },
  hero: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    padding: 16
  },
  heroText: {
    flex: 1
  },
  heroNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  heroTitle: {
    color: "#ffffff",
    flex: 1
  },
  profilePill: {
    backgroundColor: "#d7bd57",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  profileText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  scoreText: {
    color: "#dbe8de",
    fontSize: 16,
    fontWeight: "800"
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  statTile: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 82,
    justifyContent: "center",
    padding: 10
  },
  statValue: {
    color: "#102018",
    fontSize: 22,
    fontWeight: "900"
  },
  statLabel: {
    color: "#52665d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3
  },
  stage: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d0dfcf",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    padding: 12
  },
  tierWrap: {
    marginBottom: 12
  },
  rankingCard: {
    backgroundColor: "#102018",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14
  },
  rankingHeader: {
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: 70
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  rankingList: {
    flex: 1,
    gap: 4
  },
  rankingLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  rank: {
    color: "#d7bd57",
    fontWeight: "900",
    width: 18
  },
  rankingName: {
    color: "#ffffff",
    flex: 1,
    fontWeight: "800"
  },
  rankingPoints: {
    color: "#d7bd57",
    fontWeight: "900"
  },
  quickCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  newsTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  newsGrid: {
    flexDirection: "row",
    gap: 8
  },
  updatePill: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flex: 1,
    gap: 5,
    padding: 9
  },
  newsItemTitle: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  actionButton: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  }
});
