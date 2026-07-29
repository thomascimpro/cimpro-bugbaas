import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, DimensionValue, Image, ImageBackground, Platform as RNPlatform, Pressable, StyleSheet, Text, View } from "react-native";
import { createArcadeSeed, loadArcadeHighScore, saveArcadeHighScore, seededNumber } from "../../services/arcadeResultService";
import { arcadeSquadAssistForUser } from "../../services/bugSquadGameBalance";
import { towerJumpVelocity, towerPlatformGap, towerPlatformX, towerScrollSpeed } from "../../services/bugTowerBalance";
import { frameScaleForTick, startArcadeFrameLoop } from "../../services/gameLoopTiming";
import { playBugSound } from "../../services/soundService";
import { ArcadeRunResult, User } from "../../types";
import { GameUiIcon } from "../ui/GameUiIcon";
import { ArcadeSquadAssist } from "./ArcadeSquadAssist";

type Props = { onBack: () => void; onResult?: (result: ArcadeRunResult) => void; practice?: boolean; ranked?: boolean; seed?: string; user: User };
type GameState = "ready" | "result" | "running";
type Platform = { drift: number; floor: number; id: string; width: number; x: number; y: number };
type TowerPickup = { id: string; kind: "coin" | "rocket" | "spring"; x: number; y: number };
type Player = { grounded: boolean; highJump: boolean; lastGroundAt: number; spinAngle: number; spinning: boolean; vx: number; vy: number; x: number; y: number };
type RenderState = { chainProgress: number; chainUntil: number; charge: number; combo: number; elapsed: number; floor: number; maxCombo: number; pickups: TowerPickup[]; platforms: Platform[]; player: Player; rocketActive: boolean; score: number; springReady: boolean };

