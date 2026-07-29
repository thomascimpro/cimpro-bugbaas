import assert from "node:assert/strict";
import test from "node:test";
import { BUG_QUIZ_QUESTION_COUNT, getBugQuizQuestion, getRandomBugQuizQuestion, type BugQuizQuestion } from "./bugQuizService.ts";

test("bug quiz exposes exactly 1000 valid unique questions per language", () => {
  assert.equal(BUG_QUIZ_QUESTION_COUNT, 1000);

  for (const language of ["nl", "en", "fr"] as const) {
    const questions: BugQuizQuestion[] = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    assert.equal(new Set(questions.map((question) => question.id)).size, BUG_QUIZ_QUESTION_COUNT);
    assert.equal(new Set(questions.map((question) => question.question)).size, BUG_QUIZ_QUESTION_COUNT);
    assert.ok(questions.every((question) => question.question.length > 20));
    assert.ok(questions.every((question) => question.answer.trim().length > 0));
    assert.ok(questions.every((question) => question.options.length === (question.category === "myth_or_truth" ? 2 : 4)));
    assert.ok(questions.every((question) => new Set(question.options).size === question.options.length));
    assert.ok(questions.every((question) => question.options.includes(question.answer)));
    assert.ok(questions.every((question) => question.explanation.length > question.answer.length));
    assert.ok(questions.every((question) => question.rewardPoints >= 1 && question.rewardPoints <= 3));
  }
});

test("bug quiz rotates through eight genuinely different localized categories", () => {
  const expectedCategories = new Set([
    "bizarre_fact",
    "myth_or_truth",
    "identify_bug",
    "field_scenario",
    "appearance",
    "habitat_behavior",
    "local_species",
    "expert_challenge"
  ]);

  for (const language of ["nl", "en", "fr"] as const) {
    const questions: BugQuizQuestion[] = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    assert.deepEqual(new Set(questions.map((question) => question.category)), expectedCategories);
    assert.ok(questions.every((question) => question.categoryLabel.trim().length > 3));
    assert.ok(questions.filter((question) => question.category === "myth_or_truth").every((question) => question.options.length === 2));
    assert.ok(questions.filter((question) => question.category === "identify_bug").every((question) => question.question.includes("?")));
  }
});

test("generated questions never reveal the correct answer in the prompt", () => {
  const normalize = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    for (const question of questions.filter((item) => item.category !== "myth_or_truth")) {
      const prompt = normalize(question.question);
      const answer = normalize(question.answer);
      assert.ok(!prompt.includes(answer), `${language}: antwoord staat in vraag: ${question.question} => ${question.answer}`);
    }
  }
});

test("group questions use scientific insect orders instead of name-repeating labels", () => {
  const insectOrders = new Set([
    "Coleoptera",
    "Dermaptera",
    "Diptera",
    "Ephemeroptera",
    "Hemiptera",
    "Hymenoptera",
    "Lepidoptera",
    "Mantodea",
    "Neuroptera",
    "Odonata",
    "Orthoptera"
  ]);

  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    const groupAnswers = questions
      .filter((question) => question.category === "expert_challenge"
        || (question.topic === "group" && !["myth_or_truth", "identify_bug", "field_scenario", "local_species"].includes(question.category)))
      .map((question) => question.answer);
    assert.ok(groupAnswers.every((answer) => insectOrders.has(answer)), `${language}: ongeldige groepsnaam gevonden`);
  }
});

test("Dutch generated questions keep finite verbs out of subordinate-clause openings", () => {
  const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, "nl"));
  const brokenClause = /(doordat het|als het|een soort die)\s+(leeft|eet|is|hoort|grijpt|communiceert|vertelt|klapt|kan|proeft|springt|maakt|verzorgt|heeft|verdeelt|lijkt|neemt|brengt|produceert)/i;
  assert.ok(questions.every((question) => !brokenClause.test(question.question)));
});

test("quiz explanations start their second sentence with a capital letter", () => {
  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    for (const question of questions) {
      const secondSentence = question.explanation.split(". ")[1] ?? "";
      assert.match(secondSentence, /^[A-ZÀ-ÖØ-Þ]/, `${language}: ${question.explanation}`);
    }
  }
});

