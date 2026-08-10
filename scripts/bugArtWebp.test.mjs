import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";

const source = readFileSync("src/services/bugArt.ts", "utf8");
const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const catalog = JSON.parse(readFileSync("shared/bugdex-catalog.json", "utf8"));
const mappings = [...source.matchAll(/^\s*"([^\"]+)"\s*:\s*require\("\.\.\/\.\.\/assets\/bugdex-webp\/([^\"]+)"\)/gm)]
  .map((match) => ({ bugId: match[1], filename: match[2] }));
const references = mappings.map((mapping) => mapping.filename);

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

test("all BugDex artwork references use existing valid WebP files", () => {
  assert.ok(references.length > 0, "bugArt.ts contains no BugDex WebP references");
  assert.doesNotMatch(source, /assets\/bugdex(?:\/|\\)[^\"]+\.png/);
  assert.ok(appConfig.expo.assetBundlePatterns.includes("assets/bugdex-webp/**/*.webp"));
  assert.ok(!appConfig.expo.assetBundlePatterns.includes("assets/bugdex/**/*.png"));

  for (const filename of references) {
    assert.ok(filename.endsWith(".webp"), `${filename} is not a WebP reference`);
    const assetPath = join("assets", "bugdex-webp", filename);
    assert.ok(existsSync(assetPath), `missing BugDex WebP: ${assetPath}`);
    const file = readFileSync(assetPath);
    assert.equal(file.subarray(0, 4).toString("ascii"), "RIFF", `${assetPath} is not a RIFF file`);
    assert.equal(file.subarray(8, 12).toString("ascii"), "WEBP", `${assetPath} is not a valid WebP file`);
  }
});

test("catalog, art registry and bundled BugDex WebP directory stay one-to-one", () => {
  const catalogIds = catalog.map((entry) => entry.id);
  const mappedIds = mappings.map((mapping) => mapping.bugId);
  assert.equal(new Set(catalogIds).size, catalogIds.length, "duplicate BugDex catalog IDs");
  assert.equal(new Set(mappedIds).size, mappedIds.length, "duplicate BugDex art registry IDs");
  assert.deepEqual([...mappedIds].sort(), [...catalogIds].sort(), "catalog and art registry IDs differ");
  assert.equal(new Set(references).size, references.length, "multiple BugDex IDs reference the same WebP path");

  const assetRoot = join("assets", "bugdex-webp");
  const bundledFiles = listFiles(assetRoot)
    .filter((filename) => filename.toLowerCase().endsWith(".webp"))
    .map((filename) => relative(assetRoot, filename).split(sep).join("/"))
    .sort();
  assert.deepEqual(bundledFiles, [...references].sort(), "unreferenced or missing WebP files would be bundled");
});

test("bundled BugDex artwork stays within the Android APK size budget", () => {
  const totalBytes = references.reduce((sum, filename) => {
    return sum + readFileSync(join("assets", "bugdex-webp", filename)).byteLength;
  }, 0);
  assert.ok(totalBytes <= 55 * 1024 * 1024, `BugDex WebP bundle is ${(totalBytes / 1024 / 1024).toFixed(1)} MiB; expected at most 55 MiB`);
});
