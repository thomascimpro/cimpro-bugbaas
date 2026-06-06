import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { MedalIcon } from "../components/MedalIcon";
import { listUsers } from "../services/userService";
import { User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  onBack: () => void;
  onSelectUser: (user: User) => void;
};

const podiumStyles = [
  { border: "#d7bd57", background: "#fff7d6", shine: "#f4d76a", text: "#6f560c", bugId: "doodshoofdvlinder" },
  { border: "#b9c1c8", background: "#f3f6f7", shine: "#dfe5e8", text: "#4d5960", bugId: "boktor" },
  { border: "#b87842", background: "#fff0df", shine: "#e2a56d", text: "#6e3f1e", bugId: "duizendpoot" }
];

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
        <View style={styles.headerBugWrap}>
          <BugArtImage bugId="atlaskever" size={76} />
        </View>
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
        const medal = podiumStyles[index] ?? podiumStyles[0];
        return (
          <Pressable key={user.uid} style={[styles.podiumCard, { backgroundColor: medal.background, borderColor: medal.border }, index === 0 && styles.podiumLeader]} onPress={() => onSelectUser(user)}>
            <View style={[styles.podiumShine, { backgroundColor: medal.shine }]} />
            <MedalIcon index={index} size={index === 0 ? 76 : 58} />
            <BugArtImage bugId={medal.bugId} size={index === 0 ? 58 : 44} />
            <Text style={[styles.podiumRank, { color: medal.text }]}>#{index + 1}</Text>
            <Text adjustsFontSizeToFit ellipsizeMode="tail" minimumFontScale={0.78} numberOfLines={1} style={[styles.podiumName, { color: medal.text }]}>{user.displayName}</Text>
            <Text style={styles.podiumPoints}>{user.totalPoints} pt</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: "#0d1d15",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
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
  headerBugWrap: {
    alignItems: "center",
    backgroundColor: "rgba(215,189,87,0.16)",
    borderColor: "rgba(215,189,87,0.45)",
    borderRadius: 8,
    borderWidth: 1,
    height: 86,
    justifyContent: "center",
    width: 86
  },
  podium: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14
  },
  podiumCard: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 3,
    elevation: 3,
    flex: 1,
    minHeight: 166,
    overflow: "hidden",
    padding: 10,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8
  },
  podiumLeader: {
    minHeight: 178
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
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 2,
    maxWidth: "100%"
  },
  podiumPoints: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  listContent: {
    paddingBottom: 120
  }
});
