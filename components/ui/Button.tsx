"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { background: "var(--color-accent)", color: "#1A0E04", border: "1px solid var(--color-accent)" },
  secondary: { background: "var(--color-surface-2)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" },
  ghost: { background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" },
  danger: { background: "var(--color-danger-soft)", color: "var(--color-danger)", border: "1px solid color-mix(in srgb, var(--color-danger) 33%, transparent)" },
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "secondary", style, disabled, children, ...props }: Props) {
  return (
    <button
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 16px",
        borderRadius: 9,
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: 13.5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform 0.08s ease, opacity 0.15s ease",
        ...VARIANTS[variant],
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...props}
    >
      {children}
    </button>
  );
}
