import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Modal,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { BugArtImage } from "../components/BugArtImage";
import {
  CompletedCategoryMedal,
  LockedBugSilhouette,
  MuseumStageMark,
  RarityMarks,
  SpecimenFrame,
  specimenRarityAccent
} from "../components/collection/SpecimenArchiveVisuals";
import { MuseumExhibitEditor } from "../components/museum/MuseumExhibitEditor";
import { MuseumRewardGoalPanel } from "../components/museum/MuseumRewardGoalPanel";
import { SeasonTrophyShelf } from "../components/museum/SeasonTrophyShelf";
import { nativeDriver } from "../services/animationPlatform";
import { entryByBugId, listBugDexInventory, type BugDexDropResult } from "../services/bugDexService";
import { listBugMastery } from "../services/bugMasteryService";
import { listFieldJournalEntries, type FieldJournalEntry } from "../services/fieldJournalService";
import { useI18n } from "../services/i18n";
import {
  clearMuseumExhibit,
  listMuseumPlacements,
  placeMuseumExhibit,
  sanitizeMuseumPlacements,
  saveMuseumPlacements,
  museumSlotCapacity,
  type MuseumExhibitPlacement
} from "../services/museumPlacementService";
import { listSeasonTrophies, type SeasonTrophy } from "../services/seasonProgressService";
import { loadResearchFocusWing, saveResearchFocusWing } from "../services/researchFocusService";
import { buildMuseumRewardGoals, nextMuseumRewardGoal } from "../services/museumRewardModel";
import { claimMuseumRewards, listMuseumRewardClaimIds } from "../services/museumRewardService";
import type { ResearchFocusWing } from "../services/researchFocusModel";
import { useReducedMotion } from "../theme/useReducedMotion";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import type { BugDexInventoryItem, BugMastery, User } from "../types";
import {
  museumTabs,
  paginateMuseumItems,
  type MuseumTab
} from "./MuseumScreenLayoutModel";
import {
  buildMuseumWings,
  getMuseumWingItems,
  getNextMuseumGoal,
  museumStageRank,
  type MuseumGoalStage,
  type MuseumRequirement,
  type MuseumWing,
  type MuseumWingId,
  type MuseumWingStage
} from "./MuseumScreenModel";

const museumGallery = require("../../assets/generated/museum-gallery-v2.jpg");
const conservatory = require("../../assets/generated/conservatory-app-background-v1.jpg");
const biomeAtlas = require("../../assets/generated/biome-atlas-v1.jpg");
const releaseBoss = require("../../assets/generated/release-boss-v1.jpg");
const fieldBoard = require("../../assets/generated/field-operations-board-v1.jpg");

const roomBackgrounds: Record<MuseumWingId, ImageSourcePropType> = {
  beetles: museumGallery,
  wings: conservatory,
  water: biomeAtlas,
  night: releaseBoss,
  crawlers: fieldBoard,
  crown: museumGallery
};

const previewBugs: Record<MuseumWingId, string[]> = {
  beetles: ["goudtor", "lieveheersbeestje", "neushoornkever"],
  wings: ["libel", "koninginnenpage", "sprinkhaan"],
  water: ["waterkever", "waterschorpioen", "azuren-waterjuffer"],
  night: ["mot", "maanmot", "kruisspin"],
  crawlers: ["duizendpoot", "schorpioen", "zilvervisje"],
  crown: ["atlaskever", "maanmot", "pauwspin"]
};

const rarityColors: Record<string, string> = specimenRarityAccent;

