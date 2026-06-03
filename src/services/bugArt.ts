import { ImageSourcePropType } from "react-native";

export const bugArt = {
  zilvervisje: require("../../assets/bugdex/zilvervisje.png"),
  fruitvlieg: require("../../assets/bugdex/fruitvlieg.png"),
  bladluis: require("../../assets/bugdex/bladluis.png"),
  mug: require("../../assets/bugdex/mug.png"),
  mot: require("../../assets/bugdex/mot.png"),
  mier: require("../../assets/bugdex/mier.png"),
  vlo: require("../../assets/bugdex/vlo.png"),
  pissebed: require("../../assets/bugdex/pissebed.png"),
  stinkwants: require("../../assets/bugdex/stinkwants.png"),
  snuitkever: require("../../assets/bugdex/snuitkever.png"),
  lieveheersbeestje: require("../../assets/bugdex/lieveheersbeestje.png"),
  kakkerlak: require("../../assets/bugdex/kakkerlak.png"),
  oorworm: require("../../assets/bugdex/oorworm.png"),
  boktor: require("../../assets/bugdex/boktor.png"),
  tapijtkever: require("../../assets/bugdex/tapijtkever.png"),
  roofwants: require("../../assets/bugdex/roofwants.png"),
  duizendpoot: require("../../assets/bugdex/duizendpoot.png"),
  sprinkhaan: require("../../assets/bugdex/sprinkhaan.png"),
  wesp: require("../../assets/bugdex/wesp.png"),
  hoornaar: require("../../assets/bugdex/hoornaar.png"),
  schorpioen: require("../../assets/bugdex/schorpioen.png"),
  termiet: require("../../assets/bugdex/termiet.png"),
  mestkever: require("../../assets/bugdex/mestkever.png"),
  "wandelende-tak": require("../../assets/bugdex/wandelende-tak.png"),
  vogelspin: require("../../assets/bugdex/vogelspin.png"),
  reuzenkakkerlak: require("../../assets/bugdex/reuzenkakkerlak.png"),
  "reuzen-duizendpoot": require("../../assets/bugdex/reuzen-duizendpoot.png"),
  neushoornkever: require("../../assets/bugdex/neushoornkever.png"),
  atlaskever: require("../../assets/bugdex/atlaskever.png"),
  herculeskever: require("../../assets/bugdex/herculeskever.png"),
  goliathkever: require("../../assets/bugdex/goliathkever.png")
} as const satisfies Record<string, ImageSourcePropType>;

export type BugArtId = keyof typeof bugArt;

export const allBugArtIds = Object.keys(bugArt) as BugArtId[];

export const tierBugArtIds: BugArtId[] = [
  "zilvervisje",
  "mier",
  "sprinkhaan",
  "lieveheersbeestje",
  "duizendpoot",
  "schorpioen",
  "neushoornkever",
  "goliathkever"
];

export function getBugArtSource(id: string | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return (bugArt as Record<string, ImageSourcePropType>)[id] ?? null;
}
