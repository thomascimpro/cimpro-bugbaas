import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, DimensionValue, GestureResponderEvent, Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { createArcadeSeed, loadArcadeHighScore, saveArcadeHighScore, seededNumber } from "../../services/arcadeResultService";
import { arcadeSquadAssistForUser } from "../../services/bugSquadGameBalance";
import { frameScaleForTick, startArcadeFrameLoop } from "../../services/gameLoopTiming";
import { playBugSound } from "../../services/soundService";
import { ArcadeRunResult, User } from "../../types";
import { BugArtImage } from "../BugArtImage";
import { GameUiIcon } from "../ui/GameUiIcon";
import { ArcadeSquadAssist } from "./ArcadeSquadAssist";

type Props = { onBack: () => void; onResult?: (result: ArcadeRunResult) => void; practice?: boolean; ranked?: boolean; seed?: string; user: User };
type State = "ready" | "result" | "running";
type EntityKind = "bird" | "heart" | "nectar" | "pollen" | "rain" | "shield" | "thorn" | "wind";
type Entity = { expiresAt?: number; id: string; kind: EntityKind; stationary?: boolean; x: number; y: number; vy: number };
type TapPulse = { id: string; x: number; y: number };
type BeeDirection = "down" | "right" | "up";

const simulationStepMs = 66;
const tickMs = 16;
const gravity = 0.34;
const liftImpulse = -3.85;
const horizontalImpulse = 1.35;
const maxPlayerX = 68;
const maxPickupX = 64;
const previewZoneStartX = 72;
const tailwindScoreBoostMs = 4200;
const maxHorizontalSpeed = 2.35;
const maxVerticalSpeed = 5.15;
const playerHitboxPx = 66;
const playerVisualPx = 78;
const leftControlStripWidth = 32;
const referenceSkyWidth = 390;
const phoneSkyWidthCutoff = 410;
const phoneGameScale = 0.68;
const minGameScale = 0.68;
const maxGameScale = 1.28;
const beeSpriteSheet = require("../../../assets/animated/Bumble Bee Sprite Sheet.png");
const shieldEffectImage = require("../../../assets/generated/duel_effect_shield_hd.png");
const windEffectImage = require("../../../assets/generated/duel_effect_lightning_hd.png");
const nectarImage = require("../../../assets/minigames/extracted/glide_nectar.png");
const pollenImage = require("../../../assets/minigames/extracted/glide_pollen.png");
const rainImage = require("../../../assets/minigames/extracted/glide_rain.png");
const thornImage = require("../../../assets/minigames/extracted/glide_thorn.png");

