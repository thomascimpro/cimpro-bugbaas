import type { BugDexEntry, BugDexRarity, InsectVariant } from "./pointsService";
import { bugDexNederlandPilotEntries, bugDexNederlandPilotFacts } from "./bugDexNederlandPilot";

const unique = (ids: string[]) => [...new Set(ids)];

const commonIds = unique(`
azijnvlieg knut zandvlieg kriebelmug dansmug langpootvlieg dansvlieg ruitvlieg herfstvlieg stalvlieg zwarte-aasvlieg groene-vleesvlieg huisboktor houtboorder haantjeskever bladkever wilgenhaantje populierenhaantje elzenhaantje aardvlo bonte-aspergekever aspergekever snuitkeverlarve graanklander rijstklander erwtenkever bonenkever zadenkever bladroller bladmineerder elzenhaantje meikeverlarve engerlingkever ritnaald emeltvlieg aardrupsvlinder rookwants koolschildwants groene-blinkwants bleekgroene-wants zuringwants korenwants berkenwants tuinrandwants groene-bladluis roze-bladluis zwarte-bladluis wortelluis bloedluis druifluis wollige-beukenbladluis roetdauwslak barnsteenslak tuinslak grote-tuinslak akkerslak kleine-akkerslak naaktslak huisjesslak poelslak posthoornslak waterslak kleine-watersalamander oorwurmsoort zwarte-springstaart witte-springstaart bochelvlieg dansende-langpoot kleine-zweefvlieg snorzweefvlieg terrassenvlieg rioolvlieg motmijt meelmijt hondenvlo kattenvlo hertenteek schurftmijt oogstmijt roodwitte-mijt kleine-rode-mijt tuinluis witte-vlieg kaswittevlieg
`.trim().split(/\s+/)).slice(0, 80);

const rareIds = `
blinde-bij gewone-langspriet zandbijtje maskerbij tronkenbij metselbij pluimvoetbij zijdebij behangersbij wolbij sachembij bladsnijderbij langhoornbij roodgatje smalbandwesp saksische-wesp franse-wesp limonadewesp veldhoornaar rode-wespenboktor kleine-wespenboktor schuimbeestje cicade-krekel veldcicade zwarte-cicade grauwe-cicade blauwe-glazenmaker grote-glazenmaker paardenbijter gewone-oeverlibel steenrode-heidelibel bruinrode-heidelibel bloedrode-heidelibel viervlek platbuik vuurjuffer lantaarntje azuurjuffer variabele-waterjuffer grote-roodoogjuffer kleine-roodoogjuffer bandheidelibel gewone-pantserjuffer schaatsenrijder-groot duikerwants bootsmannetje staafwants waterspin grote-zebraspin huisspin zuidelijke-huisspin marmertrilspin grote-kaardespin vierpunts-orbweaver prachtige-krabspin wespenkrabspin zebrakrabspin struikspringspin huisspringspin boswolfspin zandwolfspin beervlinder hooiwagen-langpoot rolpissebed kelderpissebed-groot duinmeikever junikever roodbruine-bladsprietkever rozenkever zwarte-bladsprietkever kleine-gouden-kever driehoornmestkever doodshoofdkever schijnboktor zwarte-populierenboktor grote-populierenboktor roodkopvuurkever zwarte-vuurkever bladwesp rozenbladwesp eikenbladwesp dennenbladwesp sparrenbladwesp houtsluipwesp sluipvlieg roofvlieg-groot snuitvlieg dambordzweefvlieg zilvervlek kleine-parelmoervlinder distelvlinder-rups dagpauwoog-rups klein-avondrood groot-witje klein-heideblauwtje bruinblauwtje boomblauwtje-rups sint-jansvlinder beervlinder grote-beervlinder plakker donker-jonker kooluil gamma-uil-rups voorjaarsuil houtboorder-mot zilvermot meidoornstippelmot eikenprocessierups-rups lindepijlstaart populierenpijlstaart walstropijlstaart kleine-uil grote-silkemonitor veenmol-groot zandkrekel boskrekel sikkelsprinkhaan krasser ratelaar doornsprinkhaan zandsprinkhaan struiksprinkhaan kleine-groene-sprinkhaan blauwe-sprinkhaan sint-jakobsslak wijngaardslak zebranaaktslak grote-glasslak naaktslak-rood
`.trim().split(/\s+/).slice(0, 85);

const epicIds = `
grote-keizerlibel zuidelijke-keizerlibel noordse-winterjuffer tangpantserjuffer zuidelijke-glassnijder gouden-glazenmaker bronlibel sierlijke-glazenmaker oostelijke-widderjuffer vuurlibel zwervende-heidelibel zwarte-smaragdlibel blauwe-glanslibel grote-ocellated-waterjuffer zwarte-waterjuffer reuzenwaterjuffer zilvervlekjuffer speerwaterjuffer gouden-smaragdkever violette-loopkever gouden-loopkever reuzenboktor eikenboktor dennenboktor roodvleugelboktor blauwe-kever goudglanzende-bladsprietkever zwarte-junikever grijze-zandloopkever gouden-tijgerkever reuzenwaterkever zwarte-waterkever zwarte-dijblindwants roodbuikvuurpadkever vuurzwamkever zwarte-weeskindkever parelmoerkever gouden-bloemkever blauwe-mestkever reuzencicade rode-watermijt reuzenbladsprinkhaan groene-sabelsprinkhaan zwarte-weduwespin rode-weduwespin valse-weduwespin wolfspin-met-eierzak gouden-springspin groene-jachtspin reuzenkrabspin zuidelijke-jachtspin wespenspin-rups grote-kameleonspin rode-krabspin zwarte-kruisspin nachtpauwoog kleine-nachtpauwoog populieren-wintervlinder esdoornpage grote-vuurvlinder grote-parelmoervlinder keizerspage iepenpage zilveren-maan gentiaanblauwtje pimpernelblauwtje adonisblauwtje grote-vuurvlinder-rups windepijlstaart doodshoofd-pijlstaart olifantsvlinder wilgenhoutrups grote-wouduil bruine-wouduil zwarte-w-vlinder groot-herculesvlinder zuidelijke-vuurvlinder gouden-bonte-vlinder koningspage bosparelmoervlinder vossenkaart groot-schaduwtje bergveldwesp reuzensluipwesp smaragdwesp gouden-tanglibel zwarte-dijblindwants reuzencicade blauwe-bessencicade reuzenbladsprinkhaan groene-sabelsprinkhaan sierlijke-sprinkhaan zwarte-waterschorpioen rode-watermijt reuzenduiker beerkreeft
`.trim().split(/\s+/).slice(0, 60);

