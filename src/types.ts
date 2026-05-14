// Shared app types. Loose by design — see tsconfig.json.

export type ThemeName = "dark" | "light";

// Per-problem spaced-repetition schedule entry.
export interface SREntry {
  interval: number;
  next: number;
  lastReview: number;
}

// The single JSON blob persisted per user (localStorage or Supabase).
export interface UserData {
  done: Record<string, boolean>;
  notes: Record<string, string>;
  weak: Record<string, boolean>;
  sr: Record<string, SREntry>;
  theme?: ThemeName;
}

// Theme palette — every key used across the UI.
export interface Palette {
  bg: string; card: string; card2: string; border: string; accent: string;
  green: string; red: string; blue: string; purple: string;
  cyan: string; text: string; dim: string; muted: string; orange: string; pink: string;
  glow: string; glass: string;
  headText: string; subText: string; checkBorder: string; starOff: string;
  hoverBg: string; cardHover: string; scrollThumb: string; scrollHover: string;
  headerBg: string; headerBorder: string;
  progressTrack: string; inputBg: string;
}

// A toast notification.
export interface Toast {
  msg: string;
  kind: "ok" | "err";
  id: number;
}
