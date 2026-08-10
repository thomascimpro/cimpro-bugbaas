import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "docs", "bugdex-nederland-photo-candidates.json");
const placeId = 7506;
const observationThreshold = 10;
const pageSize = 500;

const taxonGroups = [
  { key: "insecta", label: "insecten", taxonId: 47158, limit: 500 },
  { key: "arachnida", label: "spinachtigen", taxonId: 47119, limit: 500 },
  { key: "gastropoda", label: "slakken", taxonId: 47114, limit: 300 },
  { key: "malacostraca", label: "pissebedden-en-kreeftachtigen", taxonId: 47187, limit: 200 },
  { key: "chilopoda", label: "duizendpoten", taxonId: 49556, limit: 100 },
  { key: "diplopoda", label: "miljoenpoten", taxonId: 47735, limit: 100 },
];

const outOfScopeManualGroups = new Set([
  "slak",
  "pissebed",
  "duizendpoot",
  "miljoenpoot",
  "watergeleedpotige",
]);

const isProductionScope = (sourceGroup, manualGroup = "") => {
  if (sourceGroup) return sourceGroup === "insecta" || sourceGroup === "arachnida";
  return !outOfScopeManualGroups.has(manualGroup);
};

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const slugify = (value) => normalize(value).replace(/\s+/g, "-");

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { "user-agent": "BugBaas-BugDex-audit/3.0" },
  });
  if (!response.ok) {
    throw new Error(`iNaturalist ${response.status} for ${url}`);
  }
  return response.json();
};

const catalog = JSON.parse(fs.readFileSync(path.join(root, "shared", "bugdex-catalog.json"), "utf8"));
const inventory = JSON.parse(fs.readFileSync(path.join(root, "docs", "bugdex-nederland-complete-inventory.json"), "utf8"));

const existingNames = new Set();
const existingScientificNames = new Map();
for (const entry of catalog) {
  existingNames.add(normalize(entry.id));
  existingNames.add(normalize(entry.name));
  for (const scientificAlias of entry.scientificAliases ?? []) {
    existingScientificNames.set(normalize(scientificAlias), entry.id);
  }
}

const manualMissing = new Map(inventory.missingSpecificSpecies.map((entry) => [
  normalize(entry.scientificName),
  entry,
]));
const aliasReviews = new Map(inventory.aliasReview.map((entry) => [
  normalize(entry.scientificName),
  entry,
]));

const classifyPriority = (count) => {
  if (count >= 250) return "P0";
  if (count >= 50) return "P1";
  return "P2";
};

const records = [];
for (const group of taxonGroups) {
  const url = new URL("https://api.inaturalist.org/v1/observations/species_counts");
  url.searchParams.set("place_id", String(placeId));
  url.searchParams.set("taxon_id", String(group.taxonId));
  url.searchParams.set("rank", "species");
  url.searchParams.set("verifiable", "true");
  url.searchParams.set("per_page", String(Math.min(pageSize, group.limit)));
  url.searchParams.set("locale", "nl");
  url.searchParams.set("order_by", "observations_count");
  url.searchParams.set("order", "desc");

  const response = await fetchJson(url);
  for (const result of response.results ?? []) {
    const taxon = result.taxon ?? {};
    const scientificName = taxon.name ?? taxon.preferred_scientific_name ?? "";
    if (!scientificName || (result.count ?? 0) < observationThreshold) continue;

    const commonName = taxon.preferred_common_name ?? "";
    const commonKey = normalize(commonName);
    const scientificKey = normalize(scientificName);
    const exactCatalogMatch = existingNames.has(commonKey) || existingNames.has(slugify(commonName));
    const scientificCatalogId = existingScientificNames.get(scientificKey) ?? null;
    const knownManual = manualMissing.get(scientificKey);
    const knownAlias = aliasReviews.get(scientificKey);
    const id = knownManual?.id ?? slugify(commonName || scientificName);
    const inProductionScope = isProductionScope(group.key, knownManual?.group ?? "");

    records.push({
      id,
      name: knownManual?.name ?? (commonName || scientificName),
      scientificName,
      group: knownManual?.group ?? group.key,
      sourceGroup: group.key,
      photoObservationCount: result.count,
      priority: knownManual?.priority ?? classifyPriority(result.count),
      status: !inProductionScope
        ? "out-of-scope-non-bug"
        : exactCatalogMatch || scientificCatalogId
          ? "already-in-app"
          : knownAlias
            ? "alias-review"
            : "missing-specific-card",
      existingAliasId: scientificCatalogId ?? knownAlias?.id ?? null,
      source: "iNaturalist-NL-verifiable-species-counts",
      sourceTaxonId: taxon.id ?? null,
      contexts: knownManual?.contexts ?? [],
      needsDutchNameReview: !commonName,
    });
  }
}

