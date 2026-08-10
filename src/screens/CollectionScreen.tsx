import React, { useEffect, useMemo, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CollectionProgressHeader } from "../components/collection/CollectionProgressHeader";
import { MasteryTeamChallengeCard } from "../components/collection/MasteryTeamChallengeCard";
import { NavigationArt } from "../components/NavigationArt";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { listBugDexInventory, listBugDexUnlocks, type BugDexDropResult } from "../services/bugDexService";
import { buildCollectionCompletion } from "../services/collectionCompletionModel";
import { listBugMastery } from "../services/bugMasteryService";
import { sanitizeActiveBugSquad } from "../services/bugSquadService";
import { buildMasteryTeamChallenge } from "../services/masteryTeamChallengeModel";
import { useI18n } from "../services/i18n";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { BugDexInventoryItem, BugDexUnlock, BugMastery, User } from "../types";
import { BugDexScreen } from "./BugDexScreen";
import { FieldJournalScreen } from "./FieldJournalScreen";
import { MuseumScreen } from "./MuseumScreen";
import { collectionTabs, normalizeCollectionTab, type CollectionTab } from "./CollectionScreenModel";

type Props = {
  initialTab?: CollectionTab;
  onBack: () => void;
  onRewardDrop?: (drop: BugDexDropResult) => void;
  onUserUpdated?: (user: User) => void;
  openTradeRequest?: number;
  user: User;
};

export function CollectionScreen({ initialTab, onBack, onRewardDrop, onUserUpdated, openTradeRequest = 0, user }: Props) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const layout = useResponsiveLayout();
  const [tab, setTab] = useState<CollectionTab>(() => normalizeCollectionTab(initialTab));
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [unlockHistory, setUnlockHistory] = useState<BugDexUnlock[]>([]);
  const [masteries, setMasteries] = useState<BugMastery[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      listBugDexInventory(user).catch(() => []),
      listBugDexUnlocks(user).catch(() => []),
      listBugMastery(user).catch(() => [])
    ]).then(([items, unlocks, masteryItems]) => {
      if (!active) return;
      setInventory(items);
      setUnlockHistory(unlocks);
      setMasteries(masteryItems);
    });
    return () => { active = false; };
  }, [user]);

  const completion = useMemo(() => buildCollectionCompletion(inventory, unlockHistory), [inventory, unlockHistory]);
  const masteryTeamChallenge = useMemo(() => buildMasteryTeamChallenge({
    activeSquadIds: sanitizeActiveBugSquad(user.activeBugSquad),
    masteryLevels: Object.fromEntries(masteries.map((item) => [item.bugId, item.level]))
  }), [masteries, user.activeBugSquad]);
  const dense = !layout.isTablet || height < 820;

  return (
    <View style={styles.screen}>
      <View style={[styles.shell, { maxWidth: layout.shellMaxWidth }]}>
      <ImageBackground
        imageStyle={styles.headerArt}
        source={require("../../assets/generated/bugdex-collection-view-hd.jpg")}
        style={[styles.header, { paddingHorizontal: layout.gutter }]}
      >
        <View style={styles.headerShade} />
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><GameUiIcon name="back" size={22} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.kicker}>{t("collection.kicker")}</Text><Text style={styles.title}>{t("collection.title")}</Text></View>
        <View style={styles.completionBadge}>
          <Text style={styles.completionValue}>{completion.owned}/{completion.total}</Text>
          <Text style={styles.completionLabel}>{completion.percent}% {t("bugdex.unlockedShort")}</Text>
        </View>
      </ImageBackground>
      <View style={[styles.tabs, { maxWidth: layout.contentMaxWidth }]}>
        {collectionTabs.map((item) => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item }} key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
            <CollectionTabMark active={tab === item} tab={item} />
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{t(`collection.tab.${item}`)}</Text>
          </Pressable>
        ))}
      </View>
      {tab === "bugdex" && !dense ? (
        <View style={[styles.progressRow, { maxWidth: layout.contentMaxWidth }]}>
          <CollectionProgressHeader completion={completion} />
          <MasteryTeamChallengeCard challenge={masteryTeamChallenge} />
        </View>
      ) : null}
      <View style={[
        styles.content,
        {
          paddingBottom: layout.navigationMode === "rail"
            ? 0
            : layout.bottomNavHeight + layout.bottomNavInset
        }
      ]}>
        {tab === "bugdex" ? <BugDexScreen embedded openTradeRequest={openTradeRequest} onBack={onBack} onOpenMuseum={() => setTab("museum")} onRewardDrop={onRewardDrop} onUserUpdated={onUserUpdated} user={user} /> : null}
        {tab === "museum" ? <MuseumScreen embedded onBack={() => setTab("bugdex")} onRewardDrop={onRewardDrop} user={user} /> : null}
        {tab === "journal" ? <FieldJournalScreen embedded onBack={() => setTab("bugdex")} user={user} /> : null}
      </View>
      </View>
    </View>
  );
}

function CollectionTabMark({ active, tab }: { active: boolean; tab: CollectionTab }) {
  return <NavigationArt active={active} name={tab} size={active ? 28 : 24} />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#f5f0e5", flex: 1, minHeight: 0 },
  shell: { alignSelf: "center", flex: 1, minHeight: 0, width: "100%" },
  header: { alignItems: "center", borderBottomColor: "rgba(242,197,101,0.45)", borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 72, overflow: "hidden", paddingVertical: 9 },
  headerArt: { opacity: 0.48 },
  headerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(17,20,48,0.84)" },
  back: { alignItems: "center", backgroundColor: "rgba(255,250,235,0.96)", borderColor: "#efc764", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  backText: { color: "#292450", fontSize: 25, fontWeight: "900", lineHeight: 27 },
  headerCopy: { flex: 1 },
  kicker: { color: "#f2c565", fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#fffaf0", fontSize: 22, fontWeight: "900", marginTop: 1 },
  completionBadge: { alignItems: "center", backgroundColor: "rgba(242,197,101,0.14)", borderColor: "rgba(242,197,101,0.55)", borderRadius: 14, borderWidth: 1, minWidth: 54, paddingHorizontal: 8, paddingVertical: 6 },
  completionValue: { color: "#f7d27d", fontSize: 13, fontWeight: "900" },
  completionLabel: { color: "#e6e1f6", fontSize: 7, fontWeight: "800", marginTop: 1 },
  tabs: { alignSelf: "center", backgroundColor: "#1b1b3d", borderColor: "rgba(79,70,165,0.35)", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 4, marginBottom: 6, marginTop: 7, padding: 4, width: "94%" },
  tab: { alignItems: "center", borderRadius: 11, flex: 1, flexDirection: "row", gap: 6, minHeight: 42, justifyContent: "center" },
  tabActive: { backgroundColor: "#f4dfaa" },
  tabText: { color: "#bbb7d5", fontSize: 9, fontWeight: "900" },
  tabTextActive: { color: "#28234f" },
  progressRow: { alignSelf: "center", width: "94%" },
  content: { flex: 1, minHeight: 0 }
});
