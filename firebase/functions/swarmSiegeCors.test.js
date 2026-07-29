const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

test("Swarm Siege accepts the BugBaas v3 web origin without wildcard CORS", () => {
  const origin = "https://bugbaasv3.vercel.app";
  assert.equal(source.split(origin).length - 1, 1);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*,\s*["']\*["']/);
});
