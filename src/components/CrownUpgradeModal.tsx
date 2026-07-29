import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "./BugArtImage";
import { CrownGlow } from "./CrownGlow";
import { bugCrownPowerMultiplier, type BugCrownRank } from "../services/bugCrownService";
import { bugDexEntryName, useI18n } from "../services/i18n";
import { entryByBugId } from "../services/bugDexService";

type Props = {
  bugId: string;
  rank: Exclude<BugCrownRank, "none">;
  onClose: () => void;
};

export function CrownUpgradeModal({ bugId, onClose, rank }: Props) {
  const { t } = useI18n();
  const entry = entryByBugId(bugId);
  if (!entry) return null;
  const rankLabel = t(`bugdex.crown.rank.${rank}`);
  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>{t("bugdex.crown.upgradeKicker")}</Text>
          <CrownGlow rank={rank} size={112}>
            <BugArtImage bugId={entry.id} size={96} />
          </CrownGlow>
          <Text style={styles.title}>{t("bugdex.crown.upgradeTitle")}</Text>
          <Text style={styles.rank}>{rankLabel}</Text>
          <Text style={styles.body}>{t("bugdex.crown.upgradeBody", { bug: bugDexEntryName(entry, t), rank: rankLabel })}</Text>
          <Text style={styles.bonus}>{t("bugdex.crown.bonus", { bonus: `${Math.round((bugCrownPowerMultiplier(rank) - 1) * 1000) / 10}%` })}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>{t("common.close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15,18,35,0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#d7bd57",
    borderRadius: 20,
    borderWidth: 2,
    maxWidth: 340,
    padding: 22,
    width: "100%"
  },
  kicker: {
    color: "#9c7420",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#292450",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 10,
    textAlign: "center"
  },
  rank: {
    color: "#9c7420",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3
  },
  body: {
    color: "#5d5868",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 10,
    textAlign: "center"
  },
  bonus: {
    color: "#15724f",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10
  },
  button: {
    backgroundColor: "#292450",
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 11
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  }
});
