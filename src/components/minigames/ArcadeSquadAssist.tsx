import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { nativeDriver } from "../../services/animationPlatform";
import { activeBugSquadBonusList, bugSquadAttackKindForCategory } from "../../services/bugSquadService";
import { BugDexRarity, bugDexEntries } from "../../services/pointsService";
import { User } from "../../types";
import { BugJarArt } from "../BugJarArt";

type Props = {
  compact?: boolean;
  label: string;
  micro?: boolean;
  user: Pick<User, "activeBugSquad">;
};

const rarityColors: Record<BugDexRarity, string> = {
  Gewoon: "#2f9e44",
  Zeldzaam: "#228be6",
  Episch: "#9c36b5",
  Legendarisch: "#f59f00",
  Mythisch: "#ef4444"
};

const entryById = new Map(bugDexEntries.map((entry) => [entry.id, entry]));

export function ArcadeSquadAssist({ compact = false, label, micro = false, user }: Props) {
  const bonuses = activeBugSquadBonusList(user);
  const isCompact = compact || micro;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: nativeDriver }),
      Animated.timing(shimmer, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: nativeDriver })
    ]));
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  if (!bonuses.length) return null;

  return (
    <View style={[styles.wrap, isCompact && styles.wrapCompact, micro && styles.wrapMicro]}>
      <Text style={[styles.label, isCompact && styles.labelCompact, micro && styles.labelMicro]}>{label}</Text>
      <View style={styles.jars}>
        {bonuses.map((bonus) => {
          const entry = entryById.get(bonus.bugId);
          const kind = bugSquadAttackKindForCategory(bonus.category);
          return (
            <View key={bonus.bugId} style={[styles.jarSlot, isCompact && styles.jarSlotCompact, micro && styles.jarSlotMicro, { borderColor: rarityColors[bonus.rarity] }]}>
              <Animated.View style={[styles.jarAura, { backgroundColor: rarityColors[bonus.rarity], opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.24] }), transform: [{ scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }) }] }]} />
              <BugJarArt bugId={bonus.bugId} rarity={bonus.rarity} size={micro ? 20 : isCompact ? 30 : 44} />
              <Text style={[styles.kind, isCompact && styles.kindCompact, micro && styles.kindMicro]} numberOfLines={1}>{kind}</Text>
              {!isCompact && entry ? <Text style={styles.name} numberOfLines={1}>{entry.name}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  jarSlot: {
    alignItems: "center",
    backgroundColor: "rgba(249,251,247,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 0,
    overflow: "hidden",
    padding: 5
  },
  jarAura: {
    borderRadius: 999,
    height: 48,
    position: "absolute",
    top: 2,
    width: 48
  },
  jarSlotCompact: {
    flex: 0,
    minWidth: 48,
    padding: 3
  },
  jarSlotMicro: { minWidth: 32, padding: 2 },
  jars: {
    flexDirection: "row",
    gap: 6
  },
  kind: {
    color: "#d7bd57",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  kindCompact: {
    fontSize: 8
  },
  kindMicro: { fontSize: 6 },
  label: {
    color: "#f9fbf7",
    fontSize: 12,
    fontWeight: "900"
  },
  labelCompact: {
    fontSize: 10
  },
  labelMicro: { fontSize: 8 },
  name: {
    color: "#a9b8ae",
    fontSize: 9,
    fontWeight: "800",
    maxWidth: 62
  },
  wrap: {
    backgroundColor: "rgba(16,32,24,0.78)",
    borderColor: "rgba(215,189,87,0.42)",
    borderRadius: 10,
    borderWidth: 1,
    gap: 7,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 8
  },
  wrapCompact: {
    backgroundColor: "rgba(16,32,24,0.58)",
    gap: 4,
    marginHorizontal: 0,
    marginTop: 0,
    padding: 5
  },
  wrapMicro: { gap: 2, padding: 3 }
});
