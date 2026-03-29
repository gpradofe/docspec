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
export const CH: Record<string, { i: string; l: string; c: string }> = {
  naming: { i: "\u{1F524}", l: "Naming", c: "#818cf8" },
  guards: { i: "\u{1F6E1}\uFE0F", l: "Guards", c: "#34d399" },
  branches: { i: "\u{1F33F}", l: "Branches", c: "#38bdf8" },
  gap: { i: "\u26A0\uFE0F", l: "Gap", c: "#fbbf24" },
  dataflow: { i: "\u{1F500}", l: "Data Flow", c: "#06b6d4" },
  loops: { i: "\u{1F504}", l: "Loops", c: "#60a5fa" },
  errors: { i: "\u{1F4A5}", l: "Errors", c: "#f87171" },
  constants: { i: "\u{1F4CC}", l: "Constants", c: "#c084fc" },
  messages: { i: "\u{1F4AC}", l: "Messages", c: "#fb923c" },
  types: { i: "\u{1F4D0}", l: "Types", c: "#a78bfa" },
  nullchecks: { i: "\u2753", l: "Null Checks", c: "#94a3b8" },
  assertions: { i: "\u2714\uFE0F", l: "Assertions", c: "#22d3ee" },
  logging: { i: "\u{1F4DD}", l: "Logging", c: "#a3e635" },
};

/** Flow step type colors */
export const SC: Record<string, { bg: string; bd: string; i: string }> = {
  process: { bg: "rgba(129,140,248,0.08)", bd: "#818cf8", i: "\u2699\uFE0F" },
  ai: { bg: "rgba(168,85,247,0.08)", bd: "#a855f7", i: "\u{1F9E0}" },
  storage: { bg: "rgba(52,211,153,0.08)", bd: "#34d399", i: "\u{1F4BE}" },
  trigger: { bg: "rgba(251,191,36,0.08)", bd: "#fbbf24", i: "\u26A1" },
  retry: { bg: "rgba(248,113,113,0.08)", bd: "#f87171", i: "\u{1F504}" },
  external: { bg: "rgba(56,189,248,0.08)", bd: "#38bdf8", i: "\u{1F310}" },
  merge: { bg: "rgba(251,146,60,0.08)", bd: "#fb923c", i: "\u{1F500}" },
  observability: { bg: "rgba(139,92,246,0.08)", bd: "#8b5cf6", i: "\u{1F4CA}" },
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
