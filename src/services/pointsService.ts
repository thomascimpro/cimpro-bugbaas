import { BugSeverity, BugStatus, User } from "../types";

export type InsectVariant = "larva" | "beetle" | "grasshopper" | "dragonfly" | "ladybug" | "crawler";
export type TierPrestige = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type UserTier = {
  minPoints: number;
  title: string;
  description: string;
  prestige: TierPrestige;
  prestigeLevel: string;
  color: string;
  frameColor: string;
  frameAccent: string;
  frameBackground: string;
  rewardText: string;
  bugArtId: string;
  insect: InsectVariant;
  bugSize: number;
  evolutionLevel: number;
};

export type BugDexRarity = "Gewoon" | "Zeldzaam" | "Episch" | "Legendarisch" | "Mythisch";

export type BugDexEntry = {
  id: string;
  name: string;
  title: string;
  minPoints: number;
  minBugs: number;
  rarity: BugDexRarity;
  insect: InsectVariant;
  evolutionLevel: number;
  note: string;
};

export const userTiers: UserTier[] = [
  {
    minPoints: 0,
    title: "Zilvervisje Starter",
    description: "Glijdt stil door de eerste randgevallen.",
    prestige: "Bronze",
    prestigeLevel: "Bronze I",
    color: "#6f7f5f",
    frameColor: "#9b6a3c",
    frameAccent: "#d8a05f",
    frameBackground: "#fff5e7",
    rewardText: "Starter frame",
    bugArtId: "zilvervisje",
    insect: "larva",
    bugSize: 46,
    evolutionLevel: 1
  },
  {
    minPoints: 25,
    title: "Mierenmelder",
    description: "Draagt reproduceerstappen netjes naar het team.",
    prestige: "Bronze",
    prestigeLevel: "Bronze II",
    color: "#2f6b4f",
    frameColor: "#a86f38",
    frameAccent: "#e4b36f",
    frameBackground: "#fff1df",
    rewardText: "Bronze glow",
    bugArtId: "houtmier",
    insect: "beetle",
    bugSize: 56,
    evolutionLevel: 2
  },
  {
    minPoints: 75,
    title: "Sprinkhaan Speurder",
    description: "Springt snel naar reproduceerbare bugs.",
    prestige: "Silver",
    prestigeLevel: "Silver I",
    color: "#587c2d",
    frameColor: "#9aa8ad",
    frameAccent: "#edf4f5",
    frameBackground: "#f4f8f8",
    rewardText: "Silver border",
    bugArtId: "orchidee-bidsprinkhaan",
    insect: "grasshopper",
    bugSize: 66,
    evolutionLevel: 3
  },
  {
    minPoints: 150,
    title: "Lieveheers Fixer",
    description: "Maakt van losse meldingen nette fixes.",
    prestige: "Silver",
    prestigeLevel: "Silver II",
    color: "#b83227",
    frameColor: "#84989e",
    frameAccent: "#ffffff",
    frameBackground: "#eef6f7",
    rewardText: "Silver shine",
    bugArtId: "pauwspin",
    insect: "ladybug",
    bugSize: 76,
    evolutionLevel: 4
  },
  {
    minPoints: 300,
    title: "Duizendpoot Regisseur",
    description: "Houdt meerdere flows tegelijk scherp.",
    prestige: "Gold",
    prestigeLevel: "Gold",
    color: "#8a5a2b",
    frameColor: "#d7a928",
    frameAccent: "#fff0a8",
    frameBackground: "#fff8d9",
    rewardText: "Gold frame",
    bugArtId: "smaragdlibel",
    insect: "crawler",
    bugSize: 88,
    evolutionLevel: 5
  },
  {
    minPoints: 500,
    title: "Schorpioen Sentinel",
    description: "Steekt regressies voordat ze terugkomen.",
    prestige: "Platinum",
    prestigeLevel: "Platinum",
    color: "#6f4c38",
    frameColor: "#6e9aa7",
    frameAccent: "#dff9ff",
    frameBackground: "#eefbff",
    rewardText: "Platinum aura",
    bugArtId: "schorpioen",
    insect: "crawler",
    bugSize: 96,
    evolutionLevel: 5
  },
  {
    minPoints: 850,
    title: "Neushoorn Commander",
    description: "Duwt zware blokkades uit de release.",
    prestige: "Diamond",
    prestigeLevel: "Diamond",
    color: "#1d6f52",
    frameColor: "#4aa8ff",
    frameAccent: "#d9f4ff",
    frameBackground: "#edf8ff",
    rewardText: "Diamond frame",
    bugArtId: "olifantskever",
    insect: "beetle",
    bugSize: 104,
    evolutionLevel: 5
  },
  {
    minPoints: 1350,
    title: "Goliath BugBaas",
    description: "Legendarische eindbaas van de BugDex.",
    prestige: "Diamond",
    prestigeLevel: "Diamond Crown",
    color: "#d7bd57",
    frameColor: "#7d6bff",
    frameAccent: "#f5eeff",
    frameBackground: "#f6f1ff",
    rewardText: "Crown frame",
    bugArtId: "atlaskever",
    insect: "ladybug",
    bugSize: 112,
    evolutionLevel: 5
  }
];

