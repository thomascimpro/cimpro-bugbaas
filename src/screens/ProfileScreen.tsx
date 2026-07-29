import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugArtImage } from "../components/BugArtImage";
import { GameUiIcon } from "../components/ui/GameUiIcon";
import { DisplayNameModal } from "../components/DisplayNameModal";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { getBadgeArtSource } from "../services/badgeArt";
import { listBugs } from "../services/bugService";
import { entryByBugId, listBugDexInventory, listBugDexUnlocks } from "../services/bugDexService";
import { bugDexSetBadgeBugIds, bugDexSetById } from "../services/bugDexSetService";
import { listBugMastery, normalizeBugMastery } from "../services/bugMasteryService";
import { bugSquadBonusForEntry, BugSquadBonusCategory, maxActiveBugSquadSize, sanitizeActiveBugSquad } from "../services/bugSquadService";
import { bugDexEntryName, rarityLabel, useI18n } from "../services/i18n";
import { presenceLabel } from "../services/presenceService";
import {
  acceptOrganizationInvite,
  cancelOrganizationInvite,
  createOrganizationInviteForUser,
  defaultOrganizationId,
  declineOrganizationInvite,
  getOrganizationById,
  getOrganizationForUser,
  isOrganizationAdmin,
  isPublicOrganization,
  deleteOrganization,
  listIncomingOrganizationInvites,
  listOrganizationMembers,
  listOrganizationInvites,
  organizationIdsForUser,
  organizationIdForUser,
  organizationNamesForUser,
  organizationNameForUser,
  removeOrganizationMember,
  updateOrganizationName
} from "../services/organizationService";
import { BadgeDefinition, badgeDefinitions, BugDexEntry, BugDexRarity, bugDexEntries, getTierForPoints, userTiers } from "../services/pointsService";
import { bestUnlockedCharacterId, CharacterId, CharacterUnlockContext, characterOptions, isCharacterUnlocked, safeCharacterId } from "../services/characterService";
import { getUserById, listUsersLight, upvotePointValue } from "../services/userService";
import { BugDexInventoryItem, BugDexUnlock, BugMastery, BugReport, Organization, OrganizationInvite, User } from "../types";
import { useResponsiveLayout } from "../theme/useResponsiveLayout";
import { sharedStyles } from "./sharedStyles";

const bugDexCollectionImage = require("../../assets/generated/bugdex-collection-view-hd.jpg");
const profileIdentityArt = require("../../assets/new/ChatGPT Image 25 jul 2026, 20_59_14 (5).webp");

type CharacterFilter = "unlocked" | "points" | "badges";

type Props = {
  user: User;
  isOwnProfile?: boolean;
  onBack: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenReports?: () => void;
  onUpdateCharacter?: (characterId: CharacterId, context?: CharacterUnlockContext) => Promise<void>;
  onUpdateDisplayName?: (displayName: string) => Promise<void>;
  onCreateOrganization?: (organizationName: string) => Promise<void>;
  onUserUpdated?: (user: User) => void;
  onSelectBug?: (bug: BugReport) => void;
  onChallengeDuel?: (opponent: User) => void;
};

const bugSmashDuelImage = require("../../assets/generated/bug-smash-duel-concept.jpg");

