import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../services/i18n";
import { useResponsiveLayout } from "../../theme/useResponsiveLayout";
import type { RealBugScanStage } from "./realBugScanFlowModel";

const stages: RealBugScanStage[] = ["capture", "review", "identification", "result", "impact"];

type Props = { stage: RealBugScanStage };

export function ScanStageHeader({ stage }: Props) {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const activeIndex = stages.indexOf(stage);
  return (
    <View style={styles.row}>
      {stages.map((item, index) => (
        <View key={item} style={styles.stepWrap}>
          {index > 0 ? <View style={[styles.connector, index <= activeIndex && styles.connectorActive]} /> : null}
          <View style={[styles.dot, index < activeIndex && styles.dotDone, index === activeIndex && styles.dotActive]}>
            <Text style={[styles.dotText, index <= activeIndex && styles.dotTextActive]}>{index < activeIndex ? "✓" : index + 1}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.label, layout.isCompact && styles.labelCompact, index === activeIndex && styles.labelActive]}>
            {layout.isCompact && index !== activeIndex ? "" : t(`bugScan.stage.${item}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    alignSelf: "center",
    backgroundColor: "rgba(7,28,43,0.9)",
    borderColor: "#255e72",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    maxWidth: 780,
    paddingHorizontal: 8,
    paddingTop: 10,
    width: "100%"
  },
  stepWrap: { alignItems: "center", flex: 1, minHeight: 42, position: "relative" },
  connector: {
    backgroundColor: "#244a5b",
    height: 2,
    position: "absolute",
    right: "50%",
    top: 11,
    width: "100%",
    zIndex: 0
  },
  connectorActive: { backgroundColor: "#49bed8" },
  dot: {
    alignItems: "center",
    backgroundColor: "#18394a",
    borderColor: "#315b6d",
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
    zIndex: 1
  },
  dotDone: { backgroundColor: "#17647b", borderColor: "#59d8f2" },
  dotActive: { backgroundColor: "#e99b2e", borderColor: "#ffd385" },
  dotText: { color: "#7898a4", fontSize: 9, fontWeight: "900" },
  dotTextActive: { color: "#f4fcff" },
  label: { color: "#73939f", fontSize: 8, fontWeight: "800", marginTop: 4, textAlign: "center" },
  labelCompact: { minHeight: 10 },
  labelActive: { color: "#f3b85c" }
});
