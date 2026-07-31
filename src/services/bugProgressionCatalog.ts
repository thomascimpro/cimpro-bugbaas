import { bugDexSets } from "./bugDexSetService.ts";
import { bugDexEntries, type BugDexEntry, type BugDexRarity } from "./pointsService.ts";

export const bugAcquisitionProfiles = ["starter", "field", "research", "campaign", "event", "mythic", "legacy"] as const;
export type BugAcquisitionProfile = (typeof bugAcquisitionProfiles)[number];

export const progressionHabitats = ["Tuin", "Park", "Water", "Nacht", "Kantoor", "Binnen"] as const;
export type BugProgressionHabitat = (typeof progressionHabitats)[number];

export const museumWingIds = ["beetles", "wings", "water", "night", "crawlers", "crown"] as const;
export type BugProgressionMuseumWingId = (typeof museumWingIds)[number];

export type ResearchTier = 1 | 2 | 3 | 4;

export type BugProgressionDefinition = {
  bugId: string;
  acquisition: BugAcquisitionProfile;
  habitats: readonly BugProgressionHabitat[];
  museumWings: readonly BugProgressionMuseumWingId[];
  verifiedScanUnlock: "exact_species";
  researchTier?: ResearchTier;
  campaignMilestoneId?: string;
  eventPoolId?: string;
  mythicPathId?: string;
};

export type LegacyRewardTransition =
  | "preserve_then_research"
  | "preserve_then_targeted_reward"
  | "preserve_then_exact_species"
  | "preserve_then_directed_synthesis";

export const legacyRewardSourcePolicies = Object.freeze({
  daily_login: "preserve_then_research",
  bug_reported: "preserve_then_research",
  comment: "preserve_then_research",
  status_update: "preserve_then_research",
  bug_fixed: "preserve_then_research",
  upvote_given: "preserve_then_research",
  profile_view: "preserve_then_research",
  bug_splat: "preserve_then_research",
  weekly_mission: "preserve_then_targeted_reward",
  weekly_mission_common: "preserve_then_targeted_reward",
  weekly_mission_rare: "preserve_then_targeted_reward",
  weekly_mission_epic: "preserve_then_targeted_reward",
  daily_mission_bonus: "preserve_then_targeted_reward",
  solo_boss_common: "preserve_then_targeted_reward",
  solo_boss_rare: "preserve_then_targeted_reward",
  solo_campaign_clear: "preserve_then_targeted_reward",
  duel_win: "preserve_then_targeted_reward",
  rank_up: "preserve_then_targeted_reward",
  buddy_common: "preserve_then_targeted_reward",
  buddy_rare: "preserve_then_targeted_reward",
  buddy_epic: "preserve_then_targeted_reward",
  bug_brain_daily: "preserve_then_targeted_reward",
  real_bug_scan: "preserve_then_exact_species",
  museum_reward: "preserve_then_targeted_reward",
  research_encounter: "preserve_then_targeted_reward",
  weekly_field_spotlight: "preserve_then_targeted_reward",
  combine: "preserve_then_directed_synthesis"
} satisfies Record<string, LegacyRewardTransition>);

export const legacyOwnershipMigration = Object.freeze({
  preserveInventory: true,
  preserveMastery: true,
  preserveUnlockHistory: true,
  preserveActiveSquad: true,
  preserveTradeHistory: true,
  preserveFieldJournal: true,
  reclassifyOwnedSpecies: false
});

const starterBugIds = new Set(["zilvervisje", "lieveheersbeestje", "springspin"]);

const mythicPaths = new Map<string, string>([
  ["koningin-alexandravlinder", "museum-wings-master"],
  ["zonsondergangsmot", "season-night-finale"],
  ["picasso-wants", "museum-crown-curated"],
  ["roze-esdoornmot", "museum-night-master"],
  ["giraffekevertje", "museum-beetles-master"],
  ["doornbloembidsprinkhaan", "campaign-hard-route"],
  ["lantaarndrager", "team-hunt-mythic-pool"],
  ["glorieuze-scarabee", "museum-crown-master"],
  ["blauwe-morpho", "season-grand-finale"]
]);

const campaignMilestones = new Map<string, string>([
  ["vliegend-hert", "solo-boss-1-stag"],
  ["bidsprinkhaan", "solo-boss-2-mantis"],
  ["regenboogmestkever", "solo-boss-3-scarab"],
  ["hoornaar", "solo-boss-4-hornet"],
  ["atlaskever", "solo-boss-5-atlas"]
]);

