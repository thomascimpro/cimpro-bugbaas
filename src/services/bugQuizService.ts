export type BugQuizLanguage = "nl" | "en" | "fr";

type LocalizedText = Record<BugQuizLanguage, string>;
type BugQuizTopic = "habitat" | "diet" | "activity" | "group" | "special";

type BugKnowledgeProfile = {
  id: string;
  name: LocalizedText;
  habitat: LocalizedText;
  diet: LocalizedText;
  activity: LocalizedText;
  group: LocalizedText;
  special: LocalizedText;
};

export type BugQuizDifficulty = "easy" | "medium" | "hard";
export type BugQuizCategory =
  | "bizarre_fact"
  | "myth_or_truth"
  | "identify_bug"
  | "field_scenario"
  | "appearance"
  | "habitat_behavior"
  | "local_species"
  | "expert_challenge";

export type BugQuizQuestion = {
  id: string;
  question: string;
  answer: string;
  options: string[];
  explanation: string;
  difficulty: BugQuizDifficulty;
  rewardPoints: number;
  topic: BugQuizTopic;
  category: BugQuizCategory;
  categoryLabel: string;
};

const PROFILES: BugKnowledgeProfile[] = [
  { id: "ant", name: { nl: "de mier", en: "the ant", fr: "la fourmi" }, habitat: { nl: "in kolonies in nesten", en: "in colonies inside nests", fr: "en colonies dans des nids" }, diet: { nl: "suikers, zaden en kleine dieren", en: "sugars, seeds and small animals", fr: "des sucres, graines et petits animaux" }, activity: { nl: "overdag en soms 's nachts", en: "during the day and sometimes at night", fr: "le jour et parfois la nuit" }, group: { nl: "vliesvleugeligen", en: "hymenopterans", fr: "hymenopteres" }, special: { nl: "communiceert met geursporen", en: "communicates using scent trails", fr: "communique avec des pistes odorantes" } },
  { id: "honeybee", name: { nl: "de honingbij", en: "the honey bee", fr: "l'abeille domestique" }, habitat: { nl: "in een bijenvolk", en: "in a bee colony", fr: "dans une colonie" }, diet: { nl: "nectar en stuifmeel", en: "nectar and pollen", fr: "du nectar et du pollen" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "vliesvleugeligen", en: "hymenopterans", fr: "hymenopteres" }, special: { nl: "vertelt met een dans waar voedsel ligt", en: "uses a dance to show where food is", fr: "danse pour indiquer une source de nourriture" } },
  { id: "ladybird", name: { nl: "het lieveheersbeestje", en: "the ladybird", fr: "la coccinelle" }, habitat: { nl: "op planten met bladluizen", en: "on plants with aphids", fr: "sur les plantes avec des pucerons" }, diet: { nl: "vooral bladluizen", en: "mainly aphids", fr: "surtout des pucerons" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "kevers", en: "beetles", fr: "coleopteres" }, special: { nl: "klapt harde dekschilden open om te vliegen", en: "opens hard wing cases to fly", fr: "ouvre ses elytres durs pour voler" } },
  { id: "dragonfly", name: { nl: "de libel", en: "the dragonfly", fr: "la libellule" }, habitat: { nl: "bij vijvers, sloten en rivieren", en: "near ponds, ditches and rivers", fr: "pres des etangs, fosses et rivieres" }, diet: { nl: "vliegende insecten", en: "flying insects", fr: "des insectes volants" }, activity: { nl: "overdag", en: "during the day", fr: "le jour" }, group: { nl: "libellen", en: "odonates", fr: "odonates" }, special: { nl: "kan bijna stil in de lucht hangen", en: "can hover almost motionless", fr: "peut presque rester immobile en vol" } },
  { id: "butterfly", name: { nl: "de dagvlinder", en: "the butterfly", fr: "le papillon de jour" }, habitat: { nl: "op bloemrijke zonnige plekken", en: "in sunny flower-rich places", fr: "dans des lieux ensoleilles riches en fleurs" }, diet: { nl: "meestal nectar", en: "mostly nectar", fr: "principalement du nectar" }, activity: { nl: "overdag", en: "during the day", fr: "le jour" }, group: { nl: "vlinders", en: "lepidopterans", fr: "lepidopteres" }, special: { nl: "proeft ook met zintuigen aan de poten", en: "also tastes with sensors on its feet", fr: "goute aussi avec des capteurs sur ses pattes" } },
  { id: "moth", name: { nl: "de nachtvlinder", en: "the moth", fr: "le papillon de nuit" }, habitat: { nl: "in tuinen, bossen en graslanden", en: "in gardens, woods and grasslands", fr: "dans les jardins, bois et prairies" }, diet: { nl: "vaak nectar; sommige volwassen soorten eten niet", en: "often nectar; some adults do not feed", fr: "souvent du nectar; certains adultes ne mangent pas" }, activity: { nl: "meestal 's nachts", en: "mostly at night", fr: "principalement la nuit" }, group: { nl: "vlinders", en: "lepidopterans", fr: "lepidopteres" }, special: { nl: "kan licht waarnemen met zeer gevoelige ogen", en: "detects light with very sensitive eyes", fr: "detecte la lumiere avec des yeux tres sensibles" } },
  { id: "grasshopper", name: { nl: "de sprinkhaan", en: "the grasshopper", fr: "la sauterelle" }, habitat: { nl: "in graslanden en ruige bermen", en: "in grasslands and rough verges", fr: "dans les prairies et accotements" }, diet: { nl: "vooral planten", en: "mainly plants", fr: "principalement des plantes" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "rechtvleugeligen", en: "orthopterans", fr: "orthopteres" }, special: { nl: "springt met sterk vergrote achterpoten", en: "jumps with enlarged hind legs", fr: "saute avec de grandes pattes arriere" } },
  { id: "cricket", name: { nl: "de krekel", en: "the cricket", fr: "le grillon" }, habitat: { nl: "op warme beschutte plekken", en: "in warm sheltered places", fr: "dans des endroits chauds et abrites" }, diet: { nl: "plantenresten en kleine dieren", en: "plant remains and small animals", fr: "des debris vegetaux et petits animaux" }, activity: { nl: "vaak 's avonds en 's nachts", en: "often in the evening and at night", fr: "souvent le soir et la nuit" }, group: { nl: "rechtvleugeligen", en: "orthopterans", fr: "orthopteres" }, special: { nl: "maakt geluid door vleugels langs elkaar te strijken", en: "chirps by rubbing its wings together", fr: "chante en frottant ses ailes" } },
  { id: "praying-mantis", name: { nl: "de bidsprinkhaan", en: "the praying mantis", fr: "la mante religieuse" }, habitat: { nl: "tussen hoge planten in warme gebieden", en: "among tall plants in warm regions", fr: "parmi les hautes plantes des regions chaudes" }, diet: { nl: "andere kleine dieren", en: "other small animals", fr: "d'autres petits animaux" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "bidsprinkhanen", en: "mantises", fr: "mantes" }, special: { nl: "grijpt prooien met stekelige voorpoten", en: "grabs prey with spiny front legs", fr: "saisit ses proies avec des pattes avant epineuses" } },
  { id: "earwig", name: { nl: "de oorworm", en: "the earwig", fr: "le perce-oreille" }, habitat: { nl: "onder stenen, hout en bladeren", en: "under stones, wood and leaves", fr: "sous les pierres, le bois et les feuilles" }, diet: { nl: "plantenresten en kleine dieren", en: "plant remains and small animals", fr: "des debris vegetaux et petits animaux" }, activity: { nl: "vooral 's nachts", en: "mainly at night", fr: "surtout la nuit" }, group: { nl: "oorwormen", en: "earwigs", fr: "dermapteres" }, special: { nl: "verzorgt als moeder haar eieren en jongen", en: "the mother guards her eggs and young", fr: "la mere protege ses oeufs et ses jeunes" } },
  { id: "firefly", name: { nl: "de glimworm", en: "the firefly", fr: "le ver luisant" }, habitat: { nl: "in vochtige graslanden en bosranden", en: "in damp grasslands and woodland edges", fr: "dans les prairies humides et lisieres" }, diet: { nl: "als larve vaak slakken", en: "often snails as a larva", fr: "souvent des escargots a l'etat larvaire" }, activity: { nl: "in de schemering en nacht", en: "at dusk and at night", fr: "au crepuscule et la nuit" }, group: { nl: "kevers", en: "beetles", fr: "coleopteres" }, special: { nl: "maakt koud licht met een chemische reactie", en: "makes cold light through a chemical reaction", fr: "produit une lumiere froide par reaction chimique" } },
  { id: "stag-beetle", name: { nl: "het vliegend hert", en: "the stag beetle", fr: "le lucane cerf-volant" }, habitat: { nl: "bij oud loofhout en dood hout", en: "near old broadleaf trees and dead wood", fr: "pres des vieux feuillus et du bois mort" }, diet: { nl: "boomsappen en als larve rottend hout", en: "tree sap and, as a larva, decaying wood", fr: "de la seve et, larve, du bois pourri" }, activity: { nl: "vooral in warme avonduren", en: "mainly on warm evenings", fr: "surtout les soirs chauds" }, group: { nl: "kevers", en: "beetles", fr: "coleopteres" }, special: { nl: "het mannetje heeft geweivormige kaken", en: "the male has antler-shaped jaws", fr: "le male porte des mandibules en bois de cerf" } },
  { id: "weevil", name: { nl: "de snuitkever", en: "the weevil", fr: "le charancon" }, habitat: { nl: "op en rond waardplanten", en: "on and around host plants", fr: "sur et autour des plantes hotes" }, diet: { nl: "plantendelen", en: "plant material", fr: "des parties de plantes" }, activity: { nl: "afhankelijk van de soort overdag of 's nachts", en: "by day or night depending on the species", fr: "le jour ou la nuit selon l'espece" }, group: { nl: "kevers", en: "beetles", fr: "coleopteres" }, special: { nl: "heeft monddelen aan het einde van een snuit", en: "has mouthparts at the end of a snout", fr: "porte ses pieces buccales au bout d'un rostre" } },
  { id: "water-strider", name: { nl: "de schaatsenrijder", en: "the water strider", fr: "le gerris" }, habitat: { nl: "op het oppervlak van rustig water", en: "on the surface of calm water", fr: "a la surface des eaux calmes" }, diet: { nl: "kleine dieren op en bij het water", en: "small animals on and near the water", fr: "de petits animaux sur et pres de l'eau" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "wantsen", en: "true bugs", fr: "hemipteres" }, special: { nl: "verdeelt zijn gewicht over waterafstotende poten", en: "spreads its weight across water-repellent legs", fr: "repartit son poids sur des pattes hydrophobes" } },
  { id: "shieldbug", name: { nl: "de schildwants", en: "the shieldbug", fr: "la punaise des bois" }, habitat: { nl: "op struiken, bomen en kruiden", en: "on shrubs, trees and herbs", fr: "sur les arbustes, arbres et herbes" }, diet: { nl: "meestal plantensappen", en: "mostly plant sap", fr: "principalement de la seve" }, activity: { nl: "vooral overdag", en: "mainly during the day", fr: "surtout le jour" }, group: { nl: "wantsen", en: "true bugs", fr: "hemipteres" }, special: { nl: "kan een sterke verdedigingsgeur afgeven", en: "can release a strong defensive smell", fr: "peut liberer une forte odeur defensive" } },
  { id: "aphid", name: { nl: "de bladluis", en: "the aphid", fr: "le puceron" }, habitat: { nl: "op jonge stengels en bladeren", en: "on young stems and leaves", fr: "sur les jeunes tiges et feuilles" }, diet: { nl: "plantensap", en: "plant sap", fr: "de la seve" }, activity: { nl: "zolang planten groeien", en: "while plants are growing", fr: "pendant la croissance des plantes" }, group: { nl: "wantsen", en: "true bugs", fr: "hemipteres" }, special: { nl: "kan honingdauw produceren waar mieren op afkomen", en: "can produce honeydew that attracts ants", fr: "produit du miellat qui attire les fourmis" } },
  { id: "lacewing", name: { nl: "de gaasvlieg", en: "the lacewing", fr: "la chrysope" }, habitat: { nl: "in tuinen, struiken en bosranden", en: "in gardens, shrubs and woodland edges", fr: "dans les jardins, arbustes et lisieres" }, diet: { nl: "als larve vaak bladluizen", en: "often aphids as a larva", fr: "souvent des pucerons a l'etat larvaire" }, activity: { nl: "voor veel soorten vooral in de schemering", en: "mainly at dusk for many species", fr: "surtout au crepuscule pour beaucoup d'especes" }, group: { nl: "netvleugeligen", en: "neuropterans", fr: "nevroptères" }, special: { nl: "heeft fijn geaderde doorzichtige vleugels", en: "has finely veined transparent wings", fr: "possede des ailes transparentes finement nervurees" } },
  { id: "hoverfly", name: { nl: "de zweefvlieg", en: "the hoverfly", fr: "le syrphe" }, habitat: { nl: "bij bloemen in tuinen en graslanden", en: "near flowers in gardens and grasslands", fr: "pres des fleurs dans jardins et prairies" }, diet: { nl: "nectar en stuifmeel", en: "nectar and pollen", fr: "du nectar et du pollen" }, activity: { nl: "overdag", en: "during the day", fr: "le jour" }, group: { nl: "vliegen", en: "flies", fr: "mouches" }, special: { nl: "lijkt op een wesp maar heeft maar een vleugelpaar", en: "resembles a wasp but has only one pair of wings", fr: "ressemble a une guepe mais n'a qu'une paire d'ailes" } },
  { id: "mosquito", name: { nl: "de steekmug", en: "the mosquito", fr: "le moustique" }, habitat: { nl: "bij stilstaand water waar larven leven", en: "near still water where larvae live", fr: "pres des eaux stagnantes ou vivent les larves" }, diet: { nl: "nectar; vrouwtjes van sommige soorten nemen ook bloed", en: "nectar; females of some species also take blood", fr: "du nectar; certaines femelles prennent aussi du sang" }, activity: { nl: "vaak rond schemering en nacht", en: "often around dusk and at night", fr: "souvent au crepuscule et la nuit" }, group: { nl: "vliegen", en: "flies", fr: "mouches" }, special: { nl: "neemt trillingen en geurstoffen zeer goed waar", en: "detects vibrations and scents very well", fr: "detecte tres bien vibrations et odeurs" } },
  { id: "mayfly", name: { nl: "de haft", en: "the mayfly", fr: "l'ephemere" }, habitat: { nl: "bij schoon zoet water", en: "near clean fresh water", fr: "pres des eaux douces propres" }, diet: { nl: "als nimf kleine deeltjes; volwassen vaak niets", en: "small particles as a nymph; often nothing as an adult", fr: "de petites particules comme larve; souvent rien adulte" }, activity: { nl: "als volwassene vaak kort rond schemering", en: "briefly around dusk as an adult", fr: "souvent brievement au crepuscule a l'age adulte" }, group: { nl: "haften", en: "mayflies", fr: "ephemeropteres" }, special: { nl: "brengt het grootste deel van zijn leven onder water door", en: "spends most of its life underwater", fr: "passe la majeure partie de sa vie sous l'eau" } }
];

