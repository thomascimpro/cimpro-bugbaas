export type BugDexSet = {
  badgeId?: string;
  badgeBugIds?: string[];
  descriptionKey: string;
  id: string;
  labelKey: string;
  bugIds: string[];
};

type BadgeBugDexSet = Omit<BugDexSet, "badgeBugIds" | "bugIds"> & {
  badgeId: string;
  badgeBugIds: string[];
  extraBugIds?: string[];
};

function badgeSet({ extraBugIds = [], ...set }: BadgeBugDexSet): BugDexSet {
  return {
    ...set,
    bugIds: [...set.badgeBugIds, ...extraBugIds]
  };
}

export const allBugDexSetId = "all";

export const bugDexSets: BugDexSet[] = [
  badgeSet({
    id: "beetle_brigade",
    badgeId: "bugdex-set-beetle-brigade",
    labelKey: "bugdex.set.beetle_brigade",
    descriptionKey: "bugdex.set.beetle_brigade.description",
    badgeBugIds: ["snuitkever", "boktor", "tapijtkever", "mestkever", "neushoornkever", "atlaskever", "herculeskever", "goliathkever", "kniptor", "loopkever", "waterkever", "goudtor", "tijgerkever", "doodgraver", "vliegend-hert", "juweelkever", "goudschildkever", "rozekever", "kardinaalkever", "gouden-tor", "soldaatje", "doodgraverkever", "olifantskever", "regenboogmestkever", "titanus-kever", "langsprietboktor", "schildpadkever", "vuurkever", "wespboktor", "groene-zandloopkever", "giraffekevertje", "glorieuze-scarabee", "groene-junikever", "meikever", "lieveheersbeestje"],
    extraBugIds: ["leliehaantje", "broodkever", "gewone-houtwormkever", "muskusboktor"]
  }),
  badgeSet({
    id: "wings_of_color",
    badgeId: "bugdex-set-wings-of-color",
    labelKey: "bugdex.set.wings_of_color",
    descriptionKey: "bugdex.set.wings_of_color.description",
    badgeBugIds: ["mot", "doodshoofdvlinder", "kolibrievlinder", "koninginnenpage", "atalanta", "dagpauwoog", "eikenprocessierups", "pijlstaartrups", "gespikkelde-houtvlinder", "glasvleugelvlinder", "komeetmot", "maanmot", "atlasvlinder", "rouwmantelvlinder", "keizersmantel", "koningin-alexandravlinder", "zonsondergangsmot", "roze-esdoornmot", "kleermot", "voorraadmot", "witte-tijger"],
    extraBugIds: ["klein-koolwitje", "klein-geaderd-witje", "citroenvlinder", "bont-zandoogje", "icarusblauwtje", "kleine-vos", "landkaartje", "boomblauwtje", "buxusmot", "buxusrups", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "jakobsvlinder", "jakobsvlinderrups", "distelvlinder", "groot-koolwitje", "hooibeestje", "koevinkje", "argusvlinder", "spaanse-vlag", "eikenpage"]
  }),
  badgeSet({
    id: "buzz_squad",
    badgeId: "bugdex-set-buzz-squad",
    labelKey: "bugdex.set.buzz_squad",
    descriptionKey: "bugdex.set.buzz_squad.description",
    badgeBugIds: ["fruitvlieg", "mug", "motmug", "langpootmug", "gaasvlieg", "dobsonvlieg", "lantaarnvlieg", "tijgermug", "roofvlieg", "kameelhalsvlieg", "zweefvlieg", "lantaarndrager", "bromvlieg", "huisvlieg", "whitefly"],
    extraBugIds: ["varenrouwmug", "trips", "daas", "stadsreus", "bijvlieg"]
  }),
  badgeSet({
    id: "sting_team",
    badgeId: "bugdex-set-sting-team",
    labelKey: "bugdex.set.sting_team",
    descriptionKey: "bugdex.set.sting_team.description",
    badgeBugIds: ["mier", "wesp", "hoornaar", "faraomier", "houtmier", "juweelwesp", "dolksteekwesp", "goudwesp", "sluipwesp", "fluweelmier", "blauwe-ertsbij", "hommel"],
    extraBugIds: ["geelpoothoornaar", "rosse-metselbij", "blauwzwarte-houtbij", "steenhommel", "aardhommel", "akkerhommel", "boomhommel", "heidehommel", "tuinhommel", "weidehommel", "veldhommel"]
  }),
  badgeSet({
    id: "pattern_warnings",
    badgeId: "bugdex-set-pattern-warnings",
    labelKey: "bugdex.set.pattern_warnings",
    descriptionKey: "bugdex.set.pattern_warnings.description",
    badgeBugIds: ["stinkwants", "roofwants", "schildwants", "cicade", "schuimcicade", "harlekijnwants", "vuurwants", "bladpootwants", "assassin-bug", "picasso-wants", "reuzenwaterwants", "dwergcicade"],
    extraBugIds: ["bedwants", "schildluis"]
  }),
  badgeSet({
    id: "web_and_sting",
    badgeId: "bugdex-set-web-and-sting",
    labelKey: "bugdex.set.web_and_sting",
    descriptionKey: "bugdex.set.web_and_sting.description",
    badgeBugIds: ["schorpioen", "duizendpoot", "vogelspin", "reuzen-duizendpoot", "wespspin", "kruisspin", "springspin", "pauwspin", "vioolspin", "zebra-springspin", "waterschorpioen", "zweepschorpioen", "schorpioenvlieg"],
    extraBugIds: ["spintmijt", "grote-huisspin", "trilspin", "miljoenpoot", "gewone-wolfspin", "venstersectorspin", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin"]
  }),
  badgeSet({
    id: "jump_and_hide",
    badgeId: "bugdex-set-jump-and-hide",
    labelKey: "bugdex.set.jump_and_hide",
    descriptionKey: "bugdex.set.jump_and_hide.description",
    badgeBugIds: ["sprinkhaan", "wandelende-tak", "bidsprinkhaan", "wandelend-blad", "orchidee-bidsprinkhaan", "sabelsprinkhaan", "spookinsect", "doornbloembidsprinkhaan", "mierenleeuw"],
    extraBugIds: ["springstaart"]
  }),
  badgeSet({
    id: "water_hunters",
    badgeId: "bugdex-set-water-hunters",
    labelKey: "bugdex.set.water_hunters",
    descriptionKey: "bugdex.set.water_hunters.description",
    badgeBugIds: ["waterkever", "schrijvertje", "schaatsenrijder", "waterschorpioen", "libel", "waterjuffer", "smaragdlibel", "helikopterjuffer", "azuren-waterjuffer", "reuzenwaterwants"],
    extraBugIds: ["weidebeekjuffer"]
  }),
  badgeSet({
    id: "house_raiders",
    badgeId: "bugdex-set-house-raiders",
    labelKey: "bugdex.set.house_raiders",
    descriptionKey: "bugdex.set.house_raiders.description",
    badgeBugIds: ["zilvervisje", "bladluis", "mug", "mot", "mier", "vlo", "pissebed", "kakkerlak", "oorworm", "termiet", "boekluis", "stofluis", "teek", "fluweelmijt", "tapijtkever", "reuzenkakkerlak", "bromvlieg", "huisvlieg", "kleermot", "voorraadmot", "whitefly"],
    extraBugIds: ["papiervisje", "ovenvisje", "bedwants", "varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "grote-huisspin", "trilspin", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "venstersectorspin", "broodkever", "gewone-houtwormkever", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin"]
  }),
  badgeSet({
    id: "mythic_showcase",
    badgeId: "bugdex-set-mythic-showcase",
    labelKey: "bugdex.set.mythic_showcase",
    descriptionKey: "bugdex.set.mythic_showcase.description",
    badgeBugIds: ["koningin-alexandravlinder", "zonsondergangsmot", "picasso-wants", "roze-esdoornmot", "giraffekevertje", "doornbloembidsprinkhaan", "lantaarndrager", "glorieuze-scarabee"]
  }),
  badgeSet({
    id: "night_crew",
    badgeId: "bugdex-set-night-crew",
    labelKey: "bugdex.set.night_crew",
    descriptionKey: "bugdex.set.night_crew.description",
    badgeBugIds: ["mot", "kakkerlak", "oorworm", "schorpioen", "vogelspin", "reuzenkakkerlak", "doodshoofdvlinder", "vioolspin", "komeetmot", "maanmot", "rouwmantelvlinder", "zweepschorpioen", "kleermot", "voorraadmot"],
    extraBugIds: ["papiervisje", "ovenvisje", "bedwants", "grote-huisspin", "trilspin", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "gewone-wolfspin", "venstersectorspin", "grote-wegslak", "segrijnslak", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin"]
  }),
  {
    id: "dutch_home",
    labelKey: "bugdex.set.dutch_home",
    descriptionKey: "bugdex.set.dutch_home.description",
    bugIds: ["papiervisje", "ovenvisje", "bedwants", "varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "grote-huisspin", "trilspin", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "venstersectorspin", "broodkever", "gewone-houtwormkever", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin"]
  },
  {
    id: "dutch_garden",
    labelKey: "bugdex.set.dutch_garden",
    descriptionKey: "bugdex.set.dutch_garden.description",
    bugIds: ["varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "klein-koolwitje", "klein-geaderd-witje", "citroenvlinder", "bont-zandoogje", "icarusblauwtje", "kleine-vos", "landkaartje", "boomblauwtje", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "buxusmot", "buxusrups", "leliehaantje", "engerling", "emelt", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "jakobsvlinder", "jakobsvlinderrups", "distelvlinder", "groot-koolwitje", "hooibeestje", "koevinkje", "geelpoothoornaar", "daas", "stadsreus", "bijvlieg", "rosse-metselbij", "blauwzwarte-houtbij", "gewone-wolfspin", "venstersectorspin", "grote-wegslak", "segrijnslak", "regenworm", "argusvlinder", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "spaanse-vlag", "weidebeekjuffer", "steenhommel", "aardhommel", "akkerhommel", "boomhommel", "heidehommel", "tuinhommel", "weidehommel", "veldhommel", "muskusboktor", "eikenpage", "grote-beervlinder", "zandkrekel", "boskrekel", "sikkelsprinkhaan", "krasser", "roofvlieg-groot", "dambordzweefvlieg", "klein-avondrood", "watermijt", "zwarte-waterschorpioen", "bergveldwesp", "sierlijke-sprinkhaan"]
  }
];

export function bugDexSetById(id: string): BugDexSet | null {
  return bugDexSets.find((set) => set.id === id) ?? null;
}

export function bugDexSetBadgeBugIds(set: BugDexSet): string[] {
  return set.badgeBugIds ?? set.bugIds;
}
