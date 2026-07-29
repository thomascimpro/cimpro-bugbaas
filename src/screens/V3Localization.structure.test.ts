import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const screensDir = dirname(fileURLToPath(import.meta.url));
const mapSource = readFileSync(join(screensDir, "..", "components", "map", "BugWorldMap.tsx"), "utf8");
const routeSource = readFileSync(join(screensDir, "..", "components", "map", "ExpeditionRoutePanel.tsx"), "utf8");
const journalSource = readFileSync(join(screensDir, "FieldJournalScreen.tsx"), "utf8");
const exhibitSource = readFileSync(join(screensDir, "..", "components", "museum", "MuseumExhibitEditor.tsx"), "utf8");
const researchSource = readFileSync(join(screensDir, "world", "ResearchProgressCard.tsx"), "utf8");
const worldSource = readFileSync(join(screensDir, "WorldScreen.tsx"), "utf8");
const i18nSource = readFileSync(join(screensDir, "..", "services", "i18n.tsx"), "utf8");

test("map journal and exhibit editor use translation keys for proven mixed-language copy", () => {
  assert.doesNotMatch(mapSource, /Zoekzones laden|Mijn Bugwereld|Gebruik mijn locatie/);
  assert.doesNotMatch(journalSource, /Mijn Veldjournaal|Nog geen veldnotities|Mijn vondstenkaart/);
  assert.doesNotMatch(exhibitSource, /Kies zelf je podiumbugs|Beschikbare bugs|Verwijder/);
  assert.doesNotMatch(routeSource, />Kies je volgende regio<|>\{region\.habitat\}</);
  assert.match(routeSource, /world\.map\.routesTitle/);
  assert.match(routeSource, /journal\.habitat/);
  assert.match(researchSource, /bugDexEntryName/);
  assert.doesNotMatch(worldSource, />GEVONDEN BUG<|>Bekijk in collectie<|>Choose your target</);
  assert.match(i18nSource, /"map\.zonesLoading"/);
  assert.match(i18nSource, /"journal\.title"/);
  assert.match(i18nSource, /"museum\.exhibitEditor\.title"/);
});
