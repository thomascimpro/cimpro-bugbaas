import React, { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";
import {
  BUTTERFLY_CATCH_CAPTURE_END_MS,
  BUTTERFLY_CATCH_CAPTURE_START_MS,
  BUTTERFLY_CATCH_SWING_DURATION_MS,
} from "./butterflyCatchGameModel";
import type { ButterflyCatchSceneProps } from "./ButterflyCatchGame.types";

const BUTTERFLY_COUNT = 10;
const NET_RADIUS = 0.62;
const NET_DEPTH = 0.28;
const AIM_LOCK_DURATION_MS = 1_500;
const AIM_RADIUS = 0.24;
const AIM_CAPTURE_COOLDOWN_MS = 360;
type FlyingBugKind = "butterfly" | "moth" | "dragonfly" | "bee" | "beetle";

const FLYING_BUG_SPECS = [
  { kind: "butterfly", name: "Koninginnenpage", palette: ["#f7c54a", "#3d2714", "#fff0a6"], near: 0.9, far: 7.8, points: 1, scale: 0.78, flapHz: 11.5, travel: 0.28 },
  { kind: "dragonfly", name: "Smaragdlibel", palette: ["#5cd6c2", "#153e3b", "#b8fff2"], near: 1.1, far: 9.2, points: 3, scale: 0.72, flapHz: 21, travel: 0.42 },
  { kind: "bee", name: "Aardhommel", palette: ["#e9b83f", "#2e2419", "#f4ebcf"], near: 0.8, far: 6.5, points: 2, scale: 0.76, flapHz: 26, travel: 0.34 },
  { kind: "moth", name: "Atlasmot", palette: ["#c6774d", "#42261e", "#f4c9a2"], near: 1.05, far: 8.8, points: 1, scale: 0.88, flapHz: 9.5, travel: 0.22 },
  { kind: "beetle", name: "Gouden tor", palette: ["#4fb47b", "#17342d", "#d8b657"], near: 0.95, far: 7.2, points: 2, scale: 0.74, flapHz: 18, travel: 0.3 },
  { kind: "butterfly", name: "Blauwe morpho", palette: ["#4aa8ff", "#13294f", "#b5efff"], near: 1.2, far: 9.5, points: 1, scale: 0.82, flapHz: 12.5, travel: 0.25 },
  { kind: "dragonfly", name: "Keizerlibel", palette: ["#65b8ec", "#173854", "#d6f4ff"], near: 1, far: 10.2, points: 3, scale: 0.78, flapHz: 23, travel: 0.46 },
  { kind: "bee", name: "Honingbij", palette: ["#d49b32", "#34251b", "#fff1bf"], near: 0.85, far: 6.8, points: 2, scale: 0.68, flapHz: 28, travel: 0.38 },
  { kind: "moth", name: "Maanmot", palette: ["#a8d69d", "#324a32", "#e8ffd6"], near: 1.25, far: 9.8, points: 1, scale: 0.92, flapHz: 8.5, travel: 0.2 },
  { kind: "beetle", name: "Juweelkever", palette: ["#48a6a0", "#192f31", "#d88740"], near: 1, far: 8.1, points: 2, scale: 0.72, flapHz: 19, travel: 0.32 },
] as const satisfies ReadonlyArray<{
  kind: FlyingBugKind;
  name: string;
  palette: readonly [string, string, string];
  near: number;
  far: number;
  points: 1 | 2 | 3;
  scale: number;
  flapHz: number;
  travel: number;
}>;

type ButterflyProps = {
  index: number;
  hiddenUntilRef: React.MutableRefObject<number[]>;
};

type NetPose = {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  trailOpacity: number;
};

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function SkyDome() {
  const uniforms = useMemo(() => ({
    horizonColor: { value: new THREE.Color("#cbdcb9") },
    skyColor: { value: new THREE.Color("#5f9fbd") },
    groundGlow: { value: new THREE.Color("#5f7f4b") },
    sunDirection: { value: new THREE.Vector3(-0.4, 0.74, 0.34).normalize() },
  }), []);

  return (
    <mesh scale={38}>
      <sphereGeometry args={[1, 32, 18]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vDirection;
          uniform vec3 horizonColor;
          uniform vec3 skyColor;
          uniform vec3 groundGlow;
          uniform vec3 sunDirection;
          void main() {
            float skyMix = smoothstep(-0.08, 0.72, vDirection.y);
            vec3 color = mix(groundGlow, horizonColor, smoothstep(-0.28, 0.08, vDirection.y));
            color = mix(color, skyColor, skyMix);
            float sun = pow(max(dot(normalize(vDirection), sunDirection), 0.0), 72.0);
            color += vec3(1.0, 0.76, 0.38) * sun * 0.68;
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function MeadowGround() {
  const geometry = useMemo(() => {
    const next = new THREE.CircleGeometry(28, 96);
    const positions = next.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const low = new THREE.Color("#3f7339");
    const high = new THREE.Color("#6e984c");
    const color = new THREE.Color();
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const distance = Math.hypot(x, y);
      const height = distance < 2.2
        ? -0.08
        : Math.sin(x * 0.22) * 0.2 + Math.cos(y * 0.18) * 0.16 + Math.sin((x + y) * 0.1) * 0.12;
      positions.setZ(index, height);
      color.copy(low).lerp(high, THREE.MathUtils.clamp(0.42 + height * 0.8, 0, 1));
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    next.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    next.computeVertexNormals();
    next.rotateX(-Math.PI / 2);
    return next;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.98} />
    </mesh>
  );
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function smoothstep(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function sampleCatmullRom(values: readonly number[], progress: number): number {
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * (values.length - 1);
  const index = Math.min(Math.floor(scaled), values.length - 2);
  const amount = scaled - index;
  const p0 = values[Math.max(0, index - 1)];
  const p1 = values[index];
  const p2 = values[index + 1];
  const p3 = values[Math.min(values.length - 1, index + 2)];
  const amount2 = amount * amount;
  const amount3 = amount2 * amount;
  return 0.5 * (
    (2 * p1)
    + (-p0 + p2) * amount
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * amount2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * amount3
  );
}

function netPoseForProgress(progress: number): NetPose {
  const amount = smoothstep(progress);
  const trailWave = Math.pow(Math.sin(Math.PI * amount), 2);
  return {
    x: sampleCatmullRom([0.72, 0.88, 0.62, 0.12, -0.25, -0.18, 0.24, 0.72], amount),
    y: sampleCatmullRom([-0.5, -0.62, -0.46, -0.1, 0.02, -0.04, -0.24, -0.5], amount),
    z: sampleCatmullRom([-1.18, -0.96, -1.16, -1.72, -2.08, -1.98, -1.58, -1.18], amount),
    rotationX: sampleCatmullRom([-0.12, -0.4, -0.26, 0.08, 0.2, 0.18, 0.02, -0.12], amount),
    rotationY: sampleCatmullRom([0.12, 0.28, 0.2, 0.02, -0.14, -0.12, 0.02, 0.12], amount),
    rotationZ: sampleCatmullRom([-0.22, -0.5, -0.34, 0.05, 0.28, 0.22, -0.02, -0.22], amount),
    trailOpacity: trailWave * 0.42,
  };
}

const Butterfly = forwardRef<THREE.Group, ButterflyProps>(function Butterfly(
  { index, hiddenUntilRef },
  forwardedRef,
) {
  const rootRef = useRef<THREE.Group>(null);
  const foreLeftRef = useRef<THREE.Group>(null);
  const foreRightRef = useRef<THREE.Group>(null);
  const hindLeftRef = useRef<THREE.Group>(null);
  const hindRightRef = useRef<THREE.Group>(null);
  const previousPosition = useRef(new THREE.Vector3());
  const spec = FLYING_BUG_SPECS[index % FLYING_BUG_SPECS.length];
  const palette = spec.palette;
  const phase = index * 1.71 + 0.4;

  useEffect(() => {
    if (typeof forwardedRef === "function") forwardedRef(rootRef.current);
    else if (forwardedRef) forwardedRef.current = rootRef.current;
    return () => {
      if (typeof forwardedRef === "function") forwardedRef(null);
      else if (forwardedRef) forwardedRef.current = null;
    };
  }, [forwardedRef]);

  useFrame(({ clock }, delta) => {
    const group = rootRef.current;
    if (!group) return;
    const elapsed = clock.elapsedTime;
    const hidden = elapsed < (hiddenUntilRef.current[index] ?? 0);
    group.visible = !hidden;
    if (hidden) return;

    const approachWave = (Math.sin(elapsed * (0.2 + index * 0.008) + phase) + 1) * 0.5;
    const distanceMix = smoothstep(approachWave);
    const flightRadius = lerp(spec.near, spec.far, distanceMix);
    const dart = spec.kind === "bee" ? Math.sin(elapsed * 2.7 + phase) * 0.24 : 0;
    const theta = elapsed * spec.travel + phase + dart;
    const x = Math.cos(theta) * flightRadius + Math.sin(theta * 2.1) * Math.min(0.72, flightRadius * 0.1);
    const z = Math.sin(theta * 0.91) * flightRadius + Math.cos(theta * 1.7) * Math.min(0.58, flightRadius * 0.08);
    const hover = spec.kind === "dragonfly"
      ? Math.sin(elapsed * 2.4 + phase) * 0.12
      : spec.kind === "bee"
        ? Math.sin(elapsed * 4.2 + phase) * 0.2
        : Math.sin(elapsed * (1.15 + index * 0.02) + phase) * 0.42;
    const y = 1.18 + (index % 3) * 0.32 + hover + distanceMix * (0.45 + (index % 2) * 0.3);
    group.position.set(x, y, z);

    const velocityX = group.position.x - previousPosition.current.x;
    const velocityZ = group.position.z - previousPosition.current.z;
    if (Math.abs(velocityX) + Math.abs(velocityZ) > 0.0001) {
      const targetYaw = Math.atan2(velocityX, velocityZ);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetYaw, 8, delta);
    }
    const bankStrength = spec.kind === "dragonfly" ? 0.2 : spec.kind === "bee" ? 0.16 : 0.11;
    group.rotation.z = Math.sin(elapsed * (spec.kind === "bee" ? 3.2 : 1.8) + phase) * bankStrength;
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      spec.kind === "dragonfly" ? Math.sin(elapsed * 0.9 + phase) * 0.08 : 0,
      7,
      delta,
    );
    previousPosition.current.copy(group.position);

    const flapAmplitude = spec.kind === "dragonfly" ? 0.26 : spec.kind === "bee" ? 0.42 : spec.kind === "beetle" ? 0.38 : 0.86;
    const flap = Math.sin(elapsed * spec.flapHz + phase) * flapAmplitude;
    if (foreLeftRef.current) foreLeftRef.current.rotation.y = flap;
    if (foreRightRef.current) foreRightRef.current.rotation.y = -flap;
    if (hindLeftRef.current) hindLeftRef.current.rotation.y = flap * (spec.kind === "dragonfly" ? -0.85 : 0.72);
    if (hindRightRef.current) hindRightRef.current.rotation.y = -flap * (spec.kind === "dragonfly" ? -0.85 : 0.72);
  }, -1);

  const wingMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: palette[0],
      roughness: spec.kind === "dragonfly" ? 0.24 : 0.42,
      metalness: spec.kind === "beetle" ? 0.32 : 0.08,
      opacity: spec.kind === "dragonfly" || spec.kind === "bee" ? 0.58 : 0.96,
      side: THREE.DoubleSide,
      transparent: true,
    }),
    [palette, spec.kind],
  );
  const accentMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette[2], roughness: 0.5, side: THREE.DoubleSide }),
    [palette],
  );
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: palette[1],
      roughness: spec.kind === "moth" ? 0.92 : 0.68,
      metalness: spec.kind === "beetle" ? 0.38 : 0.02,
    }),
    [palette, spec.kind],
  );
  const foreWingScale: [number, number, number] = spec.kind === "dragonfly"
    ? [1.95, 0.045, 0.52]
    : spec.kind === "bee"
      ? [0.82, 0.06, 1.02]
      : spec.kind === "beetle"
        ? [0.78, 0.07, 0.9]
        : spec.kind === "moth"
          ? [1.42, 0.1, 1.72]
          : [1.25, 0.09, 1.65];
  const hindWingScale: [number, number, number] = spec.kind === "dragonfly"
    ? [1.65, 0.04, 0.42]
    : spec.kind === "bee"
      ? [0.6, 0.05, 0.76]
      : spec.kind === "beetle"
        ? [0.58, 0.05, 0.7]
        : [0.92, 0.08, 1.08];
  const bodyScale: [number, number, number] = spec.kind === "dragonfly"
    ? [0.62, 2.5, 0.62]
    : spec.kind === "bee"
      ? [1.28, 1.18, 1.28]
      : spec.kind === "beetle"
        ? [1.42, 1.24, 1.42]
        : [0.85, 1.35, 0.85];

  return (
    <group ref={rootRef} scale={spec.scale}>
      <group ref={foreLeftRef} position={[-0.13, 0.02, 0]}>
        <mesh material={wingMaterial} position={[-0.23, 0.05, 0]} rotation={[Math.PI / 2, 0, -0.34]} scale={foreWingScale}>
          <sphereGeometry args={[0.24, 12, 8]} />
        </mesh>
        <mesh material={accentMaterial} position={[-0.28, 0.065, 0.02]} rotation={[Math.PI / 2, 0, -0.34]} scale={[0.42, 0.1, 0.48]}>
          <sphereGeometry args={[0.24, 10, 7]} />
        </mesh>
      </group>
      <group ref={foreRightRef} position={[0.13, 0.02, 0]}>
        <mesh material={wingMaterial} position={[0.23, 0.05, 0]} rotation={[Math.PI / 2, 0, 0.34]} scale={foreWingScale}>
          <sphereGeometry args={[0.24, 12, 8]} />
        </mesh>
        <mesh material={accentMaterial} position={[0.28, 0.065, 0.02]} rotation={[Math.PI / 2, 0, 0.34]} scale={[0.42, 0.1, 0.48]}>
          <sphereGeometry args={[0.24, 10, 7]} />
        </mesh>
      </group>
      <group ref={hindLeftRef} position={[-0.11, -0.02, 0.04]}>
        <mesh material={wingMaterial} position={[-0.18, -0.02, 0.08]} rotation={[Math.PI / 2, 0, -0.7]} scale={hindWingScale}>
          <sphereGeometry args={[0.22, 12, 8]} />
        </mesh>
      </group>
      <group ref={hindRightRef} position={[0.11, -0.02, 0.04]}>
        <mesh material={wingMaterial} position={[0.18, -0.02, 0.08]} rotation={[Math.PI / 2, 0, 0.7]} scale={hindWingScale}>
          <sphereGeometry args={[0.22, 12, 8]} />
        </mesh>
      </group>
      <mesh material={bodyMaterial} rotation={[Math.PI / 2, 0, 0]} scale={bodyScale}>
        <capsuleGeometry args={[0.07, 0.22, 5, 8]} />
      </mesh>
      <mesh material={bodyMaterial} position={[0, 0.04, -0.19]}>
        <sphereGeometry args={[0.09, 10, 8]} />
      </mesh>
      <mesh position={[-0.052, 0.065, -0.255]}>
        <sphereGeometry args={[spec.kind === "dragonfly" ? 0.052 : 0.035, 8, 6]} />
        <meshStandardMaterial color="#070805" roughness={0.18} metalness={0.15} />
      </mesh>
      <mesh position={[0.052, 0.065, -0.255]}>
        <sphereGeometry args={[spec.kind === "dragonfly" ? 0.052 : 0.035, 8, 6]} />
        <meshStandardMaterial color="#070805" roughness={0.18} metalness={0.15} />
      </mesh>
      {spec.kind === "bee" ? [-0.11, 0.02, 0.14].map((z) => (
        <mesh key={`bee-stripe-${z}`} position={[0, 0, z]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.078, 0.018, 6, 14]} />
          <meshStandardMaterial color="#f0c24e" roughness={0.72} />
        </mesh>
      )) : null}
      {spec.kind === "beetle" ? (
        <>
          <mesh material={wingMaterial} position={[-0.045, 0.035, 0.08]} scale={[0.62, 0.38, 1.16]}>
            <sphereGeometry args={[0.16, 12, 8]} />
          </mesh>
          <mesh material={wingMaterial} position={[0.045, 0.035, 0.08]} scale={[0.62, 0.38, 1.16]}>
            <sphereGeometry args={[0.16, 12, 8]} />
          </mesh>
        </>
      ) : null}
      <mesh material={bodyMaterial} position={[-0.045, 0.1, -0.27]} rotation={[0.38, 0, -0.28]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 5]} />
      </mesh>
      <mesh material={bodyMaterial} position={[0.045, 0.1, -0.27]} rotation={[0.38, 0, 0.28]}>
        <cylinderGeometry args={[0.008, 0.008, 0.24, 5]} />
      </mesh>
    </group>
  );
});

