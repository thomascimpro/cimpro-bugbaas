export const mainDestinations = ["world", "scan", "play", "collection"] as const;

export type MainDestination = (typeof mainDestinations)[number];

export type AppOverlay =
  | { type: "player" }
  | { type: "missions"; tab?: "daily" | "weekly" }
  | { type: "buddy" }
  | { type: "teamHunt" }
  | { type: "bugDexDetail"; bugId: string }
  | { type: "trade" }
  | { type: "filters"; scope: "bugs" | "collection" | "journal" }
  | { type: "settings"; section?: string }
  | { type: "reward"; source: string };

export type AppNavigationState = {
  destination: MainDestination;
  history: MainDestination[];
  overlay: AppOverlay | null;
};

export const initialAppNavigationState: AppNavigationState = {
  destination: "world",
  history: [],
  overlay: null
};

export function navigateTo(state: AppNavigationState, destination: MainDestination): AppNavigationState {
  if (state.destination === destination) {
    return state.overlay ? { ...state, overlay: null } : state;
  }
  return {
    destination,
    history: [...state.history, state.destination],
    overlay: null
  };
}

export function openOverlay(state: AppNavigationState, overlay: AppOverlay): AppNavigationState {
  return { ...state, overlay };
}

export function closeOverlay(state: AppNavigationState): AppNavigationState {
  return state.overlay ? { ...state, overlay: null } : state;
}

export function goBack(state: AppNavigationState): AppNavigationState {
  if (state.overlay) return closeOverlay(state);
  const destination = state.history[state.history.length - 1];
  if (!destination) return state;
  return {
    destination,
    history: state.history.slice(0, -1),
    overlay: null
  };
}
