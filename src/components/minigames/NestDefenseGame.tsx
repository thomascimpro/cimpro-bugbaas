import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, GestureResponderEvent, Image, ImageSourcePropType, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { createArcadeSeed, loadArcadeHighScore, saveArcadeHighScore, seededNumber } from "../../services/arcadeResultService";
import { arcadeSquadAssistForUser } from "../../services/bugSquadGameBalance";
import { playBugSound } from "../../services/soundService";
import { swarmSiegeNestBalance } from "../../services/swarmSiegeGameBalance";
import type { SwarmSiegeModifier } from "../../services/swarmSiegeService";
import { ArcadeRunResult, User } from "../../types";
import { BugArtImage } from "../BugArtImage";
import { GameUiIcon } from "../ui/GameUiIcon";
import { ArcadeSquadAssist } from "./ArcadeSquadAssist";
import { SpriteCrop } from "./SpriteCrop";

type Props = {
  eventLabel?: string;
  eventModifier?: SwarmSiegeModifier;
  onBack: () => void;
  onResult?: (result: ArcadeRunResult) => void;
  practice?: boolean;
  ranked?: boolean;
  recordHighScore?: boolean;
  seed?: string;
  user: User;
};
type State = "ready" | "result" | "running";
type TowerKind = "heavy" | "rapid" | "slow";
type TapUpgradeKind = "damage" | "speed";
type EnemyKind = "armored" | "boss" | "fast" | "healer" | "normal" | "swarm" | "tank";
type Tower = { cooldownUntil: number; id: string; kind?: TowerKind; level: number; x: number; y: number };
type Enemy = { hp: number; id: string; kind: EnemyKind; maxHp: number; progress: number; slowUntil: number; speed: number };
type ManualImpact = { id: string; x: number; y: number };
type SlowZone = { id: string; progress: number; until: number };

const durationMs = 150000;
const tickMs = 90;
const manualCooldownMs = 850;
const maxTapUpgradeLevel = 4;
const sprayCooldownMs = 12500;
const stickyCooldownMs = 13000;
const stickyDurationMs = 5600;
const healerAuraRange = 0.13;
const referenceFieldWidth = 360;
const maxFieldScale = 2;
const gameZoomScale = 0.82;
const arcadeShowcaseImage = require("../../../assets/generated/ChatGPT Image 18 jun 2026, 22_34_06.jpg");
const nestImage = require("../../../assets/minigames/extracted/nest_nest.png");
const towerCost: Record<TowerKind, number> = { rapid: 45, slow: 65, heavy: 80 };
const towerImage: Record<TowerKind, ImageSourcePropType> = {
  heavy: require("../../../assets/minigames/extracted/nest_stink_bomb.png"),
  rapid: require("../../../assets/minigames/extracted/nest_leaf_shield.png"),
  slow: require("../../../assets/minigames/extracted/nest_web_tower.png")
};
const towerSlots: Tower[] = [
  { cooldownUntil: 0, id: "a", level: 0, x: 24, y: 24 },
  { cooldownUntil: 0, id: "b", level: 0, x: 68, y: 27 },
  { cooldownUntil: 0, id: "c", level: 0, x: 50, y: 48 },
  { cooldownUntil: 0, id: "d", level: 0, x: 24, y: 69 },
  { cooldownUntil: 0, id: "e", level: 0, x: 70, y: 75 }
];
const path = [
  { x: -8, y: 14 },
  { x: 34, y: 14 },
  { x: 34, y: 40 },
  { x: 78, y: 40 },
  { x: 78, y: 64 },
  { x: 40, y: 64 },
  { x: 40, y: 88 },
  { x: 104, y: 88 }
];

