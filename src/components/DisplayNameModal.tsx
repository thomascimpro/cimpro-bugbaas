import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "../types";

type Props = {
  user: User | null;
  visible: boolean;
  onSave: (displayName: string) => Promise<void>;
  onCancel?: () => void;
};

export function DisplayNameModal({ user, visible, onSave, onCancel }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDisplayName("");
    setError("");
  }, [visible]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSave(displayName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Naam opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setDisplayName("");
    setError("");
    onCancel?.();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel ? cancel : (() => undefined)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Naam in de app</Text>
          <Text style={styles.subtitle}>Collega's zien je onder deze naam.</Text>
          <TextInput
            autoCapitalize="words"
            maxLength={32}
            placeholder={user?.displayName || "Naam"}
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Pressable style={styles.button} disabled={busy} onPress={submit}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Opslaan</Text>}
          </Pressable>
          {onCancel && (
            <Pressable style={styles.cancelButton} disabled={busy} onPress={cancel}>
              <Text style={styles.cancelButtonText}>Annuleer</Text>
            </Pressable>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.58)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    width: "100%"
  },
  title: {
    color: "#102018",
    fontSize: 24,
    fontWeight: "900"
  },
  subtitle: {
    color: "#53645d",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
    marginTop: 4
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cfd8d3",
    borderRadius: 8,
    borderWidth: 1,
    color: "#17211c",
    fontSize: 16,
    marginBottom: 12,
    padding: 14
  },
  button: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#cfd8d3",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48
  },
  cancelButtonText: {
    color: "#102018",
    fontWeight: "900"
  },
  error: {
    color: "#b83227",
    fontWeight: "800",
    marginTop: 10
  }
});
