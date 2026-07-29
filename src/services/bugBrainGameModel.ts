import { BUG_QUIZ_QUESTION_COUNT, getBugQuizQuestion, type BugQuizLanguage, type BugQuizQuestion } from "./bugQuizService.ts";
import { bugDexEntries, type BugDexEntry, type BugDexRarity } from "./pointsService.ts";

export const BUG_BRAIN_DAILY_QUESTION_COUNT = 10;
export const BUG_BRAIN_QUESTION_DURATION_MS = 30_000;

export type BugBrainRewardTier = Extract<BugDexRarity, "Zeldzaam" | "Episch" | "Legendarisch">;

export function buildBugBrainRun(
  language: BugQuizLanguage,
  seed: number,
  count = BUG_BRAIN_DAILY_QUESTION_COUNT
): BugQuizQuestion[] {
  const wanted = Math.max(1, Math.min(BUG_QUIZ_QUESTION_COUNT, Math.floor(count)));
  const questions: BugQuizQuestion[] = [];
  const used = new Set<string>();
  let state = (Math.floor(seed) >>> 0) || 1;

  while (questions.length < wanted) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const question = getBugQuizQuestion(state % BUG_QUIZ_QUESTION_COUNT, language);
    if (used.has(question.id)) continue;
    used.add(question.id);
    questions.push(question);
  }

  return questions;
}

export function bugBrainTimedAnswerScore(correct: boolean, elapsedMs: number): 0 | 1 {
  const safeElapsedMs = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : BUG_BRAIN_QUESTION_DURATION_MS);
  return correct && safeElapsedMs < BUG_BRAIN_QUESTION_DURATION_MS ? 1 : 0;
}

export function bugBrainDailyRewardTier(correctAnswers: number): BugBrainRewardTier | null {
  const safeCorrectAnswers = Math.max(0, Math.floor(Number(correctAnswers) || 0));
  if (safeCorrectAnswers >= 10) return "Legendarisch";
  if (safeCorrectAnswers >= 8) return "Episch";
  if (safeCorrectAnswers >= 5) return "Zeldzaam";
  return null;
}

export function bugBrainRewardEntryForTier(tier: BugBrainRewardTier, seed: number): BugDexEntry {
  const candidates = bugDexEntries.filter((entry) => entry.rarity === tier);
  if (!candidates.length) throw new Error(`Geen BugDex-reward beschikbaar voor ${tier}.`);
  const safeSeed = Math.floor(Number(seed) || 0) >>> 0;
  return candidates[safeSeed % candidates.length];
}
