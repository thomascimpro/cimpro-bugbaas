import { arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { Organization, OrganizationInvite, OrganizationMember, User } from "../types";

export const defaultOrganizationId = "public";
export const defaultOrganizationName = "Public";
export const cimproOrganizationId = "cimpro";
export const cimproOrganizationName = "Cimpro";

export function organizationIdForUser(user?: Pick<User, "organizationId"> | null): string {
  return user?.organizationId || defaultOrganizationId;
}

export function organizationNameForUser(user?: Pick<User, "organizationName"> | null): string {
  return user?.organizationName || defaultOrganizationName;
}

export function organizationIdsForUser(user?: Pick<User, "organizationId" | "organizationIds"> | null): string[] {
  const ids = new Set((user?.organizationIds ?? []).filter((id) => !isPublicOrganization(id)));
  if (!isPublicOrganization(user?.organizationId)) ids.add(user?.organizationId as string);
  return Array.from(ids);
}

export function organizationNamesForUser(user?: Pick<User, "organizationId" | "organizationIds" | "organizationName" | "organizationNames"> | null): Record<string, string> {
  const names: Record<string, string> = { ...(user?.organizationNames ?? {}) };
  if (!isPublicOrganization(user?.organizationId)) names[user?.organizationId as string] = organizationNameForUser(user);
  for (const id of organizationIdsForUser(user)) {
    if (!names[id]) names[id] = id;
  }
  return names;
}

export function isPublicOrganization(organizationId?: string): boolean {
  return !organizationId || organizationId === defaultOrganizationId;
}

export function cleanOrganizationName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function organizationSlug(name: string): string {
  const normalized = cleanOrganizationName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || defaultOrganizationId;
}

export function cleanInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

function inviteMatchesUser(invite: OrganizationInvite, user: User): boolean {
  return invite.invitedUserId === user.uid || Boolean(invite.invitedEmail && invite.invitedEmail === cleanInviteEmail(user.email));
}

function isPermissionDeniedError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return code === "permission-denied" || message.includes("missing or insufficient permissions") || message.includes("permission-denied");
}

function fallbackOrganizationForMember(user: User, organizationId: string): Organization | null {
  if (!organizationIdsForUser(user).includes(organizationId)) return null;
  return {
    id: organizationId,
    name: organizationNamesForUser(user)[organizationId] ?? organizationId,
    createdBy: "",
    createdByName: "",
    createdAt: ""
  };
}

export function isOrganizationAdmin(user: User, organization: Organization | null): boolean {
  return Boolean(organization && organization.createdBy === user.uid);
}

export async function getOrganizationForUser(user: User): Promise<Organization | null> {
  const organizationId = organizationIdsForUser(user)[0] ?? organizationIdForUser(user);
  if (isPublicOrganization(organizationId)) return null;
  const organizationName = organizationNamesForUser(user)[organizationId] ?? organizationNameForUser(user);
  if (!isFirebaseConfigured) {
    return {
      id: organizationId,
      name: organizationName,
      createdBy: user.uid,
      createdByName: user.displayName,
      createdAt: new Date().toISOString()
    };
  }
  let snapshot;
  try {
    snapshot = await getDoc(doc(db, "organizations", organizationId));
  } catch (error) {
    if (isPermissionDeniedError(error)) return fallbackOrganizationForMember(user, organizationId);
    throw error;
  }
  return snapshot.exists() ? snapshot.data() as Organization : null;
}

export async function getOrganizationById(organizationId: string, user?: User): Promise<Organization | null> {
  if (isPublicOrganization(organizationId)) return null;
  const fallbackName = user ? organizationNamesForUser(user)[organizationId] : organizationId;
  if (!isFirebaseConfigured) {
    return user ? {
      id: organizationId,
      name: fallbackName,
      createdBy: user.uid,
      createdByName: user.displayName,
      createdAt: new Date().toISOString()
    } : null;
  }
  let snapshot;
  try {
    snapshot = await getDoc(doc(db, "organizations", organizationId));
  } catch (error) {
    if (isPermissionDeniedError(error) && user) return fallbackOrganizationForMember(user, organizationId);
    throw error;
  }
  return snapshot.exists() ? snapshot.data() as Organization : null;
}

