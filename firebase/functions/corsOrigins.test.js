const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(__dirname, "index.js"), "utf8");

test("local BugBaas web server on port 8083 is allowed by CORS", () => {
  assert.match(source, /"http:\/\/localhost:8083"/);
  assert.match(source, /"http:\/\/127\.0\.0\.1:8083"/);
});
