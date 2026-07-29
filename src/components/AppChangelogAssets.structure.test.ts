import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(componentsDir, "..", "..");
const appSource = readFileSync(join(repoRoot, "App.tsx"), "utf8");

test("changelog artwork references the existing grote wegslak asset", () => {
  assert.match(appSource, /require\("\.\/assets\/bugdex\/grote-wegslak\.png"\)/);
  assert.doesNotMatch(appSource, /grote-wegslak\.webp/);
  assert.equal(existsSync(join(repoRoot, "assets", "bugdex", "grote-wegslak.png")), true);
});
