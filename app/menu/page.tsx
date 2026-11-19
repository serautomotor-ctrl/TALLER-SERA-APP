import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { NAV_ICONS } from "@/components/navIcons";
import { SECTIONS, canAccess } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const HREF: Record<string, string> = { web: "/web/vehiculos" };
const GROUPS = ["Taller", "Oficina", "Gestion"] as const;

export default async function MenuPage() {
  const user = await getSessionUser();
  const visible = SECTIONS.filter((s) => !user || canAccess(user, s.key));

  return (
    <div>
      <Header title="Todos los modulos" subtitle="Todo lo que puedes hacer en el programa, ordenado por areas" />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {GROUPS.map((g) => {
          const list = visible.filter((s) => s.group === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {g === "Gestion" ? "Gestion y administracion" : g}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {list.map((s) => {
                  const Icon = NAV_ICONS[s.key];
                  return (
                    <Link
                      key={s.key}
                      href={HREF[s.key] || s.paths[0]}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: "14px 14px",
                        borderRadius: 12,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 13.5,
                      }}
                    >
                      <span style={{ color: "var(--color-accent)" }}>
                        <Icon />
                      </span>
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
