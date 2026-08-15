import type { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: 17,
        margin: 0,
        color: "var(--color-text-primary)",
        letterSpacing: 0.2,
      }}
    >
      {children}
    </h3>
  );
}