const TOPICS: BugQuizTopic[] = ["habitat", "diet", "activity", "group", "special"];

const INSECT_ORDER_BY_PROFILE_ID: Record<string, string> = {
  ant: "Hymenoptera",
  honeybee: "Hymenoptera",
  ladybird: "Coleoptera",
  dragonfly: "Odonata",
  butterfly: "Lepidoptera",
  moth: "Lepidoptera",
  grasshopper: "Orthoptera",
  cricket: "Orthoptera",
  "praying-mantis": "Mantodea",
  earwig: "Dermaptera",
  firefly: "Coleoptera",
  "stag-beetle": "Coleoptera",
  weevil: "Coleoptera",
  "water-strider": "Hemiptera",
  shieldbug: "Hemiptera",
  aphid: "Hemiptera",
  lacewing: "Neuroptera",
  hoverfly: "Diptera",
  mosquito: "Diptera",
  mayfly: "Ephemeroptera"
};
const CATEGORIES: BugQuizCategory[] = [
  "bizarre_fact",
  "myth_or_truth",
  "identify_bug",
  "field_scenario",
  "appearance",
  "habitat_behavior",
  "local_species",
  "expert_challenge"
];

const QUESTION_VARIANT_COUNT = 10;

const TOPIC_SUBJECTS: Record<BugQuizLanguage, Record<BugQuizTopic, string>> = {
  nl: {
    habitat: "het leefgebied",
    diet: "het voedsel",
    activity: "de actieve periode",
    group: "de insectenorde",
    special: "de bijzondere eigenschap"
  },
  en: {
    habitat: "the habitat",
    diet: "the diet",
    activity: "the active period",
    group: "the insect order",
    special: "the special trait"
  },
  fr: {
    habitat: "l'habitat",
    diet: "l'alimentation",
    activity: "la periode d'activite",
    group: "l'ordre d'insectes",
    special: "la particularite"
  }
};