const simulationStepMs = 20;
const tickMs = 16;
const gravity = 0.145;
const horizontalAcceleration = 0.035;
const maxHorizontalSpeed = 0.6;
const playerHalfWidth = 6.5;
const playerHalfHeight = 5.2;
const landingChainWindowMs = 360;
const rocketDurationMs = 3000;
const rocketClimbSpeed = -0.76;
const towerBackground = require("../../../assets/minigames/bug-tower/bug-tower-background.jpg");
const towerJungleBackground = require("../../../assets/minigames/bug-tower/bug-tower-jungle.jpg");
const towerForgeBackground = require("../../../assets/minigames/bug-tower/bug-tower-forge.jpg");
const towerSkyBackground = require("../../../assets/minigames/bug-tower/bug-tower-sky.jpg");
const towerVoidBackground = require("../../../assets/minigames/bug-tower/bug-tower-void.jpg");
const towerBackgrounds = [towerBackground, towerJungleBackground, towerForgeBackground, towerSkyBackground, towerVoidBackground];
const beetleSpriteSheet = require("../../../assets/minigames/bug-tower/bug-tower-beetle.webp");
const webHoldStyle = RNPlatform.OS === "web"
  ? ({ touchAction: "none", userSelect: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" } as any)
  : undefined;

export function BugTowerGame({ onBack, onResult, practice = false, ranked = false, seed, user }: Props) {
  const squadAssist = useMemo(() => arcadeSquadAssistForUser(user), [user.activeBugSquad]);
  const [state, setState] = useState<GameState>("ready");
  const [bestScore, setBestScore] = useState(0);
  const [result, setResult] = useState<ArcadeRunResult | null>(null);
  const [heldDirection, setHeldDirection] = useState<-1 | 0 | 1>(0);
  const [renderState, setRenderState] = useState<RenderState>(() => initialRenderState("preview"));
  const playerRef = useRef<Player>(initialPlayer());
  const platformsRef = useRef<Platform[]>([]);
  const pickupsRef = useRef<TowerPickup[]>([]);
  const seedRef = useRef(createArcadeSeed("bug_tower", user.uid));
  const nextFloorRef = useRef(1);
  const landedFloorRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const startAtRef = useRef(0);
  const finishedRef = useRef(false);
  const manualDirectionRef = useRef(-0 as -1 | 0 | 1);
  const runDistanceRef = useRef(0);
  const landedAtRef = useRef(0);
  const landingChainUntilRef = useRef(0);
  const coinsCollectedRef = useRef(0);
  const rocketUntilRef = useRef(0);
  const rocketCooldownUntilRef = useRef(0);
  const springReadyRef = useRef(false);
  const lastFrameAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    void loadArcadeHighScore(user.uid, "bug_tower").then((value) => active && setBestScore(value));
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    if (state !== "running") return;
    return startArcadeFrameLoop(tick);
  }, [state]);

  useEffect(() => {
    if (practice || state === "result") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [practice, state]);

  useEffect(() => {
    if (RNPlatform.OS !== "web" || typeof document === "undefined") return;
    const releaseWebHold = () => {
      const direction = manualDirectionRef.current;
      if (direction !== 0) releaseRun(direction);
    };
    document.addEventListener("pointerup", releaseWebHold, true);
    window.addEventListener("blur", releaseWebHold);
    return () => {
      document.removeEventListener("pointerup", releaseWebHold, true);
      window.removeEventListener("blur", releaseWebHold);
    };
  }, [state]);

  function start() {
    seedRef.current = seed ?? createArcadeSeed("bug_tower", `${user.uid}:${Date.now()}`);
    const initial = buildInitialPlatforms(seedRef.current);
    const initialPickups = initial.map((platform) => createTowerPickup(platform, seedRef.current)).filter((pickup): pickup is TowerPickup => Boolean(pickup));
    playerRef.current = initialPlayer();
    platformsRef.current = initial;
    pickupsRef.current = initialPickups;
    nextFloorRef.current = initial.length;
    landedFloorRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    startAtRef.current = Date.now();
    lastFrameAtRef.current = startAtRef.current;
    finishedRef.current = false;
    manualDirectionRef.current = 0;
    runDistanceRef.current = 0;
    landedAtRef.current = Date.now();
    landingChainUntilRef.current = 0;
    coinsCollectedRef.current = 0;
    rocketUntilRef.current = 0;
    rocketCooldownUntilRef.current = 0;
    springReadyRef.current = false;
    setResult(null);
    setHeldDirection(0);
    setRenderState({ chainProgress: 0, chainUntil: 0, charge: 0, combo: 0, elapsed: 0, floor: 0, maxCombo: 0, pickups: initialPickups, platforms: initial, player: initialPlayer(), rocketActive: false, score: 0, springReady: false });
    setState("running");
    playBugSound("arcade_start");
  }

  function tick() {
    if (finishedRef.current) return;
    const now = Date.now();
    const frameScale = frameScaleForTick(now, lastFrameAtRef.current, simulationStepMs);
    lastFrameAtRef.current = now;
    const elapsed = now - startAtRef.current;
    const previous = playerRef.current;
    const input = manualDirectionRef.current;
    const rocketActive = rocketUntilRef.current > now;
    const friction = Math.pow(previous.grounded ? 0.84 : 0.995, frameScale);
    const vx = input
      ? clamp(previous.vx * Math.pow(0.96, frameScale) + input * horizontalAcceleration * frameScale, -maxHorizontalSpeed, maxHorizontalSpeed)
      : previous.vx * friction;
    if (previous.grounded && input) runDistanceRef.current = Math.min(32, runDistanceRef.current + Math.abs(vx) * frameScale);
    const nextVy = rocketActive ? rocketClimbSpeed : Math.min(2.25, previous.vy + gravity * frameScale);
    let nextPlayer: Player = {
      ...previous,
      grounded: false,
      spinAngle: previous.spinning ? previous.spinAngle + Math.sign(previous.vx || input || 1) * 18 * frameScale : 0,
      vx,
      vy: nextVy,
      x: previous.x + vx * frameScale,
      y: previous.y + (rocketActive ? rocketClimbSpeed : nextVy) * frameScale
    };

    if (nextPlayer.x <= playerHalfWidth) {
      nextPlayer.x = playerHalfWidth;
      nextPlayer.vx = Math.abs(nextPlayer.vx) * 0.9;
    } else if (nextPlayer.x >= 100 - playerHalfWidth) {
      nextPlayer.x = 100 - playerHalfWidth;
      nextPlayer.vx = -Math.abs(nextPlayer.vx) * 0.9;
    }

    const scroll = towerScrollSpeed(landedFloorRef.current, elapsed) * frameScale;
    let platforms = platformsRef.current.map((platform) => movePlatform(platform, scroll));
    let pickups = pickupsRef.current.map((pickup) => ({ ...pickup, y: pickup.y + scroll }));
    nextPlayer.y += scroll;

    const oldBottom = previous.y + playerHalfHeight + scroll;
    const nextBottom = nextPlayer.y + playerHalfHeight;
    if (nextPlayer.vy >= 0) {
      const landing = platforms
        .filter((platform) => oldBottom <= platform.y + 0.8 && nextBottom >= platform.y - 0.5)
        .filter((platform) => nextPlayer.x + playerHalfWidth >= platform.x && nextPlayer.x - playerHalfWidth <= platform.x + platform.width)
        .sort((a, b) => a.y - b.y)[0];
      if (landing) {
        const chainLanding = previous.highJump || previous.spinning;
        nextPlayer.y = landing.y - playerHalfHeight;
        nextPlayer.vy = 0;
        nextPlayer.grounded = true;
        nextPlayer.highJump = false;
        nextPlayer.lastGroundAt = now;
        nextPlayer.spinAngle = 0;
        nextPlayer.spinning = false;
        landingChainUntilRef.current = chainLanding ? now + landingChainWindowMs : 0;
        if (landing.floor > landedFloorRef.current) landOnFloor(landing.floor, now);
      }
    }

    const collected = pickups.filter((pickup) => (
      (pickup.kind !== "rocket" || rocketCooldownUntilRef.current <= now)
      && Math.abs(pickup.x - nextPlayer.x) <= 7.5
      && Math.abs(pickup.y - nextPlayer.y) <= 7.5
    ));
    if (collected.length) {
      const collectedIds = new Set(collected.map((pickup) => pickup.id));
      pickups = pickups.filter((pickup) => !collectedIds.has(pickup.id));
      collected.forEach((pickup) => {
        if (pickup.kind === "coin") {
          coinsCollectedRef.current += 1;
          scoreRef.current += 45;
          playBugSound("arcade_pickup");
        } else if (pickup.kind === "rocket" && rocketCooldownUntilRef.current <= now) {
          rocketUntilRef.current = now + rocketDurationMs;
          rocketCooldownUntilRef.current = now + 9000;
          playBugSound("arcade_build");
        } else if (pickup.kind === "spring") {
          springReadyRef.current = true;
          scoreRef.current += 100;
          playBugSound("arcade_pickup");
        }
      });
    }

    if (nextPlayer.y < 36) {
      const cameraShift = 36 - nextPlayer.y;
      nextPlayer.y = 36;
      platforms = platforms.map((platform) => ({ ...platform, y: platform.y + cameraShift }));
      pickups = pickups.map((pickup) => ({ ...pickup, y: pickup.y + cameraShift }));
    }

    platforms = platforms.filter((platform) => platform.y < 108);
    pickups = pickups.filter((pickup) => pickup.y < 108);
    while (platforms.length === 0 || Math.min(...platforms.map((platform) => platform.y)) > -12) {
      const highest = platforms.reduce<Platform | null>((best, platform) => !best || platform.y < best.y ? platform : best, null);
      const next = createPlatform(highest, nextFloorRef.current, seedRef.current);
      platforms.push(next);
      const pickup = createTowerPickup(next, seedRef.current);
      if (pickup) pickups.push(pickup);
      nextFloorRef.current += 1;
    }

    playerRef.current = nextPlayer;
    platformsRef.current = platforms;
    pickupsRef.current = pickups;
    scoreRef.current += (0.08 + Math.max(0, comboRef.current - 1) * 0.012) * frameScale;
    setRenderState({
      chainProgress: clamp((landingChainUntilRef.current - now) / landingChainWindowMs, 0, 1),
      chainUntil: landingChainUntilRef.current,
      charge: Math.round(clamp(runDistanceRef.current / 32, 0, 1) * 100),
      combo: comboRef.current,
      elapsed,
      floor: landedFloorRef.current,
      maxCombo: maxComboRef.current,
      pickups,
      platforms,
      player: nextPlayer,
      rocketActive: rocketUntilRef.current > now,
      score: Math.floor(scoreRef.current),
      springReady: springReadyRef.current
    });

    if (rocketUntilRef.current <= now && nextPlayer.y - playerHalfHeight > 105) finish();
  }

  function beginRun(direction: -1 | 1) {
    if (state !== "running") return;
    tryLandingChain();
    if (manualDirectionRef.current !== direction) runDistanceRef.current = 0;
    manualDirectionRef.current = direction;
    setHeldDirection(direction);
  }

  function releaseRun(direction: -1 | 1) {
    if (manualDirectionRef.current !== direction) return;
    manualDirectionRef.current = 0;
    setHeldDirection(0);
    jumpFromRun();
  }

  function jumpFromRun() {
    if (state !== "running") return;
    const now = Date.now();
    const player = playerRef.current;
    if (!player.grounded && now - player.lastGroundAt > 190) {
      runDistanceRef.current = 0;
      return;
    }
    const speed = clamp(Math.abs(player.vx) / maxHorizontalSpeed, 0, 1);
    const charge = clamp(runDistanceRef.current / 32, 0, 1);
    const jumpVelocity = towerJumpVelocity(speed, charge, springReadyRef.current);
    const spinning = springReadyRef.current || (speed >= 0.72 && charge >= 0.58);
    springReadyRef.current = false;
    playerRef.current = { ...player, grounded: false, highJump: jumpVelocity < -2.15, spinAngle: 0, spinning, vy: jumpVelocity };
    landingChainUntilRef.current = 0;
    runDistanceRef.current = 0;
    playBugSound("arcade_tap");
  }

  function tryLandingChain() {
    if (state !== "running" || Date.now() > landingChainUntilRef.current) return false;
    const player = playerRef.current;
    playerRef.current = { ...player, grounded: false, highJump: true, spinAngle: 0, spinning: true, vy: -2.35 };
    landingChainUntilRef.current = 0;
    playBugSound("arcade_pickup");
    return true;
  }

  function landOnFloor(floor: number, now: number) {
    const skipped = floor - landedFloorRef.current;
    landedFloorRef.current = floor;
    if (skipped >= 2) comboRef.current += 1;
    else comboRef.current = 0;
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    scoreRef.current += floor * 2 + Math.max(0, skipped - 1) * 35 + comboRef.current * 25;
    landedAtRef.current = now;
    playBugSound(skipped >= 2 ? "arcade_pickup" : "arcade_build");
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const durationMs = Math.max(0, Date.now() - startAtRef.current);
    const finalScore = Math.max(1, Math.round(scoreRef.current + landedFloorRef.current * 14 + maxComboRef.current * 45));
    playBugSound("arcade_finish");
    const highScorePromise = practice ? Promise.resolve(bestScore) : saveArcadeHighScore(user.uid, "bug_tower", finalScore);
    void highScorePromise.then((highScore) => {
      const nextResult: ArcadeRunResult = {
        combo: maxComboRef.current,
        durationMs,
        hits: 1,
        localHighScore: highScore,
        mode: "bug_tower",
        pickups: coinsCollectedRef.current,
        score: finalScore,
        streak: landedFloorRef.current,
        timestamp: new Date().toISOString()
      };
      if (!practice) setBestScore(highScore);
      setResult(nextResult);
      setState("result");
      onResult?.(nextResult);
    });
  }

  function back() {
    if (!practice && state !== "result") return;
    if (practice) {
      onBack();
      return;
    }
    if (state === "running") {
      Alert.alert("Leave Bug Tower?", "Your climb ends if you leave now.", [
        { text: "Keep climbing", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: onBack }
      ]);
      return;
    }
    onBack();
  }

  const animationFrame = playerAnimationFrame(renderState.player, landedAtRef.current);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Bug Tower</Text><Text style={styles.meta}>Best score: {bestScore}</Text></View>
        {(practice || state === "result") && <Pressable accessibilityLabel="Back to games" style={styles.closeButton} onPress={back}><GameUiIcon name="back" size={24} /></Pressable>}
      </View>
      {state === "ready" && <Ready onStart={start} />}
      {state === "running" && (
        <View style={styles.game}>
          <View style={styles.hud}>
            <HudChip label={`Floor ${renderState.floor}`} />
            <HudChip label={`${renderState.score} pt`} />
            <HudChip active={renderState.combo > 0} label={renderState.combo > 0 ? `Combo ${renderState.combo}` : towerZone(renderState.floor)} />
          </View>
          <View style={styles.playfield}>
            <ImageBackground resizeMode="cover" source={towerBackgroundForFloor(renderState.floor)} style={styles.background}>
              <View style={styles.backgroundShade} />
              <View style={styles.squadOverlay}><ArcadeSquadAssist compact label={`Squad ${squadAssist.activeCount}/3`} user={user} /></View>
              <View style={styles.controlHint}><Text style={styles.controlHintText}>Hold a direction to run - release to jump</Text></View>
              {renderState.elapsed < 12000 && (
                <View pointerEvents="none" style={styles.chainTutorial}>
                  <Text style={styles.chainTutorialTitle}>SALTO CHAIN</Text>
                  <Text style={styles.chainTutorialText}>LAND  →  TAP  →  FLIP</Text>
                </View>
              )}
              {renderState.platforms.map((platform) => <TowerPlatform key={platform.id} platform={platform} />)}
              {renderState.pickups.map((pickup) => <TowerPickupView key={pickup.id} pickup={pickup} />)}
              <View style={[styles.controlLayer, webHoldStyle]}>
                <Pressable
                  accessibilityLabel="Run left and release to jump"
                  testID="bug-tower-left-control"
                  style={[styles.controlHalf, webHoldStyle, heldDirection === -1 && styles.controlHalfActive]}
                  unstable_pressDelay={0}
                  onPressIn={() => beginRun(-1)}
                  onPressOut={RNPlatform.OS === "web" ? undefined : () => releaseRun(-1)}
                ><Text style={styles.controlArrow}>‹</Text><Text style={styles.controlSideLabel}>LEFT</Text></Pressable>
                <Pressable
                  accessibilityLabel="Run right and release to jump"
                  testID="bug-tower-right-control"
                  style={[styles.controlHalf, webHoldStyle, heldDirection === 1 && styles.controlHalfActive]}
                  unstable_pressDelay={0}
                  onPressIn={() => beginRun(1)}
                  onPressOut={RNPlatform.OS === "web" ? undefined : () => releaseRun(1)}
                ><Text style={styles.controlArrow}>›</Text><Text style={styles.controlSideLabel}>RIGHT</Text></Pressable>
              </View>
              {renderState.chainUntil > Date.now() && (
                <View pointerEvents="none" style={[styles.chainPrompt, percentPosition(renderState.player.x, renderState.player.y)]}>
                  <View style={styles.chainRing} />
                  <Text style={styles.chainText}>TAP!</Text>
                </View>
              )}
              {renderState.chainUntil > Date.now() && (
                <View pointerEvents="none" testID="bug-tower-chain-window" style={styles.chainTiming}>
                  <Text style={styles.chainTimingText}>TAP NOW  →  EXTRA FLIP</Text>
                  <View style={styles.chainTimingTrack}>
                    <View style={[styles.chainTimingFill, { width: `${renderState.chainProgress * 100}%` as DimensionValue }]} />
                  </View>
                </View>
              )}
              <View pointerEvents="none" style={[styles.player, percentPosition(renderState.player.x, renderState.player.y), { transform: [{ rotate: `${renderState.player.spinAngle}deg` }] }]}>
                <BugTowerSprite frame={animationFrame} />
                {renderState.rocketActive && <View style={styles.rocketFlame} />}
              </View>
              <View pointerEvents="none" style={styles.controls}>
                <View style={styles.chargeMeter}>
                  <Text style={styles.chargeLabel}>{renderState.springReady ? "MEGA JUMP READY" : renderState.player.spinning ? "SPIN!" : renderState.charge >= 58 ? "SPIN READY" : "JUMP POWER"}</Text>
                  <View style={styles.chargeTrack}><View style={[styles.chargeFill, { width: `${renderState.charge}%` as DimensionValue }]} /></View>
                  <Text style={styles.chargeValue}>{renderState.charge}%</Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        </View>
      )}
      {state === "result" && result && <Result onBack={onBack} onRetry={start} ranked={ranked} result={result} />}
    </View>
  );
}

