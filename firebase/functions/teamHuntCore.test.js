const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeTeamHuntSpecies, observationIsInsideWeekend, teamHuntCategoryForSpeciesKey, teamHuntCategorySummary, teamHuntWeekendForDate } = require("./teamHuntCore");

test("Team Hunt runs only on the first Friday-to-Sunday weekend of each Amsterdam month", () => {
  const friday = teamHuntWeekendForDate(new Date("2026-07-03T10:00:00Z"));
  const sunday = teamHuntWeekendForDate(new Date("2026-07-05T15:59:59Z"));
  assert.equal(friday.id, "team-hunt-2026-07");
  assert.equal(friday.start.toISOString(), "2026-07-03T10:00:00.000Z");
  assert.equal(friday.end.toISOString(), "2026-07-05T16:00:00.000Z");
  assert.equal(sunday.id, friday.id);
  assert.equal(teamHuntWeekendForDate(new Date("2026-07-10T12:00:00Z")), null);
  assert.equal(teamHuntWeekendForDate(new Date("2026-07-05T16:00:00Z")), null);
});

test("species identity is stable and ignores unsafe observations", () => {
  assert.deepEqual(normalizeTeamHuntSpecies({ status: "matched", speciesName: "Gewone oorworm" }).key, "gewone-oorworm");
  assert.equal(normalizeTeamHuntSpecies({ status: "uncertain", speciesName: "Gewone oorworm" }), null);
  assert.equal(normalizeTeamHuntSpecies({ status: "matched" }), null);
});

test("groups team discoveries into clear collection categories", () => {
  assert.equal(teamHuntCategoryForSpeciesKey("gouden-tor"), "beetles");
  assert.equal(teamHuntCategoryForSpeciesKey("dagpauwoog"), "wings");
  assert.equal(teamHuntCategoryForSpeciesKey("grote-huisspin"), "crawlers");
  assert.equal(teamHuntCategoryForSpeciesKey("honingbij"), "stingers");
  assert.equal(teamHuntCategoryForSpeciesKey("veldkrekel"), "jumpers");
  assert.equal(teamHuntCategoryForSpeciesKey("waterkever"), "water");
  assert.deepEqual(teamHuntCategorySummary(["beetles", "wings", "wings"]), {
    completed: ["beetles", "wings"],
    missing: ["crawlers", "jumpers", "stingers", "water"]
  });
});

test("only observations inside the monthly event can contribute", () => {
  const weekend = teamHuntWeekendForDate(new Date("2026-07-04T12:00:00Z"));
  assert.equal(observationIsInsideWeekend({ observedAt: "2026-07-04T10:00:00Z" }, weekend), true);
  assert.equal(observationIsInsideWeekend({ observedAt: "2026-07-05T16:00:00Z" }, weekend), false);
});
