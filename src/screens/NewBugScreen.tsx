import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createBug } from "../services/bugService";
import { severityLabel, useI18n } from "../services/i18n";
import { BugReport, BugSeverity, ReportType, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const severities: BugSeverity[] = ["Laag", "Normaal", "Hoog", "Kritiek"];
const projectOptions = ["TBox", "TConnect", "SkySpark", "Infinite", "VTScada", "Alert", "Anders"];
const reportTypes: Array<{ value: ReportType; labelKey: string; descriptionKey: string }> = [
  { value: "bug", labelKey: "report.type.bug", descriptionKey: "new.reportBugDesc" },
  { value: "tip", labelKey: "report.type.tip", descriptionKey: "new.reportTipDesc" },
  { value: "workaround", labelKey: "report.type.workaround", descriptionKey: "new.reportWorkaroundDesc" },
  { value: "idea", labelKey: "report.type.idea", descriptionKey: "new.reportIdeaDesc" }
];
const maxScreenshotSize = 640;
const screenshotQuality = 0.35;
const draftKey = "bugbaas:new-bug-draft";

type BugDraft = {
  reportType?: ReportType;
  title: string;
  project: string;
  severity: BugSeverity;
  description: string;
  steps: string;
  screenshotPreviewUri?: string;
  screenshotDataUrl?: string;
};

type Props = {
  user: User;
  onBack: () => void;
  onSaved: (bug: BugReport) => void;
};

export function NewBugScreen({ user, onBack: _onBack, onSaved }: Props) {
  const { t, tr } = useI18n();
  const [reportType, setReportType] = useState<ReportType>("bug");
  const [typeOpen, setTypeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [severity, setSeverity] = useState<BugSeverity>("Normaal");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [screenshotPreviewUri, setScreenshotPreviewUri] = useState<string | undefined>();
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BugDraft | null>(null);

  const selectedReportType = reportTypes.find((item) => item.value === reportType) ?? reportTypes[0];
  const isBug = reportType === "bug";
  const draft: BugDraft = { reportType, title, project, severity, description, steps, screenshotPreviewUri, screenshotDataUrl };
  const hasDraftContent = Boolean(title.trim() || project.trim() || description.trim() || steps.trim() || screenshotDataUrl);

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
  }, [description, draftReady, hasDraftContent, pendingDraft, project, reportType, screenshotDataUrl, screenshotPreviewUri, severity, steps, title]);

  function applyDraft(nextDraft: BugDraft) {
    setReportType(nextDraft.reportType ?? "bug");
    setTitle(nextDraft.title);
    setProject(nextDraft.project);
    setSeverity(nextDraft.severity);
    setDescription(nextDraft.description);
    setSteps(nextDraft.steps);
    setScreenshotPreviewUri(nextDraft.screenshotPreviewUri);
    setScreenshotDataUrl(nextDraft.screenshotDataUrl);
    setPendingDraft(null);
  }

  function clearForm() {
    setReportType("bug");
    setTypeOpen(false);
    setTitle("");
    setProject("");
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
      const bug = await createBug({ reportType, title, project, severity: isBug ? severity : "Laag", description, steps, screenshotDataUrl }, user);
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
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <Text style={sharedStyles.title}>{t("new.title")}</Text>
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
      <Pressable style={styles.selectButton} onPress={() => setTypeOpen((current) => !current)}>
        <View>
          <Text style={styles.selectText}>{t(selectedReportType.labelKey)}</Text>
          <Text style={styles.selectDescription}>{t(selectedReportType.descriptionKey)}</Text>
        </View>
      </Pressable>
      {typeOpen && (
        <View style={styles.selectMenu}>
          {reportTypes.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.selectOption, reportType === item.value && styles.selectOptionActive]}
              onPress={() => {
                setReportType(item.value);
                setTypeOpen(false);
              }}
            >
              <Text style={[styles.selectOptionText, reportType === item.value && styles.selectOptionTextActive]}>{t(item.labelKey)}</Text>
              <Text style={[styles.selectOptionMeta, reportType === item.value && styles.selectOptionTextActive]}>{t(item.descriptionKey)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={sharedStyles.label}>{t("new.reportTitle")}</Text>
      <TextInput style={sharedStyles.input} value={title} onChangeText={setTitle} />
      <Text style={sharedStyles.label}>{t("new.system")}</Text>
      <Pressable style={styles.selectButton} onPress={() => setProjectOpen((current) => !current)}>
        <Text style={[styles.selectText, !project && styles.selectPlaceholder]}>{project || t("new.chooseSystem")}</Text>
      </Pressable>
      {projectOpen && (
        <View style={styles.selectMenu}>
          {projectOptions.map((item) => (
            <Pressable
              key={item}
              style={[styles.selectOption, project === item && styles.selectOptionActive]}
              onPress={() => {
                setProject(item);
                setProjectOpen(false);
              }}
            >
              <Text style={[styles.selectOptionText, project === item && styles.selectOptionTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 180
  },
  draftCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
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
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
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
    borderRadius: 8,
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
  selectButton: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    minHeight: 52,
    paddingHorizontal: 12
  },
  selectText: {
    color: "#17211c",
    fontWeight: "900"
  },
  selectDescription: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  selectPlaceholder: {
    color: "#77847f"
  },
  selectMenu: {
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
    padding: 8
  },
  selectOption: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  selectOptionActive: {
    backgroundColor: "#15724f"
  },
  selectOptionText: {
    color: "#17211c",
    fontWeight: "900"
  },
  selectOptionMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  selectOptionTextActive: {
    color: "#ffffff"
  }
});
