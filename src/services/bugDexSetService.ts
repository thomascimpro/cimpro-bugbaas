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
    extraBugIds: ["leliehaantje", "broodkever", "gewone-houtwormkever", "muskusboktor", "viervleklieveheersbeestje", "gewone-doodgraver", "gewone-kortschildkever", "bruine-meelkever", "groene-snuitkever", "gewone-wespenboktor", "schaakbordlieveheersbeestje", "gewone-meikever", "bosmestkever", "citroenlieveheersbeestje", "zijdeglansbladsnuitkever", "zwartpootsoldaatje", "geel-soldaatje", "roodaarskniptor", "bastaardzandloopkever", "fraaie-schijnbok", "groen-zuringhaantje", "rode-smalbok", "meeldauwlieveheersbeestje", "rozemarijngoudhaantje", "zwartkopvuurkever", "vierbandsmalbok", "gegroefde-lapsnuitkever", "muisgrijze-kniptor", "grijze-bolsnuittor", "oedemera-lurida", "zestienstippelig-lieveheersbeestje", "roestbruine-bladsprietkever", "lissnuitkever", "gewone-distelboktor", "grote-populierenhaan", "roomvleklieveheersbeestje", "slakkenaaskever", "ruigkever"]
  }),
  badgeSet({
    id: "wings_of_color",
    badgeId: "bugdex-set-wings-of-color",
    labelKey: "bugdex.set.wings_of_color",
    descriptionKey: "bugdex.set.wings_of_color.description",
    badgeBugIds: ["mot", "doodshoofdvlinder", "kolibrievlinder", "koninginnenpage", "atalanta", "dagpauwoog", "eikenprocessierups", "pijlstaartrups", "gespikkelde-houtvlinder", "glasvleugelvlinder", "komeetmot", "maanmot", "atlasvlinder", "rouwmantelvlinder", "keizersmantel", "koningin-alexandravlinder", "zonsondergangsmot", "roze-esdoornmot", "kleermot", "voorraadmot", "witte-tijger"],
    extraBugIds: ["wapendrager", "hulstvlieg", "grote-beer", "zuringuil", "stro-uiltje", "gewone-spikkelspanner", "groene-eikenbladroller", "kroosvlindertje", "vlekstipspanner", "klein-koolwitje", "klein-geaderd-witje", "citroenvlinder", "bont-zandoogje", "icarusblauwtje", "kleine-vos", "landkaartje", "boomblauwtje", "buxusmot", "buxusrups", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "jakobsvlinder", "jakobsvlinderrups", "distelvlinder", "groot-koolwitje", "hooibeestje", "koevinkje", "argusvlinder", "spaanse-vlag", "eikenpage", "oranje-zandoogje", "kleine-wintervlinder", "grote-wintervlinder", "blauwooggrasmot", "plakker", "grijze-stipspanner", "paardenbloemspanner", "gewone-grasmot", "gestreepte-goudspanner", "schaduwspikkelspanner", "kleine-beer", "brandnetelbladroller", "muntvlindertje", "zwarte-c-uil", "zwartkamdwergspanner", "vogelkersstippelmot", "geelbandlangsprietmot", "veelvraat", "meriansborstel", "bruin-blauwtje", "gewone-stofuil", "volgeling", "bruine-huismot", "sint-jansvlinder", "zandhalmuiltje", "oranje-wortelboorder", "kardinaalsmutsstippelmot", "haarbos", "scheefbloemwitje", "hagedoornvlinder", "bastaardsatijnvlinder", "witvlakvlinder", "kleine-parelmoervlinder", "gewone-bandspanner", "hommelnestmot", "appeltak", "rietvink", "brandnetelmot", "gewone-zakdrager", "gewone-grasuil", "gewone-worteluil", "schaduwstipspanner", "strooiselmot", "gerande-spanner", "vierkantvlekuil", "puta-uil", "bruine-snuituil", "bonte-brandnetelmot", "zwart-weeskind", "zwartbandspanner", "groente-uil", "graswortelvlinder", "wilgenhoutrups", "zuidelijke-stofuil", "smaragdlangsprietmot", "tweestreepvoorjaarsuil", "heivlinder", "piramidevlinder", "gevlamde-bladroller", "lieveling", "bruine-grijsbandspanner", "tuinbladroller"]
  }),
  badgeSet({
    id: "buzz_squad",
    badgeId: "bugdex-set-buzz-squad",
    labelKey: "bugdex.set.buzz_squad",
    descriptionKey: "bugdex.set.buzz_squad.description",
    badgeBugIds: ["fruitvlieg", "mug", "motmug", "langpootmug", "gaasvlieg", "dobsonvlieg", "lantaarnvlieg", "tijgermug", "roofvlieg", "kameelhalsvlieg", "zweefvlieg", "lantaarndrager", "bromvlieg", "huisvlieg", "whitefly"],
    extraBugIds: ["puntbijvlieg", "gewone-tweevleugel", "gewone-prachtwapenvlieg", "menuetzweefvlieg", "varenrouwmug", "trips", "daas", "stadsreus", "bijvlieg", "gewone-daas", "doodskopzweefvlieg", "strontvlieg", "duitse-schorpioenvlieg", "grote-dansvlieg", "terrasjeskommazweefvlieg", "grote-langlijf", "kleine-bijvlieg", "citroenpendelvlieg", "weideschorpioenvlieg", "bosbijvlieg", "maartse-vlieg", "hommelbijvlieg", "grote-narcisvlieg", "lentelangpoot", "woeste-sluipvlieg", "gewone-schorpioenvlieg", "gewone-wolzwever", "gewone-snipvlieg", "kool-langpootmug", "gewone-roofvlieg", "gewone-bladjager", "gewone-driehoekzweefvlieg", "roestbruine-kromlijf", "slanke-driehoekzweefvlieg", "gewone-rode-bladloper", "witgepunte-clogmia", "schorsvlieg", "koortsvlieg", "bosrandroofvlieg", "gele-snipvlieg"]
  }),
  badgeSet({
    id: "sting_team",
    badgeId: "bugdex-set-sting-team",
    labelKey: "bugdex.set.sting_team",
    descriptionKey: "bugdex.set.sting_team.description",
    badgeBugIds: ["mier", "wesp", "hoornaar", "faraomier", "houtmier", "juweelwesp", "dolksteekwesp", "goudwesp", "sluipwesp", "fluweelmier", "blauwe-ertsbij", "hommel"],
    extraBugIds: ["geelpoothoornaar", "rosse-metselbij", "blauwzwarte-houtbij", "steenhommel", "aardhommel", "akkerhommel", "boomhommel", "heidehommel", "tuinhommel", "weidehommel", "veldhommel", "asbij", "grijze-zandbij", "gewone-zijdebij", "gewone-maskerbij", "glanzende-houtmier", "franse-veldwesp", "middelste-wesp", "bijenwolf", "aziatische-hoornaar", "kleine-aardhommel"]
  }),
  badgeSet({
    id: "pattern_warnings",
    badgeId: "bugdex-set-pattern-warnings",
    labelKey: "bugdex.set.pattern_warnings",
    descriptionKey: "bugdex.set.pattern_warnings.description",
    badgeBugIds: ["stinkwants", "roofwants", "schildwants", "cicade", "schuimcicade", "harlekijnwants", "vuurwants", "bladpootwants", "assassin-bug", "picasso-wants", "reuzenwaterwants", "dwergcicade"],
    extraBugIds: ["smalle-randwants", "brandnetelprachtwants", "mediterrane-prachtblindwants", "berkensmalsnuit", "gewone-rookwants", "bedwants", "schildluis", "groene-appelwants", "grauwe-schildwants", "roodpootschildwants", "bladpootrandwants", "bessenschildwants", "klimopkevercicade", "bloedcicade", "groene-rietcicade", "rode-halsbandwants", "eupteryx-decemnotata", "voorjaarseikenblindwants", "miersikkelwants", "weideschaduwwants"]
  }),
  badgeSet({
    id: "web_and_sting",
    badgeId: "bugdex-set-web-and-sting",
    labelKey: "bugdex.set.web_and_sting",
    descriptionKey: "bugdex.set.web_and_sting.description",
    badgeBugIds: ["schorpioen", "duizendpoot", "vogelspin", "reuzen-duizendpoot", "wespspin", "kruisspin", "springspin", "pauwspin", "vioolspin", "zebra-springspin", "waterschorpioen", "zweepschorpioen", "schorpioenvlieg"],
    extraBugIds: ["spintmijt", "grote-huisspin", "trilspin", "miljoenpoot", "gewone-wolfspin", "venstersectorspin", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "grote-trilspin", "gewone-celspin", "schapenteek", "herfstspin", "herfsthangmatspin", "huiskogelspin", "gewone-krabspin", "rode-hooiwagen", "wespenspin", "gewone-hooiwagen", "platte-wielwebspin", "gewone-huisspin", "strekpoot", "knikkergalwesp", "gewone-doolhofspin", "voorjaarshooiwagen", "zwartrugrenspin", "rietkruisspin"]
  }),
  badgeSet({
    id: "jump_and_hide",
    badgeId: "bugdex-set-jump-and-hide",
    labelKey: "bugdex.set.jump_and_hide",
    descriptionKey: "bugdex.set.jump_and_hide.description",
    badgeBugIds: ["sprinkhaan", "wandelende-tak", "bidsprinkhaan", "wandelend-blad", "orchidee-bidsprinkhaan", "sabelsprinkhaan", "spookinsect", "doornbloembidsprinkhaan", "mierenleeuw"],
    extraBugIds: ["springstaart", "weidesprinkhaan", "blauwvleugelsprinkhaan", "knopsprietje"]
  }),
  badgeSet({
    id: "water_hunters",
    badgeId: "bugdex-set-water-hunters",
    labelKey: "bugdex.set.water_hunters",
    descriptionKey: "bugdex.set.water_hunters.description",
    badgeBugIds: ["waterkever", "schrijvertje", "schaatsenrijder", "waterschorpioen", "libel", "waterjuffer", "smaragdlibel", "helikopterjuffer", "azuren-waterjuffer", "reuzenwaterwants"],
    extraBugIds: ["bruine-korenbout", "vroege-glazenmaker", "weidebeekjuffer", "geelgerande-waterroofkever", "watersnuffel", "blauwe-breedscheenjuffer", "bruine-winterjuffer", "tengere-pantserjuffer"]
  }),
  badgeSet({
    id: "house_raiders",
    badgeId: "bugdex-set-house-raiders",
    labelKey: "bugdex.set.house_raiders",
    descriptionKey: "bugdex.set.house_raiders.description",
    badgeBugIds: ["zilvervisje", "bladluis", "mug", "mot", "mier", "vlo", "pissebed", "kakkerlak", "oorworm", "termiet", "boekluis", "stofluis", "teek", "fluweelmijt", "tapijtkever", "reuzenkakkerlak", "bromvlieg", "huisvlieg", "kleermot", "voorraadmot", "whitefly"],
    extraBugIds: ["papiervisje", "ovenvisje", "bedwants", "varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "grote-huisspin", "trilspin", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "venstersectorspin", "broodkever", "gewone-houtwormkever", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "gewone-oorworm", "duitse-kakkerlak", "huiskrekel", "oosterse-kakkerlak", "koolmotje"]
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
    extraBugIds: ["papiervisje", "ovenvisje", "bedwants", "grote-huisspin", "trilspin", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "gewone-wolfspin", "venstersectorspin", "grote-wegslak", "segrijnslak", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "brugspin"]
  }),
  {
    id: "dutch_home",
    labelKey: "bugdex.set.dutch_home",
    descriptionKey: "bugdex.set.dutch_home.description",
    bugIds: ["papiervisje", "ovenvisje", "bedwants", "varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "grote-huisspin", "trilspin", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "venstersectorspin", "broodkever", "gewone-houtwormkever", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "gewone-huisvlieg", "gewone-steekmug", "gewone-tapijtkever", "groene-perzikluis", "rozenluis", "zwarte-bonenluis", "aziatisch-lieveheersbeestje", "duitse-wesp", "gewone-wesp", "europese-hoornaar", "groene-stinkwants", "gewone-langpootmug"]
  },
  {
    id: "dutch_garden",
    labelKey: "bugdex.set.dutch_garden",
    descriptionKey: "bugdex.set.dutch_garden.description",
    bugIds: ["varenrouwmug", "trips", "spintmijt", "wolluis", "schildluis", "klein-koolwitje", "klein-geaderd-witje", "citroenvlinder", "bont-zandoogje", "icarusblauwtje", "kleine-vos", "landkaartje", "boomblauwtje", "springstaart", "miljoenpoot", "kelderpissebed", "oprolpissebed", "buxusmot", "buxusrups", "leliehaantje", "engerling", "emelt", "gamma-uil", "huismoeder", "agaatvlinder", "windevedermot", "jakobsvlinder", "jakobsvlinderrups", "distelvlinder", "groot-koolwitje", "hooibeestje", "koevinkje", "geelpoothoornaar", "daas", "stadsreus", "bijvlieg", "rosse-metselbij", "blauwzwarte-houtbij", "gewone-wolfspin", "venstersectorspin", "grote-wegslak", "segrijnslak", "regenworm", "argusvlinder", "gewone-kogelspin", "kruipende-kogelspin", "nachtkaardespin", "spaanse-vlag", "weidebeekjuffer", "steenhommel", "aardhommel", "akkerhommel", "boomhommel", "heidehommel", "tuinhommel", "weidehommel", "veldhommel", "muskusboktor", "eikenpage", "grote-beervlinder", "zandkrekel", "boskrekel", "sikkelsprinkhaan", "krasser", "roofvlieg-groot", "dambordzweefvlieg", "klein-avondrood", "watermijt", "zwarte-waterschorpioen", "bergveldwesp", "sierlijke-sprinkhaan", "aziatisch-lieveheersbeestje", "duitse-wesp", "europese-hoornaar", "gehoornde-metselbij", "gele-weidemier", "gewone-bromvlieg", "gewone-sachembij", "gewone-zweefvlieg", "groene-stinkwants", "grote-bladsnijderbij", "grote-wolbij", "rode-steekmier", "rode-weekschildkever", "tuinbladsnijderbij", "tuinkever", "tweestippelig-lieveheersbeestje", "vosje", "weidebij", "zevenstippelig-lieveheersbeestje", "zwartsprietdikkopje", "groot-dikkopje", "houtpantserjuffer", "bruine-sprinkhaan", "roodpootschildwants", "blauwooggrasmot", "plakker", "bosmestkever", "citroenlieveheersbeestje", "grijze-stipspanner", "paardenbloemspanner", "bladpootrandwants", "bessenschildwants", "gewone-grasmot", "blauwe-breedscheenjuffer", "zijdeglansbladsnuitkever", "zwartpootsoldaatje", "geel-soldaatje", "gestreepte-goudspanner", "zuidelijke-boomsprinkhaan"]
  }
];

function addBugIdsToSet(setId: string, ids: string[]): void {
  const set = bugDexSets.find((candidate) => candidate.id === setId);
  if (!set) return;
  for (const id of ids) {
    if (!set.bugIds.includes(id)) set.bugIds.push(id);
  }
}

addBugIdsToSet("wings_of_color", ["variabele-granietmot"]);
addBugIdsToSet("beetle_brigade", ["voorjaarsmestkever", "gewone-bloesemboktor"]);
addBugIdsToSet("pattern_warnings", ["gewone-bloemwants"]);
addBugIdsToSet("buzz_squad", ["drieband-zwartpalp"]);
addBugIdsToSet("beetle_brigade", ["geringelde-smalboktor"]);
addBugIdsToSet("wings_of_color", ["hyena", "variabele-grasmot"]);
addBugIdsToSet("jump_and_hide", ["zuidelijk-spitskopje"]);
addBugIdsToSet("pattern_warnings", ["gestreepte-eikenblindwants"]);
addBugIdsToSet("buzz_squad", ["gewone-goudoogdaas"]);
addBugIdsToSet("wings_of_color", ["hageheld"]);
addBugIdsToSet("wings_of_color", ["lindepijlstaart"]);
addBugIdsToSet("sting_team", ["rozenmosgalwesp", "grauwzwarte-renmier"]);
addBugIdsToSet("pattern_warnings", ["geblokte-glasvleugelwants"]);
addBugIdsToSet("beetle_brigade", ["blauw-muntgoudhaantje", "gestreepte-bladsnuitkever", "gouden-wilgenaardvlo"]);
addBugIdsToSet("wings_of_color", ["pinokkiomot"]);
addBugIdsToSet("sting_team", ["knollenbladwesp"]);
addBugIdsToSet("wings_of_color", ["glad-beertje"]);
addBugIdsToSet("beetle_brigade", ["kortvleugelboorkever"]);
addBugIdsToSet("pattern_warnings", ["rododendroncicade"]);
addBugIdsToSet("web_and_sting", ["gewone-strekspin", "gestipte-struikspin"]);
addBugIdsToSet("wings_of_color", ["weegbreemot"]);
addBugIdsToSet("buzz_squad", ["tijgerlangpootmug"]);
addBugIdsToSet("pattern_warnings", ["gewone-kielwants"]);
addBugIdsToSet("web_and_sting", ["getijgerde-lijmspuiter"]);
addBugIdsToSet("beetle_brigade", ["nalassus-laevioctostriatus", "tienstippelig-lieveheersbeestje"]);
addBugIdsToSet("wings_of_color", ["klimopbladroller"]);
addBugIdsToSet("beetle_brigade", ["rond-griendhaantje"]);
addBugIdsToSet("web_and_sting", ["groen-kaardertje"]);
addBugIdsToSet("buzz_squad", ["ivoorzweefvlieg"]);
addBugIdsToSet("beetle_brigade", ["penseelkever"]);
addBugIdsToSet("buzz_squad", ["veranderlijke-bijvlieg"]);
addBugIdsToSet("wings_of_color", ["roesje"]);
addBugIdsToSet("pattern_warnings", ["streepdijblindwants"]);
addBugIdsToSet("wings_of_color", ["gewone-breedvleugeluil", "aangebrande-spanner"]);
addBugIdsToSet("buzz_squad", ["glassnijder"]);
addBugIdsToSet("sting_team", ["grote-koekoekshommel"]);
addBugIdsToSet("sting_team", ["aardappelgalwesp", "ananasgalwesp"]);
addBugIdsToSet("pattern_warnings", ["aardappelprachtblindwants", "aphrophora-alni", "aphrophora-salicina"]);
addBugIdsToSet("buzz_squad", ["akkerdisteldansvlieg", "anthomyia-procellaris"]);
addBugIdsToSet("wings_of_color", ["anjerbladroller"]);
addBugIdsToSet("buzz_squad", ["beekoeverlibel", "bessenbandzweefvlieg", "beukengalmug"]);
addBugIdsToSet("pattern_warnings", ["berkenkielwants"]);
addBugIdsToSet("wings_of_color", ["bladplakker", "bleke-grasmot", "bleke-grasuil"]);
addBugIdsToSet("web_and_sting", ["bleke-renspin"]);
addBugIdsToSet("sting_team", ["bloedrode-roofmier", "boommier"]);
addBugIdsToSet("pattern_warnings", ["bonte-geelschild", "boomsikkelwants"]);
addBugIdsToSet("web_and_sting", ["bonte-hooiwagen", "bonte-springspin", "boomknobbelspin"]);
addBugIdsToSet("buzz_squad", ["bosbandzweefvlieg"]);
addBugIdsToSet("wings_of_color", ["bosbesuil", "breedbandhuismoeder", "bruine-daguil"]);
addBugIdsToSet("web_and_sting", ["boskrabspin", "brede-wielwebspin", "broeikasspin"]);
addBugIdsToSet("jump_and_hide", ["bramensprinkhaan"]);
addBugIdsToSet("beetle_brigade", ["bronzen-glimmer"]);
addBugIdsToSet("beetle_brigade", ["cantharis-decipiens"]);
addBugIdsToSet("buzz_squad", ["coenosia-tigrina"]);
addBugIdsToSet("web_and_sting", ["denneboom-hooiwagen"]);
addBugIdsToSet("wings_of_color", ["dennenpijlstaart", "donker-klaverblaadje", "donkere-marmeruil", "donsvlinder"]);
addBugIdsToSet("pattern_warnings", ["dovenetelwants"]);
addBugIdsToSet("web_and_sting", ["draadhooiwagen", "driestreepspin", "eikenspringspin"]);
addBugIdsToSet("pattern_warnings", ["dwarsbandkakkerlak"]);
addBugIdsToSet("wings_of_color", ["dwergstipspanner", "eikenlichtmot"]);
addBugIdsToSet("beetle_brigade", ["eikelboorder"]);
addBugIdsToSet("sting_team", ["eikenstuitergalwesp"]);
addBugIdsToSet("beetle_brigade", ["elfstippelig-lieveheersbeestje"]);
addBugIdsToSet("web_and_sting", ["elzennerfhoekmijt", "eratigena-duellica", "esdoornknobbelmijt"]);
addBugIdsToSet("buzz_squad", ["enkele-bandzweefvlieg", "eriothrix-rufomaculata"]);
addBugIdsToSet("wings_of_color", ["esperiamot"]);
addBugIdsToSet("pattern_warnings", ["eupteryx-tenella"]);
addBugIdsToSet("sting_team", ["galappelwesp"]);
addBugIdsToSet("web_and_sting", ["gehaakte-blinker"]);
addBugIdsToSet("wings_of_color", ["gele-eenstaart", "gele-tijger", "geoogde-worteluil", "gestippelde-oogspanner"]);
addBugIdsToSet("pattern_warnings", ["gele-viervlekwants", "geribde-prachtblindwants"]);
addBugIdsToSet("wings_of_color", ["gevlekt-rennertje", "gewone-heispanner"]);
addBugIdsToSet("buzz_squad", ["gevlekte-witsnuitlibel", "gewone-pissebedvlieg"]);
addBugIdsToSet("web_and_sting", ["gewone-komkommerspin", "gewone-mijnspin"]);
addBugIdsToSet("sting_team", ["gewone-lensgalwesp"]);
addBugIdsToSet("pattern_warnings", ["gewone-pantserwants"]);
addBugIdsToSet("buzz_squad", ["gewone-regendaas", "gewone-schubsnipvlieg", "gewone-snuitvlieg"]);
addBugIdsToSet("web_and_sting", ["gewone-renspin", "gewone-staartspin", "gewone-tandkaak"]);
addBugIdsToSet("beetle_brigade", ["gewone-rietkever"]);
addBugIdsToSet("wings_of_color", ["gewone-spiegelmot"]);
addBugIdsToSet("wings_of_color", ["gewone-velduil", "gewone-witvlakbladroller", "goudoogje"]);
addBugIdsToSet("buzz_squad", ["gewone-viltvlieg", "graphomya-maculata"]);
addBugIdsToSet("sting_team", ["gewone-vliegendoder"]);
addBugIdsToSet("web_and_sting", ["gewone-zandwolfspin", "grijze-huisspin"]);
addBugIdsToSet("buzz_squad", ["grijze-runderdaas", "grote-kommazweefvlieg", "grote-steekmug"]);
addBugIdsToSet("sting_team", ["groefbijendoder", "grote-rupsendoder"]);
addBugIdsToSet("beetle_brigade", ["groene-distelschildpadtor"]);
addBugIdsToSet("wings_of_color", ["groene-dwergspanner", "grote-appelbladroller"]);
addBugIdsToSet("web_and_sting", ["harige-springspin", "holenwielwebspin", "huissteatoda"]);
addBugIdsToSet("wings_of_color", ["hazelaaruil", "houtspaander"]);
addBugIdsToSet("beetle_brigade", ["heidelieveheersbeestje", "hennepnetelgoudhaantje"]);
addBugIdsToSet("pattern_warnings", ["iepenknobbelmijt"]);
addBugIdsToSet("wings_of_color", ["indische-meelmot"]);
addBugIdsToSet("beetle_brigade", ["ingekeepte-smalboktor", "julikever"]);
addBugIdsToSet("pattern_warnings", ["kaneelglasvleugelwants"]);
addBugIdsToSet("web_and_sting", ["kaskaardespin", "kasspringspin", "kegelspin"]);
addBugIdsToSet("buzz_squad", ["kegelbijvlieg"]);
addBugIdsToSet("wings_of_color", ["kempense-heidelibel", "klaverspanner"]);
addBugIdsToSet("web_and_sting", ["kerkzesoog", "kleine-boskogelspin", "kleine-broeikasspin", "kleine-dikkaak"]);
addBugIdsToSet("buzz_squad", ["kervelgitje"]);
addBugIdsToSet("beetle_brigade", ["klein-vliegend-hert"]);
addBugIdsToSet("web_and_sting", ["kleine-heidehangmatspin", "koffieboonspin"]);
addBugIdsToSet("buzz_squad", ["kleine-rouwvlieg", "koraaljuffer"]);
addBugIdsToSet("pattern_warnings", ["kleine-voorjaarsuil"]);
addBugIdsToSet("wings_of_color", ["kleine-zomervlinder", "koolbladroller", "koperuil"]);
addBugIdsToSet("wings_of_color", ["sint-jacobsvlinder", "zilverstreepgrasmot", "populierenpijlstaart"]);
addBugIdsToSet("buzz_squad", ["pendelzweefvlieg", "variabel-elfje"]);
addBugIdsToSet("pattern_warnings", ["zuringrandwants", "rotsheidenetwants"]);
addBugIdsToSet("beetle_brigade", ["roodvlekweekkever"]);
addBugIdsToSet("buzz_squad", ["muurrouwzwever", "viervlekglansmug"]);
addBugIdsToSet("wings_of_color", ["parelmoermot", "paardenkastanjemineermot", "leverkleurige-bladroller"]);
addBugIdsToSet("jump_and_hide", ["moerassprinkhaan"]);
addBugIdsToSet("pattern_warnings", ["meidoornkielwants"]);
addBugIdsToSet("beetle_brigade", ["vloeivleklieveheersbeestje"]);
addBugIdsToSet("wings_of_color", ["zwervende-pantserjuffer", "oranje-kruidenmot", "vaal-kokerbeertje", "meidoornstippelmot"]);
addBugIdsToSet("buzz_squad", ["zigzagtijger", "witte-halvemaanzwever"]);
addBugIdsToSet("jump_and_hide", ["kustsprinkhaan"]);
addBugIdsToSet("beetle_brigade", ["zomersmaragd"]);
addBugIdsToSet("beetle_brigade", ["reebruine-bladsnuitkever"]);
addBugIdsToSet("wings_of_color", ["ringelrups", "witte-grijsbandspanner", "zuringspanner", "rood-weeskind"]);
addBugIdsToSet("web_and_sting", ["tuinwolfspin"]);
addBugIdsToSet("buzz_squad", ["zesvlekkige-groefbij", "wollig-gitje"]);
addBugIdsToSet("wings_of_color", ["waterleliemot", "nunvlinder", "sneeuwwitte-vedermot", "schedeldrager"]);
addBugIdsToSet("beetle_brigade", ["zwart-soldaatje", "mimela-junii"]);
addBugIdsToSet("buzz_squad", ["roodbaardroofvlieg", "zandroofvlieg"]);
addBugIdsToSet("wings_of_color", ["loofboombladroller", "streepkokerbeertje", "zilveren-groenuil", "variabele-vierbandspanner", "paardenbloembladroller", "rode-knopbladroller"]);
addBugIdsToSet("buzz_squad", ["plaatjesgalwesp"]);
addBugIdsToSet("beetle_brigade", ["viervlekbrandnetelsnuitkever"]);
addBugIdsToSet("buzz_squad", ["oranje-maanmug", "variabele-dwergschaduwwants", "weidevlekoog"]);
addBugIdsToSet("wings_of_color", ["slakrups", "peper-en-zoutvlinder", "v-dwergspanner"]);
addBugIdsToSet("web_and_sting", ["muurzesoog"]);
addBugIdsToSet("beetle_brigade", ["tweekleurige-smalboktor"]);
addBugIdsToSet("buzz_squad", ["micaplatvoetje", "ruittijger", "phaonia-signata"]);
addBugIdsToSet("wings_of_color", ["witkopmot", "ringspikkelspanner", "stompvleugelgrasuil"]);
addBugIdsToSet("web_and_sting", ["slanke-kogelspin"]);
addBugIdsToSet("beetle_brigade", ["langspriet-langsprietje"]);
addBugIdsToSet("wings_of_color", ["vroege-granietmot", "muisbeertje", "zwartvlekgrasmot", "schijn-vierbandspanner", "noordse-witsnuitlibel", "maanschietmot"]);
addBugIdsToSet("buzz_squad", ["phasia-aurigera"]);
addBugIdsToSet("beetle_brigade", ["zwarte-speerkniptor"]);
addBugIdsToSet("wings_of_color", ["schildstipspanner", "voorjaarskortvleugelmot", "zwarte-heidelibel"]);
addBugIdsToSet("beetle_brigade", ["wormkruidhaantje"]);
addBugIdsToSet("pattern_warnings", ["zuidelijke-groene-schildwants"]);

export function bugDexSetById(id: string): BugDexSet | null {
  return bugDexSets.find((set) => set.id === id) ?? null;
}

export function bugDexSetBadgeBugIds(set: BugDexSet): string[] {
  return set.badgeBugIds ?? set.bugIds;
}
