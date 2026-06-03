import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RouteName } from "../../App";
import { BugArtId } from "../services/bugArt";
import { BugArtImage } from "./BugArtImage";

type NavRoute = "home" | "bugs" | "new" | "bugdex" | "leaderboard";

type Props = {
  activeRoute: RouteName;
  onNavigate: (route: NavRoute) => void;
};

const items: Array<{ route: NavRoute; label: string; bugId: BugArtId }> = [
  { route: "home", label: "Home", bugId: "zilvervisje" },
  { route: "bugs", label: "Bugs", bugId: "pissebed" },
  { route: "new", label: "Meld", bugId: "mier" },
  { route: "bugdex", label: "BugDex", bugId: "lieveheersbeestje" },
  { route: "leaderboard", label: "Rank", bugId: "goliathkever" }
];

export function BottomNav({ activeRoute, onNavigate }: Props) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const active = activeRoute === item.route;
        const primary = item.route === "new";
        return (
          <Pressable key={item.route} style={[styles.item, primary && styles.primaryItem, active && styles.activeItem, primary && active && styles.activePrimary]} onPress={() => onNavigate(item.route)}>
            <BugArtImage bugId={item.bugId} size={primary ? 40 : active ? 28 : 24} />
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
    bottom: 0,
    elevation: 8,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    left: 0,
    marginBottom: 14,
    marginHorizontal: 18,
    padding: 7,
    position: "absolute",
    right: 0,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 100
  },
  item: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    gap: 2,
    minHeight: 64,
    justifyContent: "center",
    paddingVertical: 7
  },
  primaryItem: {
    backgroundColor: "#102018",
    elevation: 6,
    marginTop: -18,
    minHeight: 78,
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
    fontSize: 9,
    fontWeight: "800"
  },
  primaryLabel: {
    color: "#ffffff",
    fontSize: 11
  },
  activeLabel: {
    color: "#15724f"
  },
  activePrimaryLabel: {
    color: "#ffffff"
  }
});