function Ready({ onStart }: { onStart: () => void }) {
  return (
    <ImageBackground resizeMode="cover" source={towerBackground} style={styles.readyBackground}>
      <View style={styles.readyShade} />
      <View style={styles.panel}>
        <BugTowerSprite frame={3} large />
        <Text style={styles.panelTitle}>Climb the endless tower</Text>
        <Text style={styles.body}>Hold left or right to run. Release to jump: a full bar can clear around 7 steps. Green MEGA gives +100 points and supercharges your next jump. After a spinning landing, tap immediately for an extra flip.</Text>
        <View style={styles.difficultyRow}>
          <Text style={styles.difficultyChip}>Higher 7-step jumps</Text>
          <Text style={styles.difficultyChip}>100-floor worlds</Text>
          <Text style={styles.difficultyChip}>MEGA jump boost</Text>
          <Text style={styles.difficultyChip}>Survive until you fall</Text>
        </View>
        <Pressable accessibilityLabel="Start Bug Tower" testID="bug-tower-start" style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryText}>Start climb</Text></Pressable>
      </View>
    </ImageBackground>
  );
}

function Result({ onBack, onRetry, ranked, result }: { onBack: () => void; onRetry: () => void; ranked: boolean; result: ArcadeRunResult }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Tower run complete</Text>
      <Text style={styles.score}>{result.score}</Text>
      <Text style={styles.body}>Coins {result.pickups} • Best combo {result.combo} • Best score {result.localHighScore}</Text>
      {!ranked && <Pressable style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Climb again</Text></Pressable>}
      <Pressable style={ranked ? styles.primaryButton : styles.secondaryButton} onPress={onBack}><Text style={ranked ? styles.primaryText : styles.secondaryText}>Back to Arena</Text></Pressable>
    </View>
  );
}

