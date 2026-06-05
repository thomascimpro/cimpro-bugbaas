import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { addBugComment, deleteOwnBug, listBugComments, toggleBugUpvote, updateBugStatus } from "../services/bugService";
import { getUserById } from "../services/userService";
import { upvotePointValue } from "../services/userService";
import { BugComment, BugReport, BugStatus, ReportType, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Bevestigd", "In behandeling", "Gefixt", "Afgekeurd", "Dubbel"];
const reactions = ["🐞", "🪲", "🐛", "💥", "🔥", "🎉"];
const reportTypeMeta: Record<ReportType, { label: string; color: string; background: string }> = {
  bug: { label: "BUG", color: "#b83227", background: "#fff1ef" },
  tip: { label: "TIP", color: "#15724f", background: "#e9f6ef" },
  workaround: { label: "TRICK", color: "#6b4bb3", background: "#f0ecff" },
  idea: { label: "IDEE", color: "#986b08", background: "#fff7d7" }
};

type Props = {
  bug: BugReport;
  user: User;
  onBack: () => void;
  onBugChanged: (bug: BugReport) => void;
  onCommentAdded?: (comment: BugComment) => void;
  onOpenProfile: (user: User) => void;
  onDeleted: () => void;
};

export function BugDetailScreen({ bug, user, onBack, onBugChanged, onCommentAdded, onOpenProfile, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState("🐞");
  const [error, setError] = useState("");
  const reportType = bug.reportType ?? "bug";
  const isBug = reportType === "bug";
  const typeMeta = reportTypeMeta[reportType];
  const canUpdateStatus = user.uid === bug.reporterId && isBug;
  const canUpvote = user.uid !== bug.reporterId;
  const hasVoted = bug.upvoteUserIds?.includes(user.uid) ?? false;
  const upvoteCount = bug.upvoteCount ?? 0;

  useEffect(() => {
    listBugComments(bug.id).then(setComments).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Commentaar laden mislukt.");
    });
  }, [bug.id]);

  async function changeStatus(status: BugStatus) {
    if (!canUpdateStatus) return;
    setBusy(true);
    setError("");
    try {
      onBugChanged(await updateBugStatus(bug, status));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Status wijzigen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleUpvote() {
    setVoteBusy(true);
    setError("");
    try {
      onBugChanged(await toggleBugUpvote(bug, user));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upvote mislukt.");
    } finally {
      setVoteBusy(false);
    }
  }

  async function submitComment() {
    setCommentBusy(true);
    setError("");
    try {
      const comment = await addBugComment(bug, user, commentText, selectedReaction);
      setComments((current) => [...current, comment]);
      setCommentText("");
      onCommentAdded?.(comment);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Commentaar opslaan mislukt.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function openProfile(uid: string) {
    setError("");
    const profile = await getUserById(uid);
    if (profile) onOpenProfile(profile);
    else setError("Profiel niet gevonden.");
  }

  function confirmDelete() {
    if (user.uid !== bug.reporterId || deleteBusy) return;
    Alert.alert("Melding verwijderen", "Deze melding wordt verwijderd en de punten worden ingetrokken.", [
      { text: "Annuleer", style: "cancel" },
      { text: "Verwijder", style: "destructive", onPress: () => void removeBug() }
    ]);
  }

  async function removeBug() {
    setDeleteBusy(true);
    setError("");
    try {
      await deleteOwnBug(bug, user);
      onDeleted();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Bug verwijderen mislukt.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>{bug.title}</Text>
      <Text style={sharedStyles.subtitle}>{bug.project} - {bug.reporterName}</Text>
      <View style={sharedStyles.row}>
        <View style={[styles.typeBadge, { backgroundColor: typeMeta.background, borderColor: typeMeta.color }]}>
          <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
        </View>
        {isBug && (
          <>
            <SeverityBadge severity={bug.severity} />
            <StatusBadge status={bug.status} />
          </>
        )}
      </View>
      <View style={styles.upvotePanel}>
        <View style={styles.upvoteStat}>
          <Text style={styles.upvoteValue}>{upvoteCount}</Text>
          <Text style={styles.upvoteLabel}>Upvotes</Text>
        </View>
        <View style={styles.upvoteInfo}>
          <Text style={styles.upvoteInfoTitle}>+{upvotePointValue} pt per upvote</Text>
          <Text style={styles.upvoteInfoText}>Bonus voor de melder: +{upvoteCount * upvotePointValue} pt</Text>
        </View>
        <Pressable style={hasVoted ? styles.votedButton : styles.plusButton} disabled={voteBusy || !canUpvote} onPress={toggleUpvote}>
          {voteBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.plusButtonText}>{canUpvote ? (hasVoted ? "Gestemd" : "+1") : "Eigen melding"}</Text>
          )}
        </Pressable>
      </View>
      <Text style={sharedStyles.label}>Beschrijving</Text>
      <Text style={sharedStyles.subtitle}>{bug.description}</Text>
      <Text style={sharedStyles.label}>{isBug ? "Reproduceerstappen" : "Extra uitleg"}</Text>
      <Text style={sharedStyles.subtitle}>{bug.steps || "Niet ingevuld."}</Text>
      {bug.screenshotDataUrl && <Image source={{ uri: bug.screenshotDataUrl }} style={{ height: 220, borderRadius: 8, marginBottom: 14 }} />}
      <View style={styles.commentsCard}>
        <Text style={styles.sectionTitle}>Reacties</Text>
        <View style={styles.reactions}>
          {reactions.map((reaction) => (
            <Pressable key={reaction} style={[styles.reactionButton, selectedReaction === reaction && styles.reactionButtonActive]} onPress={() => setSelectedReaction(reaction)}>
              <Text style={styles.reactionText}>{reaction}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="Comment text"
          multiline
          maxLength={500}
          placeholder="Commentaar"
          style={[sharedStyles.input, styles.commentInput]}
          value={commentText}
          onChangeText={setCommentText}
        />
        <Pressable accessibilityLabel="Post comment" style={sharedStyles.button} disabled={commentBusy} onPress={submitComment}>
          {commentBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>Reactie plaatsen</Text>}
        </Pressable>
        {comments.length ? (
          <View style={styles.commentList}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text style={styles.commentReaction}>{comment.reaction}</Text>
                <View style={styles.commentBody}>
                  <Pressable onPress={() => openProfile(comment.authorId)}>
                    <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                  </Pressable>
                  {!!comment.text && <Text style={styles.commentText}>{comment.text}</Text>}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyComments}>Nog geen reacties.</Text>
        )}
      </View>
      {canUpdateStatus && (
        <>
          <Text style={sharedStyles.label}>Status wijzigen</Text>
          {busy && <ActivityIndicator />}
          <View style={sharedStyles.row}>
            {statuses.map((status) => (
              <Pressable key={status} style={sharedStyles.secondaryButton} onPress={() => changeStatus(status)}>
                <Text style={sharedStyles.secondaryButtonText}>{status}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={sharedStyles.button} onPress={() => changeStatus("Gefixt")}>
            <Text style={sharedStyles.buttonText}>Markeer als gefixt</Text>
          </Pressable>
          <Pressable style={sharedStyles.dangerButton} onPress={() => changeStatus("Dubbel")}>
            <Text style={sharedStyles.buttonText}>Markeer als dubbel</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} disabled={deleteBusy} onPress={confirmDelete}>
            {deleteBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>Verwijder melding</Text>}
          </Pressable>
        </>
      )}
      {!canUpdateStatus && user.uid === bug.reporterId && (
        <Pressable style={styles.deleteButton} disabled={deleteBusy} onPress={confirmDelete}>
          {deleteBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>Verwijder melding</Text>}
        </Pressable>
      )}
      {!!error && <Text style={sharedStyles.error}>{error}</Text>}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  commentsCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  typeBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 10
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "900"
  },
  profileLink: {
    color: "#15724f",
    fontWeight: "900"
  },
  upvotePanel: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    padding: 12
  },
  upvoteStat: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  upvoteValue: {
    color: "#102018",
    fontSize: 22,
    fontWeight: "900"
  },
  upvoteLabel: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "900"
  },
  upvoteInfo: {
    flex: 1,
    minWidth: 0
  },
  upvoteInfoTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  upvoteInfoText: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  plusButton: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    minWidth: 70,
    paddingHorizontal: 12
  },
  votedButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    height: 52,
    justifyContent: "center",
    minWidth: 82,
    paddingHorizontal: 12
  },
  plusButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  sectionTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  reactions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  reactionButton: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  reactionButtonActive: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  reactionText: {
    fontSize: 20
  },
  commentInput: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  commentList: {
    gap: 8,
    marginTop: 12
  },
  commentItem: {
    alignItems: "flex-start",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  commentReaction: {
    fontSize: 22
  },
  commentBody: {
    flex: 1
  },
  commentAuthor: {
    color: "#102018",
    fontWeight: "900"
  },
  commentText: {
    color: "#53645d",
    marginTop: 2
  },
  emptyComments: {
    color: "#77847f",
    fontWeight: "800",
    marginTop: 10
  },
  deleteButton: {
    ...sharedStyles.dangerButton,
    marginTop: 8
  }
});
