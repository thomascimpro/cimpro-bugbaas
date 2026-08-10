import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { entryByBugId, listBugDexInventory, type BugDexDropResult } from "../services/bugDexService";
import { useI18n } from "../services/i18n";
import {
  acknowledgeWeeklyScanContestReward,
  getWeeklyScanContest,
  reportWeeklyScanContestPhoto,
  voteWeeklyScanContest,
  type WeeklyScanContestStatus
} from "../services/weeklyScanContestService";
import type { User } from "../types";

type Props = { onRewardDrop: (drop: BugDexDropResult) => void; user: User };

export function WeeklyScanContestCard({ onRewardDrop, user }: Props) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [contest, setContest] = useState<WeeklyScanContestStatus>();
  const [busyKey, setBusyKey] = useState("");
  const [reportConfirmId, setReportConfirmId] = useState("");
  const [error, setError] = useState("");
  const presentedRewardKeys = useRef(new Set<string>());

  async function load() {
    setError("");
    try {
      setContest(await getWeeklyScanContest(user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.weekly.error"));
    }
  }

  useEffect(() => {
    void load();
  }, [user.uid]);

  useEffect(() => {
    const winner = contest?.lastWinner;
    if (!winner?.viewerWon || !winner.rewardPresentationPending || !winner.rewardBugId) return;
    const rewardKey = `${winner.weekId}:${winner.rewardBugId}`;
    if (presentedRewardKeys.current.has(rewardKey)) return;
    presentedRewardKeys.current.add(rewardKey);
    void (async () => {
      const entry = entryByBugId(winner.rewardBugId!);
      const items = await listBugDexInventory(user, { force: true });
      const item = items.find((candidate) => candidate.bugId === winner.rewardBugId);
      if (!entry || !item) throw new Error(t("bugScan.weekly.rewardError"));
      onRewardDrop({
        rewardType: "bug",
        entry,
        item,
        isNew: winner.rewardIsNew,
        source: "weekly_scan_contest",
        sourceDetail: t("bugScan.weekly.rewardSource")
      });
      setContest((current) => current?.lastWinner ? {
        ...current,
        lastWinner: { ...current.lastWinner, rewardPresentationPending: false }
      } : current);
      await acknowledgeWeeklyScanContestReward(user, winner.weekId);
    })().catch((nextError) => {
      presentedRewardKeys.current.delete(rewardKey);
      setError(nextError instanceof Error ? nextError.message : t("bugScan.weekly.rewardError"));
    });
  }, [contest?.lastWinner?.rewardPresentationPending, contest?.lastWinner?.rewardBugId, contest?.lastWinner?.weekId, user.uid, onRewardDrop, t]);

  async function vote(candidateId: string) {
    if (busyKey || contest?.current.viewerVoteCandidateId) return;
    setBusyKey(`vote:${candidateId}`);
    setError("");
    try {
      setContest(await voteWeeklyScanContest(user, candidateId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.weekly.voteError"));
    } finally {
      setBusyKey("");
    }
  }

  async function report(candidateId: string) {
    if (reportConfirmId !== candidateId) {
      setReportConfirmId(candidateId);
      return;
    }
    setBusyKey(`report:${candidateId}`);
    setError("");
    try {
      setContest(await reportWeeklyScanContestPhoto(user, candidateId));
      setReportConfirmId("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.weekly.reportError"));
    } finally {
      setBusyKey("");
    }
  }

  const nominees = contest?.current.nominees ?? [];
  const hasVoted = Boolean(contest?.current.viewerVoteCandidateId);
  const winnerReward = contest?.lastWinner?.rewardBugId ? entryByBugId(contest.lastWinner.rewardBugId) : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleCopy}>
          <Text style={styles.kicker}>{t("bugScan.weekly.kicker")}</Text>
          <Text style={styles.title}>{t("bugScan.weekly.title")}</Text>
          <Text style={styles.body}>{t("bugScan.weekly.body")}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardValue}>+{contest?.current.rewardXp ?? 150} XP</Text>
          <Text style={styles.rewardLabel}>{t("bugScan.weekly.reward")}</Text>
        </View>
      </View>

      {contest?.lastWinner ? (
        <View style={[styles.winner, compact && styles.winnerCompact]}>
          <Image resizeMode="cover" source={{ uri: contest.lastWinner.photoUrl }} style={styles.winnerPhoto} />
          <View style={styles.winnerCopy}>
            <Text style={styles.winnerKicker}>{t("bugScan.weekly.lastWinner")}</Text>
            <Text style={styles.winnerTitle}>{contest.lastWinner.displayName} · {contest.lastWinner.speciesName}</Text>
            <Text style={styles.winnerBody}>{t("bugScan.weekly.winnerVotes", { count: contest.lastWinner.voteCount, xp: contest.lastWinner.rewardXp })}</Text>
            {winnerReward ? <Text style={styles.winnerBody}>{t("bugScan.weekly.bugReward", { name: winnerReward.name })}</Text> : null}
            {contest.lastWinner.viewerWon ? <Text style={styles.viewerWon}>{t("bugScan.weekly.youWon")}</Text> : null}
          </View>
        </View>
      ) : null}

      {!contest && !error ? <ActivityIndicator color="#68e4fb" style={styles.loader} /> : null}
      {contest && nominees.length !== 3 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("bugScan.weekly.collectingTitle")}</Text>
          <Text style={styles.emptyBody}>{t("bugScan.weekly.collectingBody")}</Text>
        </View>
      ) : null}

      {nominees.length === 3 ? (
        <View style={[styles.nominees, compact && styles.nomineesCompact]}>
          {nominees.map((nominee) => {
            const selected = contest?.current.viewerVoteCandidateId === nominee.id;
            const cannotVote = hasVoted || nominee.isOwn || Boolean(busyKey);
            return (
              <View key={nominee.id} style={[styles.nominee, compact && styles.nomineeCompact, selected && styles.nomineeSelected]}>
                <Image resizeMode="cover" source={{ uri: nominee.photoUrl }} style={[styles.photo, compact && styles.photoCompact]} />
                <View style={styles.nomineeCopy}>
                  <Text numberOfLines={1} style={styles.species}>{nominee.speciesName}</Text>
                  <Text style={styles.reason}>{nominee.photoContestReason}</Text>
                  <View style={styles.voteMeta}>
                    <Text style={styles.votes}>{t("bugScan.weekly.votes", { count: nominee.voteCount })}</Text>
                    {nominee.isOwn ? <Text style={styles.ownLabel}>{t("bugScan.weekly.yourPhoto")}</Text> : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={cannotVote}
                    onPress={() => void vote(nominee.id)}
                    style={({ pressed }) => [styles.voteButton, cannotVote && styles.buttonDisabled, selected && styles.voteButtonSelected, pressed && styles.pressed]}
                  >
                    {busyKey === `vote:${nominee.id}` ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.voteButtonText}>{selected ? t("bugScan.weekly.voted") : hasVoted ? t("bugScan.weekly.voteUsed") : nominee.isOwn ? t("bugScan.weekly.ownVote") : t("bugScan.weekly.vote")}</Text>}
                  </Pressable>
                  {!nominee.isOwn ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={nominee.reportedByViewer || Boolean(busyKey)}
                      onPress={() => void report(nominee.id)}
                      style={({ pressed }) => [styles.reportButton, nominee.reportedByViewer && styles.buttonDisabled, pressed && styles.pressed]}
                    >
                      <Text style={styles.reportText}>{nominee.reportedByViewer ? t("bugScan.weekly.reported") : reportConfirmId === nominee.id ? t("bugScan.weekly.reportConfirm") : t("bugScan.weekly.report")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {hasVoted ? <Text style={styles.oneVoteNote}>{t("bugScan.weekly.oneVoteDone")}</Text> : <Text style={styles.oneVoteNote}>{t("bugScan.weekly.oneVote")}</Text>}
      {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>{t("bugScan.weekly.retry")}</Text></Pressable></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: "#b7d4dd", fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 650 },
  buttonDisabled: { opacity: 0.5 },
  card: { backgroundColor: "#071f2e", borderColor: "#2a7187", borderRadius: 24, borderWidth: 1, marginTop: 16, overflow: "hidden", padding: 16 },
  emptyBody: { color: "#b8d1d9", fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: "center" },
  emptyState: { alignItems: "center", backgroundColor: "rgba(18,61,78,0.64)", borderRadius: 18, marginTop: 14, padding: 18 },
  emptyTitle: { color: "#f4f9fb", fontSize: 17, fontWeight: "900", textAlign: "center" },
  error: { color: "#ffd4c9", flex: 1, fontSize: 12, lineHeight: 17 },
  errorBox: { alignItems: "center", backgroundColor: "rgba(143,51,37,0.35)", borderRadius: 14, flexDirection: "row", gap: 10, marginTop: 12, padding: 12 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  kicker: { color: "#62def5", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  loader: { marginVertical: 24 },
  nominee: { backgroundColor: "#0c3041", borderColor: "#245e72", borderRadius: 18, borderWidth: 1, flex: 1, minWidth: 0, overflow: "hidden" },
  nomineeCompact: { flexDirection: "row", width: "100%" },
  nomineeCopy: { flex: 1, padding: 12 },
  nomineeSelected: { borderColor: "#f4c85a", borderWidth: 2 },
  nominees: { flexDirection: "row", gap: 10, marginTop: 14 },
  nomineesCompact: { flexDirection: "column" },
  oneVoteNote: { color: "#91b9c6", fontSize: 11, fontWeight: "700", marginTop: 12, textAlign: "center" },
  ownLabel: { color: "#f2c65d", fontSize: 9, fontWeight: "900" },
  photo: { aspectRatio: 1.15, backgroundColor: "#04121b", width: "100%" },
  photoCompact: { aspectRatio: undefined, minHeight: 190, width: "46%" },
  pressed: { opacity: 0.82 },
  reason: { color: "#c8dce2", fontSize: 11, lineHeight: 16, marginTop: 8, minHeight: 48 },
  reportButton: { alignItems: "center", marginTop: 7, paddingVertical: 7 },
  reportText: { color: "#9ebbc4", fontSize: 10, fontWeight: "800", textDecorationLine: "underline" },
  retry: { color: "#fff0ad", fontSize: 12, fontWeight: "900" },
  rewardBadge: { alignItems: "center", backgroundColor: "#e2ad38", borderRadius: 15, minWidth: 82, paddingHorizontal: 10, paddingVertical: 9 },
  rewardLabel: { color: "#463008", fontSize: 8, fontWeight: "900", marginTop: 2 },
  rewardValue: { color: "#332004", fontSize: 14, fontWeight: "900" },
  species: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  title: { color: "#ffffff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  titleCopy: { flex: 1 },
  voteButton: { alignItems: "center", backgroundColor: "#16845f", borderRadius: 13, justifyContent: "center", minHeight: 42, paddingHorizontal: 10 },
  voteButtonSelected: { backgroundColor: "#b98519" },
  voteButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "900", textAlign: "center" },
  voteMeta: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginTop: 4 },
  votes: { color: "#e7f8fc", fontSize: 11, fontWeight: "900" },
  viewerWon: { color: "#ffdf73", fontSize: 12, fontWeight: "900", marginTop: 5 },
  winner: { alignItems: "center", backgroundColor: "rgba(182,130,26,0.2)", borderColor: "#d8ae45", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 14, overflow: "hidden", padding: 10 },
  winnerBody: { color: "#d8e6e9", fontSize: 11, lineHeight: 16, marginTop: 4 },
  winnerCompact: { alignItems: "stretch" },
  winnerCopy: { flex: 1 },
  winnerKicker: { color: "#f5cf63", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  winnerPhoto: { backgroundColor: "#04121b", borderRadius: 12, height: 92, width: 108 },
  winnerTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900", marginTop: 3 }
});
