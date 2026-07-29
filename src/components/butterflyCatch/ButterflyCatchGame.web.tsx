import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ButterflyCatchResult } from "./butterflyCatchGameModel";
import {
  butterflyCatchArcadeResult,
  createButterflyCatchArcadeResult,
  loadButterflyCatchHighScore,
  saveButterflyCatchResult,
} from "./butterflyCatchResultService";
import type { ButterflyCatchGameProps } from "./ButterflyCatchGame.types";

const iframeStyle: React.CSSProperties = {
  border: 0,
  display: "block",
  height: "100%",
  width: "100%",
};

type GameMessage = {
  source?: string;
  type?: string;
  runId?: string;
  result?: Partial<ButterflyCatchResult>;
};

function validResult(value: GameMessage["result"]): value is ButterflyCatchResult {
  return Boolean(
    value
    && Number.isFinite(value.score)
    && Number.isFinite(value.catches)
    && Number.isFinite(value.misses)
    && Number.isFinite(value.accuracy)
    && Number.isFinite(value.bestStreak)
    && Number.isFinite(value.durationMs)
    && value.score! >= 0
    && value.score! <= 50_000
    && value.durationMs! >= 59_000
    && value.durationMs! <= 61_000,
  );
}

export function ButterflyCatchGame({
  onClose,
  onFullscreenChange,
  onResult,
  practice = false,
  ranked = false,
  user,
}: ButterflyCatchGameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const handledRunsRef = useRef(new Set<string>());
  const [bestScore, setBestScore] = useState(0);
  const [saveLabel, setSaveLabel] = useState("Highscore laden…");
  const [runActive, setRunActive] = useState(false);

  const sendToGame = useCallback((payload: object) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "bugbaas-app", ...payload },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    onFullscreenChange?.(true);
    return () => onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  useEffect(() => {
    let active = true;
    void loadButterflyCatchHighScore(user)
      .then((score) => {
        if (!active) return;
        setBestScore(score);
        setSaveLabel(`Beste score ${score}`);
        sendToGame({ bestScore: score, type: "best-score" });
      })
      .catch(() => {
        if (active) setSaveLabel("Highscore lokaal niet beschikbaar");
      });
    return () => { active = false; };
  }, [sendToGame, user.uid]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<GameMessage>) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (message?.source !== "bugbaas-butterfly-catch") return;
      if (message.type === "run-state") {
        setRunActive((message as GameMessage & { active?: boolean }).active === true);
        return;
      }
      if (message.type !== "run-complete") return;
      const result = message.result;
      if (!message.runId || handledRunsRef.current.has(message.runId) || !validResult(result)) return;

      handledRunsRef.current.add(message.runId);
      setRunActive(false);
      setSaveLabel("Score opslaan…");
      const completion = onResult
        ? (practice
            ? Promise.resolve(butterflyCatchArcadeResult(result, bestScore))
            : createButterflyCatchArcadeResult(user, result))
          .then(async (arcadeResult) => {
            await onResult(arcadeResult);
            return arcadeResult.localHighScore;
          })
        : saveButterflyCatchResult(user, result);
      void completion.then((nextBestScore) => {
          setBestScore(nextBestScore);
          setSaveLabel(`${ranked ? "Ranked score ingediend" : practice ? "Training voltooid" : "Score opgeslagen"} · beste ${nextBestScore}`);
          sendToGame({ bestScore: nextBestScore, status: "saved", type: "save-status" });
        })
        .catch(() => {
          const nextBestScore = Math.max(bestScore, result.score);
          setBestScore(nextBestScore);
          setSaveLabel("Lokale highscore bewaard · databasefout");
          sendToGame({ bestScore: nextBestScore, status: "error", type: "save-status" });
        });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [bestScore, onResult, practice, ranked, sendToGame, user]);

  return (
    <View style={styles.root}>
      {React.createElement("iframe", {
        allow: "accelerometer; gyroscope; fullscreen",
        onLoad: () => {
          sendToGame({ bestScore, type: "best-score" });
          sendToGame({ practice, ranked, type: "game-mode" });
        },
        ref: iframeRef,
        src: "/butterfly-catch-3d/index.html",
        style: iframeStyle,
        title: "BugBaas Vleugeljacht 3D",
      })}
      <View pointerEvents="none" style={styles.savePill}>
        <Text style={styles.saveText}>{saveLabel}</Text>
      </View>
      {!ranked || !runActive ? (
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>{ranked ? "TERUG NAAR ARENA" : "TERUG NAAR PLAY"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#07140f", flex: 1, overflow: "hidden" },
  savePill: {
    backgroundColor: "rgba(7,25,18,0.88)",
    borderColor: "rgba(255,225,133,0.3)",
    borderRadius: 999,
    borderWidth: 1,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: "absolute",
    top: 132,
  },
  saveText: { color: "#d8eee0", fontSize: 9, fontWeight: "800" },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(7,25,18,0.88)",
    borderColor: "rgba(255,225,133,0.48)",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    left: 14,
    minHeight: 40,
    paddingHorizontal: 13,
    position: "absolute",
    top: 82,
  },
  closeText: { color: "#fff0b5", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
});
