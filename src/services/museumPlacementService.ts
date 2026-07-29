import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import type { MuseumWingId } from "../screens/MuseumScreenModel";
import type { User } from "../types";
import type { MuseumExhibitPlacement } from "./museumPlacementModel";

export {
  clearMuseumExhibit,
  museumSlotCapacity,
  placeMuseumExhibit,
  sanitizeMuseumPlacements
} from "./museumPlacementModel";
export type { MuseumExhibitPlacement } from "./museumPlacementModel";

export type MuseumWingPlacements = {
  wingId: MuseumWingId;
  placements: MuseumExhibitPlacement[];
  updatedAt: string;
};

const demoPlacements = new Map<string, MuseumWingPlacements>();

export async function listMuseumPlacements(user: Pick<User, "uid">): Promise<Record<MuseumWingId, MuseumExhibitPlacement[]>> {
  const empty = emptyPlacementRecord();
  if (!isFirebaseConfigured) {
    for (const wingId of Object.keys(empty) as MuseumWingId[]) empty[wingId] = demoPlacements.get(`${user.uid}:${wingId}`)?.placements ?? [];
    return empty;
  }
  const snapshot = await getDocs(collection(db, "users", user.uid, "museumPlacements"));
  for (const item of snapshot.docs) {
    const data = item.data() as Partial<MuseumWingPlacements>;
    if (!(item.id in empty)) continue;
    empty[item.id as MuseumWingId] = Array.isArray(data.placements) ? data.placements.filter(isPlacement) : [];
  }
  return empty;
}

export async function saveMuseumPlacements(user: Pick<User, "uid">, wingId: MuseumWingId, placements: MuseumExhibitPlacement[]): Promise<void> {
  const payload: MuseumWingPlacements = { wingId, placements: placements.map((placement) => ({ ...placement })), updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured) {
    demoPlacements.set(`${user.uid}:${wingId}`, payload);
    return;
  }
  await setDoc(doc(db, "users", user.uid, "museumPlacements", wingId), payload);
}

function isPlacement(value: unknown): value is MuseumExhibitPlacement {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MuseumExhibitPlacement>;
  return typeof item.slotId === "string" && typeof item.bugId === "string" && typeof item.placedAt === "string";
}

function emptyPlacementRecord(): Record<MuseumWingId, MuseumExhibitPlacement[]> {
  return { beetles: [], wings: [], water: [], night: [], crawlers: [], crown: [] };
}
