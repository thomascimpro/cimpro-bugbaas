import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "MuseumScreen.tsx"), "utf8");

test("museum stage rail is interactive and selects a stage goal", () => {
  assert.match(source, /const \[selectedGoalStage, setSelectedGoalStage\] = useState<MuseumGoalStage \| null>\(null\)/);
  assert.match(source, /<RoomPanel[\s\S]*onSelectStage=\{setSelectedGoalStage\}/);
  assert.match(source, /<StageRail[\s\S]*onSelectStage=\{onSelectStage\}/);
  assert.match(source, /<Pressable[\s\S]*onPress=\{\(\) => onSelectStage\(goalStage\)\}/);
});

test("museum tabs and stage requirements use phone-safe hit targets", () => {
  assert.match(source, /style=\{\(\{ pressed \}\) => \[styles\.tab, \{ minHeight: Math\.max\(48, layout\.touchTarget\) \}/);
  assert.match(source, /style=\{styles\.stageSegmentHit\}/);
  assert.match(source, /stageSegmentHit:\s*\{[^}]*minHeight: 48[^}]*paddingVertical: 17/s);
  assert.match(source, /<View style=\{\[styles\.stageSegment/);
});

test("museum uses one vertical page scroll instead of a trapped panel scroll", () => {
  assert.match(source, /<ScrollView[\s\S]*contentContainerStyle=\{\[[\s\S]*styles\.shell/);
  assert.match(source, /<View style=\{styles\.panelWrap\}>/);
  assert.doesNotMatch(source, /contentContainerStyle=\{styles\.panelScrollContent\}/);
  assert.match(source, /layout\.bottomNavHeight \+ layout\.bottomNavInset/);
});

const editorSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../components/museum/MuseumExhibitEditor.tsx"), "utf8");

test("museum editor shows all six podiums and locks only unavailable slots", () => {
  assert.match(editorSource, /Array\.from\(\{ length: 6 \}\)/);
  assert.match(editorSource, /const locked = index >= capacity/);
  assert.match(editorSource, /disabled=\{locked\}/);
  assert.match(editorSource, /requiredStageForSlot/);
});
