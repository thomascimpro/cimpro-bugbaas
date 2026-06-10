import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { AppNotification, BugComment, BugReport, NotificationSettings, NotificationType, User } from "../types";
import { listUsers, updateUserNotificationPushToken } from "./userService";

export const defaultNotificationSettings: NotificationSettings = {
  trade: true,
  new_bug: true,
  comment: true,
  bug_update: true,
  bugdex: true,
  movement: true,
  duel: true
};

const demoNotifications = new Map<string, AppNotification[]>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

const phoneNotificationChannelId = "bugbaas";

function nowIso() {
  return new Date().toISOString();
}

function normalizeSettings(settings?: Partial<NotificationSettings>): NotificationSettings {
  return { ...defaultNotificationSettings, ...(settings ?? {}) };
}

export async function getNotificationSettings(user: User): Promise<NotificationSettings> {
  if (!isFirebaseConfigured) return defaultNotificationSettings;
  const snapshot = await getDoc(doc(db, "users", user.uid, "settings", "notifications"));
  if (!snapshot.exists()) return defaultNotificationSettings;
  return normalizeSettings(snapshot.data() as Partial<NotificationSettings>);
}

export async function saveNotificationSettings(user: User, settings: NotificationSettings): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, "users", user.uid, "settings", "notifications"), settings);
}

export async function initializePhoneNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(phoneNotificationChannelId, {
      name: "BugBaas",
      description: "BugBaas meldingen voor bugs, reacties, updates en ruilverzoeken.",
      enableLights: true,
      enableVibrate: true,
      importance: Notifications.AndroidImportance.MAX,
      lightColor: "#d7bd57",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
      sound: "default",
      vibrationPattern: [0, 250, 120, 250]
    });
  }
  await Notifications.requestPermissionsAsync();
}

export async function registerPhoneNotificationsForUser(user: User): Promise<User | null> {
  await initializePhoneNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return null;
  const token = await getExpoPushToken();
  if (!token || token === user.notificationPushToken) return null;
  return updateUserNotificationPushToken(user, token);
}

async function getExpoPushToken(): Promise<string> {
  const constants = Constants as typeof Constants & { easConfig?: { projectId?: string } };
  const projectId = constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? Constants.expoConfig?.extra?.easProjectId;
  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function showPhoneNotification(notification: AppNotification): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      autoDismiss: true,
      color: "#15724f",
      data: {
        bugId: notification.bugId ?? "",
        duelId: notification.duelId ?? "",
        notificationId: notification.id,
        type: notification.type
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
      sound: true,
      sticky: false,
      vibrate: [0, 250, 120, 250]
    },
    trigger: Platform.OS === "android" ? { channelId: phoneNotificationChannelId } : null
  });
}

export async function dismissPhoneNotification(notificationRequestId: string): Promise<void> {
  if (!notificationRequestId) return;
  await Notifications.dismissNotificationAsync(notificationRequestId).catch(() => undefined);
}

export async function dismissPresentedNotificationsForTarget(target: { bugId?: string; duelId?: string; notificationId?: string; type?: string }): Promise<void> {
  const entries = Object.entries(target).filter(([, value]) => Boolean(value));
  if (entries.length === 0) return;
  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  await Promise.all(presented
    .filter((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      return entries.every(([key, value]) => String(data[key] ?? "") === String(value));
    })
    .map((notification) => dismissPhoneNotification(notification.request.identifier)));
}

export async function markNotificationRead(user: User, notificationId: string): Promise<void> {
  await dismissPresentedNotificationsForTarget({ notificationId });
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, "users", user.uid, "notifications", notificationId), { read: true });
}

export function subscribeUserNotifications(
  user: User,
  settings: NotificationSettings,
  onNotification: (notification: AppNotification) => void
): () => void {
  if (!isFirebaseConfigured) return () => undefined;

  const seenIds = new Set<string>();
  let initialized = false;
  const notificationsQuery = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(20));

  return onSnapshot(notificationsQuery, (snapshot) => {
    if (!initialized) {
      snapshot.docs.forEach((item) => {
        const notification = item.data() as AppNotification;
        seenIds.add(notification.id);
      });
      initialized = true;
      return;
    }

    snapshot.docChanges().forEach((change) => {
      if (change.type !== "added") return;
      const notification = change.doc.data() as AppNotification;
      if (notification.read || !settings[notification.type]) return;
      if (seenIds.has(notification.id)) return;
      seenIds.add(notification.id);
      onNotification(notification);
    });
  });
}

export function subscribeRequestNotificationCounts(
  user: User,
  onCounts: (counts: { duel: number; trade: number }) => void
): () => void {
  if (!isFirebaseConfigured) {
    const notifications = demoNotifications.get(user.uid) ?? [];
    onCounts(countRequestNotifications(notifications));
    return () => undefined;
  }

  const notificationsQuery = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(notificationsQuery, (snapshot) => {
    onCounts(countRequestNotifications(snapshot.docs.map((item) => item.data() as AppNotification)));
  });
}

function countRequestNotifications(notifications: AppNotification[]) {
  return notifications.reduce((counts, notification) => {
    if (notification.read) return counts;
    if (notification.type === "trade") counts.trade += 1;
    if (notification.type === "duel") counts.duel += 1;
    return counts;
  }, { duel: 0, trade: 0 });
}

async function createNotification(userId: string, notification: Omit<AppNotification, "id" | "read" | "createdAt">): Promise<AppNotification> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: AppNotification = { ...notification, id, read: false, createdAt: nowIso() };

  if (!isFirebaseConfigured) {
    demoNotifications.set(userId, [item, ...(demoNotifications.get(userId) ?? [])]);
    return item;
  }

  await setDoc(doc(db, "users", userId, "notifications", id), item);
  return item;
}

