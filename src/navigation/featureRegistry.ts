import type { BugArtId } from "../services/bugArt";

export type BaasMenuFeature =
  | "bugs"
  | "collection"
  | "arcade"
  | "missions"
  | "buddy"
  | "events"
  | "profile"
  | "settings";

export type BaasMenuFeatureDefinition = {
  id: BaasMenuFeature;
  labelKey: string;
  bugId: BugArtId;
  badgeSource?: "duel" | "trade" | "events" | "missions";
};

export const baasMenuFeatures: readonly BaasMenuFeatureDefinition[] = [
  { id: "bugs", labelKey: "menu.bugs", bugId: "houtmier" },
  { id: "collection", labelKey: "menu.collection", bugId: "lieveheersbeestje", badgeSource: "trade" },
  { id: "arcade", labelKey: "menu.arcade", bugId: "neushoornkever", badgeSource: "duel" },
  { id: "missions", labelKey: "menu.missions", bugId: "sprinkhaan", badgeSource: "missions" },
  { id: "buddy", labelKey: "menu.buddy", bugId: "zilvervisje" },
  { id: "events", labelKey: "menu.events", bugId: "goliathkever", badgeSource: "events" },
  { id: "profile", labelKey: "menu.profile", bugId: "pauwspin" },
  { id: "settings", labelKey: "menu.settings", bugId: "boekluis" }
];
