import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { nativeDriver } from "../services/animationPlatform";
import { useI18n } from "../services/i18n";
import { BugArtImage } from "./BugArtImage";
import { helpTourSteps, type HelpTourRoute } from "./HelpTourOverlayModel";

type Props = {
  visible: boolean;
  onFinish: () => void;
  onNavigate: (route: HelpTourRoute) => void;
};

const destinations = ["world", "scan", "play", "collection"] as const;

export function HelpTourOverlay({ visible, onFinish, onNavigate }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const float = useRef(new Animated.Value(0)).current;
  const step = helpTourSteps[index];
  const isLast = index === helpTourSteps.length - 1;
  const navLeft = 12;
  const navWidth = width - navLeft * 2;
  const cardSide = Math.max(14, (width - 560) / 2);
  const destinationIndex = destinations.indexOf(step.destination);
  const tabWidth = navWidth / destinations.length;
  const highlight = {
    height: step.destination === "scan" ? 80 : 64,
    left: navLeft + destinationIndex * tabWidth + 3,
    top: height - (step.destination === "scan" ? 92 : 76),
    width: tabWidth - 6
  };
  const bugFloat = float.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] });

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    onNavigate(helpTourSteps[0].route);
  }, [visible]);

  useEffect(() => {
    if (!visible) return () => undefined;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 1700, useNativeDriver: nativeDriver }),
      Animated.timing(float, { toValue: 0, duration: 1700, useNativeDriver: nativeDriver })
    ]), { iterations: 3 });
    animation.start();
    return () => animation.stop();
  }, [float, visible]);

  function next() {
    if (isLast) {
      onFinish();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    onNavigate(helpTourSteps[nextIndex].route);
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onFinish}>
      <View style={styles.backdrop}>
        <View pointerEvents="none" style={[styles.highlight, highlight, { borderColor: step.accent, shadowColor: step.accent }]} />

        <View style={[styles.card, { left: cardSide, right: cardSide }, height < 700 && styles.cardCompact]}>
          <View style={styles.topRow}>
            <View style={styles.progressRow}>
              {helpTourSteps.map((item, itemIndex) => <View key={item.route} style={[styles.progressDot, itemIndex <= index && { backgroundColor: step.accent, borderColor: step.accent }, itemIndex === index && styles.progressDotActive]} />)}
            </View>
            <Pressable accessibilityRole="button" onPress={onFinish} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>

          <View style={[styles.visualStage, { borderColor: `${step.accent}88` }]}>
            <View style={[styles.visualGlow, { backgroundColor: step.accent }]} />
            <Animated.View style={[styles.bugMain, { transform: [{ translateY: bugFloat }] }]}><BugArtImage bugId={step.bugIds[0]} size={132} /></Animated.View>
            <View style={styles.bugLeft}><BugArtImage bugId={step.bugIds[1]} size={76} /></View>
            <View style={styles.bugRight}><BugArtImage bugId={step.bugIds[2] ?? step.bugIds[0]} size={72} /></View>
            <View style={[styles.stepBadge, { backgroundColor: step.accent }]}><Text style={styles.stepBadgeText}>{index + 1}</Text></View>
          </View>

          <Text style={[styles.kicker, { color: step.accent }]}>{t(step.kickerKey)}</Text>
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.body}>{t(step.bodyKey)}</Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onFinish} style={styles.skipButton}><Text style={styles.skipText}>{t("common.skip")}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={next} style={[styles.nextButton, { backgroundColor: step.accent }]}>
              <Text style={styles.nextText}>{isLast ? t("tour.start") : t("common.next")}</Text>
              <Text style={styles.nextArrow}>{isLast ? "✓" : "›"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,10,27,0.82)" },
  highlight: { borderRadius: 20, borderWidth: 3, position: "absolute", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 14 },
  card: { backgroundColor: "#fff9e9", borderColor: "rgba(232,184,88,0.78)", borderRadius: 26, borderWidth: 1, bottom: 104, elevation: 18, maxWidth: 560, overflow: "hidden", padding: 16, position: "absolute", shadowColor: "#050817", shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.34, shadowRadius: 22 },
  cardCompact: { bottom: 84, padding: 13 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progressRow: { flexDirection: "row", gap: 6 },
  progressDot: { backgroundColor: "#d7ddd5", borderColor: "#c5cec6", borderRadius: 99, borderWidth: 1, height: 7, width: 24 },
  progressDotActive: { width: 40 },
  closeButton: { alignItems: "center", backgroundColor: "#e7e8df", borderRadius: 99, height: 30, justifyContent: "center", width: 30 },
  closeText: { color: "#53645d", fontSize: 20, fontWeight: "800", lineHeight: 21 },
  visualStage: { alignItems: "center", backgroundColor: "#171a35", borderRadius: 19, borderWidth: 1, height: 182, justifyContent: "center", marginTop: 12, overflow: "hidden", position: "relative" },
  visualGlow: { borderRadius: 120, height: 180, opacity: 0.16, position: "absolute", top: 6, width: 180 },
  bugMain: { zIndex: 3 },
  bugLeft: { bottom: 12, left: 13, position: "absolute", transform: [{ rotate: "-9deg" }], zIndex: 2 },
  bugRight: { bottom: 11, position: "absolute", right: 13, transform: [{ rotate: "10deg" }], zIndex: 2 },
  stepBadge: { alignItems: "center", borderRadius: 99, height: 32, justifyContent: "center", position: "absolute", right: 10, top: 10, width: 32, zIndex: 5 },
  stepBadgeText: { color: "#17182b", fontSize: 13, fontWeight: "900" },
  kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginTop: 13 },
  title: { color: "#17182b", fontSize: 25, fontWeight: "900", marginTop: 2 },
  body: { color: "#706658", fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: 5, maxWidth: 460 },
  actions: { alignItems: "center", flexDirection: "row", gap: 9, marginTop: 15 },
  skipButton: { alignItems: "center", borderColor: "#c8d2ca", borderRadius: 13, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 15 },
  skipText: { color: "#607068", fontSize: 11, fontWeight: "900" },
  nextButton: { alignItems: "center", borderRadius: 13, flex: 1, flexDirection: "row", justifyContent: "center", minHeight: 48, paddingHorizontal: 17 },
  nextText: { color: "#17182b", fontSize: 12, fontWeight: "900" },
  nextArrow: { color: "#17182b", fontSize: 20, fontWeight: "900", marginLeft: 8, marginTop: -2 }
});
