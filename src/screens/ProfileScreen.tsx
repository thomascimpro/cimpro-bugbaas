import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CharacterAvatarImage } from "../components/CharacterAvatarImage";
import { BugArtImage } from "../components/BugArtImage";
import { DisplayNameModal } from "../components/DisplayNameModal";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { TierBadge } from "../components/TierBadge";
import { getBadgeArtSource } from "../services/badgeArt";
import { listBugs } from "../services/bugService";
import { entryByBugId, listBugDexInventory } from "../services/bugDexService";
import { bugSquadBonusForEntry, BugSquadBonusCategory } from "../services/bugSquadService";
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
  listIncomingOrganizationInvites,
  listOrganizationMembers,
  listOrganizationInvites,
  organizationIdsForUser,
  organizationIdForUser,
  organizationNamesForUser,
  organizationNameForUser,
  removeOrganizationMember
} from "../services/organizationService";
import { BadgeDefinition, badgeDefinitions, BugDexEntry, BugDexRarity, bugDexEntries, getTierForPoints, userTiers } from "../services/pointsService";
import { bestUnlockedCharacterId, CharacterId, characterOptions, isCharacterUnlocked, safeCharacterId } from "../services/characterService";
import { listUsers, upvotePointValue } from "../services/userService";
import { BugDexInventoryItem, BugReport, Organization, OrganizationInvite, User } from "../types";
import { sharedStyles } from "./sharedStyles";

const bugDexCollectionImage = require("../../assets/generated/bugdex-collection-view-hd.jpg");

type Props = {
  user: User;
  isOwnProfile?: boolean;
  onBack: () => void;
  onLogout?: () => void;
  onUpdateCharacter?: (characterId: CharacterId) => Promise<void>;
  onUpdateDisplayName?: (displayName: string) => Promise<void>;
  onCreateOrganization?: (organizationName: string) => Promise<void>;
  onUserUpdated?: (user: User) => void;
  onSelectBug?: (bug: BugReport) => void;
  onChallengeDuel?: (opponent: User) => void;
};

const bugSmashDuelImage = require("../../assets/generated/bug-smash-duel-concept.jpg");

