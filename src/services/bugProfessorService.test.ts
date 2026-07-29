import assert from "node:assert/strict";
import test from "node:test";
import { getBugProfessorBrief } from "./bugProfessorService.ts";

const result = {
  ok: true as const,
  scanId: "scan-1",
  status: "matched" as const,
  remainingScans: 2,
  identification: {
    bugId: "mier", commonName: "Mier", commonNameEn: "Ant", commonNameFr: "Fourmi", scientificName: "Formica", fact: "Leeft in kolonies.", factEn: "Lives in colonies.", factFr: "Vit en colonies.", confidence: 0.91, reason: "Zichtbare antennes.", reasonEn: "Visible antennae.", reasonFr: "Antennes visibles."
  }
};

test("Bug Professor combines localized scan copy with a playable quiz", () => {
  const brief = getBugProfessorBrief(result, "nl", () => 0);
  assert.equal(brief.confidence, "Sterke herkenning: 91%");
  assert.equal(brief.fact, "Leeft in kolonies.");
  assert.equal(brief.quizOptions.length, 4);
  assert.ok(brief.quizOptions.includes(brief.quizAnswer));
  assert.ok(brief.quizExplanation.length > brief.quizAnswer.length);
  assert.equal(brief.quizRewardPoints, 1);
  assert.equal(brief.quizCategory, "Insectenfeit");
});