const TOPIC_QUESTION_TEMPLATES: Record<BugQuizLanguage, string[]> = {
  nl: [
    "Welke optie beschrijft {subject} van {name} correct?",
    "Wat klopt over {subject} van {name}?",
    "Welke uitspraak over {subject} van {name} is juist?",
    "Wat is correct over {subject} van {name}?",
    "Welke informatie over {subject} hoort bij {name}?",
    "Wat hoort bij {name} als het gaat om {subject}?",
    "Welke beschrijving van {subject} past bij {name}?",
    "Wat weet je over {subject} van {name}?",
    "Welke keuze past bij {name} voor {subject}?",
    "Welke optie geeft {subject} van {name} juist weer?"
  ],
  en: [
    "Which option correctly describes {subject} of {name}?",
    "What is true about {subject} of {name}?",
    "Which statement about {subject} of {name} is correct?",
    "What is correct about {subject} of {name}?",
    "Which information about {subject} belongs to {name}?",
    "What applies to {name} regarding {subject}?",
    "Which description of {subject} fits {name}?",
    "What do you know about {subject} of {name}?",
    "Which choice fits {name} for {subject}?",
    "Which option gives {subject} of {name} correctly?"
  ],
  fr: [
    "Quelle option decrit correctement {subject} de {name} ?",
    "Que sait-on de {subject} de {name} ?",
    "Quelle affirmation sur {subject} de {name} est correcte ?",
    "Quelle information sur {subject} de {name} est juste ?",
    "Quelle information sur {subject} correspond a {name} ?",
    "Que faut-il choisir pour {name} concernant {subject} ?",
    "Quelle description de {subject} convient a {name} ?",
    "Que peut-on dire de {subject} de {name} ?",
    "Quelle option correspond a {subject} de {name} ?",
    "Quelle proposition decrit {subject} de {name} ?"
  ]
};

