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

test("scan opens the phone camera first and keeps a fullscreen fallback", () => {
  assert.match(source, /ImagePicker\.launchCameraAsync/);
  assert.match(source, /ImagePicker\.getPendingResultAsync/);
  assert.match(source, /quality: 1/);
  assert.match(source, /presentationStyle="fullScreen"/);
  assert.match(source, /visible=\{cameraOpen\}/);
  assert.match(source, /styles\.cameraModal/);
  assert.match(source, /styles\.cameraViewport/);
  assert.match(source, /flash=\{cameraFlash\}/);
  assert.match(source, /selectedLens=\{cameraLens\}/);
  assert.match(source, /responsiveOrientationWhenOrientationLocked/);
  assert.match(source, /nextRealBugFlashMode/);
  assert.match(source, /realBugLensLabel/);
  assert.match(source, /onTouchMove=\{moveCameraPinch\}/);
  assert.doesNotMatch(source, /styles\.zoomButton/);
});

test("scan preserves the original photo until the final crop and compression", () => {
  assert.match(source, /sourceUri: normalized\.uri/);
  assert.match(source, /prepareSubmissionPhoto\(sourceUri, sourceWidth, sourceHeight, crop\)/);
  assert.match(source, /fallbackRealBugPhotoPlan\(width, height\)/);
  assert.match(source, /emergencyRealBugPhotoPlan\(width, height\)/);
  assert.doesNotMatch(source, /fallbackRealBugPhotoPlan\(primary\.width/);
  assert.doesNotMatch(source, /emergencyRealBugPhotoPlan\(prepared\.width/);
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
  assert.doesNotMatch(source, /professorQuizOpen/);
  assert.match(source, /localized\?\.fact && professorQuizSelection/);
  assert.doesNotMatch(source, /<Text style=\{styles\.professorFact\}>\{professor\.fact\}/);
});

test("confirmed scan rewards are handed to the BugDex unlock presentation", () => {
  assert.match(source, /onRewardDrop: \(drop: BugDexDropResult\) => void/);
  assert.match(source, /if \(submission\.drop\) onRewardDrop\(submission\.drop\)/);
});

test("every successful scan requires an automatic private fieldnote before its reward", () => {
  assert.match(source, /void prepareJournalLocation\(\)/);
  assert.match(source, /const locationResult = await requestPrivateSightingLocation\(\)/);
  assert.match(source, /!journalLocation \|\| !habitat \|\| !behavior/);
  assert.match(source, /saveAutomaticJournal\(result, pendingScanDrop, habitat, behavior, journalLocation, contestReviewThumbnail\)/);
  assert.match(source, /saveFieldJournalEntry\(user, nextResult, selectedHabitat, selectedBehavior, location, reviewThumbnailDataUrl\)/);
  assert.match(source, /Kies 1 habitat en 1 gedrag/);
  assert.match(source, /disabled=\{journalRequired\} onPress=\{onBack\}/);
  assert.doesNotMatch(source, /accessibilityRole="checkbox"/);
});
