import type { ReactNode } from "react";

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 0.3,
            color: "var(--color-text-primary)",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-text-muted)", margin: "4px 0 0" }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}
