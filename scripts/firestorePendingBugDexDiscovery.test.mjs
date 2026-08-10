import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");
const pendingBlock = rules.match(/match \/pendingBugDexDiscoveries\/\{scanId\} \{([\s\S]*?)\n    \}/)?.[1] ?? "";

test("missing species developer notes accept the same 70 percent threshold as BugScan", () => {
  assert.ok(pendingBlock, "pendingBugDexDiscoveries rules block must exist");
  assert.match(pendingBlock, /request\.resource\.data\.confidence >= 0\.7\b/);
  assert.doesNotMatch(pendingBlock, /request\.resource\.data\.confidence >= 0\.75\b/);
});
