import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const controllerSource = readFileSync(join(root, "src", "components", "DailyMissionCompletionController.tsx"), "utf8");
const serviceSource = readFileSync(join(root, "src", "services", "dailyMissionService.ts"), "utf8");
const rulesSource = readFileSync(join(root, "firestore.rules"), "utf8");

test("daily mission transaction writes rewardXp through the shared claim payload", () => {
  assert.match(serviceSource, /import \{ dailyMissionClaimPayload \} from "\.\/dailyMissionClaimModel"/);
  assert.match(serviceSource, /transaction\.set\(claimRef, dailyMissionClaimPayload\(\{/);
  assert.doesNotMatch(serviceSource, /transaction\.set\(claimRef, \{[\s\S]*awardedPoints:/);
});

test("permanent mission claim failures are blocked for the current app session", () => {
  assert.match(controllerSource, /isPermanentMissionClaimError/);
  assert.match(controllerSource, /const blockedClaimIdsRef = useRef\(new Set<string>\(\)\)/);
  assert.match(controllerSource, /!blockedClaimIdsRef\.current\.has\(mission\.id\)/);
  assert.match(controllerSource, /blockedClaimIdsRef\.current\.add\(readyMission\.id\)/);
});

test("Firestore daily claim rules validate rewardXp and never accept awardedPoints", () => {
  const dailyBlock = rulesSource.match(/match \/dailyMissionClaims\/\{claimId\} \{[\s\S]*?allow delete: if false;[\s\S]*?\}/)?.[0] ?? "";
  assert.match(dailyBlock, /'rewardXp'/);
  assert.match(dailyBlock, /request\.resource\.data\.rewardXp is int/);
  assert.match(dailyBlock, /request\.resource\.data\.rewardXp >= 0/);
  assert.doesNotMatch(dailyBlock, /awardedPoints/);
});