export function BugGlideGame({ onBack, onResult, practice = false, ranked = false, seed, user }: Props) {
  const squadAssist = useMemo(() => arcadeSquadAssistForUser(user), [user.activeBugSquad]);
  const [state, setState] = useState<State>("ready");
  const [bestScore, setBestScore] = useState(0);
  const [result, setResult] = useState<ArcadeRunResult | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [x, setX] = useState(18);
  const [y, setY] = useState(48);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shield, setShield] = useState(false);
  const [tailwind, setTailwind] = useState(false);
  const [tapPulses, setTapPulses] = useState<TapPulse[]>([]);
  const [beeFrame, setBeeFrame] = useState(0);
  const [beeDirection, setBeeDirection] = useState<BeeDirection>("right");
  const [gameScale, setGameScale] = useState(1);
  const entitiesRef = useRef<Entity[]>([]);
  const heartsRef = useRef(3);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const xRef = useRef(18);
  const yRef = useRef(48);
  const vxRef = useRef(0);
  const vyRef = useRef(0);
  const skySizeRef = useRef({ height: 1, width: 1 });
  const skyOriginRef = useRef({ measured: false, x: 0, y: 0 });
  const skyRef = useRef<View>(null);
  const gameScaleRef = useRef(1);
  const shieldUntilRef = useRef(0);
  const windUntilRef = useRef(0);
  const tapPulseIdRef = useRef(0);
  const lastTapSoundAtRef = useRef(0);
  const seedRef = useRef(createArcadeSeed("bug_glide", user.uid));
  const statsRef = useRef({ hits: 0, pickups: 0, startAt: 0 });
  const finishedRef = useRef(false);
  const lastFrameAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    void loadArcadeHighScore(user.uid, "bug_glide").then((value) => active && setBestScore(value));
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    if (state !== "running") return;
    return startArcadeFrameLoop(tick);
  }, [state, squadAssist.bugGlide.liftAssist, squadAssist.bugGlide.pickupRadiusBonus, squadAssist.bugGlide.shieldBonusMs]);

  useEffect(() => {
    if (practice || state === "result") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [practice, state]);

  function start() {
    const startingHearts = 3 + squadAssist.bugGlide.extraHeart;
    finishedRef.current = false;
    const startedAt = Date.now();
    seedRef.current = seed ?? createArcadeSeed("bug_glide", `${user.uid}:${startedAt}`);
    statsRef.current = { hits: 0, pickups: 0, startAt: startedAt };
    lastFrameAtRef.current = startedAt;
    entitiesRef.current = [];
    heartsRef.current = startingHearts;
    scoreRef.current = 0;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    xRef.current = 18;
    yRef.current = 48;
    vxRef.current = 0;
    vyRef.current = 0;
    shieldUntilRef.current = 0;
    windUntilRef.current = 0;
    lastTapSoundAtRef.current = 0;
    setEntities([]);
    setX(18);
    setY(48);
    setHearts(startingHearts);
    setScore(0);
    setStreak(0);
    setShield(false);
    setTailwind(false);
    setTapPulses([]);
    setBeeFrame(0);
    setBeeDirection("right");
    setResult(null);
    setState("running");
    playBugSound("arcade_start");
  }

  function tick() {
    const now = Date.now();
    const frameScale = frameScaleForTick(now, lastFrameAtRef.current, simulationStepMs);
    lastFrameAtRef.current = now;
    const elapsed = now - statsRef.current.startAt;
    if (shieldUntilRef.current > 0 && now >= shieldUntilRef.current) {
      shieldUntilRef.current = 0;
      setShield(false);
    }
    const windActive = now < windUntilRef.current;
    if (tailwind !== windActive) setTailwind(windActive);
    movePlayer(now, frameScale);
    setBeeFrame(Math.floor(elapsed / 100) % 4);
    setBeeDirection(vyRef.current < -0.45 ? "up" : vyRef.current > 1.25 ? "down" : "right");
    const moved = moveEntities(entitiesRef.current, elapsed, frameScale);
    const collided = resolveCollisions(moved, now);
    entitiesRef.current = spawnEntities(collided, elapsed);
    const tailwindBoost = now < windUntilRef.current ? 0.35 : 0;
    const edgeBonus = xRef.current > 58 ? 0.16 : 0;
    scoreRef.current += (0.2 + tailwindBoost + edgeBonus) * frameScale;
    setEntities(entitiesRef.current);
    setScore(Math.floor(scoreRef.current));
    if (heartsRef.current <= 0) finish();
  }

  function movePlayer(now: number, frameScale: number) {
    vxRef.current = clamp(vxRef.current * Math.pow(0.91, frameScale), -maxHorizontalSpeed, maxHorizontalSpeed);
    vyRef.current = clamp(vyRef.current * Math.pow(0.94, frameScale) + gravity * frameScale, -maxVerticalSpeed, maxVerticalSpeed);
    const skyWidth = skySizeRef.current.width > 1 ? skySizeRef.current.width : referenceSkyWidth;
    const leftCharacterBoundary = ((leftControlStripWidth + (playerVisualPx * gameScaleRef.current) / 2) / skyWidth) * 100;
    xRef.current = Math.max(leftCharacterBoundary, Math.min(maxPlayerX, xRef.current + vxRef.current * frameScale));
    yRef.current = Math.max(10, Math.min(82, yRef.current + vyRef.current * frameScale));
    if (xRef.current <= leftCharacterBoundary || xRef.current >= maxPlayerX) vxRef.current *= -0.3;
    if (yRef.current <= 10) vyRef.current = Math.max(0.8, vyRef.current * -0.2);
    if (yRef.current >= 82) vyRef.current = Math.min(0, vyRef.current * -0.35);
    setX(xRef.current);
    setY(yRef.current);
  }

  function updateSkyLayout(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    skySizeRef.current = { height, width };
    const nextScale = gameScaleForSkyWidth(width);
    gameScaleRef.current = nextScale;
    setGameScale((current) => Math.abs(current - nextScale) < 0.01 ? current : nextScale);
    skyRef.current?.measure((_x, _y, _width, _height, pageX, pageY) => {
      skyOriginRef.current = { measured: true, x: pageX, y: pageY };
    });
  }

  function tapSky(event: GestureResponderEvent) {
    if (state !== "running") return;
    const pointerButton = (event.nativeEvent as GestureResponderEvent["nativeEvent"] & { button?: number }).button;
    if (pointerButton !== undefined && pointerButton !== 0) return;
    const { height, width } = skySizeRef.current;
    const origin = skyOriginRef.current;
    const localX = origin.measured ? event.nativeEvent.pageX - origin.x : event.nativeEvent.locationX;
    const localY = origin.measured ? event.nativeEvent.pageY - origin.y : event.nativeEvent.locationY;
    const tapX = (localX / Math.max(1, width)) * 100;
    const tapY = (localY / Math.max(1, height)) * 100;
    const distanceFromBug = clamp((xRef.current - tapX) / 62, -1, 1);
    const lift = liftImpulse - squadAssist.bugGlide.liftAssist * 0.85;
    vxRef.current = clamp(vxRef.current + distanceFromBug * horizontalImpulse, -maxHorizontalSpeed, maxHorizontalSpeed);
    vyRef.current = clamp(Math.min(vyRef.current, 0) + lift, -maxVerticalSpeed, maxVerticalSpeed);
    const id = `tap-${tapPulseIdRef.current++}`;
    const now = Date.now();
    if (now - lastTapSoundAtRef.current > 90) {
      lastTapSoundAtRef.current = now;
      playBugSound("arcade_tap");
    }
    setTapPulses((current) => [...current.slice(-4), { id, x: tapX, y: tapY }]);
    setTimeout(() => setTapPulses((current) => current.filter((pulse) => pulse.id !== id)), 260);
  }

  function moveEntities(current: Entity[], elapsed: number, frameScale: number) {
    const difficulty = glideDifficulty(elapsed);
    const speed = Math.min(5.35, 2.02 + difficulty.speedLevel * 0.34);
    return current
      .map((item) => item.stationary ? item : { ...item, x: item.x - speed * frameScale, y: item.y + item.vy * frameScale })
      .filter((item) => (item.expiresAt === undefined || elapsed < item.expiresAt) && item.x > -12 && item.y > 2 && item.y < 96);
  }

  function spawnEntities(current: Entity[], elapsed: number) {
    const difficulty = glideDifficulty(elapsed);
    const maxEntities = 22 + difficulty.densityLevel * 2;
    if (current.length > maxEntities) return current;
    const interval = Math.max(155, 640 - difficulty.densityLevel * 58);
    if (elapsed % interval >= tickMs) return current;
    const step = Math.floor(elapsed / interval);
    const roll = seededNumber(seedRef.current, step);
    const bonusCrowded = current.filter((item) => isPickup(item.kind) && item.x > 78).length >= 3;
    const kind: EntityKind = bonusCrowded
      ? (roll > 0.5 ? "bird" : "rain")
      : step % 17 === 0 ? "heart" : step % 13 === 0 ? "shield" : step % 9 === 0 ? "wind" : step % 5 === 0 ? "nectar" : step % 7 === 0 ? "thorn" : roll > 0.64 ? "pollen" : roll > 0.44 ? "rain" : "bird";
    const baseY = 12 + Math.round(seededNumber(seedRef.current, step + 3) * 68);
    const stationary = kind === "heart" || kind === "shield";
    const x = stationary ? 14 + Math.round(seededNumber(seedRef.current, step + 5) * (maxPickupX - 14)) : 104;
    const y = isPickup(kind) ? spreadPickupY(current, baseY, x, step) : baseY;
    const expiresAt = stationary ? elapsed + 7000 : undefined;
    const vy = kind === "rain" ? 0.9 : kind === "pollen" ? Math.sin(step) * 0.35 : 0;
    const next = [...current, { expiresAt, id: `${elapsed}:${step}`, kind, stationary, x, y, vy }];
    if (difficulty.mode === "density") {
      if (elapsed > 15000 && step % 4 === 0) next.push({ id: `${elapsed}:${step}:pair`, kind: "thorn", x: 112, y: Math.max(12, Math.min(80, y + (step % 2 === 0 ? 18 : -18))), vy: 0 });
      if (elapsed > 30000 && step % 5 === 0) next.push({ id: `${elapsed}:${step}:rainline`, kind: "rain", x: 118, y: Math.max(12, Math.min(80, y - 12)), vy: 0.6 });
      if (elapsed > 46000 && step % 6 === 0) next.push({ id: `${elapsed}:${step}:birdline`, kind: "bird", x: 124, y: Math.max(12, Math.min(80, y + 12)), vy: 0 });
      if (elapsed > 60000 && step % 3 === 0) next.push({ id: `${elapsed}:${step}:endgame`, kind: step % 2 === 0 ? "thorn" : "bird", x: 132, y: Math.max(12, Math.min(80, y + (step % 2 === 0 ? -24 : 24))), vy: 0 });
      if (elapsed > 78000 && step % 4 === 0) next.push({ id: `${elapsed}:${step}:endrain`, kind: "rain", x: 140, y: Math.max(12, Math.min(80, y + 10)), vy: 0.8 });
    }
    return next;
  }

  function glideDifficulty(elapsed: number) {
    const stage = Math.max(0, Math.floor(elapsed / 12000));
    const pressure = Math.min(7, stage);
    const mode: "density" | "speed" = stage % 2 === 0 ? "density" : "speed";
    return {
      densityLevel: mode === "density" ? pressure : Math.max(0, pressure - 1),
      mode,
      speedLevel: mode === "speed" ? pressure : Math.max(0, pressure - 1)
    };
  }

  function spreadPickupY(current: Entity[], baseY: number, x: number, step: number) {
    let y = baseY;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const crowded = current.some((item) => isPickup(item.kind) && Math.abs(item.x - x) < 22 && Math.abs(item.y - y) < 16);
      if (!crowded) return y;
      const direction = (step + attempt) % 2 === 0 ? 1 : -1;
      y = Math.max(12, Math.min(80, y + direction * (18 + attempt * 6)));
    }
    return y;
  }

  function resolveCollisions(current: Entity[], now: number) {
    const survivors: Entity[] = [];
    for (const entity of current) {
      const hit = squareHit(entity);
      if (!hit) {
        survivors.push(entity);
        continue;
      }
      if (isPickup(entity.kind)) collect(entity, now);
      else takeHit(now);
    }
    return survivors;
  }

  function squareHit(entity: Entity) {
    const { height, width } = skySizeRef.current;
    const playerHalfX = ((playerHitboxPx * gameScaleRef.current) / Math.max(1, width)) * 50;
    const playerHalfY = ((playerHitboxPx * gameScaleRef.current) / Math.max(1, height)) * 50;
    const entitySize = entityHitboxPx(entity.kind) * gameScaleRef.current;
    const entityHalfX = (entitySize / Math.max(1, width)) * 50;
    const entityHalfY = (entitySize / Math.max(1, height)) * 50;
    return Math.abs(entity.x - xRef.current) <= playerHalfX + entityHalfX && Math.abs(entity.y - yRef.current) <= playerHalfY + entityHalfY;
  }

  function collect(entity: Entity, now: number) {
    statsRef.current.pickups += 1;
    playBugSound("arcade_pickup");
    streakRef.current += 1;
    maxStreakRef.current = Math.max(maxStreakRef.current, streakRef.current);
    scoreRef.current += entity.kind === "nectar" ? 65 : entity.kind === "pollen" ? 32 : entity.kind === "heart" ? 20 : entity.kind === "wind" ? 55 : 45;
    if (entity.kind === "heart") {
      const maxHearts = 3 + squadAssist.bugGlide.extraHeart;
      heartsRef.current = Math.min(maxHearts, heartsRef.current + 1);
      setHearts(heartsRef.current);
    }
    if (entity.kind === "shield") {
      shieldUntilRef.current = now + 6000 + squadAssist.bugGlide.shieldBonusMs;
      setShield(true);
    }
    if (entity.kind === "wind") {
      windUntilRef.current = now + tailwindScoreBoostMs;
      setTailwind(true);
    }
    setStreak(streakRef.current);
  }

  function takeHit(now: number) {
    if (now < shieldUntilRef.current) {
      playBugSound("arcade_hit");
      shieldUntilRef.current = 0;
      setShield(false);
      return;
    }
    statsRef.current.hits += 1;
    playBugSound("arcade_hit");
    streakRef.current = 0;
    heartsRef.current -= 1;
    setStreak(0);
    setHearts(heartsRef.current);
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsed = Math.max(0, Date.now() - statsRef.current.startAt);
    const resultDurationMs = Math.min(90000, elapsed);
    const finalScore = Math.max(0, Math.round(scoreRef.current) + Math.round(elapsed / 1000) * 2 + statsRef.current.pickups * 18 + maxStreakRef.current * 9 + heartsRef.current * 35 - statsRef.current.hits * 45);
    playBugSound("arcade_finish");
    const highScorePromise = practice ? Promise.resolve(bestScore) : saveArcadeHighScore(user.uid, "bug_glide", finalScore);
    void highScorePromise.then((highScore) => {
      if (!practice) setBestScore(highScore);
      const nextResult = { combo: maxStreakRef.current, durationMs: resultDurationMs, hits: statsRef.current.hits, localHighScore: highScore, mode: "bug_glide" as const, pickups: statsRef.current.pickups, score: finalScore, streak: heartsRef.current, timestamp: new Date().toISOString() };
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
      Alert.alert("Leave Bug Glide?", "Your run stops if you go back now.", [{ text: "Stay", style: "cancel" }, { text: "Leave", style: "destructive", onPress: onBack }]);
      return;
    }
    onBack();
  }

  const maxHearts = 3 + squadAssist.bugGlide.extraHeart;

  return (
    <View style={styles.shell}>
      <View style={styles.header}><View><Text style={styles.title}>Bug Glide</Text><Text style={styles.meta}>Best score: {bestScore}</Text></View>{(practice || state === "result") && <Pressable accessibilityLabel="Back to games" style={styles.closeButton} onPress={back}><GameUiIcon name="back" size={24} /></Pressable>}</View>
      {state === "ready" && <Ready onStart={start} />}
      {state === "running" && (
        <View style={styles.game}>
          <View style={styles.hud}>
            <HudChip icon="★" label={String(score)} />
            <HudChip active={shield} icon={shield ? "🛡" : "♥"} label={shield ? "Shield" : `${hearts}/${maxHearts}`} />
            <HudChip active={tailwind} icon={tailwind ? "↯" : "🔥"} label={tailwind ? "Wind" : `${streak}x`} />
          </View>
          <View
            ref={skyRef}
            style={styles.sky}
            onLayout={updateSkyLayout}
          >
            <View style={styles.glideBackdrop}>
              <View style={styles.moonGlow} />
              <View style={styles.windTrailOne} />
              <View style={styles.windTrailTwo} />
              <View style={styles.windTrailThree} />
              <View style={styles.leafOne} />
              <View style={styles.leafTwo} />
              <View style={styles.leafThree} />
              <View style={styles.pollenCloudOne} />
              <View style={styles.pollenCloudTwo} />
              <View style={styles.pollenCloudThree} />
            </View>
            <View pointerEvents="none" style={[styles.previewZone, { left: `${previewZoneStartX}%` }]} />
            <View pointerEvents="none" style={styles.leftControlStrip}><View style={styles.leftControlStripGrip} /></View>
            <View pointerEvents="none" style={[styles.flightZoneLine, { left: `${previewZoneStartX}%` }]} />
            <Text pointerEvents="none" style={[styles.previewLabel, { left: `${previewZoneStartX + 2}%` }]}>Incoming</Text>
            <View style={styles.skyShade} />
            <View style={styles.squadOverlay}><ArcadeSquadAssist compact label={`Squad ${squadAssist.activeCount}/3`} user={user} /></View>
            {entities.map((entity) => <EntityView key={entity.id} entity={entity} scale={gameScale} />)}
            {tapPulses.map((pulse) => <View key={pulse.id} pointerEvents="none" style={[styles.tapPulse, { left: `${pulse.x}%`, top: `${pulse.y}%` }]} />)}
            <View pointerEvents="none" style={[styles.player, { left: `${x}%`, top: `${y}%`, transform: [{ scale: gameScale }] }]}>
              <LifePips current={hearts} max={maxHearts} />
              <BeeSprite direction={beeDirection} frame={beeFrame} />
              {shield && <Image accessibilityIgnoresInvertColors resizeMode="contain" source={shieldEffectImage} style={styles.playerShield} />}
            </View>
            <Pressable accessibilityLabel="Steer Bug Glide" testID="bug-glide-sky-control" style={styles.skyTouchLayer} onPress={tapSky} />
          </View>
        </View>
      )}
      {state === "result" && result && <Result ranked={ranked} result={result} onBack={onBack} onRetry={start} />}
    </View>
  );
}