const IDENTIFICATION_QUESTION_TEMPLATES: Record<BugQuizLanguage, string[]> = {
  nl: [
    "Welk insect past bij deze kenmerken: het {fact1} en het {fact2}?",
    "Welk insect herken je aan deze combinatie: het {fact2} en het {fact1}?",
    "Welk insect wordt beschreven: het {fact1} en het {fact2}?",
    "Welk insect hoort bij deze observatie: het {fact1} en het {fact2}?",
    "Welk insect past bij dit profiel: het {fact1} en het {fact2}?",
    "Welk insect kan dit zijn: het {fact1} en het {fact2}?",
    "Welk insect zoek je bij deze aanwijzingen: het {fact1} en het {fact2}?",
    "Welk insect past bij beide feiten: het {fact1} en het {fact2}?",
    "Welk insect beschrijven deze kenmerken: het {fact1} en het {fact2}?",
    "Welk insect heeft deze kenmerken: het {fact1} en het {fact2}?"
  ],
  en: [
    "Which insect {fact1} and {fact2}?",
    "Which insect can you recognize because it {fact2} and {fact1}?",
    "Which insect is meant if it {fact1} and {fact2}?",
    "Which insect can you recognize because it {fact1} and {fact2}?",
    "Which insect fits if it {fact1} and {fact2}?",
    "Which insect could this be if it {fact1} and {fact2}?",
    "Which insect are you looking for if it {fact1} and {fact2}?",
    "Which insect fits because it {fact1} and {fact2}?",
    "Which insect would you describe if it {fact1} and {fact2}?",
    "Which insect has these traits: it {fact1} and {fact2}?"
  ],
  fr: [
    "Quel insecte {fact1} et {fact2} ?",
    "Quel insecte reconnait-on parce qu'il {fact2} et {fact1} ?",
    "Quel insecte est vise s'il {fact1} et {fact2} ?",
    "Quel insecte reconnait-on parce qu'il {fact1} et {fact2} ?",
    "Quel insecte correspond s'il {fact1} et {fact2} ?",
    "Quel insecte cela peut-il etre s'il {fact1} et {fact2} ?",
    "Quel insecte cherche-t-on s'il {fact1} et {fact2} ?",
    "Quel insecte convient s'il {fact1} et {fact2} ?",
    "Quel insecte decrit-on s'il {fact1} et {fact2} ?",
    "Quel insecte a ces traits : il {fact1} et {fact2} ?"
  ]
};

