import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { InsectIllustration } from "../components/InsectIllustration";
import { TierBadge } from "../components/TierBadge";
import { getTierForPoints, userTiers } from "../services/pointsService";
import { User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  onBack: () => void;
  onLogout: () => void;
};

export function ProfileScreen({ user, onBack, onLogout }: Props) {
  const tier = getTierForPoints(user.totalPoints);
  const badges = user.badges.length ? user.badges : ["Nog geen badges"];
  const badgeCount = user.badges.length;

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>Profiel</Text>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        </View>
        <InsectIllustration size={tier.bugSize + 12} variant={tier.insect} evolutionLevel={tier.evolutionLevel} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.totalPoints}</Text>
          <Text style={styles.label}>Punten</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugCount}</Text>
          <Text style={styles.label}>Bugs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{badgeCount}</Text>
          <Text style={styles.label}>Badges</Text>
        </View>
      </View>

      <TierBadge points={user.totalPoints} />

      <View style={styles.stage}>
        {userTiers.map((item) => (
          <View key={item.title} style={[styles.stageItem, item.title === tier.title && styles.stageItemActive]}>
            <InsectIllustration size={Math.max(32, item.bugSize * 0.48)} variant={item.insect} evolutionLevel={item.evolutionLevel} />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>Titel</Text>
          <Text style={styles.statusValue}>{user.title}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>Tier</Text>
          <Text style={[styles.statusValue, { color: tier.color }]}>{tier.title}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Badges</Text>
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <InsectIllustration size={22} variant="ladybug" />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable style={sharedStyles.dangerButton} onPress={onLogout}>
        <Text style={sharedStyles.buttonText}>Uitloggen</Text>
      </Pressable>
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
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
  kicker: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  name: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900"
  },
  email: {
    color: "#dbe8de",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  stat: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 78,
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    justifyContent: "center"
  },
  value: {
    color: "#17211c",
    fontSize: 22,
    fontWeight: "900"
  },
  label: {
    color: "#53645d",
    fontWeight: "700",
    marginTop: 4
  },
  stage: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d0dfcf",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    padding: 10
  },
  stageItem: {
    alignItems: "center",
    borderRadius: 8,
    padding: 4
  },
  stageItemActive: {
    backgroundColor: "#d7bd57"
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  cardTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5
  },
  statusLabel: {
    color: "#53645d",
    fontWeight: "800"
  },
  statusValue: {
    color: "#17211c",
    flex: 1,
    fontWeight: "900",
    marginLeft: 12,
    textAlign: "right"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  badgeText: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  }
});
