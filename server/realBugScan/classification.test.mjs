import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import catalog from "../../shared/bugdex-catalog.json" with { type: "json" };
import { buildBugCatalogPrompt, dayKeyInTimeZone, normalizeIdentification } from "./classification.mjs";

test("accepts a high-confidence BugDex match", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "matched",
    matchedBugId: "lieveheersbeestje",
    commonName: "Lieveheersbeestje",
    scientificName: "Coccinellidae",
    confidence: 0.94,
    reason: "Rode kever met zwarte stippen."
  }, catalog);

  assert.equal(result.status, "matched");
  assert.equal(result.identification.bugId, "lieveheersbeestje");
});

test("accepts an exact BugDex match at seventy percent confidence", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "matched",
    matchedBugId: "mier",
    commonName: "Mier",
    scientificName: "Formicidae",
    confidence: 0.7,
    reason: "Zes poten, antennes en een duidelijke mierenvorm."
  }, catalog);

  assert.equal(result.status, "matched");
  assert.equal(result.identification.bugId, "mier");
});

test("accepts the screenshot case by exact catalog name even when the model is uncertain", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "poor",
    captureAuthenticity: "live",
    catalogStatus: "uncertain",
    matchedBugId: null,
    commonName: "groene vleesvlieg",
    scientificName: "Lucilia sp.",
    fact: "{Volwassenen hebben een metaalgroene glans en bezoeken bloemen of kadavers.}",
    confidence: 0.85,
    reason: "Metalen groene thorax, grote facetogen en vleugels passen bij een vleesvlieg."
  }, catalog);

  assert.equal(result.status, "matched");
  assert.equal(result.identification.bugId, "groene-vleesvlieg");
  assert.equal(result.identification.commonName, "Groene vleesvlieg");
  assert.doesNotMatch(result.identification.fact, /^\{/);
});

test("accepts an exact catalog alias without forcing a nearest species", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "live",
    catalogStatus: "uncertain",
    matchedBugId: null,
    commonName: "Grote groene sabelsprinkhaan",
    scientificName: "Tettigonia viridissima",
    fact: "Deze soort heeft zeer lange antennes en een opvallend zwaardvormige legboor.",
    confidence: 0.82,
    reason: "De lichaamsvorm en kenmerken passen bij deze soort."
  }, catalog);

  assert.equal(result.status, "matched");
  assert.equal(result.identification.bugId, "groene-sabelsprinkhaan");
  assert.equal(result.identification.commonName, "Groene sabelsprinkhaan");
});

test("routes an invented BugDex id to review", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "uncertain",
    matchedBugId: "verzonnen-kever",
    commonName: "Onbekende kever",
    scientificName: "",
    confidence: 0.99,
    reason: "Geen geldige catalogusmatch."
  }, catalog);

  assert.equal(result.status, "pending_review");
  assert.equal(result.identification.bugId, null);
});

test("marks a confident named species outside the catalog as reward owed", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "not_in_catalog",
    matchedBugId: null,
    commonName: "Purperen langpootmug",
    commonNameEn: "Purple cranefly",
    commonNameFr: "Tipule pourpre",
    scientificName: "Tipula purpurata",
    fact: "Deze langpootmug heeft opvallend purper gekleurde vleugels.",
    factEn: "This species has many different color patterns.",
    factFr: "Cette espèce présente de nombreux motifs de couleur.",
    confidence: 0.92,
    reason: "De vorm en kleur passen bij deze specifieke soort."
  }, catalog);

  assert.equal(result.status, "not_in_catalog");
  assert.equal(result.identification.bugId, null);
  assert.equal(result.identification.scientificName, "Tipula purpurata");
  assert.match(result.identification.fact, /purper/);
});

test("records a concrete missing species at seventy percent confidence", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "not_in_catalog",
    matchedBugId: null,
    commonName: "Eikendoorncicade",
    scientificName: "Platycotis vittata",
    fact: "Deze cicade heeft een opvallend verlengd halsschild.",
    confidence: 0.7,
    reason: "De lichaamsvorm en tekening passen bij deze soort."
  }, catalog);

  assert.equal(result.status, "not_in_catalog");
});

test("keeps a confident broad taxon as a developer review instead of discarding the scan", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "live",
    commonName: "glanzende kever",
    scientificName: "Coleoptera",
    fact: "Kevers hebben verharde voorvleugels die de achtervleugels beschermen.",
    confidence: 0.82,
    reason: "De precieze soort is niet zichtbaar."
  }, catalog);

  assert.equal(result.status, "not_in_catalog");
  assert.equal(result.identification.bugId, null);
});

