import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { addBugComment, deleteOwnBug, listBugComments, toggleBugUpvote, updateBugStatus, updateOwnBug } from "../services/bugService";
import { severityLabel, statusLabel, useI18n } from "../services/i18n";
import { defaultOrganizationId } from "../services/organizationService";
import { getUserById } from "../services/userService";
import { upvotePointValue } from "../services/userService";
import { BugComment, BugReport, BugStatus, ReportType, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Bevestigd", "In behandeling", "Gefixt"];
const severities: BugReport["severity"][] = ["Laag", "Normaal", "Hoog", "Kritiek"];
const reactions = ["🐞", "🪲", "🐛", "💥", "🔥", "🎉"];
const reportTypeMeta: Record<ReportType, { labelKey: string; color: string; background: string }> = {
  bug: { labelKey: "report.badge.bug", color: "#b83227", background: "#fff1ef" },
  tip: { labelKey: "report.badge.tip", color: "#15724f", background: "#e9f6ef" },
  workaround: { labelKey: "report.badge.workaround", color: "#6b4bb3", background: "#f0ecff" },
  idea: { labelKey: "report.badge.idea", color: "#986b08", background: "#fff7d7" }
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
  const { t, tr } = useI18n();
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedReaction, setSelectedReaction] = useState("🐞");
  const [error, setError] = useState("");
  const [editTitle, setEditTitle] = useState(bug.title);
  const [editSeverity, setEditSeverity] = useState(bug.severity);
  const [editDescription, setEditDescription] = useState(bug.description);
  const [editSteps, setEditSteps] = useState(bug.steps);
  const reportType = bug.reportType ?? "bug";
  const isBug = reportType === "bug";
  const typeMeta = reportTypeMeta[reportType];
  const canUpdateStatus = user.uid === bug.reporterId && isBug;
  const canUpvote = user.uid !== bug.reporterId;
  const hasVoted = bug.upvoteUserIds?.includes(user.uid) ?? false;
  const upvoteCount = bug.upvoteCount ?? 0;
  const isOrganizationReport = Boolean(bug.organizationId && bug.organizationId !== defaultOrganizationId);
  const organizationName = bug.organizationName || bug.organizationId || "";

  useEffect(() => {
    listBugComments(bug.id).then(setComments).catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : t("detail.loadCommentsFailed"));
    });
  }, [bug.id]);

  useEffect(() => {
    setEditTitle(bug.title);
    setEditSeverity(bug.severity);
    setEditDescription(bug.description);
    setEditSteps(bug.steps);
  }, [bug.description, bug.severity, bug.steps, bug.title]);

  async function changeStatus(status: BugStatus) {
    if (!canUpdateStatus) return;
    setBusy(true);
    setError("");
    try {
      onBugChanged(await updateBugStatus(bug, status));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("detail.statusFailed"));
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
      setError(nextError instanceof Error ? nextError.message : t("detail.upvoteFailed"));
    } finally {
      setVoteBusy(false);
    }
  }

  async function saveEdit() {
    if (user.uid !== bug.reporterId) return;
    setEditBusy(true);
    setError("");
    try {
      const updated = await updateOwnBug(bug, user, {
        description: editDescription,
        project: bug.project || "BugBaas",
        severity: editSeverity,
        steps: editSteps,
        title: editTitle
      });
      onBugChanged(updated);
      setEditing(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("detail.editFailed"));
    } finally {
      setEditBusy(false);
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
      setError(nextError instanceof Error ? nextError.message : t("detail.commentFailed"));
    } finally {
      setCommentBusy(false);
    }
  }

  async function openProfile(uid: string) {
    setError("");
    const profile = await getUserById(uid);
    if (profile) onOpenProfile(profile);
    else setError(t("detail.profileMissing"));
  }

  function confirmDelete() {
    if (user.uid !== bug.reporterId || deleteBusy) return;
    Alert.alert(t("detail.deleteTitle"), t("detail.deleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => void removeBug() }
    ]);
  }

  async function removeBug() {
    setDeleteBusy(true);
    setError("");
    try {
      await deleteOwnBug(bug, user);
      onDeleted();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("detail.deleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>{bug.title}</Text>
      <Text style={sharedStyles.subtitle}>{bug.reporterName}</Text>
      <View style={sharedStyles.row}>
        <View style={[styles.typeBadge, { backgroundColor: typeMeta.background, borderColor: typeMeta.color }]}>
          <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>{t(typeMeta.labelKey)}</Text>
        </View>
        {isBug && (
          <>
            <SeverityBadge severity={bug.severity} />
            <StatusBadge status={bug.status} />
          </>
        )}
      </View>
      <View style={styles.organizationPanel}>
        <Text style={styles.organizationLabel}>{t("bug.visibility")}</Text>
        <Text style={styles.organizationValue}>
          {isOrganizationReport ? t("bug.organizationVisibility", { name: organizationName }) : t("bug.publicVisibility")}
        </Text>
      </View>
      {user.uid === bug.reporterId && !editing && (
        <Pressable style={sharedStyles.secondaryButton} onPress={() => setEditing(true)}>
          <Text style={sharedStyles.secondaryButtonText}>{t("detail.editReport")}</Text>
        </Pressable>
      )}
      {user.uid === bug.reporterId && editing && (
        <View style={styles.editCard}>
          <Text style={styles.sectionTitle}>{t("detail.editReport")}</Text>
          <Text style={sharedStyles.label}>{t("new.reportTitle")}</Text>
          <TextInput style={sharedStyles.input} value={editTitle} onChangeText={setEditTitle} />
          {isBug && (
            <>
              <Text style={sharedStyles.label}>{t("new.urgency")}</Text>
              <View style={sharedStyles.row}>
                {severities.map((severity) => (
                  <Pressable key={severity} style={editSeverity === severity ? sharedStyles.button : sharedStyles.secondaryButton} onPress={() => setEditSeverity(severity)}>
                    <Text style={editSeverity === severity ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>{severityLabel(severity, t)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          <Text style={sharedStyles.label}>{t("new.description")}</Text>
          <TextInput multiline style={[sharedStyles.input, styles.editInput]} value={editDescription} onChangeText={setEditDescription} />
          <Text style={sharedStyles.label}>{isBug ? t("new.reproSteps") : t("new.extraInfo")}</Text>
          <TextInput multiline style={[sharedStyles.input, styles.editInput]} value={editSteps} onChangeText={setEditSteps} />
          <View style={sharedStyles.row}>
            <Pressable style={sharedStyles.button} disabled={editBusy} onPress={saveEdit}>
              {editBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("common.save")}</Text>}
            </Pressable>
            <Pressable style={sharedStyles.secondaryButton} disabled={editBusy} onPress={() => setEditing(false)}>
              <Text style={sharedStyles.secondaryButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={styles.upvotePanel}>
        <View style={styles.upvoteStat}>
          <Text style={styles.upvoteValue}>{upvoteCount}</Text>
          <Text style={styles.upvoteLabel}>{t("detail.upvotes")}</Text>
        </View>
        <View style={styles.upvoteInfo}>
          <Text style={styles.upvoteInfoTitle}>{t("detail.perUpvote", { points: upvotePointValue })}</Text>
          <Text style={styles.upvoteInfoText}>{t("detail.reporterBonus", { points: upvoteCount * upvotePointValue })}</Text>
        </View>
        <Pressable style={hasVoted ? styles.votedButton : styles.plusButton} disabled={voteBusy || !canUpvote} onPress={toggleUpvote}>
          {voteBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.plusButtonText}>{canUpvote ? (hasVoted ? t("detail.voted") : "+1") : t("detail.ownReport")}</Text>
          )}
        </Pressable>
      </View>
      <Text style={sharedStyles.label}>{t("detail.description")}</Text>
      <Text style={sharedStyles.subtitle}>{bug.description}</Text>
      <Text style={sharedStyles.label}>{isBug ? t("new.reproSteps") : t("new.extraInfo")}</Text>
      <Text style={sharedStyles.subtitle}>{bug.steps || t("detail.emptySteps")}</Text>
      {bug.screenshotDataUrl && <Image source={{ uri: bug.screenshotDataUrl }} style={{ height: 220, borderRadius: 8, marginBottom: 14 }} />}
      <View style={styles.commentsCard}>
        <Text style={styles.sectionTitle}>{t("detail.comments")}</Text>
        <View style={styles.reactions}>
          {reactions.map((reaction) => (
            <Pressable key={reaction} style={[styles.reactionButton, selectedReaction === reaction && styles.reactionButtonActive]} onPress={() => setSelectedReaction(reaction)}>
              <Text style={styles.reactionText}>{reaction}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel={t("a11y.commentText")}
          multiline
          maxLength={500}
          placeholder={t("detail.commentPlaceholder")}
          style={[sharedStyles.input, styles.commentInput]}
          value={commentText}
          onChangeText={setCommentText}
        />
        <Pressable accessibilityLabel={t("a11y.postComment")} style={sharedStyles.button} disabled={commentBusy} onPress={submitComment}>
          {commentBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("detail.postComment")}</Text>}
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
          <Text style={styles.emptyComments}>{t("detail.noComments")}</Text>
        )}
      </View>
      {canUpdateStatus && bug.status !== "Gefixt" && (
        <>
          <Text style={sharedStyles.label}>{t("detail.changeStatus")}</Text>
          {busy && <ActivityIndicator />}
          <View style={sharedStyles.row}>
            {statuses.map((status) => (
              <Pressable key={status} style={sharedStyles.secondaryButton} onPress={() => changeStatus(status)}>
                <Text style={sharedStyles.secondaryButtonText}>{statusLabel(status, t)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={sharedStyles.button} onPress={() => changeStatus("Gefixt")}>
            <Text style={sharedStyles.buttonText}>{t("detail.markFixed")}</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} disabled={deleteBusy} onPress={confirmDelete}>
            {deleteBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("detail.deleteReport")}</Text>}
          </Pressable>
        </>
      )}
      {(!canUpdateStatus || bug.status === "Gefixt") && user.uid === bug.reporterId && (
        <Pressable style={styles.deleteButton} disabled={deleteBusy} onPress={confirmDelete}>
          {deleteBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("detail.deleteReport")}</Text>}
        </Pressable>
      )}
      {!!error && <Text style={sharedStyles.error}>{tr(error)}</Text>}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: "#f5f0e4",
    paddingBottom: 160
  },
  editCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  editInput: {
    minHeight: 90
  },
  commentsCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 18,
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
  organizationPanel: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  organizationLabel: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  organizationValue: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3
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
    backgroundColor: "#efe7d4",
    borderRadius: 14,
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
    backgroundColor: "#174f43",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    minWidth: 70,
    paddingHorizontal: 12
  },
  votedButton: {
    alignItems: "center",
    backgroundColor: "#143f36",
    borderRadius: 14,
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
    backgroundColor: "#efe7d4",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  reactionButtonActive: {
    backgroundColor: "#143f36",
    borderColor: "#d2a43b"
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
    backgroundColor: "#f3ecdc",
    borderRadius: 14,
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