for (const entry of inventory.missingSpecificSpecies) {
  const scientificKey = normalize(entry.scientificName);
  if (records.some((record) => normalize(record.scientificName) === scientificKey)) continue;
  const manualCatalogId = existingNames.has(normalize(entry.id))
    ? entry.id
    : existingNames.has(normalize(entry.name))
      ? entry.id
      : existingScientificNames.get(scientificKey) ?? null;
  const inProductionScope = isProductionScope(entry.sourceGroup ?? "", entry.group);
  records.push({
    id: entry.id,
    name: entry.name,
    scientificName: entry.scientificName,
    group: entry.group,
    sourceGroup: entry.group,
    photoObservationCount: null,
    priority: entry.priority,
    status: !inProductionScope
      ? "out-of-scope-non-bug"
      : manualCatalogId
        ? "already-in-app"
        : "manual-prior-missing-card",
    existingAliasId: manualCatalogId,
    source: "BugBaas-prior-manual-audit",
    sourceTaxonId: null,
    contexts: entry.contexts ?? [],
    needsDutchNameReview: false,
  });
}

const deduped = new Map();
for (const record of records) {
  const key = normalize(record.scientificName);
  const previous = deduped.get(key);
  if (!previous || (record.photoObservationCount ?? -1) > (previous.photoObservationCount ?? -1)) {
    deduped.set(key, record);
  }
}

const candidates = [...deduped.values()]
  .sort((a, b) => (b.photoObservationCount ?? -1) - (a.photoObservationCount ?? -1) || a.name.localeCompare(b.name, "nl"));

const idCounts = new Map();
for (const candidate of candidates) {
  idCounts.set(candidate.id, (idCounts.get(candidate.id) ?? 0) + 1);
}
for (const candidate of candidates) {
  if ((idCounts.get(candidate.id) ?? 0) > 1) {
    candidate.id = `${candidate.id}-${slugify(candidate.scientificName)}`;
  }
}

const summary = Object.fromEntries(taxonGroups.map((group) => {
  const rows = candidates.filter((candidate) => candidate.sourceGroup === group.key);
  return [group.key, {
    label: group.label,
    candidates: rows.length,
    missing: rows.filter((row) => row.status === "missing-specific-card" || row.status === "manual-prior-missing-card").length,
    alreadyInApp: rows.filter((row) => row.status === "already-in-app").length,
    aliasReview: rows.filter((row) => row.status === "alias-review").length,
    outOfScope: rows.filter((row) => row.status === "out-of-scope-non-bug").length,
    p0: rows.filter((row) => row.priority === "P0" && row.status === "missing-specific-card").length,
    p1: rows.filter((row) => row.priority === "P1" && row.status === "missing-specific-card").length,
    p2: rows.filter((row) => row.priority === "P2" && row.status === "missing-specific-card").length,
  }];
}));

const output = {
  generatedAt: new Date().toISOString(),
  purpose: "Photographable Dutch BugDex candidates, ranked by verifiable iNaturalist observations and diffed against the current 3.0 catalog.",
  source: {
    provider: "iNaturalist API",
    placeId,
    place: "Netherlands",
    endpoint: "observations/species_counts",
    verifiableOnly: true,
    rank: "species",
    minimumPhotoObservations: observationThreshold,
    caveat: "Observation count is a photo-likelihood proxy, not a direct abundance estimate. Scientific identity and Dutch common names require final review before production integration.",
  },
  catalogBaseline: {
    entries: catalog.length,
    exactNameOrIdMatchesExcludedFromMissing: candidates.filter((candidate) => candidate.status === "already-in-app").length,
    aliasReviewsExcludedFromMissing: candidates.filter((candidate) => candidate.status === "alias-review").length,
  },
  summary,
  totals: {
    observedCandidates: candidates.length,
    missingSpecificCards: candidates.filter((candidate) => candidate.status === "missing-specific-card" || candidate.status === "manual-prior-missing-card").length,
    p0: candidates.filter((candidate) => candidate.priority === "P0" && candidate.status === "missing-specific-card").length,
    p1: candidates.filter((candidate) => candidate.priority === "P1" && candidate.status === "missing-specific-card").length,
    p2: candidates.filter((candidate) => candidate.priority === "P2" && candidate.status === "missing-specific-card").length,
    outOfScope: candidates.filter((candidate) => candidate.status === "out-of-scope-non-bug").length,
  },
  candidates,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(root, outputPath), ...output.totals, summary }, null, 2));