const MYTH_QUESTION_TEMPLATES: Record<BugQuizLanguage, string[]> = {
  nl: [
    "Waar of onwaar: {statement}?",
    "Waar of onwaar: klopt het dat {statement}?",
    "Waar of onwaar: is het juist dat {statement}?",
    "Waar of onwaar: kan het kloppen dat {statement}?",
    "Waar of onwaar: is deze uitspraak correct: {statement}?",
    "Waar of onwaar: is dit een feit: {statement}?",
    "Waar of onwaar: geldt dat {statement}?",
    "Waar of onwaar: is deze bewering juist: {statement}?",
    "Waar of onwaar: mag je zeggen dat {statement}?",
    "Waar of onwaar: klopt deze bewering: {statement}?"
  ],
  en: [
    "True or false: {statement}?",
    "True or false: is it correct that {statement}?",
    "True or false: is it true that {statement}?",
    "True or false: could it be correct that {statement}?",
    "True or false: is this statement correct: {statement}?",
    "True or false: is this a fact: {statement}?",
    "True or false: does it hold that {statement}?",
    "True or false: is this claim right: {statement}?",
    "True or false: can you say that {statement}?",
    "True or false: is this claim correct: {statement}?"
  ],
  fr: [
    "Vrai ou faux : {statement} ?",
    "Vrai ou faux : est-il correct que {statement} ?",
    "Vrai ou faux : est-il vrai que {statement} ?",
    "Vrai ou faux : cela peut-il etre correct que {statement} ?",
    "Vrai ou faux : cette affirmation est-elle correcte : {statement} ?",
    "Vrai ou faux : est-ce un fait : {statement} ?",
    "Vrai ou faux : peut-on affirmer que {statement} ?",
    "Vrai ou faux : cette proposition est-elle juste : {statement} ?",
    "Vrai ou faux : peut-on dire que {statement} ?",
    "Vrai ou faux : cette affirmation est-elle juste : {statement} ?"
  ]
};

