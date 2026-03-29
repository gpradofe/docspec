/**
 * Design tokens — dark theme matching docspec-poc.jsx exactly.
 * This is the single source of truth for all visual styling.
 */

/** Core design tokens */
export const T = {
  bg: "#0a0e17",
  surface: "rgba(255,255,255,0.02)",
  surfaceBorder: "#1e2430",
  surfaceHover: "#141926",
  cardBg: "rgba(255,255,255,0.015)",
  text: "#e2e8f0",
  textMuted: "#8b95a5",
  textDim: "#4b5563",
  textFaint: "#374151",
  accent: "#818cf8",
  accentDim: "#6366f1",
  accentBg: "rgba(129,140,248,0.08)",
  accentBorder: "rgba(129,140,248,0.15)",
  accentText: "#a5b4fc",
  green: "#34d399",
  greenBg: "rgba(52,211,153,0.08)",
  greenBorder: "rgba(52,211,153,0.15)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.15)",
  yellow: "#fbbf24",
  yellowBg: "rgba(251,191,36,0.08)",
  yellowBorder: "rgba(251,191,36,0.15)",
  blue: "#38bdf8",
  blueBg: "rgba(56,189,248,0.08)",
  blueBorder: "rgba(56,189,248,0.15)",
  orange: "#fb923c",
  orangeBg: "rgba(251,146,60,0.08)",
  pink: "#f472b6",
  codeBg: "#0d1117",
  codeBorder: "#1a1f2e",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sans: "'DM Sans', system-ui, sans-serif",
} as const;

/** HTTP method colors */
export const MC: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  POST: { bg: "rgba(52,211,153,0.12)", text: "#34d399", border: "rgba(52,211,153,0.25)" },
  PUT: { bg: "rgba(168,85,247,0.12)", text: "#c084fc", border: "rgba(168,85,247,0.25)" },
  DELETE: { bg: "rgba(248,113,113,0.12)", text: "#f87171", border: "rgba(248,113,113,0.25)" },
  PATCH: { bg: "rgba(251,146,60,0.12)", text: "#fb923c", border: "rgba(251,146,60,0.25)" },
  CLI: { bg: "rgba(52,211,153,0.12)", text: "#34d399", border: "rgba(52,211,153,0.25)" },
};

/** DSTI channel metadata */
export const CH: Record<string, { l: string; c: string }> = {
  naming: { l: "Naming", c: "#818cf8" },
  guards: { l: "Guards", c: "#34d399" },
  branches: { l: "Branches", c: "#38bdf8" },
  gap: { l: "Gap", c: "#fbbf24" },
  dataflow: { l: "Data Flow", c: "#06b6d4" },
  loops: { l: "Loops", c: "#60a5fa" },
  errors: { l: "Errors", c: "#f87171" },
  constants: { l: "Constants", c: "#c084fc" },
  messages: { l: "Messages", c: "#fb923c" },
  types: { l: "Types", c: "#a78bfa" },
  nullchecks: { l: "Null Checks", c: "#94a3b8" },
  assertions: { l: "Assertions", c: "#22d3ee" },
  logging: { l: "Logging", c: "#a3e635" },
};

/** Flow step type colors */
export const SC: Record<string, { bg: string; bd: string; i: string }> = {
  process: { bg: "rgba(129,140,248,0.08)", bd: "#818cf8", i: "PROC" },
  ai: { bg: "rgba(168,85,247,0.08)", bd: "#a855f7", i: "AI" },
  storage: { bg: "rgba(52,211,153,0.08)", bd: "#34d399", i: "DB" },
  trigger: { bg: "rgba(251,191,36,0.08)", bd: "#fbbf24", i: "TRIG" },
  retry: { bg: "rgba(248,113,113,0.08)", bd: "#f87171", i: "RETRY" },
  external: { bg: "rgba(56,189,248,0.08)", bd: "#38bdf8", i: "EXT" },
  merge: { bg: "rgba(251,146,60,0.08)", bd: "#fb923c", i: "MERGE" },
  observability: { bg: "rgba(139,92,246,0.08)", bd: "#8b5cf6", i: "OBS" },
};

/** Kind badge colors */
export const KIND_COLORS: Record<string, string> = {
  class: T.accent,
  interface: T.blue,
  enum: T.orange,
  record: T.green,
  annotation: T.pink,
  struct: T.yellow,
  trait: T.blue,
};
