import assert from "node:assert/strict";
import test from "node:test";
import { deriveRealBugScanStage, realBugScanResultKind, scanStageAllowsPageScroll } from "./realBugScanFlowModel.ts";

test("derives one explicit stage from capture through impact", () => {
  assert.equal(deriveRealBugScanStage({ busy: false, cameraOpen: false, hasPhoto: false, hasResult: false, journalSaved: false }), "capture");
  assert.equal(deriveRealBugScanStage({ busy: false, cameraOpen: true, hasPhoto: false, hasResult: false, journalSaved: false }), "capture");
  assert.equal(deriveRealBugScanStage({ busy: false, cameraOpen: false, hasPhoto: true, hasResult: false, journalSaved: false }), "review");
  assert.equal(deriveRealBugScanStage({ busy: true, cameraOpen: false, hasPhoto: true, hasResult: false, journalSaved: false }), "identification");
  assert.equal(deriveRealBugScanStage({ busy: false, cameraOpen: false, hasPhoto: false, hasResult: true, journalSaved: false }), "result");
  assert.equal(deriveRealBugScanStage({ busy: false, cameraOpen: false, hasPhoto: false, hasResult: true, journalSaved: true }), "impact");
});

test("allows page scrolling when review controls can extend below the fixed navigation", () => {
  assert.equal(scanStageAllowsPageScroll("capture"), false);
  assert.equal(scanStageAllowsPageScroll("review"), true);
  assert.equal(scanStageAllowsPageScroll("identification"), false);
  assert.equal(scanStageAllowsPageScroll("result"), true);
  assert.equal(scanStageAllowsPageScroll("impact"), true);
});

test("maps every scan response to one useful result kind", () => {
  assert.equal(realBugScanResultKind({ status: "matched", rewardGranted: true, awardedCopy: false }), "new-species");
  assert.equal(realBugScanResultKind({ status: "matched", rewardGranted: true, awardedCopy: true }), "duplicate");
  assert.equal(realBugScanResultKind({ status: "already_spotted", rewardGranted: false, awardedCopy: false }), "duplicate");
  assert.equal(realBugScanResultKind({ status: "not_in_catalog", rewardGranted: false, awardedCopy: false }), "journal-only");
  assert.equal(realBugScanResultKind({ status: "pending_review", rewardGranted: false, awardedCopy: false }), "pending");
  assert.equal(realBugScanResultKind({ status: "rejected_quality", rewardGranted: false, awardedCopy: false }), "retake");
  assert.equal(realBugScanResultKind({ status: "rejected_no_bug", rewardGranted: false, awardedCopy: false }), "not-a-bug");
});
