import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../../components/BugArtImage";
import { entryByBugId } from "../../services/bugDexService";
import type { BugProgressionDefinition } from "../../services/bugProgressionCatalog";
import type { ResearchTarget } from "../../services/researchTargetModel";
import { bugDexEntryName, useI18n } from "../../services/i18n";
import { gameTheme } from "../../theme/gameTheme";

type Props = {
  activeTarget?: ResearchTarget;
  loading?: boolean;
  onChoose: (bugId: string) => void;
  onContinue: () => void;
  options: BugProgressionDefinition[];
};

export function ResearchProgressCard({ activeTarget, loading, onChoose, onContinue, options }: Props) {
  const { t } = useI18n();
  if (activeTarget && !activeTarget.claimedAt) {
    const entry = entryByBugId(activeTarget.bugId);
    const progress = Math.min(100, Math.round((activeTarget.progress / Math.max(1, activeTarget.target)) * 100));
    const ready = Boolean(activeTarget.completedAt);
    return (
      <Pressable accessibilityRole="button" disabled={loading} hitSlop={8} onPress={onContinue} style={({ pressed }) => [styles.card, ready && styles.cardReady, pressed && styles.pressed]}>
        <View style={styles.encounterRow}>
          <View style={[styles.bugStage, ready && styles.bugStageReady]}>
            <View pointerEvents="none" style={styles.scanRing} />
            <BugArtImage bugId={activeTarget.bugId} size={62} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.kicker, ready && styles.kickerReady]}>{t("research.active")}</Text>
            <Text numberOfLines={1} style={styles.title}>{entry ? bugDexEntryName(entry, t) : activeTarget.bugId}</Text>
            <Text numberOfLines={2} style={styles.meta}>{ready ? t("research.encounterReady") : t("research.progressHint")}</Text>
            <View style={styles.track}><View style={[styles.fill, ready && styles.fillReady, { width: `${progress}%` }]} /></View>
          </View>
          <View style={styles.progressBadge}>
            <Text style={[styles.amount, ready && styles.amountReady]}>{activeTarget.progress}%</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.chooseHeader}>
        <View style={styles.chooseHeaderMark}><Text style={styles.chooseHeaderIcon}>⌁</Text></View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{t("research.choose")}</Text>
          <Text style={styles.title}>{t("research.chooseTitle")}</Text>
          <Text numberOfLines={2} style={styles.meta}>{t("research.chooseHint")}</Text>
        </View>
      </View>
      <View style={styles.options}>
        {options.slice(0, 3).map((option) => (
          <Pressable accessibilityLabel={`Onderzoek ${entryByBugId(option.bugId) ? bugDexEntryName(entryByBugId(option.bugId)!, t) : option.bugId}`} accessibilityRole="button" disabled={loading} hitSlop={6} key={option.bugId} onPress={() => onChoose(option.bugId)} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
            <View pointerEvents="none" style={styles.optionArt}><BugArtImage bugId={option.bugId} size={44} /></View>
            <Text pointerEvents="none" numberOfLines={2} style={styles.optionName}>{entryByBugId(option.bugId) ? bugDexEntryName(entryByBugId(option.bugId)!, t) : option.bugId}</Text>
            <Text pointerEvents="none" style={styles.optionTier}>NIVEAU {option.researchTier}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(7,31,24,0.96)", borderColor: "rgba(111,209,208,0.38)", borderRadius: 18, borderWidth: 1, marginTop: 9, minHeight: 96, overflow: "hidden", padding: 11 },
  cardReady: { backgroundColor: "rgba(45,39,17,0.97)", borderColor: "rgba(244,220,131,0.72)" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  encounterRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  bugStage: { alignItems: "center", backgroundColor: "rgba(111,209,208,0.12)", borderColor: "rgba(111,209,208,0.34)", borderRadius: 18, borderWidth: 1, height: 78, justifyContent: "center", overflow: "hidden", position: "relative", width: 78 },
  bugStageReady: { backgroundColor: "rgba(244,220,131,0.13)", borderColor: "rgba(244,220,131,0.48)" },
  scanRing: { borderColor: "rgba(255,255,255,0.24)", borderRadius: 29, borderStyle: "dashed", borderWidth: 1, height: 58, position: "absolute", width: 58 },
  copy: { flex: 1, minWidth: 0 },
  kicker: { color: "#6fd1d0", fontSize: 7.5, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  kickerReady: { color: gameTheme.colors.accentStrong },
  title: { color: "#f7fff8", fontSize: 14, fontWeight: "900", marginTop: 3 },
  meta: { color: "#aac0b5", fontSize: 8.5, fontWeight: "700", lineHeight: 12, marginTop: 3 },
  progressBadge: { alignItems: "center", minWidth: 38 },
  amount: { color: "#6fd1d0", fontSize: 18, fontWeight: "900" },
  amountReady: { color: gameTheme.colors.accentStrong },
  arrow: { color: "#ffffff", fontSize: 26, fontWeight: "900", lineHeight: 27 },
  track: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, height: 5, marginTop: 8, overflow: "hidden" },
  fill: { backgroundColor: "#6fd1d0", borderRadius: 999, height: "100%" },
  fillReady: { backgroundColor: gameTheme.colors.accentStrong },
  chooseHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  chooseHeaderMark: { alignItems: "center", backgroundColor: "rgba(111,209,208,0.13)", borderColor: "rgba(111,209,208,0.34)", borderRadius: 15, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  chooseHeaderIcon: { color: "#6fd1d0", fontSize: 23, fontWeight: "900" },
  options: { flexDirection: "row", gap: 6, marginTop: 10 },
  option: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 98, paddingHorizontal: 6, paddingVertical: 8 },
  optionPressed: { backgroundColor: "rgba(111,209,208,0.18)", borderColor: "rgba(111,209,208,0.48)" },
  optionArt: { alignItems: "center", height: 46, justifyContent: "center" },
  optionName: { color: gameTheme.colors.text, fontSize: 9, fontWeight: "900", lineHeight: 11, minHeight: 22, textAlign: "center", width: "100%" },
  optionTier: { color: "#6fd1d0", fontSize: 7, fontWeight: "900", marginTop: 2 }
});