test("accepts a confident family or genus identification as a BugDex match or developer review", () => {
  for (const [commonName, scientificName, expectedStatus] of [
    ["donkere mier", "Formicidae", "not_in_catalog"],
    ["houtmier", "Camponotus sp.", "matched"],
    ["mestkever", "Scarabaeidae", "matched"],
    ["Pagevlinder", "Papilionidae", "not_in_catalog"]
  ]) {
    const result = normalizeIdentification({
      containsBug: true,
      imageQuality: "good",
      captureAuthenticity: "live",
      commonName,
      scientificName,
      fact: "Dit is een brede herkenning zonder voldoende soortkenmerken.",
      confidence: 0.9,
      reason: "De familie is zichtbaar, maar de soort niet."
    }, catalog);
    assert.equal(result.status, expectedStatus, `${scientificName} moet als herkende vondst worden bewaard`);
  }
});

test("matches a known BugDex species by scientific alias when the common name is broad", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "live",
    commonName: "Pagevlinder",
    scientificName: "Papilio machaon",
    fact: "De koninginnenpage heeft opvallende staartjes aan de achtervleugels.",
    confidence: 0.88,
    reason: "De vleugelvorm en tekening passen bij een koninginnenpage."
  }, catalog);

  assert.equal(result.status, "matched");
  assert.equal(result.identification.bugId, "koninginnenpage");
  assert.equal(result.identification.commonName, "Koninginnenpage");
});

test("recommends a confident specific missing species even when the model marks it uncertain", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "poor",
    captureAuthenticity: "live",
    catalogStatus: "uncertain",
    matchedBugId: null,
    commonName: "Purperen langpootmug",
    scientificName: "Tipula purpurata",
    fact: "Deze langpootmug heeft opvallend purper gekleurde vleugels.",
    confidence: 0.85,
    reason: "De vorm en kleur passen bij deze specifieke soort."
  }, catalog);

  assert.equal(result.status, "not_in_catalog");
  assert.equal(result.identification.bugId, null);
});

test("rejects a forced nearest BugDex match and stores it as a missing species", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "matched",
    matchedBugId: "langpootmug",
    commonName: "Purperen langpootmug",
    commonNameEn: "Purple cranefly",
    commonNameFr: "Tipule pourpre",
    scientificName: "Tipula purpurata",
    fact: "Deze langpootmug heeft opvallend purper gekleurde vleugels.",
    factEn: "This species has many different color patterns.",
    factFr: "Cette espèce présente de nombreux motifs de couleur.",
    confidence: 0.94,
    reason: "De specifieke soort is niet als eigen BugDex-entry aanwezig."
  }, catalog);

  assert.equal(result.status, "not_in_catalog");
  assert.equal(result.identification.bugId, null);
  assert.equal(result.identification.commonName, "Purperen langpootmug");
});

test("fills empty model text fields before returning the API contract", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "uncertain",
    matchedBugId: null,
    commonName: "   ",
    scientificName: "",
    confidence: 0.72,
    reason: "   "
  }, catalog);

  assert.equal(result.status, "pending_review");
  assert.equal(result.identification.commonName, "Onbekende bug");
  assert.equal(result.identification.reason, "De foto kon niet betrouwbaar worden beoordeeld.");
});

test("does not create reward debt for an uncertain unnamed bug", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "not_in_catalog",
    matchedBugId: null,
    commonName: "Onbekende bug",
    scientificName: "",
    confidence: 0.91,
    reason: "Te weinig kenmerken voor een soortnaam."
  }, catalog);

  assert.equal(result.status, "pending_review");
});

test("routes low-confidence known matches to review", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    catalogStatus: "matched",
    matchedBugId: "mier",
    commonName: "Mier",
    scientificName: "Formicidae",
    confidence: 0.61,
    reason: "Foto is onscherp."
  }, catalog);

  assert.equal(result.status, "pending_review");
  assert.equal(result.identification.bugId, "mier");
});

test("rejects images without a visible bug", () => {
  const result = normalizeIdentification({
    containsBug: false,
    imageQuality: "good",
    catalogStatus: "uncertain",
    matchedBugId: null,
    commonName: "Geen insect",
    scientificName: "",
    confidence: 0.97,
    reason: "Alleen een blad zichtbaar."
  }, catalog);

  assert.equal(result.status, "rejected_no_bug");
});

