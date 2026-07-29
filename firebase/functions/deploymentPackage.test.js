const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const functionsRoot = __dirname;

test("Cloud Functions runtime imports stay inside the uploaded functions package", () => {
  const javascriptFiles = fs.readdirSync(functionsRoot).filter((name) => (name.endsWith(".js") || name.endsWith(".cjs")) && !name.endsWith(".test.js"));
  const escapingImports = [];
  for (const filename of javascriptFiles) {
    const source = fs.readFileSync(path.join(functionsRoot, filename), "utf8");
    if (/require\(["']\.\.\/\.\.\//.test(source)) escapingImports.push(filename);
  }
  assert.deepEqual(escapingImports, []);
});

test("research target core loads from the same package Cloud Run receives", () => {
  assert.doesNotThrow(() => require("./researchTargetCore"));
});

test("Cloud Functions accept both localhost browser hostnames on supported development ports", () => {
  const source = fs.readFileSync(path.join(functionsRoot, "index.js"), "utf8");
  for (const port of [8081, 8084, 8085, 19006]) {
    assert.ok(source.includes(`http://localhost:${port}`));
    assert.ok(source.includes(`http://127.0.0.1:${port}`));
  }
});

test("packaged research catalog stays identical to the shared app catalog", () => {
  const packaged = require("./researchCatalog.cjs");
  const shared = require("../../shared/researchCatalog.cjs");
  assert.deepEqual(packaged.researchBugIdsByTier, shared.researchBugIdsByTier);
});

test("Swarm Siege claims persist the packaged eventpool reward in the authoritative transaction", () => {
  const source = fs.readFileSync(path.join(functionsRoot, "index.js"), "utf8");
  assert.match(source, /swarmSiegeRewardForClaim/);
  assert.match(source, /swarmSiegeRewardPool/);
  assert.match(source, /transaction\.set\(rewardBugRef, reward\.item\)/);
  assert.match(source, /rewardBugId: reward\.awardedBugId/);
});
