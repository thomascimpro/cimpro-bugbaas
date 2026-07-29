import AsyncStorage from "@react-native-async-storage/async-storage";
import { normalizeResearchFocusWing, type ResearchFocusWing } from "./researchFocusModel";

const storageKey = (uid: string) => `bugbaas:researchFocus:${uid}`;

export async function loadResearchFocusWing(uid: string): Promise<ResearchFocusWing | undefined> {
  const value = await AsyncStorage.getItem(storageKey(uid));
  return normalizeResearchFocusWing(value);
}

export async function saveResearchFocusWing(uid: string, wingId: ResearchFocusWing): Promise<ResearchFocusWing> {
  const normalized = normalizeResearchFocusWing(wingId);
  if (!normalized) throw new Error("Invalid Museum research focus.");
  await AsyncStorage.setItem(storageKey(uid), normalized);
  return normalized;
}
