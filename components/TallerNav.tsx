"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { canAccess, type SectionKey } from "@/lib/permissions";
import { IconBoard, IconCalendar, IconCard, IconClipboard, IconClock, IconHome, IconInvoice, IconLogout, IconQr, IconWrench } from "./ui/icons";
import { NAV_ICONS } from "./navIcons";
import { VoiceButton } from "./voz/VoiceButton";

type NavUser = { name: string; isAdmin: boolean; permissions: string[] } | null;

/** Accesos directos de la barra inferior. El resto de modulos esta en "Menu". */
const NAV_ITEMS: { href: string; label: string; icon: (p: object) => ReactNode; section: SectionKey | null }[] = [
  { href: "/", label: "Inicio", icon: IconHome, section: null },
  { href: "/taller", label: "Taller", icon: IconBoard, section: "taller" },
  { href: "/ordenes", label: "Ordenes", icon: IconQr, section: "ordenes" },
  { href: "/recepcion", label: "Recepcion", icon: IconClipboard, section: "recepcion" },
  { href: "/fichas", label: "Fichas", icon: IconCard, section: "fichas" },
  { href: "/agenda", label: "Agenda", icon: IconCalendar, section: "agenda" },
  { href: "/horario", label: "Horario", icon: IconClock, section: "horario" },
  { href: "/facturas", label: "Facturas", icon: IconInvoice, section: "facturas" },
];

export function TallerNav({ children, user }: { children: ReactNode; user: NavUser }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/sitio") || pathname.startsWith("/doc/")) {
    return <>{children}</>;
  }

  const items = NAV_ITEMS.filter((it) => !it.section || !user || canAccess(user, it.section));
  const MenuIcon = NAV_ICONS.menu;
  const menuActive = pathname === "/menu";

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)" }}>
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "16px 20px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1A0E04", flexShrink: 0 }}>
            <IconWrench />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
            Automecanica Sera
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user && (
            <span className="hide-mobile" style={{ fontSize: 12.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
              {user.name}
            </span>
          )}
          <Link href="/menu" style={pillLink}>
            <MenuIcon width={16} height={16} />
            Menu
          </Link>
          <form action={logout}>
            <button type="submit" style={{ ...pillLink, background: "transparent", color: "var(--color-text-faint)", cursor: "pointer" }}>
              <IconLogout />
              Salir
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, padding: "22px 24px", minWidth: 0, overflowY: "auto" }}>{children}</div>

      {(!user || canAccess(user, "ordenes")) && <VoiceButton />}

      <div
        className="no-print"
        style={{
          display: "flex",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
          return <NavLink key={item.href} href={item.href} label={item.label} active={active} icon={<Icon />} />;
        })}
        <NavLink href="/menu" label="Todo" active={menuActive} icon={<MenuIcon />} />
      </div>
    </div>
  );
}

function NavLink({ href, label, active, icon }: { href: string; label: string; active: boolean; icon: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        flex: "1 0 68px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "10px 4px 12px",
        whiteSpace: "nowrap",
        color: active ? "var(--color-accent)" : "var(--color-text-faint)",
        fontWeight: 600,
        fontSize: 11,
        borderTop: `2px solid ${active ? "var(--color-accent)" : "transparent"}`,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

const pillLink = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "6px 12px",
  color: "var(--color-text-muted)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 12.5,
} as const;