export const bugDexEntries: BugDexEntry[] = [
  { id: "zilvervisje", name: "Zilvervisje", title: "Stille Starter", minPoints: 0, minBugs: 0, rarity: "Gewoon", insect: "larva", evolutionLevel: 1, note: "Glipt door kleine randgevallen." },
  { id: "fruitvlieg", name: "Fruitvlieg", title: "Snelle Spotter", minPoints: 5, minBugs: 1, rarity: "Gewoon", insect: "crawler", evolutionLevel: 1, note: "Vindt bugs voordat koffie koud is." },
  { id: "bladluis", name: "Bladluis", title: "Detailknager", minPoints: 10, minBugs: 1, rarity: "Gewoon", insect: "larva", evolutionLevel: 1, note: "Knaagt aan kleine UI-foutjes." },
  { id: "mug", name: "Mug", title: "Irritatie Detector", minPoints: 20, minBugs: 2, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 1, note: "Hoort precies waar het zoemt." },
  { id: "mot", name: "Mot", title: "Nachttester", minPoints: 30, minBugs: 2, rarity: "Gewoon", insect: "crawler", evolutionLevel: 2, note: "Komt af op schermlicht en regressies." },
  { id: "mier", name: "Mier", title: "Teamdrager", minPoints: 45, minBugs: 3, rarity: "Gewoon", insect: "beetle", evolutionLevel: 2, note: "Sleept reproduceerstappen netjes mee." },
  { id: "vlo", name: "Vlo", title: "Sprongtester", minPoints: 60, minBugs: 4, rarity: "Gewoon", insect: "grasshopper", evolutionLevel: 2, note: "Springt razendsnel tussen flows." },
  { id: "pissebed", name: "Pissebed", title: "Randgevalroller", minPoints: 75, minBugs: 5, rarity: "Gewoon", insect: "crawler", evolutionLevel: 2, note: "Rolt elk hoekje van de app af." },
  { id: "stinkwants", name: "Stinkwants", title: "Codegeur Vinder", minPoints: 95, minBugs: 6, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Ruikt rare states op afstand." },
  { id: "snuitkever", name: "Snuitkever", title: "Diepgraver", minPoints: 115, minBugs: 7, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Steekt zijn neus in verborgen bugs." },
  { id: "lieveheersbeestje", name: "Lieveheersbeestje", title: "Fixvriend", minPoints: 135, minBugs: 8, rarity: "Zeldzaam", insect: "ladybug", evolutionLevel: 3, note: "Maakt bugjacht bijna schattig." },
  { id: "kakkerlak", name: "Kakkerlak", title: "Survivor Bug", minPoints: 160, minBugs: 9, rarity: "Gewoon", insect: "crawler", evolutionLevel: 3, note: "Overleeft elke hotfix." },
  { id: "oorworm", name: "Oorworm", title: "Feedbackfluisteraar", minPoints: 185, minBugs: 10, rarity: "Gewoon", insect: "larva", evolutionLevel: 3, note: "Hoort wat gebruikers niet zeggen." },
  { id: "boktor", name: "Boktor", title: "Houtgreep Tester", minPoints: 215, minBugs: 12, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Bijt door taaie legacy schermen." },
  { id: "tapijtkever", name: "Tapijtkever", title: "Pixelpluizer", minPoints: 245, minBugs: 13, rarity: "Zeldzaam", insect: "ladybug", evolutionLevel: 4, note: "Ziet elke scheve spacing." },
  { id: "roofwants", name: "Roofwants", title: "Bugjager", minPoints: 275, minBugs: 14, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 4, note: "Jaagt actief op de lastigste cases." },
  { id: "duizendpoot", name: "Duizendpoot", title: "Multitask Master", minPoints: 310, minBugs: 16, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Test alles tegelijk, bijna." },
  { id: "sprinkhaan", name: "Sprinkhaan", title: "Flow Springer", minPoints: 350, minBugs: 18, rarity: "Zeldzaam", insect: "grasshopper", evolutionLevel: 4, note: "Springt door onboarding, lijst en detail." },
  { id: "wesp", name: "Wesp", title: "Scherpe Prikker", minPoints: 395, minBugs: 20, rarity: "Zeldzaam", insect: "dragonfly", evolutionLevel: 4, note: "Prikt precies in pijnpunten." },
  { id: "hoornaar", name: "Hoornaar", title: "Escalatiebaas", minPoints: 445, minBugs: 22, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Laat kritieke bugs niet ontsnappen." },
  { id: "schorpioen", name: "Schorpioen", title: "Regressiesteker", minPoints: 500, minBugs: 24, rarity: "Legendarisch", insect: "crawler", evolutionLevel: 5, note: "Steekt terug bij terugkerende bugs." },
  { id: "termiet", name: "Termiet", title: "Structuurvreter", minPoints: 560, minBugs: 26, rarity: "Gewoon", insect: "beetle", evolutionLevel: 5, note: "Vindt wat onder de vloer zit." },
  { id: "mestkever", name: "Mestkever", title: "Cleanup Kampioen", minPoints: 625, minBugs: 28, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 5, note: "Ruimt oude rommelbugs op." },
  { id: "wandelende-tak", name: "Wandelende tak", title: "Camouflage Case", minPoints: 695, minBugs: 30, rarity: "Zeldzaam", insect: "grasshopper", evolutionLevel: 5, note: "Vindt bugs die zich verstoppen." },
  { id: "vogelspin", name: "Vogelspin", title: "Sprintbaas", minPoints: 770, minBugs: 33, rarity: "Episch", insect: "crawler", evolutionLevel: 5, note: "Groot, duidelijk, niet te negeren." },
  { id: "reuzenkakkerlak", name: "Reuzenkakkerlak", title: "Incident Survivor", minPoints: 850, minBugs: 36, rarity: "Episch", insect: "ladybug", evolutionLevel: 5, note: "Heeft productiepaniek gezien." },
  { id: "reuzen-duizendpoot", name: "Reuzenduizendpoot", title: "Flow Monster", minPoints: 935, minBugs: 39, rarity: "Legendarisch", insect: "crawler", evolutionLevel: 5, note: "Heeft voor elke tab een poot." },
  { id: "neushoornkever", name: "Neushoornkever", title: "Heavy Hitter", minPoints: 1025, minBugs: 42, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Duwt blokkades uit de weg." },
  { id: "atlaskever", name: "Atlaskever", title: "Werelddrager", minPoints: 1120, minBugs: 45, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Draagt de hele backlog." },
  { id: "herculeskever", name: "Herculeskever", title: "Krachtpatser", minPoints: 1225, minBugs: 48, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Tilt zelfs kritieke releases." },
  { id: "goliathkever", name: "Goliathkever", title: "BugDex Legende", minPoints: 1350, minBugs: 50, rarity: "Legendarisch", insect: "ladybug", evolutionLevel: 5, note: "Alleen de fanatiekste jagers komen hier." },
  { id: "motmug", name: "Motmug", title: "Fuzzy Finder", minPoints: 8, minBugs: 1, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 1, note: "Klein, pluizig en opvallend aanwezig." },
  { id: "langpootmug", name: "Langpootmug", title: "Fragiele Klikker", minPoints: 12, minBugs: 1, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 1, note: "Veel poot, weinig paniek." },
  { id: "faraomier", name: "Faraomier", title: "Mini Manager", minPoints: 18, minBugs: 1, rarity: "Gewoon", insect: "beetle", evolutionLevel: 1, note: "Klein account, groot plan." },
  { id: "boekluis", name: "Boekluis", title: "Documentduiker", minPoints: 22, minBugs: 1, rarity: "Gewoon", insect: "larva", evolutionLevel: 1, note: "Vindt typo's in de kleine lettertjes." },
  { id: "stofluis", name: "Stofluis", title: "Stille Scanner", minPoints: 28, minBugs: 2, rarity: "Gewoon", insect: "larva", evolutionLevel: 1, note: "Ziet wat onder de UI-stoflaag zit." },
  { id: "teek", name: "Teek", title: "Kleine Risicofactor", minPoints: 38, minBugs: 2, rarity: "Gewoon", insect: "crawler", evolutionLevel: 2, note: "Niet groot, wel irritant effectief." },
  { id: "fluweelmijt", name: "Fluweelmijt", title: "Rode Flitser", minPoints: 52, minBugs: 3, rarity: "Gewoon", insect: "crawler", evolutionLevel: 2, note: "Zacht uiterlijk, scherpe timing." },
  { id: "schildwants", name: "Schildwants", title: "Badge Schild", minPoints: 88, minBugs: 5, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Draagt zijn eigen UI-frame mee." },
  { id: "houtmier", name: "Houtmier", title: "Kolonie Kapitein", minPoints: 105, minBugs: 6, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Teamwork met rood-zwarte focus." },
  { id: "kniptor", name: "Kniptor", title: "Click Tester", minPoints: 125, minBugs: 7, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Springt precies wanneer je niet kijkt." },
  { id: "loopkever", name: "Loopkever", title: "Race Runner", minPoints: 145, minBugs: 8, rarity: "Zeldzaam", insect: "grasshopper", evolutionLevel: 3, note: "Rent door regressies heen." },
  { id: "waterkever", name: "Waterkever", title: "Gladde Zwemmer", minPoints: 175, minBugs: 9, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Laat geen ripple ongetest." },
  { id: "schrijvertje", name: "Schrijvertje", title: "Ripple Reviewer", minPoints: 205, minBugs: 10, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 2, note: "Draait rondjes om twijfelachtige states." },
  { id: "schaatsenrijder", name: "Schaatsenrijder", title: "Surface Skater", minPoints: 235, minBugs: 11, rarity: "Zeldzaam", insect: "grasshopper", evolutionLevel: 2, note: "Blijft bovenop elk issue." },
  { id: "goudtor", name: "Goudtor", title: "Luxe Logger", minPoints: 285, minBugs: 14, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 4, note: "Glimt alsof de bug al gefixt is." },
  { id: "tijgerkever", name: "Tijgerkever", title: "Sprint Hunter", minPoints: 325, minBugs: 16, rarity: "Zeldzaam", insect: "grasshopper", evolutionLevel: 4, note: "Snelle kaken, snelle feedback." },
  { id: "doodgraver", name: "Doodgraver", title: "Incident Delver", minPoints: 370, minBugs: 18, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Begraaft terugkerende bugs voorgoed." },
  { id: "waterschorpioen", name: "Waterschorpioen", title: "Ademstaart Analyst", minPoints: 420, minBugs: 20, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Vreemd silhouet, nuttige vondst." },
  { id: "bidsprinkhaan", name: "Bidsprinkhaan", title: "Ninja Fixer", minPoints: 470, minBugs: 22, rarity: "Episch", insect: "grasshopper", evolutionLevel: 5, note: "Wacht stil, grijpt precies raak." },
  { id: "wandelend-blad", name: "Wandelend blad", title: "Stealth Leaf", minPoints: 530, minBugs: 25, rarity: "Episch", insect: "grasshopper", evolutionLevel: 5, note: "Ziet eruit als decor, test als pro." },
  { id: "wespspin", name: "Wespspin", title: "Web Badge", minPoints: 590, minBugs: 27, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Webt bugs vast voordat ze ontsnappen." },
  { id: "kruisspin", name: "Kruisspin", title: "Pattern Watcher", minPoints: 655, minBugs: 29, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Heeft altijd een draadje naar oorzaak." },
  { id: "springspin", name: "Springspin", title: "Scout Ogen", minPoints: 725, minBugs: 31, rarity: "Zeldzaam", insect: "crawler", evolutionLevel: 4, note: "Compacte scout met grote ogen." },
  { id: "libel", name: "Libel", title: "Crystal Wing", minPoints: 800, minBugs: 34, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Glazen vleugels, messcherpe flow." },
  { id: "waterjuffer", name: "Waterjuffer", title: "Elegant Trace", minPoints: 875, minBugs: 37, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Dun, snel en verrassend precies." },
  { id: "gaasvlieg", name: "Gaasvlieg", title: "Netwerk Ninja", minPoints: 955, minBugs: 40, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Doorzichtige vleugels, heldere analyse." },
  { id: "doodshoofdvlinder", name: "Doodshoofdvlinder", title: "Mysterie Melder", minPoints: 1040, minBugs: 43, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Komt tevoorschijn bij donkere edge cases." },
  { id: "kolibrievlinder", name: "Kolibrievlinder", title: "Hover Hunter", minPoints: 1130, minBugs: 46, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Blijft hangen tot het probleem duidelijk is." },
  { id: "koninginnenpage", name: "Koninginnenpage", title: "Premium Page", minPoints: 1230, minBugs: 49, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Sierlijk, zeldzaam en releasewaardig." },
  { id: "atalanta", name: "Atalanta", title: "Contrast Catcher", minPoints: 1335, minBugs: 52, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Zwart-oranje alarm voor visuele bugs." },
  { id: "dagpauwoog", name: "Dagpauwoog", title: "Watcher Wing", minPoints: 1445, minBugs: 55, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Ziet alles, ook wat jij mist." },
  { id: "eikenprocessierups", name: "Eikenprocessierups", title: "Colonne Checker", minPoints: 1560, minBugs: 58, rarity: "Zeldzaam", insect: "larva", evolutionLevel: 4, note: "Loopt niet alleen; bugs meestal ook niet." },
  { id: "pijlstaartrups", name: "Pijlstaartrups", title: "Tail Signal", minPoints: 1680, minBugs: 61, rarity: "Episch", insect: "larva", evolutionLevel: 4, note: "Heeft een staartpunt voor urgente hints." },
  { id: "cicade", name: "Cicade", title: "Signal Singer", minPoints: 1805, minBugs: 64, rarity: "Zeldzaam", insect: "dragonfly", evolutionLevel: 5, note: "Laat regressies niet stil blijven." },
  { id: "schuimcicade", name: "Schuimcicade", title: "Bubble Scout", minPoints: 1935, minBugs: 67, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 4, note: "Speels schuim, serieuze vondst." },
  { id: "vliegend-hert", name: "Vliegend hert", title: "Gewei Generaal", minPoints: 2070, minBugs: 70, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Grote kaken voor grote blockers." },
  { id: "juweelkever", name: "Juweelkever", title: "Shimmer Elite", minPoints: 2210, minBugs: 75, rarity: "Episch", insect: "beetle", evolutionLevel: 5, note: "Metallic glans, premium badge-energie." },
  { id: "orchidee-bidsprinkhaan", name: "Orchidee-bidsprinkhaan", title: "Bloom Ambusher", minPoints: 2260, minBugs: 76, rarity: "Legendarisch", insect: "grasshopper", evolutionLevel: 5, note: "Elegant bloemblad, gevaarlijk goede timing." },
  { id: "pauwspin", name: "Pauwspin", title: "Show-off Scout", minPoints: 2310, minBugs: 77, rarity: "Episch", insect: "crawler", evolutionLevel: 5, note: "Klein, kleurrijk en veel te zelfverzekerd." },
  { id: "juweelwesp", name: "Juweelwesp", title: "Metallic Prikker", minPoints: 2360, minBugs: 78, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Luxueus glimmend, maar nog steeds scherp." },
  { id: "goudschildkever", name: "Goudschildkever", title: "Medaille Schild", minPoints: 2410, minBugs: 79, rarity: "Episch", insect: "beetle", evolutionLevel: 5, note: "Rond, goud en klaar voor het podium." },
  { id: "harlekijnwants", name: "Harlekijnwants", title: "Warning Pattern", minPoints: 2460, minBugs: 80, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Ziet eruit als een waarschuwing, gedraagt zich ook zo." },
  { id: "lantaarnvlieg", name: "Lantaarnvlieg", title: "Mystery Marker", minPoints: 2510, minBugs: 81, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Rare kop, rare bug, prima match." },
  { id: "vioolspin", name: "Vioolspin", title: "Stille Risico", minPoints: 2560, minBugs: 82, rarity: "Episch", insect: "crawler", evolutionLevel: 3, note: "Niet groot, wel reden om op te letten." },
  { id: "gespikkelde-houtvlinder", name: "Gespikkelde houtvlinder", title: "Silent Timber", minPoints: 2610, minBugs: 83, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Camouflage voor stille regressies." },
  { id: "zebra-springspin", name: "Zebra-springspin", title: "Stripe Scout", minPoints: 2660, minBugs: 84, rarity: "Episch", insect: "crawler", evolutionLevel: 4, note: "Grote ogen, korte sprong, scherpe vondst." },
  { id: "smaragdlibel", name: "Smaragdlibel", title: "Clean Flight", minPoints: 2710, minBugs: 85, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Groen metallic en strak door elke flow." },
  { id: "glasvleugelvlinder", name: "Glasvleugelvlinder", title: "Holo Wing", minPoints: 2760, minBugs: 86, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Bijna onzichtbaar, behalve voor goede testers." },
  { id: "komeetmot", name: "Komeetmot", title: "Tail Flair", minPoints: 2810, minBugs: 87, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Laat een spoor van nette tickets achter." },
  { id: "maanmot", name: "Maanmot", title: "Soft Glow", minPoints: 2860, minBugs: 88, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Rustige glow, serieuze vondst." },
  { id: "atlasvlinder", name: "Atlasvlinder", title: "Wing Boss", minPoints: 2910, minBugs: 89, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Enorme vleugels voor enorme edge cases." },
  { id: "rozekever", name: "Rozekever", title: "Rose Shield", minPoints: 2960, minBugs: 90, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 4, note: "Compact premium schild met kleur." },
  { id: "kardinaalkever", name: "Kardinaalkever", title: "Urgent Runner", minPoints: 3010, minBugs: 91, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Rood genoeg om prioriteit te krijgen." },
  { id: "vuurwants", name: "Vuurwants", title: "Signal Bug", minPoints: 3060, minBugs: 92, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Strak rood-zwart, geen twijfel mogelijk." },
  { id: "sabelsprinkhaan", name: "Sabelsprinkhaan", title: "Sharp Stepper", minPoints: 3110, minBugs: 93, rarity: "Episch", insect: "grasshopper", evolutionLevel: 4, note: "Lange sprieten, scherp detail." },
  { id: "mierenleeuw", name: "Mierenleeuw", title: "Trap Hunter", minPoints: 3160, minBugs: 94, rarity: "Gewoon", insect: "larva", evolutionLevel: 4, note: "Graafkuil voor verborgen bugs." },
  { id: "dobsonvlieg", name: "Dobsonvlieg", title: "Jaw Dropper", minPoints: 3210, minBugs: 95, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Kaken waar blockers stil van worden." },
  { id: "helikopterjuffer", name: "Helikopterjuffer", title: "Air Trace", minPoints: 3260, minBugs: 96, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Technisch, luchtig en snel." },
  { id: "spookinsect", name: "Spookinsect", title: "Ghost Case", minPoints: 3310, minBugs: 97, rarity: "Legendarisch", insect: "grasshopper", evolutionLevel: 5, note: "Stealth bug die ineens overal is." },
  { id: "bladpootwants", name: "Bladpootwants", title: "Odd Silhouette", minPoints: 3360, minBugs: 98, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Vreemde poten, handig profiel." },
  { id: "assassin-bug", name: "Assassin bug", title: "Precision Hunter", minPoints: 3410, minBugs: 99, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Jaagt op bugs zonder veel lawaai." },
  { id: "tijgermug", name: "Tijgermug", title: "Mini Danger", minPoints: 3460, minBugs: 100, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Klein, gestreept, berucht effectief." },
  { id: "dolksteekwesp", name: "Dolksteekwesp", title: "Critical Sting", minPoints: 3510, minBugs: 101, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Voor bugs met echte urgentie." },
  { id: "roofvlieg", name: "Roofvlieg", title: "Aerial Hunter", minPoints: 3560, minBugs: 102, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Harige speurder met jagerhouding." },
  { id: "kameelhalsvlieg", name: "Kameelhalsvlieg", title: "Long Neck Lookout", minPoints: 3610, minBugs: 103, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Bizar profiel, prima herkenbaar." },
  { id: "zweefvlieg", name: "Zweefvlieg", title: "Friendly Hover", minPoints: 3660, minBugs: 104, rarity: "Gewoon", insect: "dragonfly", evolutionLevel: 3, note: "Ziet er dreigend uit, test vriendelijk." },
  { id: "goudwesp", name: "Goudwesp", title: "Golden Sting", minPoints: 3710, minBugs: 105, rarity: "Episch", insect: "dragonfly", evolutionLevel: 5, note: "Juweelachtig en belonend." },
  { id: "sluipwesp", name: "Sluipwesp", title: "Mystery Stinger", minPoints: 3735, minBugs: 105, rarity: "Zeldzaam", insect: "dragonfly", evolutionLevel: 4, note: "Smal, scherp en net iets te stil." },
  { id: "fluweelmier", name: "Fluweelmier", title: "Soft Sting", minPoints: 3760, minBugs: 106, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Zacht uiterlijk, pittige feedback." },
  { id: "reuzenwaterwants", name: "Reuzenwaterwants", title: "Water Tank", minPoints: 3810, minBugs: 107, rarity: "Legendarisch", insect: "crawler", evolutionLevel: 5, note: "Plat, breed en onmogelijk te missen." },
  { id: "zweepschorpioen", name: "Zweepschorpioen", title: "Whip Tail", minPoints: 3860, minBugs: 108, rarity: "Legendarisch", insect: "crawler", evolutionLevel: 5, note: "Dreigend silhouet voor harde regressies." },
  { id: "azuren-waterjuffer", name: "Azuren waterjuffer", title: "Azure Trace", minPoints: 3910, minBugs: 109, rarity: "Episch", insect: "dragonfly", evolutionLevel: 4, note: "Blauw, snel en fris." },
  { id: "rouwmantelvlinder", name: "Rouwmantelvlinder", title: "Serious Wing", minPoints: 3960, minBugs: 110, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Chique donker met scherpe rand." },
  { id: "keizersmantel", name: "Keizersmantel", title: "Royal Orange", minPoints: 4010, minBugs: 111, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Koninklijke badge voor nette meldingen." },
  { id: "gouden-tor", name: "Gouden tor", title: "Clean Gold", minPoints: 4060, minBugs: 112, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 4, note: "Glanzend rank-icoon zonder poespas." },
  { id: "soldaatje", name: "Soldaatje", title: "Field Unit", minPoints: 4110, minBugs: 113, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 3, note: "Kleine veldwerker met duidelijke kleur." },
  { id: "doodgraverkever", name: "Doodgraverkever", title: "Heavy Cleanup", minPoints: 4160, minBugs: 114, rarity: "Episch", insect: "crawler", evolutionLevel: 4, note: "Ruig genoeg voor zware bugmeldingen." },
  { id: "olifantskever", name: "Olifantskever", title: "Massive Push", minPoints: 4210, minBugs: 115, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Massief, sterk en niet subtiel." },
  { id: "regenboogmestkever", name: "Regenboogmestkever", title: "Rainbow Cleanup", minPoints: 4260, minBugs: 116, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Grappig idee, premium uitvoering." },
  { id: "titanus-kever", name: "Titanus-kever", title: "Titan Jaw", minPoints: 4310, minBugs: 117, rarity: "Legendarisch", insect: "beetle", evolutionLevel: 5, note: "Eindbaas-boktor voor eindbaas-bugs." },
  { id: "langsprietboktor", name: "Langsprietboktor", title: "Signal Antenna", minPoints: 4360, minBugs: 118, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Antennebereik tot in legacy code." },
  { id: "schildpadkever", name: "Schildpadkever", title: "Defense Frame", minPoints: 4410, minBugs: 119, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Transparant randje, stevige verdediging." },
  { id: "vuurkever", name: "Vuurkever", title: "Red Alert", minPoints: 4460, minBugs: 120, rarity: "Zeldzaam", insect: "beetle", evolutionLevel: 4, note: "Strakke waarschuwingskleur." },
  { id: "blauwe-ertsbij", name: "Blauwe ertsbij", title: "Blue Premium", minPoints: 4510, minBugs: 121, rarity: "Legendarisch", insect: "dragonfly", evolutionLevel: 5, note: "Koel blauw, zeldzame beloning." },
  { id: "wespboktor", name: "Wespboktor", title: "Danger Disguise", minPoints: 4560, minBugs: 122, rarity: "Episch", insect: "beetle", evolutionLevel: 4, note: "Camouflage en gevaar in een." },
  { id: "groene-zandloopkever", name: "Groene zandloopkever", title: "Speed Precision", minPoints: 4610, minBugs: 123, rarity: "Legendarisch", insect: "grasshopper", evolutionLevel: 5, note: "Metallic groene jager met tempo." },
  { id: "koningin-alexandravlinder", name: "Koningin-Alexandravlinder", title: "Royal Wing", minPoints: 4800, minBugs: 124, rarity: "Mythisch", insect: "dragonfly", evolutionLevel: 5, note: "Zeldzaam, enorm en bijna koninklijk in de lucht." },
  { id: "zonsondergangsmot", name: "Zonsondergangsmot", title: "Prism Wing", minPoints: 4880, minBugs: 125, rarity: "Mythisch", insect: "dragonfly", evolutionLevel: 5, note: "Kleuren alsof de release door een prisma gaat." },
  { id: "picasso-wants", name: "Picasso-wants", title: "Pattern Master", minPoints: 4960, minBugs: 126, rarity: "Mythisch", insect: "beetle", evolutionLevel: 5, note: "Een levend kunstwerk met waarschuwingspatroon." },
  { id: "roze-esdoornmot", name: "Roze esdoornmot", title: "Candy Glow", minPoints: 5040, minBugs: 127, rarity: "Mythisch", insect: "dragonfly", evolutionLevel: 5, note: "Zacht roze-geel, maar opvallend genoeg voor de top tier." },
  { id: "giraffekevertje", name: "Giraffekevertje", title: "Long Neck Scout", minPoints: 5120, minBugs: 128, rarity: "Mythisch", insect: "beetle", evolutionLevel: 5, note: "Een bizarre lange nek voor bugs die ver vooruit kijken." },
  { id: "doornbloembidsprinkhaan", name: "Doornbloembidsprinkhaan", title: "Bloom Blade", minPoints: 5200, minBugs: 129, rarity: "Mythisch", insect: "grasshopper", evolutionLevel: 5, note: "Bloemachtig, stekelig en klaar om precies toe te slaan." },
  { id: "lantaarndrager", name: "Lantaarndrager", title: "Signal Lantern", minPoints: 5280, minBugs: 130, rarity: "Mythisch", insect: "dragonfly", evolutionLevel: 5, note: "Vreemde snuit, felle vleugels en direct herkenbaar." },
  { id: "glorieuze-scarabee", name: "Glorieuze scarabee", title: "Mirror Shield", minPoints: 5360, minBugs: 131, rarity: "Mythisch", insect: "beetle", evolutionLevel: 5, note: "Een spiegelende scarabee met echte eindtier-uitstraling." }
];

export const bugDexFacts: Record<string, string> = {
  "zilvervisje": "Zilvervisjes houden van donkere, vochtige plekken en rennen weg zodra het licht aangaat.",
  "fruitvlieg": "Fruitvliegen kunnen in een warme keuken razendsnel meerdere generaties krijgen.",
  "bladluis": "Bladluizen drinken plantensap en laten vaak kleverige honingdauw achter.",
  "mug": "Alleen vrouwelijke muggen steken; zij gebruiken bloed voor hun eitjes.",
  "mot": "Veel motten navigeren op licht, waardoor lampen ze flink in de war brengen.",
  "mier": "Mieren laten geursporen achter zodat de kolonie dezelfde route kan volgen.",
  "vlo": "Vlooien springen vele keren hun eigen lichaamslengte dankzij krachtige achterpoten.",
  "pissebed": "Pissebedden zijn eigenlijk kreeftachtigen en ademen via kieuwachtige structuren.",
  "stinkwants": "Stinkwantsen gebruiken geur als verdediging wanneer ze zich bedreigd voelen.",
  "snuitkever": "Snuitkevers hebben een lange snuit waarmee ze in planten kunnen boren.",
  "lieveheersbeestje": "Lieveheersbeestjes eten graag bladluizen en zijn daardoor nuttige tuinhelpers.",
  "kakkerlak": "Kakkerlakken zijn taai omdat ze snel schuilen en weinig nodig hebben om te overleven.",
  "oorworm": "Oorwormen gebruiken hun tangetjes vooral voor verdediging en onderlinge duwtjes.",
  "boktor": "Boktorren vallen op door lange antennes die soms langer zijn dan hun lijf.",
  "tapijtkever": "Tapijtkeverlarven knabbelen aan vezels zoals wol, veren en oude textielresten.",
  "roofwants": "Roofwantsen jagen op andere insecten met een scherpe zuigsnuit.",
  "duizendpoot": "Duizendpoten hebben geen duizend poten, maar wel genoeg om soepel te sprinten.",
  "sprinkhaan": "Sprinkhanen maken grote sprongen door hun gespierde achterpoten.",
  "wesp": "Wespen herkennen geursporen en keren daardoor vaak terug naar voedselplekken.",
  "hoornaar": "Hoornaars zijn grote wespen en jagen vaak op andere insecten.",
  "schorpioen": "Schorpioenen lichten op onder uv-licht door stoffen in hun pantser.",
  "termiet": "Termieten bouwen complexe kolonies en recyclen hard plantmateriaal.",
  "mestkever": "Mestkevers rollen mestballen die dienen als voedsel of broedkamer.",
  "wandelende-tak": "Wandelende takken lijken op twijgen en blijven vaak doodstil om niet op te vallen.",
  "vogelspin": "Vogelspinnen voelen trillingen via gevoelige haren op hun poten.",
  "reuzenkakkerlak": "Sommige reuzenkakkerlakken sissen door lucht uit hun ademopeningen te persen.",
  "reuzen-duizendpoot": "Reuzenduizendpoten zijn snelle jagers met giftige kaken aan de voorkant.",
  "neushoornkever": "Mannetjesneushoornkevers gebruiken hun hoorn om rivalen weg te duwen.",
  "atlaskever": "Atlaskevers zijn zware tropische kevers met indrukwekkende hoorns.",
  "herculeskever": "Herculeskevers behoren tot de grootste kevers ter wereld.",
  "goliathkever": "Goliathkevers zijn massieve kevers die als larve al flink zwaar kunnen worden.",
  "motmug": "Motmuggen hebben harige vleugels en zitten vaak bij vochtige afvoerplekken.",
  "langpootmug": "Langpootmuggen zien eruit als enorme muggen, maar steken niet.",
  "faraomier": "Faraomieren kunnen meerdere koninginnen hebben, waardoor nesten lastig verdwijnen.",
  "boekluis": "Boekluizen eten schimmels en houden van papierige, vochtige hoekjes.",
  "stofluis": "Stofluizen zijn klein en verraden vaak dat ergens te veel vocht zit.",
  "teek": "Teken wachten vaak op gras of struiken tot een gastheer langsloopt.",
  "fluweelmijt": "Fluweelmijten vallen op door hun felrode, fluweelachtige lijf.",
  "schildwants": "Schildwantsen danken hun naam aan hun schildvormige rug.",
  "houtmier": "Houtmieren maken grote nesten en werken met strakke taakverdeling.",
  "kniptor": "Kniptorren kunnen zichzelf met een klikbeweging weer rechtop schieten.",
  "loopkever": "Loopkevers zijn snelle bodemjagers die vaak 's nachts actief zijn.",
  "waterkever": "Waterkevers nemen lucht mee onder hun schild wanneer ze duiken.",
  "schrijvertje": "Schrijvertjes draaien rondjes op water en zien tegelijk boven en onder water.",
  "schaatsenrijder": "Schaatsenrijders glijden over water door oppervlaktespanning te gebruiken.",
  "goudtor": "Goudtorren hebben vaak een metaalglans die verandert met het licht.",
  "tijgerkever": "Tijgerkevers zijn snelle jagers met opvallend grote kaken.",
  "doodgraver": "Doodgravers begraven kleine dode dieren als voedsel voor hun larven.",
  "waterschorpioen": "Waterschorpioenen ademen via een lange buis aan hun achterlijf.",
  "bidsprinkhaan": "Bidsprinkhanen slaan razendsnel toe met hun gevouwen grijppoten.",
  "wandelend-blad": "Wandelende bladeren lijken op blaadjes, inclusief nerven en rafelrandjes.",
  "wespspin": "Wespspinnen hebben gele strepen die lijken op een waarschuwing.",
  "kruisspin": "Kruisspinnen bouwen ronde webben en wachten in of naast het midden.",
  "springspin": "Springspinnen hebben grote ogen en bespringen prooi heel precies.",
  "libel": "Libellen kunnen stilhangen, achteruit vliegen en razendsnel draaien.",
  "waterjuffer": "Waterjuffers zijn slanker dan libellen en houden hun vleugels vaak dicht.",
  "gaasvlieg": "Gaasvliegen hebben fijne, doorzichtige vleugels met een netpatroon.",
  "doodshoofdvlinder": "Doodshoofdvlinders hebben een tekening op hun rug die op een schedel lijkt.",
  "kolibrievlinder": "Kolibrievlinders drinken nectar terwijl ze als een kolibrie blijven hangen.",
  "koninginnenpage": "De koninginnenpage is een grote vlinder met sierlijke staartpunten.",
  "atalanta": "Atalanta's zijn trekvlinders die grote afstanden kunnen afleggen.",
  "dagpauwoog": "Dagpauwogen hebben oogvlekken die roofdieren kunnen afschrikken.",
  "eikenprocessierups": "Eikenprocessierupsen lopen vaak in lange rijen over eikenstammen.",
  "pijlstaartrups": "Pijlstaartrupsen hebben een opvallend staartpuntje aan hun achterlijf.",
  "cicade": "Cicaden maken geluid met trilorganen, niet door vleugels te wrijven.",
  "schuimcicade": "Schuimcicadelarven verstoppen zich in schuim dat lijkt op spuug.",
  "vliegend-hert": "Vliegende herten hebben enorme kaken die vooral dienen bij gevechten tussen mannetjes.",
  "juweelkever": "Juweelkevers staan bekend om hun felle, metaalachtige kleuren.",
  "orchidee-bidsprinkhaan": "Orchidee-bidsprinkhanen lijken op bloemen om prooi dichterbij te lokken.",
  "pauwspin": "Pauwspinnen dansen met kleurrijke flapjes om indruk te maken.",
  "juweelwesp": "Juweelwespen glanzen metallic groen en blauw als kleine edelstenen.",
  "goudschildkever": "Goudschildkevers kunnen glanzen alsof ze een gouden schild dragen.",
  "harlekijnwants": "Harlekijnwantsen vallen op met felle patronen die waarschuwingen lijken.",
  "lantaarnvlieg": "Lantaarnvliegen hebben vreemde kopvormen en vaak opvallende vleugeltekeningen.",
  "vioolspin": "Vioolspinnen danken hun naam aan de vioolachtige tekening op hun lichaam.",
  "gespikkelde-houtvlinder": "Gespikkelde houtvlinders hebben een patroon dat lijkt op boomschors en vlekjes.",
  "zebra-springspin": "Zebra-springspinnen zijn klein, gestreept en nieuwsgierig naar beweging.",
  "smaragdlibel": "Smaragdlibellen hebben een groene glans die in zonlicht sterk opvalt.",
  "glasvleugelvlinder": "Glasvleugelvlinders hebben doorzichtige vleugels waardoor ze deels verdwijnen.",
  "komeetmot": "Komeetmotten hebben lange staarten aan hun vleugels als een spoor.",
  "maanmot": "Maanmotten hebben zachte groene vleugels en lange sierlijke staarten.",
  "atlasvlinder": "Atlasvlinders zijn enorme vlinders met vleugelpunten die op slangenkoppen lijken.",
  "rozekever": "Rozekevers glanzen vaak groen, koper of rozerood afhankelijk van het licht.",
  "kardinaalkever": "Kardinaalkevers vallen op door hun felle rode kleur.",
  "vuurwants": "Vuurwantsen verzamelen vaak in groepen op warme stenen of boomstammen.",
  "sabelsprinkhaan": "Sabelsprinkhanen hebben lange antennes en stevige springpoten.",
  "mierenleeuw": "Mierenleeuwlarven maken trechterkuilen waarin kleine prooien wegglijden.",
  "dobsonvlieg": "Mannelijke dobsonvliegen hebben enorme kaken die vooral indruk maken.",
  "helikopterjuffer": "Helikopterjuffers hebben brede vleugels en een sierlijke, zwevende vlucht.",
  "spookinsect": "Spookinsecten vertrouwen op camouflage en lijken op droge takjes of bladeren.",
  "bladpootwants": "Bladpootwantsen hebben verbrede achterpoten die op kleine blaadjes lijken.",
  "assassin-bug": "Assassin bugs zijn sluipende jagers die prooi met een snuit prikken.",
  "tijgermug": "Tijgermuggen herken je aan hun zwart-witte strepen.",
  "dolksteekwesp": "Dolksteekwespen jagen vaak op larven van kevers in de bodem.",
  "roofvlieg": "Roofvliegen vangen andere insecten in de lucht met sterke poten.",
  "kameelhalsvlieg": "Kameelhalsvliegen hebben een lange halsachtige borst en bewegen opvallend hoekig.",
  "zweefvlieg": "Zweefvliegen lijken op wespen, maar zijn onschuldige bloemenbezoekers.",
  "goudwesp": "Goudwespen hebben een harde, glanzende buitenkant en rollen zich soms op.",
  "sluipwesp": "Sluipwespen leggen eitjes bij andere insecten en houden plagen in toom.",
  "fluweelmier": "Fluweelmieren zijn eigenlijk wespen; de vrouwtjes hebben geen vleugels.",
  "reuzenwaterwants": "Reuzenwaterwantsen zijn sterke waterrovers die prooi onder water grijpen.",
  "zweepschorpioen": "Zweepschorpioenen hebben geen angel, maar wel een lange zweepstaart.",
  "azuren-waterjuffer": "Azuren waterjuffers vallen op door hun heldere blauwe tekening.",
  "rouwmantelvlinder": "Rouwmantelvlinders hebben donkere vleugels met een lichte rand.",
  "keizersmantel": "Keizersmantels zijn oranje vlinders die graag langs bosranden vliegen.",
  "gouden-tor": "Gouden torren lijken compact, glanzend en bijna gepolijst.",
  "soldaatje": "Soldaatjes zijn zachte kevers die vaak op bloemen zitten.",
  "doodgraverkever": "Doodgraverkevers ruiken aas van ver en werken soms als paar samen.",
  "olifantskever": "Olifantskevers zijn grote neushoornkevers met forse hoorns.",
  "regenboogmestkever": "Regenboogmestkevers combineren mestrollen met felle metaalglans.",
  "titanus-kever": "Titanuskevers zijn reuzenboktorren met een indrukwekkend formaat.",
  "langsprietboktor": "Langsprietboktorren gebruiken hun lange sprieten om omgeving en geur te verkennen.",
  "schildpadkever": "Schildpadkevers hebben een rond schild dat over hun poten valt.",
  "vuurkever": "Vuurkevers dragen felrode schilden die direct opvallen tussen bladeren.",
  "blauwe-ertsbij": "Blauwe ertsbijen hebben een diepe blauwzwarte metaalglans.",
  "wespboktor": "Wespboktorren lijken op wespen, maar zijn kevers met lange sprieten.",
  "groene-zandloopkever": "Groene zandloopkevers sprinten over zandige plekken en jagen op zicht.",
  "koningin-alexandravlinder": "De Koningin-Alexandravlinder is een van de grootste dagvlinders ter wereld en komt uit Papoea-Nieuw-Guinea.",
  "zonsondergangsmot": "De Madagascan sunset moth heeft iriserende vleugels die kleuren tonen door lichtbreking.",
  "picasso-wants": "De Picasso-wants heeft patronen die bijna geschilderd lijken en roofdieren waarschuwen.",
  "roze-esdoornmot": "De roze esdoornmot valt op door zijn zachte roze en gele kleuren.",
  "giraffekevertje": "Het giraffekevertje uit Madagaskar heeft een extreem lange nek, vooral bij mannetjes.",
  "doornbloembidsprinkhaan": "De doornbloembidsprinkhaan lijkt op een bloem en gebruikt camouflage bij het jagen.",
  "lantaarndrager": "Lantaarndragers hebben een lange kopuitsteeksel en opvallend getekende vleugels.",
  "glorieuze-scarabee": "De glorious scarab heeft metallic groene en zilveren strepen die sterk glanzen."
};

const severityBase: Record<BugSeverity, number> = {
  Laag: 5,
  Normaal: 10,
  Hoog: 20,
  Kritiek: 35
};

export function calculateBugPoints(severity: BugSeverity, status: BugStatus): number {
  if (status === "Afgekeurd" || status === "Dubbel") {
    return 0;
  }
  if (status === "Gefixt") {
    return severityBase[severity] + 15;
  }
  if (status === "Bevestigd" || status === "In behandeling") {
    return severityBase[severity] + 5;
  }
  return severityBase[severity];
}

export function titleForPoints(points: number): string {
  return getTierForPoints(points).title;
}

export function getTierForPoints(points: number): UserTier {
  return [...userTiers].reverse().find((tier) => points >= tier.minPoints) ?? userTiers[0];
}

export function pointsUntilNextTier(points: number): number | null {
  const nextTier = userTiers.find((tier) => tier.minPoints > points);
  return nextTier ? nextTier.minPoints - points : null;
}

export function badgesForUser(user: Pick<User, "totalPoints" | "bugCount">): string[] {
  const badges = [];
  if (user.bugCount >= 1) badges.push("Eerste vangst");
  if (user.bugCount >= 5) badges.push("Speurneus");
  if (user.totalPoints >= 100) badges.push("Puntenslijper");
  if (user.totalPoints >= 150) badges.push("Statusstrijder");
  if (user.totalPoints >= 300) badges.push("Meesterkolonie");
  return badges;
}

export function isBugDexEntryUnlocked(entry: BugDexEntry, user: Pick<User, "totalPoints" | "bugCount">): boolean {
  return user.totalPoints >= entry.minPoints && user.bugCount >= entry.minBugs;
}

export function unlockedBugDexCount(user: Pick<User, "totalPoints" | "bugCount">): number {
  return bugDexEntries.filter((entry) => isBugDexEntryUnlocked(entry, user)).length;
}
