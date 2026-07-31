import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, DimensionValue, Image, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { createArcadeSeed, loadArcadeHighScore, saveArcadeHighScore, seededLane } from "../../services/arcadeResultService";
import { arcadeSquadAssistForUser } from "../../services/bugSquadGameBalance";
import { frameScaleForTick, startArcadeFrameLoop } from "../../services/gameLoopTiming";
import { useI18n } from "../../services/i18n";
import { playBugSound } from "../../services/soundService";
import { classifyWebRunnerGesture } from "../../services/webRunnerGesture";
import { ArcadeRunResult, User } from "../../types";
import { BugArtImage } from "../BugArtImage";
import { GameUiIcon } from "../ui/GameUiIcon";
import { ArcadeSquadAssist } from "./ArcadeSquadAssist";

type Props = { onBack: () => void; onResult?: (result: ArcadeRunResult) => void; practice?: boolean; ranked?: boolean; seed?: string; user: User };
type RunnerState = "ready" | "result" | "running";
type EntityKind = "boost" | "flyer" | "magnet" | "nectar" | "shield" | "web";
type RunnerEntity = { id: string; kind: EntityKind; lane: 0 | 1 | 2; y: number };
type RunnerStats = { combo: number; hitCount: number; maxCombo: number; pickups: number; scoreBonus: number; startAt: number };

const simulationStepMs = 75;
const tickMs = 16;
const playerY = 84;
const maxHits = 3;
const maxEntities = 42;
const jumpDurationMs = 620;
const difficultyRampMs = 52000;
const referencePlayfieldWidth = 360;
const maxPlayfieldScale = 2;
const gameZoomScale = 0.82;
const webRunnerTunnelImage = require("../../../assets/generated/web-runner-tunnel-v1.jpg");
const shieldEffectImage = require("../../../assets/generated/duel_effect_shield_hd.png");
const speedEffectImage = require("../../../assets/generated/duel_effect_lightning_hd.png");
const webEffectImage = require("../../../assets/generated/duel_effect_goo_hd.png");
const coinPickupImage = require("../../../assets/minigames/extracted/web_coin.png");
const gemPickupImage = require("../../../assets/minigames/extracted/web_gem.png");

const emptyStats = (): RunnerStats => ({ combo: 0, hitCount: 0, maxCombo: 0, pickups: 0, scoreBonus: 0, startAt: 0 });

