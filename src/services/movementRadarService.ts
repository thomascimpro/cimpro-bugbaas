import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import { allBugArtIds, BugArtId } from "./bugArt";
import { bugDexEntries, BugDexRarity } from "./pointsService";

type StepSnapshot = {
  available: boolean;
  capturedAt?: number;
  reason?: "permission" | "sensor" | "timeout" | string;
  stepsSinceBoot?: number;
};

type ExerciseDistanceSnapshot = {
  available: boolean;
  capturedAt?: number;
  cyclingMeters?: number;
  reason?: "health_connect_unavailable" | "health_permission" | "health_error" | string;
  runningMeters?: number;
  walkingMeters?: number;
};

type MovementRadarState = {
  awardedUnits: number;
  baselineSteps: number;
  cyclingUnits?: number;
  day: string;
  lastSteps: number;
  runningUnits?: number;
  walkingUnits?: number;
};

export type MovementRadarResult = {
  awarded: number;
  bugIds: BugArtId[];
  estimatedKm: number;
  reason?: string;
};

export type MovementRadarGoal = {
  earned: number;
  id: "walking" | "running" | "cycling";
  km: number;
  label: string;
  targetKm: number;
};

export type MovementRadarProgress = {
  available: boolean;
  awardedToday: number;
  goals: MovementRadarGoal[];
  maxRewards: number;
  reason?: string;
};

const nativeModule = NativeModules.BugBaasNative as {
  enqueueRadarBugs?: (bugIds: string[]) => Promise<number>;
  getExerciseDistanceSnapshot?: () => Promise<ExerciseDistanceSnapshot>;
  getStepCounterSnapshot?: () => Promise<StepSnapshot>;
  requestHealthPermissions?: () => Promise<boolean>;
} | undefined;

const activityRecognitionPermission = "android.permission.ACTIVITY_RECOGNITION";
const estimatedMetersPerStep = 0.75;
const fallbackWalkingMetersPerRadarBug = 2000;
const walkingMetersPerRadarBug = 2000;
const runningMetersPerRadarBug = 4000;
const cyclingMetersPerRadarBug = 8000;
const maxMovementRadarBugsPerDay = 5;

export async function claimMovementRadarBonuses(uid: string): Promise<MovementRadarResult> {
  if (Platform.OS !== "android") return emptyResult("platform");
  if (!nativeModule?.getStepCounterSnapshot || !nativeModule.enqueueRadarBugs) return emptyResult("native");

  const healthResult = await claimHealthConnectBonuses(uid);
  if (healthResult.reason === "health_permission" && await requestHealthConnectPermissionsOnce(uid)) {
    return emptyResult("health_permission_requested");
  }
  if (healthResult.reason !== "health_connect_unavailable" && healthResult.reason !== "health_permission" && healthResult.reason !== "health_error") {
    return healthResult;
  }

  const hasPermission = await ensureActivityRecognitionPermission();
  if (!hasPermission) return emptyResult("permission");

  const snapshot = await nativeModule.getStepCounterSnapshot();
  if (!snapshot.available || typeof snapshot.stepsSinceBoot !== "number") {
    return emptyResult(snapshot.reason ?? "sensor");
  }

  const today = localDayId();
  const stateKey = `movement-radar:${uid}`;
  const previous = await loadState(stateKey);
  const stepsSinceBoot = Math.max(0, Math.floor(snapshot.stepsSinceBoot));
  const baselineSteps = !previous || previous.day !== today || stepsSinceBoot < previous.baselineSteps
    ? stepsSinceBoot
    : previous.baselineSteps;
  const awardedUnits = !previous || previous.day !== today || stepsSinceBoot < previous.baselineSteps
    ? 0
    : previous.awardedUnits;
  const walkedSteps = Math.max(0, stepsSinceBoot - baselineSteps);
  const estimatedKm = (walkedSteps * estimatedMetersPerStep) / 1000;
  const totalUnits = Math.min(maxMovementRadarBugsPerDay, Math.floor((walkedSteps * estimatedMetersPerStep) / fallbackWalkingMetersPerRadarBug));
  const newUnits = Math.max(0, totalUnits - awardedUnits);

  if (newUnits <= 0) {
    await saveState(stateKey, { awardedUnits, baselineSteps, day: today, lastSteps: stepsSinceBoot });
    return { awarded: 0, bugIds: [], estimatedKm };
  }

  const bugIds = Array.from({ length: newUnits }, pickMovementBugId);
  const added = Math.max(0, Math.min(newUnits, await nativeModule.enqueueRadarBugs(bugIds)));
  await saveState(stateKey, {
    awardedUnits: awardedUnits + added,
    baselineSteps,
    day: today,
    lastSteps: stepsSinceBoot
  });

  return { awarded: added, bugIds: bugIds.slice(0, added), estimatedKm };
}

