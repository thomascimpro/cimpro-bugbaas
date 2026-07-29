export const playTabs = ["arcade", "ranking"] as const;

export type PlayTab = (typeof playTabs)[number];
