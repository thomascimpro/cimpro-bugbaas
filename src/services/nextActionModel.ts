export type PlayerNextActionDestination = "world" | "scan" | "play" | "collection" | "event";

export type PlayerNextActionId =
  | "complete-onboarding"
  | "reveal-reward"
  | "join-live-event"
  | "continue-research"
  | "continue-expedition"
  | "play-featured"
  | "explore";

export type PlayerNextAction = {
  id: PlayerNextActionId;
  destination: PlayerNextActionDestination;
  titleKey: string;
  reasonKey: string;
  rewardKey: string;
  progressCurrent: number;
  progressTarget: number;
  priority: number;
};

export type OnboardingNextStep = "choose-starter" | "complete-first-play" | "place-first-exhibit";

export type NextActionInput = {
  onboarding?: {
    step: OnboardingNextStep;
    current: number;
    target: number;
  };
  pendingReceiptCount?: number;
  liveEvent?: {
    state: "preview" | "live" | "result";
    minutesRemaining: number;
  };
  activeResearch?: {
    progress: number;
    target: number;
  };
  trackedRegion?: {
    current: number;
    target: number;
  };
  featuredModeAvailable?: boolean;
};

const clampProgress = (value: number, target: number): number => Math.max(0, Math.min(Math.max(1, target), value));

export function buildPlayerNextAction(input: NextActionInput): PlayerNextAction {
  if (input.onboarding) {
    const destination = input.onboarding.step === "complete-first-play" ? "play" : input.onboarding.step === "choose-starter" ? "collection" : "collection";
    return action(
      "complete-onboarding",
      destination,
      `progression.next.onboarding.${input.onboarding.step}.title`,
      `progression.next.onboarding.${input.onboarding.step}.reason`,
      `progression.next.onboarding.${input.onboarding.step}.reward`,
      input.onboarding.current,
      input.onboarding.target,
      100
    );
  }

  const pendingReceiptCount = Math.max(0, Math.floor(input.pendingReceiptCount ?? 0));
  if (pendingReceiptCount > 0) {
    return action(
      "reveal-reward",
      "world",
      "progression.next.reward.title",
      "progression.next.reward.reason",
      "progression.next.reward.reward",
      pendingReceiptCount,
      pendingReceiptCount,
      90
    );
  }

  if (input.liveEvent?.state === "live" && input.liveEvent.minutesRemaining >= 0 && input.liveEvent.minutesRemaining <= 120) {
    return action(
      "join-live-event",
      "event",
      "progression.next.event.title",
      "progression.next.event.reason",
      "progression.next.event.reward",
      Math.max(0, 120 - input.liveEvent.minutesRemaining),
      120,
      80
    );
  }

  if (input.activeResearch && input.activeResearch.target > 0 && input.activeResearch.progress / input.activeResearch.target >= 0.75) {
    return action(
      "continue-research",
      "world",
      "progression.next.research.title",
      "progression.next.research.reason",
      "progression.next.research.reward",
      input.activeResearch.progress,
      input.activeResearch.target,
      70
    );
  }

  if (input.trackedRegion && input.trackedRegion.target > 0) {
    return action(
      "continue-expedition",
      "world",
      "progression.next.expedition.title",
      "progression.next.expedition.reason",
      "progression.next.expedition.reward",
      input.trackedRegion.current,
      input.trackedRegion.target,
      60
    );
  }

  if (input.featuredModeAvailable) {
    return action(
      "play-featured",
      "play",
      "progression.next.featured.title",
      "progression.next.featured.reason",
      "progression.next.featured.reward",
      0,
      1,
      50
    );
  }

  return action(
    "explore",
    "scan",
    "progression.next.explore.title",
    "progression.next.explore.reason",
    "progression.next.explore.reward",
    0,
    1,
    10
  );
}

function action(
  id: PlayerNextActionId,
  destination: PlayerNextActionDestination,
  titleKey: string,
  reasonKey: string,
  rewardKey: string,
  current: number,
  target: number,
  priority: number
): PlayerNextAction {
  const safeTarget = Math.max(1, Number.isFinite(target) ? target : 1);
  return {
    id,
    destination,
    titleKey,
    reasonKey,
    rewardKey,
    progressCurrent: clampProgress(Number.isFinite(current) ? current : 0, safeTarget),
    progressTarget: safeTarget,
    priority
  };
}
