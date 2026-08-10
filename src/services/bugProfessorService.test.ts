import assert from "node:assert/strict";
import test from "node:test";
import { getBugProfessorBrief } from "./bugProfessorService.ts";

const result = {
  ok: true as const,
  scanId: "scan-1",
  status: "matched" as const,
  remainingScans: 2,
  identification: {
    bugId: "mier", commonName: "Mier", commonNameEn: "Ant", commonNameFr: "Fourmi", scientificName: "Formica", fact: "Leeft in kolonies.", factEn: "Lives in colonies.", factFr: "Vit en colonies.", confidence: 0.91, reason: "Zichtbare antennes.", reasonEn: "Visible antennae.", reasonFr: "Antennes visibles.",
    quizQuestion: "Hoe leven veel mieren samen?", quizQuestionEn: "How do many ants live together?", quizQuestionFr: "Comment vivent beaucoup de fourmis ?",
    quizAnswer: "In een kolonie", quizAnswerEn: "In a colony", quizAnswerFr: "Dans une colonie",
    quizWrongAnswers: ["Helemaal alleen", "Alleen in water", "In een vogelzwerm"], quizWrongAnswersEn: ["Completely alone", "Only in water", "In a bird flock"], quizWrongAnswersFr: ["Toutes seules", "Seulement dans l'eau", "Dans un vol d'oiseaux"],
    quizExplanation: "Veel mieren wonen en werken samen in een kolonie.", quizExplanationEn: "Many ants live and work together in a colony.", quizExplanationFr: "Beaucoup de fourmis vivent et travaillent dans une colonie."
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
  assert.equal(brief.quizCategory, "Bugweetje");
  assert.equal(brief.quizQuestion, "Hoe leven veel mieren samen?");
  assert.equal(brief.quizAnswer, "In een kolonie");
  assert.notEqual(brief.quizAnswer, result.identification.commonName);
});

test("legacy scans fall back to a fact question and never ask for the visible species name", () => {
  const legacy = { ...result, identification: { ...result.identification, quizQuestion: undefined, quizAnswer: undefined, quizWrongAnswers: undefined } };
  const brief = getBugProfessorBrief(legacy, "nl", () => 0);
  assert.equal(brief.quizQuestion, "Welk weetje hoort bij deze bug?");
  assert.equal(brief.quizAnswer, result.identification.fact);
  assert.doesNotMatch(brief.quizQuestion, /welke bug|naam/i);
});
