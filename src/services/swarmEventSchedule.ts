import type { SwarmSiegeEventState, SwarmSiegePhaseId } from "./swarmSiegeService";

type CountdownInput = {
  endsAt: string;
  nextStartsAt?: string;
  resultEndsAt?: string;
  startsAt: string;
  state: SwarmSiegeEventState;
};

const phaseBounds: Record<SwarmSiegePhaseId, { start: number; end: number }> = {
  signal_hunt: { start: 0, end: 25 },
  armor_break: { start: 25, end: 60 },
  nest_surge: { start: 60, end: 90 },
  unstable_core: { start: 90, end: 100 }
};

export function swarmEventCountdownTarget(input: CountdownInput): string {
  if (input.state === "preview") return input.startsAt;
  if (input.state === "live") return input.endsAt;
  if (input.state === "result") return input.resultEndsAt ?? input.endsAt;
  return input.nextStartsAt ?? input.startsAt;
}

export function swarmEventTimeline(startsAt: string): string[] {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) return [];
  return [0, 2, 4].map((hours) => new Date(start.getTime() + hours * 60 * 60 * 1000).toISOString());
}

export function swarmEventPhaseProgress(progress: number, target: number, phaseId: SwarmSiegePhaseId) {
  const eventProgress = Math.max(0, Math.min(100, Math.round((Math.max(0, progress) / Math.max(1, target)) * 100)));
  const bounds = phaseBounds[phaseId];
  const phaseProgress = Math.max(0, Math.min(100, Math.round(((eventProgress - bounds.start) / Math.max(1, bounds.end - bounds.start)) * 100)));
  return {
    eventProgress,
    phaseEnd: bounds.end,
    phaseProgress,
    phaseStart: bounds.start
  };
}
