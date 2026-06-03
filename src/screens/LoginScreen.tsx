import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppBackground } from "../components/AppBackground";
import { InsectIllustration } from "../components/InsectIllustration";
import { sharedStyles } from "./sharedStyles";

type Props = {
  error: string;
  loading: boolean;
  onGoogleSubmit: (idToken: string, accessToken?: string) => Promise<void>;
  onSubmit: (email: string, password: string, createAccount: boolean) => Promise<void>;
};

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen({ error, loading, onGoogleSubmit, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const handledGoogleTokenRef = useRef("");
  const googleClientId = String(Constants.expoConfig?.extra?.googleClientId || "");
  const googleAndroidClientId = String(Constants.expoConfig?.extra?.googleAndroidClientId || "");
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId || undefined,
    webClientId: googleClientId || undefined,
    selectAccount: true
  });

  useEffect(() => {
    async function finishGoogleLogin() {
      if (googleResponse?.type !== "success") return;
      const idToken = googleResponse.params.id_token;
      const accessToken = googleResponse.params.access_token;

      if (!idToken) {
        setGoogleError("Google-login gaf geen geldig token terug.");
        return;
      }
      if (handledGoogleTokenRef.current === idToken) return;
      handledGoogleTokenRef.current = idToken;

      setGoogleBusy(true);
      setGoogleError("");
      await onGoogleSubmit(idToken, accessToken);
      setGoogleBusy(false);
    }

    void finishGoogleLogin();
  }, [googleResponse, onGoogleSubmit]);

  async function submit(createAccount: boolean) {
    setBusy(true);
    await onSubmit(email, password, createAccount);
    setBusy(false);
  }

  async function submitGoogle() {
    if (!googleClientId && !googleAndroidClientId) {
      setGoogleError("Google-login is nog niet geconfigureerd.");
      return;
    }
    setGoogleBusy(true);
    setGoogleError("");
    try {
      const result = await promptGoogleAsync();
      if (result.type !== "success") setGoogleBusy(false);
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : "Google-login openen mislukt.");
      setGoogleBusy(false);
    }
  }

  const isBusy = busy || googleBusy || loading;

  return (
    <SafeAreaView style={styles.screen}>
      <AppBackground />
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <Text style={sharedStyles.title}>CimPro BugBaas</Text>
          <InsectIllustration size={58} variant="beetle" />
        </View>
        <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-mail" style={sharedStyles.input} value={email} onChangeText={setEmail} />
        <TextInput placeholder="Wachtwoord" secureTextEntry style={sharedStyles.input} value={password} onChangeText={setPassword} />
        <Pressable style={sharedStyles.button} disabled={isBusy} onPress={() => submit(false)}>
          {busy || loading ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>Inloggen</Text>}
        </Pressable>
        <Pressable style={styles.googleButton} disabled={isBusy || !googleRequest} onPress={submitGoogle}>
          {googleBusy ? <ActivityIndicator color="#17211c" /> : <Text style={styles.googleText}>Google login</Text>}
        </Pressable>
        <Pressable style={sharedStyles.secondaryButton} disabled={isBusy} onPress={() => submit(true)}>
          <Text style={sharedStyles.secondaryButtonText}>Account maken</Text>
        </Pressable>
        {!!(error || googleError) && <Text style={sharedStyles.error}>{error || googleError}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "#eef4ed"
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 3,
    padding: 16,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 1
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 15
  },
  googleText: {
    color: "#17211c",
    fontWeight: "900"
  }
});
