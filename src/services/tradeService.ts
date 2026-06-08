import { collection, doc, getDocs, query, runTransaction, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, TradeRequest, User } from "../types";
import { entryByBugId, listBugDexInventory } from "./bugDexService";

const demoTrades: TradeRequest[] = [];

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

function addBug(item: BugDexInventoryItem | null, bugId: string, rarity: string, tradeId: string): BugDexInventoryItem {
  const now = nowIso();
  return item
    ? withTradeId({ ...item, count: item.count + 1, sources: Array.from(new Set([...item.sources, "trade"])) }, tradeId)
    : {
        bugId,
        count: 1,
        firstUnlockedAt: now,
        lastUnlockedAt: now,
        rarity,
        sources: ["trade"],
        lastTradeId: tradeId
      };
}

function removeTradeBug(item: BugDexInventoryItem, tradeId: string): BugDexInventoryItem {
  if (item.count < 1) throw new Error("Deze bug ontbreekt.");
  return withTradeId({ ...item, count: item.count - 1 }, tradeId);
}

export async function listTradeRequests(user: User): Promise<TradeRequest[]> {
  if (!isFirebaseConfigured) {
    return mergeTradeLists(demoTrades.filter((trade) => trade.fromUserId === user.uid || trade.toUserId === user.uid));
  }

  const fromSnapshot = await getDocs(query(collection(db, "trades"), where("fromUserId", "==", user.uid)));
  const toSnapshot = await getDocs(query(collection(db, "trades"), where("toUserId", "==", user.uid)));
  return mergeTradeLists([...fromSnapshot.docs, ...toSnapshot.docs].map((item) => item.data() as TradeRequest));
}

export async function createTradeRequest(fromUser: User, toUser: User, offerBugId: string, requestBugId: string): Promise<TradeRequest> {
  if (fromUser.uid === toUser.uid) throw new Error("Kies een collega om mee te ruilen.");
  if (offerBugId === requestBugId) throw new Error("Kies twee verschillende bugs.");

  const inventory = await listBugDexInventory(fromUser);
  const offer = inventory.find((item) => item.bugId === offerBugId);
  if (!offer || offer.count < 1) throw new Error("Je hebt deze bug niet.");

  const now = nowIso();
  const baseTrade: TradeRequest = {
    id: `trade-${Date.now()}`,
    fromUserId: fromUser.uid,
    fromUserName: fromUser.displayName,
    toUserId: toUser.uid,
    toUserName: toUser.displayName,
    offerBugId,
    requestBugId,
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

  const offerEntry = entryByBugId(trade.offerBugId);
  const requestEntry = entryByBugId(trade.requestBugId);
  if (!offerEntry || !requestEntry) throw new Error("BugDex item niet gevonden.");

  if (!isFirebaseConfigured) {
    throw new Error("Demo ruilen is alleen beschikbaar met Firebase.");
  }

  const tradeRef = doc(db, "trades", trade.id);
  const fromOfferRef = doc(db, "users", trade.fromUserId, "bugdex", trade.offerBugId);
  const toRequestRef = doc(db, "users", trade.toUserId, "bugdex", trade.requestBugId);
  const fromRequestRef = doc(db, "users", trade.fromUserId, "bugdex", trade.requestBugId);
  const toOfferRef = doc(db, "users", trade.toUserId, "bugdex", trade.offerBugId);

  return runTransaction(db, async (transaction) => {
    const freshTradeSnapshot = await transaction.get(tradeRef);
    if (!freshTradeSnapshot.exists()) throw new Error("Ruilverzoek niet gevonden.");
    const freshTrade = freshTradeSnapshot.data() as TradeRequest;
    if (freshTrade.status !== "Open") throw new Error("Dit ruilverzoek is al verwerkt.");
    if (freshTrade.toUserId !== user.uid) throw new Error("Dit ruilverzoek is niet voor jou.");

    const fromOfferSnapshot = await transaction.get(fromOfferRef);
    const toRequestSnapshot = await transaction.get(toRequestRef);
    if (!fromOfferSnapshot.exists() || !toRequestSnapshot.exists()) throw new Error("Een ruilbug ontbreekt.");

    const fromOffer = fromOfferSnapshot.data() as BugDexInventoryItem;
    const toRequest = toRequestSnapshot.data() as BugDexInventoryItem;
    const fromRequestSnapshot = await transaction.get(fromRequestRef);
    const toOfferSnapshot = await transaction.get(toOfferRef);
    const fromRequest = fromRequestSnapshot.exists() ? fromRequestSnapshot.data() as BugDexInventoryItem : null;
    const toOffer = toOfferSnapshot.exists() ? toOfferSnapshot.data() as BugDexInventoryItem : null;
    const updatedAt = nowIso();

    const nextFromOffer = removeTradeBug(fromOffer, trade.id);
    const nextToRequest = removeTradeBug(toRequest, trade.id);
    transaction.set(fromOfferRef, nextFromOffer);
    transaction.set(toRequestRef, nextToRequest);
    transaction.set(fromRequestRef, addBug(fromRequest, trade.requestBugId, requestEntry.rarity, trade.id));
    transaction.set(toOfferRef, addBug(toOffer, trade.offerBugId, offerEntry.rarity, trade.id));
    transaction.update(tradeRef, { status: "Geaccepteerd", updatedAt });

    return { ...freshTrade, status: "Geaccepteerd", updatedAt };
  });
}