export async function getMovementRadarProgress(uid: string): Promise<MovementRadarProgress> {
  if (Platform.OS !== "android") return emptyProgress("platform");
  if (!nativeModule?.getStepCounterSnapshot) return emptyProgress("native");

  const healthProgress = await getHealthConnectProgress(uid);
  if (healthProgress.available || healthProgress.reason === "health_permission") return healthProgress;

  const snapshot = await nativeModule.getStepCounterSnapshot();
  if (!snapshot.available || typeof snapshot.stepsSinceBoot !== "number") {
    return emptyProgress(snapshot.reason ?? "sensor");
  }

  const today = localDayId();
  const state = await loadState(`movement-radar:${uid}`);
  const stepsSinceBoot = Math.max(0, Math.floor(snapshot.stepsSinceBoot));
  const baselineSteps = !state || state.day !== today || stepsSinceBoot < state.baselineSteps
    ? stepsSinceBoot
    : state.baselineSteps;
  const walkedKm = ((stepsSinceBoot - baselineSteps) * estimatedMetersPerStep) / 1000;
  const earned = Math.floor(Math.max(0, walkedKm * 1000) / fallbackWalkingMetersPerRadarBug);

  return {
    available: true,
    awardedToday: state?.day === today ? state.awardedUnits : 0,
    goals: [
      makeGoal("walking", "Loop", walkedKm, fallbackWalkingMetersPerRadarBug, earned),
      makeGoal("running", "Run", 0, runningMetersPerRadarBug, 0),
      makeGoal("cycling", "Fiets", 0, cyclingMetersPerRadarBug, 0)
    ],
    maxRewards: maxMovementRadarBugsPerDay
  };
}

async function claimHealthConnectBonuses(uid: string): Promise<MovementRadarResult> {
  if (!nativeModule?.getExerciseDistanceSnapshot || !nativeModule.enqueueRadarBugs) return emptyResult("native");
  const snapshot = await nativeModule.getExerciseDistanceSnapshot();
  if (!snapshot.available) return emptyResult(snapshot.reason ?? "health_connect_unavailable");

  const today = localDayId();
  const stateKey = `movement-radar:${uid}`;
  const previous = await loadState(stateKey);
  const state = !previous || previous.day !== today
    ? { awardedUnits: 0, baselineSteps: 0, cyclingUnits: 0, day: today, lastSteps: 0, runningUnits: 0, walkingUnits: 0 }
    : previous;

  const walkingUnits = Math.floor(Math.max(0, snapshot.walkingMeters ?? 0) / walkingMetersPerRadarBug);
  const runningUnits = Math.floor(Math.max(0, snapshot.runningMeters ?? 0) / runningMetersPerRadarBug);
  const cyclingUnits = Math.floor(Math.max(0, snapshot.cyclingMeters ?? 0) / cyclingMetersPerRadarBug);
  const newWalking = Math.max(0, walkingUnits - (state.walkingUnits ?? 0));
  const newRunning = Math.max(0, runningUnits - (state.runningUnits ?? 0));
  const newCycling = Math.max(0, cyclingUnits - (state.cyclingUnits ?? 0));
  const remainingDailySlots = Math.max(0, maxMovementRadarBugsPerDay - state.awardedUnits);
  const newUnits = Math.min(remainingDailySlots, newWalking + newRunning + newCycling);
  const estimatedKm = ((snapshot.walkingMeters ?? 0) + (snapshot.runningMeters ?? 0) + (snapshot.cyclingMeters ?? 0)) / 1000;

  if (newUnits <= 0) {
    await saveState(stateKey, {
      ...state,
      cyclingUnits,
      runningUnits,
      walkingUnits
    });
    return { awarded: 0, bugIds: [], estimatedKm };
  }

  const bugIds = Array.from({ length: newUnits }, pickMovementBugId);
  const added = Math.max(0, Math.min(newUnits, await nativeModule.enqueueRadarBugs(bugIds)));
  await saveState(stateKey, {
    ...state,
    awardedUnits: state.awardedUnits + added,
    cyclingUnits,
    runningUnits,
    walkingUnits
  });
  return { awarded: added, bugIds: bugIds.slice(0, added), estimatedKm };
}