const EXPERT_QUESTION_TEMPLATES: Record<BugQuizLanguage, string[]> = {
  nl: [
    "Het {fact}. Tot welke insectenorde behoort {name}?",
    "Het {fact}. Welke insectenorde hoort bij {name}?",
    "Het {fact}. Bij welke insectenorde hoort {name}?",
    "Het {fact}. Tot welke orde reken je {name}?",
    "Het {fact}. Welke insectenorde bevat {name}?",
    "Het {fact}. Bij welke insectenorde plaats je {name}?",
    "Het {fact}. Welke taxonomische orde hoort bij {name}?",
    "Het {fact}. Tot welke insectenorde reken je {name}?",
    "Het {fact}. Welke insectenorde is correct voor {name}?",
    "Het {fact}. Bij welke orde hoort {name}?"
  ],
  en: [
    "It {fact}. Which insect order includes {name}?",
    "It {fact}. Which insect order fits {name}?",
    "It {fact}. Which insect order does {name} belong to?",
    "It {fact}. Which order includes {name}?",
    "It {fact}. Which insect order contains {name}?",
    "It {fact}. Which insect order would you place {name} in?",
    "It {fact}. Which taxonomic order fits {name}?",
    "It {fact}. Which insect order should include {name}?",
    "It {fact}. Which insect order is correct for {name}?",
    "It {fact}. Which order does {name} belong to?"
  ],
  fr: [
    "Il {fact}. A quel ordre d'insectes appartient {name} ?",
    "Il {fact}. Quel ordre d'insectes correspond a {name} ?",
    "Il {fact}. A quel ordre appartient {name} ?",
    "Il {fact}. Dans quel ordre classe-t-on {name} ?",
    "Il {fact}. Quel ordre d'insectes contient {name} ?",
    "Il {fact}. Dans quel ordre placer {name} ?",
    "Il {fact}. Quel ordre taxonomique correspond a {name} ?",
    "Il {fact}. A quel ordre d'insectes rattacher {name} ?",
    "Il {fact}. Quel ordre est correct pour {name} ?",
    "Il {fact}. A quel ordre appartient {name} ?"
  ]
};

const CATEGORY_LABELS: Record<BugQuizLanguage, Record<BugQuizCategory, string>> = {
  nl: {
    bizarre_fact: "Insectenfeit",
    myth_or_truth: "Mythe of waarheid",
    identify_bug: "Raad het insect",
    field_scenario: "Veldsituatie",
    appearance: "Kenmerk herkennen",
    habitat_behavior: "Leefwijze & kenmerken",
    local_species: "Insecten dichtbij",
    expert_challenge: "Expertvraag"
  },
  en: {
    bizarre_fact: "Bug fact",
    myth_or_truth: "Myth or truth",
    identify_bug: "Guess the insect",
    field_scenario: "Field scenario",
    appearance: "Recognize a trait",
    habitat_behavior: "Life & traits",
    local_species: "Bugs near you",
    expert_challenge: "Expert question"
  },
  fr: {
    bizarre_fact: "Fait sur l'insecte",
    myth_or_truth: "Mythe ou verite",
    identify_bug: "Devine l'insecte",
    field_scenario: "Situation de terrain",
    appearance: "Reconnaitre un trait",
    habitat_behavior: "Mode de vie et traits",
    local_species: "Insectes proches",
    expert_challenge: "Question experte"
  }
};

