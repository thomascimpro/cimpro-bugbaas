export type ResponsiveLayoutTier = "compact" | "phone" | "tablet" | "wide";

export type ResponsiveLayout = {
  bottomNavHeight: number;
  bottomNavInset: number;
  bottomNavMaxWidth: number;
  contentColumns: 1 | 2 | 3;
  contentMaxWidth: number;
  gameCanvasMaxWidth: number;
  gutter: number;
  headerTop: number;
  isCompact: boolean;
  isLandscape: boolean;
  isTablet: boolean;
  modalMaxWidth: number;
  navigationMode: "bottom" | "rail";
  navigationRailWidth: number;
  shellMaxWidth: number;
  tier: ResponsiveLayoutTier;
  touchTarget: number;
  uiScale: number;
};

export function createResponsiveLayout(width: number, height: number): ResponsiveLayout {
  const safeWidth = Math.max(320, Math.round(width));
  const safeHeight = Math.max(320, Math.round(height));
  const tier: ResponsiveLayoutTier = safeWidth < 380
    ? "compact"
    : safeWidth < 600
      ? "phone"
      : safeWidth < 1000
        ? "tablet"
        : "wide";
  const isTablet = tier === "tablet" || tier === "wide";

  if (tier === "compact") {
    return {
      bottomNavHeight: 68,
      bottomNavInset: 10,
      bottomNavMaxWidth: safeWidth,
      contentColumns: 1,
      contentMaxWidth: safeWidth,
      gameCanvasMaxWidth: safeWidth,
      gutter: 10,
      headerTop: 6,
      isCompact: true,
      isLandscape: safeWidth > safeHeight,
      isTablet: false,
      modalMaxWidth: safeWidth - 20,
      navigationMode: "bottom",
      navigationRailWidth: 0,
      shellMaxWidth: safeWidth,
      tier,
      touchTarget: 44,
      uiScale: 0.94
    };
  }

  if (tier === "phone") {
    return {
      bottomNavHeight: 72,
      bottomNavInset: 12,
      bottomNavMaxWidth: safeWidth,
      contentColumns: 1,
      contentMaxWidth: safeWidth,
      gameCanvasMaxWidth: safeWidth,
      gutter: 12,
      headerTop: 8,
      isCompact: false,
      isLandscape: safeWidth > safeHeight,
      isTablet: false,
      modalMaxWidth: Math.min(safeWidth - 24, 520),
      navigationMode: "bottom",
      navigationRailWidth: 0,
      shellMaxWidth: safeWidth,
      tier,
      touchTarget: 46,
      uiScale: 1
    };
  }

  if (tier === "tablet") {
    return {
      bottomNavHeight: 80,
      bottomNavInset: Math.max(20, Math.round((Math.min(safeWidth, 980) - 720) / 2)),
      bottomNavMaxWidth: 720,
      contentColumns: safeWidth > safeHeight ? 2 : 1,
      contentMaxWidth: Math.min(safeWidth, 900),
      gameCanvasMaxWidth: 720,
      gutter: 20,
      headerTop: 12,
      isCompact: false,
      isLandscape: safeWidth > safeHeight,
      isTablet,
      modalMaxWidth: 640,
      navigationMode: "bottom",
      navigationRailWidth: 0,
      shellMaxWidth: Math.min(safeWidth, 980),
      tier,
      touchTarget: 52,
      uiScale: 1.08
    };
  }

  return {
    bottomNavHeight: 84,
    bottomNavInset: 24,
    bottomNavMaxWidth: 760,
    contentColumns: 3,
    contentMaxWidth: 960,
    gameCanvasMaxWidth: 760,
    gutter: 24,
    headerTop: 14,
    isCompact: false,
    isLandscape: safeWidth > safeHeight,
    isTablet,
    modalMaxWidth: 720,
    navigationMode: "rail",
    navigationRailWidth: 92,
    shellMaxWidth: 1180,
    tier,
    touchTarget: 56,
    uiScale: 1.12
  };
}