export function WebRunnerGame({ onBack, onResult, practice = false, ranked = false, seed, user }: Props) {
  const { t } = useI18n();
  const squadAssist = useMemo(() => arcadeSquadAssistForUser(user), [user.activeBugSquad]);
  const [state, setState] = useState<RunnerState>("ready");
  const [bestScore, setBestScore] = useState(0);
  const [result, setResult] = useState<ArcadeRunResult | null>(null);
  const [lane, setLane] = useState<0 | 1 | 2>(1);
  const [entities, setEntities] = useState<RunnerEntity[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [jumpUntil, setJumpUntil] = useState(0);
  const [shield, setShield] = useState(false);
  const [magnetUntil, setMagnetUntil] = useState(0);
  const [boostUntil, setBoostUntil] = useState(0);
  const [playfieldScale, setPlayfieldScale] = useState(1);
  const finishingRef = useRef(false);
  const laneRef = useRef<0 | 1 | 2>(1);
  const jumpUntilRef = useRef(0);
  const shieldRef = useRef(false);
  const magnetUntilRef = useRef(0);
  const boostUntilRef = useRef(0);
  const seedRef = useRef(createArcadeSeed("web_runner", user.uid));
  const statsRef = useRef<RunnerStats>(emptyStats());
  const lastFrameAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    void loadArcadeHighScore(user.uid, "web_runner").then((value) => active && setBestScore(value));
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    if (state !== "running") return;
    return startArcadeFrameLoop(tick);
  }, [state, squadAssist.webRunner.collisionWindowBonus, squadAssist.webRunner.magnetBonusMs]);

  useEffect(() => {
    if (practice || state === "result") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [practice, state]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gesture) => {
      const action = classifyWebRunnerGesture(gesture.dx, gesture.dy);
      if (action === "jump") jump();
      if (action === "left") moveLane(-1);
      if (action === "right") moveLane(1);
    }
  }), [state]);

  function startRun() {
    finishingRef.current = false;
    const startedAt = Date.now();
    seedRef.current = seed ?? createArcadeSeed("web_runner", `${user.uid}:${startedAt}`);
    statsRef.current = { ...emptyStats(), startAt: startedAt };
    lastFrameAtRef.current = startedAt;
    laneRef.current = 1;
    jumpUntilRef.current = 0;
    jumpUntilRef.current = 0;
    shieldRef.current = squadAssist.webRunner.startShield;
    magnetUntilRef.current = 0;
    boostUntilRef.current = 0;
    setLane(1);
    setEntities([]);
    setScore(0);
    setHits(0);
    setCombo(0);
    setJumpUntil(0);
    setJumpUntil(0);
    setShield(squadAssist.webRunner.startShield);
    setMagnetUntil(0);
    setBoostUntil(0);
    setResult(null);
    setState("running");
    playBugSound("arcade_start");
  }

  function updatePlayfieldLayout(event: LayoutChangeEvent) {
    const { width } = event.nativeEvent.layout;
    const nextScale = gameZoomScale * Math.max(1, Math.min(maxPlayfieldScale, width / referencePlayfieldWidth));
    setPlayfieldScale((current) => Math.abs(current - nextScale) < 0.02 ? current : nextScale);
  }

  function tick() {
    const now = Date.now();
    const frameScale = frameScaleForTick(now, lastFrameAtRef.current, simulationStepMs);
    lastFrameAtRef.current = now;
    const elapsed = now - statsRef.current.startAt;
    setEntities((current) => {
      const speedBoost = now < boostUntilRef.current ? 0.18 : 0;
      const difficulty = runnerDifficulty(elapsed);
      const speed = (difficulty.speed + speedBoost) * frameScale;
      const moved = current.map((item) => ({ ...item, y: item.y + speed })).filter((item) => item.y < 112);
      const spawned = spawnPattern(moved, elapsed);
      const survivors: RunnerEntity[] = [];
      const collisionWindow = 5 + squadAssist.webRunner.collisionWindowBonus;
      for (const entity of spawned) {
        const magnetCatch = isPickup(entity.kind) && now < magnetUntilRef.current && Math.abs(entity.lane - laneRef.current) <= 1 && Math.abs(entity.y - playerY) < 18;
        const collides = entity.lane === laneRef.current && Math.abs(entity.y - playerY) <= collisionWindow;
        if (collides || magnetCatch) handleCollision(entity, now);
        else survivors.push(entity);
      }
      return survivors;
    });
    setScore(liveScore(elapsed, statsRef.current));
  }

  function spawnPattern(items: RunnerEntity[], elapsed: number): RunnerEntity[] {
    if (items.length >= maxEntities) return items;
    const lastY = Math.min(...items.map((item) => item.y), 100);
    const difficulty = runnerDifficulty(elapsed);
    if (lastY < difficulty.gap) return items;
    const step = Math.floor(elapsed / difficulty.spawnMs);
    const seedLane = seededLane(seedRef.current, step);
    const next: RunnerEntity[] = [];
    const lanes: Array<0 | 1 | 2> = [0, 1, 2];
    const pickupLane = lanes[(step + seedLane) % lanes.length];
    const safeLane = pickupLane;
    const pickupKind: EntityKind = step % 13 === 0 ? "shield" : step % 9 === 0 ? "magnet" : step % 7 === 0 ? "boost" : "nectar";
    next.push({ id: `${elapsed}:pickup`, kind: pickupKind, lane: pickupLane, y: -30 });
    lanes.filter((item) => item !== safeLane).forEach((obstacleLane, index) => {
      next.push({ id: `${elapsed}:hazard:${obstacleLane}`, kind: (step + index) % 3 === 0 ? "flyer" : "web", lane: obstacleLane, y: -8 - index * 12 });
    });
    if (difficulty.tier >= 1 && step % 4 === 0) next.push({ id: `${elapsed}:tier1-web`, kind: "web", lane: safeLane, y: -34 });
    if (difficulty.tier >= 2 && step % 5 === 0) next.push({ id: `${elapsed}:tier2-flyer`, kind: "flyer", lane: lanes[(safeLane + 1 + (step % 2)) % 3], y: -44 });
    if (difficulty.tier >= 3 && step % 6 === 0) next.push({ id: `${elapsed}:tier3-chain`, kind: "web", lane: lanes[(safeLane + 2) % 3], y: -56 });
    if (difficulty.tier >= 4 && step % 9 === 0) next.push({ id: `${elapsed}:tier4-pressure`, kind: "flyer", lane: lanes[(safeLane + step) % 3], y: -70 });
    if (difficulty.tier >= 5 && step % 3 === 0) next.push({ id: `${elapsed}:tier5-web`, kind: "web", lane: lanes[(safeLane + 1) % 3], y: -82 });
    if (difficulty.tier >= 6 && step % 4 === 0) next.push({ id: `${elapsed}:tier6-flyer`, kind: "flyer", lane: lanes[(safeLane + 2) % 3], y: -96 });
    if (difficulty.tier >= 7 && step % 5 === 0) next.push({ id: `${elapsed}:tier7-blocker`, kind: step % 2 === 0 ? "web" : "flyer", lane: safeLane, y: -110 });
    return [...items, ...next].slice(0, maxEntities);
  }

  function handleCollision(entity: RunnerEntity, now: number) {
    if (isPickup(entity.kind)) {
      playBugSound("arcade_pickup");
      statsRef.current.pickups += 1;
      statsRef.current.combo += 1;
      statsRef.current.maxCombo = Math.max(statsRef.current.maxCombo, statsRef.current.combo);
      statsRef.current.scoreBonus += entity.kind === "nectar" ? 12 : 18;
      if (entity.kind === "shield") {
        shieldRef.current = true;
        setShield(true);
      }
      if (entity.kind === "magnet") {
        magnetUntilRef.current = now + 5200 + squadAssist.webRunner.magnetBonusMs;
        setMagnetUntil(magnetUntilRef.current);
      }
      if (entity.kind === "boost") {
        boostUntilRef.current = now + 4200;
        setBoostUntil(boostUntilRef.current);
      }
      setCombo(statsRef.current.combo);
      return;
    }
    const jumping = now < jumpUntilRef.current;
    if ((entity.kind === "web" || entity.kind === "flyer") && jumping) {
      statsRef.current.combo += 1;
      statsRef.current.maxCombo = Math.max(statsRef.current.maxCombo, statsRef.current.combo);
      statsRef.current.scoreBonus += entity.kind === "flyer" ? 9 : 6;
      setCombo(statsRef.current.combo);
      return;
    }
    if (shieldRef.current) {
      playBugSound("arcade_hit");
      shieldRef.current = false;
      setShield(false);
      statsRef.current.combo = 0;
      setCombo(0);
      return;
    }
    statsRef.current.hitCount += 1;
    playBugSound("arcade_hit");
    statsRef.current.combo = 0;
    setHits(statsRef.current.hitCount);
    setCombo(0);
    if (statsRef.current.hitCount >= maxHits) finishRun();
  }

  function moveLane(delta: -1 | 1) {
    setLane((current) => {
      const next = Math.max(0, Math.min(2, current + delta)) as 0 | 1 | 2;
      laneRef.current = next;
      return next;
    });
  }

  function jump() {
    if (state !== "running") return;
    const now = Date.now();
    if (now < jumpUntilRef.current) return;
    jumpUntilRef.current = now + jumpDurationMs;
    setJumpUntil(jumpUntilRef.current);
  }

  function finishRun() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const elapsed = Math.max(0, Date.now() - statsRef.current.startAt);
    const resultDurationMs = Math.min(90000, elapsed);
    const finalScore = liveScore(elapsed, statsRef.current);
    playBugSound("arcade_finish");
    const highScorePromise = practice ? Promise.resolve(bestScore) : saveArcadeHighScore(user.uid, "web_runner", finalScore);
    void highScorePromise.then((highScore) => {
      if (!practice) setBestScore(highScore);
      const nextResult = { combo: statsRef.current.maxCombo, durationMs: resultDurationMs, hits: statsRef.current.hitCount, localHighScore: highScore, mode: "web_runner" as const, pickups: statsRef.current.pickups, score: finalScore, streak: statsRef.current.maxCombo, timestamp: new Date().toISOString() };
      setResult(nextResult);
      onResult?.(nextResult);
      setState("result");
    });
  }

  function back() {
    if (!practice && state !== "result") return;
    if (practice) {
      onBack();
      return;
    }
    if (state === "running") {
      Alert.alert(t("arcade.exitTitle"), t("arcade.exitBody"), [{ text: t("common.close"), style: "cancel" }, { text: t("arcade.backToArcade"), style: "destructive", onPress: onBack }]);
      return;
    }
    onBack();
  }

  const now = Date.now();
  const jumping = now < jumpUntil;
  const canJump = !jumping;
  const status = shield ? "Shield" : now < magnetUntil ? "Magnet" : now < boostUntil ? "Boost" : jumping ? "Jump" : `Combo ${combo}`;

  return (
    <View style={styles.shell}>
      {!(ranked && state === "running") && <View style={styles.header}>
        <View><Text style={styles.title}>{t("arcade.webRunner.title")}</Text><Text style={styles.meta}>Best score: {bestScore}</Text></View>
        {(practice || state === "result") && <Pressable accessibilityLabel="Back to games" style={styles.closeButton} onPress={back}><GameUiIcon name="back" size={24} /></Pressable>}
      </View>}
      {state === "ready" && <Ready onStart={startRun} />}
      {state === "running" && (
        <View style={styles.game} {...panResponder.panHandlers}>
          <View style={styles.hud}><Text style={styles.hudText}>{score}</Text><Text style={styles.hudText}>{maxHits - hits}/{maxHits} HP</Text><Text style={styles.hudText}>{status}</Text></View>
          <Pressable style={styles.playfield} onLayout={updatePlayfieldLayout} onPress={jump}>
            <Image source={webRunnerTunnelImage} resizeMode="cover" style={styles.backgroundArt} />
            <View style={styles.distanceShade} />
            <View style={styles.squadOverlay}><ArcadeSquadAssist compact label={`Squad ${squadAssist.activeCount}/3`} user={user} /></View>
            {[0, 1, 2].map((item) => (
              <View key={item} style={[styles.lane, lane === item && styles.activeLane]}>
                <Text style={[styles.laneLabel, lane === item && styles.activeLaneLabel]}>{item === 0 ? "LEFT" : item === 1 ? "MID" : "RIGHT"}</Text>
              </View>
            ))}
            {entities.map((entity) => <RunnerEntityView key={entity.id} entity={entity} scale={playfieldScale} />)}
            <View style={[styles.jumpArc, jumping && styles.jumpArcActive, { left: laneLeft(lane), transform: [{ scale: playfieldScale }] }]} />
            <View style={[styles.playerShadow, { left: laneLeft(lane), opacity: jumping ? 0.34 : 1, transform: [{ scale: jumping ? playfieldScale * 0.62 : playfieldScale }] }]} />
            <View style={[styles.player, jumping && styles.playerJump, { left: laneLeft(lane), transform: [{ scale: jumping ? playfieldScale * 1.12 : playfieldScale }] }]}>
              <LifePips current={maxHits - hits} max={maxHits} />
              {jumping && <Text style={styles.jumpBadge}>JUMP</Text>}
              {shield && <Image accessibilityIgnoresInvertColors resizeMode="contain" source={shieldEffectImage} style={styles.playerEffect} />}
              <BugArtImage bugId="fruitvlieg" fallbackVariant="dragonfly" size={58} />
            </View>
          </Pressable>
          <View style={styles.controls}>
            <Pressable style={styles.controlButton} onPress={() => moveLane(-1)}><Text style={styles.controlText}>Left</Text></Pressable>
            <Pressable disabled={!canJump} style={[styles.controlButton, styles.jumpButton, !canJump && styles.jumpButtonDisabled]} onPress={jump}>
              <Text style={styles.controlText}>{canJump ? "Jump webs" : "Landing"}</Text>
            </Pressable>
            <Pressable style={styles.controlButton} onPress={() => moveLane(1)}><Text style={styles.controlText}>Right</Text></Pressable>
          </View>
        </View>
      )}
      {state === "result" && result && <Result ranked={ranked} result={result} onBack={onBack} onRetry={startRun} />}
    </View>
  );
}

