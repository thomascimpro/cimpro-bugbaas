import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { User } from "../types";
import { useI18n } from "../services/i18n";
import {
  BUG_BRAIN_DAILY_QUESTION_COUNT,
  BUG_BRAIN_QUESTION_DURATION_MS,
  buildBugBrainRun,
  bugBrainTimedAnswerScore,
  type BugBrainRewardTier
} from "../services/bugBrainGameModel";
import {
  completeBugBrainDailyRun,
  loadBugBrainDailyStatus,
  startBugBrainDailyRun,
  type BugBrainDailyCompletion
} from "../services/bugBrainRewardService";
import type { BugDexDropResult } from "../services/bugDexService";
import type { BugQuizQuestion } from "../services/bugQuizService";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";

const knowledgeKeeper = require("../../assets/characters/character-knowledge-keeper.png");
const labCatcher = require("../../assets/characters/character-lab-catcher.png");

type RunState = "loading" | "ready" | "starting" | "active" | "submitting" | "submit-error" | "finished" | "used" | "start-error";

type Props = {
  user: User;
  onActiveChange?: (active: boolean) => void;
  onExit: () => void;
  onCompleted?: (completion: BugBrainDailyCompletion) => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
};

export function BugBrainScreen({ user, onActiveChange, onCompleted, onExit, onRewardDrop, onUserUpdated }: Props) {
  const { language } = useI18n();
  const layout = useResponsiveLayout();
  const copy = localizedCopy(language);
  const [runState, setRunState] = useState<RunState>("loading");
  const [seed, setSeed] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [remainingMs, setRemainingMs] = useState(BUG_BRAIN_QUESTION_DURATION_MS);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [completion, setCompletion] = useState<BugBrainDailyCompletion | null>(null);
  const questionStartedAtRef = useRef(0);
  const answerLockedRef = useRef(false);
  const correctAnswersRef = useRef(0);

  const questions = useMemo(
    () => seed === null ? [] : buildBugBrainRun(language, seed, BUG_BRAIN_DAILY_QUESTION_COUNT),
    [language, seed]
  );
  const question: BugQuizQuestion | null = questions[questionIndex] ?? null;
  const timerSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const timerPercent = Math.max(0, Math.min(100, (remainingMs / BUG_BRAIN_QUESTION_DURATION_MS) * 100));
  const active = runState === "active" || runState === "submitting" || runState === "submit-error";

  useEffect(() => {
    let mounted = true;
    setRunState("loading");
    void loadBugBrainDailyStatus(user).then((status) => {
      if (!mounted) return;
      if (status.status === "completed") {
        setCompletion({
          awardedXp: status.awardedXp,
          alreadyCompleted: true,
          correctAnswers: status.correctAnswers,
          rewardBugId: status.rewardBugId,
          rewardTier: status.rewardTier,
          user
        });
        setRunState("finished");
        return;
      }
      if (status.status === "active") {
        setRunState("used");
        return;
      }
      setRunState("ready");
    }).catch(() => {
      if (mounted) setRunState("start-error");
    });
    return () => { mounted = false; };
  }, [user.uid]);

  useEffect(() => {
    if (runState !== "active" || !question || answered) return;
    answerLockedRef.current = false;
    questionStartedAtRef.current = Date.now();
    setRemainingMs(BUG_BRAIN_QUESTION_DURATION_MS);
    const interval = setInterval(() => {
      const nextRemaining = Math.max(0, BUG_BRAIN_QUESTION_DURATION_MS - (Date.now() - questionStartedAtRef.current));
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(interval);
        resolveAnswer(null, true);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [answered, question?.id, questionIndex, runState]);

  useEffect(() => () => {
    onActiveChange?.(false);
  }, [onActiveChange]);

  async function startRun() {
    if (runState === "starting" || active) return;
    setRunState("starting");
    try {
      const result = await startBugBrainDailyRun(user);
      if (!result.available || result.seed === null) {
        setRunState("used");
        return;
      }
      setSeed(result.seed);
      setQuestionIndex(0);
      setCorrectAnswers(0);
      correctAnswersRef.current = 0;
      setAnswered(false);
      setSelected(null);
      setTimedOut(false);
      setCompletion(null);
      setRunState("active");
      onActiveChange?.(true);
    } catch {
      setRunState("start-error");
    }
  }

  function resolveAnswer(option: string | null, didTimeOut = false) {
    if (answerLockedRef.current || runState !== "active" || !question) return;
    answerLockedRef.current = true;
    const elapsedMs = didTimeOut ? BUG_BRAIN_QUESTION_DURATION_MS : Date.now() - questionStartedAtRef.current;
    const point = bugBrainTimedAnswerScore(option === question.answer, elapsedMs);
    const nextCorrectAnswers = correctAnswersRef.current + point;
    correctAnswersRef.current = nextCorrectAnswers;
    setCorrectAnswers(nextCorrectAnswers);
    setSelected(option);
    setTimedOut(didTimeOut);
    setAnswered(true);
    setRemainingMs(Math.max(0, BUG_BRAIN_QUESTION_DURATION_MS - elapsedMs));
  }

  function advanceQuestion() {
    if (!answered || runState !== "active") return;
    if (questionIndex + 1 >= BUG_BRAIN_DAILY_QUESTION_COUNT) {
      void finishRun(correctAnswersRef.current);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelected(null);
    setTimedOut(false);
    setAnswered(false);
  }

  async function finishRun(finalCorrectAnswers: number) {
    setRunState("submitting");
    try {
      const result = await completeBugBrainDailyRun(user, finalCorrectAnswers);
      setCompletion(result);
      onUserUpdated?.(result.user);
      if (result.drop) onRewardDrop?.(result.drop);
      onCompleted?.(result);
      onActiveChange?.(false);
      setRunState("finished");
    } catch {
      setRunState("submit-error");
    }
  }

  if (runState === "loading") {
    return <View style={styles.centerState}><Text style={styles.loadingText}>{copy.loading}</Text></View>;
  }

  if (runState === "active" && question) {
    return (
      <View style={[styles.gameScreen, { paddingHorizontal: layout.gutter, paddingTop: layout.isTablet ? 28 : 16 }]}>
        <View style={styles.gameAmbientOne} />
        <View style={styles.gameAmbientTwo} />
        <View style={styles.hudRow}>
          <View style={styles.hudBlock}>
            <Text style={styles.hudLabel}>{copy.question}</Text>
            <Text style={styles.hudValue}>{questionIndex + 1}<Text style={styles.hudMuted}>/{BUG_BRAIN_DAILY_QUESTION_COUNT}</Text></Text>
          </View>
          <View style={[styles.timerPill, timerSeconds <= 5 && styles.timerPillDanger]}>
            <Text style={[styles.timerValue, timerSeconds <= 5 && styles.timerValueDanger]}>{timerSeconds}</Text>
            <Text style={styles.timerUnit}>SEC</Text>
          </View>
          <View style={[styles.hudBlock, styles.hudBlockRight]}>
            <Text style={styles.hudLabel}>XP</Text>
            <Text style={styles.hudValue}>+{correctAnswers}</Text>
          </View>
        </View>

        <View style={styles.timerTrack}>
          <View style={[styles.timerFill, timerSeconds <= 5 && styles.timerFillDanger, { width: `${timerPercent}%` }]} />
        </View>

        <ScrollView contentContainerStyle={[styles.gameContent, layout.isTablet && styles.gameContentTablet]} showsVerticalScrollIndicator={false}>
          <View style={styles.questionCard}>
            <View style={styles.questionTopRow}>
              <Text style={styles.category}>{question.categoryLabel}</Text>
              <Text style={styles.rewardHint}>{copy.rewardHint}</Text>
            </View>
            <Text style={[styles.questionText, { fontSize: layout.isTablet ? 30 : layout.isCompact ? 21 : 24 }]}>{question.question}</Text>
          </View>

          <View style={[styles.options, layout.isTablet && styles.optionsTablet]}>
            {question.options.map((option, optionIndex) => {
              const isCorrectOption = option === question.answer;
              const isSelected = option === selected;
              return (
                <Pressable
                  accessibilityLabel={`${copy.answer} ${optionIndex + 1}: ${option}`}
                  accessibilityRole="button"
                  disabled={answered}
                  key={`${question.id}:${option}`}
                  onPress={() => resolveAnswer(option)}
                  style={({ pressed }) => [
                    styles.option,
                    layout.isTablet && styles.optionTablet,
                    answered && isCorrectOption && styles.optionCorrect,
                    answered && isSelected && !isCorrectOption && styles.optionWrong,
                    pressed && !answered && styles.optionPressed
                  ]}
                >
                  <View style={[styles.optionLetter, answered && isCorrectOption && styles.optionLetterCorrect, answered && isSelected && !isCorrectOption && styles.optionLetterWrong]}>
                    <Text style={styles.optionLetterText}>{String.fromCharCode(65 + optionIndex)}</Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          {answered ? (
            <View style={[styles.feedbackCard, selected === question.answer ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <Text style={styles.feedbackTitle}>{timedOut ? copy.timeUp : selected === question.answer ? copy.correct : copy.wrong}</Text>
              <Text style={styles.feedbackText}>{question.explanation}</Text>
              <Pressable accessibilityRole="button" onPress={advanceQuestion} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
                <Text style={styles.primaryButtonText}>{questionIndex + 1 >= BUG_BRAIN_DAILY_QUESTION_COUNT ? copy.viewResult : copy.nextQuestion}</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  if (runState === "submitting" || runState === "submit-error") {
    return (
      <View style={styles.centerState}>
        <Image source={knowledgeKeeper} resizeMode="contain" style={styles.submitCharacter} />
        <Text style={styles.centerTitle}>{runState === "submitting" ? copy.saving : copy.saveFailed}</Text>
        <Text style={styles.centerBody}>{runState === "submitting" ? copy.savingBody : copy.saveFailedBody}</Text>
        {runState === "submit-error" ? (
          <Pressable accessibilityRole="button" onPress={() => void finishRun(correctAnswersRef.current)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{copy.retrySave}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel={copy.backToArcade} accessibilityRole="button" onPress={onExit} style={({ pressed }) => [styles.submitExit, pressed && styles.primaryButtonPressed]}>
          <Text style={styles.submitExitText}>← {copy.backToArcade}</Text>
        </Pressable>
      </View>
    );
  }

  if (runState === "finished" && completion) {
    return (
      <ScrollView contentContainerStyle={styles.resultScreen} showsVerticalScrollIndicator={false}>
        <View style={styles.resultGlow} />
        <Pressable accessibilityLabel={copy.backToArcade} accessibilityRole="button" onPress={onExit} style={({ pressed }) => [styles.resultExit, pressed && styles.primaryButtonPressed]}>
          <Text style={styles.resultExitText}>← {copy.backToArcade}</Text>
        </Pressable>
        <Image source={knowledgeKeeper} resizeMode="contain" style={styles.resultCharacter} />
        <Text style={styles.resultKicker}>{copy.completed}</Text>
        <Text style={styles.resultTitle}>{completion.correctAnswers}/10</Text>
        <Text style={styles.resultSubtitle}>{copy.correctAnswers}</Text>
        <View style={styles.resultStats}>
          <View style={styles.resultStat}><Text style={styles.resultStatValue}>+{completion.awardedXp}</Text><Text style={styles.resultStatLabel}>XP</Text></View>
          <View style={styles.resultDivider} />
          <View style={styles.resultStat}><Text style={styles.resultStatValue}>{completion.rewardTier ? tierLabel(completion.rewardTier, language) : "—"}</Text><Text style={styles.resultStatLabel}>{copy.bugdexReward}</Text></View>
        </View>
        <View style={[styles.tierCard, completion.rewardTier && tierStyle(completion.rewardTier)]}>
          <Text style={styles.tierCardTitle}>{completion.rewardTier ? copy.rewardWon(tierLabel(completion.rewardTier, language)) : copy.noBugReward}</Text>
          <Text style={styles.tierCardBody}>{completion.rewardTier ? copy.rewardWonBody : copy.noBugRewardBody}</Text>
        </View>
        <Text style={styles.tomorrowText}>{copy.tomorrow}</Text>
      </ScrollView>
    );
  }

  if (runState === "used") {
    return (
      <View style={styles.centerState}>
        <Image source={labCatcher} resizeMode="contain" style={styles.usedCharacter} />
        <Text style={styles.centerKicker}>{copy.daily}</Text>
        <Text style={styles.centerTitle}>{copy.usedTitle}</Text>
        <Text style={styles.centerBody}>{copy.usedBody}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.introScreen} showsVerticalScrollIndicator={false}>
      <View style={[styles.introHero, layout.isTablet && styles.introHeroTablet]}>
        <View style={styles.introOrb} />
        <Image source={labCatcher} resizeMode="contain" style={[styles.introCatcher, layout.isTablet && styles.introCatcherTablet]} />
        <Image source={knowledgeKeeper} resizeMode="contain" style={[styles.introKeeper, layout.isTablet && styles.introKeeperTablet]} />
        <View style={styles.introCopy}>
          <Text style={styles.introKicker}>{copy.daily}</Text>
          <Text style={[styles.introTitle, layout.isTablet && styles.introTitleTablet]}>Bug Brain</Text>
          <Text style={styles.introBody}>{copy.introBody}</Text>
        </View>
      </View>

      <View style={styles.rulesRow}>
        <Rule value="10" label={copy.questions} />
        <Rule value="30s" label={copy.perQuestion} />
        <Rule value="10" label={copy.maxXp} />
      </View>

      <View style={styles.rewardScale}>
        <RewardRow score="10/10" tier={tierLabel("Legendarisch", language)} />
        <RewardRow score="8–9" tier={tierLabel("Episch", language)} />
        <RewardRow score="5–7" tier={tierLabel("Zeldzaam", language)} />
      </View>

      <Text style={styles.attemptWarning}>{copy.attemptWarning}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={runState === "starting"}
        onPress={() => void startRun()}
        style={({ pressed }) => [styles.primaryButton, runState === "starting" && styles.buttonDisabled, pressed && styles.primaryButtonPressed]}
      >
        <Text style={styles.primaryButtonText}>{runState === "starting" ? copy.starting : runState === "start-error" ? copy.retryStart : copy.start}</Text>
        <Text style={styles.primaryArrow}>→</Text>
      </Pressable>
      {runState === "start-error" ? <Text style={styles.errorText}>{copy.startError}</Text> : null}
    </ScrollView>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return <View style={styles.rule}><Text style={styles.ruleValue}>{value}</Text><Text style={styles.ruleLabel}>{label}</Text></View>;
}

function RewardRow({ score, tier }: { score: string; tier: string }) {
  return <View style={styles.rewardRow}><Text style={styles.rewardScore}>{score}</Text><View style={styles.rewardLine} /><Text style={styles.rewardTier}>{tier}</Text></View>;
}

function tierStyle(tier: BugBrainRewardTier) {
  if (tier === "Legendarisch") return styles.tierLegendary;
  if (tier === "Episch") return styles.tierEpic;
  return styles.tierRare;
}

function tierLabel(tier: BugBrainRewardTier, language: "nl" | "en" | "fr") {
  if (language === "en") return tier === "Legendarisch" ? "Legendary" : tier === "Episch" ? "Epic" : "Rare";
  if (language === "fr") return tier === "Legendarisch" ? "Légendaire" : tier === "Episch" ? "Épique" : "Rare";
  return tier;
}

function localizedCopy(language: "nl" | "en" | "fr") {
  if (language === "en") return {
    answer: "Answer", attemptWarning: "One attempt per day. The run cannot be restarted.", backToArcade: "BACK TO ARCADE", bugdexReward: "BUGDEX", completed: "DAILY RESULT", correct: "Correct · +1 XP", correctAnswers: "CORRECT ANSWERS", daily: "DAILY KNOWLEDGE RUN", introBody: "Answer ten insect questions. You have thirty seconds for each answer.", loading: "Loading Bug Brain…", maxXp: "MAX XP", nextQuestion: "NEXT QUESTION", noBugReward: "No BugDex unlock", noBugRewardBody: "Reach at least 5 correct answers tomorrow for a Rare reward.", perQuestion: "PER QUESTION", question: "QUESTION", questions: "QUESTIONS", retrySave: "TRY SAVING AGAIN", retryStart: "TRY AGAIN", rewardHint: "+1 XP FOR CORRECT", rewardWon: (tier: string) => `${tier} BugDex reward`, rewardWonBody: "Your new BugDex reward has been added to your collection.", saveFailed: "Result not saved", saveFailedBody: "Stay on this screen and retry. You will not receive a duplicate reward.", saving: "Saving result…", savingBody: "XP and your BugDex result are being stored safely.", start: "START DAILY QUIZ", startError: "Bug Brain is unavailable right now. Check your connection and try again.", starting: "STARTING…", timeUp: "Time's up", tomorrow: "A new question set is ready tomorrow.", usedBody: "Today's attempt was already started. A fresh set is available tomorrow.", usedTitle: "Today's run is closed", viewResult: "VIEW RESULT", wrong: "Incorrect"
  };
  if (language === "fr") return {
    answer: "Réponse", attemptWarning: "Une tentative par jour. La partie ne peut pas être recommencée.", backToArcade: "RETOUR À L’ARCADE", bugdexReward: "BUGDEX", completed: "RÉSULTAT DU JOUR", correct: "Correct · +1 XP", correctAnswers: "BONNES RÉPONSES", daily: "DÉFI DE CONNAISSANCES", introBody: "Répondez à dix questions sur les insectes. Vous avez trente secondes par réponse.", loading: "Chargement de Bug Brain…", maxXp: "XP MAX", nextQuestion: "QUESTION SUIVANTE", noBugReward: "Pas de récompense BugDex", noBugRewardBody: "Obtenez au moins 5 bonnes réponses demain pour une récompense Rare.", perQuestion: "PAR QUESTION", question: "QUESTION", questions: "QUESTIONS", retrySave: "RÉESSAYER", retryStart: "RÉESSAYER", rewardHint: "+1 XP SI CORRECT", rewardWon: (tier: string) => `Récompense BugDex ${tier}`, rewardWonBody: "Votre nouvelle récompense a été ajoutée à votre collection.", saveFailed: "Résultat non enregistré", saveFailedBody: "Restez sur cet écran et réessayez. Aucun doublon ne sera accordé.", saving: "Enregistrement…", savingBody: "Les XP et la récompense BugDex sont enregistrés.", start: "COMMENCER LE QUIZ", startError: "Bug Brain est indisponible. Vérifiez votre connexion.", starting: "DÉMARRAGE…", timeUp: "Temps écoulé", tomorrow: "Une nouvelle série sera disponible demain.", usedBody: "La tentative du jour a déjà commencé. Revenez demain.", usedTitle: "Le défi du jour est fermé", viewResult: "VOIR LE RÉSULTAT", wrong: "Incorrect"
  };
  return {
    answer: "Antwoord", attemptWarning: "Eén poging per dag. De run kan niet opnieuw worden gestart.", backToArcade: "TERUG NAAR ARCADE", bugdexReward: "BUGDEX", completed: "RESULTAAT VAN VANDAAG", correct: "Goed · +1 XP", correctAnswers: "GOEDE ANTWOORDEN", daily: "DAGELIJKSE KENNISRUN", introBody: "Beantwoord tien insectenvragen. Je hebt dertig seconden per antwoord.", loading: "Bug Brain laden…", maxXp: "MAX XP", nextQuestion: "VOLGENDE VRAAG", noBugReward: "Geen BugDex-unlock", noBugRewardBody: "Haal morgen minimaal 5 goede antwoorden voor een Zeldzame reward.", perQuestion: "PER VRAAG", question: "VRAAG", questions: "VRAGEN", retrySave: "OPNIEUW OPSLAAN", retryStart: "PROBEER OPNIEUW", rewardHint: "+1 XP BIJ GOED", rewardWon: (tier: string) => `${tier} BugDex-reward`, rewardWonBody: "Je nieuwe BugDex-reward is aan je collectie toegevoegd.", saveFailed: "Resultaat niet opgeslagen", saveFailedBody: "Blijf op dit scherm en probeer opnieuw. Je krijgt nooit een dubbele reward.", saving: "Resultaat opslaan…", savingBody: "XP en je BugDex-resultaat worden veilig opgeslagen.", start: "START DAGELIJKSE QUIZ", startError: "Bug Brain is nu niet beschikbaar. Controleer je verbinding en probeer opnieuw.", starting: "STARTEN…", timeUp: "Tijd voorbij", tomorrow: "Morgen staat een nieuwe set vragen klaar.", usedBody: "De poging van vandaag is al gestart. Morgen staat een nieuwe set klaar.", usedTitle: "De run van vandaag is gesloten", viewResult: "RESULTAAT BEKIJKEN", wrong: "Helaas, fout"
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerState: { alignItems: "center", backgroundColor: "#101b18", flex: 1, justifyContent: "center", padding: 28 },
  loadingText: { color: "#f7efd7", fontSize: 16, fontWeight: "800" },
  centerKicker: { color: "#e9bd58", fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginBottom: 8 },
  centerTitle: { color: "#fffaf0", fontSize: 28, fontWeight: "900", textAlign: "center" },
  centerBody: { color: "#c8d6cd", fontSize: 15, lineHeight: 22, marginBottom: 22, marginTop: 10, maxWidth: 430, textAlign: "center" },
  submitCharacter: { height: 180, marginBottom: 8, width: 180 },
  submitExit: { alignItems: "center", borderColor: "rgba(239,189,69,0.48)", borderRadius: 14, borderWidth: 1, marginTop: 14, minHeight: 46, justifyContent: "center", paddingHorizontal: 18 },
  submitExitText: { color: "#fff4d5", fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  usedCharacter: { height: 210, marginBottom: 6, width: 210 },
  introScreen: { backgroundColor: "#101b18", flexGrow: 1, padding: 18, paddingBottom: 30 },
  introHero: { backgroundColor: "#22372d", borderColor: "rgba(239,194,89,0.55)", borderRadius: 28, borderWidth: 1, height: 300, overflow: "hidden", padding: 22 },
  introHeroTablet: { height: 420, padding: 34 },
  introOrb: { backgroundColor: "rgba(239,194,89,0.18)", borderRadius: 999, height: 270, position: "absolute", right: -30, top: 12, width: 270 },
  introCopy: { maxWidth: "58%", zIndex: 3 },
  introKicker: { color: "#efc259", fontSize: 11, fontWeight: "900", letterSpacing: 1.7, marginBottom: 8 },
  introTitle: { color: "#fffaf0", fontSize: 38, fontWeight: "900", letterSpacing: -1.2 },
  introTitleTablet: { fontSize: 54 },
  introBody: { color: "#d4dfd8", fontSize: 15, fontWeight: "600", lineHeight: 22, marginTop: 10 },
  introKeeper: { bottom: -14, height: 250, position: "absolute", right: -8, width: 250, zIndex: 2 },
  introKeeperTablet: { height: 365, right: 10, width: 365 },
  introCatcher: { bottom: 42, height: 105, opacity: 0.9, position: "absolute", right: 142, transform: [{ rotate: "-5deg" }], width: 105, zIndex: 1 },
  introCatcherTablet: { bottom: 70, height: 160, right: 250, width: 160 },
  rulesRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  rule: { alignItems: "center", backgroundColor: "#1a2a24", borderColor: "rgba(255,255,255,0.09)", borderRadius: 16, borderWidth: 1, flex: 1, paddingHorizontal: 8, paddingVertical: 12 },
  ruleValue: { color: "#fff4d5", fontSize: 20, fontWeight: "900" },
  ruleLabel: { color: "#92a69c", fontSize: 9, fontWeight: "900", letterSpacing: 0.8, marginTop: 2, textAlign: "center" },
  rewardScale: { backgroundColor: "#182720", borderRadius: 18, gap: 8, marginTop: 12, padding: 14 },
  rewardRow: { alignItems: "center", flexDirection: "row" },
  rewardScore: { color: "#f8e3a5", fontSize: 13, fontWeight: "900", width: 48 },
  rewardLine: { backgroundColor: "rgba(255,255,255,0.1)", flex: 1, height: 1, marginHorizontal: 10 },
  rewardTier: { color: "#fffaf0", fontSize: 13, fontWeight: "900", textAlign: "right", width: 102 },
  attemptWarning: { color: "#9fb1a7", fontSize: 12, lineHeight: 18, marginHorizontal: 4, marginTop: 12, textAlign: "center" },
  primaryButton: { alignItems: "center", backgroundColor: "#efbd45", borderRadius: 18, flexDirection: "row", justifyContent: "center", marginTop: 16, minHeight: 58, paddingHorizontal: 22 },
  primaryButtonPressed: { transform: [{ scale: 0.985 }] },
  primaryButtonText: { color: "#182016", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  primaryArrow: { color: "#182016", fontSize: 22, fontWeight: "900", marginLeft: 10 },
  buttonDisabled: { opacity: 0.55 },
  errorText: { color: "#ffb0a8", fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: "center" },
  gameScreen: { backgroundColor: "#0d1714", flex: 1, overflow: "hidden" },
  gameAmbientOne: { backgroundColor: "rgba(48,122,87,0.18)", borderRadius: 999, height: 310, left: -160, position: "absolute", top: 80, width: 310 },
  gameAmbientTwo: { backgroundColor: "rgba(224,173,64,0.10)", borderRadius: 999, bottom: -130, height: 300, position: "absolute", right: -140, width: 300 },
  hudRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  hudBlock: { minWidth: 72 },
  hudBlockRight: { alignItems: "flex-end" },
  hudLabel: { color: "#82978d", fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  hudValue: { color: "#fffaf0", fontSize: 22, fontWeight: "900", marginTop: 1 },
  hudMuted: { color: "#778c82", fontSize: 14 },
  timerPill: { alignItems: "center", backgroundColor: "#20362c", borderColor: "rgba(239,189,69,0.42)", borderRadius: 18, borderWidth: 1, flexDirection: "row", minWidth: 82, paddingHorizontal: 14, paddingVertical: 9 },
  timerPillDanger: { backgroundColor: "#44231f", borderColor: "#ff8072" },
  timerValue: { color: "#f5c65e", fontSize: 23, fontWeight: "900" },
  timerValueDanger: { color: "#ff8b7d" },
  timerUnit: { color: "#aebcb5", fontSize: 8, fontWeight: "900", marginLeft: 4, marginTop: 5 },
  timerTrack: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999, height: 5, overflow: "hidden" },
  timerFill: { backgroundColor: "#eec050", borderRadius: 999, height: "100%" },
  timerFillDanger: { backgroundColor: "#ff7669" },
  gameContent: { flexGrow: 1, justifyContent: "center", paddingBottom: 18, paddingTop: 18 },
  gameContentTablet: { alignSelf: "center", maxWidth: 760, width: "100%" },
  questionCard: { backgroundColor: "rgba(31,50,42,0.96)", borderColor: "rgba(238,192,80,0.36)", borderRadius: 24, borderWidth: 1, minHeight: 150, padding: 20 },
  questionTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  category: { color: "#efc45e", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  rewardHint: { color: "#87a595", fontSize: 9, fontWeight: "900" },
  questionText: { color: "#fffaf2", fontWeight: "900", lineHeight: 33 },
  options: { gap: 9, marginTop: 12 },
  optionsTablet: { flexDirection: "row", flexWrap: "wrap" },
  option: { alignItems: "center", backgroundColor: "#1a2b24", borderColor: "rgba(255,255,255,0.10)", borderRadius: 17, borderWidth: 1, flexDirection: "row", minHeight: 58, paddingHorizontal: 12, paddingVertical: 9 },
  optionTablet: { flexBasis: "48%", flexGrow: 1 },
  optionPressed: { backgroundColor: "#274538", borderColor: "#eac15d" },
  optionCorrect: { backgroundColor: "#1f5136", borderColor: "#6ee095" },
  optionWrong: { backgroundColor: "#572b2b", borderColor: "#ff8378" },
  optionLetter: { alignItems: "center", backgroundColor: "#30483d", borderRadius: 12, height: 36, justifyContent: "center", marginRight: 12, width: 36 },
  optionLetterCorrect: { backgroundColor: "#347a50" },
  optionLetterWrong: { backgroundColor: "#984842" },
  optionLetterText: { color: "#fff9e9", fontSize: 13, fontWeight: "900" },
  optionText: { color: "#f5f4ec", flex: 1, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  feedbackCard: { borderRadius: 16, marginTop: 11, padding: 13 },
  feedbackCorrect: { backgroundColor: "rgba(45,124,76,0.40)" },
  feedbackWrong: { backgroundColor: "rgba(141,61,54,0.38)" },
  feedbackTitle: { color: "#fffdf5", fontSize: 15, fontWeight: "900" },
  feedbackText: { color: "#d6e1da", fontSize: 12, lineHeight: 17, marginTop: 4 },
  resultScreen: { alignItems: "center", backgroundColor: "#101b18", flexGrow: 1, justifyContent: "center", overflow: "hidden", padding: 24 },
  resultGlow: { backgroundColor: "rgba(239,189,69,0.13)", borderRadius: 999, height: 330, position: "absolute", top: 10, width: 330 },
  resultExit: { alignItems: "center", backgroundColor: "rgba(26,42,36,0.96)", borderColor: "rgba(239,189,69,0.48)", borderRadius: 14, borderWidth: 1, left: 16, minHeight: 44, paddingHorizontal: 14, position: "absolute", top: 16, justifyContent: "center", zIndex: 4 },
  resultExitText: { color: "#fff4d5", fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  resultCharacter: { height: 210, width: 210 },
  resultKicker: { color: "#eabf58", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  resultTitle: { color: "#fffaf0", fontSize: 58, fontWeight: "900", letterSpacing: -2, marginTop: 4 },
  resultSubtitle: { color: "#91a49a", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  resultStats: { alignItems: "center", backgroundColor: "#1a2a24", borderRadius: 20, flexDirection: "row", marginTop: 18, maxWidth: 440, padding: 15, width: "100%" },
  resultStat: { alignItems: "center", flex: 1 },
  resultStatValue: { color: "#fff5d6", fontSize: 18, fontWeight: "900", textAlign: "center" },
  resultStatLabel: { color: "#85998f", fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 3 },
  resultDivider: { backgroundColor: "rgba(255,255,255,0.1)", height: 38, width: 1 },
  tierCard: { backgroundColor: "#1a2a24", borderColor: "rgba(255,255,255,0.1)", borderRadius: 20, borderWidth: 1, marginTop: 12, maxWidth: 440, padding: 17, width: "100%" },
  tierRare: { backgroundColor: "#193a4a", borderColor: "#62bce3" },
  tierEpic: { backgroundColor: "#34224f", borderColor: "#bd7cff" },
  tierLegendary: { backgroundColor: "#4b3518", borderColor: "#ffd15c" },
  tierCardTitle: { color: "#fffaf0", fontSize: 16, fontWeight: "900", textAlign: "center" },
  tierCardBody: { color: "#c6d2cb", fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: "center" },
  tomorrowText: { color: "#85998f", fontSize: 12, marginTop: 18, textAlign: "center" }
});
