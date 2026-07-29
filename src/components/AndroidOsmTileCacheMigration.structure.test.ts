import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("android/app/src/main/java/nl/cimpro/bugbaas/MainActivity.kt", "utf8");

test("Android clears legacy blocked OSM tile images once without clearing app data", () => {
  assert.match(source, /import com\.facebook\.drawee\.backends\.pipeline\.Fresco/);
  assert.match(source, /clearLegacyOsmTileCacheOnce\(\)/);
  assert.match(source, /"osm_tile_user_agent_cache_v2"/);
  assert.match(source, /Fresco\.hasBeenInitialized\(\)/);
  assert.match(source, /postDelayed\(\{ clearLegacyOsmTileCacheOnce\(attempt \+ 1\) \}, 250L\)/);
  assert.match(source, /attempt >= 20/);
  assert.match(source, /Fresco\.getImagePipeline\(\)\.clearCaches\(\)/);
  assert.match(source, /Log\.i\("BugBaasMapCache", "Cleared legacy OSM tile cache"\)/);
  assert.match(source, /putBoolean\(migrationKey, true\)\.apply\(\)/);
  assert.doesNotMatch(source, /clearApplicationUserData|pm clear/);
});
