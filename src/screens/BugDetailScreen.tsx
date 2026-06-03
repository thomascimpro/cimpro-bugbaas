import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { toggleBugUpvote, updateBugStatus } from "../services/bugService";
import { BugReport, BugStatus, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const statuses: BugStatus[] = ["Bevestigd", "In behandeling", "Gefixt", "Afgekeurd", "Dubbel"];

type Props = {
  bug: BugReport;
  user: User;
  onBack: () => void;
  onBugChanged: (bug: BugReport) => void;
};

export function BugDetailScreen({ bug, user, onBack, onBugChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [error, setError] = useState("");
  const canUpdateStatus = user.uid === bug.reporterId;
  const hasVoted = bug.upvoteUserIds?.includes(user.uid) ?? false;

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

  return (
    <ScrollView style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>{bug.title}</Text>
      <Text style={sharedStyles.subtitle}>{bug.project} · {bug.reporterName} · {bug.points} punten</Text>
      <View style={sharedStyles.row}>
        <SeverityBadge severity={bug.severity} />
        <StatusBadge status={bug.status} />
      </View>
      <Pressable style={hasVoted ? sharedStyles.button : sharedStyles.secondaryButton} disabled={voteBusy} onPress={toggleUpvote}>
        {voteBusy ? (
          <ActivityIndicator color={hasVoted ? "#ffffff" : "#17211c"} />
        ) : (
          <Text style={hasVoted ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>Upvote +{bug.upvoteCount ?? 0}</Text>
        )}
      </Pressable>
      <Text style={sharedStyles.label}>Beschrijving</Text>
      <Text style={sharedStyles.subtitle}>{bug.description}</Text>
      <Text style={sharedStyles.label}>Reproduceerstappen</Text>
      <Text style={sharedStyles.subtitle}>{bug.steps || "Niet ingevuld. Spannend, maar minder handig."}</Text>
      {bug.screenshotDataUrl && <Image source={{ uri: bug.screenshotDataUrl }} style={{ height: 220, borderRadius: 8, marginBottom: 14 }} />}
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
        </>
      )}
      {!!error && <Text style={sharedStyles.error}>{error}</Text>}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
    </ScrollView>
  );
}