function HudChip({ active = false, label }: { active?: boolean; label: string }) {
  return <View style={[styles.hudChip, active && styles.hudChipActive]}><Text style={styles.hudText}>{label}</Text></View>;
}

function TowerPlatform({ platform }: { platform: Platform }) {
  const zone = Math.floor(platform.floor / 100) % towerBackgrounds.length;
  return (
    <View style={[styles.platform, zone === 1 && styles.platformJungle, zone === 2 && styles.platformForge, zone === 3 && styles.platformSky, zone === 4 && styles.platformVoid, {
      left: `${platform.x}%` as DimensionValue,
      top: `${platform.y}%` as DimensionValue,
      width: `${platform.width}%` as DimensionValue
    }]}>
      <View style={styles.platformShine} />
      <Text numberOfLines={1} style={styles.floorNumber}>#{platform.floor}</Text>
    </View>
  );
}

function TowerPickupView({ pickup }: { pickup: TowerPickup }) {
  return (
    <View pointerEvents="none" style={[styles.pickup, percentPosition(pickup.x, pickup.y)]}>
      {pickup.kind === "coin" && <View style={styles.coin}><View style={styles.coinInset} /></View>}
      {pickup.kind === "rocket" && <View style={styles.rocketPickup}><Text style={styles.rocketPickupText}>▲</Text></View>}
      {pickup.kind === "spring" && <View style={styles.springPickup}><Text style={styles.springPickupText}>MEGA</Text></View>}
    </View>
  );
}

