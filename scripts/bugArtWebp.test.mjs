import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync("src/services/bugArt.ts", "utf8");
const appConfig = JSON.parse(readFileSync("app.json", "utf8"));
const references = [...source.matchAll(/require\("\.\.\/\.\.\/assets\/bugdex-webp\/([^\"]+)"\)/g)].map((match) => match[1]);

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
