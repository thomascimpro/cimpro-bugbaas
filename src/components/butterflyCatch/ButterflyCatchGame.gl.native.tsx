// Bewaard als experimentele GL-versie; Android gebruikt de lokaal ingebedde productiegame.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { DeviceMotion, type DeviceMotionMeasurement } from "expo-sensors";
import {
  advanceButterflyCatchRun,
  butterflyCatchAccuracy,
  butterflyCatchResult,
  createButterflyCatchRun,
  finishButterflyCatchRun,
  recordButterflyCatch,
  resolveButterflyCatchSwing,
  startButterflyCatchSwing,
  BUTTERFLY_CATCH_SWING_DURATION_MS,
  type ButterflyCatchRunState,
} from "./butterflyCatchGameModel";
import {
  butterflyCatchArcadeResult,
  createButterflyCatchArcadeResult,
  loadButterflyCatchHighScore,
  saveButterflyCatchResult,
} from "./butterflyCatchResultService";
import { ButterflyCatchNativeWorld } from "./ButterflyCatchNativeWorld.native";
import type {
  ButterflyCatchAimState,
  ButterflyCatchGameProps,
  ButterflyCatchLookState,
} from "./ButterflyCatchGame.types";

type ScreenState = "ready" | "running" | "finished";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type RotationSample = DeviceMotionMeasurement["rotation"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(value: number): number {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function ButterflyCatchGame({
  onClose,
  onFullscreenChange,
  onResult,
  practice = false,
  ranked = false,
  user,
}: ButterflyCatchGameProps) {
  const [screenState, setScreenState] = useState<ScreenState>("ready");
  const [runState, setRunState] = useState<ButterflyCatchRunState | null>(null);
  const [swingRequestId, setSwingRequestId] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [fps, setFps] = useState(0);
  const [sensorLabel, setSensorLabel] = useState("Sleep om rond te kijken");
  const [catchLabel, setCatchLabel] = useState("");
  const [aimState, setAimState] = useState<ButterflyCatchAimState>({ progress: 0, targetName: null, tracking: false });
  const [captureHolding, setCaptureHolding] = useState(false);
  const [focusProgress, setFocusProgress] = useState(0);
  const lookRef = useRef<ButterflyCatchLookState>({ yaw: 0, pitch: 0 });
  const swingFocusRef = useRef(0);
  const captureStartedAtRef = useRef(0);
  const latestRotationRef = useRef<RotationSample | null>(null);
  const calibrationRef = useRef<RotationSample | null>(null);
  const sensorYawRef = useRef(0);
  const sensorPitchRef = useRef(0);
  const dragYawRef = useRef(0);
  const dragPitchRef = useRef(0);
  const dragStartRef = useRef({ yaw: 0, pitch: 0 });
  const lastSwingAtRef = useRef(0);
  const submittedRunRef = useRef<number | null>(null);
  const sensorSubscriptionRef = useRef<ReturnType<typeof DeviceMotion.addListener> | null>(null);

  useEffect(() => {
    onFullscreenChange?.(true);
    return () => {
      sensorSubscriptionRef.current?.remove();
      sensorSubscriptionRef.current = null;
      onFullscreenChange?.(false);
    };
  }, [onFullscreenChange]);

  useEffect(() => {
    let active = true;
    void loadButterflyCatchHighScore(user)
      .then((score) => { if (active) setBestScore(score); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user.uid]);

  const applyLook = useCallback(() => {
    lookRef.current.yaw = normalizeAngle(sensorYawRef.current + dragYawRef.current);
    lookRef.current.pitch = clamp(sensorPitchRef.current + dragPitchRef.current, -1.12, 1.05);
  }, []);

  const handleMotion = useCallback((measurement: DeviceMotionMeasurement) => {
    const rotation = measurement.rotation;
    latestRotationRef.current = rotation;
    if (!calibrationRef.current) calibrationRef.current = rotation;
    const calibration = calibrationRef.current;
    sensorYawRef.current = normalizeAngle(rotation.alpha - calibration.alpha);
    sensorPitchRef.current = clamp(-(rotation.beta - calibration.beta), -1.05, 1.05);
    applyLook();
  }, [applyLook]);

  const enableMotion = useCallback(async () => {
    try {
      const permission = await DeviceMotion.requestPermissionsAsync();
      const available = permission.granted && await DeviceMotion.isAvailableAsync();
      sensorSubscriptionRef.current?.remove();
      sensorSubscriptionRef.current = null;
      if (!available) {
        setSensorLabel("Bewegingssensor niet beschikbaar · sleep om te kijken");
        return false;
      }
      DeviceMotion.setUpdateInterval(33);
      calibrationRef.current = null;
      sensorSubscriptionRef.current = DeviceMotion.addListener(handleMotion);
      setSensorLabel("Telefoon bewegen = rondkijken");
      return true;
    } catch {
      setSensorLabel("Geen sensortoegang · sleep om te kijken");
      return false;
    }
  }, [handleMotion]);

  const recalibrate = useCallback(() => {
    if (latestRotationRef.current) {
      calibrationRef.current = latestRotationRef.current;
      sensorYawRef.current = 0;
      sensorPitchRef.current = 0;
    }
    dragYawRef.current = 0;
    dragPitchRef.current = 0;
    applyLook();
    setSensorLabel("Vooruit opnieuw ingesteld");
  }, [applyLook]);

  const startRun = useCallback(async () => {
    await enableMotion();
    const now = performance.now();
    setRunState(createButterflyCatchRun(now));
    setSwingRequestId(0);
    lastSwingAtRef.current = 0;
    submittedRunRef.current = null;
    setSaveStatus("idle");
    setCatchLabel("");
    setAimState({ progress: 0, targetName: null, tracking: false });
    setCaptureHolding(false);
    setFocusProgress(0);
    swingFocusRef.current = 0;
    setScreenState("running");
  }, [enableMotion]);

  useEffect(() => {
    if (screenState !== "running") return;
    const timer = setInterval(() => {
      const now = performance.now();
      setRunState((current) => {
        if (!current) return current;
        return advanceButterflyCatchRun(current, now);
      });
    }, 50);
    return () => clearInterval(timer);
  }, [screenState]);

  useEffect(() => {
    if (runState?.phase === "finished") setScreenState("finished");
  }, [runState?.phase]);

  useEffect(() => {
    if (screenState !== "running" || !captureHolding) return;
    const timer = setInterval(() => {
      const nextFocus = clamp((performance.now() - captureStartedAtRef.current) / 720, 0, 1);
      swingFocusRef.current = nextFocus;
      setFocusProgress(nextFocus);
    }, 16);
    return () => clearInterval(timer);
  }, [captureHolding, screenState]);

  const persistRun = useCallback(async (finishedRun: ButterflyCatchRunState, retry = false) => {
    if (finishedRun.finishReason !== "time") return;
    if (!retry && submittedRunRef.current === finishedRun.startedAtMs) return;
    submittedRunRef.current = finishedRun.startedAtMs;
    setSaveStatus("saving");
    try {
      const result = butterflyCatchResult(finishedRun);
      let nextBestScore = bestScore;
      if (onResult) {
        const arcadeResult = practice
          ? butterflyCatchArcadeResult(result, bestScore)
          : await createButterflyCatchArcadeResult(user, result);
        await onResult(arcadeResult);
        nextBestScore = arcadeResult.localHighScore;
      } else {
        nextBestScore = await saveButterflyCatchResult(user, result);
      }
      setBestScore(nextBestScore);
      setSaveStatus("saved");
    } catch {
      setBestScore((current) => Math.max(current, finishedRun.score));
      setSaveStatus("error");
    }
  }, [bestScore, onResult, practice, user]);

  useEffect(() => {
    if (runState?.phase !== "finished" || runState.finishReason !== "time") return;
    void persistRun(runState);
  }, [persistRun, runState]);

  const performSwing = useCallback((quality: number) => {
    if (screenState !== "running") return;
    const now = performance.now();
    if (now - lastSwingAtRef.current < BUTTERFLY_CATCH_SWING_DURATION_MS) return;
    lastSwingAtRef.current = now;
    swingFocusRef.current = quality;
    setRunState((current) => current ? startButterflyCatchSwing(current, now) : current);
    setSwingRequestId((current) => current + 1);
  }, [screenState]);

  const beginCaptureHold = useCallback(() => {
    if (screenState !== "running") return;
    const now = performance.now();
    if (now - lastSwingAtRef.current < BUTTERFLY_CATCH_SWING_DURATION_MS) return;
    captureStartedAtRef.current = now;
    swingFocusRef.current = 0;
    setFocusProgress(0);
    setCaptureHolding(true);
    setCatchLabel("Blijf gericht · laat los in de gouden zone");
  }, [screenState]);

  const releaseCaptureHold = useCallback(() => {
    if (!captureHolding) return;
    const quality = clamp((performance.now() - captureStartedAtRef.current) / 720, 0, 1);
    setCaptureHolding(false);
    setFocusProgress(0);
    performSwing(quality);
  }, [captureHolding, performSwing]);

  const handleAimChange = useCallback((nextAimState: ButterflyCatchAimState) => {
    setAimState(nextAimState);
  }, []);

  const handleCatch = useCallback((bugName: string, points = 1) => {
    setRunState((current) => current ? recordButterflyCatch(current, points) : current);
    setCatchLabel(`${bugName} gevangen · +${points} punt${points === 1 ? "" : "en"}`);
    Vibration.vibrate(35);
  }, []);

  const handleMiss = useCallback(() => {
    const now = performance.now();
    setRunState((current) => current
      ? resolveButterflyCatchSwing(current, { butterflyInsideNet: false, nowMs: now })
      : current);
    setCatchLabel(swingFocusRef.current < 0.32
      ? "Te vroeg · bouw eerst focus op"
      : "Mis · volg de vliegroute en probeer opnieuw");
  }, []);

  const stopRun = useCallback(() => {
    setRunState((current) => current ? finishButterflyCatchRun(current, "stopped") : current);
    setScreenState("finished");
  }, []);

  const requestClose = useCallback(() => {
    if (screenState !== "running") {
      onClose();
      return;
    }
    if (ranked) {
      Alert.alert("Ranked run actief", "Deze 60-secondenrun eindigt automatisch wanneer de tijd om is.");
      return;
    }
    Alert.alert(
      "Run stoppen?",
      "Je huidige oefenrun wordt beëindigd.",
      [
        { text: "Doorgaan", style: "cancel" },
        { text: "Stop run", style: "destructive", onPress: stopRun },
      ],
    );
  }, [onClose, ranked, screenState, stopRun]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      dragStartRef.current = { yaw: dragYawRef.current, pitch: dragPitchRef.current };
    },
    onPanResponderMove: (_, gesture) => {
      dragYawRef.current = dragStartRef.current.yaw - gesture.dx * 0.0055;
      dragPitchRef.current = clamp(dragStartRef.current.pitch - gesture.dy * 0.0045, -1.05, 1.05);
      applyLook();
    },
    onPanResponderRelease: () => undefined,
  }), [applyLook]);

  const remainingSeconds = Math.ceil((runState?.remainingMs ?? 60_000) / 1_000);
  const accuracy = runState ? butterflyCatchAccuracy(runState) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        <ButterflyCatchNativeWorld
          lookRef={lookRef}
          onAimChange={handleAimChange}
          onCatch={handleCatch}
          onFpsChange={setFps}
          onMiss={handleMiss}
          runActive={screenState === "running"}
          swingFocusRef={swingFocusRef}
          swingRequestId={swingRequestId}
        />

        <View pointerEvents="box-none" style={styles.overlay}>
          <View style={styles.topBar}>
            <View style={styles.scorePill}>
              <Text style={styles.kicker}>VLEUGELJACHT 3D</Text>
              <Text style={styles.scoreText}>{runState?.catches ?? 0} gevangen · {runState?.score ?? 0} punten</Text>
            </View>
            <View style={styles.timerPill}>
              <Text style={styles.timerText}>{remainingSeconds}s</Text>
              <Text style={styles.fpsText}>{fps > 0 ? `${fps} FPS` : "3D"}</Text>
            </View>
          </View>

          {screenState === "running" ? (
            <>
              <View pointerEvents="none" style={styles.aimMarkerWrap}>
                <View style={[
                  styles.aimMarker,
                  aimState.tracking && styles.aimMarkerTracking,
                  aimState.progress >= 0.98 && styles.aimMarkerReady,
                ]}>
                  <View style={[
                    styles.aimMarkerProgress,
                    {
                      opacity: aimState.tracking ? 0.22 + aimState.progress * 0.46 : 0.08,
                      transform: [{ scale: 0.62 + aimState.progress * 0.38 }],
                    },
                  ]} />
                  <View style={styles.aimMarkerDot} />
                </View>
                <Text style={styles.aimMarkerLabel}>
                  {aimState.targetName
                    ? `${aimState.targetName} · ${Math.round(aimState.progress * 100)}%`
                    : "Richt op een insect"}
                </Text>
              </View>
              <View pointerEvents="none" style={styles.runHint}>
                <Text style={styles.runHintTitle}>{catchLabel || "Richt de marker op een insect"}</Text>
                <Text style={styles.runHintText}>Houd de marker 1,5 seconde gericht · afstand maakt niet uit</Text>
              </View>
              <View style={styles.bottomActions}>
                <Pressable accessibilityRole="button" onPress={recalibrate} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Herkalibreer</Text>
                </Pressable>
                {!ranked ? (
                  <Pressable accessibilityRole="button" onPress={requestClose} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Stop</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {screenState === "ready" ? (
            <View style={styles.panelWrap}>
              <View style={styles.panel}>
                <Text style={styles.panelKicker}>360° SCOREJACHT</Text>
                <Text style={styles.panelTitle}>Richt en vang</Text>
                <Text style={styles.panelBody}>
                  Je hebt 60 seconden. Richt de zichtbare marker 1,5 seconde op een insect. Elke zichtbare bug is vangbaar, ook als hij ver weg vliegt. Snellere bugs leveren meer punten op.
                </Text>
                <View style={styles.safetyBox}>
                  <Text style={styles.safetyText}>Blijf op één veilige plek staan en houd ruimte om je heen.</Text>
                </View>
                <Pressable accessibilityRole="button" onPress={startRun} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>START 60 SECONDEN</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Terug naar Play</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {screenState === "finished" ? (
            <View style={styles.panelWrap}>
              <View style={styles.panel}>
                <Text style={styles.panelKicker}>{ranked ? "RANKED RUN VOLTOOID" : "RUN VOLTOOID"}</Text>
                <Text style={styles.panelTitle}>{runState?.catches ?? 0} gevangen</Text>
                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultValue}>{runState?.catches ?? 0}</Text>
                    <Text style={styles.resultLabel}>VANGSTEN</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultItem}>
                    <Text style={styles.resultValue}>{runState?.score ?? 0}</Text>
                    <Text style={styles.resultLabel}>PUNTEN</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultItem}>
                    <Text style={styles.resultValue}>x{runState?.bestStreak ?? 0}</Text>
                    <Text style={styles.resultLabel}>BESTE COMBO</Text>
                  </View>
                </View>
                <Text style={styles.saveStatus}>
                  {runState?.finishReason === "stopped"
                    ? "Gestopte run is niet opgeslagen."
                    : saveStatus === "saved"
                      ? `${ranked ? "Ranked score ingediend" : practice ? "Training voltooid" : "Score opgeslagen"} · beste ${bestScore} punten`
                      : saveStatus === "error"
                        ? "Lokale highscore bewaard · database opslaan mislukt"
                        : "Score opslaan…"}
                </Text>
                {saveStatus === "error" && runState?.finishReason === "time" ? (
                  <Pressable accessibilityRole="button" onPress={() => { void persistRun(runState, true); }} style={styles.retrySaveButton}>
                    <Text style={styles.retrySaveText}>OPNIEUW OPSLAAN</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={startRun} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>OPNIEUW SPELEN</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.textButton}>
                  <Text style={styles.textButtonText}>{ranked ? "Terug naar Arena" : "Terug naar Play"}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.sensorStatus}>
            <Text style={styles.sensorStatusText}>{sensorLabel}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#07130e", flex: 1 },
  gameArea: { flex: 1, overflow: "hidden" },
  scene: { flex: 1 },
  aimMarkerWrap: { alignItems: "center", alignSelf: "center", position: "absolute", top: "36%" },
  aimMarker: {
    alignItems: "center",
    backgroundColor: "rgba(8,31,21,0.16)",
    borderColor: "rgba(255,239,174,0.82)",
    borderRadius: 50,
    borderWidth: 2,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  aimMarkerTracking: { borderColor: "#ffe26b", borderWidth: 4 },
  aimMarkerReady: { backgroundColor: "rgba(255,226,107,0.22)", borderColor: "#ffffff" },
  aimMarkerProgress: { ...StyleSheet.absoluteFillObject, backgroundColor: "#ffe26b", borderRadius: 50 },
  aimMarkerDot: { backgroundColor: "#fff8d2", borderRadius: 5, height: 9, width: 9 },
  aimMarkerLabel: {
    backgroundColor: "rgba(8,31,21,0.78)",
    borderRadius: 999,
    color: "#fff4bd",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 14 },
  topBar: { flexDirection: "row", justifyContent: "space-between" },
  scorePill: { backgroundColor: "rgba(8,31,21,0.82)", borderColor: "rgba(255,232,155,0.38)", borderRadius: 18, borderWidth: 1, minWidth: 154, paddingHorizontal: 14, paddingVertical: 10 },
  kicker: { color: "#bce7cb", fontSize: 8, fontWeight: "900", letterSpacing: 1.2 },
  scoreText: { color: "#fff3bd", fontSize: 16, fontWeight: "900", marginTop: 2 },
  timerPill: { alignItems: "center", backgroundColor: "rgba(8,31,21,0.82)", borderColor: "rgba(255,232,155,0.38)", borderRadius: 18, borderWidth: 1, minWidth: 72, paddingHorizontal: 12, paddingVertical: 8 },
  timerText: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  fpsText: { color: "#bce7cb", fontSize: 8, fontWeight: "800", marginTop: 1 },
  runHint: { alignSelf: "center", backgroundColor: "rgba(8,31,21,0.72)", borderColor: "rgba(255,255,255,0.16)", borderRadius: 16, borderWidth: 1, bottom: 150, maxWidth: 420, paddingHorizontal: 15, paddingVertical: 10, position: "absolute" },
  runHintTitle: { color: "#ffffff", fontSize: 12, fontWeight: "900", textAlign: "center" },
  runHintText: { color: "#cce6d5", fontSize: 10, fontWeight: "700", marginTop: 3, textAlign: "center" },
  captureControl: { alignItems: "center", alignSelf: "center", bottom: 18, position: "absolute", width: 242 },
  focusTrack: { backgroundColor: "rgba(8,31,21,0.9)", borderColor: "rgba(255,255,255,0.26)", borderRadius: 999, borderWidth: 1, height: 9, marginBottom: 8, overflow: "hidden", width: "88%" },
  focusTrackReady: { borderColor: "#ffe582" },
  focusFill: { backgroundColor: "#f1c44f", borderRadius: 999, height: "100%" },
  captureButton: { alignItems: "center", backgroundColor: "rgba(14,61,40,0.94)", borderColor: "rgba(255,232,155,0.52)", borderRadius: 22, borderWidth: 1, justifyContent: "center", minHeight: 58, paddingHorizontal: 18, width: "100%" },
  captureButtonHeld: { backgroundColor: "rgba(21,91,58,0.98)", transform: [{ scale: 0.98 }] },
  captureButtonReady: { backgroundColor: "#d9a82f", borderColor: "#fff4bd" },
  captureButtonText: { color: "#ffffff", fontSize: 10, fontWeight: "900", letterSpacing: 0.65, textAlign: "center" },
  bottomActions: { bottom: 14, flexDirection: "row", gap: 8, position: "absolute", right: 14 },
  secondaryButton: { backgroundColor: "rgba(8,31,21,0.84)", borderColor: "rgba(255,255,255,0.2)", borderRadius: 13, borderWidth: 1, minHeight: 42, justifyContent: "center", paddingHorizontal: 13 },
  secondaryButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  panelWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: "rgba(3,12,8,0.52)", justifyContent: "center", padding: 18 },
  panel: { backgroundColor: "rgba(17,42,28,0.96)", borderColor: "rgba(255,221,116,0.62)", borderRadius: 26, borderWidth: 1, maxWidth: 440, padding: 22, width: "100%" },
  panelKicker: { color: "#ffd977", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  panelTitle: { color: "#ffffff", fontSize: 28, fontWeight: "900", lineHeight: 31, marginTop: 5 },
  panelBody: { color: "#d9eee0", fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 12 },
  safetyBox: { backgroundColor: "rgba(255,221,116,0.1)", borderColor: "rgba(255,221,116,0.3)", borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 12 },
  safetyText: { color: "#fff1ba", fontSize: 11, fontWeight: "800", lineHeight: 16 },
  primaryButton: { alignItems: "center", backgroundColor: "#f5c84c", borderRadius: 16, justifyContent: "center", marginTop: 18, minHeight: 54, paddingHorizontal: 18 },
  primaryButtonText: { color: "#193021", fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
  textButton: { alignItems: "center", justifyContent: "center", marginTop: 10, minHeight: 40 },
  textButtonText: { color: "#d9eee0", fontSize: 11, fontWeight: "800" },
  resultRow: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 16, flexDirection: "row", marginTop: 16, minHeight: 78, paddingHorizontal: 8 },
  resultItem: { alignItems: "center", flex: 1 },
  resultValue: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  resultLabel: { color: "#bce7cb", fontSize: 7, fontWeight: "900", letterSpacing: 0.8, marginTop: 3 },
  resultDivider: { backgroundColor: "rgba(255,255,255,0.14)", height: 36, width: 1 },
  saveStatus: { color: "#cde8d6", fontSize: 10, fontWeight: "800", marginTop: 12, textAlign: "center" },
  retrySaveButton: { alignItems: "center", justifyContent: "center", marginTop: 8, minHeight: 34 },
  retrySaveText: { color: "#ffe089", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  sensorStatus: { alignSelf: "flex-start", backgroundColor: "rgba(8,31,21,0.7)", borderRadius: 999, bottom: 82, left: 14, paddingHorizontal: 11, paddingVertical: 7, position: "absolute" },
  sensorStatusText: { color: "#cde8d6", fontSize: 9, fontWeight: "800" },
});
