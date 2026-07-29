function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function minimumPlatformCenterShift(floor: number): number {
  return clamp(11 + Math.max(0, floor - 1) * 0.045, 11, 20);
}

export function platformSkipChance(floor: number): number {
  if (floor < 18) return 0;
  if (floor <= 60) return 0.025 + ((floor - 18) / 42) * 0.055;
  if (floor <= 150) return 0.08 + ((floor - 60) / 90) * 0.07;
  return Math.min(0.22, 0.15 + ((floor - 150) / 250) * 0.07);
}

export function towerPlatformGap(floor: number, gapRoll: number, skipRoll: number): number {
  const stage = Math.floor(floor / 15);
  const normalGap = clamp(9.8 + stage * 0.2 + clamp(gapRoll, 0, 1) * 2.8, 9.8, floor >= 200 ? 16.4 : 17.2);
  if (clamp(skipRoll, 0, 1) >= platformSkipChance(floor)) return normalGap;
  const missingStepGap = clamp(4.8 + floor * 0.012 + clamp(gapRoll, 0, 1) * 2, 4.8, 8.2);
  return clamp(normalGap + missingStepGap, 9.8, 23.5);
}

export function towerJumpVelocity(speed: number, charge: number, springReady: boolean): number {
  const safeSpeed = clamp(speed, 0, 1);
  const safeCharge = clamp(charge, 0, 1);
  const megaJumpBoost = springReady ? 1.05 : 0;
  return -(1.95 + safeSpeed * 0.72 + safeCharge * safeCharge * 1.88 + megaJumpBoost);
}

export function towerScrollSpeed(floor: number, elapsed: number): number {
  const timePressure = Math.max(0, elapsed) * 0.00000016;
  const floorPressure = Math.max(0, floor) * 0.00032;
  const zonePressure = Math.floor(Math.max(0, floor) / 50) * 0.0035;
  return clamp(0.018 + timePressure + floorPressure + zonePressure, 0.018, 0.15);
}

export function towerPlatformX(
  previousX: number,
  previousWidth: number,
  width: number,
  floor: number,
  directionRoll: number
): number {
  const leftEdge = 3.5;
  const rightEdge = 96.5 - width;
  const previousCenter = previousX + previousWidth / 2;
  const minimumShift = minimumPlatformCenterShift(floor);
  const reach = clamp(22 + width * 0.18 + floor * 0.01, minimumShift + 1, 32);
  const roll = clamp(directionRoll, 0, 1);
  let direction = roll >= 0.5 ? 1 : -1;

  if (previousCenter >= 67) direction = -1;
  if (previousCenter <= 33) direction = 1;

  const magnitude = minimumShift + Math.abs(roll - 0.5) * 2 * Math.max(0, reach - minimumShift);
  const candidate = clamp(previousCenter + direction * magnitude - width / 2, leftEdge, rightEdge);
  const candidateShift = Math.abs(candidate + width / 2 - previousCenter);
  if (candidateShift >= minimumShift * 0.92) return candidate;

  const opposite = clamp(previousCenter - direction * magnitude - width / 2, leftEdge, rightEdge);
  return Math.abs(opposite + width / 2 - previousCenter) > candidateShift ? opposite : candidate;
}
