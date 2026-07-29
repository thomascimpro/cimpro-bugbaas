import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const profileSource = readFileSync(join(directory, "ProfileScreen.tsx"), "utf8");
const journalSource = readFileSync(join(directory, "FieldJournalScreen.tsx"), "utf8");
const appSource = readFileSync(join(directory, "..", "..", "App.tsx"), "utf8");

test("own profile exposes Settings and Settings returns to profile", () => {
  assert.match(profileSource, /onOpenSettings\?: \(\) => void/);
  assert.match(profileSource, /t\("profile\.settings"\)/);
  assert.match(appSource, /onOpenSettings=\{\(\) => setRoute\("settings"\)\}/);
  assert.match(appSource, /route === "settings"[\s\S]*onBack=\{\(\) => setRoute\("profile"\)\}/);
});

test("own profile character hero opens the existing character picker", () => {
  assert.match(profileSource, /accessibilityLabel=\{t\("profile\.changeCharacter"\)\}/);
  assert.match(profileSource, /onPress=\{\(\) => setCharacterPickerOpen\(true\)\}/);
});

test("own profile points card opens a rank overview modal", () => {
  assert.match(profileSource, /const \[rankInfoVisible, setRankInfoVisible\] = useState\(false\)/);
  assert.match(profileSource, /accessibilityLabel=\{t\("profile\.viewRank"\)\}/);
  assert.match(profileSource, /onPress=\{\(\) => setRankInfoVisible\(true\)\}/);
  assert.match(profileSource, /visible=\{rankInfoVisible\}/);
  assert.match(profileSource, /userTiers\.map/);
});

test("profile and journal content clear the fixed phone navigation", () => {
  assert.match(profileSource, /layout\.bottomNavHeight \+ layout\.bottomNavInset \+ 48/);
  assert.match(journalSource, /paddingBottom: layout\.bottomNavHeight \+ layout\.bottomNavInset \+ 48/);
});
