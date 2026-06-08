import { ImageSourcePropType } from "react-native";

export type CharacterId = "classic" | "blue" | "red" | "purple" | "lime" | "gold";

export type CharacterOption = {
  accent: string;
  id: CharacterId;
  label: string;
  source: ImageSourcePropType;
};

export const defaultCharacterId: CharacterId = "classic";

export const characterOptions: CharacterOption[] = [
  { accent: "#d7bd57", id: "classic", label: "Netwerker", source: require("../../assets/characters/bugcatcher-classic.png") },
  { accent: "#47b7d0", id: "blue", label: "Flowjager", source: require("../../assets/characters/bugcatcher-blue.png") },
  { accent: "#f5b84b", id: "red", label: "Prikker", source: require("../../assets/characters/bugcatcher-red.png") },
  { accent: "#c6a8ff", id: "purple", label: "Debugheld", source: require("../../assets/characters/bugcatcher-purple.png") },
  { accent: "#a8bd6b", id: "lime", label: "Scout", source: require("../../assets/characters/bugcatcher-lime.png") },
  { accent: "#15724f", id: "gold", label: "Vanger", source: require("../../assets/characters/bugcatcher-gold.png") }
];

export function safeCharacterId(characterId?: string): CharacterId {
  return characterOptions.some((item) => item.id === characterId) ? characterId as CharacterId : defaultCharacterId;
}

export function characterOptionById(characterId?: string): CharacterOption {
  return characterOptions.find((item) => item.id === safeCharacterId(characterId)) ?? characterOptions[0];
}
