import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteName } from "../../App";
import { InsectIllustration } from "./InsectIllustration";

type NavRoute = "home" | "new" | "leaderboard";

type Props = {
  activeRoute: RouteName;
  onNavigate: (route: NavRoute) => void;
};

const items: Array<{ route: NavRoute; label: string; variant: "larva" | "crawler" | "ladybug" }> = [
  { route: "home", label: "Home", variant: "larva" },
  { route: "new", label: "Meld", variant: "crawler" },
  { route: "leaderboard", label: "Ranglijst", variant: "ladybug" }
];

export function BottomNav({ activeRoute, onNavigate }: Props) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = activeRoute === item.route;
        const primary = item.route === "new";
        return (
          <Pressable key={item.route} style={[styles.item, primary && styles.primaryItem, active && styles.activeItem, primary && active && styles.activePrimary]} onPress={() => onNavigate(item.route)}>
            <InsectIllustration size={primary ? 40 : active ? 30 : 24} variant={item.variant} />
            <Text style={[styles.label, primary && styles.primaryLabel, active && styles.activeLabel, primary && active && styles.activePrimaryLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    bottom: 14,
    elevation: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    left: 18,
    padding: 9,
    position: "absolute",
    right: 18,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 20
  },
  item: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    gap: 3,
    minHeight: 70,
    justifyContent: "center",
    paddingVertical: 7
  },
  primaryItem: {
    backgroundColor: "#102018",
    elevation: 6,
    marginTop: -24,
    minHeight: 88,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  activeItem: {
    backgroundColor: "#e6f2e7"
  },
  activePrimary: {
    backgroundColor: "#15724f"
  },
  label: {
    color: "#52665d",
    fontSize: 11,
    fontWeight: "800"
  },
  primaryLabel: {
    color: "#ffffff",
    fontSize: 12
  },
  activeLabel: {
    color: "#15724f"
  },
  activePrimaryLabel: {
    color: "#ffffff"
  }
});
