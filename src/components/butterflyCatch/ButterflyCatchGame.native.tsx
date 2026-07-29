import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { BUTTERFLY_CATCH_WEB_URL, type ButterflyCatchGameProps } from "./ButterflyCatchGame.types";

export function ButterflyCatchGame({ onClose, onFullscreenChange }: ButterflyCatchGameProps) {
  const [error, setError] = useState("");

  useEffect(() => {
    onFullscreenChange?.(true);
    return () => onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  async function openWebGame() {
    setError("");
    try {
      await Linking.openURL(BUTTERFLY_CATCH_WEB_URL);
    } catch {
      setError(`Open ${BUTTERFLY_CATCH_WEB_URL} in je browser.`);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text accessibilityLabel="Vergrendeld" style={styles.lock}>🔒</Text>
        <Text style={styles.kicker}>WEBVERSIE</Text>
        <Text style={styles.title}>Vleugeljacht 3D</Text>
        <Text style={styles.body}>
          Deze 3D-game is tijdelijk vergrendeld in de Android-app. Speel hem via BugBaas op het web en log daar in om je score op te slaan.
        </Text>
        <Pressable accessibilityRole="link" onPress={() => void openWebGame()} style={styles.webButton}>
          <Text style={styles.webButtonText}>OPEN BUGBAAS.VERCEL.APP</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>TERUG NAAR PLAY</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 13
  },
  backButtonText: { color: "#dce9df", fontSize: 11, fontWeight: "900" },
  body: { color: "#d9eee0", fontSize: 14, lineHeight: 21, marginTop: 12, textAlign: "center" },
  card: {
    alignItems: "center",
    backgroundColor: "#102a1d",
    borderColor: "rgba(244,204,97,0.55)",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    padding: 24,
    width: "88%"
  },
  error: { color: "#ffb4a8", fontSize: 11, marginTop: 12, textAlign: "center" },
  kicker: { color: "#f4cc61", fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 10 },
  lock: { fontSize: 42 },
  root: { alignItems: "center", backgroundColor: "#07140f", flex: 1, justifyContent: "center" },
  title: { color: "#ffffff", fontSize: 28, fontWeight: "900", marginTop: 5 },
  webButton: {
    alignItems: "center",
    backgroundColor: "#f4cc61",
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 15,
    width: "100%"
  },
  webButtonText: { color: "#173223", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 }
});
