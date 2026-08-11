import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, type GestureResponderEvent, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugBaasStateArt } from "../components/BugBaasStateArt";
import { WeeklyScanContestCard } from "../components/WeeklyScanContestCard";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { nativeDriver } from "../services/animationPlatform";
import { type Language, useI18n } from "../services/i18n";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { ScanIdentificationStage } from "./scan/ScanIdentificationStage";
import { ScanStageHeader } from "./scan/ScanStageHeader";
import { deriveRealBugScanStage, scanStageAllowsPageScroll } from "./scan/realBugScanFlowModel";
import { getBugProfessorBrief } from "../services/bugProfessorService";
import { getFieldPhotoStamps, type FieldPhotoStamp } from "../services/fieldPhotoStampService";
import { type RealBugScanResponse } from "../services/realBugScanContract";
import {
  croppedPhotoThresholdBytes,
  emergencyRealBugPhotoPlan,
  fallbackRealBugPhotoPlan,
  overviewRealBugPhotoPlan,
  primaryRealBugPhotoPlan,
  reviewRealBugThumbnailPlan,
  shouldFallbackRealBugPhoto,
  type RealBugPhotoPlan
} from "../services/realBugScanImagePolicy";
import { normalizeRealBugCameraAsset, type RealBugPhotoAsset } from "../services/realBugCameraAsset";
import { calculateRealBugPinchZoom, chooseBestRealBugPictureSize, nextRealBugFlashMode, realBugLensLabel, type RealBugFlashMode } from "../services/realBugCameraControls";
import { getRemainingRealBugScans, RealBugScanLimitError, submitRealBugScan } from "../services/realBugScanService";
import { entryByBugId, listBugDexInventory, type BugDexDropResult } from "../services/bugDexService";
import { applyUserPoints } from "../services/userService";
import { fieldJournalBehaviors, fieldJournalHabitats, fieldJournalTags, listFieldJournalEntries, saveFieldJournalEntry, type FieldJournalBehavior, type FieldJournalHabitat, type FieldJournalTag, type FieldMilestoneReward, type WeeklyFieldSpotlightReward } from "../services/fieldJournalService";
import { requestPrivateSightingLocation, type PrivateSightingLocation, type PrivateSightingLocationFailureReason } from "../services/privateSightingLocation";
import { type User } from "../types";

const scanMedallion = require("../../assets/generated/bugbaas-scan-medallion-v1.png");

type Props = {
  user: User;
  onBack: () => void;
  onOpenJournal: () => void;
  onOpenCollection: () => void;
  onRewardDrop: (drop: BugDexDropResult) => void;
  onOpenWorld: () => void;
};

type PreparedPhoto = {
  sourceUri: string;
  previewUri: string;
  width: number;
  height: number;
};

type SubmissionPhoto = {
  dataUrl: string;
  overviewDataUrl?: string;
  reviewThumbnailDataUrl: string;
};

type RealBugPhotoCrop = {
  height: number;
  originX: number;
  originY: number;
  width: number;
};

type Translate = (key: string, params?: Record<string, string | number>) => string;

function localizedIdentification(result: RealBugScanResponse, language: Language): { name: string; fact: string; reason: string } {
  if (language === "en") return { name: result.identification.commonNameEn, fact: result.identification.factEn, reason: result.identification.reasonEn };
  if (language === "fr") return { name: result.identification.commonNameFr, fact: result.identification.factFr, reason: result.identification.reasonFr };
  return { name: result.identification.commonName, fact: result.identification.fact, reason: result.identification.reason };
}

function resultCopy(result: RealBugScanResponse, t: Translate, displayName: string): { eyebrow: string; title: string; body: string } {
  if (result.status === "matched" && result.reward?.granted) {
    return {
      eyebrow: t("bugScan.result.reward.eyebrow"),
      title: t("bugScan.result.reward.title", { name: displayName }),
      body: t("bugScan.result.reward.body")
    };
  }
  if (result.status === "matched") {
    return {
      eyebrow: t("bugScan.result.matched.eyebrow"),
      title: displayName,
      body: t("bugScan.result.matched.body")
    };
  }
  if (result.status === "already_spotted") {
    return {
      eyebrow: t("bugScan.result.seen.eyebrow"),
      title: displayName,
      body: t("bugScan.result.seen.body")
    };
  }
  if (result.status === "not_in_catalog") {
    return {
      eyebrow: t("bugScan.result.newSpecies.eyebrow"),
      title: displayName,
      body: t("bugScan.result.newSpecies.body")
    };
  }
  if (result.status === "pending_review") {
    return {
      eyebrow: t("bugScan.result.uncertain.eyebrow"),
      title: displayName,
      body: t("bugScan.result.uncertain.body")
    };
  }
  if (result.status === "rejected_authenticity") {
    return {
      eyebrow: t("bugScan.result.authenticity.eyebrow"),
      title: t("bugScan.result.authenticity.title"),
      body: t("bugScan.result.authenticity.body")
    };
  }
  if (result.status === "rejected_quality") {
    return {
      eyebrow: t("bugScan.result.quality.eyebrow"),
      title: displayName,
      body: t("bugScan.result.quality.body")
    };
  }
  return {
    eyebrow: t("bugScan.result.noBug.eyebrow"),
    title: displayName,
    body: t("bugScan.result.noBug.body")
  };
}

