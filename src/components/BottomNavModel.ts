import type { MainDestination } from "../navigation/appNavigation";
import type { BugArtId } from "../services/bugArt";

export type BottomNavItem = {
  route: MainDestination;
  labelKey: string;
  bugId: BugArtId;
};

export const bottomNavItems: BottomNavItem[] = [
  { route: "world", labelKey: "nav.world", bugId: "zilvervisje" },
  { route: "scan", labelKey: "nav.scan", bugId: "springspin" },
  { route: "play", labelKey: "nav.play", bugId: "neushoornkever" },
  { route: "collection", labelKey: "nav.collection", bugId: "lieveheersbeestje" }
];
