import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MasteryTeamChallenge } from "../../services/masteryTeamChallengeModel";
import { useI18n } from "../../services/i18n";
import { CompletedCategoryMedal, MuseumStageMark } from "./SpecimenArchiveVisuals";

export function MasteryTeamChallengeCard({ challenge }: { challenge: MasteryTeamChallenge }) {
  const { t } = useI18n();
  const activeTier = [...challenge.tiers].reverse().find((tier) => tier.unlocked) ?? challenge.tiers[0];
  return (
    <View style={[styles.strip, challenge.complete && styles.stripComplete]}>
      <View style={styles.accentRail} />
      <View style={styles.copy}>
        <Text style={styles.kicker}>{t("collection.masteryTeam.kicker")}</Text>
        <Text style={styles.title}>{challenge.unlockedFrameId ? t(`collection.masteryTeam.frame.${activeTier.id}`) : t("collection.masteryTeam.title")}</Text>
        <Text style={styles.body}>{challenge.complete ? t("collection.masteryTeam.complete") : t("collection.masteryTeam.body")}</Text>
      </View>
      {challenge.complete ? (
        <CompletedCategoryMedal size={34} />
      ) : (
        <View style={styles.tiers}>
          {challenge.tiers.map((tier) => (
            <View key={tier.id} style={styles.tier}>
              <MuseumStageMark accent="#d7bd57" size={22} stage={tier.unlocked ? "curated" : "hidden"} />
              <Text style={[styles.tierLevel, tier.unlocked && styles.tierLevelUnlocked]}>Lv.{tier.requiredLevel}</Text>
              <Text style={styles.tierProgress}>{tier.current}/{tier.required}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { alignItems: "center", alignSelf: "center", backgroundColor: "#171735", borderColor: "rgba(215,189,87,0.28)", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 5, minHeight: 76, overflow: "hidden", padding: 10, paddingLeft: 15, width: "100%" },
  stripComplete: { borderColor: "#d7bd57" },
  accentRail: { backgroundColor: "#6d63c6", bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  copy: { flex: 1, paddingRight: 8 },
  kicker: { color: "#d7bd57", fontSize: 7, fontWeight: "900", letterSpacing: 1 },
  title: { color: "#fff8df", fontSize: 12, fontWeight: "900", marginTop: 2 },
  body: { color: "#bbb9d2", fontSize: 8, fontWeight: "700", lineHeight: 12, marginTop: 3 },
  tiers: { flexDirection: "row", gap: 5 },
  tier: { alignItems: "center", minWidth: 35 },
  tierLevel: { color: "#81958a", fontSize: 7, fontWeight: "900", marginTop: 3 },
  tierLevelUnlocked: { color: "#d7bd57" },
  tierProgress: { color: "#e7efe9", fontSize: 8, fontWeight: "900", marginTop: 1 }
});
