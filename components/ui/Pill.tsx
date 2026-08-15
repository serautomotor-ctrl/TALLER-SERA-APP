import type { ReactNode } from "react";
import { TONE_BG, TONE_FG, type Tone } from "./tones";

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        background: TONE_BG[tone],
        color: TONE_FG[tone],
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}
