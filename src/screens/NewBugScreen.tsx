import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { createBug } from "../services/bugService";
import { severityLabel, useI18n } from "../services/i18n";
import { defaultOrganizationId, isPublicOrganization, organizationIdsForUser, organizationNamesForUser } from "../services/organizationService";
import { BugReport, BugSeverity, ReportType, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const severities: BugSeverity[] = ["Laag", "Normaal", "Hoog", "Kritiek"];
const defaultReportProject = "BugBaas";
const reportTypes: Array<{ value: ReportType; labelKey: string; descriptionKey: string }> = [
  { value: "bug", labelKey: "report.type.bug", descriptionKey: "new.reportBugDesc" },
  { value: "tip", labelKey: "report.type.tip", descriptionKey: "new.reportTipDesc" },
  { value: "workaround", labelKey: "report.type.workaround", descriptionKey: "new.reportWorkaroundDesc" },
  { value: "idea", labelKey: "report.type.idea", descriptionKey: "new.reportIdeaDesc" }
];
const maxScreenshotSize = 640;
const screenshotQuality = 0.35;
const draftKey = "bugbaas:new-bug-draft";
const fieldOperationsBoard = require("../../assets/generated/field-operations-board-v1.jpg");

type BugDraft = {
  reportType?: ReportType;
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  organizationId?: string;
  screenshotPreviewUri?: string;
  screenshotDataUrl?: string;
};

type Props = {
  user: User;
  onBack: () => void;
  onSaved: (bug: BugReport) => void;
};

export function NewBugScreen({ user, onBack, onSaved }: Props) {
  const { t, tr } = useI18n();
  const [reportType, setReportType] = useState<ReportType>("bug");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(defaultReportProject);
  const userOrganizationIds = organizationIdsForUser(user);
  const userOrganizationNames = organizationNamesForUser(user);
  const defaultSelectedOrganizationId = userOrganizationIds[0] ?? defaultOrganizationId;
  const [organizationId, setOrganizationId] = useState(isPublicOrganization(user.organizationId) ? defaultOrganizationId : defaultSelectedOrganizationId);
  const [severity, setSeverity] = useState<BugSeverity>("Normaal");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [screenshotPreviewUri, setScreenshotPreviewUri] = useState<string | undefined>();
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BugDraft | null>(null);

  const isBug = reportType === "bug";
  const hasOrganization = userOrganizationIds.length > 0;
  const selectedOrganizationId = organizationId === defaultOrganizationId || !hasOrganization
    ? defaultOrganizationId
    : userOrganizationIds.includes(organizationId)
      ? organizationId
      : defaultSelectedOrganizationId;
  const draft: BugDraft = { reportType, title, project, severity, description, steps, organizationId: selectedOrganizationId, screenshotPreviewUri, screenshotDataUrl };
  const hasDraftContent = Boolean(title.trim() || description.trim() || steps.trim() || screenshotDataUrl);

  useEffect(() => {
    async function loadDraft() {
      const rawDraft = await AsyncStorage.getItem(draftKey);
      try {
        if (rawDraft) {
          setPendingDraft(JSON.parse(rawDraft) as BugDraft);
        }
      } catch {
        await AsyncStorage.removeItem(draftKey);
      }
      setDraftReady(true);
    }

    void loadDraft();
  }, []);

  useEffect(() => {
    if (!draftReady || pendingDraft) return;
    if (!hasDraftContent) {
      void AsyncStorage.removeItem(draftKey);
      return;
    }

    void AsyncStorage.setItem(draftKey, JSON.stringify(draft));
  }, [description, draftReady, hasDraftContent, organizationId, pendingDraft, project, reportType, screenshotDataUrl, screenshotPreviewUri, severity, steps, title]);

  function applyDraft(nextDraft: BugDraft) {
    setReportType(nextDraft.reportType ?? "bug");
    setTitle(nextDraft.title);
    setProject(nextDraft.project || defaultReportProject);
    setOrganizationId(nextDraft.organizationId && userOrganizationIds.includes(nextDraft.organizationId) ? nextDraft.organizationId : defaultOrganizationId);
    setSeverity(nextDraft.severity);
    setDescription(nextDraft.description);
    setSteps(nextDraft.steps);
    setScreenshotPreviewUri(nextDraft.screenshotPreviewUri);
    setScreenshotDataUrl(nextDraft.screenshotDataUrl);
    setPendingDraft(null);
  }

  function clearForm() {
    setReportType("bug");
    setTitle("");
    setProject(defaultReportProject);
    setOrganizationId(hasOrganization ? defaultSelectedOrganizationId : defaultOrganizationId);
    setSeverity("Normaal");
    setDescription("");
    setSteps("");
    setScreenshotPreviewUri(undefined);
    setScreenshotDataUrl(undefined);
  }

  async function discardDraft() {
    clearForm();
    setPendingDraft(null);
    await AsyncStorage.removeItem(draftKey);
  }

  function removeScreenshot() {
    setScreenshotPreviewUri(undefined);
    setScreenshotDataUrl(undefined);
  }

  async function saveDraftSnapshot(nextDraft: BugDraft = draft) {
    if (!draftReady) return;
    await AsyncStorage.setItem(draftKey, JSON.stringify(nextDraft));
  }

  async function pickImage() {
    if (hasDraftContent) await saveDraftSnapshot();
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled) return;

    const asset = result.assets[0];
    const largestSide = Math.max(asset.width ?? 0, asset.height ?? 0);
    const resize =
      largestSide > maxScreenshotSize
        ? [{ resize: asset.width && asset.width >= (asset.height ?? 0) ? { width: maxScreenshotSize } : { height: maxScreenshotSize } }]
        : [];
    const compressed = await ImageManipulator.manipulateAsync(asset.uri, resize, {
      compress: screenshotQuality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true
    });
    const nextScreenshotDataUrl = compressed.base64 ? `data:image/jpeg;base64,${compressed.base64}` : undefined;
    setScreenshotPreviewUri(compressed.uri);
    setScreenshotDataUrl(nextScreenshotDataUrl);
    await saveDraftSnapshot({ ...draft, screenshotPreviewUri: compressed.uri, screenshotDataUrl: nextScreenshotDataUrl });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const bug = await createBug({ reportType, title, project: project || defaultReportProject, severity: isBug ? severity : "Laag", description, steps, screenshotDataUrl, organizationId: selectedOrganizationId }, user);
      await AsyncStorage.removeItem(draftKey);
      clearForm();
      onSaved(bug);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("new.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[sharedStyles.screen, styles.screen]}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={styles.sheetEyebrow}>{t("new.kicker")}</Text>
            <Text style={styles.sheetTitle}>{t("new.title")}</Text>
          </View>
          <Pressable accessibilityLabel={t("common.back")} style={styles.closeButton} onPress={onBack}>
            <GameUiIcon name="close" size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} style={styles.formScroll} showsVerticalScrollIndicator={false}>
          <ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={fieldOperationsBoard} style={styles.hero}>
            <View style={styles.heroVeil}>
              <Text style={styles.heroSubtitle}>{t("new.subtitle")}</Text>
            </View>
          </ImageBackground>
      {pendingDraft && (
        <View style={styles.draftCard}>
          <Text style={styles.draftTitle}>{t("new.draftFound")}</Text>
          <View style={styles.draftActions}>
            <Pressable style={[sharedStyles.button, styles.draftButton]} onPress={() => applyDraft(pendingDraft)}>
              <Text style={sharedStyles.buttonText}>{t("new.continue")}</Text>
            </Pressable>
            <Pressable style={[sharedStyles.secondaryButton, styles.draftButton]} onPress={discardDraft}>
              <Text style={sharedStyles.secondaryButtonText}>{t("common.new")}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Text style={sharedStyles.label}>{t("new.type")}</Text>
      <View style={styles.typeGrid}>
        {reportTypes.map((item) => (
          <Pressable
            accessibilityState={{ selected: reportType === item.value }}
            key={item.value}
            style={[styles.typeOption, reportType === item.value && styles.typeOptionActive]}
            onPress={() => setReportType(item.value)}
          >
            <Text style={[styles.typeOptionText, reportType === item.value && styles.typeOptionTextActive]}>{t(item.labelKey)}</Text>
            <Text style={[styles.typeOptionMeta, reportType === item.value && styles.typeOptionTextActive]}>{t(item.descriptionKey)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={sharedStyles.label}>{t("new.reportTitle")}</Text>
      <TextInput style={sharedStyles.input} value={title} onChangeText={setTitle} />
      <Text style={sharedStyles.label}>{t("new.visibility")}</Text>
      <View style={styles.visibilityRow}>
        <Pressable
          style={[styles.visibilityOption, selectedOrganizationId === defaultOrganizationId && styles.visibilityOptionActive]}
          onPress={() => setOrganizationId(defaultOrganizationId)}
        >
          <Text style={[styles.visibilityTitle, selectedOrganizationId === defaultOrganizationId && styles.visibilityTitleActive]}>{t("new.visibilityPublic")}</Text>
          <Text style={[styles.visibilityMeta, selectedOrganizationId === defaultOrganizationId && styles.visibilityMetaActive]}>{t("new.visibilityPublicDesc")}</Text>
        </Pressable>
        {userOrganizationIds.map((optionOrganizationId) => (
          <Pressable
            key={optionOrganizationId}
            style={[styles.visibilityOption, selectedOrganizationId === optionOrganizationId && styles.visibilityOptionActive]}
            onPress={() => setOrganizationId(optionOrganizationId)}
          >
            <Text style={[styles.visibilityTitle, selectedOrganizationId === optionOrganizationId && styles.visibilityTitleActive]} numberOfLines={1}>{userOrganizationNames[optionOrganizationId] ?? optionOrganizationId}</Text>
            <Text style={[styles.visibilityMeta, selectedOrganizationId === optionOrganizationId && styles.visibilityMetaActive]}>{t("new.visibilityOrgDesc")}</Text>
          </Pressable>
        ))}
      </View>
      {isBug && (
        <>
          <Text style={sharedStyles.label}>{t("new.urgency")}</Text>
          <View style={sharedStyles.row}>
            {severities.map((item) => (
              <Pressable key={item} style={severity === item ? sharedStyles.button : sharedStyles.secondaryButton} onPress={() => setSeverity(item)}>
                <Text style={severity === item ? sharedStyles.buttonText : sharedStyles.secondaryButtonText}>{severityLabel(item, t)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Text style={sharedStyles.label}>{t("new.description")}</Text>
      <TextInput multiline style={[sharedStyles.input, { minHeight: 90 }]} value={description} onChangeText={setDescription} />
      <Text style={sharedStyles.label}>{isBug ? t("new.reproSteps") : t("new.extraInfo")}</Text>
      <TextInput multiline style={[sharedStyles.input, { minHeight: 90 }]} value={steps} onChangeText={setSteps} />
      {screenshotPreviewUri && (
        <View style={styles.previewWrap}>
          <Image source={{ uri: screenshotPreviewUri }} style={styles.previewImage} />
          <Pressable accessibilityLabel={t("a11y.removeScreenshot")} style={styles.removeImageButton} onPress={removeScreenshot}>
            <Text style={styles.removeImageText}>X</Text>
          </Pressable>
        </View>
      )}
      <Pressable accessibilityLabel={t("a11y.chooseScreenshot")} style={sharedStyles.secondaryButton} onPress={pickImage}>
        <Text style={sharedStyles.secondaryButtonText}>{t("new.chooseScreenshot")}</Text>
      </Pressable>
      <Pressable accessibilityLabel={t("a11y.saveBug")} style={sharedStyles.button} disabled={busy} onPress={save}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("common.save")}</Text>}
      </Pressable>
          {!!error && <Text style={sharedStyles.error}>{tr(error)}</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    paddingBottom: 118,
    paddingHorizontal: 10,
    paddingTop: 8
  },
  sheet: {
    backgroundColor: "#f7f1e2",
    borderColor: "#d7bd57",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    maxWidth: 760,
    overflow: "hidden",
    shadowColor: "#00150f",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    width: "100%"
  },
  sheetHeader: {
    alignItems: "center",
    backgroundColor: "#143f36",
    flexDirection: "row",
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sheetHeaderText: {
    flex: 1
  },
  sheetEyebrow: {
    color: "#e8c968",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3
  },
  sheetTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 1
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#fff8e6",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  formScroll: {
    flex: 1
  },
  content: {
    padding: 12,
    paddingBottom: 24
  },
  hero: {
    borderColor: "#d7bd57",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 82,
    overflow: "hidden"
  },
  heroImage: { opacity: 0.9 },
  heroVeil: {
    backgroundColor: "rgba(6, 30, 21, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 82,
    padding: 12
  },
  heroSubtitle: { color: "#e4dbc4", fontSize: 12, fontWeight: "800", marginTop: 3 },
  draftCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#d2a43b",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12
  },
  draftTitle: {
    color: "#102018",
    fontSize: 15,
    fontWeight: "900"
  },
  draftActions: {
    flexDirection: "row",
    gap: 8
  },
  draftButton: {
    flex: 1
  },
  previewWrap: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden"
  },
  previewImage: {
    height: 180,
    width: "100%"
  },
  removeImageButton: {
    alignItems: "center",
    backgroundColor: "#b83227",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 34
  },
  removeImageText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10
  },
  typeOption: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 68,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  typeOptionActive: {
    backgroundColor: "#174f43",
    borderColor: "#174f43"
  },
  typeOptionText: {
    color: "#17211c",
    fontWeight: "900"
  },
  typeOptionMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  typeOptionTextActive: {
    color: "#ffffff"
  },
  visibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  visibilityOption: {
    backgroundColor: "#fffaf0",
    borderColor: "#d9cbaa",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: "47%",
    minHeight: 70,
    padding: 10
  },
  visibilityOptionActive: {
    backgroundColor: "#174f43",
    borderColor: "#174f43"
  },
  visibilityTitle: {
    color: "#17211c",
    fontSize: 14,
    fontWeight: "900"
  },
  visibilityTitleActive: {
    color: "#ffffff"
  },
  visibilityMeta: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  visibilityMetaActive: {
    color: "#ffffff"
  }
});
