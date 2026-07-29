import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const forbiddenCheckerboardAssets = [
  "../../assets/new bugs/cropped/mosquito.png",
  "../../assets/new bugs/cropped/earwig.png",
  "../../assets/new bugs/cropped/whitefly.png",
  "../../assets/new bugs/cropped/clothes-moth.png",
  "../../assets/new bugs/cropped/indianmeal-moth.png",
  "../../assets/new bugs/cropped/blow-fly.png",
  "../../assets/new bugs/cropped/varied-carpet-beetle.png",
  "../../assets/new bugs/cropped/cockroach.png",
  "../../assets/new bugs/cropped/flea.png",
  "../../assets/bugdex/aardhommel.webp",
  "../../assets/bugdex/weidehommel.webp"
] as const;

const expectedTransparentReplacements = [
  "assets/bugdex-webp/mug.webp",
  "assets/bugdex-webp/oorworm.webp",
  "assets/bugdex-webp/whitefly.webp",
  "assets/bugdex-webp/kleermot.webp",
  "assets/bugdex-webp/voorraadmot.webp",
  "assets/bugdex-webp/bromvlieg.webp",
  "assets/bugdex-webp/tapijtkever.webp",
  "assets/bugdex-webp/kakkerlak.webp",
  "assets/bugdex-webp/vlo.webp",
  "assets/bugdex-webp/veldhommel.webp",
  "assets/bugdex-webp/steenhommel.webp"
] as const;

test("BugDex art mappings do not use assets with baked checkerboard backgrounds", () => {
  const source = readFileSync("src/services/bugArt.ts", "utf8");

  for (const assetPath of forbiddenCheckerboardAssets) {
    assert.equal(source.includes(assetPath), false, `Checkerboard asset is still mapped: ${assetPath}`);
  }

  for (const assetPath of expectedTransparentReplacements) {
    assert.equal(existsSync(assetPath), true, `Replacement asset is missing: ${assetPath}`);
    assert.equal(source.includes(`../../${assetPath}`), true, `Replacement asset is not mapped: ${assetPath}`);
  }
});
