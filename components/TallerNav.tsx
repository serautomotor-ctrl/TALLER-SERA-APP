"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import {
  IconCalendar,
  IconChart,
  IconClipboard,
  IconClock,
  IconCard,
  IconHome,
  IconInvoice,
  IconLogout,
  IconQr,
  IconSettings,
  IconSparkle,
  IconWrench,
} from "./ui/icons";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: IconHome },
  { href: "/horario", label: "Horario", icon: IconClock },
  { href: "/fichas", label: "Fichas", icon: IconCard },
  { href: "/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/recepcion", label: "Recepcion", icon: IconClipboard },
  { href: "/ordenes", label: "Ordenes y QR", icon: IconQr },
  { href: "/facturas", label: "Facturas", icon: IconInvoice },
  { href: "/diagnostico", label: "Diagnostico", icon: IconSparkle },
  { href: "/rentabilidad", label: "Rentabilidad", icon: IconChart },
  { href: "/ajustes", label: "Ajustes", icon: IconSettings },
];

export function TallerNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)" }}>
      <div
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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1A0E04" }}>
            <IconWrench />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Automecanica Sera
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pathname !== "/" && (
            <Link
              href="/"
              style={{
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
              }}
            >
              <IconHome />
              Inicio
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "var(--color-text-faint)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <IconLogout />
              Salir
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, padding: "22px 24px", minWidth: 0, overflowY: "auto" }}>{children}</div>

      <div
        style={{
          display: "flex",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: "1 0 72px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "10px 4px 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: "transparent",
                color: active ? "var(--color-accent)" : "var(--color-text-faint)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 11,
                borderTop: `2px solid ${active ? "var(--color-accent)" : "transparent"}`,
              }}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