const TRUE_FALSE: Record<BugQuizLanguage, [string, string]> = {
  nl: ["Waar", "Onwaar"],
  en: ["True", "False"],
  fr: ["Vrai", "Faux"]
};

function profileTopicValue(profile: BugKnowledgeProfile, topic: BugQuizTopic, language: BugQuizLanguage): string {
  return topic === "group" ? INSECT_ORDER_BY_PROFILE_ID[profile.id] : profile[topic][language];
}

function sentenceStart(value: string): string {
  return value.length === 0 ? value : `${value[0].toLocaleUpperCase()}${value.slice(1)}`;
}

function buildAnonymousFact(language: BugQuizLanguage, topic: BugQuizTopic, value: string): string {
  if (topic === "special" && language === "en" && value === "the mother guards her eggs and young") {
    return "shows maternal care for eggs and young";
  }
  if (topic === "special" && language === "fr" && value === "la mere protege ses oeufs et ses jeunes") {
    return "montre des soins maternels aux oeufs et aux jeunes";
  }
  if (language === "en") {
    if (topic === "habitat") return `lives ${value}`;
    if (topic === "diet") return `eats ${value}`;
    if (topic === "activity") return `is active ${value}`;
    if (topic === "group") return `belongs to ${value}`;
    return value;
  }
  if (language === "fr") {
    if (topic === "habitat") return `vit ${value}`;
    if (topic === "diet") return `mange ${value}`;
    if (topic === "activity") return `est actif ${value}`;
    if (topic === "group") return `appartient au groupe des ${value}`;
    return value;
  }
  if (topic === "habitat") return `leeft ${value}`;
  if (topic === "diet") return `eet ${value}`;
  if (topic === "activity") return `is ${value} actief`;
  if (topic === "group") return `hoort bij ${value}`;
  return value;
}

function buildNamedStatement(language: BugQuizLanguage, name: string, topic: BugQuizTopic, value: string): string {
  if (language === "fr" && topic === "activity") return `l'activite de ${name} a lieu ${value}`;
  if (language === "en" && topic === "special" && value === "the mother guards her eggs and young") {
    return `for ${name}, the mother guards her eggs and young`;
  }
  if (language === "fr" && topic === "special" && value === "la mere protege ses oeufs et ses jeunes") {
    return `chez ${name}, la mere protege ses oeufs et ses jeunes`;
  }
  return `${name} ${buildAnonymousFact(language, topic, value)}`;
}

function buildTopicQuestion(
  language: BugQuizLanguage,
  profile: BugKnowledgeProfile,
  topic: BugQuizTopic,
  templateIndex: number
): string {
  return TOPIC_QUESTION_TEMPLATES[language][templateIndex]
    .replace("{subject}", TOPIC_SUBJECTS[language][topic])
    .replace("{name}", profile.name[language]);
}

function buildIdentificationQuestion(
  language: BugQuizLanguage,
  fact1: string,
  fact2: string,
  templateIndex: number
): string {
  return IDENTIFICATION_QUESTION_TEMPLATES[language][templateIndex]
    .replace("{fact1}", fact1)
    .replace("{fact2}", fact2);
}

function buildMythQuestion(
  language: BugQuizLanguage,
  statement: string,
  templateIndex: number
): string {
  return MYTH_QUESTION_TEMPLATES[language][templateIndex]
    .replace("{statement}", statement);
}

function buildExpertQuestion(
  language: BugQuizLanguage,
  name: string,
  fact: string,
  templateIndex: number
): string {
  return EXPERT_QUESTION_TEMPLATES[language][templateIndex]
    .replace("{name}", name)
    .replace("{fact}", fact);
}

export const BUG_QUIZ_QUESTION_COUNT = PROFILES.length * TOPICS.length * QUESTION_VARIANT_COUNT;