export function MuseumScreen({ user, onBack, onRewardDrop, embedded = false }: { user: User; onBack: () => void; onRewardDrop?: (drop: BugDexDropResult) => void; embedded?: boolean }) {
  const { t, tr } = useI18n();
  const { height } = useWindowDimensions();
  const layout = useResponsiveLayout();
  const reducedMotion = useReducedMotion();
  const compact = height < 760 || layout.isCompact;
  const compactChromeHeight = (embedded ? 112 : 128) + layout.bottomNavHeight + layout.bottomNavInset;
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [masteries, setMasteries] = useState<BugMastery[]>([]);
  const [journalEntries, setJournalEntries] = useState<FieldJournalEntry[]>([]);
  const [placementsByWing, setPlacementsByWing] = useState<Record<MuseumWingId, MuseumExhibitPlacement[]>>({ beetles: [], wings: [], water: [], night: [], crawlers: [], crown: [] });
  const [seasonTrophies, setSeasonTrophies] = useState<SeasonTrophy[]>([]);
  const [researchFocusWing, setResearchFocusWing] = useState<ResearchFocusWing>();
  const [exhibitEditorOpen, setExhibitEditorOpen] = useState(false);
  const [placementBusy, setPlacementBusy] = useState(false);
  const [placementError, setPlacementError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rewardBusy, setRewardBusy] = useState(false);
  const [rewardError, setRewardError] = useState("");
  const [rewardNotice, setRewardNotice] = useState("");
  const [claimedRewardIds, setClaimedRewardIds] = useState<Set<string>>(new Set());
  const [selectedWingId, setSelectedWingId] = useState<MuseumWingId>("beetles");
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [selectedGoalStage, setSelectedGoalStage] = useState<MuseumGoalStage | null>(null);
  const [activeTab, setActiveTab] = useState<MuseumTab>("room");
  const [collectionPage, setCollectionPage] = useState(0);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const initialWingChosen = useRef(false);
  const guidedPlacementPrompted = useRef(new Set<MuseumWingId>());
  const drift = useRef(new Animated.Value(0)).current;

  const loadMuseum = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const [inventoryResult, masteryResult, journalResult, placementResult, trophyResult, rewardClaimResult] = await Promise.allSettled([
      listBugDexInventory(user, { force: true }),
      listBugMastery(user, { force: true }),
      listFieldJournalEntries(user),
      listMuseumPlacements(user),
      listSeasonTrophies(user),
      listMuseumRewardClaimIds(user)
    ]);

    if (inventoryResult.status === "rejected") {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setInventory(inventoryResult.value);
    setMasteries(masteryResult.status === "fulfilled" ? masteryResult.value : []);
    setJournalEntries(journalResult.status === "fulfilled" ? journalResult.value : []);
    if (placementResult.status === "fulfilled") setPlacementsByWing(placementResult.value);
    setSeasonTrophies(trophyResult.status === "fulfilled" ? trophyResult.value : []);
    setClaimedRewardIds(new Set(rewardClaimResult.status === "fulfilled" ? rewardClaimResult.value : []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadMuseum();
  }, [loadMuseum]);

  useEffect(() => {
    let active = true;
    loadResearchFocusWing(user.uid).then((wingId) => { if (active) setResearchFocusWing(wingId); }).catch(() => undefined);
    return () => { active = false; };
  }, [user.uid]);

  useEffect(() => {
    drift.setValue(reducedMotion ? 0.45 : 0);
    if (reducedMotion) return;
    const animation = Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 950, useNativeDriver: nativeDriver }),
      Animated.timing(drift, { toValue: 0.28, duration: 1150, useNativeDriver: nativeDriver })
    ]);
    animation.start();
    return () => animation.stop();
  }, [drift, reducedMotion]);

  const owned = useMemo(() => inventory.filter((item) => item.count > 0), [inventory]);
  const masteryByBugId = useMemo(() => new Map(masteries.map((item) => [item.bugId, item])), [masteries]);
  const wings = useMemo(() => buildMuseumWings(owned, masteries, journalEntries), [journalEntries, masteries, owned]);
  const selectedWing = wings.find((wing) => wing.id === selectedWingId) ?? wings[0]!;
  const selectedWingItems = useMemo(
    () => sortDisplayItems(getMuseumWingItems(owned, selectedWing.id), masteryByBugId),
    [masteryByBugId, owned, selectedWing.id]
  );
  const selectedPlacements = useMemo(() => sanitizeMuseumPlacements({
    allowedBugIds: selectedWingItems.map((item) => item.bugId),
    ownedBugIds: owned.map((item) => item.bugId),
    placements: placementsByWing[selectedWing.id] ?? [],
    stage: selectedWing.stage,
    wingId: selectedWing.id
  }), [owned, placementsByWing, selectedWing.id, selectedWing.stage, selectedWingItems]);
  const selectedDisplayItems = useMemo(() => selectedPlacements
    .map((placement) => selectedWingItems.find((item) => item.bugId === placement.bugId))
    .filter((item): item is BugDexInventoryItem => Boolean(item)), [selectedPlacements, selectedWingItems]);
  const selectedGoal = selectedGoalStage
    ? selectedWing.goals.find((goal) => goal.stage === selectedGoalStage) ?? getNextMuseumGoal(selectedWing)
    : getNextMuseumGoal(selectedWing);
  const rewardGoals = useMemo(() => buildMuseumRewardGoals({
    wings,
    placementsByWing,
    inventory: owned,
    masteries,
    journalEntries,
    trophyCount: seasonTrophies.length
  }), [journalEntries, masteries, owned, placementsByWing, seasonTrophies.length, wings]);
  const selectedRewardGoal = nextMuseumRewardGoal(rewardGoals, selectedWing.id, claimedRewardIds);
  const champion = selectedDisplayItems[0];
  const openCount = wings.filter((wing) => museumStageRank(wing.stage) >= museumStageRank("open")).length;
  const curatedCount = wings.filter((wing) => museumStageRank(wing.stage) >= museumStageRank("curated")).length;
  const pageData = paginateMuseumItems(selectedWingItems, collectionPage, 6);
  const lightShift = drift.interpolate({ inputRange: [0, 1], outputRange: [-28, 34] });
  const lightOpacity = drift.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.28] });
  const bugFloat = drift.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });

  useEffect(() => {
    if (loading || initialWingChosen.current) return;
    const firstVisible = wings.find((wing) => wing.stage !== "hidden");
    if (firstVisible) setSelectedWingId(firstVisible.id);
    initialWingChosen.current = true;
  }, [loading, wings]);

  useEffect(() => {
    setCollectionPage(0);
    setExhibitEditorOpen(false);
    setPlacementError("");
    setSelectedGoalStage(null);
  }, [selectedWingId]);

  useEffect(() => {
    if (loading || selectedWing.stage !== "discovered" || selectedPlacements.length > 0 || guidedPlacementPrompted.current.has(selectedWing.id)) return;
    guidedPlacementPrompted.current.add(selectedWing.id);
    setExhibitEditorOpen(true);
  }, [loading, selectedPlacements.length, selectedWing.id, selectedWing.stage]);

  const evaluateMuseumRewards = useCallback(async () => {
    setRewardBusy(true);
    setRewardError("");
    try {
      const result = await claimMuseumRewards(user);
      setClaimedRewardIds(new Set(result.claimedIds));
      if (result.awardedXp || result.awardedBadges.length || result.awardedBugs.length || result.awardedTitles.length) {
        setRewardNotice(t("museum.reward.received", {
          xp: result.awardedXp,
          rewards: result.awardedBadges.length + result.awardedBugs.length + result.awardedTitles.length
        }));
        if (result.awardedBugs.length) {
          const items = await listBugDexInventory(user, { force: true }).catch(() => []);
          for (const bugId of result.awardedBugs) {
            const entry = entryByBugId(bugId);
            const item = items.find((candidate) => candidate.bugId === bugId);
            if (entry && item) onRewardDrop?.({ rewardType: "bug", entry, item, isNew: item.count === 1, source: "museum_reward" });
          }
          await loadMuseum();
        }
      }
    } catch (error) {
      setRewardError(error instanceof Error ? error.message : t("museum.reward.error"));
    } finally {
      setRewardBusy(false);
    }
  }, [loadMuseum, onRewardDrop, t, user]);

  async function persistPlacements(next: MuseumExhibitPlacement[]) {
    const previous = placementsByWing[selectedWing.id] ?? [];
    setPlacementBusy(true);
    setPlacementError("");
    setPlacementsByWing((current) => ({ ...current, [selectedWing.id]: next }));
    try {
      await saveMuseumPlacements(user, selectedWing.id, next);
    } catch (error) {
      setPlacementsByWing((current) => ({ ...current, [selectedWing.id]: previous }));
      setPlacementError(error instanceof Error ? error.message : t("museum.placementError"));
    } finally {
      setPlacementBusy(false);
    }
  }

  function placeExhibit(slotId: string, bugId: string) {
    const next = placeMuseumExhibit({
      allowedBugIds: selectedWingItems.map((item) => item.bugId),
      bugId,
      now: new Date().toISOString(),
      ownedBugIds: owned.map((item) => item.bugId),
      placements: selectedPlacements,
      slotId,
      stage: selectedWing.stage,
      wingId: selectedWing.id
    });
    void persistPlacements(next);
  }

  async function focusResearch() {
    if (selectedWing.id === "crown") return;
    try {
      const wingId = await saveResearchFocusWing(user.uid, selectedWing.id);
      setResearchFocusWing(wingId);
      setPlacementError("");
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : t("museum.placementError"));
    }
  }

  function selectWing(wingId: MuseumWingId) {
    setSelectedWingId(wingId);
    setRoomPickerOpen(false);
    requestAnimationFrame(() => mainScrollRef.current?.scrollTo({ animated: false, y: 0 }));
  }

  function clearExhibit(slotId: string) {
    const next = clearMuseumExhibit({
      allowedBugIds: selectedWingItems.map((item) => item.bugId),
      ownedBugIds: owned.map((item) => item.bugId),
      placements: selectedPlacements,
      slotId,
      stage: selectedWing.stage,
      wingId: selectedWing.id
    });
    void persistPlacements(next);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[
          styles.shell,
          {
            maxWidth: layout.shellMaxWidth,
            paddingBottom: embedded ? 20 : layout.navigationMode === "rail" ? 24 : layout.bottomNavHeight + layout.bottomNavInset + (layout.isTablet ? 30 : 20)
          }
        ]}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.shellScroll}
      >
        <View style={[styles.compactHeader, { paddingHorizontal: layout.gutter }]}>
          {!embedded ? (
            <Pressable accessibilityLabel={t("museum.back")} onPress={onBack} style={[styles.backButton, { height: layout.touchTarget, width: layout.touchTarget }]}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: roomPickerOpen }}
            onPress={() => setRoomPickerOpen((open) => !open)}
            style={({ pressed }) => [styles.roomPickerButton, pressed && styles.pressed]}
          >
            <BugArtImage bugId={selectedWingItems[0]?.bugId ?? previewBugs[selectedWing.id][0]} opacity={selectedWingItems.length ? 1 : 0.3} size={34} />
            <View style={styles.roomPickerCopy}>
              <Text style={styles.roomPickerKicker}>{t("museum.rooms")}</Text>
              <Text numberOfLines={1} style={styles.roomPickerTitle}>{t(selectedWing.titleKey)}</Text>
            </View>
            <MuseumStageMark accent={selectedWing.accent} size={22} stage={selectedWing.stage} />
            <Text style={styles.roomPickerChevron}>{roomPickerOpen ? "⌃" : "⌄"}</Text>
          </Pressable>
          <View style={styles.compactStats}>
            <CompletedCategoryMedal size={20} />
            <Text style={styles.headerStatValue}>{openCount}/{wings.length}</Text>
          </View>
        </View>

        {roomPickerOpen ? (
          <View style={styles.roomPickerDropdown}>
            <ScrollView
              contentContainerStyle={styles.roomPickerGrid}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {wings.map((wing) => (
                <RoomSelector
                  key={wing.id}
                  wing={wing}
                  items={getMuseumWingItems(owned, wing.id)}
                  selected={wing.id === selectedWing.id}
                  onPress={() => selectWing(wing.id)}
                  title={t(wing.titleKey)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.tabs, { gap: layout.isTablet ? 6 : 4, padding: layout.isTablet ? 7 : 5 }]}>
          {museumTabs.map((tab) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={({ pressed }) => [styles.tab, { minHeight: Math.max(48, layout.touchTarget) }, activeTab === tab && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabText, { fontSize: layout.isTablet ? 12 : 10 }, activeTab === tab && styles.tabTextActive]}>{t(`museum.tab.${tab}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.panelWrap}>
          {loading ? (
            <StatePanel kind="loading" label={t("museum.loading")} />
          ) : loadError ? (
            <StatePanel kind="error" label={t("museum.error")} actionLabel={t("museum.retry")} onAction={() => void loadMuseum()} />
          ) : (
            <ImageBackground
              imageStyle={styles.panelImage}
              resizeMode="cover"
              source={roomBackgrounds[selectedWing.id]}
              style={[
                styles.panel,
                {
                  minHeight: Math.max(560, height - compactChromeHeight),
                  padding: layout.isTablet ? 20 : 12
                }
              ]}
            >
              <View style={[styles.panelTint, { backgroundColor: selectedWing.tint }]} />
              <View style={styles.panelVignette} />
              <Animated.View
                pointerEvents="none"
                style={[styles.lightBeam, { opacity: lightOpacity, transform: [{ translateX: lightShift }, { rotate: "-12deg" }] }]}
              />

              <MuseumRewardGoalPanel
                busy={rewardBusy}
                error={rewardError}
                goal={selectedRewardGoal}
                notice={rewardNotice}
                onClaim={() => { void evaluateMuseumRewards(); }}
                t={t}
              />

              {activeTab === "room" ? (
                <>
                  {!exhibitEditorOpen ? (
                    <View style={styles.roomPanelShell}>
                      <RoomPanel
                        compact={compact}
                        tablet={layout.isTablet}
                        selectedWing={selectedWing}
                        selectedItems={selectedDisplayItems}
                        champion={champion}
                        masteryByBugId={masteryByBugId}
                        selectedGoal={selectedGoal}
                        selectedGoalStage={selectedGoalStage}
                        onSelectStage={setSelectedGoalStage}
                        bugFloat={bugFloat}
                        t={t}
                        tr={tr}
                      />
                    </View>
                  ) : null}
                  {!exhibitEditorOpen ? (
                    <MuseumSlotGuide
                      goal={selectedGoal}
                      stage={selectedWing.stage}
                      t={t}
                    />
                  ) : null}
                  {!exhibitEditorOpen ? (
                    <Pressable disabled={placementBusy} onPress={() => setExhibitEditorOpen(true)} style={styles.editExhibitsButton}>
                      <Text style={styles.editExhibitsButtonText}>{t("museum.editExhibits")}</Text>
                    </Pressable>
                  ) : null}
                  {selectedWing.id !== "crown" && museumStageRank(selectedWing.stage) >= museumStageRank("curated") ? (
                    <Pressable onPress={() => { void focusResearch(); }} style={[styles.researchFocusButton, researchFocusWing === selectedWing.id && styles.researchFocusButtonActive]}>
                      <Text style={[styles.researchFocusButtonText, researchFocusWing === selectedWing.id && styles.researchFocusButtonTextActive]}>{researchFocusWing === selectedWing.id ? t("museum.researchFocus.active") : t("museum.researchFocus.action")}</Text>
                      <Text style={styles.researchFocusHint}>{t("museum.researchFocus.hint")}</Text>
                    </Pressable>
                  ) : null}
                  {selectedWing.id === "crown" ? <SeasonTrophyShelf emptyText={t("museum.trophies.empty")} title={t("museum.trophies.title")} trophies={seasonTrophies} /> : null}
                  {placementError ? <Text style={styles.placementError}>{placementError}</Text> : null}
                </>
              ) : null}

              {activeTab === "goals" ? (
                <GoalsPanel selectedWing={selectedWing} selectedGoal={selectedGoal} t={t} />
              ) : null}

              {activeTab === "collection" ? (
                <CollectionPanel
                  compact={compact}
                  tablet={layout.isTablet}
                  selectedWing={selectedWing}
                  pageData={pageData}
                  masteryByBugId={masteryByBugId}
                  setCollectionPage={setCollectionPage}
                  t={t}
                  tr={tr}
                />
              ) : null}
            </ImageBackground>
          )}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setExhibitEditorOpen(false)}
        transparent
        visible={exhibitEditorOpen}
      >
        <View style={[styles.editorBackdrop, { paddingHorizontal: layout.gutter }]}>
          <ScrollView
            contentContainerStyle={styles.editorModalContent}
            showsVerticalScrollIndicator={false}
            style={styles.editorModalScroll}
          >
            <MuseumExhibitEditor
              items={selectedWingItems}
              onClear={clearExhibit}
              onClose={() => setExhibitEditorOpen(false)}
              onPlace={placeExhibit}
              placements={selectedPlacements}
              stage={selectedWing.stage}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function RoomSelector({
  wing,
  items,
  selected,
  onPress,
  title
}: {
  wing: MuseumWing;
  items: BugDexInventoryItem[];
  selected: boolean;
  onPress: () => void;
  title: string;
}) {
  const bugId = items[0]?.bugId ?? previewBugs[wing.id][0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.roomButton, selected && { borderColor: wing.accent, backgroundColor: `${wing.accent}22` }, pressed && styles.pressed]}
    >
      <BugArtImage bugId={bugId} opacity={items.length ? 1 : 0.24} size={38} />
      <Text numberOfLines={1} style={[styles.roomButtonLabel, selected && { color: wing.accent }]}>{title}</Text>
      <View style={[styles.roomStageBadge, { borderColor: wing.accent }]}>
        <MuseumStageMark accent={wing.accent} size={18} stage={wing.stage} />
      </View>
      <View style={styles.roomProgressTrack}>
        <View style={[styles.roomProgressFill, { backgroundColor: wing.accent, width: `${Math.max(5, Math.round(wing.progress * 100))}%` }]} />
      </View>
    </Pressable>
  );
}

function RoomPanel({
  compact,
  tablet,
  selectedWing,
  selectedItems,
  champion,
  masteryByBugId,
  selectedGoal,
  selectedGoalStage,
  onSelectStage,
  bugFloat,
  t,
  tr
}: {
  compact: boolean;
  tablet: boolean;
  selectedWing: MuseumWing;
  selectedItems: BugDexInventoryItem[];
  champion?: BugDexInventoryItem;
  masteryByBugId: Map<string, BugMastery>;
  selectedGoal: ReturnType<typeof getNextMuseumGoal>;
  selectedGoalStage: MuseumGoalStage | null;
  onSelectStage: (stage: MuseumGoalStage) => void;
  bugFloat: Animated.AnimatedInterpolation<number>;
  t: (key: string, params?: Record<string, string | number>) => string;
  tr: (text: string, params?: Record<string, string | number>) => string;
}) {
  const mainSize = compact ? 108 : tablet ? 170 : 132;
  const sideSize = compact ? 58 : tablet ? 92 : 72;
  const nextRequirement = selectedGoal?.requirements.find((requirement) => !requirement.complete) ?? selectedGoal?.requirements[0];
  return (
    <View style={styles.roomPanel}>
      <PanelHeader selectedWing={selectedWing} t={t} />
      <StageRail selectedGoalStage={selectedGoalStage} selectedWing={selectedWing} onSelectStage={onSelectStage} />

      <View style={[styles.specimenStage, compact && styles.specimenStageCompact, tablet && { minHeight: 270 }]}>
        <SideSpecimen bugId={selectedItems[1]?.bugId ?? previewBugs[selectedWing.id][1]} visible={Boolean(selectedItems[1])} size={sideSize} rotate="-5deg" />
        <Animated.View style={[styles.mainSpecimen, { transform: [{ translateY: bugFloat }] }]}>
          <View style={[styles.mainGlow, { backgroundColor: selectedWing.accent }]} />
          {champion ? <BugArtImage bugId={champion.bugId} size={mainSize} /> : <LockedBugSilhouette size={Math.min(mainSize, 118)} />}
          <View style={[styles.pedestalTop, { backgroundColor: selectedWing.accent }]} />
          <View style={styles.pedestalBody}>
            <Text numberOfLines={1} style={styles.pedestalName}>
              {champion ? tr(entryByBugId(champion.bugId)?.name ?? champion.bugId) : t("museum.emptySlot")}
            </Text>
            <Text style={[styles.pedestalLevel, { color: selectedWing.accent }]}>LV.{champion ? masteryByBugId.get(champion.bugId)?.level ?? 1 : 0}</Text>
          </View>
        </Animated.View>
        <SideSpecimen bugId={selectedItems[2]?.bugId ?? previewBugs[selectedWing.id][2]} visible={Boolean(selectedItems[2])} size={sideSize} rotate="5deg" />
      </View>

      <View style={styles.nextGoalCard}>
        <View style={styles.nextGoalTopRow}>
          <Text style={styles.nextGoalLabel}>{selectedGoal ? t(`museum.goalStage.${selectedGoal.stage}`) : t("museum.goalStage.done")}</Text>
          <Text style={[styles.nextGoalPercent, { color: selectedWing.accent }]}>{Math.round(selectedWing.progress * 100)}%</Text>
        </View>
        {nextRequirement ? (
          <View style={styles.nextGoalLine}>
            <MuseumStageMark accent={selectedWing.accent} size={20} stage={nextRequirement.complete ? "curated" : "discovered"} />
            <Text numberOfLines={1} style={styles.nextGoalText}>{t(nextRequirement.labelKey)}</Text>
            <Text style={styles.nextGoalValue}>{nextRequirement.current}/{nextRequirement.required}</Text>
          </View>
        ) : (
          <View style={styles.masterSealRow}><CompletedCategoryMedal size={28} /><Text style={styles.masterText}>{t("museum.masterSeal")}</Text></View>
        )}
        <View style={styles.bigProgressTrack}>
          <View style={[styles.bigProgressFill, { backgroundColor: selectedWing.accent, width: `${Math.round(selectedWing.progress * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

function GoalsPanel({
  selectedWing,
  selectedGoal,
  t
}: {
  selectedWing: MuseumWing;
  selectedGoal: ReturnType<typeof getNextMuseumGoal>;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={styles.goalsPanel}>
      <PanelHeader selectedWing={selectedWing} t={t} />
      <View style={styles.goalStageCard}>
        <Text style={styles.goalStageTitle}>{selectedGoal ? t(`museum.goalStage.${selectedGoal.stage}`) : t("museum.goalStage.done")}</Text>
        <StageLadder selectedWing={selectedWing} t={t} />
      </View>
      <View style={styles.requirementGrid}>
        {(selectedGoal?.requirements ?? []).slice(0, 4).map((requirement) => (
          <GoalTile key={requirement.id} requirement={requirement} accent={selectedWing.accent} t={t} />
        ))}
        {!selectedGoal ? (
          <View style={styles.masterPanel}>
            <CompletedCategoryMedal size={46} />
            <Text style={styles.masterPanelTitle}>{t("museum.masterSeal")}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function CollectionPanel({
  compact,
  tablet,
  selectedWing,
  pageData,
  masteryByBugId,
  setCollectionPage,
  t,
  tr
}: {
  compact: boolean;
  tablet: boolean;
  selectedWing: MuseumWing;
  pageData: ReturnType<typeof paginateMuseumItems<BugDexInventoryItem>>;
  masteryByBugId: Map<string, BugMastery>;
  setCollectionPage: React.Dispatch<React.SetStateAction<number>>;
  t: (key: string, params?: Record<string, string | number>) => string;
  tr: (text: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={styles.collectionPanel}>
      <View style={styles.collectionTopRow}>
        <View>
          <Text style={[styles.panelEyebrow, { color: selectedWing.accent }]}>{t(selectedWing.eyebrowKey)}</Text>
          <Text style={styles.collectionTitle}>{t(selectedWing.titleKey)}</Text>
        </View>
        <Text style={styles.pageLabel}>{t("museum.page", { current: pageData.page + 1, total: pageData.pageCount })}</Text>
      </View>

      {pageData.items.length ? (
        <View style={styles.collectionGrid}>
          {pageData.items.map((item) => (
            <CollectionSpecimen
              compact={compact}
              tablet={tablet}
              item={item}
              mastery={masteryByBugId.get(item.bugId)}
              key={item.bugId}
              tr={tr}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCollection}>
          {previewBugs[selectedWing.id].map((bugId) => (
            <View key={bugId} style={[styles.emptyJar, tablet && { height: 132 }]}><LockedBugSilhouette size={tablet ? 86 : 66} /></View>
          ))}
          <Text style={styles.emptyCollectionText}>{t("museum.empty.title")}</Text>
        </View>
      )}

      <View style={styles.pagination}>
        <Pressable
          disabled={!pageData.hasPrevious}
          onPress={() => setCollectionPage((page) => Math.max(0, page - 1))}
          style={[styles.pageButton, tablet && { height: 46, width: 52 }, !pageData.hasPrevious && styles.pageButtonDisabled]}
        >
          <Text style={styles.pageButtonText}>‹</Text>
        </Pressable>
        <View style={styles.pageDots}>
          {Array.from({ length: pageData.pageCount }, (_, index) => (
            <View key={index} style={[styles.pageDot, index === pageData.page && { backgroundColor: selectedWing.accent, width: 22 }]} />
          ))}
        </View>
        <Pressable
          disabled={!pageData.hasNext}
          onPress={() => setCollectionPage((page) => Math.min(pageData.pageCount - 1, page + 1))}
          style={[styles.pageButton, tablet && { height: 46, width: 52 }, !pageData.hasNext && styles.pageButtonDisabled]}
        >
          <Text style={styles.pageButtonText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MuseumSlotGuide({
  goal,
  stage,
  t
}: {
  goal?: MuseumWing["goals"][number];
  stage: MuseumWingStage;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const capacity = museumSlotCapacity(stage);
  const nextCapacity = stage === "discovered" ? 3 : stage === "open" ? 6 : 6;
  const incomplete = goal?.requirements.filter((requirement) => !requirement.complete) ?? [];

  return (
    <View style={styles.slotGuide}>
      <Text style={styles.slotGuideTitle}>{t("museum.slotGuide.title", { current: capacity, total: 6 })}</Text>
      {capacity >= 6 ? (
        <Text style={styles.slotGuideDone}>{t("museum.slotGuide.done")}</Text>
      ) : (
        <>
          <Text style={styles.slotGuideIntro}>{t("museum.slotGuide.intro", { next: nextCapacity })}</Text>
          {incomplete.map((requirement) => (
            <View key={`${requirement.kind}-${requirement.detail ?? ""}`} style={styles.slotGuideRow}>
              <Text style={styles.slotGuideIcon}>○</Text>
              <Text style={styles.slotGuideText}>
                {t(requirement.labelKey)}: {requirement.current}/{requirement.required}{requirement.detail ? ` · ${requirement.detail}` : ""}
              </Text>
            </View>
          ))}
          <Text style={styles.slotGuideHint}>{t("museum.slotGuide.hint")}</Text>
        </>
      )}
    </View>
  );
}

function PanelHeader({ selectedWing, t }: { selectedWing: MuseumWing; t: (key: string) => string }) {
  return (
    <View style={styles.panelHeader}>
      <View style={styles.panelHeaderCopy}>
        <Text style={[styles.panelEyebrow, { color: selectedWing.accent }]}>{t(selectedWing.eyebrowKey)}</Text>
        <Text numberOfLines={1} style={styles.panelTitle}>{t(selectedWing.titleKey)}</Text>
      </View>
      <View style={[styles.stageBadge, { borderColor: selectedWing.accent }]}>
        <MuseumStageMark accent={selectedWing.accent} size={22} stage={selectedWing.stage} />
        <Text style={styles.stageBadgeText}>{t(`museum.stage.${selectedWing.stage}`)}</Text>
      </View>
    </View>
  );
}

function StageRail({ selectedGoalStage, selectedWing, onSelectStage }: { selectedGoalStage: MuseumGoalStage | null; selectedWing: MuseumWing; onSelectStage: (stage: MuseumGoalStage) => void }) {
  return (
    <View style={styles.stageRail}>
      {(["discovered", "open", "curated", "master"] as MuseumWingStage[]).map((stage) => {
        const reached = museumStageRank(selectedWing.stage) >= museumStageRank(stage);
        const goalStage = (stage === "discovered" ? "open" : stage) as MuseumGoalStage;
        const selected = selectedGoalStage === goalStage || (!selectedGoalStage && selectedWing.stage === stage);
        return (
          <Pressable
            accessibilityLabel={`View ${goalStage} requirements`}
            accessibilityRole="button"
            key={stage}
            onPress={() => onSelectStage(goalStage)}
            style={styles.stageSegmentHit}
          >
            <View style={[styles.stageSegment, reached && { backgroundColor: selectedWing.accent, borderColor: selectedWing.accent }, selected && styles.stageSegmentSelected]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function StageLadder({ selectedWing, t }: { selectedWing: MuseumWing; t: (key: string) => string }) {
  return (
    <View style={styles.stageLadder}>
      {(["discovered", "open", "curated", "master"] as MuseumWingStage[]).map((stage) => {
        const reached = museumStageRank(selectedWing.stage) >= museumStageRank(stage);
        return (
          <View key={stage} style={styles.stageLadderItem}>
            <View style={styles.stageLadderIcon}>
              <MuseumStageMark accent={selectedWing.accent} size={30} stage={reached ? stage : "hidden"} />
            </View>
            <Text numberOfLines={1} style={[styles.stageLadderLabel, reached && { color: selectedWing.accent }]}>{t(`museum.stage.${stage}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SideSpecimen({ bugId, visible, size, rotate }: { bugId: string; visible: boolean; size: number; rotate: `${number}deg` }) {
  return (
    <View style={[styles.sideSpecimen, { transform: [{ rotate }] }]}>
      {visible ? <BugArtImage bugId={bugId} size={size} /> : <LockedBugSilhouette size={Math.min(size, 64)} />}
    </View>
  );
}

function GoalTile({
  requirement,
  accent,
  t
}: {
  requirement: MuseumRequirement;
  accent: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={[styles.goalTile, requirement.complete && { borderColor: accent, backgroundColor: `${accent}25` }]}>
      <View style={styles.goalTileIconWrap}>
        <MuseumStageMark accent={accent} size={30} stage={requirement.complete ? "curated" : "discovered"} />
      </View>
      <Text numberOfLines={2} style={styles.goalTileLabel}>{t(requirement.labelKey)}</Text>
      <Text style={[styles.goalTileValue, requirement.complete && { color: accent }]}>{requirement.current}/{requirement.required}</Text>
    </View>
  );
}

function CollectionSpecimen({
  compact,
  tablet,
  item,
  mastery,
  tr
}: {
  compact: boolean;
  tablet: boolean;
  item: BugDexInventoryItem;
  mastery?: BugMastery;
  tr: (text: string, params?: Record<string, string | number>) => string;
}) {
  const entry = entryByBugId(item.bugId);
  const color = entry ? rarityColors[entry.rarity] ?? "#e8ca68" : "#e8ca68";
  return (
    <View style={[styles.collectionItem, compact && styles.collectionItemCompact, tablet && { minHeight: 150, padding: 9 }, { borderColor: `${color}99` }]}>
      <SpecimenFrame rarity={entry?.rarity ?? "Gewoon"} style={styles.collectionArt}>
        <BugArtImage bugId={item.bugId} size={compact ? 56 : tablet ? 88 : 68} />
      </SpecimenFrame>
      <Text numberOfLines={1} style={[styles.collectionName, tablet && { fontSize: 10 }]}>{entry ? tr(entry.name) : item.bugId}</Text>
      <View style={styles.collectionMetaRow}>
        {entry ? <RarityMarks compact rarity={entry.rarity} /> : <Text numberOfLines={1} style={[styles.collectionRarity, { color }]}>{item.rarity}</Text>}
        <Text style={[styles.collectionLevel, { backgroundColor: color }]}>LV.{mastery?.level ?? 1}</Text>
      </View>
      {item.count > 1 ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>×{item.count}</Text></View> : null}
    </View>
  );
}

function StatePanel({
  kind,
  label,
  actionLabel,
  onAction
}: {
  kind: "loading" | "error";
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.statePanel}>
      {kind === "loading" ? <ActivityIndicator color="#e8ca68" size="large" /> : <LockedBugSilhouette size={82} />}
      <Text style={styles.stateLabel}>{label}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} style={styles.retryButton}><Text style={styles.retryText}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

function sortDisplayItems(items: BugDexInventoryItem[], masteryByBugId: Map<string, BugMastery>): BugDexInventoryItem[] {
  return [...items].sort((first, second) => {
    const masteryDifference = (masteryByBugId.get(second.bugId)?.level ?? 1) - (masteryByBugId.get(first.bugId)?.level ?? 1);
    if (masteryDifference !== 0) return masteryDifference;
    return rarityValue(second) - rarityValue(first) || second.lastUnlockedAt.localeCompare(first.lastUnlockedAt);
  });
}

function rarityValue(item: BugDexInventoryItem): number {
  const rarity = entryByBugId(item.bugId)?.rarity ?? item.rarity;
  return ["Gewoon", "Zeldzaam", "Episch", "Legendarisch", "Mythisch"].indexOf(rarity);
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#101027", flex: 1, minHeight: 0 },
  shellScroll: { flex: 1, minHeight: 0, width: "100%" },
  shell: { alignSelf: "center", flexGrow: 1, paddingBottom: 88, width: "100%" },
  compactHeader: { alignItems: "center", backgroundColor: "#171735", borderBottomColor: "rgba(242,197,101,0.34)", borderBottomWidth: 1, flexDirection: "row", gap: 8, minHeight: 58, paddingVertical: 7 },
  backButton: { alignItems: "center", backgroundColor: "#fff8e7", borderColor: "#e4c967", borderRadius: 13, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  backText: { color: "#292450", fontSize: 31, lineHeight: 31, marginTop: -2 },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { color: "#e8ca68", fontSize: 7, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#fff9df", fontSize: 20, fontWeight: "900", marginTop: 1 },
  headerStats: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(242,197,101,0.38)", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  headerStatIcon: { color: "#e8ca68", fontSize: 14 },
  headerStatValue: { color: "#fff", fontSize: 10, fontWeight: "900" },
  headerStatDivider: { color: "#72897b", fontSize: 10 },
  roomPickerButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(242,197,101,0.35)", borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, minHeight: 44, minWidth: 0, paddingHorizontal: 9, paddingVertical: 4 },
  roomPickerCopy: { flex: 1, minWidth: 0 },
  roomPickerKicker: { color: "#a8a3c8", fontSize: 7, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  roomPickerTitle: { color: "#fff8df", fontSize: 12, fontWeight: "900", marginTop: 1 },
  roomPickerChevron: { color: "#f1d77d", fontSize: 20, fontWeight: "900", lineHeight: 20, marginTop: -4 },
  compactStats: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(242,197,101,0.35)", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 4, minHeight: 44, paddingHorizontal: 8 },
  roomPickerDropdown: { backgroundColor: "rgba(18,18,46,0.98)", borderBottomColor: "rgba(242,197,101,0.45)", borderBottomWidth: 1, elevation: 12, left: 0, paddingVertical: 8, position: "absolute", right: 0, top: 58, zIndex: 30 },
  roomPickerGrid: { alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  roomButton: { alignItems: "center", backgroundColor: "#2d2855", borderColor: "rgba(255,255,255,0.14)", borderRadius: 14, borderWidth: 1, height: 68, justifyContent: "center", overflow: "hidden", paddingBottom: 11, paddingTop: 5, position: "relative", width: 86 },
  roomButtonLabel: { color: "#e7e3f3", fontSize: 7, fontWeight: "900", marginTop: -1, maxWidth: 72, textAlign: "center" },
  roomStageBadge: { alignItems: "center", backgroundColor: "rgba(3,16,10,0.86)", borderRadius: 99, borderWidth: 1, height: 19, justifyContent: "center", position: "absolute", right: 4, top: 4, width: 19 },
  roomStageIcon: { fontSize: 9, fontWeight: "900" },
  roomProgressTrack: { backgroundColor: "rgba(255,255,255,0.13)", bottom: 4, borderRadius: 99, height: 4, left: 6, overflow: "hidden", position: "absolute", right: 6 },
  roomProgressFill: { borderRadius: 99, height: "100%" },
  tabs: { backgroundColor: "#15152f", borderBottomColor: "rgba(242,197,101,0.24)", borderBottomWidth: 1, flexDirection: "row", gap: 4, padding: 5 },
  tab: { alignItems: "center", borderRadius: 11, flex: 1, justifyContent: "center", minHeight: 38 },
  tabActive: { backgroundColor: "#e7c96a" },
  tabText: { color: "#bebad5", fontSize: 10, fontWeight: "900" },
  tabTextActive: { color: "#292450" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  slotGuide: { alignSelf: "center", backgroundColor: "rgba(8,26,17,0.92)", borderColor: "rgba(231,201,106,0.55)", borderRadius: 14, borderWidth: 1, marginTop: 10, maxWidth: 440, paddingHorizontal: 13, paddingVertical: 11, width: "100%" },
  slotGuideTitle: { color: "#fff5c9", fontSize: 11, fontWeight: "900", textAlign: "center" },
  slotGuideIntro: { color: "#e8dfbf", fontSize: 9, fontWeight: "800", lineHeight: 13, marginTop: 5, textAlign: "center" },
  slotGuideRow: { alignItems: "flex-start", flexDirection: "row", gap: 7, marginTop: 7 },
  slotGuideIcon: { color: "#e7c96a", fontSize: 12, fontWeight: "900", lineHeight: 14 },
  slotGuideText: { color: "#ffffff", flex: 1, fontSize: 9, fontWeight: "800", lineHeight: 13 },
  slotGuideHint: { color: "#b9c9bf", fontSize: 8, fontWeight: "700", lineHeight: 12, marginTop: 8, textAlign: "center" },
  slotGuideDone: { color: "#a9efad", fontSize: 9, fontWeight: "900", lineHeight: 13, marginTop: 5, textAlign: "center" },
  editExhibitsButton: { alignItems: "center", alignSelf: "center", backgroundColor: "#e7c96a", borderRadius: 13, justifyContent: "center", marginTop: 9, minHeight: 44, paddingHorizontal: 18 },
  editExhibitsButtonText: { color: "#292450", fontSize: 9, fontWeight: "900" },
  researchFocusButton: { alignSelf: "center", backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, borderWidth: 1, marginTop: 8, maxWidth: 360, paddingHorizontal: 14, paddingVertical: 9, width: "100%" },
  researchFocusButtonActive: { backgroundColor: "rgba(231,201,106,0.18)", borderColor: "#e7c96a" },
  researchFocusButtonText: { color: "#ffffff", fontSize: 9, fontWeight: "900", textAlign: "center" },
  researchFocusButtonTextActive: { color: "#f1d36b" },
  researchFocusHint: { color: "#c4d3c9", fontSize: 7.5, fontWeight: "700", lineHeight: 11, marginTop: 2, textAlign: "center" },
  placementError: { color: "#ffb0a6", fontSize: 8, fontWeight: "800", marginTop: 6, textAlign: "center" },
  editorBackdrop: { alignItems: "center", backgroundColor: "rgba(5,6,20,0.78)", flex: 1, justifyContent: "center", paddingVertical: 24 },
  editorModalScroll: { maxHeight: "92%", maxWidth: 620, width: "100%" },
  editorModalContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 8, width: "100%" },
  panelWrap: { flexGrow: 1, width: "100%" },
  panel: { minHeight: 560, overflow: "hidden", padding: 12 },
  panelImage: { opacity: 0.9 },
  panelTint: { ...StyleSheet.absoluteFillObject },
  panelVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,11,7,0.22)", borderColor: "rgba(255,255,255,0.05)", borderWidth: 1 },
  lightBeam: { backgroundColor: "#fff2b6", height: 680, position: "absolute", right: 90, top: -160, width: 90 },
  roomPanelShell: { width: "100%" },
  roomPanel: { width: "100%", zIndex: 2 },
  goalsPanel: { width: "100%", zIndex: 2 },
  collectionPanel: { width: "100%", zIndex: 2 },
  panelHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  panelHeaderCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  panelEyebrow: { fontSize: 7, fontWeight: "900", letterSpacing: 1.3 },
  panelTitle: { color: "#fffdf2", fontSize: 22, fontWeight: "900", marginTop: 1 },
  stageBadge: { alignItems: "center", backgroundColor: "rgba(3,18,11,0.82)", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  stageBadgeIcon: { fontSize: 13, fontWeight: "900" },
  stageBadgeText: { color: "#fff", fontSize: 7, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  stageRail: { flexDirection: "row", gap: 5, marginTop: 7 },
  stageSegmentHit: { flex: 1, justifyContent: "center", minHeight: 48, paddingVertical: 17 },
  stageSegment: { backgroundColor: "rgba(255,255,255,0.13)", borderColor: "rgba(255,255,255,0.28)", borderRadius: 99, borderWidth: 1, height: 12, width: "100%" },
  stageSegmentSelected: { borderColor: "#ffffff", borderWidth: 2, transform: [{ scaleY: 1.08 }] },
  specimenStage: { alignItems: "flex-end", flexDirection: "row", justifyContent: "center", minHeight: 210, paddingBottom: 4 },
  specimenStageCompact: { minHeight: 174 },
  sideSpecimen: { alignItems: "center", backgroundColor: "rgba(4,22,14,0.62)", borderColor: "rgba(255,255,255,0.17)", borderRadius: 16, borderWidth: 1, height: 105, justifyContent: "center", marginBottom: 22, width: "27%" },
  mainSpecimen: { alignItems: "center", justifyContent: "flex-end", minHeight: 205, position: "relative", width: "46%", zIndex: 3 },
  mainGlow: { borderRadius: 999, height: 140, opacity: 0.18, position: "absolute", top: 10, width: 140 },
  pedestalTop: { borderRadius: 99, height: 7, marginTop: -3, opacity: 0.9, width: "78%" },
  pedestalBody: { alignItems: "center", backgroundColor: "rgba(2,15,9,0.94)", borderBottomLeftRadius: 14, borderBottomRightRadius: 14, minHeight: 53, paddingHorizontal: 7, paddingTop: 7, width: "70%" },
  pedestalName: { color: "#fff7d6", fontSize: 9, fontWeight: "900", textAlign: "center", width: "100%" },
  pedestalLevel: { fontSize: 8, fontWeight: "900", marginTop: 3 },
  nextGoalCard: { backgroundColor: "rgba(3,18,11,0.9)", borderColor: "rgba(255,255,255,0.15)", borderRadius: 16, borderWidth: 1, padding: 10 },
  nextGoalTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  nextGoalLabel: { color: "#fff6d1", fontSize: 9, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  nextGoalPercent: { fontSize: 14, fontWeight: "900" },
  nextGoalLine: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 7 },
  nextGoalIcon: { fontSize: 17, fontWeight: "900", width: 20 },
  nextGoalText: { color: "#d6e3da", flex: 1, fontSize: 9, fontWeight: "800" },
  nextGoalValue: { color: "#fff", fontSize: 10, fontWeight: "900" },
  masterSealRow: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 8 },
  masterText: { color: "#fff1b1", fontSize: 11, fontWeight: "900", textAlign: "center" },
  bigProgressTrack: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, height: 6, marginTop: 8, overflow: "hidden" },
  bigProgressFill: { borderRadius: 99, height: "100%" },
  goalStageCard: { backgroundColor: "rgba(3,18,11,0.88)", borderColor: "rgba(255,255,255,0.14)", borderRadius: 16, borderWidth: 1, marginTop: 10, padding: 10 },
  goalStageTitle: { color: "#fff6cf", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textAlign: "center", textTransform: "uppercase" },
  stageLadder: { flexDirection: "row", gap: 6, marginTop: 10 },
  stageLadderItem: { alignItems: "center", flex: 1, minWidth: 0 },
  stageLadderIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 99, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  stageLadderIconText: { color: "#9dafaa", fontSize: 15, fontWeight: "900" },
  stageLadderIconTextReached: { color: "#102018" },
  stageLadderLabel: { color: "#92a89b", fontSize: 6, fontWeight: "900", marginTop: 4, textAlign: "center", textTransform: "uppercase" },
  requirementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 10 },
  goalTile: { alignItems: "center", backgroundColor: "rgba(3,18,11,0.84)", borderColor: "rgba(255,255,255,0.14)", borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 112, padding: 10, width: "48.6%" },
  goalTileIconWrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.09)", borderRadius: 99, height: 34, justifyContent: "center", width: 34 },
  goalTileIcon: { color: "#d7e0da", fontSize: 17, fontWeight: "900" },
  goalTileIconComplete: { color: "#102018" },
  goalTileLabel: { color: "#d4e0d8", fontSize: 8, fontWeight: "900", marginTop: 7, textAlign: "center", textTransform: "uppercase" },
  goalTileValue: { color: "#fff", fontSize: 13, fontWeight: "900", marginTop: 4 },
  masterPanel: { alignItems: "center", backgroundColor: "rgba(3,18,11,0.86)", borderColor: "rgba(242,207,104,0.45)", borderRadius: 18, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 210, width: "100%" },
  masterPanelIcon: { fontSize: 50 },
  masterPanelTitle: { color: "#fff5c9", fontSize: 12, fontWeight: "900", marginTop: 6 },
  collectionTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  collectionTitle: { color: "#fffdf2", fontSize: 19, fontWeight: "900", marginTop: 1 },
  pageLabel: { backgroundColor: "rgba(3,18,11,0.8)", borderRadius: 99, color: "#fff5cf", fontSize: 8, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  collectionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "space-between", marginTop: 8 },
  collectionItem: { backgroundColor: "rgba(251,249,235,0.96)", borderRadius: 13, borderWidth: 1, minHeight: 118, padding: 6, position: "relative", width: "31.7%" },
  collectionItemCompact: { minHeight: 105 },
  collectionArt: { alignItems: "center", backgroundColor: "rgba(226,235,226,0.9)", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 58 },
  collectionName: { color: "#214735", fontSize: 7.5, fontWeight: "900", marginTop: 5 },
  collectionMetaRow: { alignItems: "center", flexDirection: "row", gap: 3, justifyContent: "space-between", marginTop: 3 },
  collectionRarity: { flex: 1, fontSize: 6.5, fontWeight: "900" },
  collectionLevel: { borderRadius: 99, color: "#102018", fontSize: 6.5, fontWeight: "900", overflow: "hidden", paddingHorizontal: 4, paddingVertical: 2 },
  countBadge: { backgroundColor: "#173d2e", borderRadius: 99, paddingHorizontal: 5, paddingVertical: 2, position: "absolute", right: 4, top: 4 },
  countBadgeText: { color: "#fff6cf", fontSize: 6.5, fontWeight: "900" },
  emptyCollection: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 9, justifyContent: "center", minHeight: 260, paddingVertical: 18 },
  emptyJar: { alignItems: "center", backgroundColor: "rgba(240,245,234,0.88)", borderRadius: 16, height: 105, justifyContent: "center", width: "29%" },
  emptyCollectionText: { color: "#fff7d4", fontSize: 10, fontWeight: "900", textAlign: "center", width: "100%" },
  pagination: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  pageButton: { alignItems: "center", backgroundColor: "#e7c96a", borderRadius: 12, height: 36, justifyContent: "center", width: 42 },
  pageButtonDisabled: { opacity: 0.28 },
  pageButtonText: { color: "#173126", fontSize: 25, fontWeight: "900", lineHeight: 25 },
  pageDots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center" },
  pageDot: { backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 99, height: 6, width: 6 },
  statePanel: { alignItems: "center", backgroundColor: "#0b281d", justifyContent: "center", minHeight: 560, padding: 20 },
  stateIcon: { color: "#e8ca68", fontSize: 35, fontWeight: "900" },
  stateLabel: { color: "#d9e5dd", fontSize: 11, fontWeight: "800", marginTop: 10, textAlign: "center" },
  retryButton: { backgroundColor: "#e7c96a", borderRadius: 12, marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: "#173126", fontSize: 9, fontWeight: "900" }
});