function BeeSprite({ direction, frame }: { direction: BeeDirection; frame: number }) {
  const row = direction === "up" ? 2 : direction === "down" ? 3 : 0;
  return (
    <View style={styles.beeSpriteFrame}>
      <Image accessibilityIgnoresInvertColors source={beeSpriteSheet} style={[styles.beeSpriteSheet, { left: -frame * 64, top: -row * 64 }]} />
    </View>
  );
}

function HudChip({ active = false, icon, label }: { active?: boolean; icon: string; label: string }) {
  return (
    <View style={[styles.hudChip, active && styles.hudChipActive]}>
      <Text style={styles.hudIcon}>{icon}</Text>
      <Text style={styles.hudText}>{label}</Text>
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

function Ready({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Keep the bug flying</Text>
      <Text style={styles.body}>Tap left or right of the bug to steer. Right strip previews incoming stuff.</Text>
      <View style={styles.legendGrid}>
        <LegendItem icon="🍯" label="Nectar" tone="good" />
        <LegendItem icon="✦" label="Pollen" tone="good" />
        <LegendItem icon="♥" label="Heart" tone="good" />
        <LegendItem icon="🛡" label="Shield" tone="good" />
        <LegendItem icon="↯" label="Wind" tone="good" />
        <LegendItem icon="!" label="Dodge" tone="bad" />
      </View>
      <Pressable style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryText}>Start</Text></Pressable>
    </View>
  );
}

function LegendItem({ icon, label, tone }: { icon: string; label: string; tone: "bad" | "good" }) {
  return (
    <View style={[styles.legendItem, tone === "bad" ? styles.legendBad : styles.legendGood]}>
      <Text style={styles.legendIcon}>{icon}</Text>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function Result({ onBack, onRetry, ranked, result }: { onBack: () => void; onRetry: () => void; ranked: boolean; result: ArcadeRunResult }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Bug Glide result</Text>
      <Text style={styles.score}>{result.score}</Text>
      <Text style={styles.body}>Best score: {result.localHighScore}</Text>
      <Text style={styles.body}>Pickups: {result.pickups} | Hits: {result.hits} | Streak: {result.combo}</Text>
      {!ranked && <Pressable style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Retry</Text></Pressable>}
      <Pressable style={ranked ? styles.primaryButton : styles.secondaryButton} onPress={onBack}><Text style={ranked ? styles.primaryText : styles.secondaryText}>Back to Arena</Text></Pressable>
    </View>
  );
}

function EntityView({ entity, scale }: { entity: Entity; scale: number }) {
  const position = { left: `${entity.x}%` as DimensionValue, top: `${entity.y}%` as DimensionValue, transform: [{ scale }] };
  if (entity.kind === "bird") return <View style={[styles.entity, styles.hazard, position]}><BugArtImage bugId="hoornaar" fallbackVariant="dragonfly" size={48} /></View>;
  if (entity.kind === "thorn") return <View style={[styles.entity, styles.thorn, position]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={thornImage} style={styles.objectImage} /></View>;
  if (entity.kind === "rain") return <View style={[styles.entity, styles.rain, position]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={rainImage} style={styles.objectImage} /></View>;
  if (entity.kind === "heart") return <View style={[styles.entity, styles.pickup, position]}><Text style={styles.heartPickup}>+</Text></View>;
  if (entity.kind === "shield") return <View style={[styles.entity, styles.pickup, position]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={shieldEffectImage} style={styles.objectImage} /></View>;
  if (entity.kind === "wind") return <View style={[styles.entity, styles.pickup, position]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={windEffectImage} style={styles.objectImage} /></View>;
  return <View style={[styles.entity, styles.pickup, position]}><Image accessibilityIgnoresInvertColors resizeMode="contain" source={entity.kind === "nectar" ? nectarImage : pollenImage} style={styles.objectImage} /></View>;
}

function isPickup(kind: EntityKind) {
  return kind === "heart" || kind === "nectar" || kind === "pollen" || kind === "shield" || kind === "wind";
}

function entityHitboxPx(kind: EntityKind) {
  if (kind === "bird") return 48;
  if (kind === "heart") return 44;
  return 52;
}

function gameScaleForSkyWidth(width: number) {
  if (width >= phoneSkyWidthCutoff) return clamp(width / referenceSkyWidth, minGameScale, maxGameScale);
  return clamp(Math.min(phoneGameScale, width / phoneSkyWidthCutoff), minGameScale, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  glideBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#061827", overflow: "hidden" },
  beeSpriteFrame: { height: 64, overflow: "hidden", width: 64 },
  beeSpriteSheet: { height: 256, position: "absolute", width: 256 },
  body: { color: "#dfe9df", fontSize: 15, fontWeight: "700", lineHeight: 22, textAlign: "center" },
  closeButton: { alignItems: "center", backgroundColor: "#f9fbf7", borderRadius: 10, height: 44, justifyContent: "center", width: 44 },
  closeText: { color: "#102018", fontSize: 24, fontWeight: "900" },
  entity: { alignItems: "center", height: 56, justifyContent: "center", marginLeft: -28, marginTop: -28, position: "absolute", width: 56, zIndex: 4 },
  game: { flex: 1, position: "relative" },
  leafOne: { backgroundColor: "#1f7a3f", borderRadius: 999, height: 120, left: -38, opacity: 0.55, position: "absolute", top: 82, transform: [{ rotate: "34deg" }], width: 54 },
  leafThree: { backgroundColor: "#5f8f2f", borderRadius: 999, bottom: 46, height: 150, opacity: 0.42, position: "absolute", right: -36, transform: [{ rotate: "-28deg" }], width: 62 },
  leafTwo: { backgroundColor: "#2f9e44", borderRadius: 999, height: 92, opacity: 0.36, position: "absolute", right: 28, top: 176, transform: [{ rotate: "-42deg" }], width: 42 },
  leftControlStrip: { alignItems: "center", backgroundColor: "rgba(7,29,18,0.82)", borderRightColor: "rgba(215,189,87,0.7)", borderRightWidth: 2, bottom: 0, justifyContent: "center", left: 0, position: "absolute", top: 0, width: leftControlStripWidth, zIndex: 12 },
  leftControlStripGrip: { backgroundColor: "rgba(249,251,247,0.7)", borderRadius: 999, height: 58, width: 4 },
  lifePip: { backgroundColor: "#22c55e", borderColor: "#f9fbf7", borderRadius: 999, borderWidth: 1, height: 9, width: 20 },
  lifePipEmpty: { backgroundColor: "rgba(239,68,68,0.45)", borderColor: "rgba(249,251,247,0.45)" },
  lifePips: { flexDirection: "row", gap: 3, position: "absolute", top: -14, zIndex: 9 },
  moonGlow: { backgroundColor: "rgba(255,244,191,0.42)", borderRadius: 999, height: 96, opacity: 0.8, position: "absolute", right: 36, top: 34, width: 96 },
  pollenCloudOne: { backgroundColor: "rgba(245,159,0,0.42)", borderRadius: 999, height: 18, left: 80, position: "absolute", top: 86, width: 18 },
  pollenCloudThree: { backgroundColor: "rgba(245,159,0,0.32)", borderRadius: 999, bottom: 134, height: 15, position: "absolute", right: 96, width: 15 },
  pollenCloudTwo: { backgroundColor: "rgba(255,244,191,0.36)", borderRadius: 999, height: 12, left: 168, position: "absolute", top: 190, width: 12 },
  hazard: { backgroundColor: "rgba(239,68,68,0.18)", borderColor: "#ef4444", borderRadius: 14, borderWidth: 3 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 8 },
  heartPickup: { color: "#f9fbf7", fontSize: 40, fontWeight: "900", lineHeight: 44 },
  hud: { backgroundColor: "rgba(7,29,18,0.9)", borderBottomColor: "rgba(215,189,87,0.55)", borderBottomWidth: 1, flexDirection: "row", gap: 7, justifyContent: "space-between", minHeight: 34, paddingBottom: 5, paddingHorizontal: 12, paddingTop: 4 },
  hudChip: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.08)", borderColor: "rgba(215,189,87,0.28)", borderRadius: 999, borderWidth: 1, flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", minHeight: 25, paddingHorizontal: 7 },
  hudChipActive: { backgroundColor: "rgba(34,197,94,0.2)", borderColor: "#22c55e" },
  hudIcon: { color: "#f9fbf7", fontSize: 12, fontWeight: "900" },
  hudText: { color: "#d7bd57", fontSize: 12, fontWeight: "900" },
  legendBad: { backgroundColor: "rgba(239,68,68,0.16)", borderColor: "rgba(239,68,68,0.72)" },
  legendGood: { backgroundColor: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.62)" },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" },
  legendIcon: { color: "#f9fbf7", fontSize: 16, fontWeight: "900" },
  legendItem: { alignItems: "center", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, minHeight: 32, paddingHorizontal: 10 },
  legendLabel: { color: "#f9fbf7", fontSize: 12, fontWeight: "900" },
  meta: { color: "#a9b8ae", fontSize: 12, fontWeight: "800" },
  objectImage: { height: 52, width: 52 },
  panel: { alignItems: "center", backgroundColor: "rgba(16,32,24,0.94)", borderColor: "#d7bd57", borderRadius: 10, borderWidth: 1, gap: 14, margin: 16, padding: 18 },
  panelTitle: { color: "#f9fbf7", fontSize: 26, fontWeight: "900", textAlign: "center" },
  pickup: { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "#22c55e", borderRadius: 999, borderWidth: 3 },
  player: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.1)", borderColor: "#d7bd57", borderRadius: 18, borderWidth: 2, height: 78, justifyContent: "center", marginLeft: -39, marginTop: -39, position: "absolute", width: 78, zIndex: 6 },
  playerShield: { height: 92, opacity: 0.72, position: "absolute", width: 92, zIndex: 10 },
  primaryButton: { alignItems: "center", backgroundColor: "#168251", borderRadius: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 20, width: "100%" },
  primaryText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  previewLabel: { color: "rgba(249,251,247,0.58)", fontSize: 10, fontWeight: "900", letterSpacing: 1, position: "absolute", textTransform: "uppercase", top: 50, zIndex: 2 },
  previewZone: { backgroundColor: "rgba(215,189,87,0.08)", borderLeftColor: "rgba(215,189,87,0.28)", borderLeftWidth: 1, bottom: 0, position: "absolute", right: 0, top: 0, zIndex: 1 },
  flightZoneLine: { backgroundColor: "rgba(249,251,247,0.28)", bottom: 0, position: "absolute", top: 0, width: 2, zIndex: 2 },
  rain: { backgroundColor: "rgba(239,68,68,0.18)", borderColor: "#ef4444", borderRadius: 14, borderWidth: 3 },
  score: { color: "#d7bd57", fontSize: 56, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: "#d7e1d9", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 20, width: "100%" },
  secondaryText: { color: "#f9fbf7", fontSize: 16, fontWeight: "900" },
  shell: { backgroundColor: "#071d12", flex: 1 },
  sky: { flex: 1, overflow: "hidden" },
  skyTouchLayer: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  skyShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,12,18,0.18)" },
  squadOverlay: { position: "absolute", right: 10, top: 10, zIndex: 8 },
  tapPulse: { backgroundColor: "rgba(215,189,87,0.28)", borderColor: "rgba(249,251,247,0.75)", borderRadius: 999, borderWidth: 2, height: 44, marginLeft: -22, marginTop: -22, position: "absolute", width: 44, zIndex: 3 },
  thorn: { backgroundColor: "rgba(239,68,68,0.18)", borderColor: "#ef4444", borderRadius: 14, borderWidth: 3 },
  title: { color: "#f9fbf7", fontSize: 24, fontWeight: "900" },
  windTrailOne: { backgroundColor: "rgba(120,210,255,0.18)", borderRadius: 999, height: 4, left: -40, position: "absolute", top: 128, transform: [{ rotate: "-12deg" }], width: 340 },
  windTrailThree: { backgroundColor: "rgba(249,251,247,0.12)", borderRadius: 999, bottom: 104, height: 3, left: 18, position: "absolute", transform: [{ rotate: "-18deg" }], width: 280 },
  windTrailTwo: { backgroundColor: "rgba(156,54,181,0.16)", borderRadius: 999, height: 5, left: 44, position: "absolute", top: 238, transform: [{ rotate: "-16deg" }], width: 360 }
});
