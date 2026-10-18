export const colors = {
  background: "#12101F",
  backgroundElevated: "#1B1730",
  surface: "#1E1A34",
  surfaceAlt: "#282247",
  border: "#332D54",
  primary: "#8B5CF6",
  primaryMuted: "#6D28D9",
  accent: "#EC4899",
  text: "#F5F3FF",
  muted: "#9C93C0",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#FB4570",
  live: "#FB4570",
} as const;

export const gradients = {
  background: ["#1B1730", "#0D0B18"] as const,
  card: ["#282247", "#1B1730"] as const,
  primary: ["#A855F7", "#6D28D9"] as const,
  hero: ["#4C1D95", "#12101F"] as const,
} as const;

export type ColorToken = keyof typeof colors;