const eventPools = new Map<string, string>([
  ["reuzen-duizendpoot", "swarm-siege"],
  ["reuzenwaterwants", "swarm-siege"],
  ["zweepschorpioen", "swarm-siege"],
  ["smaragdlibel", "team-hunt"],
  ["blauwe-ertsbij", "team-hunt"],
  ["groene-zandloopkever", "team-hunt"],
  ["atlasvlinder", "season-finale"],
  ["dobsonvlieg", "season-finale"],
  ["gouden-vogelvlinder", "season-finale"]
]);

const dutchFieldBugIds = new Set(
  bugDexSets
    .filter((set) => set.id === "dutch_home" || set.id === "dutch_garden")
    .flatMap((set) => set.bugIds)
);

const additionalFieldBugIds = new Set([
  "zilvervisje",
  "fruitvlieg",
  "bladluis",
  "mug",
  "mot",
  "mier",
  "vlo",
  "pissebed",
  "kakkerlak",
  "oorworm",
  "termiet",
  "motmug",
  "langpootmug",
  "faraomier",
  "boekluis",
  "stofluis",
  "teek",
  "fluweelmijt",
  "stinkwants",
  "snuitkever",
  "lieveheersbeestje",
  "tapijtkever",
  "roofwants",
  "duizendpoot",
  "sprinkhaan",
  "wesp",
  "mestkever",
  "schildwants",
  "houtmier",
  "kniptor",
  "loopkever",
  "waterkever",
  "schrijvertje",
  "schaatsenrijder",
  "goudtor",
  "tijgerkever",
  "doodgraver",
  "waterschorpioen",
  "wespspin",
  "kruisspin",
  "springspin",
  "eikenprocessierups",
  "cicade",
  "rozekever",
  "vuurwants",
  "soldaatje",
  "vuurkever",
  "zakdrager",
  "gehakkelde-aurelia",
  "kortschildkever",
  "eendagsvlieg",
  "oranjetipje",
  "kleine-vuurvlinder",
  "coloradokever",
  "glimworm",
  "groentje",
  "heideblauwtje",
  "kraamwebspin",
  "groene-krabspin",
  "hooiwagen",
  "schietmot",
  "dikkopje",
  "veldkrekel",
  "meeltor",
  "roodbruine-rijstmeelkever",
  "schorskever",
  "bruin-zandoogje",
  "honingbij",
  "dambordvlieg",
  "hommel",
  "huisvlieg",
  "kleermot",
  "meikever",
  "schorpioenvlieg",
  "voorraadmot",
  "witte-tijger",
  "rode-bosmier",
  "rode-katoenwants",
  "gouden-wielwebspin",
  "zwarte-wegmier",
  "struiksprinkhaan"
]);

const fieldBugIds = new Set([...dutchFieldBugIds, ...additionalFieldBugIds]);

const indoorBugIds = new Set([
  ...bugDexSets.find((set) => set.id === "dutch_home")?.bugIds ?? [],
  "zilvervisje",
  "fruitvlieg",
  "bladluis",
  "mug",
  "mot",
  "mier",
  "vlo",
  "pissebed",
  "kakkerlak",
  "oorworm",
  "termiet",
  "motmug",
  "langpootmug",
  "faraomier",
  "boekluis",
  "stofluis",
  "tapijtkever",
  "huisvlieg",
  "kleermot",
  "voorraadmot",
  "meeltor",
  "roodbruine-rijstmeelkever"
]);

const waterBugIds = new Set([
  "waterkever",
  "schrijvertje",
  "schaatsenrijder",
  "waterschorpioen",
  "reuzenwaterwants",
  "waterjuffer",
  "azuren-waterjuffer",
  "lauwstaartwaterjuffer",
  "libel",
  "smaragdlibel",
  "helikopterjuffer",
  "eendagsvlieg",
  "schietmot"
]);

const nightBugIds = new Set([
  "mot",
  "motmug",
  "doodshoofdvlinder",
  "maanmot",
  "komeetmot",
  "atlasvlinder",
  "gespikkelde-houtvlinder",
  "kakkerlak",
  "reuzenkakkerlak",
  "vioolspin",
  "kruisspin",
  "springspin",
  "zebra-springspin",
  "vogelspin",
  "wespspin",
  "schorpioen",
  "zweepschorpioen",
  "glimworm",
  "kleermot",
  "voorraadmot",
  "witte-tijger",
  "gamma-uil",
  "huismoeder",
  "agaatvlinder",
  "windevedermot"
]);

