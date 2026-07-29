import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const screenDir = dirname(fileURLToPath(import.meta.url));
const screenSource = readFileSync(join(screenDir, "WorldScreen.tsx"), "utf8");
const heroSource = readFileSync(join(screenDir, "world", "WorldBiomeHero.tsx"), "utf8");
const movementSource = readFileSync(join(screenDir, "world", "MovementRadarCard.tsx"), "utf8");
const modalSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "world", "MissionOverviewModal.tsx"), "utf8");
const activeEventsSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "world", "ActiveEventsSummary.tsx"), "utf8");
const swarmScreenSource = readFileSync(join(screenDir, "SwarmSiegeScreen.tsx"), "utf8");
const swarmStageSource = readFileSync(join(screenDir, "..", "components", "swarm", "SwarmBossStage.tsx"), "utf8");

test("today home uses real daily and weekly mission arrays", () => {
  assert.match(screenSource, /missionProgressSummary\(dailyMissions\)/);
  assert.match(screenSource, /missionProgressSummary\(weeklyMissions\)/);
  assert.doesNotMatch(screenSource, /dailyTotal=\{3\}/);
});

test("movement hero renders the walking bug on the progress route", () => {
  assert.match(movementSource, /import \{ WalkingBug \}/);
  assert.match(movementSource, /movementGoalModel/);
  assert.match(movementSource, /<WalkingBug/);
});

test("world keeps buddy progress and art visible as a fixed quick action", () => {
  assert.match(screenSource, /onPress=\{onOpenBuddy\}/);
  assert.match(screenSource, /\{buddySummary\.title\}/);
  assert.match(screenSource, /\{buddySummary\.meta\}/);
  assert.match(screenSource, /buddySummary\.progress/);
  assert.match(screenSource, /<BugArtImage bugId=\{buddySummary\.bugId\} size=\{36\} \/>/);
  assert.match(screenSource, /styles\.quickGrid/);
});

test("world removes decorative radar and next-action wiring while quick actions remain tactile", () => {
  assert.doesNotMatch(heroSource, /searchZoneMarker|locationButton|primaryAction/);
  assert.doesNotMatch(screenSource, /buildPlayerNextAction|PlayerNextAction|openNextAction|nextAction=\{nextAction\}/);
  assert.match(screenSource, /quickAction: \{[\s\S]*borderWidth: 1\.5/);
  assert.match(screenSource, /quickAction: \{[\s\S]*shadowOpacity:/);
});

test("world restores walking reward progress and claim wiring", () => {
  assert.match(screenSource, /getMovementRadarProgress/);
  assert.match(screenSource, /claimableMovementRewards/);
  assert.match(screenSource, /claimableMovementRewards > 0 \? claimMovementRewards\(\) : syncMovement\(\)/);
  assert.match(screenSource, /onClaimMovementRewards \?\? onSyncMovement/);
});

test("missions remain reachable from the fixed quick-action grid", () => {
  assert.match(screenSource, /onPress=\{\(\) => openMissions\("daily"\)\}/);
  assert.match(screenSource, /\{dailyProgress\.done\}\/\{dailyProgress\.total\}/);
  assert.match(screenSource, /\{weeklyProgress\.done\}\/\{weeklyProgress\.total\}/);
});

test("Today shows the three-species weekly field spotlight below research", () => {
  assert.match(screenSource, /import \{ WeeklyFieldSpotlightCard \}/);
  assert.match(screenSource, /weeklyFieldSpotlight\(new Date\(now\)\)/);
  assert.match(screenSource, /<WeeklyFieldSpotlightCard[\s\S]*bugIds=\{weeklySpotlight\.bugIds\}/);
});

test("mission quick action opens the tabbed mission modal", () => {
  assert.match(modalSource, /initialTab/);
  assert.match(screenSource, /openMissions\("daily"\)/);
  assert.match(screenSource, /<MissionOverviewModal initialTab=\{missionTab\}/);
});

test("Today scrolls independently above the fixed phone navigation", () => {
  assert.match(screenSource, /tab === "today"[\s\S]*<ScrollView/);
  assert.match(screenSource, /contentContainerStyle=\{\s*\[\s*styles\.todayScrollContent/);
  assert.match(screenSource, /paddingBottom: layout\.navigationMode === "rail" \? 24 : layout\.bottomNavHeight \+ 32/);
  assert.match(screenSource, /todayScrollContent: \{[\s\S]*flexGrow: 1/);
});

test("phone Today prioritizes actions immediately below the compact hero", () => {
  assert.match(screenSource, /padding: layout\.isTablet \? 20 : 8/);
  assert.match(screenSource, /quickGrid: \{[\s\S]*gap: 6[\s\S]*marginTop: 5/);
  assert.match(screenSource, /quickAction: \{[\s\S]*minHeight: 50/);
});

test("events stay on their dedicated tab", () => {
  assert.doesNotMatch(screenSource, /<ActiveEventsSummary/);
  assert.match(screenSource, /tab === "events"/);
  assert.match(screenSource, /eventCards\.map/);
});

test("active event cards do not repeat the event name as a kicker", () => {
  assert.doesNotMatch(activeEventsSource, /styles\.cardKicker/);
  assert.match(activeEventsSource, /event\.meta \?/);
});

test("events tab presents swarm status, attempts, reward and one clear action", () => {
  assert.match(screenSource, /swarmBossArt/);
  assert.match(screenSource, /styles\.eventStats/);
  assert.match(screenSource, /swarm\.communityGoal/);
  assert.match(screenSource, /styles\.eventAction/);
  assert.doesNotMatch(screenSource, /card === "swarm-result" \? t\("swarm\.reward\.medal"\)/);
});

test("swarm detail puts the attack action above progress and explains the game loop", () => {
  const actionIndex = swarmScreenSource.indexOf("styles.actionPanel");
  const progressIndex = swarmScreenSource.indexOf("styles.progressCard");
  assert.ok(actionIndex > 0 && progressIndex > actionIndex);
  assert.match(swarmScreenSource, /swarm\.loop\.play/);
  assert.match(swarmScreenSource, /swarm\.loop\.damage/);
  assert.match(swarmScreenSource, /swarm\.loop\.reward/);
});

test("swarm result auto-claims once and shows reward feedback", () => {
  assert.match(swarmScreenSource, /autoClaimedEventRef/);
  assert.match(swarmScreenSource, /void claimReward\(status\)/);
  assert.match(swarmScreenSource, /<Modal/);
  assert.match(swarmScreenSource, /swarm\.reward\.received/);
});

test("completed swarm result reveals the awarded eventpool bug", () => {
  assert.match(swarmScreenSource, /import \{ BugArtImage \}/);
  assert.match(swarmScreenSource, /entryByBugId/);
  assert.match(swarmScreenSource, /bugDexEntryName/);
  assert.match(swarmScreenSource, /rewardReveal\?\.awardedBugId/);
  assert.match(swarmScreenSource, /<BugArtImage bugId=\{rewardReveal\.awardedBugId\}/);
});

test("swarm boss art stays fully visible on small screens", () => {
  assert.match(swarmStageSource, /resizeMode="contain"/);
  assert.match(swarmStageSource, /<Image[\s\S]*styles\.bossArt/);
  assert.match(swarmStageSource, /bossArt: \{[\s\S]*height: "100%"[\s\S]*width: "100%"/);
  assert.doesNotMatch(swarmStageSource, /bossArt: \{ \...StyleSheet\.absoluteFillObject/);
  assert.match(swarmStageSource, /minHeight: 228/);
  assert.match(swarmStageSource, /heroCompact: \{ flex: 0, height: 240, minHeight: 240 \}/);
});
