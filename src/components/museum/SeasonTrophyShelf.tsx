import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SeasonTrophy } from "../../services/seasonProgressModel";

type Props = {
  trophies: SeasonTrophy[];
  title: string;
  emptyText: string;
};

export function SeasonTrophyShelf({ emptyText, title, trophies }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>CROWN HALL</Text>
      <Text style={styles.title}>{title}</Text>
      {trophies.length ? (
        <View style={styles.row}>
          {trophies.slice(0, 6).map((trophy) => (
            <View key={trophy.bossId} style={styles.trophy}>
              <Text style={styles.icon}>♛</Text>
              <Text numberOfLines={1} style={styles.season}>{trophy.seasonId.replace("season-", "")}</Text>
              <Text style={styles.xp}>+{trophy.awardedXp} XP</Text>
            </View>
          ))}
        </View>
      ) : <Text style={styles.empty}>{emptyText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(25,18,45,0.88)", borderColor: "rgba(226,190,255,0.55)", borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 12 },
  kicker: { color: "#e2beff", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#ffffff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  trophy: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.09)", borderColor: "rgba(255,255,255,0.13)", borderRadius: 12, borderWidth: 1, minWidth: 82, paddingHorizontal: 9, paddingVertical: 9 },
  icon: { color: "#f3d55c", fontSize: 21, fontWeight: "900" },
  season: { color: "#ffffff", fontSize: 9, fontWeight: "900", marginTop: 2, maxWidth: 78 },
  xp: { color: "#d7c5df", fontSize: 8, fontWeight: "800", marginTop: 2 },
  empty: { color: "#d7c5df", fontSize: 10, lineHeight: 15, marginTop: 8 }
});