function withOrganizationMembership(user: User, organizationId: string, organizationName: string): User {
  const organizationIds = organizationIdsForUser(user);
  const nextIds = organizationIds.includes(organizationId) ? organizationIds : [...organizationIds, organizationId];
  const organizationNames = { ...organizationNamesForUser(user), [organizationId]: organizationName };
  const shouldSetDefault = isPublicOrganization(user.organizationId);
  return {
    ...user,
    organizationId: shouldSetDefault ? organizationId : organizationIdForUser(user),
    organizationName: shouldSetDefault ? organizationName : organizationNameForUser(user),
    organizationIds: nextIds,
    organizationNames
  };
}

export async function createOrganizationInvite(user: User, email: string, organizationId?: string): Promise<OrganizationInvite> {
  const invitedEmail = cleanInviteEmail(email);
  if (!invitedEmail.includes("@")) throw new Error("Vul een geldig e-mailadres in.");
  const organization = organizationId ? await getOrganizationById(organizationId, user) : await getOrganizationForUser(user);
  if (!organization) throw new Error("Maak eerst een organisatie aan.");
  if (!isOrganizationAdmin(user, organization)) throw new Error("Alleen de organisatiebeheerder kan uitnodigen.");

  const now = new Date().toISOString();
  const baseInvite: OrganizationInvite = {
    id: `invite-${Date.now()}`,
    organizationId: organization.id,
    organizationName: organization.name,
    invitedEmail,
    invitedById: user.uid,
    invitedByName: user.displayName,
    status: "open",
    createdAt: now
  };

  if (!isFirebaseConfigured) return baseInvite;

  const duplicateSnapshot = await getDocs(query(
    collection(db, "organizationInvites"),
    where("organizationId", "==", organization.id),
    where("invitedEmail", "==", invitedEmail)
  ));
  const duplicate = duplicateSnapshot.docs
    .map((item) => item.data() as OrganizationInvite)
    .find((invite) => invite.organizationId === organization.id && invite.status === "open");
  if (duplicate) throw new Error("Deze gebruiker heeft al een open uitnodiging.");

  const ref = doc(collection(db, "organizationInvites"));
  const invite = { ...baseInvite, id: ref.id };
  await setDoc(ref, invite);
  return invite;
}

export async function createOrganizationInviteForUser(user: User, invitedUser: User, organizationId?: string): Promise<OrganizationInvite> {
  if (user.uid === invitedUser.uid) throw new Error("Je bent al lid van je eigen organisatie.");
  const organization = organizationId ? await getOrganizationById(organizationId, user) : await getOrganizationForUser(user);
  if (!organization) throw new Error("Maak eerst een organisatie aan.");
  if (!isOrganizationAdmin(user, organization)) throw new Error("Alleen de organisatiebeheerder kan uitnodigen.");
  if (organizationIdsForUser(invitedUser).includes(organization.id)) throw new Error("Deze gebruiker is al lid.");

  const invitedEmail = cleanInviteEmail(invitedUser.email);
  const now = new Date().toISOString();
  const baseInvite: OrganizationInvite = {
    id: `invite-${Date.now()}`,
    organizationId: organization.id,
    organizationName: organization.name,
    invitedEmail,
    invitedUserId: invitedUser.uid,
    invitedUserName: invitedUser.displayName,
    invitedById: user.uid,
    invitedByName: user.displayName,
    status: "open",
    createdAt: now
  };

  if (!isFirebaseConfigured) return baseInvite;

  try {
    const duplicateSnapshot = await getDocs(query(
      collection(db, "organizationInvites"),
      where("organizationId", "==", organization.id),
      where("invitedUserId", "==", invitedUser.uid)
    ));
    const duplicate = duplicateSnapshot.docs
      .map((item) => item.data() as OrganizationInvite)
      .find((invite) => invite.organizationId === organization.id && invite.status === "open");
    if (duplicate) throw new Error("Deze gebruiker heeft al een open uitnodiging.");
  } catch (error) {
    if (!isPermissionDeniedError(error)) throw error;
  }

  const ref = doc(collection(db, "organizationInvites"));
  const invite = { ...baseInvite, id: ref.id };
  await setDoc(ref, invite);
  return invite;
}

