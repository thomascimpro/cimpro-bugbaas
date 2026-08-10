import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { playTabs } from "./PlayScreenModel.ts";

const playScreenSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "PlayScreen.tsx"), "utf8");

test("play owns only arcade and ranking", () => {
  assert.deepEqual(playTabs, ["arcade", "ranking"]);
  assert.equal(new Set(playTabs).size, 2);
  assert.doesNotMatch(playScreenSource, /bug-smash-duel-concept\.jpg/);
});

test("Arcade owns open and recent duel activity in action-first order", () => {
  const openIndex = playScreenSource.indexOf('t("duel.openRandom")');
  const recentIndex = playScreenSource.indexOf('t("duel.recent")');
  assert.ok(openIndex >= 0);
  assert.ok(recentIndex > openIndex);
  assert.match(playScreenSource, /listOpenRandomBugSmashDuels/);
  assert.match(playScreenSource, /listBugSmashDuels/);
  assert.match(playScreenSource, /setWorkspaceDuelId\(duel\.id\)/);
  assert.match(playScreenSource, /duel\.matchType !== "random"/);
});

test("open and recent duels are collapsed by default", () => {
  assert.match(playScreenSource, /const \[openDuelsExpanded, setOpenDuelsExpanded\] = useState\(false\)/);
  assert.match(playScreenSource, /const \[recentDuelsExpanded, setRecentDuelsExpanded\] = useState\(false\)/);
  assert.match(playScreenSource, /\{openDuelsExpanded \? \(/);
  assert.match(playScreenSource, /\{recentDuelsExpanded \? \(/);
});

test("opening Play Now always starts a fresh arcade workspace", () => {
  assert.match(playScreenSource, /function openArcadeWorkspace\(\)/);
  assert.match(playScreenSource, /setWorkspaceDuelId\(""\)/);
  assert.match(playScreenSource, /onPress=\{tab === "arcade" \? openArcadeWorkspace : openRankingWorkspace\}/);
  assert.match(playScreenSource, /\{workspaceOpen \? \(/);
});

test("Arcade owns an always-available daily Bug Brain card and fullscreen game", () => {
  assert.match(playScreenSource, /BugBrainScreen/);
  assert.match(playScreenSource, /Bug Brain/);
  assert.match(playScreenSource, /bugBrainOpen/);
  assert.match(playScreenSource, /bugBrainActive/);
  assert.match(playScreenSource, /tab === "arcade"/);
  assert.doesNotMatch(playScreenSource, /quizUnlocked|ownedSpecies.*Bug Brain/);
});

test("Bug Brain visuals show the actual 30 second question limit", () => {
  assert.match(playScreenSource, /10 vragen · 30 sec per vraag/);
  assert.match(playScreenSource, /10 questions · 30 sec chacune/);
  assert.match(playScreenSource, /10 questions · 30 sec each/);
  assert.match(playScreenSource, /: "30s"/);
  assert.doesNotMatch(playScreenSource, /20s|20 sec per vraag|20 sec chacune|20 sec each/);
});

test("arcade hero uses a complete game scene instead of the cropped contact sheet", () => {
  assert.match(playScreenSource, /arcade: require\("\.\.\/\.\.\/assets\/generated\/solo-duel-campaign-hd\.jpg"\)/);
  assert.doesNotMatch(playScreenSource, /arcade: require\("\.\.\/\.\.\/assets\/generated\/ChatGPT Image 18 jun 2026, 22_34_06\.jpg"\)/);
});

test("play heroes preserve the full artwork on phones", () => {
  assert.match(playScreenSource, /tab === "arcade"/);
  assert.match(playScreenSource, /Math\.min\(370, Math\.max\(270, viewportHeight \* 0\.42\)\)/);
  assert.match(playScreenSource, /const heroResizeMode = layout\.isTablet \? "cover" as const : "contain" as const/);
  assert.match(playScreenSource, /resizeMode=\{heroResizeMode\}/);
});

test("active ranked game hides and disables the workspace close action", () => {
  assert.match(playScreenSource, /const \[rankedGameActive, setRankedGameActive\] = useState\(false\)/);
  assert.match(playScreenSource, /const handleRankedActiveChange = useCallback/);
  assert.match(playScreenSource, /const workspaceCloseBlocked = rankedGameActive/);
  assert.match(playScreenSource, /if \(!workspaceCloseBlocked\) setWorkspaceOpen\(false\)/);
  assert.match(playScreenSource, /!workspaceCloseBlocked \? \(/);
  assert.match(playScreenSource, /onRankedActiveChange=\{handleRankedActiveChange\}/);
});

test("ranking workspace survives an iPhone orientation reload", () => {
  assert.match(playScreenSource, /playTabSessionKey/);
  assert.match(playScreenSource, /playRecoveryLocalKey/);
  assert.match(playScreenSource, /readRecentPlaySession/);
  assert.match(playScreenSource, /encodePlaySessionSnapshot\(workspaceOpen, tab\)/);
});

test("small phone play content scrolls instead of collapsing the primary action", () => {
  assert.match(playScreenSource, /import \{[^}]*ScrollView[^}]*\} from "react-native"/s);
  assert.match(playScreenSource, /<ScrollView[\s\S]*contentContainerStyle=\{\[styles\.screen/);
  assert.match(playScreenSource, /showsVerticalScrollIndicator=\{false\}/);
  assert.match(playScreenSource, /screen: \{[^}]*flexGrow: 1/s);
  assert.match(playScreenSource, /content: \{[^}]*flexGrow: 0/s);
  assert.match(playScreenSource, /primaryAction: \{[^}]*minHeight: 54/s);
});

test("ranking gate is inspectable at fewer than ten species", () => {
  assert.doesNotMatch(playScreenSource, /<Pressable disabled=\{locked\} key=\{item\}/);
  assert.match(playScreenSource, /accessibilityState=\{\{ disabled: locked, selected: tab === item \}\}/);
  assert.match(playScreenSource, /onPress=\{\(\) => setTab\(item\)\}/);
  assert.match(playScreenSource, /disabled=\{locked\}[\s\S]*onPress=\{tab === "arcade" \? openArcadeWorkspace : openRankingWorkspace\}/);
});


test("active arcade game removes the Choose a game workspace header", () => {
  assert.match(playScreenSource, /const \[gameFullscreen, setGameFullscreen\] = useState\(false\)/);
  assert.match(playScreenSource, /const handleFullscreenChange = useCallback/);
  assert.match(playScreenSource, /onFullscreenChange\?\.\(active\)/);
  assert.match(playScreenSource, /\{!gameFullscreen \? \([\s\S]*styles\.workspaceHeader/);
  assert.match(playScreenSource, /onFullscreenChange=\{handleFullscreenChange\}/);
});
