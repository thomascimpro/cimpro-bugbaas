import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../BugArtImage";
import { getBadgeArtSource } from "../../services/badgeArt";
import type { MuseumRewardGoal } from "../../services/museumRewardModel";

type Props = {
  busy: boolean;
  error?: string;
  notice?: string;
  goal?: MuseumRewardGoal;
  onClaim: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export function MuseumRewardGoalPanel({ busy, error, notice, goal, onClaim, t }: Props) {
  if (!goal) return (
    <View style={styles.panel}>
      <View style={styles.artWrap}><Text style={styles.medal}>★</Text></View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{t("museum.reward.completeKicker")}</Text>
        <Text style={styles.title}>{t("museum.reward.completeTitle")}</Text>
        <Text style={styles.objective}>{t("museum.reward.completeBody")}</Text>
      </View>
    </View>
  );
  const badgeSource = goal.rewardBadgeId ? getBadgeArtSource(goal.rewardBadgeId) : null;
  const percent = Math.round(Math.max(0, Math.min(1, goal.progress)) * 100);
  return (
    <View style={styles.panel}>
      <View style={styles.artWrap}>
        {goal.rewardBugId ? <BugArtImage bugId={goal.rewardBugId} size={58} /> : badgeSource ? <Image source={badgeSource} style={styles.badgeArt} resizeMode="contain" /> : <Text style={styles.medal}>★</Text>}
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{goal.complete ? t("museum.reward.ready") : t("museum.reward.next")}</Text>
        <Text style={styles.title}>{t(goal.titleKey)}</Text>
        <Text style={styles.objective}>{t(goal.objectiveKey, { current: goal.current, required: goal.required })}</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
        <Text style={styles.reward}>{t("museum.reward.label")}: {t(goal.rewardKey, { xp: goal.rewardXp })}</Text>
        {goal.complete ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onClaim} style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{busy ? t("museum.reward.claiming") : t("museum.reward.claim")}</Text>
          </Pressable>
        ) : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: "center", backgroundColor: "rgba(13,18,24,0.82)", borderColor: "rgba(238,207,105,0.55)", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, marginBottom: 10, padding: 12 },
  artWrap: { alignItems: "center", height: 64, justifyContent: "center", width: 64 },
  badgeArt: { height: 58, width: 58 },
  medal: { color: "#f2cf68", fontSize: 42, fontWeight: "900" },
  copy: { flex: 1, minWidth: 0 },
  kicker: { color: "#f2cf68", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#ffffff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  objective: { color: "#f2f1e8", fontSize: 13, lineHeight: 18, marginTop: 3 },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.17)", borderRadius: 999, height: 8, marginTop: 8, overflow: "hidden" },
  progressFill: { backgroundColor: "#f2cf68", borderRadius: 999, height: "100%" },
  reward: { color: "#d8e2ea", fontSize: 11, fontWeight: "700", marginTop: 6 },
  button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#f2cf68", borderRadius: 10, justifyContent: "center", marginTop: 8, minHeight: 38, paddingHorizontal: 15 },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: "#1d1808", fontSize: 12, fontWeight: "900" },
  notice: { color: "#c9f3c7", fontSize: 11, fontWeight: "700", marginTop: 6 },
  error: { color: "#ffb4aa", fontSize: 11, marginTop: 6 }
});
