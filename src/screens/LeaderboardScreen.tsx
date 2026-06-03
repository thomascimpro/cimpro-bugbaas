import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { InsectIllustration } from "../components/InsectIllustration";
import { LeaderboardRow } from "../components/LeaderboardRow";
import { listUsers } from "../services/userService";
import { User } from "../types";
import { sharedStyles } from "./sharedStyles";

export function LeaderboardScreen({ onBack: _onBack }: { onBack: () => void }) {
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
        </View>
        <InsectIllustration size={64} variant="ladybug" />
      </View>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={users}
          keyExtractor={(user) => user.uid}
          ListEmptyComponent={<Text style={sharedStyles.subtitle}>Nog geen deelnemers.</Text>}
          renderItem={({ item, index }) => <LeaderboardRow user={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  listContent: {
    paddingBottom: 120
  }
});