test("rejects a photographed screen before any high-value reward", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "reproduction",
    authenticityReason: "Visible monitor pixels and browser chrome.",
    catalogStatus: "matched",
    matchedBugId: "koningin-alexandravlinder",
    commonName: "Koningin-Alexandravlinder",
    scientificName: "Ornithoptera alexandrae",
    confidence: 0.99,
    reason: "De soort is herkenbaar op het scherm."
  }, catalog);

  assert.equal(result.status, "rejected_authenticity");
  assert.equal(result.identification.captureAuthenticity, "reproduction");
});

test("holds an ambiguous capture for review without consuming a reward", () => {
  const result = normalizeIdentification({
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "uncertain",
    authenticityReason: "Mogelijk moirepatroon, maar geen schermrand zichtbaar.",
    catalogStatus: "matched",
    matchedBugId: "mier",
    commonName: "Mier",
    scientificName: "Formicidae",
    confidence: 0.96,
    reason: "De mier is herkenbaar."
  }, catalog);

  assert.equal(result.status, "pending_review");
});

test("uses the same seventy percent threshold for legendary and mythic auto-awards", () => {
  const raw = {
    containsBug: true,
    imageQuality: "good",
    captureAuthenticity: "live",
    authenticityReason: "Physical subject with natural depth.",
    catalogStatus: "matched",
    matchedBugId: "koningin-alexandravlinder",
    commonName: "Koningin-Alexandravlinder",
    scientificName: "Ornithoptera alexandrae",
    reason: "Vleugelvorm en patroon komen overeen."
  };

  assert.equal(normalizeIdentification({ ...raw, confidence: 0.69 }, catalog).status, "pending_review");
  assert.equal(normalizeIdentification({ ...raw, confidence: 0.7 }, catalog).status, "matched");
});

test("builds Amsterdam day keys across the UTC day boundary", () => {
  assert.equal(dayKeyInTimeZone(new Date("2026-07-20T21:59:00.000Z")), "2026-07-20");
  assert.equal(dayKeyInTimeZone(new Date("2026-07-20T22:01:00.000Z")), "2026-07-21");
});

test("includes only compact catalog ids and names in the model prompt", () => {
  const prompt = buildBugCatalogPrompt(catalog.slice(0, 2));
  assert.match(prompt, /zilvervisje: Zilvervisje/);
  assert.match(prompt, /fruitvlieg: Fruitvlieg/);
  assert.doesNotMatch(prompt, /rarity/i);
});

test("keeps the scan catalog synchronized with BugDex entries", () => {
  const source = readFileSync(new URL("../../src/services/pointsService.ts", import.meta.url), "utf8");
  const expansionSource = readFileSync(new URL("../../src/services/bugDexExpansion.ts", import.meta.url), "utf8");
  const pilotSource = readFileSync(new URL("../../src/services/bugDexNederlandPilot.ts", import.meta.url), "utf8");
  const entriesSection = source.slice(source.indexOf("export const bugDexEntries"));
  const sourceIds = Array.from(entriesSection.matchAll(/\{ id: \"([^\"]+)\", name: \"([^\"]+)\", title:/g), (match) => match[1]);
  const idsFromTemplate = (name, limit) => {
    const match = expansionSource.match(new RegExp(`const ${name} = [^\\x60]*\\x60([\\s\\S]*?)\\x60`));
    assert.ok(match, `${name} expansion list is missing`);
    const ids = [...new Set(match[1].trim().split(/\s+/))];
    return Number.isFinite(limit) ? ids.slice(0, limit) : ids;
  };
  sourceIds.push(
    ...idsFromTemplate("commonIds", 80),
    ...idsFromTemplate("rareIds", 85),
    ...idsFromTemplate("epicIds", 60),
    ...idsFromTemplate("legendaryIds"),
    ...idsFromTemplate("mythicIds"),
    ...Array.from(expansionSource.matchAll(/\[\"([^\"]+)\", \"(?:Gewoon|Zeldzaam|Episch|Legendarisch|Mythisch)\"\]/g), (match) => match[1])
  );
  sourceIds.push(...Array.from(pilotSource.matchAll(/\bid: \"([^\"]+)\"/g), (match) => match[1]));
  assert.ok(sourceIds.length > 0);
  assert.deepEqual(new Set(catalog.map((entry) => entry.id)), new Set(sourceIds));
});
