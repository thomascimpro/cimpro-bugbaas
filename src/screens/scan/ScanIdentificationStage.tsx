import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../../services/animationPlatform";
import { useI18n } from "../../services/i18n";
import { useResponsiveLayout } from "../../theme/useResponsiveLayout";

const scanMedallion = require("../../../assets/generated/bugbaas-scan-medallion-v1.png");

export function ScanIdentificationStage() {
  const { t } = useI18n();
  const layout = useResponsiveLayout();
  const reveal = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.spring(reveal, {
        friction: 7,
        tension: 70,
        toValue: 1,
        useNativeDriver: nativeDriver
      }),
      Animated.sequence([
        Animated.delay(160),
        Animated.timing(sweep, {
          duration: 980,
          toValue: 1,
          useNativeDriver: nativeDriver
        })
      ])
    ]);
    animation.start();
    return () => animation.stop();
  }, [reveal, sweep]);

  return (
    <Animated.View
      style={[
        styles.card,
        layout.isTablet && styles.cardTablet,
        {
          opacity: reveal,
          transform: [{
            scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })
          }]
        }
      ]}
    >
      <View style={styles.scanner}>
        <ImageShim source={scanMedallion} />
        <Animated.View
          style={[
            styles.sweep,
            {
              opacity: sweep.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0, 0.94, 0.94, 0]
              }),
              transform: [{
                translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-68, 68] })
              }]
            }
          ]}
        />
      </View>
      <View style={styles.statusRow}>
        <ActivityIndicator color="#61e4ff" size="small" />
        <Text style={styles.status}>AI FIELD LAB</Text>
      </View>
      <Text style={styles.title}>{t("bugScan.identifyingTitle")}</Text>
      <Text style={styles.body}>{t("bugScan.identifyingBody")}</Text>
    </Animated.View>
  );
}

function ImageShim({ source }: { source: number }) {
  return <Animated.Image resizeMode="contain" source={source} style={styles.medallion} />;
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(6,24,38,0.98)",
    borderColor: "#2c829b",
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 420,
    overflow: "hidden",
    padding: 24,
    width: "100%"
  },
  cardTablet: { maxWidth: 680 },
  scanner: {
    alignItems: "center",
    height: 190,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: 190
  },
  medallion: { height: 182, width: 182 },
  sweep: {
    backgroundColor: "rgba(92,226,255,0.92)",
    height: 2,
    left: 18,
    position: "absolute",
    right: 18,
    shadowColor: "#5ce2ff",
    shadowOpacity: 0.9,
    shadowRadius: 8
  },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 },
  status: { color: "#f1b34f", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#f2fbff", fontSize: 22, fontWeight: "900", marginTop: 13, textAlign: "center" },
  body: { color: "#a9c8d2", fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 360, textAlign: "center" }
});