export function getBugQuizQuestion(index: number, language: BugQuizLanguage): BugQuizQuestion {
  const normalizedIndex = ((Math.floor(index) % BUG_QUIZ_QUESTION_COUNT) + BUG_QUIZ_QUESTION_COUNT) % BUG_QUIZ_QUESTION_COUNT;
  const templatesPerProfile = TOPICS.length * QUESTION_VARIANT_COUNT;
  const profileIndex = Math.floor(normalizedIndex / templatesPerProfile);
  const profile = PROFILES[profileIndex];
  const profileOffset = normalizedIndex % templatesPerProfile;
  const topic = TOPICS[Math.floor(profileOffset / QUESTION_VARIANT_COUNT)];
  const templateIndex = profileOffset % QUESTION_VARIANT_COUNT;
  const category = CATEGORIES[normalizedIndex % CATEGORIES.length];

  const uniqueValues = (values: string[], answer: string) => values
    .filter((value, valueIndex, allValues) => value !== answer && allValues.indexOf(value) === valueIndex);
  const rotateOptions = (answer: string, distractors: string[]) => {
    const start = (normalizedIndex * 7) % distractors.length;
    const ordered = [...distractors.slice(start), ...distractors.slice(0, start)];
    const options = [answer, ...ordered.slice(0, 3)];
    const rotation = normalizedIndex % options.length;
    return [...options.slice(rotation), ...options.slice(0, rotation)];
  };
  const nameDistractors = uniqueValues(PROFILES.map((candidate) => candidate.name[language]), profile.name[language]);
  const topicAnswer = profileTopicValue(profile, topic, language);
  const topicDistractors = uniqueValues(PROFILES.map((candidate) => profileTopicValue(candidate, topic, language)), topicAnswer);
  const alternateTopic: BugQuizTopic = topic === "special" ? "habitat" : "special";
  const alternateAnswer = profile[alternateTopic][language];
  const topicFact = buildAnonymousFact(language, topic, topicAnswer);
  const alternateFact = buildAnonymousFact(language, alternateTopic, alternateAnswer);

  let question = buildTopicQuestion(language, profile, topic, templateIndex);
  let answer = topicAnswer;
  let options = rotateOptions(answer, topicDistractors);
  let explanation = "";
  let difficulty: BugQuizDifficulty = "medium";

  if (category === "bizarre_fact") {
    difficulty = "easy";
  } else if (category === "myth_or_truth") {
    const trueStatement = Math.floor(normalizedIndex / CATEGORIES.length) % 2 === 0;
    const claimValue = trueStatement ? topicAnswer : topicDistractors[(normalizedIndex * 3) % topicDistractors.length];
    answer = TRUE_FALSE[language][trueStatement ? 0 : 1];
    options = [...TRUE_FALSE[language]];
    if (templateIndex % 2 === 1) options.reverse();
    question = buildMythQuestion(
      language,
      buildNamedStatement(language, profile.name[language], topic, claimValue),
      templateIndex
    );
    difficulty = "easy";
  } else if (category === "identify_bug" || category === "field_scenario" || category === "local_species") {
    answer = profile.name[language];
    options = rotateOptions(answer, nameDistractors);
    question = buildIdentificationQuestion(language, topicFact, alternateFact, templateIndex);
    difficulty = category === "local_species" ? "easy" : "medium";
  } else if (category === "appearance") {
    difficulty = "medium";
  } else if (category === "habitat_behavior") {
    difficulty = "easy";
  } else {
    answer = profileTopicValue(profile, "group", language);
    options = rotateOptions(answer, uniqueValues(PROFILES.map((candidate) => profileTopicValue(candidate, "group", language)), answer));
    const expertHint = topic === "group" ? alternateFact : topicFact;
    question = buildExpertQuestion(language, profile.name[language], expertHint, templateIndex);
    difficulty = "hard";
  }

  const explanationName = sentenceStart(profile.name[language]);
  explanation = language === "en"
    ? `Answer: ${answer}. ${explanationName} lives ${profile.habitat[language]} and ${profile.special[language]}.`
    : language === "fr"
      ? `Reponse : ${answer}. ${explanationName} vit ${profile.habitat[language]} et ${profile.special[language]}.`
      : `Antwoord: ${answer}. ${explanationName} leeft ${profile.habitat[language]} en ${profile.special[language]}.`;

  return {
    id: `${profile.id}-${topic}-${templateIndex}`,
    question,
    answer,
    options,
    explanation,
    difficulty,
    rewardPoints: difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1,
    topic,
    category,
    categoryLabel: CATEGORY_LABELS[language][category]
  };
}

export function getRandomBugQuizQuestion(language: BugQuizLanguage, random: () => number = Math.random): BugQuizQuestion {
  const value = random();
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
  return getBugQuizQuestion(Math.floor(safeValue * BUG_QUIZ_QUESTION_COUNT), language);
}
