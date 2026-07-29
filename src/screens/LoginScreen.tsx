import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, ImageBackground, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppBackground } from "../components/AppBackground";
import { BugArtImage } from "../components/BugArtImage";
import { shouldUseNativeGoogleSignIn } from "../services/googleSignInPlatformPolicy";
import { useI18n } from "../services/i18n";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { useReducedMotion } from "../theme/useReducedMotion";
import { sharedStyles } from "./sharedStyles";

const splashBadge = require("../../assets/generated/bugbaas-splash-badge-hd.webp");
const loginKeyArt = require("../../assets/generated/bugbaas-login-expedition-v1.jpg");

function googleSignInModule() {
  if (!shouldUseNativeGoogleSignIn(Platform.OS, Constants.appOwnership)) return null;
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

type Props = {
  error: string;
  loading: boolean;
  onGoogleSubmit: (idToken?: string, accessToken?: string) => Promise<void>;
  onSubmit: (email: string, password: string, createAccount: boolean, displayName?: string) => Promise<void>;
};

function isUnauthorizedGoogleDomain(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  return code === "auth/unauthorized-domain" || message.includes("auth/unauthorized-domain");
}

export function LoginScreen({ error, loading, onGoogleSubmit, onSubmit }: Props) {
  const { t, tr } = useI18n();
  const layout = useResponsiveLayout();
  const reduceMotion = useReducedMotion();
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
    const google = googleSignInModule();
    if (!google?.GoogleSignin) return;
    google.GoogleSignin.configure({
      webClientId: googleClientId,
      offlineAccess: false
    });
  }, [googleClientId]);

  useEffect(() => {
    if (reduceMotion) {
      badgePulse.setValue(1);
      return;
    }
    const animation = Animated.spring(badgePulse, {
      damping: 11,
      mass: 0.7,
      stiffness: 95,
      toValue: 1,
      useNativeDriver: Platform.OS !== "web"
    });
    animation.start();
    return () => animation.stop();
  }, [badgePulse, reduceMotion]);

  async function submit(nextCreateAccount = createAccount) {
    setBusy(true);
    await onSubmit(email, password, nextCreateAccount);
    setBusy(false);
  }

  async function submitGoogle() {
    if (Platform.OS !== "web" && !googleClientId) {
      setGoogleError(t("login.googleNotConfigured"));
      return;
    }
    setGoogleBusy(true);
    setGoogleError("");
    if (Platform.OS === "web") {
      try {
        await onGoogleSubmit();
      } catch (error) {
        setGoogleError(isUnauthorizedGoogleDomain(error) ? t("login.googleDomainNotAllowed") : t("login.googleFailed"));
      } finally {
        setGoogleBusy(false);
      }
      return;
    }

    const google = googleSignInModule();
    if (!google?.GoogleSignin) {
      setGoogleError(t("login.googleFailed"));
      setGoogleBusy(false);
      return;
    }
    try {
      await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await google.GoogleSignin.signIn();
      if (result.type === "cancelled") {
        setGoogleBusy(false);
        return;
      }

      const idToken = result.data.idToken;
      if (!idToken) {
        setGoogleError(t("login.googleNoToken"));
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
      if (typeof error === "object" && error !== null && "code" in error && error.code === google.statusCodes.SIGN_IN_CANCELLED) {
        setGoogleBusy(false);
        return;
      }
      setGoogleError(isUnauthorizedGoogleDomain(error) ? t("login.googleDomainNotAllowed") : t("login.googleFailed"));
    } finally {
      setGoogleBusy(false);
    }
  }

  const isBusy = busy || googleBusy || loading;
  const visibleError = error.includes("auth/unauthorized-domain")
    ? t("login.googleDomainNotAllowed")
    : error || googleError;
  const badgeScale = badgePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, 1]
  });
  const wideCard = layout.isTablet && layout.isLandscape;
  const badgeSize = wideCard ? 230 : layout.isCompact ? 108 : layout.isTablet ? 180 : 146;

  return (
    <SafeAreaView style={[styles.screen, { padding: layout.gutter }]}>
      <AppBackground />
      <View
        style={[
          styles.card,
          {
            flexDirection: wideCard ? "row" : "column",
            maxWidth: wideCard ? Math.min(layout.shellMaxWidth, 980) : Math.min(layout.modalMaxWidth, 620),
            padding: layout.isCompact ? 14 : layout.isTablet ? 24 : 20
          }
        ]}
      >
        <ImageBackground
          imageStyle={[styles.loginKeyArt, !wideCard && styles.loginKeyArtHidden]}
          resizeMode="cover"
          source={loginKeyArt}
          style={[styles.heroPanel, wideCard && styles.heroPanelWide]}
        >
          <Animated.Image
            accessibilityLabel="BugBaas logo"
            resizeMode="contain"
            source={splashBadge}
            style={[styles.badge, { height: badgeSize, width: badgeSize, transform: [{ scale: badgeScale }] }]}
          />
          <View style={styles.brandRow}>
            <View>
              <Text style={[sharedStyles.title, styles.brandTitle, wideCard && styles.brandTitleWide]}>BugBaas</Text>
              <Text style={styles.eyebrow}>{t("login.heroKicker")}</Text>
            </View>
            <BugArtImage bugId="neushoornkever" size={layout.isCompact ? 42 : 52} />
          </View>
          <Text style={[styles.intro, wideCard && styles.introWide]}>{t("login.heroBody")}</Text>
        </ImageBackground>
        <View style={[styles.formPanel, wideCard && styles.formPanelWide]}>
          <Pressable style={({ pressed }) => [styles.googlePrimaryButton, pressed && styles.buttonPressed]} disabled={isBusy || (Platform.OS !== "web" && !googleClientId)} onPress={submitGoogle}>
            {googleBusy ? (
              <ActivityIndicator color="#17211c" />
            ) : (
              <View style={styles.googleContent}>
                <GoogleLogo />
                <Text style={styles.googlePrimaryText}>{t("login.google")}</Text>
              </View>
            )}
          </Pressable>
          <Pressable style={({ pressed }) => [styles.emailToggle, pressed && styles.buttonPressed]} disabled={isBusy} onPress={() => setEmailVisible((current) => !current)}>
            <Text style={styles.emailToggleText}>{emailVisible ? t("login.hideEmail") : t("login.emailLogin")}</Text>
          </Pressable>
          {emailVisible && (
            <View style={styles.emailForm}>
              <TextInput autoCapitalize="none" keyboardType="email-address" placeholder={t("login.email")} placeholderTextColor="#7f8c86" style={[sharedStyles.input, styles.input]} value={email} onChangeText={setEmail} />
              <TextInput placeholder={t("login.password")} placeholderTextColor="#7f8c86" secureTextEntry style={[sharedStyles.input, styles.input]} value={password} onChangeText={setPassword} />
              <Pressable style={({ pressed }) => [sharedStyles.button, pressed && styles.buttonPressed]} disabled={isBusy} onPress={() => submit(false)}>
                {busy || loading ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("login.emailButton")}</Text>}
              </Pressable>
              <Pressable
                style={({ pressed }) => [createAccount ? sharedStyles.button : sharedStyles.secondaryButton, pressed && styles.buttonPressed]}
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
                  {createAccount ? t("login.createAccount") : t("login.newEmailAccount")}
                </Text>
              </Pressable>
              {createAccount && (
                <Pressable style={({ pressed }) => [styles.switchButton, pressed && styles.buttonPressed]} disabled={isBusy} onPress={() => setCreateAccount(false)}>
                  <Text style={styles.switchText}>{t("login.haveAccount")}</Text>
                </Pressable>
              )}
            </View>
          )}
          {!!visibleError && <Text style={sharedStyles.error}>{tr(visibleError)}</Text>}
        </View>
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
    backgroundColor: "#101519",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  card: {
    alignSelf: "center",
    backgroundColor: "rgba(248,249,237,0.96)",
    borderColor: "rgba(232,203,125,0.76)",
    borderRadius: 26,
    borderWidth: 1,
    elevation: 12,
    gap: 22,
    maxHeight: "96%",
    maxWidth: 620,
    padding: 22,
    shadowColor: "#020b08",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 22,
    width: "100%",
    zIndex: 1
  },
  heroPanel: {
    flexShrink: 1,
    justifyContent: "center",
    minWidth: 0
  },
  heroPanelWide: {
    borderRadius: 20,
    flex: 1,
    minHeight: 470,
    overflow: "hidden",
    padding: 20
  },
  formPanel: {
    justifyContent: "center",
    minWidth: 0
  },
  formPanelWide: {
    flex: 1,
    paddingLeft: 2
  },
  badge: {
    alignSelf: "center",
    marginBottom: 0,
  },
  loginKeyArt: {
    opacity: 0.88
  },
  loginKeyArtHidden: {
    opacity: 0
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  eyebrow: {
    color: "#967128",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 3
  },
  brandTitle: {
    color: "#20282c"
  },
  brandTitleWide: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  intro: {
    color: "#466155",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
    marginTop: 6
  },
  introWide: {
    color: "#edf5f2",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5
  },
  googlePrimaryButton: {
    alignItems: "center",
    backgroundColor: "#f7f2df",
    borderColor: "#cba856",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 52,
    marginTop: 4,
    padding: 15,
    shadowColor: "#6d5420",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6
  },
  emailToggle: {
    alignItems: "center",
    marginBottom: 4,
    marginTop: 8,
    minHeight: 44,
    paddingVertical: 10
  },
  emailToggleText: {
    color: "#17563f",
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
    borderRadius: 12,
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
    color: "#173126",
    fontWeight: "900"
  },
  emailForm: {
    gap: 8
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }, { translateY: 1 }]
  },
  switchButton: {
    alignItems: "center",
    marginTop: 12
  },
  switchText: {
    color: "#17563f",
    fontWeight: "900"
  },
  input: {
    backgroundColor: "#fffdf4",
    borderColor: "#cfbc82",
    borderRadius: 12,
    borderWidth: 1,
    color: "#173126"
  }
});
