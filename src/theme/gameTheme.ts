export const gameTheme = {
  colors: {
    background: "#061812",
    backgroundSoft: "#0b241b",
    backgroundRaised: "#123428",
    surface: "rgba(10, 36, 27, 0.88)",
    surfaceSoft: "rgba(255, 255, 255, 0.07)",
    surfaceRaised: "rgba(18, 57, 42, 0.94)",
    surfaceCream: "#f8f6e9",
    surfaceCreamSoft: "#fffdf5",
    border: "rgba(241, 214, 120, 0.28)",
    borderStrong: "rgba(241, 214, 120, 0.58)",
    accent: "#e7cc72",
    accentStrong: "#f4dc83",
    accentInk: "#173126",
    ink: "#173126",
    inkMuted: "#557064",
    text: "#f7fbf8",
    textMuted: "#a9c1b4",
    textFaint: "#789485",
    danger: "#db5e52",
    success: "#65c98f"
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999
  },
  typography: {
    eyebrow: 9,
    label: 11,
    body: 13,
    bodyLarge: 15,
    title: 24,
    display: 34
  },
  motion: {
    fast: 140,
    normal: 240,
    reveal: 520,
    ambient: 1800
  },
  palettes: {
    neutral: {
      background: "#101519",
      backgroundSoft: "#1a2227",
      surface: "#f7f2e5",
      surfaceRaised: "#fffaf0",
      border: "#c8a85b",
      accent: "#d5ad48",
      accentSoft: "#f2dfaa",
      ink: "#20282c",
      muted: "#657077",
      glow: "rgba(213, 173, 72, 0.28)"
    },
    world: {
      background: "#0b241b",
      backgroundSoft: "#173a2b",
      surface: "#f3eddc",
      surfaceRaised: "#fffaf0",
      border: "#b28d45",
      accent: "#d9b452",
      accentSoft: "#eadba8",
      ink: "#18352a",
      muted: "#64776d",
      glow: "rgba(120, 184, 112, 0.30)"
    },
    scan: {
      background: "#07161d",
      backgroundSoft: "#102a34",
      surface: "#e9f4f3",
      surfaceRaised: "#f7fcfb",
      border: "#45b8be",
      accent: "#55d9d5",
      accentSoft: "#b9ebe6",
      ink: "#102d34",
      muted: "#54727a",
      glow: "rgba(85, 217, 213, 0.30)"
    },
    play: {
      background: "#130f25",
      backgroundSoft: "#292044",
      surface: "#f4edf8",
      surfaceRaised: "#fff9ff",
      border: "#8e73c6",
      accent: "#ffbd4a",
      accentSoft: "#f5dca4",
      ink: "#2b2140",
      muted: "#746984",
      glow: "rgba(135, 99, 220, 0.32)"
    },
    collection: {
      background: "#20170f",
      backgroundSoft: "#3a2a1b",
      surface: "#f5ead2",
      surfaceRaised: "#fff9ec",
      border: "#b6853f",
      accent: "#d3a34d",
      accentSoft: "#ecd8aa",
      ink: "#3c2b19",
      muted: "#796b58",
      glow: "rgba(211, 163, 77, 0.30)"
    },
    profile: {
      background: "#101d2a",
      backgroundSoft: "#1b3448",
      surface: "#edf3f5",
      surfaceRaised: "#f9fcfd",
      border: "#6ba1bd",
      accent: "#f1b75c",
      accentSoft: "#f3d9a9",
      ink: "#173043",
      muted: "#637987",
      glow: "rgba(94, 167, 203, 0.30)"
    },
    event: {
      background: "#251014",
      backgroundSoft: "#4a1c25",
      surface: "#f8ece7",
      surfaceRaised: "#fff8f4",
      border: "#c76b56",
      accent: "#ffbd4a",
      accentSoft: "#f4d6a2",
      ink: "#45231e",
      muted: "#826e68",
      glow: "rgba(221, 79, 69, 0.30)"
    }
  },
  shadow: {
    color: "#000000",
    opacity: 0.28,
    radius: 18,
    y: 8
  }
} as const;
