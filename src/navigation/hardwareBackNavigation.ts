export type HardwareBackRoute =
  | "home"
  | "bugs"
  | "new"
  | "detail"
  | "leaderboard"
  | "profile"
  | "userProfile"
  | "bugdex"
  | "museum"
  | "realBugScan"
  | "fieldJournal"
  | "teamHunt"
  | "swarmSiege"
  | "seasonFinale"
  | "settings"
  | "duel";

export function parentRouteForHardwareBack(
  route: HardwareBackRoute,
  fieldJournalBackRoute: HardwareBackRoute
): HardwareBackRoute | null {
  if (route === "home") return null;
  if (route === "settings") return "profile";
  if (route === "new" || route === "detail") return "bugs";
  if (route === "userProfile") return "leaderboard";
  if (route === "fieldJournal") return fieldJournalBackRoute;
  return "home";
}