async function notifyRecipients(
  recipients: User[],
  actor: User,
  type: NotificationType,
  payload: Pick<AppNotification, "title" | "body" | "bugId">
) {
  await Promise.all(
    recipients
      .filter((recipient) => recipient.uid !== actor.uid)
      .map((recipient) =>
        createNotification(recipient.uid, {
          ...payload,
          type,
          actorId: actor.uid,
          actorName: actor.displayName
        })
      )
  );
}

export async function notifyNewBug(bug: BugReport, actor: User): Promise<void> {
  const users = await listUsers();
  const reportType = bug.reportType ?? "bug";
  const title = reportType === "bug" ? "Nieuwe bug" : reportType === "tip" ? "Nieuwe tip" : reportType === "workaround" ? "Nieuwe trick" : "Nieuw idee";
  await notifyRecipients(users, actor, "new_bug", {
    title,
    body: `${actor.displayName}: ${bug.title}`,
    bugId: bug.id
  });
}

export async function notifyComment(bug: BugReport, comment: BugComment, actor: User): Promise<void> {
  if (bug.reporterId === actor.uid) return;
  await createNotification(bug.reporterId, {
    type: "comment",
    title: `Reactie op je ${reportTypeLabel(bug.reportType ?? "bug")}`,
    body: `${comment.authorName}: ${bug.title}`,
    actorId: actor.uid,
    actorName: actor.displayName,
    bugId: bug.id
  });
}

function reportTypeLabel(reportType: BugReport["reportType"]): string {
  if (reportType === "tip") return "tip";
  if (reportType === "workaround") return "trick";
  if (reportType === "idea") return "idee";
  return "bug";
}

export async function notifyBugUpdate(previousBug: BugReport, nextBug: BugReport, actor: User): Promise<void> {
  if (previousBug.status === nextBug.status || nextBug.reporterId === actor.uid) return;
  await createNotification(nextBug.reporterId, {
    type: "bug_update",
    title: "Melding update",
    body: `${nextBug.title}: ${nextBug.status}`,
    actorId: actor.uid,
    actorName: actor.displayName,
    bugId: nextBug.id
  });
}

export async function notifyTradeRequest(recipientId: string, actor: User, offeredBugName: string): Promise<void> {
  await createNotification(recipientId, {
    type: "trade",
    title: "BugBaas ruilverzoek",
    body: `${actor.displayName} wil ${offeredBugName} ruilen. Open BugDex om te reageren.`,
    actorId: actor.uid,
    actorName: actor.displayName
  });
}

export async function notifyTradeAccepted(requesterId: string, actor: User, receivedBugName: string): Promise<void> {
  await createNotification(requesterId, {
    type: "trade",
    title: "Ruil gelukt",
    body: `${actor.displayName} accepteerde je ruil. Je ontving ${receivedBugName}.`,
    actorId: actor.uid,
    actorName: actor.displayName
  });
}

export async function notifyBugSmashDuelRequest(recipientId: string, actor: User, duelId: string): Promise<void> {
  const notification = await createNotification(recipientId, {
    type: "duel",
    title: "Bug Smash Duel",
    body: `${actor.displayName} daagt je uit. Open de duel-arena om te accepteren.`,
    actorId: actor.uid,
    actorName: actor.displayName,
    duelId
  });
  await sendRemotePhoneNotification(recipientId, notification).catch(() => undefined);
}

export async function notifyBugSmashDuelAccepted(requesterId: string, actor: User, duelId: string): Promise<void> {
  const notification = await createNotification(requesterId, {
    type: "duel",
    title: "Duel geaccepteerd",
    body: `${actor.displayName} accepteerde je Bug Smash Duel. De ronde start zo.`,
    actorId: actor.uid,
    actorName: actor.displayName,
    duelId
  });
  await sendRemotePhoneNotification(requesterId, notification).catch(() => undefined);
}

async function sendRemotePhoneNotification(userId: string, notification: AppNotification): Promise<void> {
  if (!isFirebaseConfigured) return;
  const settingsSnapshot = await getDoc(doc(db, "users", userId, "settings", "notifications"));
  const settings = settingsSnapshot.exists() ? normalizeSettings(settingsSnapshot.data() as Partial<NotificationSettings>) : defaultNotificationSettings;
  if (!settings[notification.type]) return;

  const userSnapshot = await getDoc(doc(db, "users", userId));
  const recipient = userSnapshot.exists() ? userSnapshot.data() as User : null;
  const token = recipient?.notificationPushToken;
  if (!token || !/^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token)) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    body: JSON.stringify({
      body: notification.body,
      channelId: phoneNotificationChannelId,
      data: {
        bugId: notification.bugId ?? "",
        duelId: notification.duelId ?? "",
        notificationId: notification.id,
        type: notification.type
      },
      priority: "high",
      sound: "default",
      title: notification.title,
      to: token
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export async function showMovementRewardNotification(count: number): Promise<void> {
  await showPhoneNotification({
    actorId: "movement-radar",
    actorName: "BugBaas",
    body: count === 1
      ? "Er staat een radar bug reward voor je klaar."
      : `Er staan ${count} radar bug rewards voor je klaar.`,
    createdAt: nowIso(),
    id: `movement-${Date.now()}`,
    read: false,
    title: "Beweegdoel behaald",
    type: "movement"
  });
}

export async function showBugDexUnlockNotification(bugName: string, rarity: string): Promise<void> {
  await showPhoneNotification({
    actorId: "bugdex",
    actorName: "BugBaas",
    body: `${bugName} (${rarity}) staat nu in je BugDex.`,
    createdAt: nowIso(),
    id: `bugdex-${Date.now()}`,
    read: false,
    title: "Nieuwe BugDex unlock",
    type: "bugdex"
  });
}