export function ProfileScreen({ user, isOwnProfile = true, onBack, onLogout, onOpenReports, onOpenSettings, onUpdateCharacter, onUpdateDisplayName, onCreateOrganization, onUserUpdated, onSelectBug, onChallengeDuel }: Props) {
  const { t, tr } = useI18n();
  const layout = useResponsiveLayout();
  const heroReveal = useRef(new Animated.Value(0)).current;
  const tier = getTierForPoints(user.totalPoints);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [characterBusy, setCharacterBusy] = useState("");
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [characterFilter, setCharacterFilter] = useState<CharacterFilter>("unlocked");
  const [badgeInfoVisible, setBadgeInfoVisible] = useState(false);
  const [rankInfoVisible, setRankInfoVisible] = useState(false);
  const [bugDexVisible, setBugDexVisible] = useState(false);
  const [organizationWorkspaceOpen, setOrganizationWorkspaceOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationRenameName, setOrganizationRenameName] = useState("");
  const [organizationBusy, setOrganizationBusy] = useState(false);
  const [organizationError, setOrganizationError] = useState("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<User[]>([]);
  const [organizationInvites, setOrganizationInvites] = useState<OrganizationInvite[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<OrganizationInvite[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<User[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizationIdsForUser(user)[0] ?? defaultOrganizationId);
  const [organizationMembersOpen, setOrganizationMembersOpen] = useState(true);
  const [inviteUserPickerOpen, setInviteUserPickerOpen] = useState(false);
  const [selectedInviteUserId, setSelectedInviteUserId] = useState("");
  const [inviteBusy, setInviteBusy] = useState("");
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [organizationActionBusy, setOrganizationActionBusy] = useState("");
  const [organizationUser, setOrganizationUser] = useState(user);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [loadingBugDex, setLoadingBugDex] = useState(true);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const [unlockHistory, setUnlockHistory] = useState<BugDexUnlock[]>([]);
  const [masteryByBugId, setMasteryByBugId] = useState<Record<string, BugMastery>>({});
  const userOrganizationIds = organizationIdsForUser(organizationUser);
  const userOrganizationNames = organizationNamesForUser(organizationUser);
  const currentOrganizationId = userOrganizationIds.includes(selectedOrganizationId) ? selectedOrganizationId : userOrganizationIds[0] ?? organizationIdForUser(organizationUser);
  const currentOrganizationName = organization?.id === currentOrganizationId ? organization.name : userOrganizationNames[currentOrganizationId] ?? organizationNameForUser(organizationUser);
  const isPublicUser = isPublicOrganization(currentOrganizationId);
  const canManageOrganization = isOwnProfile && isOrganizationAdmin(organizationUser, organization);
  const memberIds = new Set(organizationMembers.map((member) => member.uid));
  const openInviteUserIds = new Set(organizationInvites.map((invite) => invite.invitedUserId).filter((id): id is string => Boolean(id)));
  const inviteCandidates = organizationUsers
    .filter((candidate) => candidate.uid !== organizationUser.uid)
    .filter((candidate) => !memberIds.has(candidate.uid))
    .filter((candidate) => !openInviteUserIds.has(candidate.uid));
  const selectedInviteUser = inviteCandidates.find((candidate) => candidate.uid === selectedInviteUserId) ?? null;
  const ownedBugDexIds = new Set(inventory.filter((item) => item.count > 0).map((item) => item.bugId));
  const unlockedBugDexIds = new Set([...ownedBugDexIds, ...unlockHistory.map((item) => item.bugId)]);
  const unlockedBugDexEntries = [...unlockedBugDexIds].map(entryByBugId).filter((entry): entry is BugDexEntry => Boolean(entry));
  const unlockedBugDexStats = {
    count: unlockedBugDexIds.size,
    legendary: unlockedBugDexEntries.filter((entry) => entry.rarity === "Legendarisch").length,
    mythic: unlockedBugDexEntries.filter((entry) => entry.rarity === "Mythisch").length
  };
  const characterUnlockContext: CharacterUnlockContext = { unlockedBugDexIds, user };
  const selectedCharacterUnlockContext: CharacterUnlockContext = { allowUnknownSetBadges: loadingBugDex, unlockedBugDexIds: loadingBugDex ? undefined : unlockedBugDexIds, user };
  const storedCharacterId = safeCharacterId(user.characterId);
  const selectedCharacterId = isCharacterUnlocked(storedCharacterId, user.totalPoints, selectedCharacterUnlockContext) ? storedCharacterId : bestUnlockedCharacterId(user.totalPoints, characterUnlockContext);
  const selectedCharacter = characterOptions.find((item) => item.id === selectedCharacterId) ?? characterOptions[0];
  const currentTierIndex = Math.max(0, userTiers.findIndex((item) => item.title === tier.title));
  const nextTier = userTiers[currentTierIndex + 1] ?? null;
  const tierRange = nextTier ? Math.max(1, nextTier.minPoints - tier.minPoints) : 1;
  const tierProgress = nextTier ? Math.min(1, Math.max(0, (user.totalPoints - tier.minPoints) / tierRange)) : 1;
  const filteredCharacterOptions = characterOptions.filter((option) => {
    if (characterFilter === "points") return !option.unlockBadgeId;
    if (characterFilter === "badges") return Boolean(option.unlockBadgeId);
    return isCharacterUnlocked(option.id, user.totalPoints, characterUnlockContext);
  });
  const unlockedBadges = badgeDefinitions.filter((badge) => badgeUnlocked(user, badge, unlockedBugDexIds, unlockedBugDexStats));
  const bugDexItems = inventory
    .map((item) => {
      const entry = entryByBugId(item.bugId);
      const index = bugDexEntries.findIndex((bug) => bug.id === item.bugId);
      return entry ? { entry, index, item } : null;
    })
    .filter((item): item is { entry: BugDexEntry; index: number; item: BugDexInventoryItem } => Boolean(item))
    .sort((a, b) => a.index - b.index);
  const visibleBugDexCount = unlockedBugDexStats.count;
  const activeSquadIds = sanitizeActiveBugSquad(user.activeBugSquad);
  const activeSquadEntries = activeSquadIds
    .map((bugId) => entryByBugId(bugId))
    .filter((entry): entry is BugDexEntry => Boolean(entry));

  useEffect(() => {
    Animated.timing(heroReveal, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [heroReveal]);

  useEffect(() => {
    setLoadingBugs(true);
    listBugs()
      .then((items) => setBugs(items.filter((bug) => (bug.reportType ?? "bug") === "bug" && bug.reporterId === user.uid)))
      .finally(() => setLoadingBugs(false));
    setLoadingBugDex(true);
    Promise.all([listBugDexInventory(user), listBugDexUnlocks(user)])
      .then(([items, unlocks]) => {
        setInventory(items);
        setUnlockHistory(unlocks);
      })
      .finally(() => setLoadingBugDex(false));
    listBugMastery(user)
      .then((items) => setMasteryByBugId(Object.fromEntries(items.map((item) => [item.bugId, item]))))
      .catch(() => setMasteryByBugId({}));
  }, [user.uid]);

  useEffect(() => {
    setOrganizationUser(user);
  }, [user.uid, user.organizationId, user.organizationName, user.organizationIds?.join("|")]);

  useEffect(() => {
    if (!isOwnProfile) return;
    void loadOrganizationState();
  }, [currentOrganizationId, isOwnProfile, organizationUser.uid]);

  useEffect(() => {
    if (userOrganizationIds.includes(selectedOrganizationId)) return;
    setSelectedOrganizationId(userOrganizationIds[0] ?? defaultOrganizationId);
  }, [selectedOrganizationId, userOrganizationIds.join("|")]);

  async function loadOrganizationState() {
    setOrganizationLoading(true);
    try {
      const freshUser = isOwnProfile ? await getUserById(user.uid).catch(() => null) : null;
      const orgUser = freshUser ?? organizationUser;
      if (freshUser) {
        setOrganizationUser(freshUser);
        onUserUpdated?.(freshUser);
      }
      const orgIds = organizationIdsForUser(orgUser);
      const safeOrganizationId = orgIds.includes(selectedOrganizationId) ? selectedOrganizationId : orgIds[0] ?? organizationIdForUser(orgUser);
      const [organizationResult, incomingInviteResult] = await Promise.allSettled([
        isPublicOrganization(safeOrganizationId) ? getOrganizationForUser(orgUser) : getOrganizationById(safeOrganizationId, orgUser),
        listIncomingOrganizationInvites(orgUser)
      ]);
      const nextOrganization = organizationResult.status === "fulfilled" ? organizationResult.value : null;
      const nextIncomingInvites = incomingInviteResult.status === "fulfilled" ? incomingInviteResult.value : [];
      setOrganization(nextOrganization);
      setIncomingInvites(nextIncomingInvites);
      if (isPublicOrganization(safeOrganizationId)) {
        setOrganizationMembers([]);
        setOrganizationInvites([]);
        setOrganizationUsers([]);
        setOrganizationRenameName("");
        return;
      }
      const [membersResult, invitesResult, usersResult] = await Promise.allSettled([
        listOrganizationMembers(orgUser, safeOrganizationId),
        listOrganizationInvites(orgUser, safeOrganizationId),
        listUsersLight()
      ]);
      const nextMembers = membersResult.status === "fulfilled" ? membersResult.value : [];
      const nextInvites = invitesResult.status === "fulfilled" ? invitesResult.value : [];
      const nextUsers = usersResult.status === "fulfilled" ? usersResult.value : [];
      if (membersResult.status === "rejected") throw membersResult.reason;
      if (usersResult.status === "rejected") throw usersResult.reason;
      setOrganizationMembers(nextMembers);
      setOrganizationInvites(nextInvites);
      setOrganizationUsers(nextUsers);
      setOrganizationRenameName(nextOrganization?.name ?? userOrganizationNames[safeOrganizationId] ?? safeOrganizationId);
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationLoadFailed"));
    } finally {
      setOrganizationLoading(false);
    }
  }

  function squadBonusLabel(category: BugSquadBonusCategory): string {
    return t(`bugdex.squadBonus.${category}`);
  }

  function squadBonusValue(category: BugSquadBonusCategory, value: number): string {
    return `+${Math.round(value * 100)}%`;
  }

  async function submitOrganization() {
    if (!onCreateOrganization) return;
    setOrganizationBusy(true);
    setOrganizationError("");
    try {
      await onCreateOrganization(organizationName);
      setOrganizationName("");
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationCreateFailed"));
    } finally {
      setOrganizationBusy(false);
    }
  }

  async function submitInvite() {
    const inviteUser = selectedInviteUser;
    if (!inviteUser) return;
    setInviteBusy("invite");
    setOrganizationError("");
    try {
      await createOrganizationInviteForUser(organizationUser, inviteUser, currentOrganizationId);
      setSelectedInviteUserId("");
      setInviteUserPickerOpen(false);
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationInviteFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  async function acceptInvite(invite: OrganizationInvite) {
    setInviteBusy(invite.id);
    setOrganizationError("");
    try {
      const updated = await acceptOrganizationInvite(organizationUser, invite);
      onUserUpdated?.(updated);
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationAcceptFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  async function declineInvite(invite: OrganizationInvite) {
    setInviteBusy(invite.id);
    setOrganizationError("");
    try {
      await declineOrganizationInvite(organizationUser, invite);
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationDeclineFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  async function cancelInvite(invite: OrganizationInvite) {
    setInviteBusy(invite.id);
    setOrganizationError("");
    try {
      await cancelOrganizationInvite(invite);
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationCancelFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  async function removeMember(member: User) {
    setInviteBusy(member.uid);
    setOrganizationError("");
    try {
      await removeOrganizationMember(organizationUser, member, currentOrganizationId);
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationRemoveFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  async function submitOrganizationRename() {
    if (!organization || isPublicUser) return;
    setOrganizationActionBusy("rename");
    setOrganizationError("");
    try {
      const updated = await updateOrganizationName(organizationUser, currentOrganizationId, organizationRenameName);
      setOrganization(updated);
      setOrganizationUser({
        ...organizationUser,
        ...(organizationIdForUser(organizationUser) === currentOrganizationId ? { organizationName: updated.name } : {}),
        organizationNames: { ...organizationNamesForUser(organizationUser), [currentOrganizationId]: updated.name }
      });
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationUpdateFailed"));
    } finally {
      setOrganizationActionBusy("");
    }
  }

  function confirmDeleteOrganization() {
    if (!organization || isPublicUser) return;
    Alert.alert(
      t("profile.organizationDeleteConfirmTitle"),
      t("profile.organizationDeleteConfirmBody", { name: organization.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("profile.organizationDelete"), style: "destructive", onPress: () => void submitDeleteOrganization() }
      ]
    );
  }

  async function submitDeleteOrganization() {
    if (!organization || isPublicUser) return;
    setOrganizationActionBusy("delete");
    setOrganizationError("");
    try {
      const updated = await deleteOrganization(organizationUser, currentOrganizationId);
      setOrganization(null);
      setOrganizationUser(updated);
      onUserUpdated?.(updated);
      setSelectedOrganizationId(organizationIdsForUser(updated)[0] ?? defaultOrganizationId);
      setOrganizationMembers([]);
      setOrganizationInvites([]);
      setOrganizationUsers([]);
      setIncomingInvites([]);
      setOrganizationRenameName("");
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationDeleteFailed"));
    } finally {
      setOrganizationActionBusy("");
    }
  }

  const renderBadge = (badge: BadgeDefinition) => {
    const unlocked = badgeUnlocked(user, badge, unlockedBugDexIds, unlockedBugDexStats);
    const badgeArt = getBadgeArtSource(badge.id);
    return (
      <View key={badge.id} style={[styles.badge, !unlocked && styles.badgeLocked]}>
        {badgeArt ? (
          <Image source={badgeArt} style={[styles.badgeImage, !unlocked && styles.badgeImageLocked]} />
        ) : (
          <BugArtImage bugId="lieveheersbeestje" size={42} />
        )}
        <View style={styles.badgeTextBlock}>
          <Text style={[styles.badgeText, !unlocked && styles.badgeTextLocked]} numberOfLines={1}>{tr(badge.name)}</Text>
          <Text style={styles.badgeRequirement} numberOfLines={2}>
            {unlocked ? t("profile.badgeUnlocked") : t("profile.badgeLocked")} - {badgeRequirementText(badge, t)}
          </Text>
          <Text style={styles.badgeRequirement} numberOfLines={2}>{t(badge.descriptionKey)}</Text>
        </View>
      </View>
    );
  };
  const pendingInvite = incomingInvites[0] ?? null;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: layout.contentMaxWidth,
          paddingBottom: isOwnProfile
            ? layout.bottomNavHeight + layout.bottomNavInset + 48
            : 160,
          paddingHorizontal: layout.gutter
        },
        layout.isTablet && styles.contentWide
      ]}
      style={[sharedStyles.screen, styles.screen]}
      showsVerticalScrollIndicator={false}
    >
      <Modal animationType="fade" transparent visible={Boolean(isOwnProfile && pendingInvite)}>
        <View style={styles.inviteModalBackdrop}>
          {pendingInvite && (
            <View style={styles.inviteModalCard}>
              <Text style={styles.inviteModalKicker}>{t("profile.organizationIncoming")}</Text>
              <Text style={styles.inviteModalTitle}>{pendingInvite.organizationName}</Text>
              <Text style={styles.inviteModalBody}>{t("profile.organizationInvitePopupBody", { name: pendingInvite.invitedByName })}</Text>
              <View style={styles.inviteModalActions}>
                <Pressable style={[styles.smallDangerButton, styles.inviteModalButton]} disabled={Boolean(inviteBusy)} onPress={() => declineInvite(pendingInvite)}>
                  <Text style={styles.smallDangerText}>{inviteBusy === pendingInvite.id ? "..." : t("profile.organizationDecline")}</Text>
                </Pressable>
                <Pressable style={[styles.smallActionButton, styles.inviteModalButton]} disabled={Boolean(inviteBusy)} onPress={() => acceptInvite(pendingInvite)}>
                  <Text style={styles.smallActionText}>{inviteBusy === pendingInvite.id ? "..." : t("profile.organizationAccept")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
      <Animated.View
        style={[
          styles.hero,
          layout.isTablet && styles.heroWide,
          {
            opacity: heroReveal,
            transform: [{
              translateY: heroReveal.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0]
              })
            }]
          }
        ]}
      >
        <Image accessibilityIgnoresInvertColors resizeMode="contain" source={profileIdentityArt} style={styles.profileIdentityArt} />
        <Animated.View
          style={[
            styles.heroArt,
            layout.isTablet && styles.heroArtWide,
            {
              transform: [{
                translateY: heroReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0]
                })
              }]
            }
          ]}
        >
          {isOwnProfile && onUpdateCharacter ? (
            <Pressable
              accessibilityLabel={t("profile.changeCharacter")}
              accessibilityRole="button"
              onPress={() => setCharacterPickerOpen(true)}
            >
              <CharacterAvatarImage characterId={selectedCharacterId} variant="hero" size={154} />
            </Pressable>
          ) : (
            <CharacterAvatarImage characterId={selectedCharacterId} variant="hero" size={154} />
          )}
        </Animated.View>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>{isOwnProfile ? t("profile.own") : t("profile.colleague")}</Text>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          <View style={styles.titleBadge}>
            <Text style={styles.titleBadgeText} numberOfLines={1}>{tr(user.title)}</Text>
          </View>
          <Text style={styles.tierName} numberOfLines={1}>{tr(tier.title)}</Text>
          <View style={styles.rankTrack}>
            <View style={[styles.rankFill, { backgroundColor: tier.color, width: `${Math.round(tierProgress * 100)}%` }]} />
          </View>
          <Text style={styles.rankMeta} numberOfLines={1}>
            {nextTier ? t("profile.rankProgress", { current: user.totalPoints, next: nextTier.minPoints }) : t("profile.rankComplete")}
          </Text>
        </View>
      </Animated.View>

      <View style={[styles.stats, layout.isTablet && styles.statsWide]}>
        <Pressable
          accessibilityLabel={t("profile.viewRank")}
          accessibilityRole="button"
          style={[styles.stat, styles.statPoints]}
          onPress={() => setRankInfoVisible(true)}
        >
          <Text style={styles.value}>{user.totalPoints}</Text>
          <Text style={styles.label}>{t("profile.points")}</Text>
        </Pressable>
        <View style={[styles.stat, styles.statReports]}>
          <Text style={styles.value}>{user.bugCount}</Text>
          <Text style={styles.label}>{t("home.bugs")}</Text>
        </View>
        <View style={[styles.stat, styles.statCollection]}>
          <Text style={styles.value}>{visibleBugDexCount}/{bugDexEntries.length}</Text>
          <Text style={styles.label}>BugDex</Text>
        </View>
      </View>

      {isOwnProfile && (
        <View style={styles.primaryActions}>
          {onUpdateCharacter && (
            <Pressable style={styles.primaryAction} onPress={() => setCharacterPickerOpen(true)}>
              <GameUiIcon name="profile" size={25} />
              <Text style={styles.primaryActionText}>{t("profile.customize")}</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryAction} onPress={() => setBadgeInfoVisible(true)}>
            <GameUiIcon name="badge" size={25} />
            <Text style={styles.secondaryActionText}>{t("profile.badges")}</Text>
          </Pressable>
        </View>
      )}

      {isOwnProfile && (
        <View style={styles.profileNav}>
          <Pressable style={styles.profileNavRow} onPress={() => setOrganizationWorkspaceOpen(true)}>
            <View style={styles.profileNavIcon}><GameUiIcon name="profile" size={28} /></View>
            <View style={styles.profileNavText}>
              <Text style={styles.profileNavTitle}>{t("profile.organization")}</Text>
              <Text style={styles.profileNavMeta} numberOfLines={1}>{isPublicUser ? t("profile.organizationPublic") : currentOrganizationName}</Text>
            </View>
            <GameUiIcon name="next" size={22} />
          </Pressable>
          {onOpenSettings && (
            <Pressable style={styles.profileNavRow} onPress={onOpenSettings}>
              <View style={styles.profileNavIcon}><GameUiIcon name="settings" size={28} /></View>
              <View style={styles.profileNavText}>
                <Text style={styles.profileNavTitle}>{t("profile.settings")}</Text>
                <Text style={styles.profileNavMeta}>{t("profile.settingsMeta")}</Text>
              </View>
              <GameUiIcon name="next" size={22} />
            </Pressable>
          )}
          {onOpenReports && (
            <Pressable style={styles.profileNavRow} onPress={onOpenReports}>
              <View style={styles.profileNavIcon}><GameUiIcon name="report" size={28} /></View>
              <View style={styles.profileNavText}>
                <Text style={styles.profileNavTitle}>{t("home.reportTitle")}</Text>
                <Text style={styles.profileNavMeta}>{t("home.reportBody")}</Text>
              </View>
              <GameUiIcon name="next" size={22} />
            </Pressable>
          )}
          {onUpdateDisplayName && (
            <Pressable style={styles.profileNavRow} onPress={() => setEditNameVisible(true)}>
              <View style={styles.profileNavIcon}><GameUiIcon name="profile" size={28} /></View>
              <View style={styles.profileNavText}>
                <Text style={styles.profileNavTitle}>{t("profile.account")}</Text>
                <Text style={styles.profileNavMeta} numberOfLines={1}>{user.email}</Text>
              </View>
              <GameUiIcon name="next" size={22} />
            </Pressable>
          )}
          {onLogout && (
            <Pressable style={styles.profileNavRow} onPress={onLogout}>
              <View style={styles.profileNavIcon}><GameUiIcon name="back" size={24} /></View>
              <View style={styles.profileNavText}>
                <Text style={[styles.profileNavTitle, styles.profileNavDanger]}>{t("profile.logout")}</Text>
                <Text style={styles.profileNavMeta}>{t("profile.account")}</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      <Modal animationType="slide" visible={isOwnProfile && organizationWorkspaceOpen} onRequestClose={() => setOrganizationWorkspaceOpen(false)}>
        <View style={styles.organizationWorkspace}>
          <View style={styles.organizationWorkspaceHeader}>
            <View>
              <Text style={styles.organizationWorkspaceKicker}>BUGBAAS SOCIAL</Text>
              <Text style={styles.organizationWorkspaceTitle}>{t("profile.organization")}</Text>
            </View>
            <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" onPress={() => setOrganizationWorkspaceOpen(false)} style={styles.organizationWorkspaceClose}>
              <Text style={styles.organizationWorkspaceCloseText}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={[styles.organizationWorkspaceContent, { paddingHorizontal: layout.gutter }]} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
          <Text style={styles.organizationCurrent}>
            {t("profile.organizationCurrent", { name: isPublicUser ? t("profile.organizationPublic") : currentOrganizationName })}
          </Text>
          <Text style={styles.organizationHelp}>{t("profile.organizationIntro")}</Text>
          {userOrganizationIds.length > 0 && (
            <>
            <Text style={styles.organizationSectionTitle}>{t("profile.organizationExisting")}</Text>
            <View style={styles.organizationPicker}>
              {userOrganizationIds.map((orgId) => (
                <Pressable
                  key={orgId}
                  style={[styles.organizationPickerOption, orgId === currentOrganizationId && styles.organizationPickerOptionActive]}
                  onPress={() => setSelectedOrganizationId(orgId)}
                >
                  <Text style={[styles.organizationPickerText, orgId === currentOrganizationId && styles.organizationPickerTextActive]} numberOfLines={1}>
                    {userOrganizationNames[orgId] ?? orgId}
                  </Text>
                </Pressable>
              ))}
            </View>
            </>
          )}
          {organizationLoading && <ActivityIndicator color="#15724f" />}
          {incomingInvites.length > 0 && (
            <View style={styles.organizationSection}>
              <Text style={styles.organizationSectionTitle}>{t("profile.organizationIncoming")}</Text>
              {incomingInvites.map((invite) => (
                <View key={invite.id} style={styles.organizationListItem}>
                  <View style={styles.organizationListText}>
                    <Text style={styles.organizationListTitle} numberOfLines={1}>{invite.organizationName}</Text>
                    <Text style={styles.organizationListMeta} numberOfLines={1}>{t("profile.organizationInvitedBy", { name: invite.invitedByName })}</Text>
                  </View>
                  <Pressable style={styles.smallDangerButton} disabled={Boolean(inviteBusy)} onPress={() => declineInvite(invite)}>
                    <Text style={styles.smallDangerText}>{inviteBusy === invite.id ? "..." : t("profile.organizationDecline")}</Text>
                  </Pressable>
                  <Pressable style={styles.smallActionButton} disabled={Boolean(inviteBusy)} onPress={() => acceptInvite(invite)}>
                    <Text style={styles.smallActionText}>{inviteBusy === invite.id ? "..." : t("profile.organizationAccept")}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {onCreateOrganization && (
            <View style={styles.organizationForm}>
              <Text style={styles.organizationSectionTitle}>{t("profile.organizationCreateTitle")}</Text>
              <TextInput
                autoCapitalize="words"
                placeholder={t("profile.organizationNamePlaceholder")}
                placeholderTextColor="#77847f"
                style={styles.organizationInput}
                value={organizationName}
                onChangeText={setOrganizationName}
              />
              <Pressable style={[sharedStyles.button, organizationBusy && styles.disabledButton]} disabled={organizationBusy} onPress={submitOrganization}>
                {organizationBusy ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("profile.createOrganization")}</Text>}
              </Pressable>
            </View>
          )}
          {!isPublicUser && (
            <>
              <Text style={styles.organizationHelp}>{t("profile.organizationHelp")}</Text>
              {canManageOrganization && (
                <View style={styles.organizationForm}>
                  <Text style={styles.organizationSectionTitle}>{t("profile.organizationManageTitle")}</Text>
                  <TextInput
                    autoCapitalize="words"
                    placeholder={t("profile.organizationNamePlaceholder")}
                    placeholderTextColor="#77847f"
                    style={styles.organizationInput}
                    value={organizationRenameName}
                    onChangeText={setOrganizationRenameName}
                  />
                  <View style={styles.organizationActionRow}>
                    <Pressable
                      style={[styles.smallActionButton, styles.organizationActionButton, organizationActionBusy === "rename" && styles.disabledButton]}
                      disabled={Boolean(organizationActionBusy)}
                      onPress={submitOrganizationRename}
                    >
                      <Text style={styles.smallActionText}>{organizationActionBusy === "rename" ? "..." : t("profile.organizationRename")}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.smallDangerButton, styles.organizationActionButton, organizationActionBusy === "delete" && styles.disabledButton]}
                      disabled={Boolean(organizationActionBusy)}
                      onPress={confirmDeleteOrganization}
                    >
                      <Text style={styles.smallDangerText}>{organizationActionBusy === "delete" ? "..." : t("profile.organizationDelete")}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <View style={styles.organizationSection}>
                <Pressable style={styles.organizationDropdownHeader} onPress={() => setOrganizationMembersOpen((current) => !current)}>
                  <View style={styles.organizationListText}>
                    <Text style={styles.organizationSectionTitle}>{t("profile.organizationManageMembers")}</Text>
                    <Text style={styles.organizationListMeta}>{t("profile.organizationMembersCount", { count: organizationMembers.length })}</Text>
                  </View>
                  <Text style={styles.organizationDropdownAction}>{organizationMembersOpen ? t("common.close") : t("common.open")}</Text>
                </Pressable>
                {organizationMembersOpen && (
                  <>
                    {canManageOrganization && (
                      <View style={styles.organizationForm}>
                        <Text style={styles.organizationHelp}>{t("profile.organizationManageMembersHelp")}</Text>
                        <Pressable style={styles.organizationDropdownHeader} onPress={() => setInviteUserPickerOpen((current) => !current)}>
                          <View style={styles.organizationListText}>
                            <Text style={styles.organizationListTitle} numberOfLines={1}>{selectedInviteUser?.displayName ?? t("profile.organizationInviteSelect")}</Text>
                            <Text style={styles.organizationListMeta} numberOfLines={1}>{selectedInviteUser ? t("profile.organizationInviteSelected") : t("profile.organizationInviteSelectMeta")}</Text>
                          </View>
                          <Text style={styles.organizationDropdownAction}>{inviteUserPickerOpen ? t("common.close") : t("common.open")}</Text>
                        </Pressable>
                        {inviteUserPickerOpen && (
                          <View style={styles.organizationUserPicker}>
                            {inviteCandidates.length ? inviteCandidates.map((candidate) => {
                              const selected = selectedInviteUser?.uid === candidate.uid;
                              return (
                                <Pressable key={candidate.uid} style={[styles.organizationUserOption, selected && styles.organizationUserOptionActive]} onPress={() => setSelectedInviteUserId(candidate.uid)}>
                                  <Text style={[styles.organizationUserName, selected && styles.organizationUserNameActive]} numberOfLines={1}>{candidate.displayName}</Text>
                                  <Text style={[styles.organizationUserMeta, selected && styles.organizationUserNameActive]} numberOfLines={1}>{presenceLabel(candidate, t)}</Text>
                                </Pressable>
                              );
                            }) : (
                              <Text style={styles.organizationHelp}>{t("profile.organizationInviteNoUsers")}</Text>
                            )}
                          </View>
                        )}
                        <Pressable style={[sharedStyles.button, (inviteBusy === "invite" || !selectedInviteUser) && styles.disabledButton]} disabled={Boolean(inviteBusy) || !selectedInviteUser} onPress={submitInvite}>
                          {inviteBusy === "invite" ? <ActivityIndicator color="#ffffff" /> : <Text style={sharedStyles.buttonText}>{t("profile.organizationAddMember")}</Text>}
                        </Pressable>
                      </View>
                    )}
                    {organizationInvites.length > 0 && (
                      <View style={styles.organizationSection}>
                        <Text style={styles.organizationSectionTitle}>{t("profile.organizationOpenInvites")}</Text>
                        {organizationInvites.map((invite) => (
                          <View key={invite.id} style={styles.organizationListItem}>
                            <View style={styles.organizationListText}>
                              <Text style={styles.organizationListTitle} numberOfLines={1}>{invite.invitedUserName || invite.invitedEmail}</Text>
                              <Text style={styles.organizationListMeta} numberOfLines={1}>{t("profile.organizationInviteOpen")}</Text>
                            </View>
                            {canManageOrganization && (
                              <Pressable style={styles.smallDangerButton} disabled={Boolean(inviteBusy)} onPress={() => cancelInvite(invite)}>
                                <Text style={styles.smallDangerText}>{inviteBusy === invite.id ? "..." : t("common.cancel")}</Text>
                              </Pressable>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    <Text style={styles.organizationSectionTitle}>{t("profile.organizationMembers")}</Text>
                    {canManageOrganization && <Text style={styles.organizationHelp}>{t("profile.organizationRemoveHelp")}</Text>}
                    {organizationMembers.map((member) => (
                      <View key={member.uid} style={styles.organizationListItem}>
                    <View style={styles.organizationListText}>
                      <Text style={styles.organizationListTitle} numberOfLines={1}>{member.displayName}</Text>
                      <Text style={styles.organizationListMeta} numberOfLines={1}>{member.email || t("profile.organizationMember")}</Text>
                    </View>
                    {canManageOrganization && member.uid !== organizationUser.uid && (
                      <Pressable style={styles.smallDangerButton} disabled={Boolean(inviteBusy)} onPress={() => removeMember(member)}>
                        <Text style={styles.smallDangerText}>{inviteBusy === member.uid ? "..." : t("profile.organizationRemove")}</Text>
                      </Pressable>
                    )}
                  </View>
                    ))}
                  </>
                )}
              </View>
            </>
          )}
          {!!organizationError && <Text style={sharedStyles.error}>{tr(organizationError)}</Text>}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {!isOwnProfile && onChallengeDuel && (
        <View style={styles.card}>
          <Pressable style={styles.duelFeatureButton} onPress={() => onChallengeDuel(user)}>
            <Image accessibilityIgnoresInvertColors resizeMode="cover" source={bugSmashDuelImage} style={styles.duelFeatureImage} />
            <View style={styles.duelFeatureOverlay}>
              <View style={styles.bugDexHeaderText}>
                <Text style={styles.bugDexFeatureTitle}>{t("profile.challengeDuel")}</Text>
                <Text style={styles.bugDexFeatureIntro}>{t("profile.challengeDuelBody")}</Text>
              </View>
              <View style={styles.bugDexOpenButton}>
                <Text style={styles.bugDexOpenButtonText}>{t("profile.challengeDuelAction")}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {!isOwnProfile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("bugdex.activeSquad")}</Text>
          <Text style={styles.activeSquadMeta}>{t("bugdex.activeSquadMeta", { count: activeSquadEntries.length, max: maxActiveBugSquadSize })}</Text>
          <View style={styles.profileSquadGrid}>
            {activeSquadEntries.length ? activeSquadEntries.map((entry) => {
              const color = rarityColor(entry.rarity);
              const mastery = masteryByBugId[entry.id] ?? normalizeBugMastery(entry.id);
              return (
                <View key={entry.id} style={[styles.profileSquadCard, { borderColor: color, backgroundColor: `${color}14` }]}>
                  <BugArtImage bugId={entry.id} size={58} />
                  <Text style={styles.profileSquadName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                  <View style={styles.profileSquadRarityRow}>
                    <Text style={[styles.profileSquadRarity, { color }]} numberOfLines={1}>{rarityLabel(entry.rarity, t)}</Text>
                    <View style={styles.profileSquadStars}>{rarityStars(entry.rarity).map((_, index) => <Text key={index} style={[styles.profileSquadStar, { color }]}>★</Text>)}</View>
                  </View>
                  <Text style={[styles.profileSquadLevel, { color }]}>{t("bugdex.mastery.levelShort", { level: mastery.level })}</Text>
                </View>
              );
            }) : <Text style={styles.emptyText}>{t("profile.noBugDex")}</Text>}
          </View>
        </View>
      )}

      {!isOwnProfile && <View style={styles.card}>
        <Pressable style={styles.bugDexFeatureButton} onPress={() => setBugDexVisible(true)}>
          <Image accessibilityIgnoresInvertColors resizeMode="cover" source={bugDexCollectionImage} style={styles.bugDexFeatureImage} />
          <View style={styles.bugDexFeatureOverlay}>
            <View style={styles.bugDexHeaderText}>
              <Text style={styles.bugDexFeatureTitle}>{t("profile.bugdexCollection")}</Text>
              <Text style={styles.bugDexFeatureMeta}>
                {loadingBugDex ? "..." : bugDexItems.length ? `${bugDexItems.length}/${bugDexEntries.length}` : t("profile.noBugDex")}
              </Text>
              <Text style={styles.bugDexFeatureIntro}>{t("profile.bugdexReadOnly")}</Text>
            </View>
            <View style={styles.bugDexOpenButton}>
              <Text style={styles.bugDexOpenButtonText}>{t("profile.viewBugDex")}</Text>
            </View>
          </View>
        </Pressable>
      </View>}


      {!isOwnProfile && <View style={styles.card}>
        <View style={styles.badgeHeader}>
          <View style={styles.badgeHeaderText}>
            <Text style={styles.cardTitle}>{t("profile.badges")}</Text>
            <Text style={styles.badgeIntro}>{t("profile.badgesIntro")}</Text>
          </View>
          <Pressable style={styles.badgeInfoButton} onPress={() => setBadgeInfoVisible(true)}>
            <Text style={styles.badgeInfoButtonText}>{t("profile.showAllBadges")}</Text>
          </Pressable>
        </View>
        <View style={styles.badges}>
          {unlockedBadges.length ? unlockedBadges.map(renderBadge) : <Text style={styles.emptyText}>{t("profile.noBadges")}</Text>}
        </View>
      </View>}

      {!isOwnProfile && <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("home.bugs")}</Text>
        {loadingBugs ? <ActivityIndicator /> : (
          <View style={styles.bugList}>
            {bugs.length ? bugs.map((bug) => (
              <Pressable key={bug.id} style={styles.bugItem} onPress={() => onSelectBug?.(bug)}>
                <View style={styles.bugText}>
                  <Text style={styles.bugTitle} numberOfLines={1}>{bug.title}</Text>
                  <Text style={styles.bugMeta} numberOfLines={1}>{t("profile.bugMeta", { points: bug.points, upvotes: bug.upvoteCount ?? 0 })}</Text>
                  <Text style={styles.bugBonus}>{t("profile.upvoteBonus", { points: upvotePointValue })}</Text>
                </View>
                <View style={styles.bugBadges}>
                  <SeverityBadge severity={bug.severity} />
                  <StatusBadge status={bug.status} />
                </View>
              </Pressable>
            )) : <Text style={styles.emptyText}>{t("profile.noBugs")}</Text>}
          </View>
        )}
      </View>}

      {!isOwnProfile && <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
      </Pressable>}
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
      <Modal animationType="slide" visible={characterPickerOpen} onRequestClose={() => setCharacterPickerOpen(false)}>
        <View style={styles.characterPickerScreen}>
          <View style={styles.characterPickerTopBar}>
            <View>
              <Text style={styles.characterPickerKicker}>{t("profile.customize")}</Text>
              <Text style={styles.characterPickerTitle}>{t("profile.chooseCharacter")}</Text>
            </View>
            <Pressable style={styles.characterPickerClose} onPress={() => setCharacterPickerOpen(false)}>
              <Text style={styles.characterPickerCloseText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.characterPreview}>
            <CharacterAvatarImage characterId={selectedCharacterId} variant="hero" size={176} selected />
            <Text style={styles.characterPreviewName}>{selectedCharacter.label}</Text>
            <Text style={styles.characterPreviewMeta}>{tr(tier.title)}</Text>
          </View>
          <View style={styles.characterFilters}>
            {(["unlocked", "points", "badges"] as CharacterFilter[]).map((filter) => (
              <Pressable key={filter} style={[styles.characterFilter, characterFilter === filter && styles.characterFilterActive]} onPress={() => setCharacterFilter(filter)}>
                <Text style={[styles.characterFilterText, characterFilter === filter && styles.characterFilterTextActive]}>{t(`profile.characterFilter.${filter}`)}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.characterPickerGrid} showsVerticalScrollIndicator={false}>
            {filteredCharacterOptions.map((option) => {
              const selected = option.id === selectedCharacterId;
              const unlocked = isCharacterUnlocked(option.id, user.totalPoints, characterUnlockContext);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.characterPickerOption, !unlocked && styles.characterOptionLocked, selected && { borderColor: option.accent, backgroundColor: "#fff9df" }]}
                  disabled={Boolean(characterBusy) || !unlocked || !onUpdateCharacter}
                  onPress={async () => {
                    if (!onUpdateCharacter) return;
                    setCharacterBusy(option.id);
                    try {
                      await onUpdateCharacter(option.id, characterUnlockContext);
                      setCharacterPickerOpen(false);
                    } finally {
                      setCharacterBusy("");
                    }
                  }}
                >
                  <CharacterAvatarImage characterId={option.id} selected={selected} locked={!unlocked} size={92} />
                  <Text style={styles.characterName} numberOfLines={2}>{characterBusy === option.id ? "..." : option.label}</Text>
                  <Text style={styles.characterLockText} numberOfLines={2}>
                    {unlocked ? (selected ? t("profile.characterSelected") : t("profile.characterReady")) : option.unlockLabel ?? t("profile.characterUnlock", { points: option.unlockPoints })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
      <Modal transparent animationType="fade" visible={rankInfoVisible} onRequestClose={() => setRankInfoVisible(false)}>
        <View style={styles.badgeModalBackdrop}>
          <View style={styles.badgeModalCard}>
            <Text style={styles.badgeModalTitle}>{t("profile.rankOverview")}</Text>
            <Text style={styles.badgeModalIntro}>{user.totalPoints} {t("profile.points")} · {tr(tier.title)}</Text>
            <ScrollView style={styles.badgeModalList} showsVerticalScrollIndicator={false}>
              {userTiers.map((rank) => {
                const active = rank.title === tier.title;
                const unlocked = user.totalPoints >= rank.minPoints;
                return (
                  <View key={rank.title} style={[styles.rankOverviewRow, active && styles.rankOverviewRowActive]}>
                    <View style={[styles.rankOverviewDot, { backgroundColor: rank.color }]} />
                    <View style={styles.rankOverviewText}>
                      <Text style={styles.rankOverviewTitle}>{tr(rank.title)}</Text>
                      <Text style={styles.rankOverviewMeta}>{rank.minPoints} {t("profile.points")}</Text>
                    </View>
                    <Text style={styles.rankOverviewStatus}>{active ? t("profile.currentRank") : unlocked ? "✓" : "🔒"}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable style={styles.badgeModalButton} onPress={() => setRankInfoVisible(false)}>
              <Text style={styles.badgeModalButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="fade" visible={badgeInfoVisible} onRequestClose={() => setBadgeInfoVisible(false)}>
        <View style={styles.badgeModalBackdrop}>
          <View style={styles.badgeModalCard}>
            <Text style={styles.badgeModalTitle}>{t("profile.badgeOverview")}</Text>
            <Text style={styles.badgeModalIntro}>{t("profile.badgesIntro")}</Text>
            <ScrollView style={styles.badgeModalList} showsVerticalScrollIndicator={false}>
              <View style={styles.badges}>{badgeDefinitions.map(renderBadge)}</View>
            </ScrollView>
            <Pressable style={styles.badgeModalButton} onPress={() => setBadgeInfoVisible(false)}>
              <Text style={styles.badgeModalButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent animationType="fade" visible={bugDexVisible} onRequestClose={() => setBugDexVisible(false)}>
        <View style={styles.bugDexModalBackdrop}>
          <View style={styles.bugDexModalCard}>
            <Text style={styles.bugDexModalTitle}>{t("profile.bugdexOf", { name: user.displayName })}</Text>
            <Text style={styles.bugDexModalIntro}>{t("profile.bugdexReadOnly")}</Text>
            <ScrollView style={styles.bugDexModalList} showsVerticalScrollIndicator={false}>
              {loadingBugDex ? <ActivityIndicator /> : (
                <View style={styles.bugDexGrid}>
                  {bugDexItems.length ? bugDexItems.map(({ entry, index, item }) => {
                    const bonus = bugSquadBonusForEntry(entry);
                    const color = rarityColor(entry.rarity);
                    return (
                      <View key={entry.id} style={[styles.bugDexCard, { borderColor: color }]}>
                        <View style={styles.bugDexCardTop}>
                          <Text style={[styles.bugDexCardNumber, { backgroundColor: color }]}>{String(index + 1).padStart(2, "0")}</Text>
                          <Text style={[styles.bugDexCardRarity, { color }]} numberOfLines={1}>{rarityLabel(entry.rarity, t)}</Text>
                        </View>
                        <View style={styles.bugDexImageWrap}>
                          <BugArtImage bugId={entry.id} size={72} />
                        </View>
                        <Text style={styles.bugDexName} numberOfLines={1}>{bugDexEntryName(entry, t)}</Text>
                        <Text style={styles.bugDexOwned}>{t("profile.bugdexOwned", { count: item.count })}</Text>
                        <Text style={styles.bugDexBuff} numberOfLines={2}>
                          {squadBonusLabel(bonus.category)} {squadBonusValue(bonus.category, bonus.value)}
                        </Text>
                      </View>
                    );
                  }) : <Text style={styles.emptyText}>{t("profile.noBugDex")}</Text>}
                </View>
              )}
            </ScrollView>
            <Pressable style={styles.bugDexModalButton} onPress={() => setBugDexVisible(false)}>
              <Text style={styles.bugDexModalButtonText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function rarityColor(rarity: BugDexRarity): string {
  const colors: Record<BugDexRarity, string> = {
    Gewoon: "#2f9e44",
    Zeldzaam: "#228be6",
    Episch: "#9c36b5",
    Legendarisch: "#f59f00",
    Mythisch: "#ef4444"
  };
  return colors[rarity];
}

function rarityStars(rarity: BugDexRarity): number[] {
  const counts: Record<BugDexRarity, number> = {
    Gewoon: 1,
    Zeldzaam: 2,
    Episch: 3,
    Legendarisch: 4,
    Mythisch: 5
  };
  return Array.from({ length: counts[rarity] });
}

function badgeUnlocked(
  user: User,
  badge: BadgeDefinition,
  unlockedBugDexIds: Set<string>,
  unlockedBugDexStats: { count: number; legendary: number; mythic: number }
): boolean {
  if (badge.bugDexSetId) {
    const set = bugDexSetById(badge.bugDexSetId);
    return Boolean(set && bugDexSetBadgeBugIds(set).every((bugId) => unlockedBugDexIds.has(bugId)));
  }
  return (badge.minBugReports === undefined || user.bugCount >= badge.minBugReports) &&
    (badge.minBugDexCaught === undefined || unlockedBugDexStats.count >= badge.minBugDexCaught) &&
    (badge.minComments === undefined || (user.commentPointCount ?? 0) >= badge.minComments) &&
    (badge.minLegendaryBugDex === undefined || unlockedBugDexStats.legendary >= badge.minLegendaryBugDex) &&
    (badge.minMovementKm === undefined || (user.movementKmTotal ?? 0) >= badge.minMovementKm) &&
    (badge.minMythicBugDex === undefined || unlockedBugDexStats.mythic >= badge.minMythicBugDex) &&
    (badge.minPoints === undefined || user.totalPoints >= badge.minPoints) &&
    (badge.minSplats === undefined || (user.splatCount ?? 0) >= badge.minSplats) &&
    (badge.minTradedBugDex === undefined || (user.tradedBugDexCount ?? 0) >= badge.minTradedBugDex) &&
    (badge.minUpgradedBugDex === undefined || (user.upgradedBugDexCount ?? 0) >= badge.minUpgradedBugDex) &&
    (badge.minUpvotesGiven === undefined || (user.upvoteGivenPointCount ?? 0) >= badge.minUpvotesGiven);
}

function badgeRequirementText(badge: BadgeDefinition, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (badge.bugDexSetId) {
    const set = bugDexSetById(badge.bugDexSetId);
    return t("profile.badgeNeedBugDexSet", { count: set ? bugDexSetBadgeBugIds(set).length : 0 });
  }
  if (badge.minBugReports !== undefined) return t("profile.badgeNeedBugs", { count: badge.minBugReports });
  if (badge.minBugDexCaught !== undefined) return t("profile.badgeNeedBugDex", { count: badge.minBugDexCaught });
  if (badge.minComments !== undefined) return t("profile.badgeNeedComments", { count: badge.minComments });
  if (badge.minLegendaryBugDex !== undefined) return t("profile.badgeNeedLegendary", { count: badge.minLegendaryBugDex });
  if (badge.minMovementKm !== undefined) return t("profile.badgeNeedKm", { count: badge.minMovementKm });
  if (badge.minMythicBugDex !== undefined) return t("profile.badgeNeedMythic", { count: badge.minMythicBugDex });
  if (badge.minPoints !== undefined) return t("profile.badgeNeedPoints", { count: badge.minPoints });
  if (badge.minSplats !== undefined) return t("profile.badgeNeedSplats", { count: badge.minSplats });
  if (badge.minTradedBugDex !== undefined) return t("profile.badgeNeedTrades", { count: badge.minTradedBugDex });
  if (badge.minUpgradedBugDex !== undefined) return t("profile.badgeNeedUpgrades", { count: badge.minUpgradedBugDex });
  if (badge.minUpvotesGiven !== undefined) return t("profile.badgeNeedUpvotes", { count: badge.minUpvotesGiven });
  return t("profile.badgeUnlocked");
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
    paddingBottom: 0
  },
  content: {
    paddingBottom: 160,
    paddingTop: 14,
    width: "100%"
  },
  contentWide: {
    alignSelf: "center",
    paddingTop: 20
  },
  hero: {
    alignItems: "center",
    backgroundColor: "#17233f",
    borderColor: "#e5ba58",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    minHeight: 190,
    overflow: "hidden",
    padding: 16
  },
  heroWide: {
    minHeight: 228,
    paddingHorizontal: 28
  },
  profileIdentityArt: {
    height: 190,
    opacity: 0.1,
    position: "absolute",
    right: -18,
    top: -8,
    width: 190
  },
  heroArt: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "flex-end",
    marginBottom: -16,
    marginLeft: -12,
    width: 146
  },
  heroArtWide: {
    marginLeft: 4,
    width: 190
  },
  heroText: {
    flex: 1,
    minWidth: 0
  },
  kicker: {
    color: "#ffcb67",
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
  titleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,203,103,0.14)",
    borderColor: "rgba(255,203,103,0.52)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  titleBadgeText: {
    color: "#ffe5a7",
    fontSize: 11,
    fontWeight: "900"
  },
  tierName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10
  },
  rankTrack: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    height: 9,
    marginTop: 6,
    overflow: "hidden",
    width: "100%"
  },
  rankFill: {
    borderRadius: 999,
    height: "100%"
  },
  rankMeta: {
    color: "#c9d9f4",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5
  },
  presence: {
    alignSelf: "flex-start",
    backgroundColor: "#d2a43b",
    borderRadius: 999,
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 7,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  nameButton: {
    alignSelf: "flex-start",
    backgroundColor: "#fffaf0",
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  nameButtonText: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  organizationCurrent: {
    color: "#31433a",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6
  },
  organizationPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  organizationPickerOption: {
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: "48%",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  organizationPickerOptionActive: {
    backgroundColor: "#15724f",
    borderColor: "#15724f"
  },
  organizationPickerText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  organizationPickerTextActive: {
    color: "#ffffff"
  },
  organizationForm: {
    gap: 8,
    marginTop: 10
  },
  organizationActionRow: {
    flexDirection: "row",
    gap: 8
  },
  organizationActionButton: {
    alignItems: "center",
    flex: 1
  },
  organizationSection: {
    gap: 8,
    marginTop: 12
  },
  organizationDropdownHeader: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10
  },
  organizationDropdownAction: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  organizationSectionTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  organizationListItem: {
    alignItems: "center",
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  organizationListText: {
    flex: 1
  },
  organizationListTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  organizationListMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  organizationInput: {
    backgroundColor: "#fdfefb",
    borderColor: "#c8d5ce",
    borderRadius: 8,
    borderWidth: 1,
    color: "#102018",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  organizationUserPicker: {
    backgroundColor: "#f7faf6",
    borderColor: "#d7e1d9",
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 8
  },
  organizationUserOption: {
    backgroundColor: "#fdfefb",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  organizationUserOptionActive: {
    backgroundColor: "#15724f",
    borderColor: "#15724f"
  },
  organizationUserName: {
    color: "#102018",
    fontSize: 13,
    fontWeight: "900"
  },
  organizationUserNameActive: {
    color: "#ffffff"
  },
  organizationUserMeta: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  organizationHelp: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8
  },
  smallActionButton: {
    backgroundColor: "#15724f",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  smallActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  smallDangerButton: {
    backgroundColor: "#fff5f2",
    borderColor: "#d8a29a",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  smallDangerText: {
    color: "#b83227",
    fontSize: 12,
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.65
  },
  inviteModalBackdrop: {
    backgroundColor: "rgba(16, 32, 24, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  inviteModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    padding: 16
  },
  inviteModalKicker: {
    color: "#15724f",
    fontSize: 12,
    fontWeight: "900"
  },
  inviteModalTitle: {
    color: "#102018",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },
  inviteModalBody: {
    color: "#53645d",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 8
  },
  inviteModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  inviteModalButton: {
    alignItems: "center",
    flex: 1
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  statsWide: {
    gap: 14
  },
  stat: {
    alignItems: "center",
    backgroundColor: "#fffaf2",
    borderColor: "#dfd4be",
    borderRadius: 20,
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
  statPoints: {
    borderTopColor: "#e29a3d",
    borderTopWidth: 4
  },
  statReports: {
    borderTopColor: "#5596d8",
    borderTopWidth: 4
  },
  statCollection: {
    borderTopColor: "#9b6bc2",
    borderTopWidth: 4
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
  primaryActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#d9683e",
    borderColor: "#f19a64",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14
  },
  primaryActionIcon: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: "#eef3ff",
    borderColor: "#8da9dd",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14
  },
  secondaryActionIcon: {
    color: "#7252a4",
    fontSize: 17,
    fontWeight: "900"
  },
  secondaryActionText: {
    color: "#3f3268",
    fontSize: 14,
    fontWeight: "900"
  },
  profileNav: {
    backgroundColor: "#f8f6ff",
    borderColor: "#d7d4e8",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden"
  },
  profileNavRow: {
    alignItems: "center",
    borderBottomColor: "#e4e1ef",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  profileNavIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 32
  },
  profileNavText: {
    flex: 1,
    minWidth: 0
  },
  profileNavTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  profileNavMeta: {
    color: "#65756e",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  profileNavChevron: {
    color: "#8a9891",
    fontSize: 24,
    fontWeight: "700"
  },
  profileNavDanger: {
    color: "#c75143"
  },
  organizationWorkspace: {
    backgroundColor: "#f3efe5",
    flex: 1
  },
  organizationWorkspaceHeader: {
    alignItems: "center",
    backgroundColor: "#171735",
    borderBottomColor: "#d7bd57",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  organizationWorkspaceKicker: {
    color: "#d7bd57",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1
  },
  organizationWorkspaceTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2
  },
  organizationWorkspaceClose: {
    alignItems: "center",
    backgroundColor: "#302b59",
    borderColor: "#665f9b",
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  organizationWorkspaceCloseText: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 28
  },
  organizationWorkspaceContent: {
    alignSelf: "center",
    maxWidth: 760,
    paddingBottom: 36,
    paddingTop: 14,
    width: "100%"
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
    backgroundColor: "#fffdf8",
    borderColor: "#dfd6c6",
    borderRadius: 20,
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
  activeSquadMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: -6
  },
  profileSquadGrid: {
    flexDirection: "row",
    gap: 8
  },
  profileSquadCard: {
    alignItems: "center",
    backgroundColor: "#f7faf6",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 9
  },
  profileSquadName: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5,
    maxWidth: "100%"
  },
  profileSquadRarityRow: {
    alignItems: "center",
    gap: 3,
    marginTop: 3,
    maxWidth: "100%"
  },
  profileSquadRarity: {
    fontSize: 9,
    fontWeight: "900",
    maxWidth: "100%"
  },
  profileSquadStars: {
    flexDirection: "row",
    gap: 1
  },
  profileSquadStar: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13
  },
  profileSquadLevel: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  bugDexFeatureButton: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 172,
    overflow: "hidden"
  },
  bugDexFeatureImage: {
    height: 172,
    width: "100%"
  },
  bugDexFeatureOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.76)",
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    left: 0,
    padding: 12,
    position: "absolute",
    right: 0
  },
  bugDexHeaderText: {
    flex: 1,
    minWidth: 0
  },
  bugDexFeatureTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900"
  },
  bugDexFeatureMeta: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  bugDexFeatureIntro: {
    color: "#dce9df",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3
  },
  bugDexOpenButton: {
    alignItems: "center",
    backgroundColor: "#d7bd57",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  bugDexOpenButtonText: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900"
  },
  duelFeatureButton: {
    backgroundColor: "#102018",
    borderColor: "#b83227",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 154,
    overflow: "hidden"
  },
  duelFeatureImage: {
    height: 154,
    width: "100%"
  },
  duelFeatureOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(16,32,24,0.78)",
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    left: 0,
    padding: 12,
    position: "absolute",
    right: 0
  },
  bugDexPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  bugDexPreviewItem: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 82,
    padding: 7,
    width: 64
  },
  bugDexNumber: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderRadius: 6,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  bugDexCount: {
    color: "#53645d",
    fontSize: 10,
    fontWeight: "900"
  },
  characterPickerScreen: {
    backgroundColor: "#f5f0e4",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  characterPickerTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  characterPickerKicker: {
    color: "#15724f",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  characterPickerTitle: {
    color: "#102018",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2
  },
  characterPickerClose: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  characterPickerCloseText: {
    color: "#102018",
    fontSize: 28,
    lineHeight: 30
  },
  characterPreview: {
    alignItems: "center",
    backgroundColor: "#143f36",
    borderColor: "#d2a43b",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 14,
    paddingBottom: 14,
    paddingTop: 4
  },
  characterPreviewName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4
  },
  characterPreviewMeta: {
    color: "#d7bd57",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2
  },
  characterFilters: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12
  },
  characterFilter: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  characterFilterActive: {
    backgroundColor: "#15724f",
    borderColor: "#15724f"
  },
  characterFilterText: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "900"
  },
  characterFilterTextActive: {
    color: "#ffffff"
  },
  characterPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 36
  },
  characterPickerOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7e1d9",
    borderRadius: 16,
    borderWidth: 2,
    minHeight: 146,
    padding: 10,
    width: "31%"
  },
  characterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  characterSubtitle: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800"
  },
  characterDropdown: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 11
  },
  characterDropdownOpen: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57"
  },
  characterDropdownText: {
    flex: 1,
    minWidth: 0
  },
  characterDropdownTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  characterDropdownTitleOpen: {
    color: "#ffffff"
  },
  characterDropdownMeta: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  characterDropdownMetaOpen: {
    color: "#dce9df"
  },
  characterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  characterOption: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    padding: 8,
    width: "31%"
  },
  characterOptionLocked: {
    opacity: 0.45
  },
  characterName: {
    color: "#102018",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
    marginTop: 6,
    minHeight: 26,
    textAlign: "center"
  },
  characterLockText: {
    color: "#53645d",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center"
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
    gap: 8
  },
  badgeIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  badgeHeader: {
    gap: 4,
    marginBottom: 10
  },
  badgeHeaderText: {
    minWidth: 0
  },
  badgeInfoButton: {
    alignSelf: "flex-start",
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  badgeInfoButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900"
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#eef4ed",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    padding: 9
  },
  badgeImage: {
    height: 48,
    width: 48
  },
  badgeImageLocked: {
    opacity: 0.48
  },
  badgeLocked: {
    opacity: 0.62
  },
  badgeTextBlock: {
    flex: 1,
    minWidth: 0
  },
  badgeText: {
    color: "#17211c",
    fontSize: 12,
    fontWeight: "900"
  },
  badgeTextLocked: {
    color: "#53645d"
  },
  badgeRequirement: {
    color: "#53645d",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2
  },
  badgeModalBackdrop: {
    backgroundColor: "rgba(16, 32, 24, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  badgeModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    maxHeight: "86%",
    padding: 14
  },
  badgeModalTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6
  },
  badgeModalIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  badgeModalList: {
    marginBottom: 12
  },
  badgeModalButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    paddingVertical: 11
  },
  badgeModalButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  rankOverviewRow: {
    alignItems: "center",
    borderBottomColor: "#dbe3dd",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  rankOverviewRowActive: {
    backgroundColor: "#fff4c7",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 1
  },
  rankOverviewDot: {
    borderRadius: 8,
    height: 16,
    width: 16
  },
  rankOverviewText: {
    flex: 1
  },
  rankOverviewTitle: {
    color: "#102018",
    fontSize: 14,
    fontWeight: "900"
  },
  rankOverviewMeta: {
    color: "#64736c",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  rankOverviewStatus: {
    color: "#7a5a00",
    fontSize: 12,
    fontWeight: "900"
  },
  bugDexModalBackdrop: {
    backgroundColor: "rgba(16, 32, 24, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 14
  },
  bugDexModalCard: {
    backgroundColor: "#fdfefb",
    borderColor: "#d7bd57",
    borderRadius: 8,
    borderWidth: 2,
    maxHeight: "88%",
    padding: 12
  },
  bugDexModalTitle: {
    color: "#102018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5
  },
  bugDexModalIntro: {
    color: "#53645d",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginBottom: 10
  },
  bugDexModalList: {
    marginBottom: 12
  },
  bugDexGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  bugDexCard: {
    backgroundColor: "#f7faf6",
    borderColor: "#c6d3cc",
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 172,
    padding: 8,
    width: "48%"
  },
  bugDexCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  bugDexCardNumber: {
    borderRadius: 6,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  bugDexCardRarity: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 5
  },
  bugDexImageWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 86
  },
  bugDexName: {
    color: "#102018",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
    textAlign: "center"
  },
  bugDexOwned: {
    color: "#53645d",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
    textAlign: "center"
  },
  bugDexBuff: {
    backgroundColor: "#eef4ed",
    borderRadius: 8,
    color: "#102018",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    textAlign: "center"
  },
  bugDexModalButton: {
    alignItems: "center",
    backgroundColor: "#102018",
    borderRadius: 8,
    paddingVertical: 11
  },
  bugDexModalButtonText: {
    color: "#ffffff",
    fontSize: 13,
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
