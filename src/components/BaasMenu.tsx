import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { baasMenuFeatures, type BaasMenuFeature } from "../navigation/featureRegistry";
import { useI18n } from "../services/i18n";
import { BugArtImage } from "./BugArtImage";

type Props = {
  badges?: Partial<Record<BaasMenuFeature, number>>;
  onClose: () => void;
  onSelect: (feature: BaasMenuFeature) => void;
};

export function BaasMenu({ badges = {}, onClose, onSelect }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.sheet} testID="baas-menu">
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>{t("menu.title")}</Text>
        <Pressable accessibilityLabel={t("menu.close")} accessibilityRole="button" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {baasMenuFeatures.map((feature) => {
          const badgeCount = Math.max(0, Math.floor(badges[feature.id] ?? 0));
          return (
            <Pressable
              accessibilityLabel={t(feature.labelKey)}
              accessibilityRole="button"
              key={feature.id}
              onPress={() => onSelect(feature.id)}
              style={styles.tile}
            >
              <View style={styles.iconWrap}>
                <BugArtImage bugId={feature.bugId} size={44} />
                {badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.label}>{t(feature.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#08251c",
    borderColor: "rgba(229,204,105,0.52)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 22,
    paddingHorizontal: 16,
    paddingTop: 9
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    height: 4,
    marginBottom: 8,
    width: 42
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900"
  },
  close: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  closeText: {
    color: "#f4df99",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  tile: {
    alignItems: "center",
    backgroundColor: "#10392b",
    borderColor: "rgba(229,204,105,0.25)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 92,
    paddingHorizontal: 8,
    paddingVertical: 10,
    width: "47.8%"
  },
  iconWrap: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 54
  },
  label: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#c7352b",
    borderColor: "#08251c",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -5,
    top: -4
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900"
  }
});