export function RealBugScanScreen({ user, onBack, onOpenCollection, onOpenJournal, onOpenWorld, onRewardDrop }: Props) {
  const { language, t } = useI18n();
  const layout = useResponsiveLayout();
  const densePhone = !layout.isTablet;
  const cameraRef = useRef<CameraView | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(0);
  const cameraConfiguredRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(0);
  const [cameraPictureSize, setCameraPictureSize] = useState<string | undefined>();
  const [cameraFlash, setCameraFlash] = useState<RealBugFlashMode>("auto");
  const [cameraLenses, setCameraLenses] = useState<string[]>([]);
  const [cameraLens, setCameraLens] = useState<string | undefined>();
  const [cameraTorch, setCameraTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [result, setResult] = useState<RealBugScanResponse | null>(null);
  const [remainingScans, setRemainingScans] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [habitat, setHabitat] = useState<FieldJournalHabitat | null>(null);
  const [behavior, setBehavior] = useState<FieldJournalBehavior | null>(null);
  const [journalTags, setJournalTags] = useState<FieldJournalTag[]>([]);
  const [journalSaved, setJournalSaved] = useState(false);
  const [journalSaving, setJournalSaving] = useState(false);
  const [journalLocationBusy, setJournalLocationBusy] = useState(false);
  const [journalLocation, setJournalLocation] = useState<PrivateSightingLocation | null>(null);
  const [journalLocationError, setJournalLocationError] = useState("");
  const [journalLocationIssue, setJournalLocationIssue] = useState<PrivateSightingLocationFailureReason | null>(null);
  const [pendingScanDrop, setPendingScanDrop] = useState<BugDexDropResult | null>(null);
  const [contestReviewThumbnail, setContestReviewThumbnail] = useState("");
  const [journalMilestones, setJournalMilestones] = useState<FieldMilestoneReward[]>([]);
  const [weeklySpotlightReward, setWeeklySpotlightReward] = useState<WeeklyFieldSpotlightReward>();
  const [fieldPhotoStamps, setFieldPhotoStamps] = useState<FieldPhotoStamp[]>([]);
  const [professorQuizSelection, setProfessorQuizSelection] = useState<string | null>(null);
  const [professorQuizReward, setProfessorQuizReward] = useState(0);
  const [professorQuizRewardClaimed, setProfessorQuizRewardClaimed] = useState(false);
  const [professorQuizAwarding, setProfessorQuizAwarding] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const stampReveal = useRef(new Animated.Value(0)).current;
  const stageReveal = useRef(new Animated.Value(0)).current;
  const scannerSweep = useRef(new Animated.Value(0)).current;
  const journalSavingRef = useRef(false);

  useEffect(() => {
    let active = true;
    getRemainingRealBugScans(user)
      .then((remaining) => {
        if (active) setRemainingScans(remaining);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    ImagePicker.getPendingResultAsync()
      .then((pending) => {
        if (!active || !pending || !("assets" in pending)) return;
        const asset = pending.assets?.[0];
        if (asset) void prepareAsset(asset);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function prepareSubmissionPhoto(sourceUri: string, width: number, height: number, crop?: RealBugPhotoCrop): Promise<SubmissionPhoto> {
    const targetWidth = crop?.width ?? width;
    const targetHeight = crop?.height ?? height;
    const uploadThreshold = crop ? croppedPhotoThresholdBytes : undefined;
    const manipulatePhoto = (plan: RealBugPhotoPlan) => ImageManipulator.manipulateAsync(sourceUri, [
      ...(crop ? [{ crop }] : []),
      ...plan.resize
    ], {
      base64: true,
      compress: plan.quality,
      format: ImageManipulator.SaveFormat.JPEG
    });
    const primary = await manipulatePhoto(primaryRealBugPhotoPlan(targetWidth, targetHeight));
    if (!primary.base64) throw new Error(t("bugScan.error.prepare"));

    let prepared = shouldFallbackRealBugPhoto(primary.base64, uploadThreshold)
      ? await manipulatePhoto(fallbackRealBugPhotoPlan(targetWidth, targetHeight))
      : primary;
    if (!prepared.base64) throw new Error(t("bugScan.error.prepare"));
    if (shouldFallbackRealBugPhoto(prepared.base64, uploadThreshold)) {
      prepared = await manipulatePhoto(emergencyRealBugPhotoPlan(targetWidth, targetHeight));
    }
    if (!prepared.base64) throw new Error(t("bugScan.error.prepare"));

    const overviewPlan = crop ? overviewRealBugPhotoPlan(width, height) : null;
    const overview = overviewPlan
      ? await ImageManipulator.manipulateAsync(sourceUri, overviewPlan.resize, {
        base64: true,
        compress: overviewPlan.quality,
        format: ImageManipulator.SaveFormat.JPEG
      })
      : null;
    if (crop && !overview?.base64) throw new Error(t("bugScan.error.prepare"));

    const thumbnailPlan = reviewRealBugThumbnailPlan(prepared.width ?? 0, prepared.height ?? 0);
    const thumbnail = await ImageManipulator.manipulateAsync(prepared.uri, thumbnailPlan.resize, {
      base64: true,
      compress: thumbnailPlan.quality,
      format: ImageManipulator.SaveFormat.JPEG
    });
    if (!thumbnail.base64) throw new Error(t("bugScan.error.thumbnail"));
    return {
      dataUrl: `data:image/jpeg;base64,${prepared.base64}`,
      ...(overview?.base64 ? { overviewDataUrl: `data:image/jpeg;base64,${overview.base64}` } : {}),
      reviewThumbnailDataUrl: `data:image/jpeg;base64,${thumbnail.base64}`
    };
  }

  async function prepareAsset(asset: RealBugPhotoAsset | ImagePicker.ImagePickerAsset) {
    setError("");
    setResult(null);
    try {
      const normalized = normalizeRealBugCameraAsset(asset);
      setPhotoZoom(1);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhoto({
        sourceUri: normalized.uri,
        previewUri: normalized.uri,
        width: normalized.width,
        height: normalized.height
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.openPhoto"));
    }
  }

  async function openCamera() {
    setError("");
    if (remainingScans <= 0) {
      setError(t("bugScan.error.limit"));
      return;
    }
    try {
      if (Platform.OS !== "web") {
        const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
        if (!permission.granted) {
          setError(t("bugScan.error.cameraPermission"));
          return;
        }
      }

      setCapturing(true);
      const picked = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        exif: false,
        mediaTypes: ["images"],
        quality: 1
      });
      if (!picked.canceled && picked.assets[0]) await prepareAsset(picked.assets[0]);
    } catch (nextError) {
      if (Platform.OS === "web") {
        setError(nextError instanceof Error ? nextError.message : t("bugScan.error.cameraOpen"));
        return;
      }

      // Some Android devices do not expose a compatible system camera activity.
      // Keep the in-app camera as a full-screen fallback instead of blocking BugScan.
      cameraConfiguredRef.current = false;
      setCameraPictureSize(undefined);
      setCameraFlash("auto");
      setCameraLenses([]);
      setCameraLens(undefined);
      setCameraTorch(false);
      setCameraZoom(0);
      setCameraReady(false);
      setCameraOpen(true);
    } finally {
      setCapturing(false);
    }
  }

  function touchDistance(event: GestureResponderEvent): number | null {
    const touches = event.nativeEvent.touches;
    if (touches.length < 2) return null;
    return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
  }

  function startCameraPinch(event: GestureResponderEvent) {
    const distance = touchDistance(event);
    if (distance === null) return;
    pinchStartDistanceRef.current = distance;
    pinchStartZoomRef.current = cameraZoom;
  }

  function moveCameraPinch(event: GestureResponderEvent) {
    const distance = touchDistance(event);
    const startDistance = pinchStartDistanceRef.current;
    if (distance === null || startDistance === null) return;
    setCameraZoom(calculateRealBugPinchZoom(pinchStartZoomRef.current, startDistance, distance));
  }

  function endCameraPinch() {
    pinchStartDistanceRef.current = null;
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraReady(false);
    setCameraPictureSize(undefined);
    setCameraTorch(false);
    setCameraZoom(0);
    setCameraLenses([]);
    setCameraLens(undefined);
  }

  function cycleCameraLens() {
    if (cameraLenses.length < 2) return;
    const currentIndex = cameraLens ? cameraLenses.indexOf(cameraLens) : -1;
    setCameraLens(cameraLenses[(currentIndex + 1 + cameraLenses.length) % cameraLenses.length]);
    setCameraZoom(0);
  }

  async function handleCameraReady() {
    if (!cameraRef.current) return;
    if (cameraConfiguredRef.current) {
      setCameraReady(true);
      return;
    }

    cameraConfiguredRef.current = true;
    try {
      const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
      setCameraPictureSize(chooseBestRealBugPictureSize(sizes));
    } catch {
      setCameraPictureSize(undefined);
    }
    if (Platform.OS === "ios") {
      try {
        const lenses = await cameraRef.current.getAvailableLensesAsync();
        setCameraLenses(lenses);
        setCameraLens((current) => current && lenses.includes(current)
          ? current
          : lenses.find((lens) => lens.toLowerCase().includes("wideangle") && !lens.toLowerCase().includes("ultrawide")) ?? lenses[0]);
      } catch {
        setCameraLenses([]);
        setCameraLens(undefined);
      }
    }
    setCameraReady(true);
  }

  async function capturePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setError("");
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: false });
      if (!captured) throw new Error(t("bugScan.error.noCapture"));
      closeCamera();
      await prepareAsset(normalizeRealBugCameraAsset(captured));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.capture"));
    } finally {
      setCapturing(false);
    }
  }

  async function selectPhoto() {
    setError("");
    if (remainingScans <= 0) {
      setError(t("bugScan.error.limit"));
      return;
    }
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1
      });
      if (!picked.canceled && picked.assets[0]) await prepareAsset(picked.assets[0]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.openPhoto"));
    }
  }

  async function analyzePhoto() {
    if (!photo || busy) return;
    setBusy(true);
    setError("");
    try {
      let sourceUri = photo.sourceUri;
      let crop: RealBugPhotoCrop | undefined;
      if (photoZoom > 1 && photo.width > 0 && photo.height > 0) {
        const cropWidth = Math.max(1, Math.round(photo.width / photoZoom));
        const cropHeight = Math.max(1, Math.round(photo.height / photoZoom));
        const maxOriginX = photo.width - cropWidth;
        const maxOriginY = photo.height - cropHeight;
        const originX = Math.round(((photoOffsetX + 1) / 2) * maxOriginX);
        const originY = Math.round(((photoOffsetY + 1) / 2) * maxOriginY);
        crop = { originX, originY, width: cropWidth, height: cropHeight };
      }
      const prepared = await prepareSubmissionPhoto(sourceUri, photo.width, photo.height, crop);
      const submission = await submitRealBugScan(user, prepared.dataUrl, prepared.reviewThumbnailDataUrl, prepared.overviewDataUrl);
      const nextResult = submission.result;
      setResult(nextResult);
      setJournalSaved(false);
      setJournalSaving(false);
      journalSavingRef.current = false;
      setHabitat(null);
      setBehavior(null);
      setJournalTags([]);
      setJournalLocation(null);
      setJournalLocationError("");
      setJournalLocationIssue(null);
      setPendingScanDrop(submission.drop ?? null);
      setContestReviewThumbnail(prepared.reviewThumbnailDataUrl);
      setWeeklySpotlightReward(undefined);
      setProfessorQuizSelection(null);
      setProfessorQuizReward(0);
      setProfessorQuizRewardClaimed(false);
      setRemainingScans(nextResult.remainingScans);
      if (nextResult.receipt && (nextResult.status === "matched" || nextResult.status === "not_in_catalog")) {
        void prepareJournalLocation();
      } else {
        setPendingScanDrop(null);
        if (submission.drop) onRewardDrop(submission.drop);
      }
    } catch (nextError) {
      if (nextError instanceof RealBugScanLimitError) setRemainingScans(0);
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.failed"));
    } finally {
      setBusy(false);
    }
  }

  function resetScan() {
    closeCamera();
    setPhotoZoom(1);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhoto(null);
    setResult(null);
    setJournalSaved(false);
    setJournalSaving(false);
    journalSavingRef.current = false;
    setHabitat(null);
    setBehavior(null);
    setJournalTags([]);
    setJournalLocation(null);
    setJournalLocationError("");
    setJournalLocationIssue(null);
    setPendingScanDrop(null);
    setContestReviewThumbnail("");
    setJournalMilestones([]);
    setWeeklySpotlightReward(undefined);
    setFieldPhotoStamps([]);
    setProfessorQuizSelection(null);
    setProfessorQuizReward(0);
    setProfessorQuizRewardClaimed(false);
    setProfessorQuizAwarding(false);
    setError("");
  }

  const localized = result ? localizedIdentification(result, language) : null;
  const copy = result && localized ? resultCopy(result, t, localized.name) : null;
  const matchedBugId = result?.reward?.bugId ?? result?.identification.bugId ?? undefined;
  const canJournal = Boolean(result?.receipt) && (result?.status === "matched" || result?.status === "not_in_catalog");
  const journalRequired = canJournal && !journalSaved;
  const professor = useMemo(
    () => result ? getBugProfessorBrief(result, language) : null,
    [language, result]
  );

  useEffect(() => {
    if (!result || !canJournal || journalSaved || journalSaving || journalSavingRef.current || journalLocationError || !journalLocation || !habitat || !behavior) return;
    void saveAutomaticJournal(result, pendingScanDrop, habitat, behavior, journalLocation, contestReviewThumbnail, journalTags);
  }, [behavior, canJournal, contestReviewThumbnail, habitat, journalLocation, journalLocationError, journalSaved, journalSaving, journalTags, pendingScanDrop, result]);
  const scanStage = deriveRealBugScanStage({
    busy,
    cameraOpen,
    hasPhoto: Boolean(photo),
    hasResult: Boolean(result),
    journalSaved
  });

  useEffect(() => {
    stageReveal.setValue(0);
    scannerSweep.setValue(0);
    const reveal = Animated.spring(stageReveal, {
      friction: 7,
      tension: 72,
      toValue: 1,
      useNativeDriver: nativeDriver
    });
    const sweep = Animated.sequence([
      Animated.delay(120),
      Animated.timing(scannerSweep, {
        duration: 720,
        toValue: 1,
        useNativeDriver: nativeDriver
      })
    ]);
    Animated.parallel([reveal, sweep]).start();
    return () => {
      reveal.stop();
      sweep.stop();
    };
  }, [cameraOpen, scanStage, scannerSweep, stageReveal]);

  const stageAnimatedStyle = {
    opacity: stageReveal,
    transform: [
      {
        translateY: stageReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0]
        })
      }
    ]
  };
  const scannerSweepStyle = {
    opacity: scannerSweep.interpolate({
      inputRange: [0, 0.12, 0.88, 1],
      outputRange: [0, 0.92, 0.92, 0]
    }),
    transform: [
      {
        translateY: scannerSweep.interpolate({
          inputRange: [0, 1],
          outputRange: [-92, 92]
        })
      }
    ]
  };

  async function answerProfessorQuiz(option: string) {
    if (!professor || professorQuizSelection || professorQuizAwarding) return;
    setProfessorQuizSelection(option);
    const isCorrect = option === professor.quizAnswer;
    if (!isCorrect || professorQuizRewardClaimed) {
      setProfessorQuizReward(0);
      return;
    }

    setProfessorQuizAwarding(true);
    try {
      const updated = await applyUserPoints(user.uid, professor.quizRewardPoints, 0);
      if (updated) {
        setProfessorQuizReward(professor.quizRewardPoints);
        setProfessorQuizRewardClaimed(true);
      }
    } catch {
      setProfessorQuizReward(0);
    } finally {
      setProfessorQuizAwarding(false);
    }
  }

  async function applySavedJournal(saved: Awaited<ReturnType<typeof saveFieldJournalEntry>>) {
    setJournalMilestones(saved.milestones);
    setWeeklySpotlightReward(saved.weeklySpotlight);
    const entries = await listFieldJournalEntries(user).catch(() => [saved.entry]);
    const stamps = getFieldPhotoStamps(saved.entry, entries);
    setFieldPhotoStamps(stamps);
    if (stamps.length > 0) {
      stampReveal.setValue(0);
      Animated.spring(stampReveal, { toValue: 1, friction: 6, tension: 65, useNativeDriver: nativeDriver }).start();
    }
    setJournalSaved(true);
    setJournalLocationError("");
  }

  async function showWeeklySpotlightDiscovery(weekly: WeeklyFieldSpotlightReward | undefined) {
    if (!weekly?.claimed || !weekly.rewardBugId) return;
    const entry = entryByBugId(weekly.rewardBugId);
    if (!entry) return;
    const items = await listBugDexInventory(user, { force: true }).catch(() => []);
    const item = items.find((candidate) => candidate.bugId === weekly.rewardBugId);
    if (!item) return;
    onRewardDrop({
      rewardType: "bug",
      entry,
      item,
      isNew: weekly.isNew ?? item.count === 1,
      source: "weekly_field_spotlight"
    });
  }

  async function prepareJournalLocation() {
    if (journalLocationBusy || journalLocation) return;
    setJournalLocationBusy(true);
    setJournalLocationError("");
    setJournalLocationIssue(null);
    const locationResult = await requestPrivateSightingLocation();
    if (!locationResult.available) {
      const message = locationResult.reason === "denied"
        ? "Sta locatie toe om deze veldnotitie automatisch op je kaart te zetten."
        : locationResult.reason === "services_disabled"
          ? "Zet Locatie/GPS op je telefoon aan en probeer het daarna opnieuw."
          : locationResult.reason === "precise_required"
            ? "Zet Precieze locatie aan bij de app-instellingen van BugBaas en probeer het opnieuw."
          : "De telefoon heeft nog geen nauwkeurige locatie. Ga even bij een raam of naar buiten en probeer opnieuw.";
      setJournalLocationIssue(locationResult.reason);
      setJournalLocationError(message);
      setJournalLocationBusy(false);
      return;
    }
    setJournalLocationIssue(null);
    setJournalLocation(locationResult.location);
    setJournalLocationBusy(false);
  }

  function openPreciseLocationSettings() {
    setJournalLocationIssue("unavailable");
    void Linking.openSettings();
  }

  function toggleJournalTag(tag: FieldJournalTag) {
    if (journalSaving || journalSaved) return;
    setJournalTags((current) => current.includes(tag)
      ? current.filter((item) => item !== tag)
      : current.length < 3 ? [...current, tag] : current);
  }

  async function saveAutomaticJournal(nextResult: RealBugScanResponse, drop: BugDexDropResult | null, selectedHabitat: FieldJournalHabitat, selectedBehavior: FieldJournalBehavior, location: PrivateSightingLocation, reviewThumbnailDataUrl: string, selectedTags: FieldJournalTag[]) {
    if (journalSavingRef.current || journalSaved) return;
    journalSavingRef.current = true;
    setJournalSaving(true);
    try {
      const saved = await saveFieldJournalEntry(user, nextResult, selectedHabitat, selectedBehavior, location, reviewThumbnailDataUrl, selectedTags);
      await applySavedJournal(saved);
      setPendingScanDrop(null);
      if (drop) onRewardDrop(drop);
      await showWeeklySpotlightDiscovery(saved.weeklySpotlight);
    } catch (nextError) {
      setJournalLocationError(nextError instanceof Error ? nextError.message : "Veldnotitie opslaan mislukt. Kies opnieuw of probeer je locatie opnieuw.");
    } finally {
      journalSavingRef.current = false;
      setJournalSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: layout.tier === "wide" ? 1080 : layout.contentMaxWidth,
          paddingBottom: layout.bottomNavHeight + layout.bottomNavInset + (layout.isTablet ? 24 : 72),
          paddingHorizontal: layout.gutter,
          paddingTop: layout.headerTop
        }
      ]}
      scrollEnabled={!cameraOpen || scanStageAllowsPageScroll(scanStage)}
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" disabled={journalRequired} onPress={onBack} style={({ pressed }) => [styles.backButton, journalRequired && styles.disabledButton, pressed && styles.pressed]}>
          <GameUiIcon name="back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>BUGSCAN</Text>
          <Text style={styles.title}>{t("bugScan.title")}</Text>
        </View>
        <View style={[styles.counter, remainingScans === 0 && styles.counterEmpty]}>
          <Text style={styles.counterValue}>{remainingScans}/3</Text>
          <Text style={styles.counterLabel}>{t("bugScan.today")}</Text>
        </View>
      </View>
      <ScanStageHeader stage={scanStage} />

      <Modal animationType="fade" onRequestClose={closeCamera} presentationStyle="fullScreen" visible={cameraOpen}>
        <View style={[styles.cameraModal, { paddingBottom: Math.max(14, layout.bottomNavInset), paddingTop: Math.max(14, layout.headerTop) }]}>
          <View style={styles.cameraModalTopBar}>
            <Pressable accessibilityLabel={t("bugScan.camera.close")} accessibilityRole="button" disabled={capturing} onPress={closeCamera} style={({ pressed }) => [styles.cameraTopButton, pressed && styles.pressed]}>
              <Text style={styles.cameraTopButtonText}>×</Text>
            </Pressable>
            <View style={styles.cameraModalHeading}>
              <Text style={styles.cameraModalKicker}>BUGSCAN CAMERA</Text>
              <Text style={styles.cameraModalTitle}>{t("bugScan.camera.fullscreenTitle")}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("bugScan.camera.flash")}
              accessibilityRole="button"
              disabled={capturing}
              onPress={() => {
                setCameraTorch(false);
                setCameraFlash((current) => nextRealBugFlashMode(current));
              }}
              style={({ pressed }) => [styles.cameraModeButton, cameraFlash !== "off" && styles.cameraModeButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.cameraModeButtonLabel}>{t("bugScan.camera.flash")}</Text>
              <Text style={styles.cameraModeButtonValue}>{t(`bugScan.camera.flash.${cameraFlash}`)}</Text>
            </Pressable>
          </View>
          <View
            onTouchEnd={endCameraPinch}
            onTouchMove={moveCameraPinch}
            onTouchStart={startCameraPinch}
            style={styles.cameraViewport}
          >
            <CameraView
              active={cameraOpen}
              ref={cameraRef}
              autofocus="off"
              enableTorch={cameraTorch}
              facing="back"
              flash={cameraFlash}
              mode="picture"
              onAvailableLensesChanged={({ lenses }) => {
                setCameraLenses(lenses);
                setCameraLens((current) => current && lenses.includes(current)
                  ? current
                  : lenses.find((lens) => lens.toLowerCase().includes("wideangle") && !lens.toLowerCase().includes("ultrawide")) ?? lenses[0]);
              }}
              onCameraReady={() => void handleCameraReady()}
              onMountError={(event) => {
                closeCamera();
                setError(event.message || t("bugScan.error.cameraStart"));
              }}
              pictureSize={cameraPictureSize}
              ratio="4:3"
              responsiveOrientationWhenOrientationLocked
              selectedLens={cameraLens}
              style={styles.cameraView}
              zoom={cameraZoom}
            />
            <View pointerEvents="none" style={styles.cameraGuide}>
              <View style={styles.cameraGuideBox} />
              <Animated.View style={[styles.cameraSweep, scannerSweepStyle]} />
              <Text style={styles.cameraGuideText}>{t("bugScan.camera.place")}</Text>
              <Text style={styles.cameraZoomHint}>{t("bugScan.camera.focusHint")}</Text>
            </View>
            <View style={styles.cameraSideControls}>
              <Pressable
                accessibilityLabel={t("bugScan.camera.light")}
                accessibilityRole="button"
                onPress={() => {
                  setCameraFlash("off");
                  setCameraTorch((current) => !current);
                }}
                style={({ pressed }) => [styles.cameraSideButton, cameraTorch && styles.cameraSideButtonActive, pressed && styles.pressed]}
              >
                <Text style={styles.cameraSideButtonIcon}>☀</Text>
                <Text style={styles.cameraSideButtonText}>{t("bugScan.camera.light")}</Text>
              </Pressable>
              {cameraLenses.length > 1 ? (
                <Pressable accessibilityRole="button" onPress={cycleCameraLens} style={({ pressed }) => [styles.cameraSideButton, pressed && styles.pressed]}>
                  <Text style={styles.cameraSideButtonIcon}>{realBugLensLabel(cameraLens ?? cameraLenses[0])}</Text>
                  <Text style={styles.cameraSideButtonText}>{t("bugScan.camera.lens")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <View style={styles.cameraBottomBar}>
            <Pressable accessibilityLabel={t("bugScan.chooseGallery")} accessibilityRole="button" disabled={capturing} onPress={() => { closeCamera(); void selectPhoto(); }} style={({ pressed }) => [styles.cameraBottomAction, pressed && styles.pressed]}>
              <GameUiIcon name="gallery" size={25} />
              <Text style={styles.cameraBottomActionText}>{t("bugScan.camera.galleryShort")}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t("bugScan.camera.take")} accessibilityRole="button" disabled={!cameraReady || capturing} onPress={() => void capturePhoto()} style={({ pressed }) => [styles.cameraShutterOuter, (!cameraReady || capturing) && styles.disabledButton, pressed && styles.cameraShutterPressed]}>
              <View style={styles.cameraShutterInner}>{capturing ? <ActivityIndicator color="#08364a" /> : null}</View>
            </Pressable>
            <View style={styles.cameraQualityBadge}>
              <Text style={styles.cameraQualityValue}>MAX</Text>
              <Text numberOfLines={1} style={styles.cameraQualityLabel}>{cameraPictureSize ? cameraPictureSize.replace("x", "×") : "4:3"}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {!photo && !result && !cameraOpen && (
        <>
        <Animated.View style={[styles.captureWorkspace, layout.isTablet && styles.captureWorkspaceTablet, stageAnimatedStyle]}>
          <View style={[
            styles.heroCard,
            densePhone && styles.heroCardCompact,
            layout.isTablet && styles.heroCardTablet
          ]}>
            <View pointerEvents="none" style={styles.heroGlow} />
            <View pointerEvents="none" style={styles.heroNatureLayer}>
              <View style={[styles.heroLeaf, styles.heroLeafLeftOne]} />
              <View style={[styles.heroLeaf, styles.heroLeafLeftTwo]} />
              <View style={[styles.heroLeaf, styles.heroLeafLeftThree]} />
              <View style={[styles.heroLeaf, styles.heroLeafRightOne]} />
              <View style={[styles.heroLeaf, styles.heroLeafRightTwo]} />
              <View style={[styles.heroLeaf, styles.heroLeafRightThree]} />
            </View>
            <View pointerEvents="none" style={styles.heroGroundGlow} />
            <View style={[styles.heroVisual, densePhone && styles.heroVisualCompact]}>
              <View pointerEvents="none" style={styles.heroBugGlow} />
              <Animated.Image
                resizeMode="contain"
                source={scanMedallion}
                style={[
                  styles.scanMedallion,
                  densePhone && styles.scanMedallionCompact,
                  {
                    transform: [
                      {
                        scale: stageReveal.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.88, 1]
                        })
                      }
                    ]
                  }
                ]}
              />
              <View pointerEvents="none" style={styles.scanRing} />
              <View pointerEvents="none" style={[styles.scanCorner, styles.scanCornerTopLeft]} />
              <View pointerEvents="none" style={[styles.scanCorner, styles.scanCornerTopRight]} />
              <View pointerEvents="none" style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
              <View pointerEvents="none" style={[styles.scanCorner, styles.scanCornerBottomRight]} />
              <View style={styles.heroTipBadge}>
                <GameUiIcon name="location" size={18} />
              <Text style={styles.heroTipText}>{t("bugScan.hero.tip")}</Text>
              </View>
            </View>
            <Text style={[styles.heroTitle, densePhone && styles.heroTitlePhone]}>{t("bugScan.hero.title")}</Text>
            <Text style={[styles.heroBody, densePhone && styles.heroBodyPhone]}>{t("bugScan.hero.body")}</Text>
          </View>

          <View style={[styles.captureActionPanel, densePhone && styles.captureActionPanelPhone, layout.isTablet && styles.captureActionPanelTablet]}>
            <View>
              <Text style={styles.actionKicker}>{t("bugScan.action.ready")}</Text>
              {layout.isTablet ? <Text style={styles.actionTitle}>{t("bugScan.hero.title")}</Text> : null}
              <Text style={styles.actionBody}>{remainingScans > 0 ? t("bugScan.remainingToday", { count: remainingScans }) : t("bugScan.limitReached")}</Text>
            </View>
            <View>
              <Pressable accessibilityRole="button" disabled={busy || capturing || remainingScans <= 0} onPress={() => void openCamera()} style={({ pressed }) => [styles.primaryButton, styles.capturePrimaryButton, densePhone && styles.capturePrimaryButtonPhone, (busy || capturing || remainingScans <= 0) && styles.disabledButton, pressed && styles.pressed]}>
                <View style={styles.primaryButtonIconCircle}><GameUiIcon name="scan" size={28} /></View>
                {capturing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{remainingScans > 0 ? t("bugScan.openCamera") : t("bugScan.limitReached")}</Text>}
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy || remainingScans <= 0} onPress={() => void selectPhoto()} style={({ pressed }) => [styles.secondaryButton, styles.galleryButton, densePhone && styles.galleryButtonPhone, (busy || remainingScans <= 0) && styles.disabledSecondaryButton, pressed && styles.pressed]}>
                <GameUiIcon name="gallery" size={26} />
                <Text style={styles.secondaryButtonText}>{t("bugScan.chooseGallery")}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
        <WeeklyScanContestCard onRewardDrop={onRewardDrop} user={user} />
        </>
      )}

      {photo && !result && !busy && (
        <Animated.View style={[styles.previewCard, densePhone && styles.previewCardPhone, stageAnimatedStyle, layout.isTablet && styles.stageCardTablet]}>
          <View style={[styles.previewFrame, densePhone && styles.previewFramePhone, layout.isTablet && styles.previewFrameTablet]}>
            <Image
              resizeMode="contain"
              source={{ uri: photo.previewUri }}
              style={[
                styles.previewImage,
                {
                  transform: [
                    { scale: photoZoom },
                    { translateX: photoOffsetX * 42 },
                    { translateY: photoOffsetY * 42 }
                  ]
                }
              ]}
            />
            <View pointerEvents="none" style={styles.cornerTopLeft} />
            <View pointerEvents="none" style={styles.cornerTopRight} />
            <View pointerEvents="none" style={styles.cornerBottomLeft} />
            <View pointerEvents="none" style={styles.cornerBottomRight} />
            <Animated.View pointerEvents="none" style={[styles.previewSweep, scannerSweepStyle]} />
          </View>
          <Text style={[styles.previewTitle, densePhone && styles.previewTitlePhone]}>{t("bugScan.preview.title")}</Text>
          <Text style={[styles.previewBody, densePhone && styles.previewBodyPhone]}>{t("bugScan.preview.body")}</Text>
          <View style={[styles.photoEditPanel, densePhone && styles.photoEditPanelPhone]}>
            <Text style={styles.photoEditLabel}>{t("bugScan.preview.edit")}</Text>
            <View style={[styles.photoEditRow, densePhone && styles.photoEditRowPhone]}>
              <Pressable accessibilityRole="button" onPress={() => setPhotoZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))} style={[styles.photoEditButton, densePhone && styles.photoEditButtonPhone]}><Text style={styles.photoEditButtonText}>−</Text></Pressable>
              <Text style={[styles.photoEditValue, densePhone && styles.photoEditValuePhone]}>{photoZoom.toFixed(2)}×</Text>
              <Pressable accessibilityRole="button" onPress={() => setPhotoZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))} style={[styles.photoEditButton, densePhone && styles.photoEditButtonPhone]}><Text style={styles.photoEditButtonText}>+</Text></Pressable>
            </View>
            {photoZoom > 1 ? (
              <View style={[styles.photoNudgeGrid, densePhone && styles.photoNudgeGridPhone]}>
                <Pressable accessibilityRole="button" onPress={() => setPhotoOffsetY((current) => Math.max(-1, Number((current - 0.2).toFixed(2))))} style={[styles.photoNudgeButton, densePhone && styles.photoNudgeButtonPhone]}><Text style={styles.photoNudgeText}>↑</Text></Pressable>
                <View style={[styles.photoNudgeRow, densePhone && styles.photoNudgeRowPhone]}>
                  <Pressable accessibilityRole="button" onPress={() => setPhotoOffsetX((current) => Math.max(-1, Number((current - 0.2).toFixed(2))))} style={[styles.photoNudgeButton, densePhone && styles.photoNudgeButtonPhone]}><Text style={styles.photoNudgeText}>←</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => { setPhotoZoom(1); setPhotoOffsetX(0); setPhotoOffsetY(0); }} style={[styles.photoResetButton, densePhone && styles.photoResetButtonPhone]}><Text style={styles.photoResetText}>{t("bugScan.preview.reset")}</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setPhotoOffsetX((current) => Math.min(1, Number((current + 0.2).toFixed(2))))} style={[styles.photoNudgeButton, densePhone && styles.photoNudgeButtonPhone]}><Text style={styles.photoNudgeText}>→</Text></Pressable>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setPhotoOffsetY((current) => Math.min(1, Number((current + 0.2).toFixed(2))))} style={[styles.photoNudgeButton, densePhone && styles.photoNudgeButtonPhone]}><Text style={styles.photoNudgeText}>↓</Text></Pressable>
              </View>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void analyzePhoto()} style={({ pressed }) => [styles.primaryButton, densePhone && styles.reviewPrimaryButtonPhone, busy && styles.disabledButton, pressed && styles.pressed]}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{t("bugScan.analyze")}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={resetScan} style={({ pressed }) => [styles.secondaryButton, densePhone && styles.reviewSecondaryButtonPhone, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>{t("bugScan.newPhoto")}</Text>
          </Pressable>
        </Animated.View>
      )}

      {scanStage === "identification" ? <ScanIdentificationStage /> : null}

      {result && copy && (
        <Animated.View style={[styles.resultCard, stageAnimatedStyle, layout.isTablet && styles.resultCardTablet]}>
          <View style={styles.rewardGlow}>
            {matchedBugId ? <BugArtImage bugId={matchedBugId} size={126} /> : <Text style={styles.resultFallbackIcon}>?</Text>}
          </View>
          <Text style={styles.resultEyebrow}>{copy.eyebrow}</Text>
          <Text style={styles.resultTitle}>{copy.title}</Text>
          <Text style={styles.resultBody}>{copy.body}</Text>
          <View style={styles.identificationCard}>
            <View style={styles.identificationHeader}>
              <Text style={styles.identificationLabel}>{t("bugScan.identification")}</Text>
              <Text style={styles.confidence}>{Math.round(result.identification.confidence * 100)}%</Text>
            </View>
            <Text style={styles.identificationName}>{localized?.name}</Text>
            {result.identification.scientificName ? <Text style={styles.scientificName}>{result.identification.scientificName}</Text> : null}
            <Text style={styles.reason}>{localized?.reason}</Text>
            {localized?.fact && professorQuizSelection ? <Text style={styles.reason}>{t("bugScan.fact", { fact: localized.fact })}</Text> : null}
          </View>
          {professor && <View style={styles.professorCard}>
            <Text style={styles.professorTitle}>{professor.title}</Text>
            <Text style={styles.professorConfidence}>{professor.confidence}</Text>
              <View style={styles.professorQuiz}>
                <View style={styles.professorQuizMetaRow}>
                  <Text style={styles.professorQuizDifficulty}>{professor.quizCategory.toUpperCase()} · {professor.quizDifficulty.toUpperCase()}</Text>
                  <Text style={styles.professorQuizRewardHint}>+{professor.quizRewardPoints} XP</Text>
                </View>
                <Text style={styles.professorQuizQuestion}>{professor.quizQuestion}</Text>
                <View style={styles.professorQuizOptions}>
                  {professor.quizOptions.map((option) => {
                    const answered = professorQuizSelection !== null;
                    const isCorrect = option === professor.quizAnswer;
                    const isSelected = option === professorQuizSelection;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        disabled={answered || professorQuizAwarding}
                        onPress={() => void answerProfessorQuiz(option)}
                        style={[
                          styles.professorQuizOption,
                          answered && isCorrect && styles.professorQuizOptionCorrect,
                          answered && isSelected && !isCorrect && styles.professorQuizOptionWrong
                        ]}
                      >
                        <Text style={styles.professorQuizOptionText}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {professorQuizSelection ? (
                  <View style={styles.professorQuizResult}>
                    <Text style={styles.professorQuizResultTitle}>
                      {professorQuizSelection === professor.quizAnswer ? professor.correctLabel : professor.wrongLabel}
                    </Text>
                    <Text style={styles.professorQuizExplanation}>{professor.quizExplanation}</Text>
                    {professorQuizReward > 0 ? <Text style={styles.professorQuizReward}>+{professorQuizReward} {professor.rewardLabel}</Text> : null}
                    {professorQuizSelection !== professor.quizAnswer ? <Text style={styles.professorQuizAnswer}>{professor.quizAnswer}</Text> : null}
                  </View>
                ) : null}
              </View>
          </View>}
          {canJournal && <View style={styles.journalCard}>
            <Text style={styles.journalTitle}>{journalSaved ? "Veldnotitie automatisch opgeslagen" : journalSaving ? "Veldnotitie wordt opgeslagen..." : "Maak je veldnotitie af"}</Text>
            <Text style={styles.journalBody}>{journalSaved ? "Je bugfoto, tijd en privélocatie staan nu op je kaart en tellen meteen mee voor je weekmissie." : "Kies 1 habitat en 1 gedrag. Zodra je telefoonlocatie klaar is, slaat BugBaas de notitie vanzelf op. Je hoeft niet op opslaan te tikken."}</Text>
            <Text style={styles.journalLabel}>Habitat</Text><View style={styles.journalChoices}>{fieldJournalHabitats.map((item) => <Pressable disabled={journalSaving || journalSaved} key={item} onPress={() => { setJournalLocationError(""); setHabitat(item); }} style={[styles.journalChoice, habitat === item && styles.journalChoiceActive]}><Text style={[styles.journalChoiceText, habitat === item && styles.journalChoiceTextActive]}>{item}</Text></Pressable>)}</View>
            <Text style={styles.journalLabel}>Gedrag</Text><View style={styles.journalChoices}>{fieldJournalBehaviors.map((item) => <Pressable disabled={journalSaving || journalSaved} key={item} onPress={() => { setJournalLocationError(""); setBehavior(item); }} style={[styles.journalChoice, behavior === item && styles.journalChoiceActive]}><Text style={[styles.journalChoiceText, behavior === item && styles.journalChoiceTextActive]}>{item}</Text></Pressable>)}</View>
            <Text style={styles.journalLabel}>Extra tags (optioneel, maximaal 3)</Text><View style={styles.journalChoices}>{fieldJournalTags.map((item) => <Pressable disabled={journalSaving || journalSaved} key={item} onPress={() => toggleJournalTag(item)} style={[styles.journalChoice, journalTags.includes(item) && styles.journalChoiceActive]}><Text style={[styles.journalChoiceText, journalTags.includes(item) && styles.journalChoiceTextActive]}>{item}</Text></Pressable>)}</View>
            <View style={[styles.privateMapChoice, (journalSaved || journalLocation) && styles.privateMapChoiceActive]}>
              <View style={[styles.privateMapCheck, (journalSaved || journalLocation) && styles.privateMapCheckActive]}><Text style={styles.privateMapCheckText}>{journalSaved || journalLocation ? "✓" : journalLocationBusy ? "…" : "!"}</Text></View>
              <View style={styles.privateMapCopy}><Text style={styles.privateMapTitle}>{journalSaved ? "Privé-kaartmarkering bewaard" : journalLocation ? "Telefoonlocatie klaar" : journalLocationBusy ? "Telefoonlocatie bepalen..." : "Telefoonlocatie nog niet beschikbaar"}</Text><Text style={styles.privateMapBody}>Je precieze locatie blijft privé en alleen jij ziet de afgeronde markering op je kaart.</Text></View>
            </View>
            {journalLocationError ? <Text style={styles.journalLocationError}>{journalLocationError}</Text> : null}
            {!journalSaved && !journalLocation && !journalLocationBusy ? <Pressable onPress={journalLocationIssue === "precise_required" ? openPreciseLocationSettings : () => void prepareJournalLocation()} style={styles.journalSave}><Text style={styles.primaryButtonText}>{journalLocationIssue === "precise_required" ? "Open app-instellingen" : "Probeer locatie opnieuw"}</Text></Pressable> : null}
            {!journalSaved && journalLocation && journalLocationError ? <Pressable onPress={() => setJournalLocationError("")} style={styles.journalSave}><Text style={styles.primaryButtonText}>Probeer opslaan opnieuw</Text></Pressable> : null}
            {fieldPhotoStamps.length > 0 && <Animated.View style={[styles.stampReveal, { opacity: stampReveal, transform: [{ scale: stampReveal.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>
              <Text style={styles.stampRevealKicker}>VELDFOTOSTEMPELS</Text>
              <Text style={styles.stampRevealBody}>Vastgelegd uit deze echte vondst. Geen AI-fotocijfer en geen extra XP.</Text>
              <View style={styles.stampRow}>{fieldPhotoStamps.map((stamp) => <View key={stamp.id} style={styles.stamp}><Text style={styles.stampIcon}>{stamp.icon}</Text><View style={styles.stampCopy}><Text style={styles.stampTitle}>{stamp.title}</Text><Text style={styles.stampBody}>{stamp.body}</Text></View></View>)}</View>
            </Animated.View>}
            {journalMilestones.map((milestone) => <View key={milestone.id} style={styles.milestoneReveal}><Text style={styles.milestoneKicker}>CONSERVATORY MILESTONE</Text><Text style={styles.milestoneTitle}>{milestone.id === "first-discovery" ? "Eerste spoor gevonden" : milestone.id === "trailblazer" ? "Trailblazer" : "Veldnaturalist"}</Text><Text style={styles.milestoneBody}>+{milestone.rewardXp} XP · je Museum en Expedition World zijn weer een stap levendiger.</Text></View>)}
            {weeklySpotlightReward?.claimed && <View style={styles.weeklySpotlightReveal}>
              <View style={styles.weeklySpotlightRewardArt}><BugArtImage bugId={weeklySpotlightReward.rewardBugId as never} size={64} /></View>
              <View style={styles.weeklySpotlightRewardCopy}><Text style={styles.weeklySpotlightRewardKicker}>{t("weeklySpotlight.receiptKicker")}</Text><Text style={styles.weeklySpotlightRewardBody}>{t("weeklySpotlight.receiptBody", { xp: weeklySpotlightReward.awardedXp })}</Text></View>
            </View>}
            {journalSaved && <View style={styles.rewardReceipt}>
              <Text style={styles.rewardReceiptKicker}>YOUR DISCOVERY CHANGED</Text>
              <View style={styles.rewardReceiptRow}><View style={styles.rewardReceiptMark}><Text style={styles.rewardReceiptMarkText}>1</Text></View><View style={styles.rewardReceiptCopy}><Text style={styles.rewardReceiptTitle}>BugDex</Text><Text style={styles.rewardReceiptBody}>{result.reward?.granted ? "A new specimen was added to your collection." : "This identification strengthens your collection record."}</Text></View></View>
              <View style={styles.rewardReceiptRow}><View style={styles.rewardReceiptMark}><Text style={styles.rewardReceiptMarkText}>2</Text></View><View style={styles.rewardReceiptCopy}><Text style={styles.rewardReceiptTitle}>Museum</Text><Text style={styles.rewardReceiptBody}>Your real BugDex collection can now reveal its next wing.</Text></View></View>
              <View style={styles.rewardReceiptRow}><View style={styles.rewardReceiptMark}><Text style={styles.rewardReceiptMarkText}>3</Text></View><View style={styles.rewardReceiptCopy}><Text style={styles.rewardReceiptTitle}>Expedition World</Text><Text style={styles.rewardReceiptBody}>Your {(habitat ?? "field").toLowerCase()} field note helps awaken your private map.</Text></View></View>
              <View style={styles.rewardReceiptActions}><Pressable onPress={onOpenCollection} style={styles.rewardReceiptAction}><Text style={styles.rewardReceiptActionText}>View collection</Text></Pressable><Pressable onPress={onOpenWorld} style={[styles.rewardReceiptAction, styles.rewardReceiptActionPrimary]}><Text style={[styles.rewardReceiptActionText, styles.rewardReceiptActionPrimaryText]}>Explore world</Text></Pressable></View>
            </View>}
            {journalSaved && <Pressable onPress={onOpenJournal} style={styles.journalOpen}><Text style={styles.journalOpenText}>Bekijk mijn Veldjournaal</Text></Pressable>}
          </View>}
          <Pressable accessibilityRole="button" disabled={remainingScans <= 0 || journalRequired} onPress={resetScan} style={({ pressed }) => [styles.primaryButton, (remainingScans <= 0 || journalRequired) && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{remainingScans > 0 ? t("bugScan.scanAgain") : t("bugScan.scanTomorrow")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={journalRequired} onPress={onBack} style={({ pressed }) => [styles.secondaryButton, journalRequired && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>{t("bugScan.backHome")}</Text>
          </Pressable>
        </Animated.View>
      )}

      {busy && !photo && (
        <View style={styles.loadingCard}>
          <BugBaasStateArt kind="loading" size={96} />
          <ActivityIndicator color="#15724f" size="small" />
          <Text style={styles.loadingText}>{t("bugScan.preparing")}</Text>
        </View>
      )}

      {error ? (
        <View accessibilityRole="alert" style={styles.errorState}>
          <BugBaasStateArt kind={error === t("bugScan.error.cameraPermission") ? "location-denied" : "search-error"} size={82} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {densePhone ? (
        <Pressable accessibilityRole="button" onPress={() => setPrivacyOpen(true)} style={styles.privacyCompactButton}>
          <Text style={styles.privacyCompactBadge}>AI</Text>
          <Text style={styles.privacyCompactText}>{t("bugScan.identification")}</Text>
          <Text style={styles.privacyCompactArrow}>{"\u203a"}</Text>
        </Pressable>
      ) : <ScanPrivacyCard t={t} />}
      <Modal animationType="fade" onRequestClose={() => setPrivacyOpen(false)} transparent visible={privacyOpen}>
        <View style={styles.privacyModalBackdrop}>
          <View style={styles.privacyModalCard}>
            <ScanPrivacyCard t={t} />
            <Pressable accessibilityRole="button" onPress={() => setPrivacyOpen(false)} style={styles.privacyModalClose}>
              <Text style={styles.privacyModalCloseText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ScanPrivacyCard({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <View style={styles.privacyCard}>
      <View style={styles.privacyHeader}>
        <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>{t("bugScan.identification")}</Text>
          <Text style={styles.privacyText}>{t("bugScan.privacy")}</Text>
        </View>
      </View>
      <View style={styles.warningRow}>
        <View style={styles.warningBadge}><Text style={styles.warningBadgeText}>!</Text></View>
        <Text style={styles.misuseWarning}>{t("bugScan.misuse")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "rgba(4,15,26,0.72)",
    flex: 1
  },
  content: {
    alignSelf: "center",
    minHeight: "100%",
    width: "100%"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 18
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,34,50,0.96)",
    borderColor: "#327f96",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  backButtonText: {
    color: "#e6fbff",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 36,
    marginTop: -3
  },
  headerCopy: {
    flex: 1
  },
  kicker: {
    color: "#f3ad42",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  title: {
    color: "#f2fbff",
    fontSize: 24,
    fontWeight: "900"
  },
  counter: {
    alignItems: "center",
    backgroundColor: "rgba(11,42,58,0.96)",
    borderColor: "#3fa5bf",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  counterEmpty: {
    backgroundColor: "#f5e7e4",
    borderColor: "#dfb6ae"
  },
  counterValue: {
    color: "#75e8ff",
    fontSize: 17,
    fontWeight: "900"
  },
  counterLabel: {
    color: "#a8cbd4",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  cameraModal: {
    backgroundColor: "#02090e",
    flex: 1,
    paddingHorizontal: 12
  },
  cameraModalTopBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 66,
    paddingBottom: 10
  },
  cameraTopButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  cameraTopButtonText: { color: "#ffffff", fontSize: 30, fontWeight: "500", lineHeight: 32 },
  cameraModalHeading: { alignItems: "center", flex: 1 },
  cameraModalKicker: { color: "#71e7ff", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  cameraModalTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  cameraModeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 66,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  cameraModeButtonActive: { borderColor: "#f4bd55" },
  cameraModeButtonLabel: { color: "#bed3da", fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  cameraModeButtonValue: { color: "#ffffff", fontSize: 11, fontWeight: "900", marginTop: 1 },
  stageCardTablet: {
    maxWidth: 680,
    width: "100%"
  },
  cameraViewport: {
    backgroundColor: "#03101a",
    borderColor: "rgba(108,226,255,0.4)",
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  cameraView: {
    height: "100%",
    width: "100%"
  },
  cameraGuide: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: 22,
    position: "absolute",
    right: 0,
    top: 0
  },
  cameraGuideBox: {
    borderColor: "rgba(93,225,255,0.94)",
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 3,
    height: "62%",
    width: "82%"
  },
  cameraGuideText: {
    backgroundColor: "rgba(2,18,30,0.82)",
    borderColor: "rgba(242,169,59,0.78)",
    borderWidth: 1,
    borderRadius: 12,
    bottom: 26,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    textAlign: "center"
  },
  cameraZoomHint: {
    backgroundColor: "rgba(2,18,30,0.78)",
    borderRadius: 10,
    color: "#dff9ff",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    top: 18
  },
  cameraSideControls: {
    gap: 10,
    position: "absolute",
    right: 12,
    top: 72
  },
  cameraSideButton: {
    alignItems: "center",
    backgroundColor: "rgba(2,18,30,0.84)",
    borderColor: "rgba(120,223,246,0.52)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 54,
    padding: 6
  },
  cameraSideButtonActive: { backgroundColor: "rgba(226,145,31,0.94)", borderColor: "#ffd58a" },
  cameraSideButtonIcon: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  cameraSideButtonText: { color: "#ffffff", fontSize: 8, fontWeight: "900", marginTop: 2, textTransform: "uppercase" },
  lightButton: {
    alignItems: "center",
    backgroundColor: "rgba(2,18,30,0.88)",
    borderColor: "#3a899e",
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    top: 14
  },
  lightButtonActive: { backgroundColor: "rgba(226,145,31,0.96)", borderColor: "#ffd58a" },
  lightButtonIcon: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  lightButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  cameraSweep: {
    backgroundColor: "rgba(92,226,255,0.92)",
    height: 2,
    left: "12%",
    position: "absolute",
    right: "12%",
    shadowColor: "#5ce2ff",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8
  },
  cameraBottomBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 104,
    paddingHorizontal: 12,
    paddingTop: 12
  },
  cameraBottomAction: { alignItems: "center", justifyContent: "center", minHeight: 58, minWidth: 72 },
  cameraBottomActionText: { color: "#d9edf2", fontSize: 10, fontWeight: "900", marginTop: 4 },
  cameraShutterOuter: {
    alignItems: "center",
    borderColor: "#ffffff",
    borderRadius: 42,
    borderWidth: 4,
    height: 84,
    justifyContent: "center",
    width: 84
  },
  cameraShutterInner: { alignItems: "center", backgroundColor: "#ffffff", borderRadius: 33, height: 66, justifyContent: "center", width: 66 },
  cameraShutterPressed: { transform: [{ scale: 0.94 }] },
  cameraQualityBadge: { alignItems: "center", justifyContent: "center", minHeight: 58, minWidth: 72 },
  cameraQualityValue: { color: "#f4bd55", fontSize: 12, fontWeight: "900" },
  cameraQualityLabel: { color: "#b8cbd2", fontSize: 8, fontWeight: "800", marginTop: 3, maxWidth: 82 },
  captureWorkspace: {
    flexDirection: "column-reverse",
    gap: 12
  },
  captureWorkspaceTablet: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 18
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#061c2a",
    borderColor: "#2c829b",
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 392,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 22,
    position: "relative"
  },
  heroCardCompact: {
    minHeight: 300,
    paddingBottom: 17,
    paddingTop: 14
  },
  heroCardTablet: {
    flex: 1.35,
    minHeight: 440
  },
  heroGlow: {
    backgroundColor: "rgba(45,195,224,0.15)",
    borderRadius: 180,
    height: 300,
    position: "absolute",
    right: -70,
    top: -112,
    width: 300
  },
  heroNatureLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  heroLeaf: {
    backgroundColor: "rgba(30,91,117,0.46)",
    borderRadius: 999,
    height: 86,
    position: "absolute",
    width: 32
  },
  heroLeafLeftOne: { left: -4, top: 26, transform: [{ rotate: "28deg" }] },
  heroLeafLeftTwo: { left: 22, top: 82, transform: [{ rotate: "58deg" }] },
  heroLeafLeftThree: { bottom: 42, left: 8, transform: [{ rotate: "76deg" }] },
  heroLeafRightOne: { right: -2, top: 38, transform: [{ rotate: "-28deg" }] },
  heroLeafRightTwo: { right: 24, top: 100, transform: [{ rotate: "-58deg" }] },
  heroLeafRightThree: { bottom: 52, right: 4, transform: [{ rotate: "-76deg" }] },
  heroGroundGlow: {
    backgroundColor: "rgba(239,157,43,0.14)",
    borderRadius: 160,
    bottom: -116,
    height: 210,
    left: "12%",
    position: "absolute",
    right: "12%"
  },
  heroVisual: {
    alignItems: "center",
    height: 224,
    justifyContent: "center",
    marginBottom: 10,
    maxWidth: 500,
    position: "relative",
    width: "100%"
  },
  heroVisualCompact: {
    height: 160,
    marginBottom: 5
  },
  heroBugGlow: {
    backgroundColor: "rgba(78,222,255,0.12)",
    borderRadius: 116,
    height: 232,
    position: "absolute",
    shadowColor: "#f0d56c",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    width: 232
  },
  scanMedallion: {
    height: 218,
    shadowColor: "#5ce4ff",
    shadowOffset: { height: 9, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    width: 218,
    zIndex: 2
  },
  scanMedallionCompact: { height: 150, width: 150 },
  scanRing: {
    backgroundColor: "rgba(7,31,47,0.28)",
    borderColor: "rgba(92,226,255,0.82)",
    borderRadius: 108,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 216,
    position: "absolute",
    width: 216
  },
  scanCorner: {
    borderColor: "#f1b34f",
    height: 34,
    position: "absolute",
    width: 34
  },
  scanCornerTopLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: "17%", top: 6 },
  scanCornerTopRight: { borderRightWidth: 3, borderTopWidth: 3, right: "17%", top: 6 },
  scanCornerBottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 6, left: "17%" },
  scanCornerBottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 6, right: "17%" },
  heroTipBadge: {
    alignItems: "center",
    backgroundColor: "rgba(3,19,31,0.94)",
    borderColor: "rgba(92,226,255,0.58)",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: "absolute",
    right: 0,
    top: 2
  },
  heroTipIcon: { color: "#65e7ff", fontSize: 15, fontWeight: "900" },
  heroTipText: { color: "#e8fbff", fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  heroTitle: {
    color: "#f1fbff",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: -0.3,
    maxWidth: 460,
    textAlign: "center"
  },
  heroTitlePhone: {
    fontSize: 20,
    lineHeight: 23
  },
  heroBody: {
    color: "#b9d5de",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 430,
    textAlign: "center"
  },
  heroBodyPhone: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  },
  heroStepsPanel: {
    backgroundColor: "rgba(2,18,30,0.62)",
    borderColor: "rgba(92,226,255,0.24)",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  heroStepsPanelPhone: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  stepsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    width: "100%"
  },
  stepChip: {
    alignItems: "center",
    gap: 5,
    minWidth: 62
  },
  stepIconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(19,79,103,0.72)",
    borderColor: "#53cae5",
    borderRadius: 24,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    position: "relative",
    width: 46
  },
  stepIconCirclePhone: {
    height: 38,
    width: 38
  },
  stepIcon: { color: "#dffaff", fontSize: 20, fontWeight: "900" },
  stepIconPhone: { fontSize: 17 },
  stepNumber: {
    backgroundColor: "#e99b2e",
    borderRadius: 9,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    height: 18,
    lineHeight: 18,
    position: "absolute",
    right: -4,
    textAlign: "center",
    top: -4,
    width: 18
  },
  stepText: {
    color: "#eafaff",
    fontSize: 10,
    fontWeight: "900"
  },
  stepArrow: {
    alignItems: "center",
    flexDirection: "row",
    marginHorizontal: 2,
    marginTop: -19,
    width: 24
  },
  stepArrowLine: {
    backgroundColor: "#62cfe7",
    height: 2,
    width: 12
  },
  captureActionPanel: {
    backgroundColor: "rgba(8,28,43,0.97)",
    borderColor: "#2a6c82",
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "space-between",
    padding: 16
  },
  captureActionPanelPhone: {
    padding: 11
  },
  captureActionPanelTablet: {
    flex: 0.72,
    minWidth: 260,
    padding: 20
  },
  actionKicker: {
    color: "#63ddf5",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  actionTitle: {
    color: "#f5fbff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6
  },
  actionBody: {
    color: "#a9c9d3",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#e99b2e",
    borderColor: "#ffd385",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 15
  },
  capturePrimaryButton: {
    backgroundColor: "#e99b2e",
    borderWidth: 2,
    elevation: 4,
    minHeight: 60,
    shadowColor: "#e99b2e",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12
  },
  capturePrimaryButtonPhone: {
    marginTop: 9,
    minHeight: 52,
    paddingVertical: 9
  },
  primaryButtonIconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,244,192,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  primaryButtonIcon: {
    color: "#ffffff",
    fontSize: 18
  },
  primaryButtonText: {
    color: "#102535",
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,43,60,0.96)",
    borderColor: "#3b849a",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13
  },
  galleryButton: {
    flexDirection: "row",
    gap: 9
  },
  galleryButtonPhone: {
    marginTop: 7,
    minHeight: 48,
    paddingVertical: 9
  },
  galleryButtonIcon: {
    color: "#72e6ff",
    fontSize: 19,
    fontWeight: "900"
  },
  secondaryButtonText: {
    color: "#e4f9ff",
    fontSize: 14,
    fontWeight: "900"
  },
  disabledButton: {
    backgroundColor: "#607784"
  },
  disabledSecondaryButton: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  previewCard: {
    alignSelf: "center",
    backgroundColor: "rgba(7,24,38,0.98)",
    borderColor: "#2c829b",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 780,
    padding: 16,
    width: "100%"
  },
  previewCardPhone: {
    borderRadius: 20,
    padding: 10
  },
  previewFrame: {
    aspectRatio: 1,
    backgroundColor: "#03101a",
    borderRadius: 19,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  previewFramePhone: {
    aspectRatio: 1.12
  },
  previewFrameTablet: {
    aspectRatio: undefined,
    height: 390
  },
  previewImage: {
    height: "100%",
    width: "100%"
  },
  cornerTopLeft: {
    borderLeftColor: "#5ce2ff",
    borderLeftWidth: 4,
    borderTopColor: "#5ce2ff",
    borderTopLeftRadius: 9,
    borderTopWidth: 4,
    height: 35,
    left: 16,
    position: "absolute",
    top: 16,
    width: 35
  },
  cornerTopRight: {
    borderRightColor: "#5ce2ff",
    borderRightWidth: 4,
    borderTopColor: "#5ce2ff",
    borderTopRightRadius: 9,
    borderTopWidth: 4,
    height: 35,
    position: "absolute",
    right: 16,
    top: 16,
    width: 35
  },
  cornerBottomLeft: {
    borderBottomColor: "#5ce2ff",
    borderBottomLeftRadius: 9,
    borderBottomWidth: 4,
    borderLeftColor: "#5ce2ff",
    borderLeftWidth: 4,
    bottom: 16,
    height: 35,
    left: 16,
    position: "absolute",
    width: 35
  },
  cornerBottomRight: {
    borderBottomColor: "#5ce2ff",
    borderBottomRightRadius: 9,
    borderBottomWidth: 4,
    borderRightColor: "#5ce2ff",
    borderRightWidth: 4,
    bottom: 16,
    height: 35,
    position: "absolute",
    right: 16,
    width: 35
  },
  previewTitle: {
    color: "#f1fbff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 17,
    textAlign: "center"
  },
  previewTitlePhone: {
    fontSize: 18,
    marginTop: 12
  },
  previewBody: {
    color: "#aac8d2",
    fontSize: 13,
    lineHeight: 19,
    marginHorizontal: 8,
    marginTop: 7,
    textAlign: "center"
  },
  previewBodyPhone: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 4,
    marginTop: 5
  },
  previewSweep: {
    backgroundColor: "rgba(92,226,255,0.9)",
    height: 2,
    left: 18,
    position: "absolute",
    right: 18,
    shadowColor: "#5ce2ff",
    shadowOpacity: 0.9,
    shadowRadius: 7
  },
  photoEditPanel: { alignItems: "center", backgroundColor: "#0c2d40", borderColor: "#275e72", borderRadius: 16, borderWidth: 1, marginTop: 14, padding: 12 },
  photoEditPanelPhone: { borderRadius: 14, marginTop: 10, padding: 8 },
  photoEditLabel: { color: "#dffaff", fontSize: 12, fontWeight: "900" },
  photoEditRow: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 8 },
  photoEditRowPhone: { gap: 10, marginTop: 6 },
  photoEditButton: { alignItems: "center", backgroundColor: "#14536b", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  photoEditButtonPhone: { borderRadius: 16, height: 34, width: 34 },
  photoEditButtonText: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  photoEditValue: { color: "#e3faff", fontSize: 13, fontWeight: "900", minWidth: 46, textAlign: "center" },
  photoEditValuePhone: { fontSize: 12, minWidth: 42 },
  photoNudgeGrid: { alignItems: "center", gap: 6, marginTop: 10 },
  photoNudgeGridPhone: { gap: 4, marginTop: 8 },
  photoNudgeRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  photoNudgeRowPhone: { gap: 4 },
  photoNudgeButton: { alignItems: "center", backgroundColor: "#17445a", borderRadius: 12, height: 38, justifyContent: "center", width: 42 },
  photoNudgeButtonPhone: { borderRadius: 10, height: 34, width: 38 },
  photoNudgeText: { color: "#dffaff", fontSize: 19, fontWeight: "900" },
  photoResetButton: { alignItems: "center", minWidth: 72, paddingHorizontal: 8 },
  photoResetButtonPhone: { height: 34, justifyContent: "center", minWidth: 62, paddingHorizontal: 5 },
  photoResetText: { color: "#6ee6ff", fontSize: 11, fontWeight: "900" },
  reviewPrimaryButtonPhone: {
    marginTop: 10,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  reviewSecondaryButtonPhone: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  resultCard: {
    alignItems: "stretch",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: "#d9c389",
    borderRadius: 26,
    borderWidth: 1,
    maxWidth: 780,
    padding: 20,
    width: "100%"
  },
  resultCardTablet: { maxWidth: 680 },
  rewardGlow: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff5cf",
    borderColor: "#e5bd50",
    borderRadius: 85,
    borderWidth: 2,
    height: 164,
    justifyContent: "center",
    marginBottom: 15,
    width: 164
  },
  resultFallbackIcon: {
    color: "#98731a",
    fontSize: 68,
    fontWeight: "900"
  },
  resultEyebrow: {
    color: "#b27616",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center"
  },
  resultTitle: {
    color: "#102018",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  resultBody: {
    color: "#53685e",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center"
  },
  identificationCard: {
    backgroundColor: "#f0f6f2",
    borderColor: "#d4e2da",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 14
  },
  professorCard: { backgroundColor: "#173f31", borderColor: "#2f6f56", borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 14 },
  professorTitle: { color: "#f6d66c", fontSize: 16, fontWeight: "900" },
  professorConfidence: { color: "#bde7d0", fontSize: 12, fontWeight: "800", marginTop: 4 },
  professorFact: { color: "#f0f7f2", fontSize: 13, lineHeight: 19, marginTop: 8 },
  professorQuizButton: { alignSelf: "flex-start", backgroundColor: "#f6d66c", borderRadius: 10, marginTop: 12, paddingHorizontal: 11, paddingVertical: 8 },
  professorQuizButtonText: { color: "#173f31", fontSize: 12, fontWeight: "900" },
  professorQuiz: { borderTopColor: "#3d765f", borderTopWidth: 1, marginTop: 12, paddingTop: 10 },
  professorQuizMetaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  professorQuizDifficulty: { color: "#8fd7b7", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  professorQuizRewardHint: { color: "#f6d66c", fontSize: 11, fontWeight: "900" },
  professorQuizQuestion: { color: "#ffffff", fontSize: 15, fontWeight: "900", lineHeight: 21, marginTop: 8 },
  professorQuizOptions: { gap: 7, marginTop: 12 },
  professorQuizOption: { backgroundColor: "#245642", borderColor: "#4b826b", borderRadius: 11, borderWidth: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  professorQuizOptionCorrect: { backgroundColor: "#19734e", borderColor: "#8fe0b7" },
  professorQuizOptionWrong: { backgroundColor: "#7a3d38", borderColor: "#e59a90" },
  professorQuizOptionText: { color: "#f4fbf6", fontSize: 13, fontWeight: "800", lineHeight: 18 },
  professorQuizResult: { backgroundColor: "#102f25", borderRadius: 12, marginTop: 12, padding: 11 },
  professorQuizResultTitle: { color: "#f6d66c", fontSize: 15, fontWeight: "900" },
  professorQuizExplanation: { color: "#d8eee2", fontSize: 12, lineHeight: 18, marginTop: 5 },
  professorQuizReward: { color: "#9ce3bd", fontSize: 13, fontWeight: "900", marginTop: 7 },
  professorQuizAnswer: { color: "#ffffff", fontSize: 13, fontWeight: "900", marginTop: 7 },
  professorNextButton: { alignSelf: "flex-start", borderColor: "#7cae98", borderRadius: 10, borderWidth: 1, marginTop: 10, paddingHorizontal: 10, paddingVertical: 7 },
  professorNextButtonText: { color: "#dff4e8", fontSize: 12, fontWeight: "800" },
  journalCard: { backgroundColor: "#fff8df", borderColor: "#ead18d", borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 14 },
  journalTitle: { color: "#6c5014", fontSize: 16, fontWeight: "900" },
  journalBody: { color: "#705f35", fontSize: 12, lineHeight: 18, marginTop: 4 },
  journalLabel: { color: "#6c5014", fontSize: 11, fontWeight: "900", marginTop: 12, textTransform: "uppercase" },
  journalChoices: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  journalChoice: { backgroundColor: "#fffdf5", borderColor: "#e1d6ad", borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  journalChoiceActive: { backgroundColor: "#15724f", borderColor: "#15724f" },
  journalChoiceText: { color: "#67592f", fontSize: 12, fontWeight: "800" },
  journalChoiceTextActive: { color: "#ffffff" },
  privateMapChoice: { alignItems: "flex-start", backgroundColor: "#f6f0df", borderColor: "#d7c89b", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 14, padding: 12 },
  privateMapChoiceActive: { backgroundColor: "#e6f2df", borderColor: "#78a882" },
  privateMapCheck: { alignItems: "center", borderColor: "#819989", borderRadius: 6, borderWidth: 2, height: 20, justifyContent: "center", marginTop: 2, width: 20 },
  privateMapCheckActive: { backgroundColor: "#15724f", borderColor: "#15724f" },
  privateMapCheckText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  privateMapCopy: { flex: 1 },
  privateMapTitle: { color: "#173426", fontSize: 13, fontWeight: "900" },
  privateMapBody: { color: "#587064", fontSize: 11, lineHeight: 16, marginTop: 3 },
  journalLocationError: { color: "#a33c25", fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 8 },
  journalSave: { alignItems: "center", backgroundColor: "#15724f", borderRadius: 12, marginTop: 14, padding: 12 },
  stampReveal: { backgroundColor: "#e6f2e7", borderColor: "#15724f", borderRadius: 12, borderWidth: 1, marginTop: 12, overflow: "hidden", padding: 12 },
  stampRevealKicker: { color: "#15724f", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  stampRevealBody: { color: "#315747", fontSize: 12, lineHeight: 17, marginTop: 4 },
  stampRow: { gap: 8, marginTop: 10 },
  stamp: { alignItems: "center", backgroundColor: "#f8fcf8", borderColor: "#bdd4c4", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 9, padding: 9 },
  stampIcon: { color: "#15724f", fontSize: 23, fontWeight: "900", width: 24 },
  stampCopy: { flex: 1 },
  stampTitle: { color: "#173f31", fontSize: 12, fontWeight: "900" },
  stampBody: { color: "#4f6a5d", fontSize: 11, lineHeight: 15, marginTop: 1 },
  milestoneReveal: { backgroundColor: "#173f31", borderColor: "#e5cc69", borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 12 },
  milestoneKicker: { color: "#e5cc69", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  milestoneTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 3 },
  milestoneBody: { color: "#d8e9dc", fontSize: 12, lineHeight: 17, marginTop: 3 },
  weeklySpotlightReveal: { alignItems: "center", backgroundColor: "#2b1740", borderColor: "#b56cff", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 12, padding: 10 },
  weeklySpotlightRewardArt: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, height: 72, justifyContent: "center", width: 72 },
  weeklySpotlightRewardCopy: { flex: 1, minWidth: 0 },
  weeklySpotlightRewardKicker: { color: "#d9a7ff", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  weeklySpotlightRewardBody: { color: "#f5eaff", fontSize: 12, fontWeight: "800", lineHeight: 17, marginTop: 4 },
  rewardReceipt: { backgroundColor: "#fdf8e6", borderColor: "#d7bd57", borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 12 },
  rewardReceiptKicker: { color: "#8b671d", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  rewardReceiptRow: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 10 },
  rewardReceiptMark: { alignItems: "center", backgroundColor: "#173f31", borderRadius: 12, height: 24, justifyContent: "center", width: 24 },
  rewardReceiptMarkText: { color: "#f4d56d", fontSize: 11, fontWeight: "900" },
  rewardReceiptCopy: { flex: 1 },
  rewardReceiptTitle: { color: "#173f31", fontSize: 12, fontWeight: "900" },
  rewardReceiptBody: { color: "#52665d", fontSize: 11, lineHeight: 15, marginTop: 1 },
  rewardReceiptActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  rewardReceiptAction: { alignItems: "center", borderColor: "#8bb99b", borderRadius: 9, borderWidth: 1, flex: 1, padding: 10 },
  rewardReceiptActionPrimary: { backgroundColor: "#173f31", borderColor: "#173f31" },
  rewardReceiptActionText: { color: "#173f31", fontSize: 11, fontWeight: "900" },
  rewardReceiptActionPrimaryText: { color: "#ffffff" },
  journalOpen: { alignItems: "center", paddingTop: 12 },
  journalOpenText: { color: "#15724f", fontSize: 13, fontWeight: "900" },
  identificationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  identificationLabel: {
    color: "#5c7066",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  confidence: {
    color: "#15724f",
    fontSize: 13,
    fontWeight: "900"
  },
  identificationName: {
    color: "#173f31",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 7
  },
  scientificName: {
    color: "#63766d",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2
  },
  reason: {
    color: "#4d6258",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cfddd5",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28
  },
  loadingText: {
    color: "#53685e",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12
  },
  errorState: {
    alignItems: "center",
    backgroundColor: "#fff0ed",
    borderColor: "#d97a61",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 12
  },
  error: {
    backgroundColor: "transparent",
    borderColor: "#e1ada4",
    borderRadius: 13,
    borderWidth: 1,
    color: "#a93227",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 12,
    padding: 13,
    textAlign: "center"
  },
  privacyCard: {
    backgroundColor: "rgba(249,249,240,0.96)",
    borderColor: "#d8d6bd",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  privacyCompactButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(10,35,51,0.96)",
    borderColor: "rgba(92,226,255,0.42)",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    width: "100%"
  },
  privacyCompactBadge: {
    color: "#63ddf5",
    fontSize: 10,
    fontWeight: "900"
  },
  privacyCompactText: {
    color: "#dff7ff",
    flex: 1,
    fontSize: 10,
    fontWeight: "900"
  },
  privacyCompactArrow: {
    color: "#f1b34f",
    fontSize: 20,
    fontWeight: "900"
  },
  privacyModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(3,10,18,0.82)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  privacyModalCard: {
    backgroundColor: "#e9f4f3",
    borderColor: "#45b8be",
    borderRadius: 24,
    borderWidth: 2,
    maxWidth: 520,
    padding: 8,
    width: "100%"
  },
  privacyModalClose: {
    alignItems: "center",
    backgroundColor: "#55d9d5",
    borderRadius: 13,
    justifyContent: "center",
    margin: 8,
    minHeight: 46
  },
  privacyModalCloseText: {
    color: "#102d34",
    fontSize: 12,
    fontWeight: "900"
  },
  privacyHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  aiBadge: {
    alignItems: "center",
    backgroundColor: "#0f4a35",
    borderColor: "#d1ad45",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  aiBadgeText: { color: "#f4da75", fontSize: 15, fontWeight: "900" },
  privacyCopy: { flex: 1 },
  privacyTitle: {
    color: "#254b3a",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  privacyText: {
    color: "#5c7066",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  },
  warningRow: {
    alignItems: "center",
    borderColor: "#e1d8c2",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 11
  },
  warningBadge: {
    alignItems: "center",
    backgroundColor: "#fff1d2",
    borderColor: "#d49a38",
    borderRadius: 10,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  warningBadgeText: { color: "#a04a29", fontSize: 17, fontWeight: "900" },
  misuseWarning: {
    color: "#8b3a2d",
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16
  }
});
