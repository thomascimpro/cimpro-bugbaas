type BugProfessorLanguage = "nl" | "en" | "fr";
type BugProfessorScan = { identification: { commonName: string; commonNameEn: string; commonNameFr: string; confidence: number; fact: string; factEn: string; factFr: string } };

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
  quizButton: string;
  answerButton: string;
  nextQuestionButton: string;
  correctLabel: string;
  wrongLabel: string;
  rewardLabel: string;
};

function localizedFact(result: BugProfessorScan, language: BugProfessorLanguage): string {
  if (language === "en") return result.identification.factEn;
  if (language === "fr") return result.identification.factFr;
  return result.identification.fact;
}

function localizedName(result: BugProfessorScan, language: BugProfessorLanguage): string {
  if (language === "en") return result.identification.commonNameEn;
  if (language === "fr") return result.identification.commonNameFr;
  return result.identification.commonName;
}

function scanQuiz(result: BugProfessorScan, language: BugProfessorLanguage, random: () => number) {
  const answer = localizedName(result, language).trim();
  const distractors = language === "en"
    ? ["Ladybird", "Dragonfly", "Grasshopper", "Garden spider", "Hoverfly", "Ant"]
    : language === "fr"
      ? ["Coccinelle", "Libellule", "Sauterelle", "Épeire", "Syrphe", "Fourmi"]
      : ["Lieveheersbeestje", "Libel", "Sprinkhaan", "Kruisspin", "Zweefvlieg", "Mier"];
  const options = [answer, ...distractors.filter((item) => item.toLocaleLowerCase() !== answer.toLocaleLowerCase()).slice(0, 3)]
    .map((item) => ({ item, sort: random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ item }) => item);
  const fact = localizedFact(result, language);
  return {
    answer,
    options,
    question: language === "en"
      ? "Which bug did you just photograph?"
      : language === "fr"
        ? "Quel animal viens-tu de photographier ?"
        : "Welke bug heb je net gefotografeerd?",
    explanation: fact || (language === "en"
      ? `The scan identified ${answer}.`
      : language === "fr"
        ? `Le scan a identifié ${answer}.`
        : `De scan herkende ${answer}.`),
    categoryLabel: language === "en" ? "Your discovery" : language === "fr" ? "Ta découverte" : "Jouw vondst",
    difficulty: "easy" as const,
    rewardPoints: 1
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
  const fact = localizedFact(result, language);

  if (language === "en") return {
    title: "Bug Professor",
    confidence: `${confidenceCopy}: ${confidence}%`,
    fact: fact || "No extra species fact is available for this scan.",
    quizQuestion: quiz.question,
    quizAnswer: quiz.answer,
    quizOptions: quiz.options,
    quizExplanation: quiz.explanation,
    quizCategory: quiz.categoryLabel,
    quizDifficulty: quiz.difficulty,
    quizRewardPoints: quiz.rewardPoints,
    quizButton: "Start quiz",
    answerButton: "Check answer",
    nextQuestionButton: "Next question",
    correctLabel: "Correct!",
    wrongLabel: "Not quite",
    rewardLabel: "XP earned"
  };
  if (language === "fr") return {
    title: "Professeur Bug",
    confidence: `${confidenceCopy} : ${confidence}%`,
    fact: fact || "Aucun fait supplementaire n'est disponible pour ce scan.",
    quizQuestion: quiz.question,
    quizAnswer: quiz.answer,
    quizOptions: quiz.options,
    quizExplanation: quiz.explanation,
    quizCategory: quiz.categoryLabel,
    quizDifficulty: quiz.difficulty,
    quizRewardPoints: quiz.rewardPoints,
    quizButton: "Lancer le quiz",
    answerButton: "Verifier",
    nextQuestionButton: "Question suivante",
    correctLabel: "Correct !",
    wrongLabel: "Pas tout a fait",
    rewardLabel: "XP gagne"
  };
  return {
    title: "Bug Professor",
    confidence: `${confidenceCopy}: ${confidence}%`,
    fact: fact || "Voor deze scan is geen extra soortfeit beschikbaar.",
    quizQuestion: quiz.question,
    quizAnswer: quiz.answer,
    quizOptions: quiz.options,
    quizExplanation: quiz.explanation,
    quizCategory: quiz.categoryLabel,
    quizDifficulty: quiz.difficulty,
    quizRewardPoints: quiz.rewardPoints,
    quizButton: "Start quiz",
    answerButton: "Controleer antwoord",
    nextQuestionButton: "Volgende vraag",
    correctLabel: "Goed!",
    wrongLabel: "Bijna",
    rewardLabel: "XP verdiend"
  };
}
