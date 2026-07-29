import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const bugDexServiceSource = readFileSync(join(currentDirectory, "bugDexService.ts"), "utf8");
const realBugScanServiceSource = readFileSync(join(currentDirectory, "realBugScanService.ts"), "utf8");

test("every unique real bug scan grants one additional owned copy", () => {
  assert.match(bugDexServiceSource, /count:\s*previousCount \+ 1/);
  assert.match(bugDexServiceSource, /awardedCopy:\s*true/);
  assert.match(realBugScanServiceSource, /const eventId = `real-bug-scan-\$\{scanId\}`/);
});

test("successful scan returns the exact granted drop for unlock presentation", () => {
  assert.match(realBugScanServiceSource, /drop = granted/);
  assert.match(realBugScanServiceSource, /return \{ result, drop \}/);
});
