export type WorldActionId = "claim-reward" | "daily-discovery" | "buddy" | "event" | "explore";

export type WorldActionInput = {
  claimableReward: boolean;
  activeDailyDiscovery: boolean;
  buddyNeedsAction: boolean;
  activeEvent: boolean;
};

export type WorldAction = { id: WorldActionId };

export type WorldHotspotId = "buddy" | "swarmSiege" | "teamHunt";

export type WorldHotspotInput = {
  buddyNeedsAction: boolean;
  swarmSiegeActive: boolean;
  teamHuntActive: boolean;
};

export type WorldEventCard = "swarm-preview" | "swarm-live" | "swarm-result" | "swarm-upcoming" | "team-hunt";

export type WorldTodayModuleId = "next-action" | "research" | "event" | "buddy" | "movement" | "missions";

export type WorldTodayModulesInput = {
  researchVisible: boolean;
  eventUrgent: boolean;
  buddyActionable: boolean;
  movementActionable: boolean;
  missionsActionable: boolean;
};

export function worldHotspotModel(input: WorldHotspotInput): WorldHotspotId[] {
  const hotspots: WorldHotspotId[] = [];
  if (input.buddyNeedsAction) hotspots.push("buddy");
  if (input.swarmSiegeActive) hotspots.push("swarmSiege");
  if (input.teamHuntActive) hotspots.push("teamHunt");
  return hotspots.slice(0, 3);
}

export function worldEventCards(input: {
  swarmActive: boolean;
  swarmComplete: boolean;
  swarmState: "preview" | "live" | "result" | "upcoming";
  teamHuntActive: boolean;
}): WorldEventCard[] {
  const swarmCard: WorldEventCard = input.swarmComplete || input.swarmState === "result"
    ? "swarm-result"
    : input.swarmActive || input.swarmState === "live"
      ? "swarm-live"
      : input.swarmState === "preview"
        ? "swarm-preview"
        : "swarm-upcoming";
  const cards: WorldEventCard[] = [swarmCard];
  if (input.teamHuntActive) cards.push("team-hunt");
  return cards;
}

export function worldTodayModules(input: WorldTodayModulesInput): WorldTodayModuleId[] {
  const modules: WorldTodayModuleId[] = ["next-action"];
  if (input.researchVisible) modules.push("research");
  if (input.eventUrgent) modules.push("event");
  else if (input.buddyActionable) modules.push("buddy");
  else if (input.movementActionable) modules.push("movement");
  else if (input.missionsActionable) modules.push("missions");
  return modules.slice(0, 3);
}

export function worldActionModel(input: WorldActionInput): WorldAction[] {
  const actions: WorldAction[] = [];
  if (input.claimableReward) actions.push({ id: "claim-reward" });
  if (input.activeDailyDiscovery) actions.push({ id: "daily-discovery" });
  if (input.buddyNeedsAction) actions.push({ id: "buddy" });
  if (input.activeEvent) actions.push({ id: "event" });
  if (actions.length === 0) actions.push({ id: "explore" });
  return actions.slice(0, 3);
}