const legendaryIds = `
atlasmot maanvlinder nachtpauwoog-mot groot-doodshoofd reuzenhoutwesp reuzenhoornaar blauwe-houtbij reuzenbij gouden-juweelkever smaragdgroene-kever reuzenatlaskever halsbandboktor zwarte-herculeskever gouden-neushoornkever goliathvogelspin reuzenvogelspin gouden-vogelspin prisma-springspin tropische-regenboogvlinder scharlaken-adelaarvlinder reuzen-boomvlinder
`.trim().split(/\s+/);

const mythicIds = `
gouden-page nachtelijke-kometenvlinder blauwe-draaklibel saffierjuweelkever kroonjuweelvlinder
`.trim().split(/\s+/);

const additionalMappedRows: Array<[string, BugDexRarity]> = [
  ["grote-beervlinder", "Zeldzaam"],
  ["zandkrekel", "Zeldzaam"],
  ["boskrekel", "Zeldzaam"],
  ["sikkelsprinkhaan", "Zeldzaam"],
  ["krasser", "Zeldzaam"],
  ["roofvlieg-groot", "Zeldzaam"],
  ["dambordzweefvlieg", "Zeldzaam"],
  ["klein-avondrood", "Zeldzaam"],
  ["watermijt", "Episch"],
  ["zwarte-waterschorpioen", "Episch"],
  ["bergveldwesp", "Episch"],
  ["sierlijke-sprinkhaan", "Episch"],
  ["rode-bosmier", "Gewoon"],
  ["rode-katoenwants", "Zeldzaam"],
  ["gouden-wielwebspin", "Episch"],
  ["zwarte-wegmier", "Gewoon"],
  ["struiksprinkhaan", "Gewoon"]
];

const rows: Array<[string, BugDexRarity]> = [
  ...commonIds.map((id) => [id, "Gewoon"] as [string, BugDexRarity]),
  ...rareIds.map((id) => [id, "Zeldzaam"] as [string, BugDexRarity]),
  ...epicIds.map((id) => [id, "Episch"] as [string, BugDexRarity]),
  ...legendaryIds.map((id) => [id, "Legendarisch"] as [string, BugDexRarity]),
  ...mythicIds.map((id) => [id, "Mythisch"] as [string, BugDexRarity]),
  ...additionalMappedRows
];

function displayName(id: string): string {
  return id.split("-").map((word, index) => index === 0 ? word.slice(0, 1).toUpperCase() + word.slice(1) : word).join(" ");
}

function insectForId(id: string): InsectVariant {
  if (/(rups|larve|pop|engerling|ritnaald)/.test(id)) return "larva";
  if (/(sprinkhaan|krekel|cicade|veenmol|krasser|ratelaar)/.test(id)) return "grasshopper";
  if (/(kever|wants|klander|boktor|mestkever|loopkever|waterkever|vuurkever|bladspriet)/.test(id)) return "beetle";
  if (/(vlieg|mug|bij|wesp|vlinder|mot|uil|page|libel|juffer|glazenmaker|zweef|bladwesp|sluipwesp)/.test(id)) return "dragonfly";
  return "crawler";
}

export function bugDexFallbackVariantForId(id: string): InsectVariant {
  return insectForId(id);
}

const basePoints: Record<BugDexRarity, number> = {
  Gewoon: 1450,
  Zeldzaam: 2300,
  Episch: 3400,
  Legendarisch: 5000,
  Mythisch: 7000
};

const baseBugs: Record<BugDexRarity, number> = {
  Gewoon: 55,
  Zeldzaam: 78,
  Episch: 105,
  Legendarisch: 145,
  Mythisch: 200
};

const generatedExpansionEntries: BugDexEntry[] = rows.map(([id, rarity], index) => {
  const name = displayName(id);
  return {
    id,
    name,
    title: rarity === "Mythisch" ? "Mythische kroonvondst" : rarity + " veldvondst",
    minPoints: basePoints[rarity] + index * 24,
    minBugs: baseBugs[rarity] + Math.floor(index / 4),
    rarity,
    insect: insectForId(id),
    evolutionLevel: rarity === "Gewoon" ? 4 : rarity === "Zeldzaam" ? 5 : 6,
    note: "Echte " + name.toLowerCase() + " voor de uitgebreide BugDex."
  };
});

export const bugDexExpansionEntries: BugDexEntry[] = [
  ...generatedExpansionEntries,
  ...bugDexNederlandPilotEntries,
];

export const bugDexExpansionFacts: Record<string, string> = {
  ...Object.fromEntries(
    generatedExpansionEntries.map((entry) => [entry.id, entry.name + " is een echte soort in de uitgebreide BugDex."])
  ),
  ...bugDexNederlandPilotFacts,
};
