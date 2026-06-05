import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import { DisplayNameModal } from "../components/DisplayNameModal";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { TierBadge } from "../components/TierBadge";
import { listBugs } from "../services/bugService";
import { bugDexEntries, getTierForPoints, userTiers } from "../services/pointsService";
import { upvotePointValue } from "../services/userService";
import { BugReport, User } from "../types";
import { sharedStyles } from "./sharedStyles";

type Props = {
  user: User;
  isOwnProfile?: boolean;
  onBack: () => void;
  onLogout?: () => void;
  onUpdateDisplayName?: (displayName: string) => Promise<void>;
  onSelectBug?: (bug: BugReport) => void;
};

export function ProfileScreen({ user, isOwnProfile = true, onBack, onLogout, onUpdateDisplayName, onSelectBug }: Props) {
  const tier = getTierForPoints(user.totalPoints);
  const badges = user.badges.length ? user.badges : ["Nog geen badges"];
  const badgeCount = user.badges.length;
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [loadingBugs, setLoadingBugs] = useState(true);

  useEffect(() => {
    setLoadingBugs(true);
    listBugs()
      .then((items) => setBugs(items.filter((bug) => (bug.reportType ?? "bug") === "bug" && bug.reporterId === user.uid)))
      .finally(() => setLoadingBugs(false));
  }, [user.uid]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>{isOwnProfile ? "Profiel" : "Collega"}</Text>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          {isOwnProfile && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
          {isOwnProfile && onUpdateDisplayName && (
            <Pressable style={styles.nameButton} onPress={() => setEditNameVisible(true)}>
              <Text style={styles.nameButtonText}>Naam wijzigen</Text>
            </Pressable>
          )}
        </View>
        <BugArtImage bugId={tier.bugArtId} fallbackLevel={tier.evolutionLevel} fallbackVariant={tier.insect} size={tier.bugSize + 22} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.totalPoints}</Text>
          <Text style={styles.label}>Punten</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugCount}</Text>
          <Text style={styles.label}>Bugs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugDexCount ?? 0}/{bugDexEntries.length}</Text>
          <Text style={styles.label}>BugDex</Text>
        </View>
      </View>

      <TierBadge points={user.totalPoints} />

      <View style={styles.stage}>
        {userTiers.map((item) => {
          const current = item.title === tier.title;
          return (
            <View key={item.title} style={[styles.stageItem, { backgroundColor: item.frameBackground, borderColor: item.frameColor }, current && styles.stageItemActive]}>
              <View style={[styles.stageShine, { backgroundColor: item.frameAccent }]} />
              <BugArtImage bugId={item.bugArtId} fallbackLevel={item.evolutionLevel} fallbackVariant={item.insect} size={Math.max(34, item.bugSize * 0.54)} />
              <View style={[styles.stageMedal, { backgroundColor: item.frameAccent, borderColor: item.frameColor }]}>
                <Text style={[styles.stageStar, { color: item.frameColor }]}>★</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>Titel</Text>
          <Text style={styles.statusValue}>{user.title}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>Tier</Text>
          <Text style={[styles.statusValue, { color: tier.color }]}>{tier.title}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>Splats</Text>
          <Text style={styles.statusValue}>{user.splatCount ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Badges</Text>
        <View style={styles.badges}>
          {badges.map((badge) => (
            <View key={badge} style={styles.badge}>
              <BugArtImage bugId="lieveheersbeestje" size={24} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bugs</Text>
        {loadingBugs ? <ActivityIndicator /> : (
          <View style={styles.bugList}>
            {bugs.length ? bugs.map((bug) => (
              <Pressable key={bug.id} style={styles.bugItem} onPress={() => onSelectBug?.(bug)}>
                <View style={styles.bugText}>
                  <Text style={styles.bugTitle} numberOfLines={1}>{bug.title}</Text>
                  <Text style={styles.bugMeta} numberOfLines={1}>{bug.project} - {bug.points} pt - {bug.upvoteCount ?? 0} upvotes</Text>
                  <Text style={styles.bugBonus}>+{upvotePointValue} pt per upvote</Text>
                </View>
                <View style={styles.bugBadges}>
                  <SeverityBadge severity={bug.severity} />
                  <StatusBadge status={bug.status} />
                </View>
              </Pressable>
            )) : <Text style={styles.emptyText}>Nog geen bugs gemeld.</Text>}
          </View>
        )}
      </View>

      {isOwnProfile && onLogout && (
        <Pressable style={sharedStyles.dangerButton} onPress={onLogout}>
          <Text style={sharedStyles.buttonText}>Uitloggen</Text>
        </Pressable>
      )}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>Terug</Text>
      </Pressable>
      {isOwnProfile && onUpdateDisplayName && (
        <DisplayNameModal
          user={user}
          visible={editNameVisible}
          onCancel={() => setEditNameVisible(false)}
          onSave={async (displayName) => {
            await onUpdateDisplayName(displayName);
            setEditNameVisible(false);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 160
  },
  hero: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderColor: "#294338",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    padding: 16
  },
  heroText: {
    flex: 1
  },
  kicker: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  name: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900"
  },
  email: {
    color: "#dbe8de",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5
  },
  nameButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  nameButtonText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  stat: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 78,
    padding: 12,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    justifyContent: "center"
  },
  value: {
    color: "#17211c",
    fontSize: 22,
    fontWeight: "900"
  },
  label: {
    color: "#53645d",
    fontWeight: "700",
    marginTop: 4
  },
  stage: {
    alignItems: "center",
    backgroundColor: "#edf6ea",
    borderColor: "#d0dfcf",
    borderRadius: 8,
    borderWidth: 1,
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    padding: 10
  },
  stageItem: {
    alignItems: "center",
    backgroundColor: "#fdfefb",
    borderRadius: 8,
    borderWidth: 3,
    height: 72,
    justifyContent: "center",
    overflow: "visible",
    paddingTop: 5,
    width: 72
  },
  stageItemActive: {
    elevation: 4,
    shadowColor: "#102018",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6
  },
  stageShine: {
    height: 28,
    opacity: 0.58,
    position: "absolute",
    right: -14,
    top: -14,
    transform: [{ rotate: "45deg" }],
    width: 28
  },
  stageMedal: {
    alignItems: "center",
    borderRadius: 7,
    borderWidth: 1,
    bottom: -7,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    width: 28
  },
  stageStar: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14
  },
  card: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  cardTitle: {
    color: "#102018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10
  },
  statusLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5
  },
  statusLabel: {
    color: "#53645d",
    fontWeight: "800"
  },
  statusValue: {
    color: "#17211c",
    flex: 1,
    fontWeight: "900",
    marginLeft: 12,
    textAlign: "right"
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  badgeText: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  bugList: {
    gap: 8
  },
  bugItem: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  bugText: {
    flex: 1,
    minWidth: 0
  },
  bugTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  bugMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  bugBonus: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  bugBadges: {
    alignItems: "flex-end",
    gap: 5
  },
  emptyText: {
    color: "#77847f",
    fontWeight: "800"
  }
});
