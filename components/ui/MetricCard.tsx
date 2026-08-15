import Link from "next/link";
import type { ReactNode } from "react";
import { TONE_FG, type Tone } from "./tones";

export function MetricCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  tone: Tone;
  href?: string;
}) {
  const content = (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${TONE_FG[tone]}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: href ? "pointer" : "default",
      }}
    >
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