function BugTowerSprite({ frame, large = false }: { frame: number; large?: boolean }) {
  const column = frame % 3;
  const row = Math.floor(frame / 3);
  const size = large ? 126 : 64;
  const sheetSize = size * 3;
  const cellHeight = sheetSize / 2;
  const cropOffset = large ? 20 : 10;
  return (
    <View style={[styles.spriteFrame, { height: large ? 142 : 72, width: size }]}>
      <Image
        accessibilityIgnoresInvertColors
        source={beetleSpriteSheet}
        style={{
          height: sheetSize,
          left: -column * size,
          position: "absolute",
          top: -row * cellHeight - cropOffset,
          width: sheetSize
        }}
      />
    </View>
  );
}

function initialRenderState(seed: string): RenderState {
  const platforms = buildInitialPlatforms(seed);
  const pickups = platforms.map((platform) => createTowerPickup(platform, seed)).filter((pickup): pickup is TowerPickup => Boolean(pickup));
  return { chainProgress: 0, chainUntil: 0, charge: 0, combo: 0, elapsed: 0, floor: 0, maxCombo: 0, pickups, platforms, player: initialPlayer(), rocketActive: false, score: 0, springReady: false };
}

function initialPlayer(): Player {
  return { grounded: true, highJump: false, lastGroundAt: Date.now(), spinAngle: 0, spinning: false, vx: 0, vy: 0, x: 50, y: 82.8 };
}