export async function listOrganizationInvites(user: User, organizationId?: string): Promise<OrganizationInvite[]> {
  const organization = organizationId ? await getOrganizationById(organizationId, user) : await getOrganizationForUser(user);
  if (!organization || !isOrganizationAdmin(user, organization) || !isFirebaseConfigured) return [];
  let snapshot;
  try {
    snapshot = await getDocs(query(collection(db, "organizationInvites"), where("organizationId", "==", organization.id)));
  } catch (error) {
    if (isPermissionDeniedError(error)) return [];
    throw error;
  }
  return snapshot.docs
    .map((item) => item.data() as OrganizationInvite)
    .filter((invite) => invite.status === "open")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function userFromOrganizationMember(member: OrganizationMember): User {
  return {
    uid: member.uid,
    displayName: member.displayName,
    email: member.email,
    active: true,
    organizationId: member.organizationId,
    organizationName: member.organizationName,
    organizationIds: [member.organizationId],
    organizationNames: { [member.organizationId]: member.organizationName },
    totalPoints: 0,
    bugCount: 0,
    title: "",
    badges: []
  };
}

async function userForOrganizationMember(member: OrganizationMember): Promise<User> {
  if (!isFirebaseConfigured) return userFromOrganizationMember(member);
  const snapshot = await getDoc(doc(db, "users", member.uid));
  return snapshot.exists() ? snapshot.data() as User : userFromOrganizationMember(member);
}

export async function listOrganizationMembers(user: User, organizationId: string): Promise<User[]> {
  if (isPublicOrganization(organizationId)) return [];
  const organization = await getOrganizationById(organizationId, user).catch((error) => {
    if (isPermissionDeniedError(error)) return null;
    throw error;
  });
  const fallbackOrganization: Organization = {
    id: organizationId,
    name: organizationNamesForUser(user)[organizationId] ?? organizationNameForUser(user),
    createdBy: user.uid,
    createdByName: user.displayName,
    createdAt: ""
  };
  const activeOrganization = organization ?? (organizationIdsForUser(user).includes(organizationId) ? fallbackOrganization : null);
  if (!activeOrganization) return [];
  if (!isFirebaseConfigured) {
    return organizationIdsForUser(user).includes(organizationId) ? [withOrganizationMembership(user, activeOrganization.id, activeOrganization.name)] : [];
  }

  const membersById = new Map<string, User>();
  const memberDocs: OrganizationMember[] = [];
  try {
    const snapshot = await getDocs(collection(db, "organizations", activeOrganization.id, "members"));
    memberDocs.push(...snapshot.docs.map((item) => item.data() as OrganizationMember));
  } catch (error) {
    if (!isPermissionDeniedError(error)) throw error;
  }
  const memberUsers = await Promise.all(memberDocs.map((item) => userForOrganizationMember(item)));
  for (const memberUser of memberUsers) {
    membersById.set(memberUser.uid, withOrganizationMembership(memberUser, activeOrganization.id, activeOrganization.name));
  }

  const userSnapshots = await Promise.all([
    getDocs(query(collection(db, "users"), where("organizationIds", "array-contains", activeOrganization.id))),
    getDocs(query(collection(db, "users"), where("organizationId", "==", activeOrganization.id)))
  ]);
  for (const userSnapshot of userSnapshots) {
    for (const userDoc of userSnapshot.docs) {
      const memberUser = userDoc.data() as User;
      if (memberUser.active === false) continue;
      membersById.set(memberUser.uid, withOrganizationMembership(memberUser, activeOrganization.id, activeOrganization.name));
    }
  }

  if (organizationIdsForUser(user).includes(activeOrganization.id)) {
    membersById.set(user.uid, withOrganizationMembership(user, activeOrganization.id, activeOrganization.name));
  }

  if (activeOrganization.createdBy && !membersById.has(activeOrganization.createdBy)) {
    const creatorSnapshot = await getDoc(doc(db, "users", activeOrganization.createdBy));
    const creator = creatorSnapshot.exists() ? creatorSnapshot.data() as User : null;
    if (creator) {
      membersById.set(creator.uid, withOrganizationMembership(creator, activeOrganization.id, activeOrganization.name));
    }
  }

  return Array.from(membersById.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function updateOrganizationName(manager: User, organizationId: string, organizationName: string): Promise<Organization> {
  const name = cleanOrganizationName(organizationName);
  if (name.length < 2) throw new Error("Organisatienaam moet minimaal 2 tekens zijn.");
  if (isPublicOrganization(organizationId)) throw new Error("Public kan niet gewijzigd worden.");
  const organization = await getOrganizationById(organizationId, manager);
  if (!organization) throw new Error("Organisatie niet gevonden.");
  if (!isOrganizationAdmin(manager, organization)) throw new Error("Alleen de organisatiebeheerder kan dit wijzigen.");
  const updatedAt = new Date().toISOString();
  const updated: Organization = { ...organization, name, updatedAt };

  if (!isFirebaseConfigured) return updated;

  await updateDoc(doc(db, "organizations", organizationId), { name, updatedAt });
  const [memberSnapshot, userByDefaultSnapshot, userByMembershipSnapshot, inviteSnapshot] = await Promise.all([
    getDocs(collection(db, "organizations", organizationId, "members")),
    getDocs(query(collection(db, "users"), where("organizationId", "==", organizationId))),
    getDocs(query(collection(db, "users"), where("organizationIds", "array-contains", organizationId))),
    getDocs(query(collection(db, "organizationInvites"), where("organizationId", "==", organizationId)))
  ]);

  await Promise.all(memberSnapshot.docs.map((item) => updateDoc(item.ref, { organizationName: name })));
  const usersById = new Map([...userByDefaultSnapshot.docs, ...userByMembershipSnapshot.docs].map((item) => [item.id, item]));
  await Promise.all(Array.from(usersById.values()).map((item) => {
    const current = item.data() as User;
    return updateDoc(item.ref, {
      ...(organizationIdForUser(current) === organizationId ? { organizationName: name } : {}),
      [`organizationNames.${organizationId}`]: name
    });
  }));
  await Promise.all(inviteSnapshot.docs
    .filter((item) => (item.data() as OrganizationInvite).status === "open")
    .map((item) => updateDoc(item.ref, { organizationName: name })));
  return updated;
}

export async function deleteOrganization(manager: User, organizationId: string): Promise<User> {
  if (isPublicOrganization(organizationId)) throw new Error("Public kan niet verwijderd worden.");
  const organization = await getOrganizationById(organizationId, manager);
  if (!organization) throw new Error("Organisatie niet gevonden.");
  if (!isOrganizationAdmin(manager, organization)) throw new Error("Alleen de organisatiebeheerder kan dit verwijderen.");
  if (!isFirebaseConfigured) return manager;

  const [memberSnapshot, userByDefaultSnapshot, userByMembershipSnapshot, inviteSnapshot] = await Promise.all([
    getDocs(collection(db, "organizations", organizationId, "members")),
    getDocs(query(collection(db, "users"), where("organizationId", "==", organizationId))),
    getDocs(query(collection(db, "users"), where("organizationIds", "array-contains", organizationId))),
    getDocs(query(collection(db, "organizationInvites"), where("organizationId", "==", organizationId)))
  ]);

  const usersById = new Map([...userByDefaultSnapshot.docs, ...userByMembershipSnapshot.docs].map((item) => [item.id, item]));
  let updatedManager = manager;
  for (const item of usersById.values()) {
    const member = item.data() as User;
    const remainingIds = organizationIdsForUser(member).filter((id) => id !== organizationId);
    const memberNames = organizationNamesForUser(member);
    const nextDefaultId = organizationIdForUser(member) === organizationId ? (remainingIds[0] ?? defaultOrganizationId) : organizationIdForUser(member);
    const nextDefaultName = nextDefaultId === defaultOrganizationId ? defaultOrganizationName : (memberNames[nextDefaultId] ?? nextDefaultId);
    await updateDoc(item.ref, {
      organizationId: nextDefaultId,
      organizationName: nextDefaultName,
      organizationIds: arrayRemove(organizationId),
      [`organizationNames.${organizationId}`]: deleteField()
    });
    if (member.uid === manager.uid) {
      updatedManager = {
        ...manager,
        organizationId: nextDefaultId,
        organizationName: nextDefaultName,
        organizationIds: remainingIds,
        organizationNames: Object.fromEntries(Object.entries(memberNames).filter(([id]) => id !== organizationId))
      };
    }
  }

  await Promise.all(inviteSnapshot.docs
    .filter((item) => (item.data() as OrganizationInvite).status === "open")
    .map((item) => updateDoc(item.ref, { cancelledAt: new Date().toISOString(), status: "cancelled" })));
  await Promise.all(memberSnapshot.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(doc(db, "organizations", organizationId));
  return updatedManager;
}

export async function listIncomingOrganizationInvites(user: User): Promise<OrganizationInvite[]> {
  const invitedEmail = cleanInviteEmail(user.email);
  if (!isFirebaseConfigured) return [];
  const [emailSnapshot, userSnapshot] = await Promise.allSettled([
    invitedEmail ? getDocs(query(collection(db, "organizationInvites"), where("invitedEmail", "==", invitedEmail))) : Promise.resolve({ docs: [] }),
    getDocs(query(collection(db, "organizationInvites"), where("invitedUserId", "==", user.uid)))
  ]);
  const byId = new Map<string, OrganizationInvite>();
  const emailDocs = emailSnapshot.status === "fulfilled" ? emailSnapshot.value.docs : [];
  const userDocs = userSnapshot.status === "fulfilled" ? userSnapshot.value.docs : [];
  if (emailSnapshot.status === "rejected" && !isPermissionDeniedError(emailSnapshot.reason)) throw emailSnapshot.reason;
  if (userSnapshot.status === "rejected" && !isPermissionDeniedError(userSnapshot.reason)) throw userSnapshot.reason;
  for (const item of [...emailDocs, ...userDocs]) {
    const invite = item.data() as OrganizationInvite;
    byId.set(invite.id, invite);
  }
  return Array.from(byId.values())
    .filter((invite) => invite.status === "open" && inviteMatchesUser(invite, user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function acceptOrganizationInvite(user: User, invite: OrganizationInvite): Promise<User> {
  if (!inviteMatchesUser(invite, user)) throw new Error("Deze uitnodiging is niet voor jouw account.");
  const updated: User = { ...withOrganizationMembership(user, invite.organizationId, invite.organizationName), organizationInviteId: invite.id };
  if (!isFirebaseConfigured) return updated;

  const inviteRef = doc(db, "organizationInvites", invite.id);
  const userRef = doc(db, "users", user.uid);
  const memberRef = doc(db, "organizations", invite.organizationId, "members", user.uid);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(inviteRef);
    if (!snapshot.exists()) throw new Error("Uitnodiging niet gevonden.");
    const fresh = snapshot.data() as OrganizationInvite;
    if (fresh.status !== "open") throw new Error("Uitnodiging is niet meer geldig.");
    if (!inviteMatchesUser(fresh, user)) throw new Error("Deze uitnodiging is niet voor jouw account.");
    const now = new Date().toISOString();
    const member: OrganizationMember = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: "member",
      organizationId: fresh.organizationId,
      organizationName: fresh.organizationName,
      joinedAt: now,
      invitedById: fresh.invitedById,
      inviteId: fresh.id
    };
    transaction.update(inviteRef, {
      acceptedAt: now,
      acceptedById: user.uid,
      status: "accepted"
    });
    const shouldSetDefault = isPublicOrganization(user.organizationId);
    transaction.update(userRef, {
      ...(shouldSetDefault ? { organizationId: fresh.organizationId, organizationName: fresh.organizationName } : {}),
      organizationInviteId: fresh.id,
      organizationIds: arrayUnion(fresh.organizationId),
      [`organizationNames.${fresh.organizationId}`]: fresh.organizationName
    });
    transaction.set(memberRef, member);
  });
  return updated;
}

export async function declineOrganizationInvite(user: User, invite: OrganizationInvite): Promise<void> {
  if (!inviteMatchesUser(invite, user)) throw new Error("Deze uitnodiging is niet voor jouw account.");
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, "organizationInvites", invite.id), {
    declinedAt: new Date().toISOString(),
    declinedById: user.uid,
    status: "declined"
  });
}

export async function cancelOrganizationInvite(invite: OrganizationInvite): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, "organizationInvites", invite.id), {
    cancelledAt: new Date().toISOString(),
    status: "cancelled"
  });
}

export async function removeOrganizationMember(manager: User, member: User, organizationId?: string): Promise<void> {
  if (manager.uid === member.uid) throw new Error("Je kunt jezelf niet verwijderen.");
  const targetOrganizationId = organizationId ?? organizationIdForUser(member);
  if (isPublicOrganization(targetOrganizationId)) return;
  if (!isFirebaseConfigured) return;
  const remainingIds = organizationIdsForUser(member).filter((id) => id !== targetOrganizationId);
  const memberNames = organizationNamesForUser(member);
  const nextDefaultId = member.organizationId === targetOrganizationId ? (remainingIds[0] ?? defaultOrganizationId) : organizationIdForUser(member);
  const nextDefaultName = nextDefaultId === defaultOrganizationId ? defaultOrganizationName : (memberNames[nextDefaultId] ?? nextDefaultId);
  await updateDoc(doc(db, "users", member.uid), {
    organizationId: nextDefaultId,
    organizationName: nextDefaultName,
    organizationIds: arrayRemove(targetOrganizationId),
    [`organizationNames.${targetOrganizationId}`]: deleteField()
  });
  await deleteDoc(doc(db, "organizations", targetOrganizationId, "members", member.uid));
}
