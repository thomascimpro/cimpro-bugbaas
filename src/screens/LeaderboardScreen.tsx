import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { MedalIcon } from "../components/MedalIcon";
import { getTierForPoints } from "../services/pointsService";
import { listUsers } from "../services/userService";
import { User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  onBack: () => void;
  onSelectUser: (user: User) => void;
};

export function LeaderboardScreen({ onBack: _onBack, onSelectUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <View style={sharedStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[sharedStyles.title, styles.headerTitle]}>Ranglijst</Text>
          <Text style={styles.headerSubtitle}>Top bugjagers van CimPro</Text>
        </View>
        <BugArtImage bugId="goliathkever" size={72} />
      </View>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={users}
          keyExtractor={(user) => user.uid}
          ListHeaderComponent={users.length ? <Podium users={users.slice(0, 3)} onSelectUser={onSelectUser} /> : null}
          ListEmptyComponent={<Text style={sharedStyles.subtitle}>Nog geen deelnemers.</Text>}
          renderItem={({ item, index }) => <LeaderboardRow user={item} index={index} onPress={() => onSelectUser(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function Podium({ users, onSelectUser }: { users: User[]; onSelectUser: (user: User) => void }) {
  return (
    <View style={styles.podium}>
      {users.map((user, index) => {
        const tier = index === 0 ? getTierForPoints(Number.MAX_SAFE_INTEGER) : getTierForPoints(user.totalPoints);
        return (
          <Pressable key={user.uid} style={[styles.podiumCard, { backgroundColor: tier.frameBackground, borderColor: tier.frameColor }, index === 0 && styles.podiumLeader]} onPress={() => onSelectUser(user)}>
            <View style={[styles.podiumShine, { backgroundColor: tier.frameAccent }]} />
            <MedalIcon index={index} size={index === 0 ? 76 : 58} />
            <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={index === 0 ? 58 : 44} />
            <Text style={[styles.podiumRank, index === 0 && styles.podiumLeaderText]}>#{index + 1}</Text>
            <Text style={[styles.podiumName, index === 0 && styles.podiumLeaderText]} numberOfLines={1}>{user.displayName}</Text>
            <Text style={[styles.podiumMeta, { color: index === 0 ? "#d7bd57" : tier.frameColor }]}>{tier.prestige}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    padding: 14
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    color: "#ffffff"
  },
  headerSubtitle: {
    color: "#dce9df",
    fontSize: 13,
    fontWeight: "800"
  },
  podium: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  podiumCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2,
    flex: 1,
    minHeight: 148,
    overflow: "hidden",
    padding: 10,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6
  },
  podiumLeader: {
    backgroundColor: "#102018"
  },
  podiumShine: {
    height: 40,
    opacity: 0.52,
    position: "absolute",
    right: -20,
    top: -20,
    transform: [{ rotate: "45deg" }],
    width: 40
  },
  podiumRank: {
    color: "#17211c",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  podiumName: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
    maxWidth: "100%"
  },
  podiumMeta: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  podiumLeaderText: {
    color: "#ffffff"
  },
  listContent: {
    paddingBottom: 120
  }
});
