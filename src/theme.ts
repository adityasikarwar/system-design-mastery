import { Palette } from "./types";

export const DARK: Palette = {
  bg: "#05060a", card: "#0c0d14", card2: "#10111a", border: "#1a1d2e", accent: "#f59e0b",
  green: "#10b981", red: "#ef4444", blue: "#3b82f6", purple: "#8b5cf6",
  cyan: "#06b6d4", text: "#dde1e8", dim: "#7a8499", muted: "#1a1d2e", orange: "#f97316", pink: "#ec4899",
  glow: "rgba(245,158,11,0.08)", glass: "rgba(12,13,20,0.85)",
  headText: "#fff", subText: "#9ca3af", checkBorder: "#2a2d3e", starOff: "#1e2433",
  hoverBg: "rgba(255,255,255,0.03)", cardHover: "#2a2d3e", scrollThumb: "#1a1d2e", scrollHover: "#2a2d3e",
  headerBg: "linear-gradient(180deg, rgba(12,13,20,0.95), rgba(5,6,10,0.98))", headerBorder: "rgba(255,255,255,0.04)",
  progressTrack: "rgba(26,29,46,0.5)", inputBg: "#0c0d14",
};

export const LIGHT: Palette = {
  bg: "#f5f5f7", card: "#ffffff", card2: "#f0f0f3", border: "#e0e0e6", accent: "#d97706",
  green: "#059669", red: "#dc2626", blue: "#2563eb", purple: "#7c3aed",
  cyan: "#0891b2", text: "#1f2937", dim: "#6b7280", muted: "#e5e7eb", orange: "#ea580c", pink: "#db2777",
  glow: "rgba(217,119,6,0.06)", glass: "rgba(255,255,255,0.9)",
  headText: "#111827", subText: "#4b5563", checkBorder: "#d1d5db", starOff: "#d1d5db",
  hoverBg: "rgba(0,0,0,0.03)", cardHover: "#d1d5db", scrollThumb: "#d1d5db", scrollHover: "#9ca3af",
  headerBg: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(245,245,247,0.98))", headerBorder: "rgba(0,0,0,0.08)",
  progressTrack: "rgba(0,0,0,0.06)", inputBg: "#ffffff",
};

// Difficulty badge colors (Easy / Medium / Hard).
export const DC = {
  Easy: { bg: "#052e16", text: "#4ade80" },
  Medium: { bg: "#1c1007", text: "#fbbf24" },
  Hard: { bg: "#2a0a0a", text: "#f87171" },
};