function buildInitialPlatforms(seed: string) {
  const platforms: Platform[] = [{ drift: 0, floor: 0, id: "floor-0", width: 76, x: 12, y: 88 }];
  for (let floor = 1; floor < 11; floor += 1) platforms.push(createPlatform(platforms[platforms.length - 1], floor, seed));
  return platforms;
}

export function platformWidthForFloor(floor: number, seed = "balance") {
  const baseWidth = 56 + seededNumber(seed, 0) * 6;
  return clamp(baseWidth * platformWidthMultiplierForFloor(floor), 12, 62);
}

export function platformWidthMultiplierForFloor(floor: number) {
  if (floor < 20) return 1;
  if (floor <= 50) return 1 - ((floor - 20) / 30) * 0.5;
  if (floor <= 100) return 0.5 - ((floor - 50) / 50) * (1 / 6);
  if (floor <= 200) return (1 / 3) - ((floor - 100) / 100) * (1 / 12);
  return Math.max(0.18, 0.25 - ((floor - 200) / 400) * 0.07);
}

export function movingPlatformChance(floor: number) {
  if (floor < 8) return 0;
  if (floor <= 25) return 0.1 + ((floor - 8) / 17) * 0.15;
  if (floor <= 50) return 0.25 + ((floor - 25) / 25) * 0.2;
  if (floor <= 100) return 0.45 + ((floor - 50) / 50) * 0.2;
  if (floor <= 200) return 0.65 + ((floor - 100) / 100) * 0.17;
  return Math.min(0.9, 0.82 + ((floor - 200) / 100) * 0.08);
}

function createPlatform(previous: Platform | null, floor: number, seed: string): Platform {
  const width = platformWidthForFloor(floor, seed);
  const gap = towerPlatformGap(floor, seededNumber(seed, floor * 5 + 1), seededNumber(seed, floor * 5 + 7));
  const x = towerPlatformX(previous?.x ?? 12, previous?.width ?? 76, width, floor, seededNumber(seed, floor * 5 + 2));
  const driftRoll = seededNumber(seed, floor * 5 + 3);
  const moving = driftRoll < movingPlatformChance(floor);
  const drift = moving ? (seededNumber(seed, floor * 5 + 4) > 0.5 ? 1 : -1) * clamp(0.032 + floor * 0.0002, 0.032, 0.12) : 0;
  return { drift, floor, id: `floor-${floor}`, width, x, y: (previous?.y ?? 2) - gap };
}

function createTowerPickup(platform: Platform, seed: string): TowerPickup | null {
  if (platform.floor <= 0) return null;
  const boost = platformBoostForFloor(seed, platform.floor);
  const kind = boost ?? (platform.floor === 3 || seededNumber(seed, platform.floor * 5 + 6) > 0.82 ? "coin" : null);
  if (!kind) return null;
  return {
    id: `pickup-${platform.floor}-${kind}`,
    kind,
    x: 8 + seededNumber(seed, platform.floor * 17 + 91) * 84,
    y: platform.y - 4 - seededNumber(seed, platform.floor * 19 + 103) * 5
  };
}

function platformBoostForFloor(seed: string, floor: number): "rocket" | "spring" | null {
  let boostFloor = 8 + Math.floor(seededNumber(seed, 701) * 3);
  let index = 0;
  while (boostFloor <= floor) {
    if (boostFloor === floor) return seededNumber(seed, 730 + index * 43) < 0.44 ? "rocket" : "spring";
    boostFloor += 8 + Math.floor(seededNumber(seed, 760 + index * 41) * 7);
    index += 1;
  }
  return null;
}

