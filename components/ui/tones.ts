export type Tone = "muted" | "success" | "warning" | "danger" | "accent" | "steel";

export const TONE_BG: Record<Tone, string> = {
  muted: "var(--color-surface-3)",
  success: "var(--color-success-soft)",
  warning: "var(--color-warning-soft)",
  danger: "var(--color-danger-soft)",
  accent: "var(--color-accent-soft)",
  steel: "var(--color-steel-soft)",
};

export const TONE_FG: Record<Tone, string> = {
  muted: "var(--color-text-muted)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  accent: "var(--color-accent)",
  steel: "var(--color-steel)",
};
