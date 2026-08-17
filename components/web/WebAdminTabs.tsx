import Link from "next/link";

const TABS = [
  { href: "/web/vehiculos", label: "Vehiculos de ocasion" },
  { href: "/web/productos", label: "Productos" },
  { href: "/web/servicios", label: "Servicios" },
];

export function WebAdminTabs({ active }: { active: "vehiculos" | "productos" | "servicios" }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {TABS.map((t) => {
        const isActive = t.href.endsWith(active);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: "8px 14px",
              borderRadius: 9,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 13,
              background: isActive ? "var(--color-accent-soft)" : "var(--color-surface-2)",
              color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
              border: `1px solid ${isActive ? "color-mix(in srgb, var(--color-accent) 33%, transparent)" : "var(--color-border)"}`,
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
