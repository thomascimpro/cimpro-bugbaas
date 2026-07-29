import React from "react";
import { Animated, Easing, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { fitnessSyncerCallbackUrl, fitnessSyncerSetupKeys, fitnessSyncerSetupUrl } from "../services/fitnessSyncerLinks";
import { MovementSyncSource } from "../services/movementSyncSource";
import { clearFitnessSyncerCredentials, disconnectFitnessSyncer, FitnessSyncerStatus, getFitnessSyncerStatus, saveFitnessSyncerCredentials, startFitnessSyncerConnection, syncFitnessSyncerActivities } from "../services/fitnessSyncerService";
import { canStartFitnessSyncerConnection, fitnessSyncerCredentialAction } from "../services/fitnessSyncerUiPolicy";
import { useI18n } from "../services/i18n";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { NotificationSettings, NotificationType } from "../types";
import { sharedStyles } from "./sharedStyles";

const options: { type: NotificationType; titleKey: string; bodyKey: string }[] = [
  { type: "trade", titleKey: "settings.tradeTitle", bodyKey: "settings.tradeBody" },
  { type: "new_bug", titleKey: "settings.newBugTitle", bodyKey: "settings.newBugBody" },
  { type: "comment", titleKey: "settings.commentTitle", bodyKey: "settings.commentBody" },
  { type: "bug_update", titleKey: "settings.bugUpdateTitle", bodyKey: "settings.bugUpdateBody" },
  { type: "bugdex", titleKey: "settings.bugdexTitle", bodyKey: "settings.bugdexBody" },
  { type: "movement", titleKey: "settings.movementTitle", bodyKey: "settings.movementBody" },
  { type: "duel", titleKey: "settings.duelTitle", bodyKey: "settings.duelBody" }
];

type Props = {
  settings: NotificationSettings;
  onBack: () => void;
  onChange: (settings: NotificationSettings) => void;
  onHealthPermissionOpen?: () => Promise<void>;
  onMovementRegistered?: (todayKm: number, weekKm?: number, source?: MovementSyncSource) => Promise<void>;
  onShowHelp: () => void;
};

export function SettingsScreen({ settings, onBack, onChange, onHealthPermissionOpen, onMovementRegistered, onShowHelp }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const reveal = React.useRef(new Animated.Value(0)).current;
  const [healthPermissionOpening, setHealthPermissionOpening] = React.useState(false);
  const [fitnessStatus, setFitnessStatus] = React.useState<FitnessSyncerStatus | null>(null);
  const [fitnessBusy, setFitnessBusy] = React.useState(false);
  const [fitnessClientId, setFitnessClientId] = React.useState("");
  const [fitnessClientSecret, setFitnessClientSecret] = React.useState("");
  const [fitnessMessage, setFitnessMessage] = React.useState("");
  const [fitnessModalOpen, setFitnessModalOpen] = React.useState(false);
  const fitnessSetupSteps = fitnessSyncerSetupKeys(
    Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "web"
  );
  const fitnessConnectEnabled = canStartFitnessSyncerConnection(fitnessBusy);

  React.useEffect(() => {
    void refreshFitnessStatus();
  }, []);

  React.useEffect(() => {
    Animated.timing(reveal, {
      duration: 560,
      easing: Easing.out(Easing.back(1.35)),
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [reveal]);

  async function refreshFitnessStatus() {
    setFitnessStatus(await getFitnessSyncerStatus());
  }

  async function openFitnessSyncerSetup() {
    try {
      await Linking.openURL(fitnessSyncerSetupUrl);
    } catch {
      setFitnessMessage(t("settings.fitnessError"));
    }
  }

  async function connectFitnessSyncer() {
    if (!fitnessConnectEnabled) return;
    const credentialAction = fitnessSyncerCredentialAction(fitnessClientId, fitnessClientSecret, Boolean(fitnessStatus?.credentialsConfigured));
    if (credentialAction === "invalid") {
      setFitnessMessage(t("settings.fitnessCredentialsRequired"));
      return;
    }
    setFitnessBusy(true);
    setFitnessMessage("");
    try {
      if (credentialAction === "save") {
        const status = await saveFitnessSyncerCredentials(fitnessClientId.trim(), fitnessClientSecret.trim());
        setFitnessStatus(status);
        setFitnessClientId("");
        setFitnessClientSecret("");
      }
      await Linking.openURL(await startFitnessSyncerConnection());
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.fitnessError");
      setFitnessMessage(message === "FitnessSyncer configuration is not active yet." ? t("settings.fitnessUnavailable") : message);
    } finally {
      setFitnessBusy(false);
    }
  }

  async function clearFitnessSyncerConfiguration() {
    if (fitnessBusy) return;
    setFitnessBusy(true);
    setFitnessMessage("");
    try {
      setFitnessStatus(await clearFitnessSyncerCredentials());
      setFitnessClientId("");
      setFitnessClientSecret("");
      setFitnessMessage(t("settings.fitnessCredentialsRemoved"));
    } catch (error) {
      setFitnessMessage(error instanceof Error ? error.message : t("settings.fitnessError"));
    } finally {
      setFitnessBusy(false);
    }
  }

  async function syncFitnessSyncer() {
    if (fitnessBusy || !fitnessStatus?.connected) return;
    setFitnessBusy(true);
    setFitnessMessage("");
    try {
      const result = await syncFitnessSyncerActivities();
      if (result.todayKm > 0 || result.weekKm > 0) await onMovementRegistered?.(result.todayKm, result.weekKm, "fitness_syncer");
      setFitnessMessage(t("settings.fitnessSynced", { km: result.weekKm.toFixed(1), steps: result.weekSteps.toLocaleString() }));
      await refreshFitnessStatus();
    } catch (error) {
      setFitnessMessage(error instanceof Error ? error.message : t("settings.fitnessError"));
    } finally {
      setFitnessBusy(false);
    }
  }

  async function disconnectFitness() {
    if (fitnessBusy || !fitnessStatus?.connected) return;
    setFitnessBusy(true);
    setFitnessMessage("");
    try {
      await disconnectFitnessSyncer();
      await refreshFitnessStatus();
    } catch (error) {
      setFitnessMessage(error instanceof Error ? error.message : t("settings.fitnessError"));
    } finally {
      setFitnessBusy(false);
    }
  }
  function toggle(type: NotificationType) {
    onChange({ ...settings, [type]: !settings[type] });
  }

  async function openHealthPermissions() {
    if (!onHealthPermissionOpen || healthPermissionOpening) return;
    setHealthPermissionOpening(true);
    try {
      await onHealthPermissionOpen();
    } finally {
      setHealthPermissionOpening(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <View style={[styles.content, { maxWidth: layout.contentMaxWidth, paddingHorizontal: layout.gutter }, layout.isTablet && styles.contentWide]}>
        <Animated.View
          style={[
            styles.hero,
            layout.isTablet && styles.heroWide,
            {
              opacity: reveal,
              transform: [{
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.heroCopy}><Text style={styles.heroKicker}>CONSERVATORY</Text><Text style={styles.heroTitle}>{t("settings.title")}</Text><Text style={styles.heroBody}>{t("settings.notifications")}</Text></View>
          <Animated.Image
            source={require("../../assets/generated/settings-gear-hd.png")}
            style={[
              styles.heroArt,
              layout.isTablet && styles.heroArtWide,
              {
                opacity: reveal,
                transform: [
                  {
                    rotate: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["-24deg", "0deg"]
                    })
                  },
                  {
                    scale: reveal.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.78, 1]
                    })
                  }
                ]
              }
            ]}
          />
        </Animated.View>

        <View style={styles.list}>
          {options.map((option) => {
            const enabled = settings[option.type];
            return (
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: enabled }}
                key={option.type}
                style={({ pressed }) => [
                  styles.row,
                  layout.isTablet && styles.rowWide,
                  enabled && styles.rowEnabled,
                  pressed && styles.controlPressed
                ]}
                onPress={() => toggle(option.type)}
              >
                <View style={styles.copy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{t(option.titleKey)}</Text>
                  {layout.isTablet ? <Text numberOfLines={1} style={styles.rowBody}>{t(option.bodyKey)}</Text> : null}
                </View>
                <View style={[styles.toggle, enabled && styles.toggleOn]}>
                  <View style={[styles.knob, enabled && styles.knobOn]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickActions}>
          <Pressable style={({ pressed }) => [styles.helpButton, styles.quickButton, pressed && styles.controlPressed]} onPress={onShowHelp}>
            <GameUiIcon name="badge" size={23} />
            <Text numberOfLines={1} style={styles.helpButtonText}>{t("settings.help")}</Text>
          </Pressable>
          <Pressable disabled={healthPermissionOpening} style={({ pressed }) => [styles.healthButton, styles.quickButton, healthPermissionOpening && styles.healthButtonDisabled, pressed && styles.controlPressed]} onPress={openHealthPermissions}>
            <GameUiIcon name="location" size={23} />
            <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.healthButtonText}>{healthPermissionOpening ? "..." : t("settings.healthPermissions")}</Text>
          </Pressable>
        </View>
        <Pressable style={({ pressed }) => [styles.fitnessLaunchButton, pressed && styles.controlPressed]} onPress={() => setFitnessModalOpen(true)}>
          <GameUiIcon name="settings" size={30} />
          <View style={styles.fitnessLaunchCopy}>
            <Text style={styles.fitnessLaunchTitle}>{t("settings.fitnessTitle")}</Text>
            <Text numberOfLines={1} style={styles.fitnessLaunchBody}>{fitnessStatus?.connected ? t("settings.fitnessConnected") : t("settings.fitnessSetupTitle")}</Text>
          </View>
          <GameUiIcon name="next" size={18} />
        </Pressable>
        <Pressable style={styles.backButton} onPress={onBack}>
          <GameUiIcon name="back" size={18} />
          <Text style={styles.backButtonText}>{t("common.back")}</Text>
        </Pressable>
      </View>

      <Modal animationType="fade" transparent visible={fitnessModalOpen} onRequestClose={() => setFitnessModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, layout.isTablet && styles.modalCardWide]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.heroKicker}>MOVEMENT SYNC</Text>
                <Text style={styles.modalTitle}>{t("settings.fitnessTitle")}</Text>
              </View>
              <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" onPress={() => setFitnessModalOpen(false)} style={styles.modalClose}>
                <GameUiIcon name="close" size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.fitnessCard, layout.isTablet && styles.fitnessCardWide]}>
                <Text style={styles.fitnessBody}>{t("settings.fitnessBody")}</Text>
                <Text style={styles.fitnessPrivacy}>{t("settings.fitnessPrivacy")}</Text>
                {fitnessStatus?.connected ? (
                  <>
                    <Text style={styles.fitnessStatus}>{fitnessStatus.lastSyncAt ? t("settings.fitnessLastSync", { time: new Date(fitnessStatus.lastSyncAt).toLocaleString() }) : t("settings.fitnessConnected")}</Text>
                    <Pressable disabled={fitnessBusy} style={[styles.fitnessPrimary, fitnessBusy && styles.healthButtonDisabled]} onPress={() => void syncFitnessSyncer()}>
                      <Text style={styles.fitnessPrimaryText}>{fitnessBusy ? "..." : t("settings.fitnessSync")}</Text>
                    </Pressable>
                    <Pressable disabled={fitnessBusy} style={styles.fitnessSecondary} onPress={() => void disconnectFitness()}>
                      <Text style={styles.fitnessSecondaryText}>{t("settings.fitnessDisconnect")}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.fitnessSetup}>
                      <Text style={styles.fitnessSetupTitle}>{t("settings.fitnessSetupTitle")}</Text>
                      {fitnessSetupSteps.map((key, index) => (
                        <View key={key} style={styles.fitnessSetupStep}>
                          <View style={styles.fitnessSetupNumber}>
                            <Text style={styles.fitnessSetupNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.fitnessSetupText}>{t(key)}</Text>
                        </View>
                      ))}
                      <Text style={styles.fitnessFreeNote}>{t("settings.fitnessFreeAccount")}</Text>
                    </View>
                    {fitnessStatus && !fitnessStatus.configured ? <Text style={styles.fitnessWarning}>{t("settings.fitnessUnavailable")}</Text> : null}
                    <Pressable style={styles.fitnessAccountButton} onPress={() => void openFitnessSyncerSetup()}>
                      <Text style={styles.fitnessAccountButtonText}>{t("settings.fitnessSetupHelp")}</Text>
                    </Pressable>
                    <Text selectable style={styles.fitnessCallbackLabel}>{t("settings.fitnessCallbackLabel")}</Text>
                    <Text selectable style={styles.fitnessCallbackUrl}>{fitnessSyncerCallbackUrl}</Text>
                    <TextInput autoCapitalize="none" autoCorrect={false} editable={!fitnessBusy} onChangeText={setFitnessClientId} placeholder={t("settings.fitnessClientId")} style={styles.fitnessInput} value={fitnessClientId} />
                    <TextInput autoCapitalize="none" autoCorrect={false} editable={!fitnessBusy} onChangeText={setFitnessClientSecret} placeholder={t("settings.fitnessClientSecret")} secureTextEntry style={styles.fitnessInput} value={fitnessClientSecret} />
                    <Text style={styles.fitnessPrivacy}>{fitnessStatus?.credentialsConfigured ? t("settings.fitnessCredentialsSaved") : t("settings.fitnessCredentialsPrivacy")}</Text>
                    <Pressable disabled={!fitnessConnectEnabled} style={[styles.fitnessPrimary, !fitnessConnectEnabled && styles.healthButtonDisabled]} onPress={() => void connectFitnessSyncer()}>
                      <Text style={styles.fitnessPrimaryText}>{fitnessBusy ? "..." : t("settings.fitnessConnect")}</Text>
                    </Pressable>
                    {fitnessStatus?.credentialsConfigured ? (
                      <Pressable disabled={fitnessBusy} style={styles.fitnessSecondary} onPress={() => void clearFitnessSyncerConfiguration()}>
                        <Text style={styles.fitnessSecondaryText}>{t("settings.fitnessCredentialsRemove")}</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
                {!!fitnessMessage && <Text style={styles.fitnessMessage}>{fitnessMessage}</Text>}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 0,
    paddingBottom: 0
  },
  content: {
    alignSelf: "center",
    flex: 1,
    paddingBottom: 92,
    paddingTop: 8,
    width: "100%"
  },
  contentWide: {
    paddingTop: 12
  },
  hero: { alignItems: "center", backgroundColor: "#202847", borderColor: "#d8a958", borderRadius: 22, borderWidth: 1, flexDirection: "row", marginBottom: 8, minHeight: 84, overflow: "hidden", paddingLeft: 16 },
  heroWide: { minHeight: 104, paddingLeft: 24 },
  heroCopy: { flex: 1, paddingVertical: 10, zIndex: 1 },
  heroKicker: { color: "#ffcf73", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  heroTitle: { color: "#fff8df", fontSize: 22, fontWeight: "900", marginTop: 1 },
  heroBody: { color: "#dbe2ff", fontSize: 10, fontWeight: "700", marginTop: 1 },
  heroArt: { height: 88, marginRight: 2, width: 88 },
  heroArtWide: { height: 112, marginRight: 12, width: 112 },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 8
  },
  controlPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }]
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#5c3d86",
    borderColor: "#b997de",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 46
  },
  helpButtonText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  healthButton: {
    alignItems: "center",
    backgroundColor: "#eef7ff",
    borderColor: "#6aa8d8",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 46,
    padding: 8
  },
  healthButtonBody: { color: "#53677b", fontSize: 12, fontWeight: "700" },
  healthButtonDisabled: {
    opacity: 0.6
  },
  healthButtonText: {
    color: "#28658f",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  fitnessAccountButton: { alignItems: "center", borderColor: "#4c7ea5", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 42, padding: 9 },
  fitnessAccountButtonText: { color: "#315f83", fontSize: 12, fontWeight: "900" },
  fitnessBody: { color: "#53645d", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  fitnessCallbackLabel: { color: "#31473e", fontSize: 11, fontWeight: "900" },
  fitnessCallbackUrl: { backgroundColor: "#edf4fb", borderRadius: 10, color: "#31473e", fontSize: 10, lineHeight: 15, padding: 8 },
  fitnessCard: { backgroundColor: "#f7fbff", borderColor: "#b8cde0", borderRadius: 20, borderWidth: 1, gap: 8, marginBottom: 10, padding: 16 },
  fitnessCardWide: { padding: 20 },
  fitnessMessage: { color: "#315f83", fontSize: 12, fontWeight: "800" },
  fitnessPrimary: { alignItems: "center", backgroundColor: "#315f83", borderRadius: 12, minHeight: 46, justifyContent: "center", padding: 10 },
  fitnessPrimaryText: { color: "#ffffff", fontWeight: "900" },
  fitnessPrivacy: { color: "#64756d", fontSize: 11, fontWeight: "700" },
  fitnessFreeNote: { color: "#53645d", fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 2 },
  fitnessInput: { backgroundColor: "#ffffff", borderColor: "#9bb8aa", borderRadius: 8, borderWidth: 1, color: "#102018", minHeight: 44, paddingHorizontal: 10 },
  fitnessSecondary: { alignItems: "center", padding: 8 },
  fitnessSetup: { backgroundColor: "#eaf2fa", borderRadius: 14, gap: 7, padding: 12 },
  fitnessSetupNumber: { alignItems: "center", backgroundColor: "#5c3d86", borderRadius: 8, height: 22, justifyContent: "center", width: 22 },
  fitnessSetupNumberText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  fitnessSetupStep: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  fitnessSetupText: { color: "#31473e", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  fitnessSetupTitle: { color: "#102018", fontSize: 13, fontWeight: "900" },
  fitnessSecondaryText: { color: "#8f312a", fontSize: 12, fontWeight: "900" },
  fitnessStatus: { color: "#15724f", fontSize: 12, fontWeight: "900" },
  fitnessTitle: { color: "#102018", fontSize: 16, fontWeight: "900" },
  fitnessWarning: { color: "#8f5a12", fontSize: 12, fontWeight: "800" },
  row: {
    alignItems: "center",
    backgroundColor: "#fffaf3",
    borderColor: "#ded1bd",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 56,
    paddingHorizontal: 9,
    paddingVertical: 7,
    width: "48.8%"
  },
  rowWide: {
    width: "32.6%"
  },
  rowEnabled: {
    backgroundColor: "#fff7e6",
    borderColor: "#e2bd78"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  rowTitle: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900"
  },
  rowBody: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  toggle: {
    backgroundColor: "#c7ccd7",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    width: 42
  },
  toggleOn: {
    backgroundColor: "#e2923f"
  },
  knob: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    height: 18,
    width: 18
  },
  knobOn: {
    alignSelf: "flex-end"
  },
  quickActions: {
    flexDirection: "row",
    gap: 8
  },
  quickButton: {
    flex: 1,
    marginBottom: 0
  },
  fitnessLaunchButton: {
    alignItems: "center",
    backgroundColor: "#f7fbff",
    borderColor: "#78a7c8",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 8,
    minHeight: 54,
    paddingHorizontal: 11
  },
  fitnessLaunchCopy: { flex: 1 },
  fitnessLaunchTitle: { color: "#183b55", fontSize: 13, fontWeight: "900" },
  fitnessLaunchBody: { color: "#617886", fontSize: 9, fontWeight: "800", marginTop: 1 },
  backButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 34,
    paddingHorizontal: 14
  },
  backButtonText: { color: "#fff8df", fontSize: 11, fontWeight: "900" },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(4,12,18,0.76)",
    flex: 1,
    justifyContent: "center",
    padding: 14
  },
  modalCard: {
    backgroundColor: "#eef5fb",
    borderColor: "#d8a958",
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: "88%",
    maxWidth: 620,
    overflow: "hidden",
    width: "100%"
  },
  modalCardWide: { maxHeight: "82%" },
  modalHeader: {
    alignItems: "center",
    backgroundColor: "#202847",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  modalTitle: { color: "#fff8df", fontSize: 20, fontWeight: "900" },
  modalClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  modalScrollContent: { padding: 12 }
});