function acquisitionFor(entry: BugDexEntry): Pick<BugProgressionDefinition, "acquisition" | "campaignMilestoneId" | "eventPoolId" | "mythicPathId" | "researchTier"> {
  if (starterBugIds.has(entry.id)) return { acquisition: "starter" };
  if (entry.rarity === "Mythisch") {
    return { acquisition: "mythic", mythicPathId: mythicPaths.get(entry.id) ?? `mythic-crown-${entry.id}` };
  }

  const campaignMilestoneId = campaignMilestones.get(entry.id);
  if (campaignMilestoneId) return { acquisition: "campaign", campaignMilestoneId };

  const eventPoolId = eventPools.get(entry.id);
  if (eventPoolId) return { acquisition: "event", eventPoolId };

  if (fieldBugIds.has(entry.id)) return { acquisition: "field" };
  return { acquisition: "research", researchTier: researchTierForRarity(entry.rarity) };
}

function researchTierForRarity(rarity: BugDexRarity): ResearchTier {
  if (rarity === "Gewoon") return 1;
  if (rarity === "Zeldzaam") return 2;
  if (rarity === "Episch") return 3;
  return 4;
}

function habitatsFor(entry: BugDexEntry): readonly BugProgressionHabitat[] {
  const habitats = new Set<BugProgressionHabitat>();
  const isWater = waterBugIds.has(entry.id) || /water|juffer|libel|schrijvertje|schaatsenrijder/.test(entry.id);
  const isNight = nightBugIds.has(entry.id) || /nacht|mot|kakkerlak|glimworm|schorpioen/.test(entry.id);
  const isIndoor = indoorBugIds.has(entry.id);
  const isGarden = dutchFieldBugIds.has(entry.id) || fieldBugIds.has(entry.id);

  if (isWater) habitats.add("Water");
  if (isNight) habitats.add("Nacht");
  if (isIndoor) {
    habitats.add("Binnen");
    habitats.add("Kantoor");
  }
  if (isGarden && !isIndoor) {
    habitats.add("Tuin");
    habitats.add("Park");
  }

  if (habitats.size === 0) {
    if (entry.insect === "dragonfly") {
      habitats.add("Park");
      habitats.add("Water");
    } else if (entry.insect === "crawler" || entry.insect === "larva") {
      habitats.add("Tuin");
      habitats.add("Binnen");
    } else {
      habitats.add("Tuin");
      habitats.add("Park");
    }
  }

  return Object.freeze(Array.from(habitats));
}

function museumWingsFor(entry: BugDexEntry, habitats: readonly BugProgressionHabitat[]): readonly BugProgressionMuseumWingId[] {
  const wings = new Set<BugProgressionMuseumWingId>();
  const id = entry.id;

  if (entry.insect === "beetle" || entry.insect === "ladybug" || /kever|tor|scarabee|lieveheers/.test(id)) wings.add("beetles");
  if (entry.insect === "dragonfly" || entry.insect === "grasshopper" || /vlinder|mot|vlieg|mug|libel|juffer|wesp|bij|hommel|sprinkhaan|cicade/.test(id)) wings.add("wings");
  if (habitats.includes("Water")) wings.add("water");
  if (habitats.includes("Nacht")) wings.add("night");
  if (entry.insect === "crawler" || entry.insect === "larva" || /spin|schorpioen|duizendpoot|pissebed|luis|teek|mijt|worm|rups|slak|springstaart|miljoenpoot|mier|termiet/.test(id)) wings.add("crawlers");

  if (wings.size === 0) wings.add(entry.insect === "beetle" || entry.insect === "ladybug" ? "beetles" : "wings");
  wings.add("crown");
  return Object.freeze(Array.from(wings));
}

function buildDefinition(entry: BugDexEntry): BugProgressionDefinition {
  const habitats = habitatsFor(entry);
  return Object.freeze({
    bugId: entry.id,
    ...acquisitionFor(entry),
    habitats,
    museumWings: museumWingsFor(entry, habitats),
    verifiedScanUnlock: "exact_species"
  });
}

export const bugProgressionCatalog: readonly BugProgressionDefinition[] = Object.freeze(bugDexEntries.map(buildDefinition));

const progressionByBugId = new Map(bugProgressionCatalog.map((definition) => [definition.bugId, definition]));

export function bugProgressionDefinitionById(bugId: string): BugProgressionDefinition | undefined {
  return progressionByBugId.get(bugId);
}