function Ready({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.panel}>
      <View style={styles.readyVisual}>
        <Image source={webRunnerTunnelImage} resizeMode="cover" style={styles.backgroundArt} />
        <View style={styles.readyVisualShade} />
        <View style={styles.readyVisualBug}><BugArtImage bugId="fruitvlieg" fallbackVariant="dragonfly" size={76} /></View>
      </View>
      <Text style={styles.panelTitle}>Run the web tunnel</Text>
      <Text style={styles.body}>Swipe left/right to dodge. Jump over sticky webs. Pick up nectar, shields, magnets, and boost.</Text>
      <Pressable style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryText}>Start</Text></Pressable>
    </View>
  );
}

function Result({ onBack, onRetry, ranked, result }: { onBack: () => void; onRetry: () => void; ranked: boolean; result: ArcadeRunResult }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Web Runner result</Text>
      <Text style={styles.score}>{result.score}</Text>
      <Text style={styles.body}>Best score: {result.localHighScore}</Text>
      <Text style={styles.body}>Pickups: {result.pickups} | Hits: {result.hits} | Combo: {result.combo}</Text>
      {!ranked && <Pressable style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Retry</Text></Pressable>}
      {!ranked && <Pressable style={styles.secondaryButton} onPress={onBack}><Text style={styles.secondaryText}>Back to Arena</Text></Pressable>}
    </View>
  );
}

