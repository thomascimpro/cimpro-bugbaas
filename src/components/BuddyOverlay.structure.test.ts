import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BuddyOverlay.tsx"), "utf8");

test("buddy overlay renders every expedition instead of auto-picking the first ready action", () => {
  assert.match(source, /buddyCareActions\.map/);
  assert.match(source, /selectedAction/);
  assert.match(source, /setSelectedAction/);
  assert.doesNotMatch(source, /const nextAction = buddyCareActions\.find/);
});

test("starting a Buddy expedition uses the selected expedition", () => {
  assert.match(source, /const selectedConfig = buddyCareActions\.find/);
  assert.match(source, /activeTaskValue = \{ action: selectedConfig\.id/);
  assert.match(source, /buddyActionAvailability/);
});

test("finished Buddy expeditions auto-claim once and show restart popup", () => {
  assert.match(source, /autoClaimedTaskRef/);
  assert.match(source, /void claimReward\(true\)/);
  assert.match(source, /claimPopup/);
  assert.match(source, /setSelectedAction\(claimPopup\.action\)/);
  assert.match(source, /setClaimPopup\(null\)/);
});
