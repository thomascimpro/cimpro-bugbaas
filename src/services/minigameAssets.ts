export const minigameAssets = {
  webRunner: {
    sheet: require("../../assets/minigames/unknown/ChatGPT Image 18 jun 2026, 12_17_33.webp")
  },
  arcade: {
    sheet: require("../../assets/minigames/unknown/ChatGPT Image 18 jun 2026, 12_18_21.webp")
  }
} as const;

export type SpriteRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const webRunnerSprites = {
  background: { x: 90, y: 28, width: 410, height: 180 },
  boot: { x: 825, y: 285, width: 275, height: 190 },
  coin: { x: 270, y: 275, width: 210, height: 205 },
  gem: { x: 525, y: 285, width: 230, height: 170 },
  jumpBug: { x: 785, y: 535, width: 270, height: 190 },
  leaf: { x: 1120, y: 35, width: 310, height: 170 },
  rock: { x: 500, y: 42, width: 230, height: 150 },
  runBug: { x: 255, y: 535, width: 260, height: 220 },
  web: { x: 745, y: 25, width: 335, height: 190 }
} as const;

export const nestDefenseSprites = {
  ant: { x: 1018, y: 62, width: 94, height: 98 },
  beetle: { x: 1116, y: 58, width: 112, height: 104 },
  nest: { x: 1232, y: 218, width: 236, height: 150 },
  spider: { x: 1234, y: 58, width: 118, height: 110 },
  webTrap: { x: 1012, y: 238, width: 112, height: 126 }
} as const;

export const bugGlideSprites = {
  bird: { x: 48, y: 706, width: 86, height: 78 },
  nectar: { x: 106, y: 842, width: 66, height: 78 },
  player: { x: 50, y: 568, width: 138, height: 124 },
  rain: { x: 220, y: 705, width: 74, height: 92 },
  shield: { x: 208, y: 838, width: 78, height: 86 },
  wind: { x: 308, y: 708, width: 112, height: 82 }
} as const;