function LifePips({ current, max }: { current: number; max: number }) {
  return (
    <View style={styles.lifePips}>
      {Array.from({ length: max }).map((_, index) => (
        <View key={index} style={[styles.lifePip, index >= current && styles.lifePipEmpty]} />
      ))}
    </View>
  );
}

function RunnerEntityView({ entity, scale }: { entity: RunnerEntity; scale: number }) {
  const left = laneLeft(entity.lane);
  const top = `${entity.y}%` as DimensionValue;
  if (entity.kind === "web") {
    return <View style={[styles.entity, styles.webEntity, { left, top, transform: [{ scale }] }]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={webEffectImage} style={styles.webArt} /></View>;
  }
  if (entity.kind === "flyer") {
    return <View style={[styles.entity, styles.flyerEntity, { left, top, transform: [{ rotate: "7deg" }, { scale }] }]}><Text style={styles.enemyLabel}>ENEMY</Text><BugArtImage bugId="hoornaar" fallbackVariant="dragonfly" size={64} /></View>;
  }
  if (entity.kind === "shield") {
    return <View style={[styles.entity, styles.pickupEntity, { left, top, transform: [{ scale }] }]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={shieldEffectImage} style={styles.pickupArt} /></View>;
  }
  if (entity.kind === "boost") {
    return <View style={[styles.entity, styles.pickupEntity, { left, top, transform: [{ scale }] }]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={speedEffectImage} style={styles.pickupArt} /></View>;
  }
  return (
    <View style={[styles.entity, styles.pickupEntity, entity.kind === "magnet" && styles.magnetEntity, { left, top, transform: [{ scale }] }]}>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={entity.kind === "magnet" ? gemPickupImage : coinPickupImage} style={styles.pickupArt} />
    </View>
  );
}

function laneLeft(lane: 0 | 1 | 2): DimensionValue {
  return `${16.666 + lane * 33.333}%` as DimensionValue;
}

function isPickup(kind: EntityKind) {
  return kind === "boost" || kind === "magnet" || kind === "nectar" || kind === "shield";
}

function runnerDifficulty(elapsedMs: number) {
  const progress = Math.min(1, elapsedMs / difficultyRampMs);
  const endgameTicks = elapsedMs > 60000 ? Math.floor((elapsedMs - 60000) / 7000) : 0;
  const tier = Math.min(10, Math.floor(elapsedMs / 14000) + endgameTicks);
  return {
    gap: Math.max(3, 21 - progress * 10 - endgameTicks * 1.8),
    spawnMs: Math.max(110, 720 - progress * 320 - endgameTicks * 55),
    speed: Math.min(7.4, 1.22 + progress * 1.25 + endgameTicks * 0.58),
    tier,
  };
}

function liveScore(elapsedMs: number, run: RunnerStats) {
  return Math.max(0, Math.round(elapsedMs / 1000) * 9 + run.pickups * 12 + run.maxCombo * 7 + run.scoreBonus - run.hitCount * 45);
}

const styles = StyleSheet.create({
  activeLane: { backgroundColor: "rgba(215,189,87,0.2)", borderColor: "#d7bd57", borderWidth: 3 },
  activeLaneLabel: { backgroundColor: "#d7bd57", color: "#102018" },
  backgroundArt: { bottom: 0, left: 0, opacity: 0.95, position: "absolute", right: 0, top: 0 },
  body: { color: "#dfe9df", fontSize: 15, fontWeight: "700", lineHeight: 22, textAlign: "center" },
  closeButton: { alignItems: "center", backgroundColor: "#f9fbf7", borderRadius: 10, height: 44, justifyContent: "center", width: 44 },
  closeText: { color: "#102018", fontSize: 24, fontWeight: "900" },
  controlButton: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.92)", borderRadius: 8, flex: 1, justifyContent: "center", minHeight: 46, overflow: "hidden" },
  controlText: { color: "#102018", fontSize: 14, fontWeight: "900" },
  controls: { backgroundColor: "#071d12", flexDirection: "row", gap: 8, paddingBottom: 12, paddingHorizontal: 12, paddingTop: 10 },
  distanceShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,29,18,0.26)" },
  enemyLabel: { backgroundColor: "#ef4444", borderColor: "#f9fbf7", borderRadius: 999, borderWidth: 1, color: "#f9fbf7", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 5, paddingVertical: 1, position: "absolute", top: -12, zIndex: 2 },
  entity: { alignItems: "center", height: 58, justifyContent: "center", marginLeft: -29, position: "absolute", width: 58, zIndex: 3 },
  flyerEntity: { backgroundColor: "rgba(239,68,68,0.24)", borderColor: "#ef4444", borderRadius: 18, borderWidth: 3, height: 72, marginLeft: -36, transform: [{ rotate: "7deg" }], width: 72 },
  game: { flex: 1, position: "relative" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 8 },
  hud: { backgroundColor: "rgba(7,29,18,0.9)", borderBottomColor: "rgba(215,189,87,0.55)", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 28, paddingBottom: 5, paddingHorizontal: 12, paddingTop: 2 },
  hudText: { color: "#d7bd57", fontSize: 13, fontWeight: "900" },
  jumpArc: { borderColor: "rgba(215,189,87,0.0)", borderRadius: 999, borderTopWidth: 0, bottom: 42, height: 90, marginLeft: -34, position: "absolute", width: 68, zIndex: 5 },
  jumpArcActive: { borderColor: "rgba(215,189,87,0.9)", borderStyle: "dashed", borderTopWidth: 4 },
  jumpBadge: { backgroundColor: "#102018", borderColor: "#d7bd57", borderRadius: 999, borderWidth: 1, color: "#d7bd57", fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 5, paddingVertical: 1, position: "absolute", top: -13 },
  jumpButton: { backgroundColor: "#d7bd57" },
  jumpButtonDisabled: { backgroundColor: "#9ca3af", opacity: 0.82 },
  jumpCooldownFill: { backgroundColor: "rgba(16,32,24,0.2)", bottom: 0, left: 0, position: "absolute", top: 0 },
  lane: { alignItems: "center", borderColor: "rgba(255,255,255,0.5)", borderRadius: 18, borderStyle: "dashed", borderWidth: 2, flex: 1, justifyContent: "flex-start", paddingTop: 44 },
  laneLabel: { backgroundColor: "rgba(16,32,24,0.7)", borderRadius: 999, color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 3 },
  lifePip: { backgroundColor: "#22c55e", borderColor: "#f9fbf7", borderRadius: 999, borderWidth: 1, height: 9, width: 20 },
  lifePipEmpty: { backgroundColor: "rgba(239,68,68,0.45)", borderColor: "rgba(249,251,247,0.45)" },
  lifePips: { flexDirection: "row", gap: 3, position: "absolute", top: -15, zIndex: 9 },
  magnetEntity: { backgroundColor: "rgba(56,189,248,0.22)", borderColor: "#38bdf8" },
  meta: { color: "#a9b8ae", fontSize: 12, fontWeight: "800" },
  panel: { alignItems: "center", backgroundColor: "rgba(16,32,24,0.94)", borderColor: "#d7bd57", borderRadius: 10, borderWidth: 1, gap: 14, margin: 16, padding: 18 },
  panelTitle: { color: "#f9fbf7", fontSize: 26, fontWeight: "900", textAlign: "center" },
  readyVisual: { alignItems: "center", borderColor: "rgba(215,189,87,0.72)", borderRadius: 16, borderWidth: 1, height: 150, justifyContent: "center", overflow: "hidden", position: "relative", width: "100%" },
  readyVisualShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4,18,12,0.28)" },
  readyVisualBug: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.90)", borderColor: "#d7bd57", borderRadius: 48, borderWidth: 3, height: 96, justifyContent: "center", width: 96 },
  pickupArt: { height: 58, width: 58 },
  pickupEntity: { backgroundColor: "rgba(215,189,87,0.18)", borderColor: "rgba(215,189,87,0.75)", borderRadius: 999, borderWidth: 2 },
  player: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.9)", borderColor: "#d7bd57", borderRadius: 18, borderWidth: 3, bottom: 24, height: 74, justifyContent: "center", marginLeft: -37, position: "absolute", width: 74, zIndex: 6 },
  playerEffect: { height: 88, opacity: 0.58, position: "absolute", width: 88 },
  playerJump: { bottom: 118, shadowColor: "#d7bd57", shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.75, shadowRadius: 14, transform: [{ scale: 1.12 }] },
  playerShadow: { backgroundColor: "rgba(0,0,0,0.26)", borderRadius: 999, bottom: 20, height: 14, marginLeft: -25, position: "absolute", width: 50, zIndex: 4 },
  playerShadowJump: { opacity: 0.34, transform: [{ scale: 0.62 }] },
  playfield: { flex: 1, flexDirection: "row", gap: 10, overflow: "hidden", padding: 14, paddingBottom: 28 },
  primaryButton: { alignItems: "center", backgroundColor: "#168251", borderRadius: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 20, width: "100%" },
  primaryText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  score: { color: "#d7bd57", fontSize: 56, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: "#d7e1d9", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 20, width: "100%" },
  secondaryText: { color: "#f9fbf7", fontSize: 16, fontWeight: "900" },
  shell: { backgroundColor: "#071d12", flex: 1 },
  squadOverlay: { position: "absolute", right: 10, top: 10, zIndex: 8 },
  title: { color: "#f9fbf7", fontSize: 24, fontWeight: "900" },
  webArt: { height: 70, opacity: 0.9, width: 70 },
  webEntity: { bottom: undefined }
});
