import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "RealBugScanScreen.tsx"), "utf8");

test("scan capture hero uses the responsive field-scanner composition", () => {
  assert.match(source, /useResponsiveLayout/);
  assert.match(source, /styles\.heroNatureLayer/);
  assert.match(source, /styles\.heroLeafLeft/);
  assert.match(source, /styles\.heroLeafRight/);
  assert.match(source, /bugbaas-scan-medallion-v1\.png/);
  assert.match(source, /<ScanStageHeader stage=\{scanStage\}/);
  assert.doesNotMatch(source, /style=\{\[styles\.heroStepsPanel/);
  assert.match(source, /styles\.captureWorkspaceTablet/);
  assert.match(source, /Animated\.spring\(stageReveal/);
});

test("scan keeps gallery reachable and gives the live camera a phone-safe frame", () => {
  assert.match(source, /scrollEnabled=\{!cameraOpen \|\| scanStageAllowsPageScroll\(scanStage\)\}/);
  assert.match(source, /cameraCard:\s*\{[\s\S]*?width: "100%"/);
  assert.match(source, /cameraFrame:\s*\{[^}]*aspectRatio: 1\.1/s);
  assert.match(source, /cameraFrameTablet:\s*\{[^}]*aspectRatio: 4 \/ 3/s);
});

test("review keeps its controls above the fixed phone navigation", () => {
  assert.match(source, /densePhone && styles\.previewFramePhone/);
  assert.match(source, /densePhone && styles\.reviewPrimaryButtonPhone/);
  assert.match(source, /densePhone && styles\.reviewSecondaryButtonPhone/);
  assert.match(source, /paddingBottom: layout\.bottomNavHeight \+ layout\.bottomNavInset \+ \(layout\.isTablet \? 24 : 72\)/);
});

test("phone scan actions keep accessible hit targets above the decorative hero", () => {
  assert.match(source, /captureWorkspace:\s*\{[^}]*flexDirection: "column-reverse"[^}]*gap: 12/s);
  assert.match(source, /captureWorkspaceTablet:\s*\{[^}]*flexDirection: "row"/s);
  assert.match(source, /capturePrimaryButtonPhone:\s*\{[^}]*minHeight: 52/s);
  assert.match(source, /galleryButtonPhone:\s*\{[^}]*minHeight: 48/s);
  assert.match(source, /heroCardCompact:\s*\{[^}]*minHeight: 300/s);
});

test("scan professor offers exactly one rewarded question", () => {
  assert.doesNotMatch(source, /nextProfessorQuestion/);
  assert.doesNotMatch(source, /professor\.nextQuestionButton/);
});

test("confirmed scan rewards are handed to the BugDex unlock presentation", () => {
  assert.match(source, /onRewardDrop: \(drop: BugDexDropResult\) => void/);
  assert.match(source, /if \(submission\.drop\) onRewardDrop\(submission\.drop\)/);
});
