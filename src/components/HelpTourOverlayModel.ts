export type HelpTourRoute = "home" | "realBugScan" | "duel" | "bugdex" | "museum";
export type HelpTourDestination = "world" | "scan" | "play" | "collection";

export type HelpTourStep = {
  route: HelpTourRoute;
  destination: HelpTourDestination;
  titleKey: string;
  bodyKey: string;
  kickerKey: string;
  accent: string;
  bugIds: string[];
};

export const helpTourSteps: HelpTourStep[] = [
  {
    route: "home",
    destination: "world",
    titleKey: "tour.discover",
    bodyKey: "tour.discoverBody",
    kickerKey: "tour.discoverKicker",
    accent: "#7bcf94",
    bugIds: ["lieveheersbeestje", "sprinkhaan", "zilvervisje"]
  },
  {
    route: "realBugScan",
    destination: "scan",
    titleKey: "tour.scan",
    bodyKey: "tour.scanBody",
    kickerKey: "tour.scanKicker",
    accent: "#f0cc64",
    bugIds: ["waterkever", "goudtor", "kruisspin"]
  },
  {
    route: "duel",
    destination: "play",
    titleKey: "tour.train",
    bodyKey: "tour.trainBody",
    kickerKey: "tour.trainKicker",
    accent: "#f08c69",
    bugIds: ["neushoornkever", "schorpioen", "libel"]
  },
  {
    route: "bugdex",
    destination: "collection",
    titleKey: "tour.collect",
    bodyKey: "tour.collectBody",
    kickerKey: "tour.collectKicker",
    accent: "#8fb8ff",
    bugIds: ["maanmot", "pauwspin", "atlaskever"]
  },
  {
    route: "museum",
    destination: "collection",
    titleKey: "tour.museum",
    bodyKey: "tour.museumBody",
    kickerKey: "tour.museumKicker",
    accent: "#e8ca68",
    bugIds: ["goudtor", "azuren-waterjuffer", "duizendpoot"]
  }
];
