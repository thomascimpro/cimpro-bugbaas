import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "realBugScanLocalServer.mjs"), "utf8");

test("local BugScan server loads shared env before scan-specific overrides", () => {
  const sharedIndex = source.indexOf('loadEnvFile(".env")');
  const localIndex = source.indexOf('loadEnvFile(".env.real-bug-scan.local")');
  assert.notEqual(sharedIndex, -1);
  assert.notEqual(localIndex, -1);
  assert.ok(sharedIndex < localIndex);
});

test("later env files do not overwrite values already loaded", () => {
  assert.match(source, /if \(!process\.env\[key\]\) process\.env\[key\] = value;/);
});
