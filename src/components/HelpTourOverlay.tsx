import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { RouteName } from "../../App";

type TourRoute = "home" | "bugs" | "new" | "bugdex" | "leaderboard" | "settings";

type Step = {
  route: TourRoute;
  title: string;
  body: string;
  target: "tab" | "settings";
};

type Props = {
  visible: boolean;
  onFinish: () => void;
  onNavigate: (route: TourRoute) => void;
};

const steps: Step[] = [
  { route: "home", title: "Home", body: "Nieuws, snelle acties en je laatste voortgang.", target: "tab" },
  { route: "bugs", title: "Bugs", body: "Bekijk meldingen van iedereen en open details.", target: "tab" },
  { route: "new", title: "Meld", body: "Maak een nieuwe bug met uitleg en eventueel een screenshot.", target: "tab" },
  { route: "bugdex", title: "BugDex", body: "Bekijk je gevonden bugs, dubbelen en combineer upgrades.", target: "tab" },
  { route: "leaderboard", title: "Rank", body: "Zie actieve collega's, badges en profielen.", target: "tab" },
  { route: "settings", title: "Instellingen", body: "Zet meldingen aan of uit en start deze help opnieuw.", target: "settings" }
];

const tabRoutes: Array<Extract<RouteName, "home" | "bugs" | "new" | "bugdex" | "leaderboard">> = ["home", "bugs", "new", "bugdex", "leaderboard"];

export function HelpTourOverlay({ visible, onFinish, onNavigate }: Props) {
  const [index, setIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const bottomNavLeft = 18;
  const bottomNavWidth = width - bottomNavLeft * 2;
  const tabWidth = bottomNavWidth / tabRoutes.length;
  const tabIndex = tabRoutes.indexOf(step.route as (typeof tabRoutes)[number]);
  const highlight =
    step.target === "settings"
      ? { height: 52, left: width - 66, top: 6, width: 52 }
      : {
          height: step.route === "new" ? 92 : 76,
          left: bottomNavLeft + Math.max(0, tabIndex) * tabWidth + 2,
          top: height - (step.route === "new" ? 104 : 90),
          width: tabWidth - 4
        };

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    onNavigate(steps[0].route);
  }, [visible]);

  function next() {
    if (isLast) {
      onFinish();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    onNavigate(steps[nextIndex].route);
  }

  if (!step) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onFinish}>
      <View style={styles.backdrop}>
        <View style={[styles.highlight, highlight]} />
        <View style={[styles.card, step.target === "settings" ? styles.cardTop : styles.cardBottom]}>
          <Text style={styles.counter}>{index + 1}/{steps.length}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.skipButton} onPress={onFinish}>
              <Text style={styles.skipText}>Overslaan</Text>
            </Pressable>
            <Pressable style={styles.nextButton} onPress={next}>
              <Text style={styles.nextText}>{isLast ? "Klaar" : "Volgende"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,32,24,0.62)"
  },
  highlight: {
    borderColor: "#d7bd57",
    borderRadius: 10,
    borderWidth: 3,
    position: "absolute",
    shadowColor: "#d7bd57",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    left: 18,
    padding: 16,
    position: "absolute",
    right: 18
  },
  cardBottom: {
    bottom: 124
  },
  cardTop: {
    top: 76
  },
  counter: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  title: {
    color: "#102018",
    fontSize: 24,
    fontWeight: "900"
  },
  body: {
    color: "#53645d",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 6
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 16
  },
  skipButton: {
    alignItems: "center",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14
  },
  skipText: {
    color: "#53645d",
    fontWeight: "900"
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: "#15724f",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18
  },
  nextText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
