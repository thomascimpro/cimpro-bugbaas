import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

const appSource = readFileSync(join(process.cwd(), "App.tsx"), "utf8");

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`async function ${name}()`);
  assert.notEqual(start, -1, `${name} must exist`);
  const nextFunction = source.indexOf("\n  async function ", start + 1);
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction);
}

test("automatic movement checks claim rewards for the app and enqueue every bug for foreground smash", () => {
  const body = functionBody(appSource, "checkMovementRadarBonuses");

  assert.match(body, /claimMovementRadarBonusesForApp\(currentUser\.uid, movementBoostForUser\(currentUser\)\)/);
  assert.match(body, /if \(result\.bugIds\.length > 0\) await showClaimedRadarBugs\(result\.bugIds\)/);
  assert.doesNotMatch(body, /showMovementRewardNotification/);
});