function MeadowWorld() {
  const random = useMemo(() => seededRandom(9317), []);
  const trees = useMemo(
    () => Array.from({ length: 30 }, (_, index) => {
      const angle = (index / 30) * Math.PI * 2 + random() * 0.16;
      const distance = 10.5 + random() * 8.5;
      return {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        scale: 1.2 + random() * 1.7,
        hue: index % 3,
      };
    }),
    [random],
  );
  const flowers = useMemo(
    () => Array.from({ length: 52 }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const distance = 1.8 + random() * 8.5;
      return {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        height: 0.22 + random() * 0.42,
        color: ["#f6d04d", "#ef8fb6", "#b8dcff", "#f7f0d3"][index % 4],
      };
    }),
    [random],
  );
  const stones = useMemo(
    () => Array.from({ length: 18 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = 2.4 + random() * 9;
      return {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        scale: 0.15 + random() * 0.42,
      };
    }),
    [random],
  );

  return (
    <>
      <color attach="background" args={["#86b9c8"]} />
      <fog attach="fog" args={["#b7cdbd", 10, 31]} />
      <SkyDome />
      <hemisphereLight args={["#e9fbff", "#38522b", 1.85]} />
      <directionalLight position={[-7, 13, 5]} intensity={2.35} color="#fff0bd" />
      <pointLight position={[5, 4, -6]} intensity={9} distance={18} decay={2} color="#ffc96c" />
      <MeadowGround />
      <mesh position={[-18, 22, 13]}>
        <sphereGeometry args={[0.92, 18, 12]} />
        <meshBasicMaterial color="#ffe59c" fog={false} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[8, 19, 64]} />
        <meshStandardMaterial color="#3f7137" roughness={1} />
      </mesh>
      {trees.map((tree, index) => (
        <group key={`tree-${index}`} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.16, 0.24, 2.7, 12]} />
            <meshStandardMaterial color="#6e4930" roughness={1} />
          </mesh>
          <mesh position={[0, 3.15, 0]} scale={[1.05, 1.25, 1.05]}>
            <sphereGeometry args={[1.25, 14, 10]} />
            <meshStandardMaterial color={["#2f6336", "#397642", "#28582f"][tree.hue]} roughness={0.95} />
          </mesh>
          <mesh position={[0.62, 2.75, 0.2]} scale={0.65}>
            <sphereGeometry args={[1.05, 14, 10]} />
            <meshStandardMaterial color="#3b7440" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {flowers.map((flower, index) => (
        <group key={`flower-${index}`} position={[flower.x, 0, flower.z]}>
          <mesh position={[0, flower.height / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.016, flower.height, 5]} />
            <meshStandardMaterial color="#397a35" roughness={1} />
          </mesh>
          <mesh position={[0, flower.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 7]} />
            <meshStandardMaterial color={flower.color} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {stones.map((stone, index) => (
        <mesh key={`stone-${index}`} position={[stone.x, stone.scale * 0.35, stone.z]} scale={[stone.scale * 1.2, stone.scale * 0.65, stone.scale]}>
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color="#7e8577" roughness={1} />
        </mesh>
      ))}
      <Motes />
    </>
  );
}

function Motes() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const random = seededRandom(887);
    const values = new Float32Array(180 * 3);
    for (let index = 0; index < 180; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = 1 + random() * 13;
      values[index * 3] = Math.cos(angle) * distance;
      values[index * 3 + 1] = 0.4 + random() * 4.5;
      values[index * 3 + 2] = Math.sin(angle) * distance;
    }
    return values;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.012;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.35) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff1a5" size={0.045} transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

function Net({ groupRef, trailMaterialRef }: {
  groupRef: React.RefObject<THREE.Group | null>;
  trailMaterialRef: React.RefObject<THREE.MeshBasicMaterial | null>;
}) {
  const bagLines = useMemo(
    () => Array.from({ length: 16 }, (_, index) => {
      const angle = (index / 16) * Math.PI * 2;
      return { angle, x: Math.cos(angle) * NET_RADIUS, y: Math.sin(angle) * NET_RADIUS };
    }),
    [],
  );

  return (
    <group ref={groupRef}>
      <mesh scale={1.035}>
        <torusGeometry args={[NET_RADIUS, 0.055, 14, 72]} />
        <meshStandardMaterial color="#64706d" roughness={0.32} metalness={0.68} />
      </mesh>
      <mesh>
        <torusGeometry args={[NET_RADIUS, 0.035, 14, 72]} />
        <meshStandardMaterial color="#eee1b7" roughness={0.48} metalness={0.18} />
      </mesh>
      <mesh position={[0, -1.15, 0.12]}>
        <cylinderGeometry args={[0.036, 0.058, 2.05, 18]} />
        <meshStandardMaterial color="#8b5a32" roughness={0.72} metalness={0.03} />
      </mesh>
      <mesh position={[0, -0.17, 0.08]}>
        <cylinderGeometry args={[0.074, 0.068, 0.22, 14]} />
        <meshStandardMaterial color="#b9b5a8" roughness={0.3} metalness={0.72} />
      </mesh>
      {[-1.72, -1.5, -1.28].map((y) => (
        <mesh key={`grip-${y}`} position={[0, y, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.058, 0.009, 6, 14]} />
          <meshStandardMaterial color="#4a2f22" roughness={0.92} />
        </mesh>
      ))}
      {bagLines.map((line, index) => {
        const length = Math.sqrt(line.x * line.x + line.y * line.y + 0.75 * 0.75);
        const midpoint = new THREE.Vector3(line.x / 2, line.y / 2, -0.375);
        const direction = new THREE.Vector3(-line.x, -line.y, -0.75).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        return (
          <mesh key={`bag-line-${index}`} position={midpoint} quaternion={quaternion}>
            <cylinderGeometry args={[0.008, 0.008, length, 4]} />
            <meshBasicMaterial color="#d8eadc" transparent opacity={0.48} />
          </mesh>
        );
      })}
      <mesh position={[0, 0, -0.78]} scale={0.09}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#d8eadc" transparent opacity={0.5} />
      </mesh>
      {[0.24, 0.48, 0.68].map((depth) => (
        <mesh key={`bag-ring-${depth}`} position={[0, 0, -depth]} scale={1 - depth * 0.98}>
          <torusGeometry args={[NET_RADIUS, 0.008, 5, 30]} />
          <meshBasicMaterial color="#d8eadc" transparent opacity={0.42} depthWrite={false} />
        </mesh>
      ))}
      <mesh position={[0.12, -0.04, 0.08]} scale={1.08}>
        <torusGeometry args={[NET_RADIUS, 0.058, 8, 38]} />
        <meshBasicMaterial ref={trailMaterialRef} color="#fff0a1" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function ButterflyCatchScene({
  lookRef,
  runActive,
  swingFocusRef,
  swingRequestId,
  onAimChange,
  onCatch,
  onMiss,
  onFpsChange,
}: ButterflyCatchSceneProps) {
  const { camera } = useThree();
  const butterflyRefs = useRef<Array<THREE.Group | null>>(Array.from({ length: BUTTERFLY_COUNT }, () => null));
  const hiddenUntilRef = useRef<number[]>(Array.from({ length: BUTTERFLY_COUNT }, () => 0));
  const netRef = useRef<THREE.Group>(null);
  const trailMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const activeSwingIdRef = useRef(0);
  const swingStartedAtRef = useRef(0);
  const swingResolvedRef = useRef(false);
  const aimTargetIndexRef = useRef<number | null>(null);
  const aimStartedAtRef = useRef(0);
  const aimLastEmitAtRef = useRef(0);
  const captureCooldownUntilRef = useRef(0);
  const previousRelativeDepthRef = useRef<number[]>(Array.from({ length: BUTTERFLY_COUNT }, () => Number.POSITIVE_INFINITY));
  const fpsFramesRef = useRef(0);
  const fpsStartedAtRef = useRef(0);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempLocal = useMemo(() => new THREE.Vector3(), []);
  const tempProjected = useMemo(() => new THREE.Vector3(), []);
  const localNetPosition = useMemo(() => new THREE.Vector3(), []);
  const localNetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const cameraQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const worldNetPosition = useMemo(() => new THREE.Vector3(), []);
  const worldNetQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const netEuler = useMemo(() => new THREE.Euler(), []);

  useEffect(() => {
    if (swingRequestId <= activeSwingIdRef.current) return;
    activeSwingIdRef.current = swingRequestId;
    swingStartedAtRef.current = performance.now();
    swingResolvedRef.current = false;
    previousRelativeDepthRef.current.fill(Number.POSITIVE_INFINITY);
  }, [swingRequestId]);

  useFrame(({ clock }, delta) => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, lookRef.current.yaw, 10, delta);
    camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, lookRef.current.pitch, 10, delta);
    camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, 0, 12, delta);
    camera.position.set(0, 1.62, 0);
    camera.updateMatrixWorld();

    const nowMs = performance.now();
    const swingElapsedMs = activeSwingIdRef.current > 0 ? nowMs - swingStartedAtRef.current : BUTTERFLY_CATCH_SWING_DURATION_MS;
    const swingProgress = THREE.MathUtils.clamp(swingElapsedMs / BUTTERFLY_CATCH_SWING_DURATION_MS, 0, 1);
    const pose = netPoseForProgress(swingProgress);
    localNetPosition.set(pose.x, pose.y, pose.z);
    netEuler.set(pose.rotationX, pose.rotationY, pose.rotationZ, "XYZ");
    localNetQuaternion.setFromEuler(netEuler);

    camera.getWorldQuaternion(cameraQuaternion);
    worldNetPosition.copy(localNetPosition).applyQuaternion(cameraQuaternion).add(camera.position);
    worldNetQuaternion.copy(cameraQuaternion).multiply(localNetQuaternion);
    if (netRef.current) {
      netRef.current.position.copy(worldNetPosition);
      netRef.current.quaternion.copy(worldNetQuaternion);
      netRef.current.scale.setScalar(1 + Math.sin(swingProgress * Math.PI) * 0.025);
    }
    if (trailMaterialRef.current) trailMaterialRef.current.opacity = pose.trailOpacity;

    let aimTargetIndex: number | null = null;
    let aimTargetOffset = Number.POSITIVE_INFINITY;
    if (runActive && nowMs >= captureCooldownUntilRef.current) {
      for (let index = 0; index < butterflyRefs.current.length; index += 1) {
        const butterfly = butterflyRefs.current[index];
        if (!butterfly || !butterfly.visible) continue;
        butterfly.getWorldPosition(tempPosition);
        tempLocal.copy(tempPosition);
        camera.worldToLocal(tempLocal);
        if (tempLocal.z >= -0.05) continue;
        tempProjected.copy(tempPosition).project(camera);
        if (tempProjected.z < -1 || tempProjected.z > 1) continue;
        const screenOffset = Math.hypot(tempProjected.x, tempProjected.y * 1.08);
        if (screenOffset <= AIM_RADIUS && screenOffset < aimTargetOffset) {
          aimTargetIndex = index;
          aimTargetOffset = screenOffset;
        }
      }
    }

    if (aimTargetIndex !== aimTargetIndexRef.current) {
      aimTargetIndexRef.current = aimTargetIndex;
      aimStartedAtRef.current = aimTargetIndex === null ? 0 : nowMs;
    }

    let aimProgress = 0;
    if (aimTargetIndex !== null) {
      aimProgress = THREE.MathUtils.clamp((nowMs - aimStartedAtRef.current) / AIM_LOCK_DURATION_MS, 0, 1);
    }
    if (nowMs - aimLastEmitAtRef.current >= 50) {
      onAimChange?.({
        progress: aimProgress,
        targetName: aimTargetIndex === null ? null : FLYING_BUG_SPECS[aimTargetIndex % FLYING_BUG_SPECS.length].name,
        tracking: aimTargetIndex !== null,
      });
      aimLastEmitAtRef.current = nowMs;
    }

    if (runActive && aimTargetIndex !== null && aimProgress >= 1) {
      const spec = FLYING_BUG_SPECS[aimTargetIndex % FLYING_BUG_SPECS.length];
      hiddenUntilRef.current[aimTargetIndex] = clock.elapsedTime + 1.45;
      captureCooldownUntilRef.current = nowMs + AIM_CAPTURE_COOLDOWN_MS;
      aimTargetIndexRef.current = null;
      aimStartedAtRef.current = 0;
      activeSwingIdRef.current += 1;
      swingStartedAtRef.current = nowMs;
      swingResolvedRef.current = true;
      previousRelativeDepthRef.current.fill(Number.POSITIVE_INFINITY);
      onAimChange?.({ progress: 0, targetName: null, tracking: false });
      onCatch(spec.name, spec.points);
    } else if (!runActive && aimTargetIndexRef.current !== null) {
      aimTargetIndexRef.current = null;
      aimStartedAtRef.current = 0;
      onAimChange?.({ progress: 0, targetName: null, tracking: false });
    }

    const inCaptureWindow = runActive
      && !swingResolvedRef.current
      && swingFocusRef.current >= 0.32
      && swingElapsedMs >= BUTTERFLY_CATCH_CAPTURE_START_MS
      && swingElapsedMs <= BUTTERFLY_CATCH_CAPTURE_END_MS;

    if (inCaptureWindow) {
      for (let index = 0; index < butterflyRefs.current.length; index += 1) {
        const butterfly = butterflyRefs.current[index];
        if (!butterfly || !butterfly.visible) continue;
        butterfly.getWorldPosition(tempPosition);
        tempLocal.copy(tempPosition);
        camera.worldToLocal(tempLocal);
        const dx = tempLocal.x - pose.x;
        const dy = tempLocal.y - pose.y;
        const relativeDepth = tempLocal.z - pose.z;
        const previousDepth = previousRelativeDepthRef.current[index];
        const insideRim = Math.hypot(dx, dy) <= NET_RADIUS * 0.9;
        const insideBagDepth = Math.abs(relativeDepth) <= NET_DEPTH;
        const crossedOpening = previousDepth > 0 && relativeDepth <= 0;
        previousRelativeDepthRef.current[index] = relativeDepth;
        if (insideRim && (insideBagDepth || crossedOpening)) {
          swingResolvedRef.current = true;
          hiddenUntilRef.current[index] = clock.elapsedTime + 1.35;
          onCatch(FLYING_BUG_SPECS[index % FLYING_BUG_SPECS.length].name);
          break;
        }
      }
    }

    if (
      runActive
      && activeSwingIdRef.current > 0
      && !swingResolvedRef.current
      && swingElapsedMs > BUTTERFLY_CATCH_CAPTURE_END_MS
      && swingElapsedMs < BUTTERFLY_CATCH_SWING_DURATION_MS
    ) {
      swingResolvedRef.current = true;
      onMiss();
    }

    fpsFramesRef.current += 1;
    if (fpsStartedAtRef.current === 0) fpsStartedAtRef.current = nowMs;
    const fpsWindow = nowMs - fpsStartedAtRef.current;
    if (fpsWindow >= 1_000) {
      onFpsChange?.(Math.round((fpsFramesRef.current * 1_000) / fpsWindow));
      fpsFramesRef.current = 0;
      fpsStartedAtRef.current = nowMs;
    }
  });

  return (
    <>
      <MeadowWorld />
      {Array.from({ length: BUTTERFLY_COUNT }, (_, index) => (
        <Butterfly
          key={`butterfly-${index}`}
          index={index}
          hiddenUntilRef={hiddenUntilRef}
          ref={(value) => { butterflyRefs.current[index] = value; }}
        />
      ))}
      <Net groupRef={netRef} trailMaterialRef={trailMaterialRef} />
    </>
  );
}
