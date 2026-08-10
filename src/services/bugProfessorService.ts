type BugProfessorLanguage = "nl" | "en" | "fr";
type Identification = {
  commonName: string;
  commonNameEn: string;
  commonNameFr: string;
  confidence: number;
  fact: string;
  factEn: string;
  factFr: string;
  quizQuestion?: string;
  quizQuestionEn?: string;
  quizQuestionFr?: string;
  quizAnswer?: string;
  quizAnswerEn?: string;
  quizAnswerFr?: string;
  quizWrongAnswers?: string[];
  quizWrongAnswersEn?: string[];
  quizWrongAnswersFr?: string[];
  quizExplanation?: string;
  quizExplanationEn?: string;
  quizExplanationFr?: string;
};
type BugProfessorScan = { identification: Identification };

export type BugProfessorBrief = {
  title: string;
  confidence: string;
  fact: string;
  quizQuestion: string;
  quizAnswer: string;
  quizOptions: string[];
  quizExplanation: string;
  quizCategory: string;
  quizDifficulty: "easy" | "medium" | "hard";
  quizRewardPoints: number;
  correctLabel: string;
  wrongLabel: string;
  rewardLabel: string;
};

function localized(result: BugProfessorScan, language: BugProfessorLanguage, field: keyof Identification): string {
  const suffix = language === "en" ? "En" : language === "fr" ? "Fr" : "";
  const value = result.identification[`${String(field)}${suffix}` as keyof Identification];
  const fallback = result.identification[field];
  return typeof value === "string" && value.trim() ? value.trim() : typeof fallback === "string" ? fallback.trim() : "";
}

function localizedOptions(result: BugProfessorScan, language: BugProfessorLanguage): string[] {
  const value = language === "en"
    ? result.identification.quizWrongAnswersEn
    : language === "fr"
      ? result.identification.quizWrongAnswersFr
      : result.identification.quizWrongAnswers;
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean).slice(0, 3) : [];
}

function fallbackWrongFacts(language: BugProfessorLanguage): string[] {
  if (language === "en") return ["It lives only under water.", "It has no legs.", "It feeds only on stones."];
  if (language === "fr") return ["Il vit uniquement sous l'eau.", "Il n'a aucune patte.", "Il mange uniquement des pierres."];
  return ["Hij leeft alleen onder water.", "Hij heeft geen poten.", "Hij eet alleen stenen."];
}

function shuffle(items: string[], random: () => number): string[] {
  return items.map((item) => ({ item, sort: random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

function scanQuiz(result: BugProfessorScan, language: BugProfessorLanguage, random: () => number) {
  const fact = localized(result, language, "fact");
  const generatedQuestion = localized(result, language, "quizQuestion");
  const generatedAnswer = localized(result, language, "quizAnswer");
  const generatedWrong = localizedOptions(result, language);
  const hasGeneratedQuiz = Boolean(generatedQuestion && generatedAnswer && generatedWrong.length === 3);
  const answer = hasGeneratedQuiz ? generatedAnswer : fact;
  const question = hasGeneratedQuiz
    ? generatedQuestion
    : language === "en"
      ? "Which fact belongs to this bug?"
      : language === "fr"
        ? "Quel fait correspond à cet animal ?"
        : "Welk weetje hoort bij deze bug?";
  const wrong = hasGeneratedQuiz ? generatedWrong : fallbackWrongFacts(language);
  return {
    answer,
    options: shuffle([answer, ...wrong].filter(Boolean), random),
    question,
    explanation: localized(result, language, "quizExplanation") || fact,
    categoryLabel: language === "en" ? "Bug fact" : language === "fr" ? "Info insecte" : "Bugweetje"
  };
}

export function getBugProfessorBrief(result: BugProfessorScan, language: BugProfessorLanguage, random: () => number = Math.random): BugProfessorBrief {
  const quiz = scanQuiz(result, language, random);
  const confidence = Math.round(result.identification.confidence * 100);
  const confidenceCopy = language === "en"
    ? confidence >= 85 ? "Strong identification" : "Tentative identification"
    : language === "fr"
      ? confidence >= 85 ? "Identification solide" : "Identification prudente"
      : confidence >= 85 ? "Sterke herkenning" : "Voorzichtige herkenning";
  const fact = localized(result, language, "fact");
  return {
    title: language === "fr" ? "Professeur Bug" : "Bug Professor",
    confidence: language === "fr" ? `${confidenceCopy} : ${confidence}%` : `${confidenceCopy}: ${confidence}%`,
    fact,
    quizQuestion: quiz.question,
    quizAnswer: quiz.answer,
    quizOptions: quiz.options,
    quizExplanation: quiz.explanation,
    quizCategory: quiz.categoryLabel,
    quizDifficulty: "easy",
    quizRewardPoints: 1,
    correctLabel: language === "en" ? "Correct!" : language === "fr" ? "Correct !" : "Goed!",
    wrongLabel: language === "en" ? "Not quite" : language === "fr" ? "Pas tout à fait" : "Bijna",
    rewardLabel: language === "en" ? "XP earned" : language === "fr" ? "XP gagné" : "XP verdiend"
  };
}
