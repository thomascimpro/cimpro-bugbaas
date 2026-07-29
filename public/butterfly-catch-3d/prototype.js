import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/+esm";

const canvas = document.querySelector("#scene");
const app = document.querySelector("#app");
const scoreLabel = document.querySelector("#score");
const catchCountLabel = document.querySelector("#catch-count");
const timerLabel = document.querySelector("#timer");
const bestScoreLabel = document.querySelector("#best-score");
const fpsLabel = document.querySelector("#fps");
const statusLabel = document.querySelector("#control-status");
const messageLabel = document.querySelector("#message");
const startOrientationButton = document.querySelector("#start-orientation");
const recalibrateButton = document.querySelector("#recalibrate");
const fullscreenButton = document.querySelector("#fullscreen");
const readyPanel = document.querySelector("#ready-panel");
const resultPanel = document.querySelector("#result-panel");
const startRunButton = document.querySelector("#start-run");
const playAgainButton = document.querySelector("#play-again");
const resultScoreLabel = document.querySelector("#result-score");
const resultCatchesLabel = document.querySelector("#result-catches");
const resultAccuracyLabel = document.querySelector("#result-accuracy");
const resultComboLabel = document.querySelector("#result-combo");
const saveStatusLabel = document.querySelector("#save-status");
const focusGuide = document.querySelector("#focus-guide");
const focusSpeciesLabel = document.querySelector("#focus-species");
const focusDistanceLabel = document.querySelector("#focus-distance");
const catchZone = document.querySelector("#catch-zone");
const captureHud = document.querySelector("#capture-hud");
const captureStateLabel = document.querySelector("#capture-state");
const focusMeterFill = document.querySelector("#focus-meter-fill");
const captureButton = document.querySelector("#capture-button");
const captureButtonLabel = document.querySelector("#capture-button-label");

function sendHostMessage(payload) {
  let delivered = false;
  if (window.parent !== window) {
    window.parent.postMessage(payload, window.location.origin);
    delivered = true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    delivered = true;
  }
  return delivered;
}

const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 90);
const butterflies = [];
const wingTextureCache = new Map();
const random = mulberry32(7331);
const flyingBugSpecs = [
  { kind: "butterfly", name: "Koninginnenpage", base: "#f6b93b", edge: "#30251c", accent: "#fff1a3", flap: 15, speed: 0.038, scale: 0.35, points: 2, focusRate: 1 },
  { kind: "dragonfly", name: "Smaragdlibel", base: "#43bfa8", edge: "#153b3a", accent: "#a8fff1", flap: 25, speed: 0.066, scale: 0.3, points: 3, focusRate: 1 },
  { kind: "bee", name: "Aardhommel", base: "#e4ae38", edge: "#2d2319", accent: "#f8edcf", flap: 32, speed: 0.028, scale: 0.31, points: 1, focusRate: 1 },
  { kind: "moth", name: "Atlasmot", base: "#bc714c", edge: "#45261d", accent: "#f4ca9f", flap: 11, speed: 0.022, scale: 0.4, points: 1, focusRate: 1 },
  { kind: "beetle", name: "Gouden tor", base: "#3aa36d", edge: "#163d31", accent: "#d9b95c", flap: 22, speed: 0.045, scale: 0.3, points: 2, focusRate: 1 },
  { kind: "butterfly", name: "Blauwe morpho", base: "#1f8de4", edge: "#10203b", accent: "#8fe9ff", flap: 16, speed: 0.061, scale: 0.36, points: 3, focusRate: 1 },
  { kind: "dragonfly", name: "Keizerlibel", base: "#55aee2", edge: "#173653", accent: "#c5f5ff", flap: 27, speed: 0.068, scale: 0.33, points: 3, focusRate: 1 },
  { kind: "bee", name: "Honingbij", base: "#d4932c", edge: "#34251b", accent: "#fff0b8", flap: 34, speed: 0.03, scale: 0.28, points: 1, focusRate: 1 },
  { kind: "moth", name: "Maanmot", base: "#a5d398", edge: "#344d34", accent: "#ecffdf", flap: 10, speed: 0.024, scale: 0.42, points: 1, focusRate: 1 },
  { kind: "beetle", name: "Juweelkever", base: "#3a9e9a", edge: "#162f31", accent: "#d9823e", flap: 23, speed: 0.047, scale: 0.29, points: 2, focusRate: 1 },
  { kind: "butterfly", name: "Atalanta", base: "#d95f32", edge: "#241b1b", accent: "#fff2d1", flap: 16, speed: 0.041, scale: 0.34, points: 2, focusRate: 1 },
  { kind: "dragonfly", name: "Bandheidelibel", base: "#d44a35", edge: "#40221d", accent: "#f8c7aa", flap: 26, speed: 0.065, scale: 0.31, points: 3, focusRate: 1 },
];
const butterflyPalettes = flyingBugSpecs;
const RUN_DURATION_MS = 60_000;
const isIosSafari = (/iPad|iPhone|iPod/i.test(navigator.userAgent)
  || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
  && /WebKit/i.test(navigator.userAgent)
  && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);

let renderer;
let score = 0;
let catches = 0;
let misses = 0;
let streak = 0;
let bestStreak = 0;
let bestScore = loadLocalBestScore();
let runState = "ready";
let runEndsAt = 0;
let activeRunId = "";
let resultSent = false;
let currentPixelRatio = Math.min(window.devicePixelRatio, isIosSafari ? 1.25 : 2);
let lowFpsWindows = 0;
let fpsFrames = 0;
let fpsWindowStartedAt = performance.now();
let lastElapsed = 0;
let messageTimer = 0;
let lastRenderedAt = 0;
let aimedBug = null;
let lockedFocusBug = null;
let aimedBugQuality = 0;
let aimedBugDistance = Number.POSITIVE_INFINITY;
let focusProgress = 0;
let holdActive = false;
let holdStartedAt = 0;
let captureCooldownUntil = 0;
let swingTarget = null;
let swingFocusQuality = 0;
let swingCurve = null;
let bagImpact = 0;
let catchFlashTimer = 0;

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(currentPixelRatio);
  renderer.setClearColor(0x8bb89f, 1);
} catch (error) {
  statusLabel.textContent = "WebGL kon niet worden gestart";
  messageLabel.textContent = error instanceof Error ? error.message : "Onbekende WebGL-fout";
  throw error;
}

camera.position.set(0, 1.78, 0);
camera.rotation.order = "YXZ";
scene.add(camera);
scene.fog = new THREE.FogExp2(0x9ebda5, 0.025);

createLights(scene);
createSkyDome(scene);
createTerrain(scene);
createForest(scene);
createMeadowDetails(scene);

for (let index = 0; index < 12; index += 1) {
  butterflies.push(createButterfly(index));
}

const net = createNet(camera);
const captureFx = createCaptureFx(scene);

const orientationEuler = new THREE.Euler();
const orientationQ0 = new THREE.Quaternion();
const orientationQ1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const orientationZee = new THREE.Vector3(0, 0, 1);
const latestRawOrientation = new THREE.Quaternion();
const orientationCalibration = new THREE.Quaternion();
const targetOrientation = new THREE.Quaternion();
const flattenedOrientation = new THREE.Euler(0, 0, 0, "YXZ");

let orientationEnabled = false;
let orientationListenerAdded = false;
let hasOrientationReading = false;
let needsOrientationCalibration = true;
let screenOrientation = 0;
let dragYaw = 0;
let dragPitch = 0;

let activePointerId = null;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerLastX = 0;
let pointerLastY = 0;
let pointerMoved = false;

let swinging = false;
let swingStartedAt = 0;
let catchAttemptedThisSwing = false;
let netImpact = 0;

const cameraWorldPosition = new THREE.Vector3();
const butterflyWorldPosition = new THREE.Vector3();
const butterflyInNetSpace = new THREE.Vector3();
const projectedBugPosition = new THREE.Vector3();
const captureStartPosition = new THREE.Vector3();
const captureEndPosition = new THREE.Vector3();
const captureMidPosition = new THREE.Vector3();

bindControls();
updateRunHud(RUN_DURATION_MS);
resize();
renderer.setAnimationLoop(animate);

