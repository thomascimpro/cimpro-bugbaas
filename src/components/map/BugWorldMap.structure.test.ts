import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BugWorldMap.tsx"), "utf8");

test("map exposes a retry action when search zones are unavailable", () => {
  assert.match(source, /zonesUnavailable/);
  assert.match(source, /retrySearchZones/);
  assert.match(source, /map\.zonesRetry/);
});

test("map has an independent draggable view center", () => {
  assert.match(source, /PanResponder/);
  assert.match(source, /\[viewCenter, setViewCenter\]/);
  assert.match(source, /createMapProjection\(viewCenter, zoom, viewport\)/);
  assert.match(source, /\.\.\.panResponder\.panHandlers/);
  assert.match(source, /moveMapCenterByPixels/);
});

test("viewed field refreshes search zones after a 600 ms debounce", () => {
  assert.match(source, /visibleMapRadiusMeters/);
  assert.match(source, /mapDistanceMeters/);
  assert.match(source, /setTimeout\([\s\S]*?600\)/);
  assert.match(source, /loadNearbySearchZones\(searchView\.center, searchView\.radius\)/);
});

test("location control recenters the map without replacing player marker state", () => {
  assert.match(source, /setLocation\(result\.location\)/);
  assert.match(source, /setViewCenter\(result\.location\)/);
  assert.match(source, /projection\.project\(location\)/);
});

test("existing finding markers remain selectable and projected", () => {
  assert.match(source, /visibleEntries\.map/);
  assert.match(source, /projection\.project\(point\)/);
  assert.match(source, /onSelectEntry\(entry\)/);
  assert.match(source, /<BugArtImage bugId=\{entry\.bugId\}/);
});

test("native OpenStreetMap tile requests identify BugBaas and show correct attribution", () => {
  assert.match(source, /const osmTileHeaders = Platform\.OS === "web" \? undefined : \{ "User-Agent": "BugBaas\/3\.0 \(nl\.cimpro\.bugbaas\)" \}/);
  assert.match(source, /source=\{\{ headers: osmTileHeaders, uri: tile\.uri \}\}/);
  assert.match(source, />© OpenStreetMap contributors<\/Text>/);
});