async function getHealthConnectProgress(uid: string): Promise<MovementRadarProgress> {
  if (!nativeModule?.getExerciseDistanceSnapshot) return emptyProgress("native");
  const snapshot = await nativeModule.getExerciseDistanceSnapshot();
  if (!snapshot.available) return emptyProgress(snapshot.reason ?? "health_connect_unavailable");

  const today = localDayId();
  const state = await loadState(`movement-radar:${uid}`);
  const walkingKm = Math.max(0, snapshot.walkingMeters ?? 0) / 1000;
  const runningKm = Math.max(0, snapshot.runningMeters ?? 0) / 1000;
  const cyclingKm = Math.max(0, snapshot.cyclingMeters ?? 0) / 1000;

  return {
    available: true,
    awardedToday: state?.day === today ? state.awardedUnits : 0,
    goals: [
      makeGoal("walking", "Loop", walkingKm, walkingMetersPerRadarBug, Math.floor((snapshot.walkingMeters ?? 0) / walkingMetersPerRadarBug)),
      makeGoal("running", "Run", runningKm, runningMetersPerRadarBug, Math.floor((snapshot.runningMeters ?? 0) / runningMetersPerRadarBug)),
      makeGoal("cycling", "Fiets", cyclingKm, cyclingMetersPerRadarBug, Math.floor((snapshot.cyclingMeters ?? 0) / cyclingMetersPerRadarBug))
    ],
    maxRewards: maxMovementRadarBugsPerDay
  };
}

async function ensureActivityRecognitionPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 29) return true;
  const current = await PermissionsAndroid.check(activityRecognitionPermission);
  if (current) return true;
  const result = await PermissionsAndroid.request(activityRecognitionPermission, {
    title: "Movement radar",
    message: "BugBaas gebruikt je stappen om extra radarbugs te vinden na genoeg beweging.",
    buttonPositive: "Toestaan",
    buttonNegative: "Niet nu"
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestHealthConnectPermissionsOnce(uid: string): Promise<boolean> {
  if (!nativeModule?.requestHealthPermissions) return false;
  const key = `movement-radar-health-permission-requested:${uid}`;
  const alreadyRequested = await AsyncStorage.getItem(key);
  if (alreadyRequested === "true") return false;
  const opened = await nativeModule.requestHealthPermissions();
  if (opened) await AsyncStorage.setItem(key, "true");
  return opened;
}

async function loadState(key: string): Promise<MovementRadarState | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MovementRadarState;
  } catch {
    return null;
  }
}

async function saveState(key: string, state: MovementRadarState): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(state));
}

function pickMovementBugId(): BugArtId {
  const rarity = pickMovementRarity();
  const candidates = bugDexEntries
    .filter((entry) => entry.rarity === rarity && allBugArtIds.includes(entry.id as BugArtId))
    .map((entry) => entry.id as BugArtId);
  const pool = candidates.length > 0 ? candidates : allBugArtIds;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickMovementRarity(): BugDexRarity {
  const roll = Math.random();
  if (roll < 0.05) return "Episch";
  if (roll < 0.3) return "Zeldzaam";
  return "Gewoon";
}

function emptyResult(reason: string): MovementRadarResult {
  return { awarded: 0, bugIds: [], estimatedKm: 0, reason };
}

function emptyProgress(reason: string): MovementRadarProgress {
  return {
    available: false,
    awardedToday: 0,
    goals: [
      makeGoal("walking", "Loop", 0, walkingMetersPerRadarBug, 0),
      makeGoal("running", "Run", 0, runningMetersPerRadarBug, 0),
      makeGoal("cycling", "Fiets", 0, cyclingMetersPerRadarBug, 0)
    ],
    maxRewards: maxMovementRadarBugsPerDay,
    reason
  };
}

function makeGoal(id: MovementRadarGoal["id"], label: string, km: number, targetMeters: number, earned: number): MovementRadarGoal {
  return {
    earned,
    id,
    km: Math.max(0, km),
    label,
    targetKm: targetMeters / 1000
  };
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
