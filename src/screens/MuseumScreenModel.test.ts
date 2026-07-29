import assert from "node:assert/strict";
import test from "node:test";
import type { BugDexInventoryItem, BugMastery } from "../types.ts";
import type { FieldJournalEntry } from "../services/fieldJournalService.ts";
import { bugProgressionCatalog } from "../services/bugProgressionCatalog.ts";
import {
  buildMuseumWings,
  getMuseumWingItems,
  getNextMuseumGoal,
  getRecentMuseumFinds,
  museumWingDefinitions
} from "./MuseumScreenModel.ts";

function inventoryItem(bugId: string, firstUnlockedAt = "2026-07-01T10:00:00.000Z", lastUnlockedAt = firstUnlockedAt): BugDexInventoryItem {
  return { bugId, count: 1, firstUnlockedAt, lastUnlockedAt, rarity: "Gewoon", sources: ["test"] };
}

function mastery(bugId: string, level: number): BugMastery {
  return {
    bugId,
    level,
    xp: 0,
    lifetimeXp: 0,
    rank: level >= 20 ? "master" : level >= 15 ? "elite" : level >= 10 ? "veteran" : level >= 5 ? "skilled" : level >= 3 ? "trained" : "rookie",
    role: "attack",
    unlockedSkillIds: [],
    activeUses: 0,
    duelUses: 0,
    soloUses: 0,
    walkedKm: 0,
    battleWins: 0,
    sourceTotals: {},
    updatedAt: "2026-07-01T10:00:00.000Z"
  };
}

function journalEntry(id: string, bugId: string, habitat: FieldJournalEntry["habitat"]): FieldJournalEntry {
  return {
    id,
    scanId: id,
    observedAt: "2026-07-01T10:00:00.000Z",
    speciesName: bugId,
    scientificName: "",
    bugId,
    status: "matched",
    habitat,
    behavior: "Rustte",
    confidence: 0.9
  };
}

test("defines themed wings instead of discovery-number buckets", () => {
  assert.deepEqual(museumWingDefinitions.map((wing) => wing.id), ["beetles", "wings", "water", "night", "crawlers", "crown"]);
});

test("a wing is discovered by one matching species but opens only after collection and mastery goals", () => {
  const discovered = buildMuseumWings([inventoryItem("zilvervisje")], [], []);
  assert.equal(discovered.find((wing) => wing.id === "crawlers")?.stage, "discovered");

  const items = ["zilvervisje", "bladluis", "pissebed", "duizendpoot"].map((id) => inventoryItem(id));
  const stillLocked = buildMuseumWings(items, [], []);
  assert.equal(stillLocked.find((wing) => wing.id === "crawlers")?.stage, "discovered");

  const opened = buildMuseumWings(items, [mastery("duizendpoot", 3)], [journalEntry("scan-crawler", "duizendpoot", "Tuin")]);
  assert.equal(opened.find((wing) => wing.id === "crawlers")?.stage, "open");
});

test("water wing combines owned species with a field-note habitat goal", () => {
  const items = ["waterkever", "schrijvertje", "schaatsenrijder"].map((id) => inventoryItem(id));
  const withoutFieldNote = buildMuseumWings(items, [], []);
  assert.equal(withoutFieldNote.find((wing) => wing.id === "water")?.stage, "discovered");

  const withFieldNote = buildMuseumWings(items, [], [journalEntry("scan-1", "waterkever", "Water")]);
  assert.equal(withFieldNote.find((wing) => wing.id === "water")?.stage, "open");
});

test("wing contents use bug type and habitat tags, not first-catch position", () => {
  const items = [
    inventoryItem("waterkever", "2026-07-04T10:00:00.000Z"),
    inventoryItem("mot", "2026-07-01T10:00:00.000Z"),
    inventoryItem("schrijvertje", "2026-07-03T10:00:00.000Z"),
    inventoryItem("kruisspin", "2026-07-02T10:00:00.000Z"),
    inventoryItem("buxusmot", "2026-07-05T10:00:00.000Z"),
    inventoryItem("lauwstaartwaterjuffer", "2026-07-06T10:00:00.000Z")
  ];

  assert.deepEqual(getMuseumWingItems(items, "water").map((item) => item.bugId), ["waterkever", "schrijvertje", "lauwstaartwaterjuffer"]);
  assert.deepEqual(getMuseumWingItems(items, "night").map((item) => item.bugId), ["mot", "kruisspin", "buxusmot"]);
});

test("next goal exposes compact incomplete requirements for visual chips", () => {
  const items = ["zilvervisje", "bladluis"].map((id) => inventoryItem(id));
  const wings = buildMuseumWings(items, [], []);
  const goal = getNextMuseumGoal(wings.find((wing) => wing.id === "crawlers")!);

  assert.equal(goal?.stage, "open");
  assert.deepEqual(goal?.requirements.filter((item) => !item.complete).map((item) => item.kind), ["species", "mastery", "field"]);
});

test("standard wings scale curated and master requirements to their actual catalog size", () => {
  const allCrawlerIds = bugProgressionCatalog.filter((definition) => definition.museumWings.includes("crawlers")).map((definition) => definition.bugId);
  const wings = buildMuseumWings(allCrawlerIds.map((id) => inventoryItem(id)), [], []);
  const crawler = wings.find((wing) => wing.id === "crawlers")!;
  const curatedSpecies = crawler.goals.find((goal) => goal.stage === "curated")?.requirements.find((requirement) => requirement.kind === "species");
  const masterSpecies = crawler.goals.find((goal) => goal.stage === "master")?.requirements.find((requirement) => requirement.kind === "species");
  assert.equal(curatedSpecies?.required, Math.ceil(crawler.itemCount * 0.35));
  assert.equal(masterSpecies?.required, Math.ceil(crawler.itemCount * 0.8));
});

test("Crown Hall master requires ninety percent collection and all core wings mastered", () => {
  const crown = museumWingDefinitions.find((wing) => wing.id === "crown")!;
  assert.equal(crown.master.species, Math.ceil(bugProgressionCatalog.length * 0.9));
  assert.equal(crown.master.wings, 5);
  assert.equal(crown.master.wingStage, "master");
});

test("sorts recent finds newest first and respects limit", () => {
  const items = [
    inventoryItem("zilvervisje", "2026-07-01T10:00:00.000Z", "2026-07-01T10:00:00.000Z"),
    inventoryItem("mier", "2026-07-02T10:00:00.000Z", "2026-07-03T10:00:00.000Z"),
    inventoryItem("mot", "2026-07-03T10:00:00.000Z", "2026-07-02T10:00:00.000Z")
  ];

  assert.deepEqual(getRecentMuseumFinds(items, 2).map((item) => item.bugId), ["mier", "mot"]);
});
