import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("App.tsx", "utf8");
const modal = readFileSync("src/components/BugDexUnlockModal.tsx", "utf8");
const missionModal = readFileSync("src/screens/world/MissionOverviewModal.tsx", "utf8");
const bugDexScreen = readFileSync("src/screens/BugDexScreen.tsx", "utf8");
const bugDexService = readFileSync("src/services/bugDexService.ts", "utf8");
const rewardPresentation = readFileSync("src/services/rewardPresentation.ts", "utf8");
const closeDuelSeason = readFileSync("scripts/close_duel_season.mjs", "utf8");
const radarWidget = readFileSync("android/app/src/main/java/nl/cimpro/bugbaas/BugRadarWidgetProvider.kt", "utf8");

test("every BugDex reward uses foreground catch before the result popup", () => {
  assert.match(app, /if \(drop\.rewardType === "bug"\) \{[\s\S]*?queueForegroundReward\(/);
  assert.match(app, /presentBugDexDrop\(pendingReward\.preGrantedDrop, true\)/);
  assert.match(app, /presentBugDexDrop\(claimedDrop, true\)/);
  assert.match(app, /presentBugDexDrop\(rewardDrop, true\)/);
  assert.match(app, /presentBugDexDrop\(caughtBugDrop, true\)/);
  assert.match(app, /const next = \[\.\.\.queue\.filter[\s\S]*?missedReward\]/);
  assert.match(rewardPresentation, /shouldPresentPointDropAsForegroundCatch\(_source[\s\S]*?return false/);
});

test("every claimed movement radar bug is stored once before its foreground popup", () => {
  assert.match(app, /let grantQueue: Promise<void> = Promise\.resolve\(\);[\s\S]*?for \(const bugId of bugIds\)[\s\S]*?grantQueue[\s\S]*?rollSpecificBugDexDrop\(currentUser, entry\.id, "movement_radar", 1\)[\s\S]*?preGrantPromise,[\s\S]*?source: "movement_radar"/);
  assert.match(app, /const preGrantedDrop = await pendingReward\.preGrantPromise;[\s\S]*?presentBugDexDrop\(preGrantedDrop, true\)/);
  assert.match(app, /while \(movementCheckInProgress\.current\)[\s\S]*?await activeCheck\.catch/);
  assert.match(radarWidget, /handleOpenBug[\s\S]*?bugbaas:\/\/radar\?claimAll=1/);
  assert.match(app, /radarClaimRequested\.current = true;[\s\S]*?claimRequestedRadarStack\(\)/);
});

test("radar rewards use the full app BugDex pool with explicit rarity odds", () => {
  assert.match(app, /resolveMovementRadarBugIds\([\s\S]*?pickBugDexRewardEntry\(currentUser, "movement_radar"\)/);
  assert.match(bugDexService, /movementRadarRarityWeights[\s\S]*?\["Gewoon", 70\][\s\S]*?\["Zeldzaam", 24\.4\][\s\S]*?\["Episch", 4\.9\][\s\S]*?\["Legendarisch", 0\.6\][\s\S]*?\["Mythisch", 0\.1\]/);
  assert.match(radarWidget, /maxActiveRadarBugs = 10/);
  assert.match(radarWidget, /pickRandomRadarBugIds[\s\S]*?movementRewardToken/);
});

test("mission and combine rewards return to the central reward flow", () => {
  assert.match(missionModal, /bugRewards\.forEach\(\(drop\) => onRewardDrop\?\.\(drop\)\)/);
  assert.match(bugDexScreen, /setWorkspaceOpen\(false\);[\s\S]*?onRewardDrop\?\.\(result\)/);
  assert.doesNotMatch(bugDexScreen, /<BugDexUnlockModal/);
});

test("the result popup clearly distinguishes a new species from an extra copy", () => {
  assert.match(modal, /drop\.isNew[\s\S]*?discovered![\s\S]*?\+1 \$\{bugName\}!/);
  assert.match(modal, /Je kreeg deze bug door:/);
  for (const source of ["bug_reported", "duel_win", "rank_up", "rank_unlock", "bug_brain_daily", "movement_radar", "duel_season", "starter_boost"]) {
    assert.match(modal, new RegExp(`${source}:`), `${source} has no clear popup reason`);
  }
});

test("point and rank unlocks are not added silently", () => {
  assert.match(bugDexService, /queuePointUnlock\(user\.uid, \{ rewardType: "bug", entry, item, isNew: true, source: "rank_unlock" \}\)/);
  assert.match(app, /takePendingPointUnlockedBugDex\(user\.uid\)\.forEach\(showBugDexDrop\)/);
});

test("ranked duel rewards can actually select a Mythic bug", () => {
  assert.match(bugDexService, /duel_win: \[\["Gewoon", 71\],[\s\S]*?\["Mythisch", 0\.1\]\]/);
  assert.match(closeDuelSeason, /1: \{ count: 1, label: "1 mythische bug", rarity: "Mythisch" \}/);
  assert.match(closeDuelSeason, /await grantBug\(token, user, bugId, reward\.rarity, `duel_season_\$\{seasonId\}`\)/);
});

test("active events are checked when the app opens and use a dedicated popup", () => {
  assert.match(app, /getSwarmSiegeStatus\(appUser\)/);
  assert.match(app, /getTeamHuntStatus\(appUser\)/);
  assert.match(app, /getReleaseBossStatus\(appUser\)/);
  assert.match(app, /<ActiveEventAnnouncementModal/);
});
