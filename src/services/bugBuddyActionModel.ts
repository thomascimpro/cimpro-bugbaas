export type BuddyActionAvailabilityReason = "active_task" | "cooldown" | "energy" | "ready";

export type BuddyActionAvailabilityState = {
  activeTask: boolean;
  energy: number;
  lastStartedAt: number;
};

export type BuddyActionAvailabilityConfig<TAction extends string = string> = {
  id: TAction;
  cooldownMs: number;
  energyCost: number;
};

export function buddyActionAvailability(
  state: BuddyActionAvailabilityState,
  action: BuddyActionAvailabilityConfig,
  now: number
): { ready: boolean; reason: BuddyActionAvailabilityReason; remainingMs: number } {
  if (state.activeTask) return { ready: false, reason: "active_task", remainingMs: 0 };
  if (state.energy < action.energyCost) return { ready: false, reason: "energy", remainingMs: 0 };
  const remainingMs = Math.max(0, action.cooldownMs - Math.max(0, now - state.lastStartedAt));
  if (remainingMs > 0) return { ready: false, reason: "cooldown", remainingMs };
  return { ready: true, reason: "ready", remainingMs: 0 };
}