function mulberry32(seed) {
  return function nextRandom() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function range(min, max) {
  return min + (max - min) * random();
}

function smoothstep(value) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function loadLocalBestScore() {
  try {
    return Math.max(0, Math.floor(Number(window.localStorage.getItem("bugbaas:butterfly-catch:best")) || 0));
  } catch {
    return 0;
  }
}

function saveLocalBestScore(value) {
  try {
    window.localStorage.setItem("bugbaas:butterfly-catch:best", String(value));
  } catch {
    // The parent app remains the authoritative persistence path.
  }
}

function createRunId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `butterfly-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateRunHud(remainingMs = runState === "running" ? Math.max(0, runEndsAt - performance.now()) : RUN_DURATION_MS) {
  scoreLabel.textContent = String(score);
  catchCountLabel.textContent = `${catches} gevangen`;
  timerLabel.textContent = `${Math.max(0, Math.ceil(remainingMs / 1000))}s`;
  bestScoreLabel.textContent = `Beste ${bestScore}`;
}

function startRun() {
  score = 0;
  catches = 0;
  misses = 0;
  streak = 0;
  bestStreak = 0;
  activeRunId = createRunId();
  resultSent = false;
  runState = "running";
  runEndsAt = performance.now() + RUN_DURATION_MS;
  aimedBug = null;
  lockedFocusBug = null;
  focusProgress = 0;
  holdActive = false;
  captureCooldownUntil = 0;
  swingTarget = null;
  readyPanel.hidden = true;
  resultPanel.hidden = true;
  captureHud.hidden = false;
  catchZone.hidden = false;
  focusGuide.hidden = true;
  setCaptureButtonState();
  butterflies.forEach((bug, index) => {
    bug.userData.caught = false;
    bug.userData.captureAnimation = null;
    bug.userData.dodgeUntil = 0;
    bug.userData.phase = (index / butterflies.length + random() * 0.12) % 1;
    bug.visible = true;
    bug.scale.setScalar(bug.userData.baseScale);
  });
  sendHostMessage({
    source: "bugbaas-butterfly-catch",
    type: "run-state",
    active: true,
  });
  updateRunHud(RUN_DURATION_MS);
  showMessage("Houd een bug in de vangzone · tik bij 100% om met het net te vangen");
}

function finishRun() {
  if (runState !== "running") return;
  runState = "finished";
  swinging = false;
  holdActive = false;
  captureHud.hidden = true;
  catchZone.hidden = true;
  focusGuide.hidden = true;
  setCaptureButtonState();
  bestScore = Math.max(bestScore, score);
  saveLocalBestScore(bestScore);
  updateRunHud(0);

  const accuracy = catches + misses > 0 ? Math.round((catches / (catches + misses)) * 100) : 0;
  resultScoreLabel.textContent = String(score);
  resultCatchesLabel.textContent = String(catches);
  resultAccuracyLabel.textContent = `${accuracy}%`;
  resultComboLabel.textContent = `x${bestStreak}`;
  saveStatusLabel.textContent = "Highscore lokaal bewaard · database opslaan…";
  resultPanel.hidden = false;
  sendHostMessage({
    source: "bugbaas-butterfly-catch",
    type: "run-state",
    active: false,
  });

  if (!resultSent && sendHostMessage({
    source: "bugbaas-butterfly-catch",
    type: "run-complete",
    runId: activeRunId,
    result: {
      accuracy,
      bestStreak,
      catches,
      durationMs: RUN_DURATION_MS,
      misses,
      score,
    },
  })) {
    resultSent = true;
  } else if (window.parent === window && !window.ReactNativeWebView) {
    saveStatusLabel.textContent = `Lokale highscore bewaard · beste ${bestScore}`;
  }
}

function updateRunTimer(now) {
  if (runState !== "running") return;
  const remainingMs = Math.max(0, runEndsAt - now);
  updateRunHud(remainingMs);
  if (remainingMs === 0) finishRun();
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function groundHeight(x, z) {
  const distance = Math.hypot(x, z);
  const centerFlatten = smoothstep((distance - 2.5) / 7);
  const rolling =
    Math.sin(x * 0.24) * 0.34
    + Math.cos(z * 0.19) * 0.28
    + Math.sin((x + z) * 0.11) * 0.22;
  return rolling * centerFlatten - 0.08;
}

function createLights(targetScene) {
  const hemisphere = new THREE.HemisphereLight(0xd7efff, 0x203c27, 1.55);
  targetScene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffe7b0, 4.15);
  sun.position.set(-11, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 42;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.028;
  targetScene.add(sun);

  const warmFill = new THREE.PointLight(0xffc978, 4.5, 13, 2);
  warmFill.position.set(4, 4.5, -5);
  targetScene.add(warmFill);
}

function createSkyDome(targetScene) {
  const geometry = new THREE.SphereGeometry(55, 36, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4d8eaf) },
      horizonColor: { value: new THREE.Color(0xd6e3c4) },
      bottomColor: { value: new THREE.Color(0x587b51) },
      sunDirection: { value: new THREE.Vector3(-0.45, 0.72, 0.35).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldDirection = normalize(worldPosition.xyz - cameraPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDirection;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunDirection;
      void main() {
        float heightMix = smoothstep(-0.2, 0.75, vWorldDirection.y);
        vec3 base = mix(bottomColor, horizonColor, smoothstep(-0.35, 0.05, vWorldDirection.y));
        base = mix(base, topColor, heightMix);
        float sunDot = max(dot(vWorldDirection, sunDirection), 0.0);
        float sunGlow = pow(sunDot, 72.0);
        float haze = pow(1.0 - abs(vWorldDirection.y), 7.0);
        float cloudBands = sin(vWorldDirection.x * 22.0 + vWorldDirection.z * 13.0)
          + sin(vWorldDirection.x * 47.0 - vWorldDirection.z * 31.0) * 0.42;
        float clouds = smoothstep(0.78, 1.28, cloudBands) * smoothstep(0.05, 0.5, vWorldDirection.y);
        base = mix(base, vec3(0.93, 0.95, 0.88), clouds * 0.22);
        base += vec3(1.0, 0.73, 0.34) * sunGlow * 0.82;
        base += vec3(0.32, 0.38, 0.25) * haze * 0.12;
        gl_FragColor = vec4(base, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(geometry, material);
  targetScene.add(dome);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 20, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe79a, fog: false }),
  );
  sunDisc.position.set(-25, 31, 19);
  targetScene.add(sunDisc);
}

function createGroundTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(512, 512);
  for (let index = 0; index < image.data.length; index += 4) {
    const x = (index / 4) % 512;
    const y = Math.floor(index / 4 / 512);
    const broad = Math.sin(x * 0.055) * 9 + Math.cos(y * 0.047) * 7;
    const grain = (random() - 0.5) * 24;
    image.data[index] = 74 + broad + grain;
    image.data[index + 1] = 118 + broad + grain * 0.55;
    image.data[index + 2] = 62 + broad * 0.45 + grain * 0.3;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  context.globalAlpha = 0.2;
  for (let index = 0; index < 280; index += 1) {
    context.fillStyle = index % 3 === 0 ? "#b9a36d" : "#315f34";
    context.beginPath();
    context.arc(range(0, 512), range(0, 512), range(0.6, 2.4), 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createTerrain(targetScene) {
  const geometry = new THREE.PlaneGeometry(64, 64, 80, 80);
  const positions = geometry.attributes.position;

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getY(index);
    positions.setZ(index, groundHeight(x, z));
  }

  geometry.computeVertexNormals();
  geometry.rotateX(-Math.PI / 2);

  const groundTexture = createGroundTexture();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTexture,
    bumpMap: groundTexture,
    bumpScale: 0.08,
    roughness: 0.97,
    metalness: 0,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  targetScene.add(terrain);

  const path = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 3.05, 64),
    new THREE.MeshStandardMaterial({
      color: 0x8a7650,
      roughness: 1,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
    }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.012;
  path.receiveShadow = true;
  targetScene.add(path);
}

function createForest(targetScene) {
  const treeCount = 52;
  const dummy = new THREE.Object3D();
  const trunkGeometry = new THREE.CylinderGeometry(0.24, 0.42, 4.1, 14, 3);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6a4c31, roughness: 0.98 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
  trunks.castShadow = true;
  trunks.receiveShadow = true;

  const crownClusters = 6;
  const crownGeometry = new THREE.SphereGeometry(1, 14, 10);
  const crownMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, treeCount * crownClusters);
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  const treeData = [];

  for (let index = 0; index < treeCount; index += 1) {
    const angle = (index / treeCount) * Math.PI * 2 + range(-0.045, 0.045);
    const distance = index % 3 === 0 ? range(10, 15) : range(17, 29);
    const far = distance > 18;
    const scale = far ? range(1.2, 2.05) : range(0.8, 1.35);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = groundHeight(x, z);
    const rotation = range(0, Math.PI * 2);
    treeData.push({ x, y, z, scale, far, rotation });

    dummy.position.set(x, y + 2.05 * scale, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);

    for (let cluster = 0; cluster < crownClusters; cluster += 1) {
      const layer = Math.floor(cluster / 2);
      const side = cluster % 2 === 0 ? -1 : 1;
      const crownScale = scale * (1.28 - layer * 0.13) * range(0.91, 1.08);
      dummy.position.set(
        x + Math.cos(rotation + layer * 1.7) * side * scale * (0.38 + layer * 0.08),
        y + scale * (3.55 + layer * 0.63 + (cluster % 2) * 0.12),
        z + Math.sin(rotation + layer * 1.7) * side * scale * (0.35 + layer * 0.08),
      );
      dummy.rotation.set(range(-0.08, 0.08), rotation + cluster * 0.7, range(-0.08, 0.08));
      dummy.scale.set(crownScale * 1.16, crownScale * 0.78, crownScale);
      dummy.updateMatrix();
      const crownIndex = index * crownClusters + cluster;
      crowns.setMatrixAt(crownIndex, dummy.matrix);
      crowns.setColorAt(crownIndex, new THREE.Color(
        far
          ? ["#31543a", "#365f3d", "#2f5739"][cluster % 3]
          : ["#356c40", "#3f7b47", "#477f49", "#2f6339"][cluster % 4],
      ));
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  crowns.instanceColor.needsUpdate = true;
  targetScene.add(trunks, crowns);

  const hillMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6947,
    roughness: 1,
  });

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + range(-0.12, 0.12);
    const distance = range(28, 37);
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(range(3.6, 6.5), 18, 10),
      hillMaterial,
    );
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    hill.scale.y = range(0.55, 0.95);
    hill.position.set(x, groundHeight(x, z) - 1.2, z);
    hill.rotation.set(range(-0.1, 0.1), range(0, Math.PI), range(-0.08, 0.08));
    targetScene.add(hill);
  }
}

function createMeadowDetails(targetScene) {
  const dummy = new THREE.Object3D();

  const grassGeometry = new THREE.ConeGeometry(0.032, 0.56, 5);
  grassGeometry.translate(0, 0.26, 0);
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x5f9a51,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 760);
  grass.receiveShadow = true;

  for (let index = 0; index < grass.count; index += 1) {
    const angle = range(0, Math.PI * 2);
    const distance = Math.sqrt(random()) * 21 + 2.8;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const size = range(0.65, 1.7);
    dummy.position.set(x, groundHeight(x, z), z);
    dummy.rotation.set(range(-0.08, 0.08), range(0, Math.PI * 2), range(-0.16, 0.16));
    dummy.scale.set(size, size, size);
    dummy.updateMatrix();
    grass.setMatrixAt(index, dummy.matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  targetScene.add(grass);

  const flowerStemGeometry = new THREE.CylinderGeometry(0.018, 0.024, 0.45, 5);
  flowerStemGeometry.translate(0, 0.225, 0);
  const flowerStemMaterial = new THREE.MeshStandardMaterial({ color: 0x3d743f, roughness: 1 });
  const flowerStems = new THREE.InstancedMesh(flowerStemGeometry, flowerStemMaterial, 150);

  const flowerHeadGeometry = new THREE.SphereGeometry(0.095, 8, 6);
  const flowerHeadMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x3c2604,
    emissiveIntensity: 0.15,
    roughness: 0.8,
    vertexColors: true,
  });
  const flowerHeads = new THREE.InstancedMesh(flowerHeadGeometry, flowerHeadMaterial, 150);

  for (let index = 0; index < flowerStems.count; index += 1) {
    const angle = range(0, Math.PI * 2);
    const distance = range(3.2, 17);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const scale = range(0.65, 1.45);
    const y = groundHeight(x, z);

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, range(0, Math.PI * 2), range(-0.1, 0.1));
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    flowerStems.setMatrixAt(index, dummy.matrix);

    dummy.position.set(x, y + 0.46 * scale, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    flowerHeads.setMatrixAt(index, dummy.matrix);
    flowerHeads.setColorAt(index, new THREE.Color([
      "#f7c75f",
      "#f29abe",
      "#b6d9ff",
      "#f5f0d5",
      "#d8a5ff",
    ][index % 5]));
  }
  flowerStems.instanceMatrix.needsUpdate = true;
  flowerHeads.instanceMatrix.needsUpdate = true;
  flowerHeads.instanceColor.needsUpdate = true;
  targetScene.add(flowerStems, flowerHeads);

  const stoneGeometry = new THREE.DodecahedronGeometry(0.38, 1);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x777d70, roughness: 0.98 });
  const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, 48);
  stones.castShadow = true;
  stones.receiveShadow = true;

  for (let index = 0; index < stones.count; index += 1) {
    const angle = range(0, Math.PI * 2);
    const distance = range(4.5, 22);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    dummy.position.set(x, groundHeight(x, z) + 0.12, z);
    dummy.rotation.set(range(0, Math.PI), range(0, Math.PI), range(0, Math.PI));
    dummy.scale.set(range(0.35, 1.25), range(0.25, 0.75), range(0.4, 1.15));
    dummy.updateMatrix();
    stones.setMatrixAt(index, dummy.matrix);
  }
  stones.instanceMatrix.needsUpdate = true;
  targetScene.add(stones);

  const shrubGeometry = new THREE.SphereGeometry(0.52, 12, 8);
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: 0x397342, roughness: 0.96 });
  const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, 68);
  for (let index = 0; index < shrubs.count; index += 1) {
    const angle = range(0, Math.PI * 2);
    const distance = range(5.5, 18);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const scale = range(0.45, 1.35);
    dummy.position.set(x, groundHeight(x, z) + 0.24 * scale, z);
    dummy.rotation.set(range(-0.08, 0.08), range(0, Math.PI * 2), range(-0.08, 0.08));
    dummy.scale.set(scale * range(0.85, 1.25), scale * range(0.7, 1.15), scale);
    dummy.updateMatrix();
    shrubs.setMatrixAt(index, dummy.matrix);
  }
  shrubs.instanceMatrix.needsUpdate = true;
  targetScene.add(shrubs);

  const motesGeometry = new THREE.BufferGeometry();
  const motePositions = new Float32Array(240 * 3);
  for (let index = 0; index < 240; index += 1) {
    const angle = range(0, Math.PI * 2);
    const distance = range(2, 18);
    motePositions[index * 3] = Math.cos(angle) * distance;
    motePositions[index * 3 + 1] = range(0.35, 5.5);
    motePositions[index * 3 + 2] = Math.sin(angle) * distance;
  }
  motesGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(
    motesGeometry,
    new THREE.PointsMaterial({
      color: 0xffedaa,
      size: 0.045,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  motes.name = "sun-motes";
  targetScene.add(motes);
}

function createWingTexture(palette) {
  if (wingTextureCache.has(palette.name)) {
    return wingTextureCache.get(palette.name);
  }

  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createRadialGradient(180, 220, 25, 240, 240, 310);
  gradient.addColorStop(0, palette.accent);
  gradient.addColorStop(0.42, palette.base);
  gradient.addColorStop(1, palette.edge);

  context.clearRect(0, 0, 512, 512);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  context.globalAlpha = 0.32;
  context.strokeStyle = palette.edge;
  context.lineWidth = 8;
  for (let index = 0; index < 9; index += 1) {
    context.beginPath();
    context.moveTo(24, 430);
    context.quadraticCurveTo(170 + index * 18, 220 - index * 11, 478, 42 + index * 36);
    context.stroke();
  }

  context.globalAlpha = 0.78;
  for (let index = 0; index < 12; index += 1) {
    const x = 90 + (index % 4) * 104 + (index % 2) * 12;
    const y = 78 + Math.floor(index / 4) * 140;
    context.beginPath();
    context.fillStyle = index % 3 === 0 ? palette.accent : palette.edge;
    context.arc(x, y, index % 3 === 0 ? 18 : 11, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 0.95;
  context.strokeStyle = palette.edge;
  context.lineWidth = 18;
  context.strokeRect(8, 8, 496, 496);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  wingTextureCache.set(palette.name, texture);
  return texture;
}

function createForeWingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.5, 0.15, 1.55, 0.68, 1.72, 1.55);
  shape.bezierCurveTo(1.82, 2.12, 1.12, 2.35, 0.58, 1.82);
  shape.bezierCurveTo(0.18, 1.42, 0.02, 0.64, 0, 0);
  return new THREE.ShapeGeometry(shape, 12);
}

function createHindWingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.45, -0.05, 1.22, 0.24, 1.4, 0.98);
  shape.bezierCurveTo(1.48, 1.52, 0.84, 1.78, 0.4, 1.42);
  shape.bezierCurveTo(0.08, 1.12, 0.01, 0.42, 0, 0);
  return new THREE.ShapeGeometry(shape, 10);
}

function createAntenna(points, material) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.012, 5, false), material);
}

function createFlightCurve(index) {
  const points = [];
  const pointCount = 12;
  const nearRadius = 0.82 + (index % 4) * 0.18;
  const farRadius = 6.2 + (index % 6) * 0.8;
  const angularOffset = (index / 12) * Math.PI * 2 + range(-0.4, 0.4);

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const angle = angularOffset + (pointIndex / pointCount) * Math.PI * 2;
    const approachWave = (Math.sin((pointIndex / pointCount) * Math.PI * 2 + index * 0.73) + 1) * 0.5;
    const radius = THREE.MathUtils.lerp(nearRadius, farRadius, smoothstep(approachWave)) * range(0.9, 1.1);
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      range(1.05, 2.65) + approachWave * range(0.3, 1.5) + Math.sin(angle * 2 + index) * 0.28,
      Math.sin(angle) * radius,
    ));
  }

  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.55);
}

function createButterfly(index) {
  const palette = flyingBugSpecs[index % flyingBugSpecs.length];
  const kind = palette.kind;
  const group = new THREE.Group();
  group.name = `flying-bug-${kind}-${index}`;

  const wingMaterial = new THREE.MeshPhysicalMaterial({
    map: createWingTexture(palette),
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: kind === "dragonfly" || kind === "bee" ? 0.64 : 0.98,
    roughness: kind === "dragonfly" ? 0.28 : 0.55,
    metalness: kind === "beetle" ? 0.24 : 0.02,
    clearcoat: kind === "beetle" ? 0.72 : 0.38,
    clearcoatRoughness: 0.45,
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: palette.edge,
    roughness: kind === "moth" ? 0.92 : 0.68,
    metalness: kind === "beetle" ? 0.34 : 0,
  });
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x090704,
    roughness: 0.18,
    clearcoat: 0.8,
  });

  const foreWingLeft = new THREE.Group();
  const foreWingRight = new THREE.Group();
  const hindWingLeft = new THREE.Group();
  const hindWingRight = new THREE.Group();

  const foreWingGeometry = createForeWingGeometry();
  const hindWingGeometry = createHindWingGeometry();

  const foreLeftMesh = new THREE.Mesh(foreWingGeometry, wingMaterial);
  foreLeftMesh.rotation.x = -Math.PI / 2;
  foreLeftMesh.position.set(0.08, 0, 0);
  if (kind === "dragonfly") foreLeftMesh.scale.set(1.35, 0.34, 1);
  if (kind === "bee") foreLeftMesh.scale.set(0.68, 0.74, 1);
  if (kind === "beetle") foreLeftMesh.scale.set(0.58, 0.68, 1);
  if (kind === "moth") foreLeftMesh.scale.set(1.08, 1.12, 1);
  foreLeftMesh.castShadow = true;
  foreWingLeft.add(foreLeftMesh);

  const foreRightMesh = foreLeftMesh.clone();
  foreRightMesh.scale.x *= -1;
  foreRightMesh.position.x = -0.08;
  foreWingRight.add(foreRightMesh);

  const hindLeftMesh = new THREE.Mesh(hindWingGeometry, wingMaterial);
  hindLeftMesh.rotation.x = -Math.PI / 2;
  hindLeftMesh.position.set(0.08, -0.01, 0.15);
  hindLeftMesh.scale.set(0.82, 0.82, 0.82);
  if (kind === "dragonfly") hindLeftMesh.scale.set(1.2, 0.3, 0.78);
  if (kind === "bee") hindLeftMesh.scale.set(0.52, 0.58, 0.72);
  if (kind === "beetle") hindLeftMesh.scale.set(0.46, 0.54, 0.68);
  hindLeftMesh.castShadow = true;
  hindWingLeft.add(hindLeftMesh);

  const hindRightMesh = hindLeftMesh.clone();
  hindRightMesh.scale.x *= -1;
  hindRightMesh.position.x = -0.08;
  hindWingRight.add(hindRightMesh);

  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), bodyMaterial);
  thorax.scale.set(
    kind === "bee" || kind === "beetle" ? 1.18 : 0.9,
    kind === "dragonfly" ? 0.68 : 0.85,
    kind === "bee" || kind === "beetle" ? 1.42 : 1.25,
  );
  thorax.castShadow = true;

  const abdomen = new THREE.Mesh(
    new THREE.CapsuleGeometry(kind === "dragonfly" ? 0.072 : 0.105, kind === "dragonfly" ? 0.88 : 0.48, 7, 12),
    bodyMaterial,
  );
  abdomen.rotation.x = Math.PI / 2;
  abdomen.position.z = 0.35;
  abdomen.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), bodyMaterial);
  head.position.z = -0.25;

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), eyeMaterial);
  leftEye.position.set(0.09, 0.045, -0.33);
  const rightEye = leftEye.clone();
  rightEye.position.x = -0.09;

  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1c12, roughness: 0.8 });
  const leftAntenna = createAntenna([
    new THREE.Vector3(0.05, 0.05, -0.34),
    new THREE.Vector3(0.18, 0.16, -0.56),
    new THREE.Vector3(0.3, 0.2, -0.78),
  ], antennaMaterial);
  const rightAntenna = createAntenna([
    new THREE.Vector3(-0.05, 0.05, -0.34),
    new THREE.Vector3(-0.18, 0.16, -0.56),
    new THREE.Vector3(-0.3, 0.2, -0.78),
  ], antennaMaterial);

  const speciesDetails = new THREE.Group();
  if (kind === "bee") {
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xf1c64f, roughness: 0.74 });
    [-0.02, 0.16, 0.34].forEach((z) => {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.022, 7, 18), stripeMaterial);
      stripe.position.z = z;
      speciesDetails.add(stripe);
    });
  }
  if (kind === "beetle") {
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: palette.base,
      clearcoat: 0.9,
      clearcoatRoughness: 0.22,
      metalness: 0.38,
      roughness: 0.28,
    });
    [-0.07, 0.07].forEach((x) => {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 10), shellMaterial);
      shell.position.set(x, 0.055, 0.17);
      shell.scale.set(0.62, 0.42, 1.28);
      shell.castShadow = true;
      speciesDetails.add(shell);
    });
  }
  if (kind === "moth") {
    const fuzz = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 14, 10),
      new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 1 }),
    );
    fuzz.scale.set(0.68, 0.68, 1.05);
    speciesDetails.add(fuzz);
  }

  group.add(
    foreWingLeft,
    foreWingRight,
    hindWingLeft,
    hindWingRight,
    thorax,
    abdomen,
    head,
    leftEye,
    rightEye,
    leftAntenna,
    rightAntenna,
    speciesDetails,
  );

  const scale = palette.scale * range(0.92, 1.08);
  group.scale.setScalar(scale);
  group.userData = {
    palette,
    kind,
    foreWingLeft,
    foreWingRight,
    hindWingLeft,
    hindWingRight,
    curve: createFlightCurve(index),
    speed: palette.speed * range(0.9, 1.1),
    flapSpeed: palette.flap * range(0.94, 1.06),
    phase: random(),
    flapOffset: range(0, Math.PI * 2),
    bankOffset: range(0, Math.PI * 2),
    caught: false,
    captureAnimation: null,
    dodgeSide: index % 2 === 0 ? 1 : -1,
    dodgeUntil: 0,
    respawnAt: 0,
    baseScale: scale,
  };

  scene.add(group);
  return group;
}

function updateButterflies(elapsed, delta, now) {
  const lookTarget = new THREE.Vector3();
  let nextAimedBug = null;
  let nextAimQuality = 0;
  let nextAimDistance = Number.POSITIVE_INFINITY;
  let nextProjectedPosition = null;

  camera.getWorldPosition(cameraWorldPosition);

  butterflies.forEach((butterfly, index) => {
    const data = butterfly.userData;

    if (data.captureAnimation) {
      updateCapturedBug(butterfly, now);
      return;
    }

    if (data.caught) {
      if (now >= data.respawnAt) {
        data.caught = false;
        data.phase = random();
        butterfly.visible = true;
        butterfly.scale.setScalar(0.001);
      } else {
        return;
      }
    }

    const progress = (elapsed * data.speed + data.phase) % 1;
    const position = data.curve.getPointAt(progress);
    const tangent = data.curve.getTangentAt(progress).normalize();
    if (data.kind === "bee") {
      position.x += Math.sin(elapsed * 3.8 + data.flapOffset) * 0.12;
      position.y += Math.sin(elapsed * 5.1 + data.bankOffset) * 0.09;
    } else if (data.kind === "dragonfly") {
      position.y += Math.sin(elapsed * 2.3 + data.bankOffset) * 0.055;
    } else if (data.kind === "moth") {
      position.y += Math.sin(elapsed * 1.25 + data.flapOffset) * 0.16;
    } else if (data.kind === "beetle") {
      position.y += Math.sin(elapsed * 2.6 + data.bankOffset) * 0.075;
    }

    if (now < data.dodgeUntil) {
      const dodgeProgress = 1 - (data.dodgeUntil - now) / 780;
      const dodgeArc = Math.sin(THREE.MathUtils.clamp(dodgeProgress, 0, 1) * Math.PI);
      position.x += data.dodgeSide * dodgeArc * 1.15;
      position.y += dodgeArc * 0.58;
    }

    butterfly.position.copy(position);
    lookTarget.copy(position).add(tangent);
    butterfly.lookAt(lookTarget);

    const flap = Math.sin(elapsed * data.flapSpeed + data.flapOffset);
    const foreAmplitude = data.kind === "dragonfly" ? 0.2 : data.kind === "bee" ? 0.37 : data.kind === "beetle" ? 0.3 : 0.68;
    const hindAmplitude = data.kind === "dragonfly" ? -0.17 : data.kind === "bee" ? 0.27 : data.kind === "beetle" ? 0.2 : 0.45;
    data.foreWingLeft.rotation.z = 0.1 + flap * foreAmplitude;
    data.foreWingRight.rotation.z = -0.1 - flap * foreAmplitude;
    data.hindWingLeft.rotation.z = 0.05 + flap * hindAmplitude;
    data.hindWingRight.rotation.z = -0.05 - flap * hindAmplitude;
    const bankFrequency = data.kind === "bee" ? 3.1 : data.kind === "dragonfly" ? 2.2 : 1.8;
    const bankAmount = data.kind === "dragonfly" ? 0.18 : data.kind === "bee" ? 0.14 : 0.1;
    butterfly.rotation.z = Math.sin(elapsed * bankFrequency + data.bankOffset) * bankAmount;

    const targetScale = data.baseScale * (1 + Math.sin(elapsed * 0.8 + index) * 0.035);
    butterfly.scale.setScalar(THREE.MathUtils.lerp(butterfly.scale.x, targetScale, 1 - Math.exp(-delta * 7)));

    if (runState !== "running" || swinging || now < captureCooldownUntil) return;
    if (holdActive && lockedFocusBug && butterfly !== lockedFocusBug) return;

    butterfly.getWorldPosition(butterflyWorldPosition);
    const distance = cameraWorldPosition.distanceTo(butterflyWorldPosition);
    projectedBugPosition.copy(butterflyWorldPosition).project(camera);
    const lockedTarget = holdActive && lockedFocusBug === butterfly;
    if (projectedBugPosition.z < -1 || projectedBugPosition.z > 1) return;

    const screenDistance = projectedDistancePixels(projectedBugPosition);
    const trackingRadius = catchZoneRadiusPixels(lockedTarget ? 1.25 : 1);
    if (screenDistance > trackingRadius) return;

    const alignment = 1 - smoothstep(screenDistance / trackingRadius);
    const quality = alignment;
    if (quality <= nextAimQuality) return;
    nextAimedBug = butterfly;
    nextAimQuality = quality;
    nextAimDistance = distance;
    nextProjectedPosition = projectedBugPosition.clone();
  });

  updateAimState(nextAimedBug, nextAimQuality, nextAimDistance, nextProjectedPosition, delta, now);
}

function updateCapturedBug(bug, now) {
  const animation = bug.userData.captureAnimation;
  const progress = THREE.MathUtils.clamp((now - animation.startedAt) / 620, 0, 1);
  const eased = easeInOutCubic(progress);
  net.userData.catchAnchor.getWorldPosition(captureEndPosition);
  captureMidPosition.lerpVectors(animation.start, captureEndPosition, 0.5);
  captureMidPosition.y += 0.42;
  captureMidPosition.x += animation.curveSide * 0.16;

  const inverse = 1 - eased;
  bug.position.set(
    inverse * inverse * animation.start.x + 2 * inverse * eased * captureMidPosition.x + eased * eased * captureEndPosition.x,
    inverse * inverse * animation.start.y + 2 * inverse * eased * captureMidPosition.y + eased * eased * captureEndPosition.y,
    inverse * inverse * animation.start.z + 2 * inverse * eased * captureMidPosition.z + eased * eased * captureEndPosition.z,
  );
  bug.rotation.z += 0.09;
  const captureScale = animation.startScale * (1 - smoothstep((progress - 0.62) / 0.38) * 0.88);
  bug.scale.setScalar(captureScale);
  bagImpact = Math.max(bagImpact, Math.sin(progress * Math.PI) * 0.95);

  if (progress >= 1) {
    bug.userData.captureAnimation = null;
    bug.userData.caught = true;
    bug.userData.respawnAt = now + 2100;
    bug.visible = false;
  }
}

function projectedDistancePixels(projected) {
  return Math.hypot(projected.x * window.innerWidth * 0.5, projected.y * window.innerHeight * 0.5);
}

function catchZoneRadiusPixels(scale = 1) {
  return Math.min(window.innerWidth, window.innerHeight) * 0.23 * scale;
}

function updateAimState(nextBug, quality, distance, projected, delta, now) {
  if (holdActive && !lockedFocusBug && nextBug) lockedFocusBug = nextBug;
  if (aimedBug !== nextBug) {
    focusProgress *= 0.28;
    aimedBug = nextBug;
  }
  aimedBugQuality = quality;
  aimedBugDistance = distance;

  const inCaptureRange = Boolean(aimedBug && quality >= 0.28);
  if (inCaptureRange) {
    focusProgress = Math.min(1, focusProgress + delta / 1.5);
  } else {
    focusProgress = Math.max(0, focusProgress - delta * 0.65);
  }

  if (!aimedBug || !projected || runState !== "running") {
    focusGuide.hidden = true;
    captureStateLabel.textContent = now < captureCooldownUntil ? "Net herstellen…" : "Breng een bug in de vangzone";
    setCaptureButtonState();
    return;
  }

  focusGuide.hidden = false;
  focusGuide.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
  focusGuide.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
  focusSpeciesLabel.textContent = aimedBug.userData.palette.name;
  focusDistanceLabel.textContent = quality < 0.28
    ? "Breng naar het midden"
    : focusProgress >= 0.98
      ? "100% · TIK OM TE VANGEN"
      : `In vangzone ${Math.round(focusProgress * 100)}%`;
  focusGuide.classList.toggle("is-ready", inCaptureRange);
  focusGuide.classList.toggle("is-perfect", inCaptureRange && focusProgress >= 0.72);

  captureStateLabel.textContent = quality < 0.28
    ? "Breng de bug binnen de gemarkeerde vangzone"
    : focusProgress >= 0.98
      ? "100% · tik ergens op het scherm voor de netslag"
      : "Bug in vangzone · blijf volgen tot 100%";
  setCaptureButtonState();
}

function createWoodTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 128, 0);
  gradient.addColorStop(0, "#4a2819");
  gradient.addColorStop(0.22, "#9d6136");
  gradient.addColorStop(0.52, "#c58a52");
  gradient.addColorStop(0.78, "#88502e");
  gradient.addColorStop(1, "#3d2217");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 512);
  context.globalAlpha = 0.34;
  for (let index = 0; index < 90; index += 1) {
    context.strokeStyle = index % 3 === 0 ? "#2b160f" : "#e2b176";
    context.lineWidth = range(0.4, 1.3);
    context.beginPath();
    context.moveTo(range(0, 128), -20);
    context.bezierCurveTo(range(0, 128), 130, range(0, 128), 340, range(0, 128), 540);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2.8);
  return texture;
}

function createNetWeaveTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = "#050505";
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  for (let value = -256; value <= 512; value += 18) {
    context.beginPath();
    context.moveTo(value, 0);
    context.lineTo(value + 256, 256);
    context.stroke();
    context.beginPath();
    context.moveTo(value, 256);
    context.lineTo(value + 256, 0);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.3, 3.8);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createCaptureFx(targetScene) {
  const count = 38;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffdf72,
      size: 0.07,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.visible = false;
  points.userData = {
    life: 0,
    velocities: Array.from({ length: count }, () => new THREE.Vector3()),
  };
  targetScene.add(points);
  return points;
}

function triggerCaptureFx(position, color) {
  captureFx.position.copy(position);
  captureFx.material.color.set(color);
  captureFx.material.opacity = 1;
  captureFx.visible = true;
  captureFx.userData.life = 1;
  const positions = captureFx.geometry.attributes.position;
  captureFx.userData.velocities.forEach((velocity, index) => {
    positions.setXYZ(index, 0, 0, 0);
    const angle = random() * Math.PI * 2;
    const speed = range(0.45, 1.65);
    velocity.set(Math.cos(angle) * speed, range(0.25, 1.5), Math.sin(angle) * speed);
  });
  positions.needsUpdate = true;
}

function updateCaptureFx(delta) {
  if (!captureFx.visible) return;
  captureFx.userData.life = Math.max(0, captureFx.userData.life - delta * 1.75);
  const positions = captureFx.geometry.attributes.position;
  captureFx.userData.velocities.forEach((velocity, index) => {
    velocity.y -= delta * 1.8;
    positions.setXYZ(
      index,
      positions.getX(index) + velocity.x * delta,
      positions.getY(index) + velocity.y * delta,
      positions.getZ(index) + velocity.z * delta,
    );
  });
  positions.needsUpdate = true;
  captureFx.material.opacity = captureFx.userData.life;
  if (captureFx.userData.life <= 0) captureFx.visible = false;
}

function createNet(targetCamera) {
  const netGroup = new THREE.Group();
  netGroup.name = "butterfly-net";

  const handleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: createWoodTexture(),
    roughness: 0.58,
    clearcoat: 0.28,
    clearcoatRoughness: 0.68,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xb98a45,
    roughness: 0.24,
    metalness: 0.82,
  });
  const rimMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd8b56e,
    roughness: 0.3,
    metalness: 0.48,
    clearcoat: 0.66,
    clearcoatRoughness: 0.3,
  });
  const weaveTexture = createNetWeaveTexture();
  const meshMaterial = new THREE.MeshPhysicalMaterial({
    alphaMap: weaveTexture,
    alphaTest: 0.12,
    color: 0xf2ead4,
    depthWrite: false,
    opacity: 0.68,
    roughness: 0.86,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.064, 1.95, 24, 5), handleMaterial);
  handle.position.y = -0.9;
  handle.castShadow = true;

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.074, 0.22, 24, 2), metalMaterial);
  collar.position.y = 0.12;
  collar.castShadow = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.032, 20, 96), rimMaterial);
  rim.position.y = 0.58;
  rim.castShadow = true;

  const bagProfile = [
    new THREE.Vector2(0.58, 0),
    new THREE.Vector2(0.56, -0.12),
    new THREE.Vector2(0.48, -0.34),
    new THREE.Vector2(0.34, -0.62),
    new THREE.Vector2(0.16, -0.86),
    new THREE.Vector2(0.055, -1.02),
  ];
  const basket = new THREE.Mesh(new THREE.LatheGeometry(bagProfile, 56), meshMaterial);
  basket.rotation.x = Math.PI / 2;
  basket.position.y = 0.58;

  const rimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.584, 0.009, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0xffdf7b, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  rimGlow.position.y = 0.58;

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.069, 0.072, 0.54, 20, 2),
    new THREE.MeshStandardMaterial({ color: 0x2f211b, roughness: 0.94 }),
  );
  grip.position.y = -1.52;
  grip.castShadow = true;

  const gripWrap = new THREE.Group();
  for (let index = 0; index < 8; index += 1) {
    const wrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.0715, 0.007, 6, 22),
      new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0x76513c : 0x4c3127, roughness: 0.9 }),
    );
    wrap.position.y = -1.75 + index * 0.067;
    wrap.rotation.x = Math.PI / 2;
    gripWrap.add(wrap);
  }

  const catchAnchor = new THREE.Object3D();
  catchAnchor.position.set(0, 0.58, -0.62);

  const motionTrail = [];
  for (let index = 0; index < 3; index += 1) {
    const trail = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.012 + index * 0.007, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffdf76,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    trail.position.y = 0.58;
    trail.visible = false;
    netGroup.add(trail);
    motionTrail.push(trail);
  }

  netGroup.add(handle, collar, rim, rimGlow, basket, grip, gripWrap, catchAnchor);
  netGroup.position.set(0.76, -0.66, -1.28);
  netGroup.rotation.set(-0.15, -0.1, -0.43);
  netGroup.userData = { basket, catchAnchor, motionTrail, rim, rimGlow };
  targetCamera.add(netGroup);
  return netGroup;
}

const netRestPosition = new THREE.Vector3(0.76, -0.66, -1.28);
const netWindupPosition = new THREE.Vector3(1.12, -0.86, -0.96);
const netStrikePosition = new THREE.Vector3(0, -0.12, -2.12);
const netFollowPosition = new THREE.Vector3(-0.48, 0.05, -2.02);
const netRestQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, -0.1, -0.43));
const netStrikeQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.02, 0.02, 0.06));
const netSwingQuaternion = new THREE.Quaternion();
const netSwingOffsetQuaternion = new THREE.Quaternion();
const netSwingEuler = new THREE.Euler();

function beginCaptureHold(event) {
  if (runState !== "running" || swinging || performance.now() < captureCooldownUntil) return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  holdActive = true;
  holdStartedAt = performance.now();
  lockedFocusBug = aimedBug;
  captureButton.setPointerCapture?.(event?.pointerId);
  setCaptureButtonState();
}

function releaseCaptureHold(event) {
  if (!holdActive) return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  holdActive = false;
  captureButton.releasePointerCapture?.(event?.pointerId);
  const heldFor = performance.now() - holdStartedAt;
  const target = lockedFocusBug ?? aimedBug;
  const quality = focusProgress;
  lockedFocusBug = null;
  focusProgress = 0;

  if (heldFor < 120) {
    swingNet(null, 0);
    return;
  }
  swingNet(target, quality);
}

function swingNet(target, quality) {
  if (swinging || runState !== "running" || performance.now() < captureCooldownUntil) return;
  swinging = true;
  swingStartedAt = performance.now();
  catchAttemptedThisSwing = false;
  swingTarget = target;
  swingFocusQuality = quality;
  captureCooldownUntil = swingStartedAt + 980;

  let aimX = 0;
  let aimY = 0;
  if (target?.visible) {
    target.getWorldPosition(butterflyWorldPosition);
    projectedBugPosition.copy(butterflyWorldPosition).project(camera);
    aimX = THREE.MathUtils.clamp(projectedBugPosition.x * 0.62, -0.34, 0.34);
    aimY = THREE.MathUtils.clamp(projectedBugPosition.y * 0.42, -0.24, 0.24);
  }
  const strike = netStrikePosition.clone().add(new THREE.Vector3(aimX, aimY, 0));
  const follow = netFollowPosition.clone().add(new THREE.Vector3(aimX * 0.62, aimY * 0.55, 0.06));
  swingCurve = new THREE.CatmullRomCurve3([
    netRestPosition.clone(),
    netRestPosition.clone().lerp(netWindupPosition, 0.34),
    netWindupPosition.clone(),
    strike,
    follow,
    netRestPosition.clone().lerp(follow, 0.24),
    netRestPosition.clone(),
  ], false, "centripetal", 0.45);
  showMessage(quality >= 0.98 ? "Netslag!" : "Te vroeg · vul de vangmeter eerst tot 100%");
  setCaptureButtonState();
}

function updateNet(now, elapsed, delta) {
  const motionTrail = net.userData.motionTrail;
  const portrait = camera.aspect < 0.72;
  const targetNetScale = portrait ? 0.82 : 1;
  net.scale.setScalar(THREE.MathUtils.lerp(net.scale.x, targetNetScale, 1 - Math.exp(-delta * 12)));
  if (!swinging) {
    netRestPosition.x = portrait ? 0.34 : 0.76;
    netRestPosition.y = portrait ? -0.5 : -0.66;
    netRestPosition.z = portrait ? -1.48 : -1.28;
    netWindupPosition.x = portrait ? 0.56 : 1.12;
    netFollowPosition.x = portrait ? -0.3 : -0.48;
  }
  bagImpact = Math.max(0, bagImpact - delta * 2.4);
  netImpact = Math.max(0, netImpact - delta * 3.1);
  const bagPulse = bagImpact * Math.sin(elapsed * 24) * 0.09;
  net.userData.basket.scale.set(1 + bagPulse, 1 - bagPulse * 0.35, 1 + bagPulse);
  net.userData.basket.rotation.z = Math.sin(elapsed * 18) * bagImpact * 0.055;
  net.userData.rim.scale.setScalar(1 + netImpact * 0.045);
  net.userData.rimGlow.material.opacity = 0.14 + netImpact * 0.52;

  if (!swinging) {
    const idle = Math.sin(elapsed * 1.55) * 0.012;
    net.position.copy(netRestPosition);
    net.position.y += idle;
    net.quaternion.copy(netRestQuaternion);
    net.rotateZ(Math.sin(elapsed * 1.2) * 0.009);
    motionTrail.forEach((trail) => {
      trail.visible = false;
      trail.material.opacity = 0;
    });
    return;
  }

  const duration = 880;
  const progress = THREE.MathUtils.clamp((now - swingStartedAt) / duration, 0, 1);
  const motionProgress = 0.5 - Math.cos(progress * Math.PI) * 0.5;
  net.position.copy(swingCurve.getPointAt(motionProgress));
  const strikeWeight = Math.pow(Math.sin(progress * Math.PI), 1.18);
  netSwingQuaternion.slerpQuaternions(netRestQuaternion, netStrikeQuaternion, strikeWeight);
  netSwingEuler.set(0, 0, Math.sin(progress * Math.PI * 2) * 0.08 * strikeWeight);
  netSwingOffsetQuaternion.setFromEuler(netSwingEuler);
  net.quaternion.copy(netSwingQuaternion).multiply(netSwingOffsetQuaternion);

  const speedWeight = Math.pow(Math.sin(progress * Math.PI), 2.4);
  motionTrail.forEach((trail, index) => {
    trail.visible = speedWeight > 0.08;
    trail.position.z = index * 0.09;
    trail.material.opacity = speedWeight * (0.16 - index * 0.035);
    trail.scale.setScalar(1 + index * 0.035);
  });

  if (progress >= 0.48 && !catchAttemptedThisSwing) attemptCatch();

  if (progress >= 1) {
    swinging = false;
    swingTarget = null;
    swingCurve = null;
    net.position.copy(netRestPosition);
    net.quaternion.copy(netRestQuaternion);
    motionTrail.forEach((trail) => {
      trail.visible = false;
      trail.material.opacity = 0;
    });
    setCaptureButtonState();
  }
}

function attemptCatch() {
  catchAttemptedThisSwing = true;
  const target = swingTarget;
  if (!target?.visible || target.userData.caught || target.userData.captureAnimation || swingFocusQuality < 0.98) {
    registerMiss(target, swingFocusQuality < 0.98 ? "Nog geen 100% · houd de bug langer in de vangzone" : "Het insect ontweek het net");
    return;
  }

  target.getWorldPosition(butterflyWorldPosition);
  projectedBugPosition.copy(butterflyWorldPosition).project(camera);
  const screenDistance = projectedDistancePixels(projectedBugPosition);
  if (screenDistance > catchZoneRadiusPixels(1.18)) {
    registerMiss(target, "Net ernaast · blijf het insect volgen");
    return;
  }

  const data = target.userData;
  const perfect = swingFocusQuality >= 0.98;
  target.getWorldPosition(captureStartPosition);
  data.captureAnimation = {
    curveSide: data.dodgeSide,
    start: captureStartPosition.clone(),
    startedAt: performance.now(),
    startScale: target.scale.x,
  };
  catches += 1;
  streak += 1;
  bestStreak = Math.max(bestStreak, streak);
  const timingMultiplier = perfect ? 1.5 : 0.78 + swingFocusQuality * 0.46;
  const points = Math.round(data.palette.points * timingMultiplier) + Math.min(125, Math.max(0, streak - 1) * 25);
  score += points;
  updateRunHud();
  netImpact = 1;
  bagImpact = 1;
  triggerCaptureFx(captureStartPosition, perfect ? 0x69efaa : 0xffdd78);
  flashCatch();
  showMessage(`${perfect ? "PERFECT · " : ""}${data.palette.name} +${points} · combo x${streak}`);

  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(perfect ? [22, 14, 42] : [28, 18, 34]);
  }
}

function registerMiss(target, message) {
  misses += 1;
  streak = 0;
  if (target?.userData) {
    target.userData.dodgeSide *= -1;
    target.userData.dodgeUntil = performance.now() + 780;
  }
  updateRunHud();
  showMessage(message);
  if (typeof navigator.vibrate === "function") navigator.vibrate(18);
}

function setCaptureButtonState() {
  const now = performance.now();
  const cooldown = swinging || now < captureCooldownUntil;
  const perfect = focusProgress >= 0.98 && aimedBugQuality >= 0.28;
  captureButton.classList.toggle("is-holding", holdActive);
  captureButton.classList.toggle("is-perfect", perfect);
  captureButton.classList.toggle("is-cooldown", cooldown);
  catchZone.classList.toggle("is-tracking", Boolean(aimedBug) && aimedBugQuality >= 0.28);
  catchZone.classList.toggle("is-primed", perfect && !cooldown);
  focusMeterFill.style.width = `${Math.round(focusProgress * 100)}%`;
  captureButtonLabel.textContent = cooldown
    ? "Net herstellen"
    : perfect
      ? "Tik om met het net te vangen"
      : aimedBug
        ? "Blijf in de vangzone"
        : "Richt op een insect";
}

function swingFocusedNet() {
  if (runState !== "running" || swinging || performance.now() < captureCooldownUntil) return;
  swingNet(aimedBug, focusProgress);
}

function flashCatch() {
  document.querySelector(".world-grade")?.classList.remove("catch-flash");
  window.clearTimeout(catchFlashTimer);
  requestAnimationFrame(() => {
    document.querySelector(".world-grade")?.classList.add("catch-flash");
    catchFlashTimer = window.setTimeout(() => document.querySelector(".world-grade")?.classList.remove("catch-flash"), 380);
  });
}

function setObjectQuaternion(quaternion, alpha, beta, gamma, orient) {
  orientationEuler.set(beta, alpha, -gamma, "YXZ");
  quaternion.setFromEuler(orientationEuler);
  quaternion.multiply(orientationQ1);
  quaternion.multiply(orientationQ0.setFromAxisAngle(orientationZee, -orient));
}

function updateScreenOrientation() {
  const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;
  screenOrientation = THREE.MathUtils.degToRad(Number(angle) || 0);
}

function handleDeviceOrientation(event) {
  if (event.alpha == null || event.beta == null || event.gamma == null) {
    return;
  }

  const alpha = THREE.MathUtils.degToRad(event.alpha);
  const beta = THREE.MathUtils.degToRad(event.beta);
  const gamma = THREE.MathUtils.degToRad(event.gamma);
  setObjectQuaternion(latestRawOrientation, alpha, beta, gamma, screenOrientation);
  hasOrientationReading = true;

  if (needsOrientationCalibration) {
    recalibrateOrientation();
    needsOrientationCalibration = false;
  }

  targetOrientation.copy(orientationCalibration).multiply(latestRawOrientation);
  flattenedOrientation.setFromQuaternion(targetOrientation, "YXZ");
  flattenedOrientation.x = THREE.MathUtils.clamp(flattenedOrientation.x, -1.35, 1.35);
  flattenedOrientation.z *= 0.08;
  targetOrientation.setFromEuler(flattenedOrientation);
}

async function startOrientation() {
  if (!("DeviceOrientationEvent" in window)) {
    orientationEnabled = false;
    startOrientationButton.disabled = true;
    statusLabel.textContent = "Geen bewegingssensor beschikbaar — sleep om rond te kijken";
    return;
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        throw new Error("Sensorpermissie geweigerd");
      }
    }

    if (!orientationListenerAdded) {
      window.addEventListener("deviceorientation", handleDeviceOrientation, true);
      orientationListenerAdded = true;
    }

    orientationEnabled = true;
    needsOrientationCalibration = true;
    recalibrateButton.disabled = false;
    startOrientationButton.textContent = "360° actief";
    statusLabel.textContent = "Draai je telefoon om 360° rond te kijken";
    showMessage("Houd de telefoon recht en tik Herkalibreer als nodig");
  } catch (error) {
    orientationEnabled = false;
    recalibrateButton.disabled = true;
    startOrientationButton.textContent = "Start 360°";
    statusLabel.textContent = "Sensor geweigerd — sleep om rond te kijken";
    showMessage(error instanceof Error ? error.message : "Sensorpermissie geweigerd");
  }
}

function recalibrateOrientation() {
  if (!hasOrientationReading) {
    needsOrientationCalibration = true;
    showMessage("Wacht op de eerste sensormeting");
    return;
  }

  orientationCalibration.copy(latestRawOrientation).invert();
  targetOrientation.identity();
  showMessage("Kijkrichting opnieuw ingesteld");
}

function updateCamera(delta) {
  const smoothing = 1 - Math.exp(-delta * 10.5);

  if (orientationEnabled && hasOrientationReading) {
    camera.quaternion.slerp(targetOrientation, smoothing);
    return;
  }

  flattenedOrientation.set(dragPitch, dragYaw, 0, "YXZ");
  targetOrientation.setFromEuler(flattenedOrientation);
  camera.quaternion.slerp(targetOrientation, smoothing);
}

function bindControls() {
  updateScreenOrientation();
  window.screen?.orientation?.addEventListener?.("change", updateScreenOrientation);
  window.addEventListener("orientationchange", updateScreenOrientation);
  window.addEventListener("resize", resize);
  window.addEventListener("message", (event) => {
    const sourceAllowed = event.source === window.parent || event.source === window;
    const originAllowed = event.origin === window.location.origin || window.location.protocol === "file:";
    if (!sourceAllowed || !originAllowed) return;
    const data = event.data;
    if (data?.source !== "bugbaas-app") return;
    if (data.type === "best-score" && Number.isFinite(data.bestScore)) {
      bestScore = Math.max(bestScore, Math.max(0, Math.floor(data.bestScore)));
      saveLocalBestScore(bestScore);
      updateRunHud();
    }
    if (data.type === "save-status") {
      bestScore = Math.max(bestScore, Math.max(0, Math.floor(Number(data.bestScore) || 0)));
      updateRunHud();
      saveStatusLabel.textContent = data.status === "saved"
        ? `Score opgeslagen in BugBaas · beste ${bestScore}`
        : "Lokale highscore bewaard · database opslaan mislukt";
    }
  });

  startRunButton.addEventListener("click", (event) => {
    event.stopPropagation();
    startRun();
    void startOrientation();
  });

  playAgainButton.addEventListener("click", (event) => {
    event.stopPropagation();
    startRun();
    void startOrientation();
  });

  startOrientationButton.addEventListener("click", (event) => {
    event.stopPropagation();
    startOrientation();
  });

  recalibrateButton.addEventListener("click", (event) => {
    event.stopPropagation();
    recalibrateOrientation();
  });

  fullscreenButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        showMessage("Volledig scherm actief");
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else {
        showMessage("Volledig scherm is hier niet beschikbaar");
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Volledig scherm mislukt");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();
    swingFocusedNet();
  });

  canvas.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerLastX = event.clientX;
    pointerLastY = event.clientY;
    pointerMoved = false;
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - pointerLastX;
    const deltaY = event.clientY - pointerLastY;
    const totalDistance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
    pointerLastX = event.clientX;
    pointerLastY = event.clientY;

    if (totalDistance > 7) {
      pointerMoved = true;
    }

    if (!orientationEnabled) {
      dragYaw -= deltaX * 0.0048;
      dragPitch = THREE.MathUtils.clamp(dragPitch - deltaY * 0.0042, -1.32, 1.32);
    }
  });

  const finishPointer = (event) => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    canvas.releasePointerCapture?.(event.pointerId);
    activePointerId = null;
  };

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  app.addEventListener("pointerup", (event) => {
    if (event.target instanceof Element && event.target.closest("button, .run-panel, .hud-controls")) return;
    if (pointerMoved) {
      pointerMoved = false;
      return;
    }
    swingFocusedNet();
  });
}

function showMessage(text, duration = 1800) {
  messageLabel.textContent = text;
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    messageLabel.textContent = runState === "running"
      ? orientationEnabled
        ? "Beweeg je telefoon · houd in de vangzone · tik bij 100%"
        : "Sleep om te kijken · houd in de vangzone · tik bij 100%"
      : runState === "finished"
        ? "Je run is klaar"
        : "Start de 60 seconden scorejacht";
  }, duration);
}

function updateMotes(elapsed) {
  const motes = scene.getObjectByName("sun-motes");
  if (!motes) {
    return;
  }
  motes.rotation.y = elapsed * 0.015;
  motes.position.y = Math.sin(elapsed * 0.23) * 0.06;
}

function updatePerformance(now) {
  fpsFrames += 1;
  const windowDuration = now - fpsWindowStartedAt;
  if (windowDuration < 1000) {
    return;
  }

  const fps = Math.round((fpsFrames * 1000) / windowDuration);
  fpsLabel.textContent = `${fps} FPS`;
  fpsFrames = 0;
  fpsWindowStartedAt = now;

  if (fps < 28 && currentPixelRatio > 1.25) {
    lowFpsWindows += 1;
    if (lowFpsWindows >= 3) {
      currentPixelRatio = 1.25;
      renderer.setPixelRatio(currentPixelRatio);
      resize();
      lowFpsWindows = 0;
      showMessage("Resolutie aangepast voor vloeiender beeld");
    }
  } else {
    lowFpsWindows = 0;
  }
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(now) {
  if (isIosSafari && lastRenderedAt && now - lastRenderedAt < 1000 / 30) return;
  lastRenderedAt = now;
  const elapsed = clock.getElapsedTime();
  const delta = Math.min(0.05, Math.max(0.001, elapsed - lastElapsed));
  lastElapsed = elapsed;

  updateCamera(delta);
  updateRunTimer(now);
  updateButterflies(elapsed, delta, now);
  updateNet(now, elapsed, delta);
  updateCaptureFx(delta);
  updateMotes(elapsed);
  updatePerformance(now);
  renderer.render(scene, camera);
}
