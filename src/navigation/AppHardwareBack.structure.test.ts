import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("App.tsx", "utf8");

test("App handles Android back for overlays and internal routes before system exit", () => {
  assert.match(source, /import \{[^}]*BackHandler[^}]*\} from "react-native"/);
  assert.match(source, /BackHandler\.addEventListener\("hardwareBackPress"/);
  assert.match(source, /if \(appNavigation\.overlay\) \{[\s\S]*closeOverlay/);
  assert.match(source, /parentRouteForHardwareBack\(route, fieldJournalBackRoute\)/);
  assert.match(source, /return backRoute !== null/);
});
