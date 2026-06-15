import { collection, doc, getDocs, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, TradeRequest, User } from "../types";
import { entryByBugId, listBugDexInventory } from "./bugDexService";

const demoTrades: TradeRequest[] = [];
const maxTradeBugIdsPerSide = 6;

function nowIso() {
  return new Date().toISOString();
}

function mergeTradeLists(items: TradeRequest[]): TradeRequest[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function withTradeId(item: BugDexInventoryItem, tradeId: string): BugDexInventoryItem {
  return { ...item, lastTradeId: tradeId, lastUnlockedAt: nowIso() };
}

function normalizeTradeBugIds(trade: Pick<TradeRequest, "offerBugId" | "requestBugId" | "offerBugIds" | "requestBugIds">, side: "offer" | "request"): string[] {
  const ids = side === "offer" ? trade.offerBugIds : trade.requestBugIds;
  const fallback = side === "offer" ? trade.offerBugId : trade.requestBugId;
  const normalized = (Array.isArray(ids) && ids.length ? ids : [fallback]).filter((bugId): bugId is string => typeof bugId === "string" && bugId.length > 0);
  return normalized.length ? normalized : [fallback];
}

function aggregateBugIds(bugIds: string[]): Map<string, number> {
  return bugIds.reduce((counts, bugId) => counts.set(bugId, (counts.get(bugId) ?? 0) + 1), new Map<string, number>());
}

function ownedCount(item: BugDexInventoryItem): number {
  return Number.isFinite(item.count) ? Math.max(0, item.count) : 1;
}

function addBug(item: BugDexInventoryItem | null, bugId: string, rarity: string, tradeId: string, amount = 1): BugDexInventoryItem {
  const now = nowIso();
  return item
    ? withTradeId({ ...item, count: ownedCount(item) + amount, sources: Array.from(new Set([...item.sources, "trade"])) }, tradeId)
    : {
        bugId,
        count: amount,
        firstUnlockedAt: now,
        lastUnlockedAt: now,
        rarity,
        sources: ["trade"],
        lastTradeId: tradeId
      };
}

function removeTradeBug(item: BugDexInventoryItem, tradeId: string, amount = 1): BugDexInventoryItem {
  if (ownedCount(item) < amount) throw new Error("Deze bug ontbreekt.");
  return withTradeId({ ...item, count: ownedCount(item) - amount }, tradeId);
}

export async function listTradeRequests(user: User): Promise<TradeRequest[]> {
  if (!isFirebaseConfigured) {
    return mergeTradeLists(demoTrades.filter((trade) => trade.fromUserId === user.uid || trade.toUserId === user.uid));
  }

  const fromSnapshot = await getDocs(query(collection(db, "trades"), where("fromUserId", "==", user.uid)));
  const toSnapshot = await getDocs(query(collection(db, "trades"), where("toUserId", "==", user.uid)));
  return mergeTradeLists([...fromSnapshot.docs, ...toSnapshot.docs].map((item) => item.data() as TradeRequest));
}

export function countIncomingTradeRequestsForUser(trades: TradeRequest[], userId: string): number {
  return trades.filter((trade) => trade.toUserId === userId && trade.fromUserId !== userId && trade.status === "Open").length;
}

export function subscribeIncomingTradeRequestCount(user: User, onCount: (count: number) => void): () => void {
  if (!isFirebaseConfigured) {
    onCount(countIncomingTradeRequestsForUser(demoTrades, user.uid));
    return () => undefined;
  }

  const incomingTradesQuery = query(collection(db, "trades"), where("toUserId", "==", user.uid), where("status", "==", "Open"));
  return onSnapshot(incomingTradesQuery, (snapshot) => {
    const trades = snapshot.docs.map((item) => item.data() as TradeRequest);
    onCount(countIncomingTradeRequestsForUser(trades, user.uid));
  });
}

export async function createTradeRequest(fromUser: User, toUser: User, offerBugIdsInput: string[] | string, requestBugIdsInput: string[] | string): Promise<TradeRequest> {
  if (fromUser.uid === toUser.uid) throw new Error("Kies een collega om mee te ruilen.");
  const offerBugIds = (Array.isArray(offerBugIdsInput) ? offerBugIdsInput : [offerBugIdsInput]).filter(Boolean);
  const requestBugIds = (Array.isArray(requestBugIdsInput) ? requestBugIdsInput : [requestBugIdsInput]).filter(Boolean);
  if (!offerBugIds.length || !requestBugIds.length) throw new Error("Kies bugs om te ruilen.");
  if (offerBugIds.length > maxTradeBugIdsPerSide || requestBugIds.length > maxTradeBugIdsPerSide) throw new Error("Kies maximaal 6 bugs per kant.");
  if (offerBugIds.some((bugId) => requestBugIds.includes(bugId))) throw new Error("Kies twee verschillende bugs.");

  const inventory = await listBugDexInventory(fromUser);
  const offerCounts = aggregateBugIds(offerBugIds);
  for (const [bugId, amount] of offerCounts) {
    const offer = inventory.find((item) => item.bugId === bugId);
    if (!offer || ownedCount(offer) < amount) throw new Error("Je hebt deze bug niet.");
  }
  const recipientInventory = await listBugDexInventory(toUser);
  const requestCounts = aggregateBugIds(requestBugIds);
  for (const [bugId, amount] of requestCounts) {
    const requested = recipientInventory.find((item) => item.bugId === bugId);
    if (!requested || ownedCount(requested) < amount) throw new Error("Deze collega heeft deze bug niet meer.");
  }

  const now = nowIso();
  const baseTrade: TradeRequest = {
    id: `trade-${Date.now()}`,
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    toUserId: toUser.uid,
    toUserName: toUser.displayName,
    offerBugId: offerBugIds[0],
    requestBugId: requestBugIds[0],
    offerBugIds,
    requestBugIds,
    status: "Open",
    createdAt: now,
    updatedAt: now
  };

  if (!isFirebaseConfigured) {
    demoTrades.unshift(baseTrade);
    return baseTrade;
  }

  const tradeRef = doc(collection(db, "trades"));
  const trade = { ...baseTrade, id: tradeRef.id };
  await setDoc(tradeRef, trade);
  return trade;
}

export async function respondToTradeRequest(user: User, trade: TradeRequest, accept: boolean): Promise<TradeRequest> {
  if (user.uid !== trade.toUserId) throw new Error("Alleen de ontvanger kan dit verzoek beantwoorden.");

  if (!accept) {
    const rejected = { ...trade, status: "Afgewezen" as const, updatedAt: nowIso() };
    if (!isFirebaseConfigured) {
      const index = demoTrades.findIndex((item) => item.id === trade.id);
      if (index >= 0) demoTrades[index] = rejected;
      return rejected;
    }
    await updateDoc(doc(db, "trades", trade.id), { status: rejected.status, updatedAt: rejected.updatedAt });
    return rejected;
  }

  if (!isFirebaseConfigured) {
    throw new Error("Demo ruilen is alleen beschikbaar met Firebase.");
  }

  const tradeRef = doc(db, "trades", trade.id);

  return runTransaction(db, async (transaction) => {
    const freshTradeSnapshot = await transaction.get(tradeRef);
    if (!freshTradeSnapshot.exists()) throw new Error("Ruilverzoek niet gevonden.");
    const freshTrade = freshTradeSnapshot.data() as TradeRequest;
    if (freshTrade.status !== "Open") throw new Error("Dit ruilverzoek is al verwerkt.");
    if (freshTrade.toUserId !== user.uid) throw new Error("Dit ruilverzoek is niet voor jou.");

    const normalizedOfferBugIds = normalizeTradeBugIds(freshTrade, "offer");
    const normalizedRequestBugIds = normalizeTradeBugIds(freshTrade, "request");
    const offerCounts = aggregateBugIds(normalizedOfferBugIds);
    const requestCounts = aggregateBugIds(normalizedRequestBugIds);
    const offerBugIds = Array.from(offerCounts.keys());
    const requestBugIds = Array.from(requestCounts.keys());
    const missingEntry = [...offerBugIds, ...requestBugIds].some((bugId) => !entryByBugId(bugId));
    if (missingEntry) throw new Error("BugDex item niet gevonden.");

    const fromOfferRefs = offerBugIds.map((bugId) => doc(db, "users", freshTrade.fromUserId, "bugdex", bugId));
    const toRequestRefs = requestBugIds.map((bugId) => doc(db, "users", freshTrade.toUserId, "bugdex", bugId));
    const fromRequestRefs = requestBugIds.map((bugId) => doc(db, "users", freshTrade.fromUserId, "bugdex", bugId));
    const toOfferRefs = offerBugIds.map((bugId) => doc(db, "users", freshTrade.toUserId, "bugdex", bugId));
    const fromOfferSnapshots = await Promise.all(fromOfferRefs.map((ref) => transaction.get(ref)));
    const toRequestSnapshots = await Promise.all(toRequestRefs.map((ref) => transaction.get(ref)));
    const fromRequestSnapshots = await Promise.all(fromRequestRefs.map((ref) => transaction.get(ref)));
    const toOfferSnapshots = await Promise.all(toOfferRefs.map((ref) => transaction.get(ref)));
    const updatedAt = nowIso();

    offerBugIds.forEach((bugId, index) => {
      const snapshot = fromOfferSnapshots[index];
      if (!snapshot.exists()) throw new Error("Een ruilbug ontbreekt.");
      const item = snapshot.data() as BugDexInventoryItem;
      transaction.set(fromOfferRefs[index], removeTradeBug(item, freshTrade.id, offerCounts.get(bugId) ?? 1));
    });
    requestBugIds.forEach((bugId, index) => {
      const snapshot = toRequestSnapshots[index];
      if (!snapshot.exists()) throw new Error("Een ruilbug ontbreekt.");
      const item = snapshot.data() as BugDexInventoryItem;
      transaction.set(toRequestRefs[index], removeTradeBug(item, freshTrade.id, requestCounts.get(bugId) ?? 1));
    });
    requestBugIds.forEach((bugId, index) => {
      const existing = fromRequestSnapshots[index].exists() ? fromRequestSnapshots[index].data() as BugDexInventoryItem : null;
      const entry = entryByBugId(bugId);
      if (!entry) return;
      transaction.set(fromRequestRefs[index], addBug(existing, bugId, entry.rarity, freshTrade.id, requestCounts.get(bugId) ?? 1));
    });
    offerBugIds.forEach((bugId, index) => {
      const existing = toOfferSnapshots[index].exists() ? toOfferSnapshots[index].data() as BugDexInventoryItem : null;
      const entry = entryByBugId(bugId);
      if (!entry) return;
      transaction.set(toOfferRefs[index], addBug(existing, bugId, entry.rarity, freshTrade.id, offerCounts.get(bugId) ?? 1));
    });
    const acceptedUpdate: Partial<TradeRequest> = { status: "Geaccepteerd", updatedAt };
    if (normalizedOfferBugIds.length > 1 || normalizedRequestBugIds.length > 1) {
      acceptedUpdate.acceptedBugCount = normalizedOfferBugIds.length + normalizedRequestBugIds.length;
    }
    transaction.update(tradeRef, acceptedUpdate);

    return { ...freshTrade, ...acceptedUpdate };
  });
}

export async function cancelTradeRequest(user: User, trade: TradeRequest): Promise<TradeRequest> {
  if (user.uid !== trade.fromUserId) throw new Error("Alleen de aanvrager kan dit verzoek annuleren.");
  if (trade.status !== "Open") throw new Error("Alleen open ruilverzoeken kunnen worden geannuleerd.");

  const cancelled = { ...trade, status: "Geannuleerd" as const, updatedAt: nowIso() };
  if (!isFirebaseConfigured) {
    const index = demoTrades.findIndex((item) => item.id === trade.id);
    if (index >= 0) demoTrades[index] = cancelled;
    return cancelled;
  }

  const tradeRef = doc(db, "trades", trade.id);
  return runTransaction(db, async (transaction) => {
    const freshTradeSnapshot = await transaction.get(tradeRef);
    if (!freshTradeSnapshot.exists()) throw new Error("Ruilverzoek niet gevonden.");
    const freshTrade = freshTradeSnapshot.data() as TradeRequest;
    if (freshTrade.fromUserId !== user.uid) throw new Error("Alleen de aanvrager kan dit verzoek annuleren.");
    if (freshTrade.status !== "Open") throw new Error("Alleen open ruilverzoeken kunnen worden geannuleerd.");
    transaction.update(tradeRef, { status: cancelled.status, updatedAt: cancelled.updatedAt });
    return { ...freshTrade, status: cancelled.status, updatedAt: cancelled.updatedAt };
  });
}

export async function markTradeRequesterSeen(user: User, trade: TradeRequest): Promise<void> {
  if (user.uid !== trade.fromUserId || trade.status !== "Geaccepteerd" || trade.requesterSeenAt) return;
  const requesterSeenAt = nowIso();

  if (!isFirebaseConfigured) {
    const index = demoTrades.findIndex((item) => item.id === trade.id);
    if (index >= 0) demoTrades[index] = { ...demoTrades[index], requesterSeenAt };
    return;
  }

  await updateDoc(doc(db, "trades", trade.id), { requesterSeenAt });
}