function movePlatform(platform: Platform, scroll: number): Platform {
  if (!platform.drift) return { ...platform, y: platform.y + scroll };
  let x = platform.x + platform.drift;
  let drift = platform.drift;
  if (x <= 3.5 || x + platform.width >= 96.5) {
    drift *= -1;
    x = clamp(x, 3.5, 96.5 - platform.width);
  }
  return { ...platform, drift, x, y: platform.y + scroll };
}

function towerZone(floor: number) {
  const names = ["Ice Citadel", "Hive Jungle", "Ember Forge", "Sky Temple", "Cosmic Void"];
  const zone = Math.floor(floor / 100);
  const remix = Math.floor(zone / names.length);
  return `${names[zone % names.length]}${remix > 0 ? ` R${remix}` : ""}`;
}

function towerBackgroundForFloor(floor: number) {
  return towerBackgrounds[Math.floor(floor / 100) % towerBackgrounds.length];
}

function playerAnimationFrame(player: Player, landedAt: number) {
  if (Date.now() - landedAt < 120 && player.grounded) return 5;
  if (player.vy < -0.2) return 3;
  if (player.vy > 0.45) return 4;
  if (Math.abs(player.vx) > 0.12) return player.vx < 0 ? 1 : 2;
  return 0;
}

function percentPosition(x: number, y: number) {
  return { left: `${x}%` as DimensionValue, top: `${y}%` as DimensionValue };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  background: { flex: 1, overflow: "hidden" },
  backgroundShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,8,28,0.14)" },
  body: { color: "#dce9ff", fontSize: 15, fontWeight: "700", lineHeight: 22, textAlign: "center" },
  closeButton: { alignItems: "center", backgroundColor: "#f8fbff", borderRadius: 10, height: 44, justifyContent: "center", width: 44 },
  closeText: { color: "#0b1638", fontSize: 24, fontWeight: "900" },
  chargeFill: { backgroundColor: "#facc15", borderRadius: 999, height: "100%" },
  chargeLabel: { color: "#f8fbff", fontSize: 9, fontWeight: "900" },
  chargeMeter: { alignItems: "center", backgroundColor: "rgba(7,17,50,0.78)", borderRadius: 12, gap: 3, paddingHorizontal: 8, paddingVertical: 7, width: 104 },
  chargeTrack: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, height: 7, overflow: "hidden", width: "100%" },
  chargeValue: { color: "#bae6fd", fontSize: 10, fontWeight: "900" },
  chainPrompt: { alignItems: "center", height: 86, justifyContent: "center", marginLeft: -43, marginTop: -43, position: "absolute", width: 86, zIndex: 10 },
  chainRing: { borderColor: "#facc15", borderRadius: 999, borderWidth: 3, height: 66, position: "absolute", width: 66 },
  chainTiming: { alignSelf: "center", backgroundColor: "rgba(5,46,22,0.94)", borderColor: "#4ade80", borderRadius: 12, borderWidth: 2, bottom: 104, gap: 5, paddingHorizontal: 12, paddingVertical: 8, position: "absolute", width: 210, zIndex: 12 },
  chainTimingFill: { backgroundColor: "#4ade80", borderRadius: 999, height: "100%" },
  chainTimingText: { color: "#dcfce7", fontSize: 11, fontWeight: "900", textAlign: "center" },
  chainTimingTrack: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, height: 8, overflow: "hidden" },
  chainTutorial: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(4,12,38,0.86)", borderColor: "rgba(250,204,21,0.78)", borderRadius: 10, borderWidth: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 6, position: "absolute", top: 44, zIndex: 10 },
  chainTutorialText: { color: "#fff7b2", fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  chainTutorialTitle: { color: "#f8fbff", fontSize: 9, fontWeight: "900" },
  chainText: { color: "#fff7b2", fontSize: 12, fontWeight: "900" },
  coin: { alignItems: "center", backgroundColor: "#facc15", borderColor: "#fff7ae", borderRadius: 999, borderWidth: 2, height: 18, justifyContent: "center", width: 18 },
  coinInset: { borderColor: "#b45309", borderRadius: 999, borderWidth: 2, height: 8, width: 8 },
  controlArrow: { color: "rgba(255,255,255,0.7)", fontSize: 48, fontWeight: "900", lineHeight: 50 },
  controlHalf: { alignItems: "center", flex: 1, justifyContent: "flex-end", paddingBottom: 18 },
  controlHalfActive: { backgroundColor: "rgba(14,116,144,0.2)" },
  controlLayer: { ...StyleSheet.absoluteFillObject, flexDirection: "row", zIndex: 6 },
  controlSideLabel: { color: "rgba(220,233,255,0.75)", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  controlHint: { alignSelf: "center", backgroundColor: "rgba(4,12,38,0.72)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, position: "absolute", top: 8, zIndex: 8 },
  controlHintText: { color: "#dce9ff", fontSize: 11, fontWeight: "900" },
  controls: { alignItems: "center", bottom: 14, left: "50%", marginLeft: -52, position: "absolute", zIndex: 12 },
  difficultyChip: { backgroundColor: "rgba(103,65,217,0.28)", borderColor: "rgba(167,139,250,0.8)", borderRadius: 999, borderWidth: 1, color: "#ede9fe", fontSize: 11, fontWeight: "900", paddingHorizontal: 9, paddingVertical: 6 },
  difficultyRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  game: { flex: 1 },
  header: { alignItems: "center", backgroundColor: "#071330", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
  hud: { backgroundColor: "#0a1940", borderBottomColor: "#5dd9ff", borderBottomWidth: 1, flexDirection: "row", gap: 7, minHeight: 42, paddingHorizontal: 10, paddingVertical: 6 },
  hudChip: { alignItems: "center", backgroundColor: "rgba(93,217,255,0.1)", borderColor: "rgba(93,217,255,0.35)", borderRadius: 999, borderWidth: 1, flex: 1, justifyContent: "center", paddingHorizontal: 7 },
  hudChipActive: { backgroundColor: "rgba(250,204,21,0.2)", borderColor: "#facc15" },
  hudText: { color: "#f8fbff", fontSize: 12, fontWeight: "900" },
  floorNumber: { backgroundColor: "rgba(5,13,36,0.86)", borderColor: "rgba(255,255,255,0.5)", borderRadius: 5, borderWidth: 1, color: "#fff", fontSize: 9, fontWeight: "900", paddingHorizontal: 4, paddingVertical: 1, position: "absolute", right: 4, top: -18 },
  meta: { color: "#9fb4dd", fontSize: 12, fontWeight: "800" },
  panel: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(7,19,48,0.94)", borderColor: "#5dd9ff", borderRadius: 16, borderWidth: 1, gap: 14, margin: 16, maxWidth: 520, padding: 20 },
  panelTitle: { color: "#f8fbff", fontSize: 26, fontWeight: "900", textAlign: "center" },
  platform: { backgroundColor: "#4bc7ed", borderBottomColor: "#163e85", borderBottomWidth: 6, borderColor: "#d9f8ff", borderRadius: 8, borderTopWidth: 2, height: 12, position: "absolute", zIndex: 4 },
  platformForge: { backgroundColor: "#f97316", borderBottomColor: "#7c2d12", borderColor: "#ffedd5" },
  platformJungle: { backgroundColor: "#22c55e", borderBottomColor: "#14532d", borderColor: "#dcfce7" },
  platformShine: { backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 999, height: 2, left: 5, position: "absolute", right: 5, top: 2 },
  platformSky: { backgroundColor: "#38bdf8", borderBottomColor: "#075985", borderColor: "#f0f9ff" },
  platformVoid: { backgroundColor: "#ec4899", borderBottomColor: "#701a75", borderColor: "#fce7f3" },
  pickup: { alignItems: "center", height: 30, justifyContent: "center", marginLeft: -15, marginTop: -15, position: "absolute", width: 30, zIndex: 8 },
  player: { alignItems: "center", height: 72, justifyContent: "center", marginLeft: -32, marginTop: -36, position: "absolute", width: 64, zIndex: 7 },
  playfield: { flex: 1 },
  primaryButton: { alignItems: "center", backgroundColor: "#168b65", borderRadius: 10, justifyContent: "center", minHeight: 52, paddingHorizontal: 20, width: "100%" },
  primaryText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  readyBackground: { flex: 1, justifyContent: "center" },
  readyShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,7,24,0.35)" },
  score: { color: "#facc15", fontSize: 58, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: "#dce9ff", borderRadius: 10, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 20, width: "100%" },
  secondaryText: { color: "#f8fbff", fontSize: 16, fontWeight: "900" },
  rocketFlame: { backgroundColor: "#facc15", borderColor: "#fb923c", borderRadius: 999, borderWidth: 2, bottom: -14, height: 22, position: "absolute", width: 12 },
  rocketPickup: { alignItems: "center", backgroundColor: "#f97316", borderColor: "#ffedd5", borderRadius: 8, borderWidth: 2, height: 24, justifyContent: "center", width: 20 },
  rocketPickupText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  shell: { backgroundColor: "#050d24", flex: 1 },
  springPickup: { alignItems: "center", backgroundColor: "#22c55e", borderColor: "#dcfce7", borderRadius: 999, borderWidth: 2, height: 30, justifyContent: "center", width: 42 },
  springPickupText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.4, lineHeight: 10 },
  spriteFrame: { overflow: "hidden" },
  squadOverlay: { position: "absolute", right: 8, top: 42, zIndex: 9 },
  title: { color: "#f8fbff", fontSize: 24, fontWeight: "900" }
});