export function ProfileScreen({ user, isOwnProfile = true, onBack, onLogout, onUpdateCharacter, onUpdateDisplayName, onCreateOrganization, onUserUpdated, onSelectBug, onChallengeDuel }: Props) {
  const { t, tr } = useI18n();
  const tier = getTierForPoints(user.totalPoints);
  const userPresence = presenceLabel(user, t);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [characterBusy, setCharacterBusy] = useState("");
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [badgeInfoVisible, setBadgeInfoVisible] = useState(false);
  const [bugDexVisible, setBugDexVisible] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
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
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [loadingBugDex, setLoadingBugDex] = useState(true);
  const [inventory, setInventory] = useState<BugDexInventoryItem[]>([]);
  const storedCharacterId = safeCharacterId(user.characterId);
  const selectedCharacterId = isCharacterUnlocked(storedCharacterId, user.totalPoints) ? storedCharacterId : bestUnlockedCharacterId(user.totalPoints);
  const selectedCharacter = characterOptions.find((item) => item.id === selectedCharacterId) ?? characterOptions[0];
  const userOrganizationIds = organizationIdsForUser(user);
  const userOrganizationNames = organizationNamesForUser(user);
  const currentOrganizationId = userOrganizationIds.includes(selectedOrganizationId) ? selectedOrganizationId : userOrganizationIds[0] ?? organizationIdForUser(user);
  const currentOrganizationName = userOrganizationNames[currentOrganizationId] ?? organizationNameForUser(user);
  const isPublicUser = isPublicOrganization(currentOrganizationId);
  const canManageOrganization = isOwnProfile && isOrganizationAdmin(user, organization);
  const memberIds = new Set(organizationMembers.map((member) => member.uid));
  const openInviteUserIds = new Set(organizationInvites.map((invite) => invite.invitedUserId).filter((id): id is string => Boolean(id)));
  const inviteCandidates = organizationUsers
    .filter((candidate) => candidate.uid !== user.uid)
    .filter((candidate) => !memberIds.has(candidate.uid))
    .filter((candidate) => !openInviteUserIds.has(candidate.uid));
  const selectedInviteUser = inviteCandidates.find((candidate) => candidate.uid === selectedInviteUserId) ?? null;
  const unlockedBadges = badgeDefinitions.filter((badge) => badgeUnlocked(user, badge));
  const bugDexItems = inventory
    .map((item) => {
      const entry = entryByBugId(item.bugId);
      const index = bugDexEntries.findIndex((bug) => bug.id === item.bugId);
      return entry ? { entry, index, item } : null;
    })
    .filter((item): item is { entry: BugDexEntry; index: number; item: BugDexInventoryItem } => Boolean(item))
    .sort((a, b) => a.index - b.index);

  useEffect(() => {
    setLoadingBugs(true);
    listBugs()
      .then((items) => setBugs(items.filter((bug) => (bug.reportType ?? "bug") === "bug" && bug.reporterId === user.uid)))
      .finally(() => setLoadingBugs(false));
    setLoadingBugDex(true);
    listBugDexInventory(user)
      .then(setInventory)
      .finally(() => setLoadingBugDex(false));
  }, [user.uid]);

  useEffect(() => {
    if (!isOwnProfile) return;
    void loadOrganizationState();
  }, [currentOrganizationId, isOwnProfile, user.uid]);

  useEffect(() => {
    if (userOrganizationIds.includes(selectedOrganizationId)) return;
    setSelectedOrganizationId(userOrganizationIds[0] ?? defaultOrganizationId);
  }, [selectedOrganizationId, userOrganizationIds.join("|")]);

  async function loadOrganizationState() {
    setOrganizationLoading(true);
    try {
      const [nextOrganization, nextIncomingInvites] = await Promise.all([
        isPublicOrganization(currentOrganizationId) ? getOrganizationForUser(user) : getOrganizationById(currentOrganizationId, user),
        listIncomingOrganizationInvites(user)
      ]);
      setOrganization(nextOrganization);
      setIncomingInvites(nextIncomingInvites);
      if (isPublicOrganization(currentOrganizationId)) {
        setOrganizationMembers([]);
        setOrganizationInvites([]);
        setOrganizationUsers([]);
        return;
      }
      const [nextMembers, nextInvites, nextUsers] = await Promise.all([
        listOrganizationMembers(user, currentOrganizationId),
        listOrganizationInvites(user, currentOrganizationId),
        listUsers()
      ]);
      setOrganizationMembers(nextMembers);
      setOrganizationInvites(nextInvites);
      setOrganizationUsers(nextUsers);
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
      await createOrganizationInviteForUser(user, inviteUser, currentOrganizationId);
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
      const updated = await acceptOrganizationInvite(user, invite);
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
      await declineOrganizationInvite(user, invite);
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
      await removeOrganizationMember(user, member, currentOrganizationId);
      await loadOrganizationState();
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : t("profile.organizationRemoveFailed"));
    } finally {
      setInviteBusy("");
    }
  }

  const renderBadge = (badge: BadgeDefinition) => {
    const unlocked = badgeUnlocked(user, badge);
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
    <ScrollView contentContainerStyle={styles.content} style={sharedStyles.screen} showsVerticalScrollIndicator={false}>
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
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>{isOwnProfile ? t("profile.own") : t("profile.colleague")}</Text>
          <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
          {isOwnProfile && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
          <Text style={styles.presence} numberOfLines={1}>{userPresence}</Text>
          {isOwnProfile && onUpdateDisplayName && (
            <Pressable style={styles.nameButton} onPress={() => setEditNameVisible(true)}>
              <Text style={styles.nameButtonText}>{t("profile.changeName")}</Text>
            </Pressable>
          )}
        </View>
        <CharacterAvatarImage characterId={selectedCharacterId} size={112} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.totalPoints}</Text>
          <Text style={styles.label}>{t("profile.points")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugCount}</Text>
          <Text style={styles.label}>{t("home.bugs")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.value}>{user.bugDexCount ?? 0}/{bugDexEntries.length}</Text>
          <Text style={styles.label}>BugDex</Text>
        </View>
      </View>

      <TierBadge points={user.totalPoints} />

      {isOwnProfile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("profile.organization")}</Text>
          <Text style={styles.organizationCurrent}>
            {t("profile.organizationCurrent", { name: isPublicUser ? t("profile.organizationPublic") : currentOrganizationName })}
          </Text>
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
                    {canManageOrganization && member.uid !== user.uid && (
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
      )}

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

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <View style={styles.characterHeader}>
          <View>
            <Text style={styles.cardTitle}>{t("profile.character")}</Text>
            <Text style={styles.characterSubtitle}>{t("profile.characterSubtitle")}</Text>
          </View>
          <CharacterAvatarImage characterId={selectedCharacterId} size={74} />
        </View>
        {isOwnProfile && onUpdateCharacter ? (
          <>
            <Pressable style={[styles.characterDropdown, characterPickerOpen && styles.characterDropdownOpen]} onPress={() => setCharacterPickerOpen((current) => !current)}>
              <View style={styles.characterDropdownText}>
                <Text style={[styles.characterDropdownTitle, characterPickerOpen && styles.characterDropdownTitleOpen]}>{selectedCharacter.label}</Text>
                <Text style={[styles.characterDropdownMeta, characterPickerOpen && styles.characterDropdownMetaOpen]}>{t("profile.changeCharacter")}</Text>
              </View>
            </Pressable>
            {characterPickerOpen && (
              <View style={styles.characterGrid}>
                {characterOptions.map((option) => {
                  const selected = option.id === selectedCharacterId;
                  const unlocked = isCharacterUnlocked(option.id, user.totalPoints);
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.characterOption, !unlocked && styles.characterOptionLocked, selected && { borderColor: option.accent, backgroundColor: "#fff9df" }]}
                      disabled={Boolean(characterBusy) || !unlocked}
                      onPress={async () => {
                        setCharacterBusy(option.id);
                        try {
                          await onUpdateCharacter(option.id);
                        } finally {
                          setCharacterBusy("");
                        }
                      }}
                    >
                      <CharacterAvatarImage characterId={option.id} selected={selected} size={66} />
                      <Text style={styles.characterName} numberOfLines={2}>{characterBusy === option.id ? "..." : option.label}</Text>
                      {!unlocked && <Text style={styles.characterLockText} numberOfLines={1}>{t("profile.characterUnlock", { points: option.unlockPoints })}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.characterSubtitle}>{selectedCharacter.label}</Text>
        )}
      </View>

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
        <Text style={styles.cardTitle}>{t("profile.status")}</Text>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.title")}</Text>
          <Text style={styles.statusValue}>{tr(user.title)}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.tier")}</Text>
          <Text style={[styles.statusValue, { color: tier.color }]}>{tr(tier.title)}</Text>
        </View>
        <View style={styles.statusLine}>
          <Text style={styles.statusLabel}>{t("profile.splats")}</Text>
          <Text style={styles.statusValue}>{user.splatCount ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("home.bugs")}</Text>
        {loadingBugs ? <ActivityIndicator /> : (
          <View style={styles.bugList}>
            {bugs.length ? bugs.map((bug) => (
              <Pressable key={bug.id} style={styles.bugItem} onPress={() => onSelectBug?.(bug)}>
                <View style={styles.bugText}>
                  <Text style={styles.bugTitle} numberOfLines={1}>{bug.title}</Text>
                  <Text style={styles.bugMeta} numberOfLines={1}>{t("profile.bugMeta", { project: bug.project, points: bug.points, upvotes: bug.upvoteCount ?? 0 })}</Text>
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
      </View>

      {isOwnProfile && onLogout && (
        <Pressable style={sharedStyles.dangerButton} onPress={onLogout}>
          <Text style={sharedStyles.buttonText}>{t("profile.logout")}</Text>
        </Pressable>
      )}
      <Pressable style={sharedStyles.secondaryButton} onPress={onBack}>
        <Text style={sharedStyles.secondaryButtonText}>{t("common.back")}</Text>
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
    Gewoon: "#6f7f5f",
    Zeldzaam: "#15724f",
    Episch: "#356d7c",
    Legendarisch: "#b83227",
    Mythisch: "#7c3aed"
  };
  return colors[rarity];
}

function badgeUnlocked(user: User, badge: BadgeDefinition): boolean {
  return (badge.minBugReports === undefined || user.bugCount >= badge.minBugReports) &&
    (badge.minBugDexCaught === undefined || (user.bugDexCount ?? 0) >= badge.minBugDexCaught) &&
    (badge.minComments === undefined || (user.commentPointCount ?? 0) >= badge.minComments) &&
    (badge.minLegendaryBugDex === undefined || (user.legendaryBugDexCount ?? 0) >= badge.minLegendaryBugDex) &&
    (badge.minMovementKm === undefined || (user.movementKmTotal ?? 0) >= badge.minMovementKm) &&
    (badge.minMythicBugDex === undefined || (user.mythicBugDexCount ?? 0) >= badge.minMythicBugDex) &&
    (badge.minPoints === undefined || user.totalPoints >= badge.minPoints) &&
    (badge.minSplats === undefined || (user.splatCount ?? 0) >= badge.minSplats) &&
    (badge.minTradedBugDex === undefined || (user.tradedBugDexCount ?? 0) >= badge.minTradedBugDex) &&
    (badge.minUpgradedBugDex === undefined || (user.upgradedBugDexCount ?? 0) >= badge.minUpgradedBugDex) &&
    (badge.minUpvotesGiven === undefined || (user.upvoteGivenPointCount ?? 0) >= badge.minUpvotesGiven);
}

function badgeRequirementText(badge: BadgeDefinition, t: (key: string, params?: Record<string, string | number>) => string): string {
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
  presence: {
    alignSelf: "flex-start",
    backgroundColor: "#d7bd57",
    borderRadius: 8,
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
  bugDexFeatureButton: {
    backgroundColor: "#102018",
    borderColor: "#d7bd57",
    borderRadius: 8,
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
    borderRadius: 8,
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