export function NestDefenseGame({ eventLabel, eventModifier, onBack, onResult, practice = false, ranked = false, recordHighScore = true, seed, user }: Props) {
  const eventBalance = useMemo(() => swarmSiegeNestBalance(eventModifier), [eventModifier]);
  const squadAssist = useMemo(() => arcadeSquadAssistForUser(user), [user.activeBugSquad]);
  const [state, setState] = useState<State>("ready");
  const [bestScore, setBestScore] = useState(0);
  const [result, setResult] = useState<ArcadeRunResult | null>(null);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>(towerSlots);
  const [selectedTower, setSelectedTower] = useState<TowerKind>("rapid");
  const [coins, setCoins] = useState(150);
  const [hp, setHp] = useState(16);
  const [score, setScore] = useState(0);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [wave, setWave] = useState(1);
  const [manualCooldownUntil, setManualCooldownUntil] = useState(0);
  const [tapDamageLevel, setTapDamageLevel] = useState(1);
  const [tapSpeedLevel, setTapSpeedLevel] = useState(1);
  const [sprayCooldownUntil, setSprayCooldownUntil] = useState(0);
  const [stickyCooldownUntil, setStickyCooldownUntil] = useState(0);
  const [manualCombo, setManualCombo] = useState(0);
  const [impacts, setImpacts] = useState<ManualImpact[]>([]);
  const [slowZones, setSlowZones] = useState<SlowZone[]>([]);
  const [fieldScale, setFieldScale] = useState(1);
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>(towerSlots);
  const coinsRef = useRef(150);
  const hpRef = useRef(16);
  const scoreRef = useRef(0);
  const waveRef = useRef(1);
  const leakRef = useRef(0);
  const killsRef = useRef(0);
  const manualKillsRef = useRef(0);
  const manualComboRef = useRef(0);
  const maxManualComboRef = useRef(0);
  const lastManualKillAtRef = useRef(0);
  const manualCooldownUntilRef = useRef(0);
  const tapDamageLevelRef = useRef(1);
  const tapSpeedLevelRef = useRef(1);
  const sprayCooldownUntilRef = useRef(0);
  const stickyCooldownUntilRef = useRef(0);
  const slowZonesRef = useRef<SlowZone[]>([]);
  const spawnedBossWavesRef = useRef<Set<number>>(new Set());
  const fieldRef = useRef<View>(null);
  const lastLeakSoundAtRef = useRef(0);
  const seedRef = useRef(createArcadeSeed("nest_defense", user.uid));
  const statsRef = useRef({ startAt: 0 });
  const finishedRef = useRef(false);
  const impactIdRef = useRef(0);
  const lastControlTapAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    void loadArcadeHighScore(user.uid, "nest_defense").then((value) => active && setBestScore(value));
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [state, squadAssist.nestDefense.slowMultiplier]);

  useEffect(() => {
    if (practice || state === "result") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, [practice, state]);

  function start() {
    const startingHp = 13 + squadAssist.nestDefense.startingHpBonus;
    const startingCoins = 125 + squadAssist.nestDefense.extraCharges * 25;
    finishedRef.current = false;
    const startedAt = Date.now();
    seedRef.current = seed ?? createArcadeSeed("nest_defense", `${user.uid}:${startedAt}`);
    statsRef.current = { startAt: startedAt };
    enemiesRef.current = [];
    towersRef.current = towerSlots;
    coinsRef.current = startingCoins;
    hpRef.current = startingHp;
    scoreRef.current = 0;
    waveRef.current = 1;
    leakRef.current = 0;
    killsRef.current = 0;
    manualKillsRef.current = 0;
    manualComboRef.current = 0;
    maxManualComboRef.current = 0;
    lastManualKillAtRef.current = 0;
    manualCooldownUntilRef.current = 0;
    tapDamageLevelRef.current = 1;
    tapSpeedLevelRef.current = 1;
    sprayCooldownUntilRef.current = 0;
    stickyCooldownUntilRef.current = 0;
    slowZonesRef.current = [];
    spawnedBossWavesRef.current = new Set();
    lastLeakSoundAtRef.current = 0;
    setEnemies([]);
    setTowers(towerSlots);
    setCoins(startingCoins);
    setHp(startingHp);
    setScore(0);
    setWave(1);
    setManualCooldownUntil(0);
    setTapDamageLevel(1);
    setTapSpeedLevel(1);
    setSprayCooldownUntil(0);
    setStickyCooldownUntil(0);
    setManualCombo(0);
    setImpacts([]);
    setSlowZones([]);
    setRemainingMs(durationMs);
    setResult(null);
    setState("running");
    playBugSound("arcade_start");
  }

  function updateFieldLayout(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;
    const nextScale = gameZoomScale * Math.max(1, Math.min(maxFieldScale, width / referenceFieldWidth));
    setFieldScale((current) => Math.abs(current - nextScale) < 0.02 ? current : nextScale);
  }

  function tick() {
    const now = Date.now();
    const elapsed = now - statsRef.current.startAt;
    if (elapsed >= durationMs) return finish(true);
    setRemainingMs(durationMs - elapsed);
    waveRef.current = 1 + Math.floor(elapsed / 9000);
    setWave(waveRef.current);
    slowZonesRef.current = slowZonesRef.current.filter((zone) => zone.until > now);
    setSlowZones(slowZonesRef.current);
    let nextEnemies = moveEnemies(enemiesRef.current, now);
    nextEnemies = applyEnemyAuras(nextEnemies);
    nextEnemies = fireTowers(nextEnemies, now);
    nextEnemies = spawnEnemies(nextEnemies, elapsed);
    enemiesRef.current = nextEnemies;
    setEnemies(nextEnemies);
    setTowers([...towersRef.current]);
    setCoins(coinsRef.current);
    setHp(hpRef.current);
    setScore(scoreRef.current);
    if (hpRef.current <= 0) finish(false);
  }

  function moveEnemies(current: Enemy[], now: number) {
    const survivors: Enemy[] = [];
    for (const enemy of current) {
      const zoneSlow = slowZonesRef.current.some((zone) => Math.abs(zone.progress - enemy.progress) < 0.12) ? 0.44 : 1;
      const towerSlow = now < enemy.slowUntil ? 0.52 * squadAssist.nestDefense.slowMultiplier : 1;
      const next = { ...enemy, progress: enemy.progress + enemy.speed * zoneSlow * towerSlow };
      if (next.progress >= 1) {
        hpRef.current -= leakDamage(enemy.kind, waveRef.current);
        leakRef.current += 1;
        if (now - lastLeakSoundAtRef.current > 140) {
          lastLeakSoundAtRef.current = now;
          playBugSound("arcade_hit");
        }
      } else {
        survivors.push(next);
      }
    }
    return survivors;
  }

  function fireTowers(current: Enemy[], now: number) {
    let next = current;
    towersRef.current = towersRef.current.map((tower) => {
      if (!tower.kind || tower.cooldownUntil > now) return tower;
      const target = pickTarget(next, tower);
      if (!target) return tower;
      const spec = towerSpec(tower.kind, tower.level, target.kind, squadAssist.nestDefense.damageMultiplier, squadAssist.nestDefense.fireRateMultiplier);
      next = damageEnemy(next, target.id, spec.damage, now, false, spec.slowMs, tower.kind);
      return { ...tower, cooldownUntil: now + spec.cooldownMs };
    });
    return next;
  }

  function applyEnemyAuras(current: Enemy[]) {
    const healers = current.filter((enemy) => enemy.kind === "healer");
    if (!healers.length) return current;
    const healAmount = 0.18 + waveRef.current * 0.015;
    return current.map((enemy) => {
      if (enemy.kind === "healer" || enemy.hp >= enemy.maxHp) return enemy;
      const protectedByHealer = healers.some((healer) => Math.abs(healer.progress - enemy.progress) <= healerAuraRange);
      return protectedByHealer ? { ...enemy, hp: Math.min(enemy.maxHp, enemy.hp + healAmount) } : enemy;
    });
  }

  function spawnEnemies(current: Enemy[], elapsed: number) {
    if (current.length > 38) return current;
    const wave = waveRef.current;
    const next = [...current];
    if (isBossWave(wave, eventBalance.bossWaveInterval) && !spawnedBossWavesRef.current.has(wave)) {
      spawnedBossWavesRef.current.add(wave);
      const maxHp = Math.max(1, Math.round(bossHpForWave(wave) * eventBalance.hpMultiplier));
      next.push({
        hp: maxHp,
        id: `boss:${wave}:${elapsed}`,
        kind: "boss",
        maxHp,
        progress: 0,
        slowUntil: 0,
        speed: bossSpeedForWave(wave) * eventBalance.speedMultiplier
      });
    }
    const interval = Math.max(260, 900 - wave * 38);
    if (elapsed % interval >= tickMs) return next;
    const step = Math.floor(elapsed / interval);
    const roll = seededNumber(seedRef.current, step);
    const kind: EnemyKind = wave >= 7 && step % 13 === 0 ? "healer"
      : wave >= 5 && (step % 7 === 0 || roll < eventBalance.armoredWeightBonus) ? "armored"
      : wave >= 6 && roll < 0.16 ? "swarm"
      : wave >= 4 && step % 5 === 0 ? "tank"
      : wave >= 2 && roll > 0.62 - eventBalance.fastWeightBonus ? "fast"
      : "normal";
    const baseHp = kind === "healer" ? 8 + Math.floor(wave * 1.15)
      : kind === "armored" ? 11 + Math.floor(wave * 1.75)
      : kind === "tank" ? 10 + Math.floor(wave * 1.75)
      : kind === "swarm" ? 2 + Math.floor(wave * 0.28)
      : kind === "fast" ? 2 + Math.floor(wave * 0.42)
      : 3 + Math.floor(wave * 0.68);
    const baseSpeed = kind === "swarm" ? 0.0071 + wave * 0.00028
      : kind === "fast" ? 0.0064 + wave * 0.00025
      : kind === "healer" ? 0.0035 + wave * 0.00013
      : kind === "tank" || kind === "armored" ? 0.0029 + wave * 0.00012
      : 0.0045 + wave * 0.00019;
    const maxHp = Math.max(1, Math.round(baseHp * eventBalance.hpMultiplier));
    const spawned = [...next, {
      hp: maxHp,
      id: `${elapsed}:${step}`,
      kind,
      maxHp,
      progress: 0,
      slowUntil: 0,
      speed: baseSpeed * eventBalance.speedMultiplier
    }];
    if (eventBalance.burstEveryWave > 0 && wave % eventBalance.burstEveryWave === 0 && step % 4 === 0) {
      const burstHp = Math.max(1, Math.round((2 + Math.floor(wave * 0.28)) * eventBalance.hpMultiplier));
      spawned.push({
        hp: burstHp,
        id: `burst:${elapsed}:${step}`,
        kind: "swarm",
        maxHp: burstHp,
        progress: 0,
        slowUntil: 0,
        speed: (0.0071 + wave * 0.00028) * eventBalance.speedMultiplier
      });
    }
    return spawned;
  }

  function buyOrUpgrade(slotId: string) {
    lastControlTapAtRef.current = Date.now();
    if (state !== "running") return;
    const nextTowers = towersRef.current.map((tower) => {
      if (tower.id !== slotId) return tower;
      if (!tower.kind) {
        const cost = towerCost[selectedTower];
        if (coinsRef.current < cost) return tower;
        coinsRef.current -= cost;
        playBugSound("arcade_build");
        return { ...tower, kind: selectedTower, level: 1 };
      }
      const cost = towerUpgradeCost(tower.kind, tower.level);
      if (tower.level >= 4 || coinsRef.current < cost) return tower;
      coinsRef.current -= cost;
      playBugSound("arcade_build");
      return { ...tower, level: tower.level + 1 };
    });
    towersRef.current = nextTowers;
    setTowers(nextTowers);
    setCoins(coinsRef.current);
  }

  function manualTapAttack(event: GestureResponderEvent) {
    if (state !== "running") return;
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;
    fieldRef.current?.measure((_x, _y, width, height, fieldPageX, fieldPageY) => {
      const now = Date.now();
      if (now - lastControlTapAtRef.current < 120) return;
      if (now < manualCooldownUntilRef.current) return;
      const tapX = Number.isFinite(pageX) ? pageX - fieldPageX : locationX;
      const tapY = Number.isFinite(pageY) ? pageY - fieldPageY : locationY;
      const target = targetFromFieldPoint(tapX, tapY, width, height);
      if (!target) return;
      manualCooldownUntilRef.current = now + manualCooldownForLevel(tapSpeedLevelRef.current);
      setManualCooldownUntil(manualCooldownUntilRef.current);
      addImpact({ x: clamp((tapX / Math.max(1, width)) * 100, 0, 100), y: clamp((tapY / Math.max(1, height)) * 100, 0, 100) });
      enemiesRef.current = damageEnemy(enemiesRef.current, target.id, manualDamageForLevel(tapDamageLevelRef.current, waveRef.current), now, true, 0, "manual");
      setEnemies(enemiesRef.current);
      setScore(scoreRef.current);
      playBugSound("arcade_tap");
    });
  }

  function upgradeTap(kind: TapUpgradeKind) {
    lastControlTapAtRef.current = Date.now();
    if (state !== "running") return;
    const level = kind === "damage" ? tapDamageLevelRef.current : tapSpeedLevelRef.current;
    if (level >= maxTapUpgradeLevel) return;
    const cost = tapUpgradeCost(kind, level);
    if (coinsRef.current < cost) return;
    coinsRef.current -= cost;
    if (kind === "damage") {
      tapDamageLevelRef.current += 1;
      setTapDamageLevel(tapDamageLevelRef.current);
    } else {
      tapSpeedLevelRef.current += 1;
      setTapSpeedLevel(tapSpeedLevelRef.current);
    }
    setCoins(coinsRef.current);
    playBugSound("arcade_build");
  }

  function useBugSpray() {
    lastControlTapAtRef.current = Date.now();
    if (state !== "running") return;
    const now = Date.now();
    if (now < sprayCooldownUntilRef.current || !enemiesRef.current.length) return;
    sprayCooldownUntilRef.current = now + Math.round(sprayCooldownMs * squadAssist.nestDefense.rechargeMultiplier);
    setSprayCooldownUntil(sprayCooldownUntilRef.current);
    const center = densestEnemyProgress();
    let next = enemiesRef.current;
    enemiesRef.current
      .filter((enemy) => Math.abs(enemy.progress - center) < 0.18)
      .forEach((enemy) => {
        addImpact(pointOnPath(enemy.progress));
        next = damageEnemy(next, enemy.id, 3 + Math.floor(waveRef.current / 5), now, false, 0, "spray");
      });
    enemiesRef.current = next;
    setEnemies(next);
    setScore(scoreRef.current);
    playBugSound("spray_hit");
  }

  function useStickyWeb() {
    lastControlTapAtRef.current = Date.now();
    if (state !== "running") return;
    const now = Date.now();
    if (now < stickyCooldownUntilRef.current || !enemiesRef.current.length) return;
    stickyCooldownUntilRef.current = now + Math.round(stickyCooldownMs * squadAssist.nestDefense.rechargeMultiplier);
    setStickyCooldownUntil(stickyCooldownUntilRef.current);
    const zone = { id: `web:${now}`, progress: densestEnemyProgress(), until: now + stickyDurationMs };
    slowZonesRef.current = [...slowZonesRef.current.slice(-2), zone];
    setSlowZones(slowZonesRef.current);
    playBugSound("arcade_build");
  }

  function damageEnemy(current: Enemy[], enemyId: string, damage: number, now: number, manual: boolean, slowMs: number, source: TowerKind | "manual" | "spray") {
    return current.flatMap((enemy) => {
      if (enemy.id !== enemyId) return [enemy];
      const hpLeft = enemy.hp - effectiveDamageForSource(enemy.kind, damage, source);
      if (hpLeft <= 0) {
        scoreKill(enemy, manual, now);
        return [];
      }
      return [{ ...enemy, hp: hpLeft, slowUntil: slowMs ? Math.max(enemy.slowUntil, now + slowMs) : enemy.slowUntil }];
    });
  }

  function scoreKill(enemy: Enemy, manual: boolean, now: number) {
    killsRef.current += 1;
    coinsRef.current += coinReward(enemy.kind);
    scoreRef.current += killScore(enemy.kind);
    if (manual) {
      manualKillsRef.current += 1;
      manualComboRef.current = now - lastManualKillAtRef.current < 3200 ? manualComboRef.current + 1 : 1;
      maxManualComboRef.current = Math.max(maxManualComboRef.current, manualComboRef.current);
      lastManualKillAtRef.current = now;
      scoreRef.current += 12 + Math.min(6, manualComboRef.current) * 5;
      setManualCombo(manualComboRef.current);
    }
  }

  function targetFromFieldPoint(x: number, y: number, width: number, height: number) {
    const hitRadius = Math.max(48, Math.min(72, 48 * gameZoomScale * Math.max(1, Math.min(maxFieldScale, width / referenceFieldWidth))));
    return enemiesRef.current
      .map((enemy) => {
        const pos = pointOnPath(enemy.progress);
        return { enemy, x: (pos.x / 100) * width, y: (pos.y / 100) * height };
      })
      .filter((target) => distance(target.x, target.y, x, y) <= hitRadius)
      .sort((a, b) => distance(a.x, a.y, x, y) - distance(b.x, b.y, x, y))[0]?.enemy ?? null;
  }

  function densestEnemyProgress() {
    return enemiesRef.current
      .map((enemy) => ({ enemy, count: enemiesRef.current.filter((item) => Math.abs(item.progress - enemy.progress) < 0.16).length }))
      .sort((a, b) => b.count - a.count || b.enemy.progress - a.enemy.progress)[0]?.enemy.progress ?? 0.5;
  }

  function addImpact(pos: { x: number; y: number }) {
    const id = `impact:${impactIdRef.current++}`;
    setImpacts((current) => [...current.slice(-5), { id, x: pos.x, y: pos.y }]);
    setTimeout(() => setImpacts((current) => current.filter((impact) => impact.id !== id)), 260);
  }

  function finish(won: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsed = Math.min(durationMs, Date.now() - statsRef.current.startAt);
    const finalScore = Math.max(0, scoreRef.current + waveRef.current * 45 + hpRef.current * 55 + killsRef.current * 7 + manualKillsRef.current * 22 + maxManualComboRef.current * 28 - leakRef.current * 30 + (won ? 180 : 0));
    playBugSound("arcade_finish");
    const highScorePromise = practice || !recordHighScore ? Promise.resolve(bestScore) : saveArcadeHighScore(user.uid, "nest_defense", finalScore);
    void highScorePromise.then((highScore) => {
      if (!practice && recordHighScore) setBestScore(highScore);
      const nextResult = { combo: waveRef.current, durationMs: elapsed, hits: leakRef.current, localHighScore: highScore, mode: "nest_defense" as const, pickups: killsRef.current, score: finalScore, streak: hpRef.current, timestamp: new Date().toISOString() };
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
      Alert.alert("Leave Nest Defense?", "Your run stops if you go back now.", [{ text: "Stay", style: "cancel" }, { text: "Leave", style: "destructive", onPress: onBack }]);
      return;
    }
    onBack();
  }

  const now = Date.now();
  const maxNestHp = 13 + squadAssist.nestDefense.startingHpBonus;
  const tapDamageCost = tapDamageLevel >= maxTapUpgradeLevel ? null : tapUpgradeCost("damage", tapDamageLevel);
  const tapSpeedCost = tapSpeedLevel >= maxTapUpgradeLevel ? null : tapUpgradeCost("speed", tapSpeedLevel);

  return (
    <View style={styles.shell}>
      {!(ranked && state === "running") && <View style={styles.header}><View><Text style={styles.title}>Nest Defense</Text><Text style={styles.meta}>Best score: {bestScore}</Text></View>{(practice || state === "result") && <Pressable accessibilityLabel="Back to games" style={styles.closeButton} onPress={back}><GameUiIcon name="back" size={24} /></Pressable>}</View>}
      {eventLabel ? <View style={styles.eventBanner}><Text style={styles.eventBannerText}>{eventLabel}</Text></View> : null}
      {state === "ready" && <Ready onStart={start} />}
      {state === "running" && (
        <View style={styles.game}>
          <View style={styles.hud}><Text style={styles.hudText}>{Math.ceil(remainingMs / 1000)}s</Text><Text style={styles.hudText}>{score}</Text><Text style={styles.hudText}>Nest {hp}/{maxNestHp}</Text><Text style={styles.hudText}>Coins {coins}</Text><Text style={styles.hudText}>Wave {wave}{isBossWave(wave, eventBalance.bossWaveInterval) ? " Boss" : ""}</Text></View>
          <Pressable
            accessibilityLabel="Manual tap attack"
            ref={fieldRef}
            style={styles.field}
            testID="nest-defense-tap-field"
            onLayout={updateFieldLayout}
            onPress={manualTapAttack}
          >
            <SpriteCrop pointerEvents="none" rect={{ x: 768, y: 20, width: 744, height: 724 }} sheetHeight={1536} sheetWidth={1536} source={arcadeShowcaseImage} style={styles.backgroundArt} />
            <View pointerEvents="none" style={styles.fieldShade} />
            <View pointerEvents="none" style={styles.squadOverlay}><ArcadeSquadAssist micro label={`Squad ${squadAssist.activeCount}/3`} user={user} /></View>
            {pathDots().map((dot, index) => <View key={index} pointerEvents="none" style={[styles.pathDot, { left: `${dot.x}%`, top: `${dot.y}%`, transform: [{ scale: fieldScale }] }]} />)}
            {slowZones.map((zone) => {
              const pos = pointOnPath(zone.progress);
              return <View key={zone.id} pointerEvents="none" style={[styles.slowZone, { left: `${pos.x}%`, top: `${pos.y}%`, transform: [{ scale: fieldScale }] }]} />;
            })}
            {towers.map((tower) => <TowerSlot key={tower.id} scale={fieldScale} selectedTower={selectedTower} tower={tower} onPress={() => buyOrUpgrade(tower.id)} />)}
            <View pointerEvents="none" style={[styles.nest, { transform: [{ scale: fieldScale }] }]}>
              <LifePips current={hp} max={maxNestHp} />
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={nestImage} style={styles.nestImage} />
            </View>
            {enemies.map((enemy) => <EnemyView key={enemy.id} enemy={enemy} scale={fieldScale} />)}
            {impacts.map((impact) => <View key={impact.id} pointerEvents="none" style={[styles.manualImpact, { left: `${impact.x}%`, top: `${impact.y}%`, transform: [{ scale: fieldScale }] }]}><Text style={styles.manualImpactText}>HIT</Text></View>)}
          </Pressable>
          <View style={styles.controlDeck}>
            <View style={styles.abilityBar}>
              <AbilityButton disabled={now < manualCooldownUntil} label={now < manualCooldownUntil ? `Tap ${Math.ceil((manualCooldownUntil - now) / 1000)}s` : `Tap ${manualDamageForLevel(tapDamageLevel, wave)}` } />
              <Pressable disabled={now < sprayCooldownUntil} style={[styles.abilityButton, now < sprayCooldownUntil && styles.abilityDisabled]} onPress={useBugSpray}><Text style={styles.abilityText}>{now < sprayCooldownUntil ? `Spray ${Math.ceil((sprayCooldownUntil - now) / 1000)}s` : "Bug spray"}</Text></Pressable>
              <Pressable disabled={now < stickyCooldownUntil} style={[styles.abilityButton, now < stickyCooldownUntil && styles.abilityDisabled]} onPress={useStickyWeb}><Text style={styles.abilityText}>{now < stickyCooldownUntil ? `Web ${Math.ceil((stickyCooldownUntil - now) / 1000)}s` : "Sticky web"}</Text></Pressable>
            </View>
            <View style={styles.tapUpgradeBar}>
              <Pressable disabled={!tapDamageCost || coins < tapDamageCost} style={[styles.tapUpgradeButton, (!tapDamageCost || coins < tapDamageCost) && styles.tapUpgradeDisabled]} onPress={() => upgradeTap("damage")}>
                <Text style={styles.tapUpgradeTitle}>Tap DMG Lv{tapDamageLevel}</Text>
                <Text style={styles.tapUpgradeCost}>{tapDamageCost ? `Up ${tapDamageCost}` : "MAX"}</Text>
              </Pressable>
              <Pressable disabled={!tapSpeedCost || coins < tapSpeedCost} style={[styles.tapUpgradeButton, (!tapSpeedCost || coins < tapSpeedCost) && styles.tapUpgradeDisabled]} onPress={() => upgradeTap("speed")}>
                <Text style={styles.tapUpgradeTitle}>Tap SPD Lv{tapSpeedLevel}</Text>
                <Text style={styles.tapUpgradeCost}>{tapSpeedCost ? `Up ${tapSpeedCost}` : "MAX"}</Text>
              </Pressable>
            </View>
            <View style={styles.towerBar}>
              {(["rapid", "heavy", "slow"] as TowerKind[]).map((kind) => (
                <Pressable key={kind} style={[styles.towerButton, selectedTower === kind && styles.towerButtonActive]} onPress={() => setSelectedTower(kind)}>
                  <Image accessibilityIgnoresInvertColors resizeMode="contain" source={towerImage[kind]} style={styles.towerButtonImage} />
                  <Text style={styles.towerButtonTitle}>{towerLabel(kind)}</Text>
                  <Text style={styles.towerButtonMeta}>{towerHint(kind)}</Text>
                  <Text style={styles.towerButtonMeta}>Build {towerCost[kind]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {manualCombo > 1 && <Text style={styles.comboNotice}>Manual combo x{manualCombo}</Text>}
        </View>
      )}
      {state === "result" && result && <Result ranked={ranked} result={result} onBack={onBack} onRetry={start} />}
    </View>
  );
}

function Ready({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Active Nest Defense</Text>
      <Text style={styles.body}>Build counters: Rapid clears Fast/Swarm, Heavy breaks Armor/Bosses, Slow controls leaks. Boss waves start at wave 6 and hit the nest harder later.</Text>
      <Pressable style={styles.primaryButton} onPress={onStart}><Text style={styles.primaryText}>Start</Text></Pressable>
    </View>
  );
}

function Result({ onBack, onRetry, ranked, result }: { onBack: () => void; onRetry: () => void; ranked: boolean; result: ArcadeRunResult }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Nest Defense result</Text>
      <Text style={styles.score}>{result.score}</Text>
      <Text style={styles.body}>Best score: {result.localHighScore}</Text>
      <Text style={styles.body}>Kills: {result.pickups} | Leaks: {result.hits} | Wave: {result.combo}</Text>
      {!ranked && <Pressable style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Retry</Text></Pressable>}
      <Pressable style={ranked ? styles.primaryButton : styles.secondaryButton} onPress={onBack}><Text style={ranked ? styles.primaryText : styles.secondaryText}>Back to Arena</Text></Pressable>
    </View>
  );
}

function AbilityButton({ disabled, label }: { disabled: boolean; label: string }) {
  return <View style={[styles.abilityButton, disabled && styles.abilityDisabled]}><Text style={styles.abilityText}>{label}</Text></View>;
}

function LifePips({ current, max }: { current: number; max: number }) {
  const visibleMax = Math.min(max, 18);
  return (
    <View style={styles.lifePips}>
      {Array.from({ length: visibleMax }).map((_, index) => (
        <View key={index} style={[styles.lifePip, index >= current && styles.lifePipEmpty]} />
      ))}
    </View>
  );
}

function TowerSlot({ onPress, scale, selectedTower, tower }: { onPress: () => void; scale: number; selectedTower: TowerKind; tower: Tower }) {
  const costLabel = tower.kind ? tower.level >= 4 ? "MAX" : `Up ${towerUpgradeCost(tower.kind, tower.level)}` : `Build ${towerCost[selectedTower]}`;

  return (
    <Pressable style={[styles.towerSlot, tower.kind && styles.towerSlotBuilt, { left: `${tower.x}%`, top: `${tower.y}%`, transform: [{ scale }] }]} onPress={onPress}>
      {tower.kind ? (
        <>
          <Image accessibilityIgnoresInvertColors resizeMode="contain" source={towerImage[tower.kind]} style={styles.towerImage} />
          <Text style={styles.towerRole}>{towerLabel(tower.kind)}</Text>
          <View style={styles.levelPips}>{Array.from({ length: tower.level }).map((_, index) => <View key={index} style={styles.levelPip} />)}</View>
          <Text style={styles.towerCostTag}>{costLabel}</Text>
        </>
      ) : <View style={styles.emptySlotMark}><View style={styles.emptySlotDot} /><Text style={styles.emptySlotCost}>{costLabel}</Text></View>}
    </Pressable>
  );
}

function EnemyView({ enemy, scale }: { enemy: Enemy; scale: number }) {
  const pos = pointOnPath(enemy.progress);
  const hpWidth = Math.max(8, Math.round((enemy.hp / enemy.maxHp) * 38));
  const bugId = enemy.kind === "boss" ? bossBugArtId(enemy.id) : enemy.kind === "tank" || enemy.kind === "armored" ? "atlaskever" : enemy.kind === "fast" || enemy.kind === "swarm" ? "hoornaar" : enemy.kind === "healer" ? "lieveheersbeestje" : "houtmier";
  const enemySize = enemy.kind === "boss" ? 66 : enemy.kind === "tank" || enemy.kind === "armored" ? 56 : enemy.kind === "swarm" ? 38 : 46;
  return (
    <View pointerEvents="none" style={[styles.enemy, enemy.kind === "boss" && styles.bossEnemy, { left: `${pos.x}%`, top: `${pos.y}%`, transform: [{ scale }] }]}>
      <BugArtImage bugId={bugId} fallbackVariant={enemy.kind === "fast" || enemy.kind === "swarm" ? "dragonfly" : "beetle"} size={enemySize} />
      <Text style={[styles.enemyType, enemy.kind === "boss" && styles.bossType]}>{enemy.kind.toUpperCase()}</Text>
      <View style={styles.hpTrack}><View style={[styles.hpFill, { width: hpWidth }]} /></View>
    </View>
  );
}

function towerSpec(kind: TowerKind, level: number, enemyKind: EnemyKind, damageMultiplier = 1, fireRateMultiplier = 1) {
  if (kind === "rapid") return { cooldownMs: Math.max(230, Math.round((540 - level * 48) * fireRateMultiplier)), damage: Math.ceil(((enemyKind === "fast" || enemyKind === "swarm" ? 2 : 1) + Math.floor(level * 0.72)) * damageMultiplier), range: 21 + level * 3, slowMs: 0 };
  if (kind === "heavy") return { cooldownMs: Math.max(780, Math.round((1350 - level * 86) * fireRateMultiplier)), damage: Math.ceil(((enemyKind === "tank" || enemyKind === "boss" || enemyKind === "armored" ? 5 : 2) + level * 2) * damageMultiplier), range: 26 + level * 4, slowMs: 0 };
  return { cooldownMs: Math.max(820, Math.round((1180 - level * 66) * fireRateMultiplier)), damage: Math.ceil((1 + Math.floor(level / 2)) * damageMultiplier), range: 30 + level * 3, slowMs: enemyKind === "boss" ? 900 + level * 160 : 1400 + level * 300 };
}

function towerUpgradeCost(kind: TowerKind, level: number) {
  const base = kind === "rapid" ? 82 : kind === "slow" ? 94 : 112;
  return base + level * 72 + level * level * 16;
}

function tapUpgradeCost(kind: TapUpgradeKind, level: number) {
  return (kind === "damage" ? 58 : 46) + level * 54 + level * level * 12;
}

function manualCooldownForLevel(level: number) {
  return Math.max(360, manualCooldownMs - (level - 1) * 135);
}

function manualDamageForLevel(level: number, wave: number) {
  return 1 + Math.floor(wave / 7) + (level - 1);
}

function pickTarget(enemies: Enemy[], tower: Tower) {
  if (!tower.kind) return null;
  return enemies
    .map((enemy) => ({ enemy, pos: pointOnPath(enemy.progress), spec: towerSpec(tower.kind as TowerKind, tower.level, enemy.kind) }))
    .filter(({ pos, spec }) => distance(pos.x, pos.y, tower.x, tower.y) <= spec.range)
    .sort((a, b) => targetPriority(b.enemy, tower.kind as TowerKind) - targetPriority(a.enemy, tower.kind as TowerKind) || b.enemy.progress - a.enemy.progress)[0]?.enemy ?? null;
}

function targetPriority(enemy: Enemy, towerKind: TowerKind) {
  if (enemy.kind === "healer") return towerKind === "heavy" ? 24 : 18;
  if (towerKind === "rapid" && (enemy.kind === "fast" || enemy.kind === "swarm")) return 22;
  if (towerKind === "heavy" && (enemy.kind === "tank" || enemy.kind === "boss" || enemy.kind === "armored")) return 22;
  if (towerKind === "slow" && enemy.slowUntil <= Date.now()) return enemy.kind === "swarm" ? 20 : 14;
  return enemy.kind === "boss" ? 12 : enemy.kind === "armored" ? 10 : enemy.kind === "tank" ? 9 : enemy.kind === "fast" ? 7 : enemy.kind === "swarm" ? 6 : 4;
}

function bossBugArtId(enemyId: string) {
  const wave = Number(enemyId.split(":")[1] ?? 0);
  const bossBugIds = ["atlaskever", "herculeskever", "goliathkever", "titanus-kever", "olifantskever", "vliegend-hert"];
  return bossBugIds[Math.max(0, Math.floor((wave - 6) / 5)) % bossBugIds.length];
}

function isBossWave(wave: number, interval = 5) {
  return wave >= 6 && (wave - 6) % interval === 0;
}

function bossHpForWave(wave: number) {
  const lateRamp = Math.max(0, wave - 11);
  return 46 + wave * 7 + lateRamp * 5;
}

function bossSpeedForWave(wave: number) {
  return 0.00255 + Math.min(16, wave) * 0.000075;
}

function leakDamage(kind: EnemyKind, wave: number) {
  if (kind === "boss") return wave >= 21 ? 6 : wave >= 16 ? 5 : wave >= 11 ? 4 : 3;
  if (kind === "tank" || kind === "armored") return 2;
  return 1;
}

function effectiveDamageForSource(enemyKind: EnemyKind, damage: number, source: TowerKind | "manual" | "spray") {
  if (enemyKind === "armored" && source !== "heavy") return Math.max(1, Math.floor(damage * 0.42));
  if (enemyKind === "swarm" && source === "heavy") return Math.max(1, Math.floor(damage * 0.55));
  if (enemyKind === "healer" && source === "slow") return Math.max(1, Math.floor(damage * 0.5));
  if (enemyKind === "boss" && source === "manual") return Math.max(1, Math.floor(damage * 0.55));
  return damage;
}

function coinReward(kind: EnemyKind) {
  return kind === "boss" ? 72 : kind === "tank" ? 26 : kind === "armored" ? 28 : kind === "healer" ? 24 : kind === "fast" ? 16 : kind === "swarm" ? 9 : 12;
}

function killScore(kind: EnemyKind) {
  return kind === "boss" ? 155 : kind === "tank" ? 50 : kind === "armored" ? 56 : kind === "healer" ? 52 : kind === "fast" ? 34 : kind === "swarm" ? 18 : 25;
}

function towerLabel(kind: TowerKind) {
  if (kind === "rapid") return "Rapid";
  if (kind === "heavy") return "Heavy";
  return "Slow";
}

function towerHint(kind: TowerKind) {
  if (kind === "rapid") return "fast/swarm";
  if (kind === "heavy") return "armor/boss";
  return "control";
}

function pointOnPath(progress: number) {
  const safe = Math.max(0, Math.min(0.999, progress));
  const total = path.length - 1;
  const scaled = safe * total;
  const index = Math.floor(scaled);
  const mix = scaled - index;
  const from = path[index];
  const to = path[index + 1];
  return { x: from.x + (to.x - from.x) * mix, y: from.y + (to.y - from.y) * mix };
}

function pathDots() {
  return Array.from({ length: 42 }).map((_, index) => pointOnPath(index / 41));
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  abilityBar: { flexDirection: "row", gap: 7 },
  abilityButton: { alignItems: "center", backgroundColor: "rgba(215,189,87,0.94)", borderColor: "rgba(249,251,247,0.8)", borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 38 },
  abilityDisabled: { backgroundColor: "rgba(156,163,175,0.8)", opacity: 0.8 },
  abilityText: { color: "#102018", fontSize: 11, fontWeight: "900" },
  backgroundArt: { bottom: 0, left: 0, opacity: 0.92, position: "absolute", right: 0, top: 0 },
  body: { color: "#dfe9df", fontSize: 15, fontWeight: "700", lineHeight: 22, textAlign: "center" },
  bossEnemy: { height: 76, marginLeft: -38, marginTop: -38, width: 76 },
  bossType: { backgroundColor: "#b83227", color: "#fff" },
  closeButton: { alignItems: "center", backgroundColor: "#f9fbf7", borderRadius: 12, height: 52, justifyContent: "center", width: 52 },
  closeText: { color: "#102018", fontSize: 28, fontWeight: "900" },
  comboNotice: { backgroundColor: "rgba(16,32,24,0.86)", borderColor: "#d7bd57", borderRadius: 999, borderWidth: 1, bottom: 166, color: "#d7bd57", fontSize: 14, fontWeight: "900", left: 14, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4, position: "absolute", zIndex: 12 },
  controlDeck: { backgroundColor: "rgba(7,29,18,0.98)", borderTopColor: "rgba(215,189,87,0.45)", borderTopWidth: 1, gap: 6, padding: 7, zIndex: 10 },
  emptySlotCost: { bottom: -16, color: "#f9fbf7", fontSize: 8, fontWeight: "900", position: "absolute" },
  emptySlotDot: { backgroundColor: "#d7bd57", borderRadius: 999, height: 14, width: 14 },
  emptySlotMark: { alignItems: "center", borderColor: "rgba(215,189,87,0.75)", borderRadius: 999, borderWidth: 2, height: 28, justifyContent: "center", width: 28 },
  enemy: { alignItems: "center", height: 58, justifyContent: "center", marginLeft: -29, marginTop: -29, position: "absolute", width: 58, zIndex: 5 },
  enemyType: { backgroundColor: "rgba(16,32,24,0.82)", borderRadius: 999, color: "#d7bd57", fontSize: 7, fontWeight: "900", marginTop: -6, overflow: "hidden", paddingHorizontal: 4 },
  eventBanner: { alignItems: "center", backgroundColor: "#d7bd57", borderBottomColor: "#fff0a8", borderBottomWidth: 1, minHeight: 28, paddingHorizontal: 12, paddingVertical: 5 },
  eventBannerText: { color: "#102018", fontSize: 11, fontWeight: "900", letterSpacing: 0.7, textAlign: "center" },
  field: { flex: 1, minHeight: 0, overflow: "hidden" },
  fieldShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,29,18,0.2)" },
  game: { flex: 1, minHeight: 0, position: "relative" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 },
  healthBarFill: { backgroundColor: "#22c55e", borderRadius: 999, height: "100%" },
  healthBarLabel: { color: "#d7bd57", fontSize: 10, fontWeight: "900", marginBottom: 3 },
  healthBarTrack: { backgroundColor: "rgba(239,68,68,0.42)", borderColor: "rgba(249,251,247,0.65)", borderRadius: 999, borderWidth: 1, height: 11, overflow: "hidden" },
  healthBarWrap: { backgroundColor: "rgba(7,29,18,0.86)", borderBottomColor: "rgba(215,189,87,0.38)", borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  hpFill: { backgroundColor: "#84cc16", borderRadius: 999, height: 5 },
  hpTrack: { backgroundColor: "rgba(239,68,68,0.55)", borderRadius: 999, height: 5, marginTop: -2, width: 38 },
  hud: { backgroundColor: "rgba(7,29,18,0.9)", borderBottomColor: "rgba(215,189,87,0.55)", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 34, paddingBottom: 7, paddingHorizontal: 10 },
  hudText: { color: "#d7bd57", fontSize: 13, fontWeight: "900" },
  levelPip: { backgroundColor: "#d7bd57", borderColor: "#102018", borderRadius: 999, borderWidth: 1, height: 7, width: 7 },
  levelPips: { bottom: -4, flexDirection: "row", gap: 2, position: "absolute" },
  lifePip: { backgroundColor: "#22c55e", borderColor: "#f9fbf7", borderRadius: 999, borderWidth: 1, height: 7, width: 11 },
  lifePipEmpty: { backgroundColor: "rgba(239,68,68,0.45)", borderColor: "rgba(249,251,247,0.45)" },
  lifePips: { flexDirection: "row", flexWrap: "wrap", gap: 2, justifyContent: "center", position: "absolute", top: -8, width: 112, zIndex: 9 },
  manualImpact: { alignItems: "center", backgroundColor: "rgba(215,189,87,0.28)", borderColor: "#f9fbf7", borderRadius: 999, borderWidth: 2, height: 42, justifyContent: "center", marginLeft: -21, marginTop: -21, position: "absolute", width: 42, zIndex: 8 },
  manualImpactText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  meta: { color: "#a9b8ae", fontSize: 13, fontWeight: "800" },
  nest: { alignItems: "center", height: 76, justifyContent: "center", position: "absolute", right: -18, top: "77%", width: 102, zIndex: 4 },
  nestImage: { height: 86, width: 112 },
  panel: { alignItems: "center", backgroundColor: "rgba(16,32,24,0.94)", borderColor: "#d7bd57", borderRadius: 10, borderWidth: 1, gap: 14, margin: 16, padding: 18 },
  panelTitle: { color: "#f9fbf7", fontSize: 26, fontWeight: "900", textAlign: "center" },
  pathDot: { backgroundColor: "rgba(215,189,87,0.78)", borderRadius: 999, height: 9, marginLeft: -4, marginTop: -4, position: "absolute", width: 9, zIndex: 2 },
  primaryButton: { alignItems: "center", backgroundColor: "#168251", borderRadius: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 20, width: "100%" },
  primaryText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  score: { color: "#d7bd57", fontSize: 56, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: "#d7e1d9", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 20, width: "100%" },
  secondaryText: { color: "#f9fbf7", fontSize: 16, fontWeight: "900" },
  shell: { backgroundColor: "#071d12", flex: 1 },
  slowZone: { backgroundColor: "rgba(56,189,248,0.18)", borderColor: "#38bdf8", borderRadius: 999, borderWidth: 3, height: 92, marginLeft: -46, marginTop: -46, position: "absolute", width: 92, zIndex: 3 },
  squadOverlay: { position: "absolute", right: 6, top: 6, zIndex: 9 },
  title: { color: "#f9fbf7", fontSize: 28, fontWeight: "900" },
  tapUpgradeBar: { flexDirection: "row", gap: 7 },
  tapUpgradeButton: { alignItems: "center", backgroundColor: "rgba(16,32,24,0.92)", borderColor: "#d7bd57", borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 42 },
  tapUpgradeCost: { color: "#d7bd57", fontSize: 10, fontWeight: "900" },
  tapUpgradeDisabled: { opacity: 0.52 },
  tapUpgradeTitle: { color: "#f9fbf7", fontSize: 11, fontWeight: "900" },
  towerBar: { flexDirection: "row", gap: 7 },
  towerButton: { alignItems: "center", backgroundColor: "rgba(249,251,247,0.9)", borderColor: "rgba(215,189,87,0.55)", borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48 },
  towerButtonActive: { backgroundColor: "#d7bd57", borderColor: "#f9fbf7" },
  towerButtonImage: { height: 28, width: 38 },
  towerButtonMeta: { color: "#425047", fontSize: 9, fontWeight: "900" },
  towerButtonTitle: { color: "#102018", fontSize: 12, fontWeight: "900" },
  towerCostTag: { backgroundColor: "#102018", borderColor: "#d7bd57", borderRadius: 999, borderWidth: 1, bottom: -18, color: "#d7bd57", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 5, position: "absolute" },
  towerImage: { height: 42, width: 42 },
  towerRole: { color: "#102018", fontSize: 8, fontWeight: "900", marginTop: -5 },
  towerSlot: { alignItems: "center", backgroundColor: "rgba(16,32,24,0.74)", borderColor: "rgba(215,189,87,0.82)", borderRadius: 12, borderWidth: 2, height: 60, justifyContent: "center", marginLeft: -30, marginTop: -30, position: "absolute", width: 60, zIndex: 4 },
  towerSlotBuilt: { backgroundColor: "rgba(249,251,247,0.86)" }
});
