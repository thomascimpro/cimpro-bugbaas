import { doc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { BugDexInventoryItem, User } from "../types";
import { BugDexDropResult, BugDexDropSource, pickBugDexRewardEntry } from "./bugDexService";
import { badgesForUser, titleForPoints } from "./pointsService";
import { starterBoostedXp } from "./starterBoostService";

type SoloBossDailyReward =
  | { kind: "xp"; xp: number }
  | { kind: "bug"; source: BugDexDropSource };

export type SoloBossDailyRewardResult = {
  drop?: BugDexDropResult;
  reward: SoloBossDailyReward;
  user: User;
};

const demoSoloBossClaims = new Set<string>();

const soloBossDailyRewards: Record<number, SoloBossDailyReward | undefined> = {
  1: { kind: "xp", xp: 5 },
  2: { kind: "bug", source: "solo_boss_common" },
  3: { kind: "xp", xp: 10 },
  4: { kind: "bug", source: "solo_boss_rare" },
  5: { kind: "xp", xp: 15 }
};

export async function claimSoloCampaignBossDailyReward(user: User, bossLevel: number): Promise<SoloBossDailyRewardResult | null> {
  const reward = soloBossDailyRewards[bossLevel];
  if (!reward) return null;

  const day = localDayId();
  const claimId = `solo-boss-${bossLevel}-${day}`;
  const now = new Date().toISOString();
  const demoKey = `${user.uid}:${claimId}`;

  if (!isFirebaseConfigured) {
    if (demoSoloBossClaims.has(demoKey)) return null;
    demoSoloBossClaims.add(demoKey);
    if (reward.kind === "xp") {
      const totalPoints = Math.max(0, user.totalPoints + starterBoostedXp(user, reward.xp));
      const updated = { ...user, totalPoints, title: titleForPoints(totalPoints) };
      updated.badges = badgesForUser(updated);
      return { reward, user: updated };
    }
    const entry = pickBugDexRewardEntry(user, reward.source);
    const item: BugDexInventoryItem = {
      bugId: entry.id,
      count: 1,
      firstUnlockedAt: now,
      lastUnlockedAt: now,
      rarity: entry.rarity,
      sources: [reward.source]
    };
    return { drop: { rewardType: "bug", entry, item, isNew: true, source: reward.source }, reward, user };
  }

  const userRef = doc(db, "users", user.uid);
  const claimRef = doc(db, "users", user.uid, "soloCampaignBossClaims", claimId);
  const rewardEntry = reward.kind === "bug" ? pickBugDexRewardEntry(user, reward.source) : null;
  const rewardRef = rewardEntry ? doc(db, "users", user.uid, "bugdex", rewardEntry.id) : null;

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const claimSnapshot = await transaction.get(claimRef);
    const rewardSnapshot = rewardRef ? await transaction.get(rewardRef) : null;
    if (!userSnapshot.exists() || claimSnapshot.exists()) return null;

    const current = userSnapshot.data() as User;
    let updated = current;
    let drop: BugDexDropResult | undefined;

    if (reward.kind === "xp") {
      const totalPoints = Math.max(0, current.totalPoints + starterBoostedXp(current, reward.xp));
      updated = { ...current, totalPoints, title: titleForPoints(totalPoints) };
      updated.badges = badgesForUser(updated);
      transaction.update(userRef, {
        badges: updated.badges,
        title: updated.title,
        totalPoints: updated.totalPoints
      });
    } else if (rewardEntry && rewardRef) {
      const existing = rewardSnapshot?.exists() ? rewardSnapshot.data() as BugDexInventoryItem : null;
      const item: BugDexInventoryItem = existing
        ? {
            ...existing,
            count: existing.count + 1,
            lastUnlockedAt: now,
            sources: Array.from(new Set([...existing.sources, reward.source]))
          }
        : {
            bugId: rewardEntry.id,
            count: 1,
            firstUnlockedAt: now,
            lastUnlockedAt: now,
            rarity: rewardEntry.rarity,
            sources: [reward.source]
          };
      transaction.set(rewardRef, item);
      drop = { rewardType: "bug", entry: rewardEntry, item, isNew: !existing, source: reward.source };
    }

    transaction.set(claimRef, {
      id: claimId,
      bossLevel,
      localDay: day,
      rewardBugId: rewardEntry?.id ?? null,
      rewardSource: reward.kind === "bug" ? reward.source : null,
      rewardType: reward.kind,
      rewardXp: reward.kind === "xp" ? reward.xp : 0,
      claimedAt: now
    });

    return { drop, reward, user: updated };
  });
}

function localDayId(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