test("generated questions stay readable and do not concatenate multiple prompts", () => {
  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    assert.ok(questions.every((question) => (question.question.match(/\?/g) ?? []).length === 1));
    assert.ok(questions.every((question) => question.question.length <= 180));
    assert.ok(questions.every((question) => !/I has|I live .*Which insect|When is it active\? Zoom|What does it eat\? Field/i.test(question.question)));
    assert.ok(questions
      .filter((question) => ["identify_bug", "field_scenario", "local_species"].includes(question.category))
      .every((question) => !question.question.toLocaleLowerCase().includes(question.answer.toLocaleLowerCase())));
  }
});

test("generated questions are direct and contain no decorative intros", () => {
  const bannedPatterns: Record<"nl" | "en" | "fr", RegExp> = {
    nl: /BugDex-check|Bug Professor|Veldnotitie|Snelle kennisronde|Onderzoekersvraag|Zoom in op|Nieuwe observatie|Expertcheck|Kenmerkenkaart|Quizvraag|BugDex-mysterie|Raadsel van|Veldwaarneming|Snelle herkenningsronde|Onderzoekersnotitie|aanwijzing uit het veld|Mysterie uit je buurt|Expertwaarneming|Nieuwe insectenclue|Herkenningsvraag|Focus:|Clues:|Clues dichtbij:|Expertclue/i,
    en: /BugDex check|Bug Professor|Field note|Quick knowledge round|Research question|Take a closer look|New observation|Expert check|Trait card|Quiz question|BugDex mystery|riddle|Field observation|identification round|Research note|clue from the field|mystery close to home|Expert observation|New insect clue|Identification question|Focus:|Clues:|Nearby clues:|Expert clue/i,
    fr: /Verification BugDex|Professeur Bug|Note de terrain|Question rapide|Question de recherche|Observe .* de plus pres|Nouvelle observation|Verification experte|Fiche de caracteristiques|Question de quiz|Mystere BugDex|Enigme|Observation de terrain|Identification rapide|Note de recherche|indice du terrain|Mystere pres de chez toi|Observation experte|Nouvel indice|Question d'identification|Theme :|Indices :|Indices proches :|Indice expert/i
  };
  const directStarts: Record<"nl" | "en" | "fr", RegExp> = {
    nl: /^(Welk|Welke|Wat|Waar|Wanneer|Bij welke|Tot welke|Het)/,
    en: /^(Which|What|Where|When|True or false|To which|It)/,
    fr: /^(Quel|Quelle|Que|Ou|Quand|Vrai ou faux|A quel|Dans quel|Il)/
  };

  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    assert.ok(questions.every((question) => directStarts[language].test(question.question)));
    assert.ok(questions.every((question) => !bannedPatterns[language].test(question.question)));
    assert.ok(questions
      .filter((question) => question.category === "appearance")
      .every((question) => !/zichtbaar|visible|trait visible/i.test(question.question)));
    assert.ok(questions
      .filter((question) => question.category === "expert_challenge")
      .every((question) => !/clue|aanwijzing|indice/i.test(question.question)));
  }
});

test("generated questions phrase facts as sentences instead of field labels", () => {
  const fieldLabelPatterns: Record<"nl" | "en" | "fr", RegExp> = {
    nl: /(leefgebied|voedsel|activiteit|insectengroep|bijzonder kenmerk):/i,
    en: /(habitat|diet|activity|insect group|special trait):/i,
    fr: /(habitat|alimentation|activite|groupe d'insectes|particularite)\s*:/i
  };

  for (const language of ["nl", "en", "fr"] as const) {
    const questions = Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language));
    assert.ok(questions.every((question) => !fieldLabelPatterns[language].test(question.question)));
  }
});

test("myth-or-truth questions contain both true and false answers", () => {
  for (const language of ["nl", "en", "fr"] as const) {
    const answers = new Set(Array.from({ length: BUG_QUIZ_QUESTION_COUNT }, (_, index) => getBugQuizQuestion(index, language))
      .filter((question) => question.category === "myth_or_truth")
      .map((question) => question.answer));
    assert.deepEqual(answers, new Set(language === "nl" ? ["Waar", "Onwaar"] : language === "fr" ? ["Vrai", "Faux"] : ["True", "False"]));
  }
});

test("random bug quiz clamps invalid random values safely", () => {
  assert.equal(getRandomBugQuizQuestion("nl", () => -1).id, getBugQuizQuestion(0, "nl").id);
  assert.equal(getRandomBugQuizQuestion("nl", () => 2).id, getBugQuizQuestion(999, "nl").id);
  assert.equal(getRandomBugQuizQuestion("nl", () => Number.NaN).id, getBugQuizQuestion(0, "nl").id);
});
