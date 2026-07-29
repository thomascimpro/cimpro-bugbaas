import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "BugSmashDuelScreen.tsx"), "utf8");

test("play workspace renders no duplicate compact squad selector", () => {
  const compactSquadSelectors = source.match(/<View style=\{styles\.arenaSquadPreview\}>/g) ?? [];
  assert.equal(compactSquadSelectors.length, 0);
});

test("play cannot open its legacy squad editor and routes edits through Collection", () => {
  assert.match(source, /onEditSquad\?: \(\) => void/);
  assert.doesNotMatch(source, /squadModalVisible|openSquadModal|toggleActiveSquadBug/);
});

test("Duel workspace exposes only random ranked matchmaking", () => {
  assert.match(source, /styles\.duelLaunchPanel/);
  assert.match(source, /startRandomChallenge\(\)/);
  assert.match(source, /const availableModes = arcadeModeOrder\.filter/);
  assert.match(source, /Math\.floor\(Math\.random\(\) \* availableModes\.length\)/);
  assert.match(source, /duel\.quickStart/);
  assert.doesNotMatch(source, /duel\.chooseOpponent/);
  assert.doesNotMatch(source, /duel\.challengePlayer/);
});

test("ranked games do not render an exit control while gameplay is active", () => {
  assert.match(source, /\{trainingDuel \? \(/);
  assert.match(source, /<Pressable style=\{styles\.gameExitButton\}/);
  assert.doesNotMatch(source, /!trainingDuel[^\n]*gameExitButton/);
});

test("crown wins are registered for completed arcade PvE runs, not ranked submissions", () => {
  assert.match(source, /async function recordArcadeRunResult\(result: ArcadeRunResult\) \{[\s\S]*awardActiveSquadBattleWin\("arcade"/);
  assert.match(source, /onResult: submitArcadeRunResult,\n\s+ranked: true/);
});

test("mobile arcade selector renders all six non-Tap Duel games in a wrapping grid", () => {
  assert.match(source, /<View style=\{styles\.arcadeGrid\}>/);
  assert.equal((source.match(/<ArcadeModeCard /g) ?? []).length, 6);
  assert.doesNotMatch(source, /<ScrollView horizontal contentContainerStyle=\{styles\.arcadeHubCompact\}/);
  assert.doesNotMatch(source, /nextLockedArcadeMode/);
  assert.match(source, /const arcadeColumns = viewportWidth >= 700 \? 3 : 2/);
  assert.match(source, /cardBasis=\{arcadeCardBasis\}/);
});

test("arcade selector is not replaced by automatically loaded duel activity", () => {
  assert.match(source, /if \(showDuelWorkspace && !activeDuelId\) \{/);
  assert.match(source, /if \(!showDuelWorkspace \|\| busy\) return;/);
});

test("ranked and practice launches clear stale duel state before starting a game", () => {
  assert.match(source, /async function startRandomChallenge\(mode\?: ArcadeMode\)[\s\S]*setActiveDuelId\(""\);[\s\S]*setActiveDuel\(null\);/);
  assert.match(source, /function startArcadePractice\(mode: Exclude<ArcadeMode, "tap_duel">\)[\s\S]*setActiveDuelId\(""\);[\s\S]*setActiveDuel\(null\);[\s\S]*setArcadeTrainingMode\(true\);[\s\S]*setArenaMode\(mode\);/);
  assert.match(source, /onTrain=\{\(\) => startArcadePractice\("web_runner"\)\}/);
  assert.match(source, /onTrain=\{\(\) => startArcadePractice\("bubble_swarm"\)\}/);
  assert.match(source, /onTrain=\{\(\) => startArcadePractice\("butterfly_catch"\)\}/);
});

test("Tap Duel ranked launch always requests tap_duel instead of a random arcade mode", () => {
  assert.match(source, /featuredArcadeMode === "tap_duel"[\s\S]*onPress=\{\(\) => confirmRankedStart\(\(\) => \{ void startRandomChallenge\("tap_duel"\); \}\)\}/);
  assert.doesNotMatch(source, /featuredArcadeMode === "tap_duel"[^\n]*startRandomChallenge\(\)/);
});

test("ranked matchmaking feedback is visible above the arcade grid", () => {
  const noticeIndex = source.indexOf("styles.matchmakingNotice");
  const gridIndex = source.indexOf("<View style={styles.arcadeGrid}>");
  assert.ok(noticeIndex > 0);
  assert.ok(gridIndex > noticeIndex);
  assert.match(source, /<ActivityIndicator color="#d7bd57" size="small" \/>/);
});

test("Solo Campaign is a compact horizontal row directly below the arcade grid", () => {
  assert.match(source, /style=\{styles\.arenaUtilityCopy\}/);
  assert.match(source, /styles\.arenaUtilityButton/);
  assert.match(source, /style=\{styles\.arenaUtilityImage\}/);
  assert.match(source, /style=\{styles\.arenaUtilityAction\}/);
  assert.match(source, /arenaUtilityButton:\s*\{[^}]*flexDirection: "row"/s);
});

test("Solo Campaign stores the next wave immediately after a win", () => {
  assert.match(source, /const nextWave = Math\.min\(soloCampaignMaxWave, soloCampaign\.wave \+ 1\);/);
  assert.match(source, /rememberSoloCampaignProgress\(nextWave, soloCampaignLives\)/);
});
