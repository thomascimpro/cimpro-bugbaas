import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { AppBackground } from "../components/AppBackground";
import { BugArtImage } from "../components/BugArtImage";
import { WalkingBugsLayer } from "../components/WalkingBugsLayer";
import { sharedStyles } from "./sharedStyles";

const splashBadge = require("../../assets/generated/bugbaas-splash-badge-hd.png");

type Props = {
  error: string;
  loading: boolean;
  onGoogleSubmit: (idToken: string, accessToken?: string) => Promise<void>;
  onSubmit: (email: string, password: string, createAccount: boolean, displayName?: string) => Promise<void>;
};

export function LoginScreen({ error, loading, onGoogleSubmit, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [emailVisible, setEmailVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const handledGoogleTokenRef = useRef("");
  const badgePulse = useRef(new Animated.Value(0)).current;
  const googleClientId = String(Constants.expoConfig?.extra?.googleClientId || "");

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: googleClientId,
      offlineAccess: false
    });
  }, [googleClientId]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(badgePulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true
        }),
        Animated.timing(badgePulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [badgePulse]);

  async function submit(nextCreateAccount = createAccount) {
    setBusy(true);
    await onSubmit(email, password, nextCreateAccount);
    setBusy(false);
  }

  async function submitGoogle() {
    if (!googleClientId) {
      setGoogleError("Google-login is nog niet geconfigureerd.");
      return;
    }
    setGoogleBusy(true);
    setGoogleError("");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type === "cancelled") {
        setGoogleBusy(false);
        return;
      }

      const idToken = result.data.idToken;
      if (!idToken) {
        setGoogleError("Google-login gaf geen geldig token terug.");
        setGoogleBusy(false);
        return;
      }
      if (handledGoogleTokenRef.current === idToken) {
        setGoogleBusy(false);
        return;
      }
      handledGoogleTokenRef.current = idToken;
      await onGoogleSubmit(idToken);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === statusCodes.SIGN_IN_CANCELLED) {
        setGoogleBusy(false);
        return;
      }
      setGoogleError(error instanceof Error ? error.message : "Google-login mislukt.");
    } finally {
      setGoogleBusy(false);
    }
  }

  const isBusy = busy || googleBusy || loading;
  const badgeScale = badgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.03]
  });

  return (
    <SafeAreaView style={styles.screen}>
      <AppBackground />
      <WalkingBugsLayer />
      <View style={styles.card}>
        <Animated.Image accessibilityLabel="CimPro BugBaas logo" resizeMode="contain" source={splashBadge} style={[styles.badge, { transform: [{ scale: badgeScale }] }]} />
        <View style={styles.brandRow}>
          <Text style={sharedStyles.title}>CimPro BugBaas</Text>
          <BugArtImage bugId="neushoornkever" size={62} />
        </View>
        <Pressable style={styles.googlePrimaryButton} disabled={isBusy || !googleClientId} onPress={submitGoogle}>
          {googleBusy ? (
            <ActivityIndicator color="#17211c" />
          ) : (
            <View style={styles.googleContent}>
              <GoogleLogo />
              <Text style={styles.googlePrimaryText}>Doorgaan met Google</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.emailToggle} disabled={isBusy} onPress={() => setEmailVisible((current) => !current)}>
          <Text style={styles.emailToggleText}>{emailVisible ? "E-mail verbergen" : "Met e-mail inloggen"}</Text>
        </Pressable>
        {emailVisible && (
          <>
            <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-mail" style={sharedStyles.input} value={email} onChangeText={setEmail} />
            <TextInput placeholder="Wachtwoord" secureTextEntry style={sharedStyles.input} value={password} onChangeText={setPassword} />
            <Pressable style={sharedStyles.button} disabled={isBusy} onPress={() => submit(false)}>
              {busy || loading ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>E-mail login</Text>}
            </Pressable>
            <Pressable
              style={createAccount ? sharedStyles.button : sharedStyles.secondaryButton}
              disabled={isBusy}
              onPress={() => {
                if (!createAccount) {
                  setCreateAccount(true);
                  return;
                }
                void submit(true);
              }}
            >
              <Text style={createAccount ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>
                {createAccount ? "Account aanmaken" : "Nieuw e-mailaccount"}
              </Text>
            </Pressable>
            {createAccount && (
              <Pressable style={styles.switchButton} disabled={isBusy} onPress={() => setCreateAccount(false)}>
                <Text style={styles.switchText}>Ik heb al een e-mailaccount</Text>
              </Pressable>
            )}
          </>
        )}
        {!!(error || googleError) && <Text style={sharedStyles.error}>{error || googleError}</Text>}
      </View>
    </SafeAreaView>
  );
}

function GoogleLogo() {
  return (
    <View style={styles.googleLogo} accessibilityLabel="Google logo">
      <Text style={styles.googleLogoLetter}>G</Text>
    </View>
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
  badge: {
    alignSelf: "center",
    height: 142,
    marginBottom: 8,
    width: 142
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  googlePrimaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 15
  },
  emailToggle: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 14
  },
  emailToggleText: {
    color: "#15724f",
    fontWeight: "900"
  },
  googleContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  },
  googleLogo: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dadce0",
    borderRadius: 10,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  googleLogoLetter: {
    color: "#4285f4",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0
  },
  googlePrimaryText: {
    color: "#17211c",
    fontWeight: "900"
  },
  switchButton: {
    alignItems: "center",
    marginTop: 12
  },
  switchText: {
    color: "#15724f",
    fontWeight: "900"
  }
});
