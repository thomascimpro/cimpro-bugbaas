import Constants from "expo-constants";
import { auth, isFirebaseConfigured } from "../firebase";
import type { BugDexInventoryItem, User } from "../types";
import { entryByBugId, type BugDexDropResult, type BugDexDropSource } from "./bugDexService";
import { soloCampaignBossMilestone } from "./soloCampaignMilestoneModel";

type SoloBossMilestoneReward = {
  bugId: string;
  kind: "bug";
  source: BugDexDropSource;
};

export type SoloBossDailyRewardResult = {
  drop?: BugDexDropResult;
  reward: SoloBossMilestoneReward;
  user: User;
};

type ServerMilestonePayload = {
  alreadyClaimed?: boolean;
  claimed?: boolean;
  error?: string;
  isNew?: boolean;
  item?: BugDexInventoryItem;
  rewardBugId?: string;
  source?: BugDexDropSource;
};

const rewardSource: BugDexDropSource = "solo_campaign_clear";
const demoSoloBossClaims = new Set<string>();

function functionBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  return String((extra as { fitnessSyncerApiBaseUrl?: unknown }).fitnessSyncerApiBaseUrl ?? "https://us-central1-thomascimpro-6266f.cloudfunctions.net").replace(/\/+$/, "");
}

export async function claimSoloCampaignBossMilestone(user: User, bossLevel: number): Promise<SoloBossDailyRewardResult | null> {
  const milestone = soloCampaignBossMilestone(bossLevel);
  if (!milestone) return null;
  const entry = entryByBugId(milestone.bugId);
  if (!entry) throw new Error(`Missing BugDex entry for campaign milestone ${milestone.bugId}.`);
  const reward: SoloBossMilestoneReward = { bugId: entry.id, kind: "bug", source: rewardSource };
  const now = new Date().toISOString();

  if (!isFirebaseConfigured) {
    const demoKey = `${user.uid}:${milestone.claimId}`;
    if (demoSoloBossClaims.has(demoKey)) return null;
    demoSoloBossClaims.add(demoKey);
    const item: BugDexInventoryItem = {
      bugId: entry.id,
      count: 1,
      firstUnlockedAt: now,
      lastUnlockedAt: now,
      rarity: entry.rarity,
      sources: [rewardSource]
    };
    return { drop: { rewardType: "bug", entry, item, isNew: true, source: rewardSource }, reward, user };
  }

  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== user.uid) throw new Error("Log opnieuw in om de campaignbeloning te ontvangen.");
  const response = await fetch(`${functionBaseUrl()}/claimSoloCampaignBossMilestone`, {
    body: JSON.stringify({ bossLevel: milestone.bossLevel }),
    headers: {
      Authorization: `Bearer ${await currentUser.getIdToken()}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const payload = await response.json().catch(() => ({})) as ServerMilestonePayload;
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "De campaignbeloning is tijdelijk niet beschikbaar.");
  if (payload.alreadyClaimed || !payload.claimed) return null;
  if (payload.rewardBugId !== milestone.bugId || !payload.item) throw new Error("De campaignbeloning bevatte een ongeldig resultaat.");

  const item: BugDexInventoryItem = {
    ...payload.item,
    bugId: milestone.bugId,
    count: Math.max(1, Math.floor(Number(payload.item.count) || 1)),
    firstUnlockedAt: String(payload.item.firstUnlockedAt || now),
    lastUnlockedAt: String(payload.item.lastUnlockedAt || now),
    rarity: entry.rarity,
    sources: Array.from(new Set([...(Array.isArray(payload.item.sources) ? payload.item.sources : []), rewardSource]))
  };
  return {
    drop: { rewardType: "bug", entry, item, isNew: Boolean(payload.isNew), source: rewardSource },
    reward,
    user
  };
}
