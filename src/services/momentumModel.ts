export type MomentumState = {
  cycle: number;
  lastActiveDay?: string;
  segments: number;
};

export type MomentumAdvance = MomentumState & {
  changed: boolean;
  completedCycle: boolean;
};

export function advanceMomentum(current: MomentumState, localDay: string): MomentumAdvance {
  const day = String(localDay || "").trim();
  const segments = Math.max(0, Math.min(5, Math.floor(Number(current.segments) || 0)));
  const cycle = Math.max(0, Math.floor(Number(current.cycle) || 0));
  if (!day || current.lastActiveDay === day) {
    return { changed: false, completedCycle: false, cycle, lastActiveDay: current.lastActiveDay, segments };
  }
  const nextSegments = segments >= 5 ? 1 : segments + 1;
  const completedCycle = nextSegments === 5;
  return {
    changed: true,
    completedCycle,
    cycle: cycle + (completedCycle ? 1 : 0),
    lastActiveDay: day,
    segments: nextSegments
  };
}

export function momentumSegmentsForUser(user: { momentumSegments?: number }): number {
  return Math.max(0, Math.min(5, Math.floor(Number(user.momentumSegments) || 0)));
}
