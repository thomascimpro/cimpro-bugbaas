import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, type GestureResponderEvent, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { BugBaasStateArt } from "../components/BugBaasStateArt";
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
  emergencyRealBugPhotoPlan,
  fallbackRealBugPhotoPlan,
  primaryRealBugPhotoPlan,
  reviewRealBugThumbnailPlan,
  shouldFallbackRealBugPhoto,
  type RealBugPhotoPlan
} from "../services/realBugScanImagePolicy";
import { normalizeRealBugCameraAsset, type RealBugPhotoAsset } from "../services/realBugCameraAsset";
import { adjustRealBugCameraZoom, calculateRealBugPinchZoom, chooseBestRealBugPictureSize } from "../services/realBugCameraControls";
import { getRemainingRealBugScans, RealBugScanLimitError, submitRealBugScan } from "../services/realBugScanService";
import { type BugDexDropResult } from "../services/bugDexService";
import { applyUserPoints } from "../services/userService";
import { fieldJournalBehaviors, fieldJournalHabitats, listFieldJournalEntries, saveFieldJournalEntry, type FieldJournalBehavior, type FieldJournalHabitat, type FieldMilestoneReward, type WeeklyFieldSpotlightReward } from "../services/fieldJournalService";
import { requestPrivateSightingLocation } from "../services/privateSightingLocation";
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
  dataUrl: string;
  previewUri: string;
  reviewThumbnailDataUrl: string;
  width: number;
  height: number;
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
  const [habitat, setHabitat] = useState<FieldJournalHabitat>("Tuin");
  const [behavior, setBehavior] = useState<FieldJournalBehavior>("Onbekend");
  const [journalSaved, setJournalSaved] = useState(false);
  const [savePrivateMapCell, setSavePrivateMapCell] = useState(false);
  const [journalMilestones, setJournalMilestones] = useState<FieldMilestoneReward[]>([]);
  const [weeklySpotlightReward, setWeeklySpotlightReward] = useState<WeeklyFieldSpotlightReward>();
  const [fieldPhotoStamps, setFieldPhotoStamps] = useState<FieldPhotoStamp[]>([]);
  const [professorQuizOpen, setProfessorQuizOpen] = useState(false);
  const [professorQuizRound, setProfessorQuizRound] = useState(0);
  const [professorQuizSelection, setProfessorQuizSelection] = useState<string | null>(null);
  const [professorQuizReward, setProfessorQuizReward] = useState(0);
  const [professorQuizRewardClaimed, setProfessorQuizRewardClaimed] = useState(false);
  const [professorQuizAwarding, setProfessorQuizAwarding] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const stampReveal = useRef(new Animated.Value(0)).current;
  const stageReveal = useRef(new Animated.Value(0)).current;
  const scannerSweep = useRef(new Animated.Value(0)).current;

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

  async function prepareAsset(asset: RealBugPhotoAsset | ImagePicker.ImagePickerAsset) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const manipulatePhoto = (uri: string, plan: RealBugPhotoPlan) => ImageManipulator.manipulateAsync(uri, plan.resize, {
        base64: true,
        compress: plan.quality,
        format: ImageManipulator.SaveFormat.JPEG
      });
      const primary = await manipulatePhoto(
        asset.uri,
        primaryRealBugPhotoPlan(asset.width ?? 0, asset.height ?? 0)
      );
      if (!primary.base64) throw new Error(t("bugScan.error.prepare"));

      let prepared = shouldFallbackRealBugPhoto(primary.base64)
        ? await manipulatePhoto(
            primary.uri,
            fallbackRealBugPhotoPlan(primary.width ?? 0, primary.height ?? 0)
          )
        : primary;
      if (!prepared.base64) throw new Error(t("bugScan.error.prepare"));
      if (shouldFallbackRealBugPhoto(prepared.base64)) {
        prepared = await manipulatePhoto(
          prepared.uri,
          emergencyRealBugPhotoPlan(prepared.width ?? 0, prepared.height ?? 0)
        );
      }
      if (!prepared.base64) throw new Error(t("bugScan.error.prepare"));

      const thumbnail = await manipulatePhoto(
        prepared.uri,
        reviewRealBugThumbnailPlan(prepared.width ?? 0, prepared.height ?? 0)
      );
      if (!thumbnail.base64) throw new Error(t("bugScan.error.thumbnail"));

      setPhotoZoom(1);
      setPhotoOffsetX(0);
      setPhotoOffsetY(0);
      setPhoto({
        dataUrl: `data:image/jpeg;base64,${prepared.base64}`,
        previewUri: prepared.uri,
        reviewThumbnailDataUrl: `data:image/jpeg;base64,${thumbnail.base64}`,
        width: prepared.width ?? 0,
        height: prepared.height ?? 0
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.openPhoto"));
    } finally {
      setBusy(false);
    }
  }

  async function openCamera() {
    setError("");
    if (remainingScans <= 0) {
      setError(t("bugScan.error.limit"));
      return;
    }
    try {
      if (Platform.OS === "web") {
        const picked = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          cameraType: ImagePicker.CameraType.back,
          mediaTypes: ["images"],
          quality: 1
        });
        if (!picked.canceled && picked.assets[0]) await prepareAsset(picked.assets[0]);
        return;
      }
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission.granted) {
        setError(t("bugScan.error.cameraPermission"));
        return;
      }
      cameraConfiguredRef.current = false;
      setCameraPictureSize(undefined);
      setCameraTorch(false);
      setCameraZoom(0);
      setCameraReady(false);
      setCameraOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.cameraOpen"));
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
    } finally {
      setCameraReady(true);
    }
  }

  async function capturePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setError("");
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!captured) throw new Error(t("bugScan.error.noCapture"));
      setCameraOpen(false);
      setCameraReady(false);
      setCameraTorch(false);
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
      let dataUrl = photo.dataUrl;
      let thumbnailDataUrl = photo.reviewThumbnailDataUrl;
      if (photoZoom > 1 && photo.width > 0 && photo.height > 0) {
        const cropWidth = Math.max(1, Math.round(photo.width / photoZoom));
        const cropHeight = Math.max(1, Math.round(photo.height / photoZoom));
        const maxOriginX = photo.width - cropWidth;
        const maxOriginY = photo.height - cropHeight;
        const originX = Math.round(((photoOffsetX + 1) / 2) * maxOriginX);
        const originY = Math.round(((photoOffsetY + 1) / 2) * maxOriginY);
        const edited = await ImageManipulator.manipulateAsync(
          photo.previewUri,
          [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
          { base64: true, compress: primaryRealBugPhotoPlan(cropWidth, cropHeight).quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (!edited.base64) throw new Error(t("bugScan.error.prepare"));
        const thumbnailPlan = reviewRealBugThumbnailPlan(edited.width ?? 0, edited.height ?? 0);
        const thumbnail = await ImageManipulator.manipulateAsync(
          edited.uri,
          thumbnailPlan.resize,
          { base64: true, compress: thumbnailPlan.quality, format: ImageManipulator.SaveFormat.JPEG }
        );
        if (!thumbnail.base64) throw new Error(t("bugScan.error.thumbnail"));
        dataUrl = `data:image/jpeg;base64,${edited.base64}`;
        thumbnailDataUrl = `data:image/jpeg;base64,${thumbnail.base64}`;
      }
      const submission = await submitRealBugScan(user, dataUrl, thumbnailDataUrl);
      const nextResult = submission.result;
      setResult(nextResult);
      if (submission.drop) onRewardDrop(submission.drop);
      setJournalSaved(false);
      setWeeklySpotlightReward(undefined);
      setProfessorQuizOpen(false);
      setRemainingScans(nextResult.remainingScans);
    } catch (nextError) {
      if (nextError instanceof RealBugScanLimitError) setRemainingScans(0);
      setError(nextError instanceof Error ? nextError.message : t("bugScan.error.failed"));
    } finally {
      setBusy(false);
    }
  }

  function resetScan() {
    setCameraOpen(false);
    setCameraReady(false);
    setCameraPictureSize(undefined);
    setCameraTorch(false);
    setCameraZoom(0);
    setPhotoZoom(1);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    setPhoto(null);
    setResult(null);
    setJournalSaved(false);
    setSavePrivateMapCell(false);
    setJournalMilestones([]);
    setWeeklySpotlightReward(undefined);
    setFieldPhotoStamps([]);
    setProfessorQuizOpen(false);
    setProfessorQuizRound(0);
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
  const professor = useMemo(
    () => result ? getBugProfessorBrief(result, language) : null,
    [language, professorQuizRound, result]
  );
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

  async function saveJournal() {
    if (!result || !canJournal || busy || journalSaved) return;
    setBusy(true);
    try {
      const locationResult = savePrivateMapCell ? await requestPrivateSightingLocation() : undefined;
      if (locationResult && !locationResult.available) setSavePrivateMapCell(false);
      const saved = await saveFieldJournalEntry(user, result, habitat, behavior, locationResult?.available ? locationResult.location : undefined);
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Veldnotitie opslaan mislukt.");
    } finally {
      setBusy(false);
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
        <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
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

      {!photo && !result && cameraOpen && (
        <Animated.View style={[styles.cameraCard, stageAnimatedStyle, layout.isTablet && styles.stageCardTablet]}>
          <View
            onTouchEnd={endCameraPinch}
            onTouchMove={moveCameraPinch}
            onTouchStart={startCameraPinch}
            style={[styles.cameraFrame, layout.isTablet && styles.cameraFrameTablet, layout.tier === "wide" && styles.cameraFrameWide]}
          >
            <CameraView
              ref={cameraRef}
              autofocus="off"
              enableTorch={cameraTorch}
              facing="back"
              mode="picture"
              pictureSize={cameraPictureSize}
              zoom={cameraZoom}
              onCameraReady={() => void handleCameraReady()}
              onMountError={(event) => {
                setCameraOpen(false);
                setCameraReady(false);
                setError(event.message || t("bugScan.error.cameraStart"));
              }}
              style={styles.cameraView}
            />
            <View pointerEvents="none" style={styles.cameraGuide}>
              <View style={styles.cameraGuideBox} />
              <Animated.View style={[styles.cameraSweep, scannerSweepStyle]} />
              <Text style={styles.cameraGuideText}>{t("bugScan.camera.place")}</Text>
              <Text style={styles.cameraZoomHint}>{t("bugScan.camera.zoomHint")}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("bugScan.camera.light")}
              accessibilityRole="button"
              onPress={() => setCameraTorch((current) => !current)}
              style={({ pressed }) => [styles.lightButton, cameraTorch && styles.lightButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.lightButtonIcon}>{cameraTorch ? "☀" : "○"}</Text>
              <Text style={styles.lightButtonText}>{t("bugScan.camera.light")}</Text>
            </Pressable>
            <View style={styles.zoomControls}>
              <Pressable
                accessibilityLabel="Zoom out"
                accessibilityRole="button"
                disabled={cameraZoom <= 0 || capturing}
                onPress={() => setCameraZoom((current) => adjustRealBugCameraZoom(current, -1))}
                style={({ pressed }) => [styles.zoomButton, (cameraZoom <= 0 || capturing) && styles.zoomButtonDisabled, pressed && styles.pressed]}
              >
                <Text style={styles.zoomButtonText}>−</Text>
              </Pressable>
              <Text style={styles.zoomValue}>{Math.round(cameraZoom * 100)}%</Text>
              <Pressable
                accessibilityLabel="Zoom in"
                accessibilityRole="button"
                disabled={cameraZoom >= 1 || capturing}
                onPress={() => setCameraZoom((current) => adjustRealBugCameraZoom(current, 1))}
                style={({ pressed }) => [styles.zoomButton, (cameraZoom >= 1 || capturing) && styles.zoomButtonDisabled, pressed && styles.pressed]}
              >
                <Text style={styles.zoomButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={!cameraReady || capturing} onPress={() => void capturePhoto()} style={({ pressed }) => [styles.primaryButton, (!cameraReady || capturing) && styles.disabledButton, pressed && styles.pressed]}>
            {capturing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{t("bugScan.camera.take")}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={capturing} onPress={() => {
            setCameraOpen(false);
            setCameraReady(false);
            setCameraPictureSize(undefined);
            setCameraTorch(false);
            setCameraZoom(0);
          }} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>{t("bugScan.camera.close")}</Text>
          </Pressable>
        </Animated.View>
      )}

      {!photo && !result && !cameraOpen && (
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
              <Pressable accessibilityRole="button" disabled={busy || remainingScans <= 0} onPress={() => void openCamera()} style={({ pressed }) => [styles.primaryButton, styles.capturePrimaryButton, densePhone && styles.capturePrimaryButtonPhone, (busy || remainingScans <= 0) && styles.disabledButton, pressed && styles.pressed]}>
                <View style={styles.primaryButtonIconCircle}><GameUiIcon name="scan" size={28} /></View>
                <Text style={styles.primaryButtonText}>{remainingScans > 0 ? t("bugScan.openCamera") : t("bugScan.limitReached")}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy || remainingScans <= 0} onPress={() => void selectPhoto()} style={({ pressed }) => [styles.secondaryButton, styles.galleryButton, densePhone && styles.galleryButtonPhone, (busy || remainingScans <= 0) && styles.disabledSecondaryButton, pressed && styles.pressed]}>
                <GameUiIcon name="gallery" size={26} />
                <Text style={styles.secondaryButtonText}>{t("bugScan.chooseGallery")}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {photo && !result && !busy && (
        <Animated.View style={[styles.previewCard, densePhone && styles.previewCardPhone, stageAnimatedStyle, layout.isTablet && styles.stageCardTablet]}>
          <View style={[styles.previewFrame, densePhone && styles.previewFramePhone, layout.isTablet && styles.previewFrameTablet]}>
            <Image
              resizeMode="cover"
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
            {localized?.fact ? <Text style={styles.reason}>{t("bugScan.fact", { fact: localized.fact })}</Text> : null}
          </View>
          {professor && <View style={styles.professorCard}>
            <Text style={styles.professorTitle}>{professor.title}</Text>
            <Text style={styles.professorConfidence}>{professor.confidence}</Text>
            <Text style={styles.professorFact}>{professor.fact}</Text>
            {!professorQuizOpen ? (
              <Pressable accessibilityRole="button" onPress={() => setProfessorQuizOpen(true)} style={styles.professorQuizButton}>
                <Text style={styles.professorQuizButtonText}>{professor.quizButton}</Text>
              </Pressable>
            ) : null}
            {professorQuizOpen && (
              <View style={styles.professorQuiz}>
                <View style={styles.professorQuizMetaRow}>
                  <Text style={styles.professorQuizDifficulty}>{professor.quizDifficulty.toUpperCase()}</Text>
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
            )}
          </View>}
          {canJournal && <View style={styles.journalCard}>
            <Text style={styles.journalTitle}>Veldnotitie</Text>
            <Text style={styles.journalBody}>Leg vast waar je deze echte vondst zag. Je ontdekpad groeit alleen uit bevestigde vondsten.</Text>
            <Text style={styles.journalLabel}>Habitat</Text><View style={styles.journalChoices}>{fieldJournalHabitats.map((item) => <Pressable key={item} onPress={() => setHabitat(item)} style={[styles.journalChoice, habitat === item && styles.journalChoiceActive]}><Text style={[styles.journalChoiceText, habitat === item && styles.journalChoiceTextActive]}>{item}</Text></Pressable>)}</View>
            <Text style={styles.journalLabel}>Gedrag</Text><View style={styles.journalChoices}>{fieldJournalBehaviors.map((item) => <Pressable key={item} onPress={() => setBehavior(item)} style={[styles.journalChoice, behavior === item && styles.journalChoiceActive]}><Text style={[styles.journalChoiceText, behavior === item && styles.journalChoiceTextActive]}>{item}</Text></Pressable>)}</View>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: savePrivateMapCell }} disabled={busy || journalSaved} onPress={() => setSavePrivateMapCell((current) => !current)} style={[styles.privateMapChoice, savePrivateMapCell && styles.privateMapChoiceActive]}>
              <View style={[styles.privateMapCheck, savePrivateMapCell && styles.privateMapCheckActive]}><Text style={styles.privateMapCheckText}>{savePrivateMapCell ? "✓" : ""}</Text></View>
              <View style={styles.privateMapCopy}><Text style={styles.privateMapTitle}>Bewaar een privé-kaartmarkering</Text><Text style={styles.privateMapBody}>Optioneel. Je locatie wordt afgerond tot ongeveer 110 meter, alleen jij kunt hem zien en hij geeft geen extra beloning.</Text></View>
            </Pressable>
            <Pressable disabled={busy || journalSaved} onPress={() => void saveJournal()} style={[styles.journalSave, (busy || journalSaved) && styles.disabledButton]}><Text style={styles.primaryButtonText}>{journalSaved ? "Opgeslagen in Veldjournaal" : "Sla veldnotitie op"}</Text></Pressable>
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
              <View style={styles.rewardReceiptRow}><View style={styles.rewardReceiptMark}><Text style={styles.rewardReceiptMarkText}>3</Text></View><View style={styles.rewardReceiptCopy}><Text style={styles.rewardReceiptTitle}>Expedition World</Text><Text style={styles.rewardReceiptBody}>Your {habitat.toLowerCase()} field note helps awaken your private map.</Text></View></View>
              <View style={styles.rewardReceiptActions}><Pressable onPress={onOpenCollection} style={styles.rewardReceiptAction}><Text style={styles.rewardReceiptActionText}>View collection</Text></Pressable><Pressable onPress={onOpenWorld} style={[styles.rewardReceiptAction, styles.rewardReceiptActionPrimary]}><Text style={[styles.rewardReceiptActionText, styles.rewardReceiptActionPrimaryText]}>Explore world</Text></Pressable></View>
            </View>}
            {journalSaved && <Pressable onPress={onOpenJournal} style={styles.journalOpen}><Text style={styles.journalOpenText}>Bekijk mijn Veldjournaal</Text></Pressable>}
          </View>}
          <Pressable accessibilityRole="button" disabled={remainingScans <= 0} onPress={resetScan} style={({ pressed }) => [styles.primaryButton, remainingScans <= 0 && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>{remainingScans > 0 ? t("bugScan.scanAgain") : t("bugScan.scanTomorrow")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
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
  cameraCard: {
    alignSelf: "center",
    backgroundColor: "rgba(7,24,38,0.98)",
    borderColor: "#2c829b",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 780,
    padding: 14,
    width: "100%"
  },
  stageCardTablet: {
    maxWidth: 680,
    width: "100%"
  },
  cameraFrame: {
    aspectRatio: 1.1,
    backgroundColor: "#03101a",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  cameraFrameTablet: {
    aspectRatio: 4 / 3
  },
  cameraFrameWide: {
    aspectRatio: 16 / 9
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
  zoomControls: {
    alignItems: "center",
    backgroundColor: "rgba(2,18,30,0.88)",
    borderColor: "#3a899e",
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    position: "absolute",
    right: 14,
    top: 14
  },
  zoomButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  zoomButtonDisabled: { opacity: 0.35 },
  zoomButtonText: { color: "#ffffff", fontSize: 25, fontWeight: "900" },
  zoomValue: { color: "#ffffff", fontSize: 12, fontWeight: "900", minWidth: 34, textAlign: "center" },
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
