import { collection, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { User } from "../types";
import { normalizeSeasonTrophy, type SeasonTrophy } from "./seasonProgressModel";

export type { SeasonTrophy } from "./seasonProgressModel";

export async function listSeasonTrophies(user: User): Promise<SeasonTrophy[]> {
  if (!isFirebaseConfigured) return [];
  const snapshot = await getDocs(collection(db, "users", user.uid, "releaseBossClaims"));
  return snapshot.docs
    .map((item) => normalizeSeasonTrophy(item.id, item.data()))
    .filter((item): item is SeasonTrophy => Boolean(item))
    .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
}
