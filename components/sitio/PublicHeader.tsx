"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconCart, IconWrench } from "@/components/ui/icons";
import { useCart } from "./CartContext";

const NAV_ITEMS = [
  { href: "/sitio", label: "Inicio" },
  { href: "/sitio/servicios", label: "Servicios" },
  { href: "/sitio/ocasion", label: "Vehiculos de ocasion" },
  { href: "/sitio/productos", label: "Productos" },
  { href: "/sitio/contacto", label: "Contacto" },
];

export function PublicHeader({ workshopName, logoUrl }: { workshopName: string; logoUrl: string }) {
  const pathname = usePathname();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 20px", maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/sitio" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={workshopName} style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "#1A0E04", flexShrink: 0 }}>
              <IconWrench />
            </div>
          )}
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {workshopName}
          </span>
        </Link>

        <nav style={{ display: "none", gap: 22 }} className="sitio-nav-desktop">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 13.5,
                color: pathname === item.href ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/sitio/carrito" style={{ position: "relative", color: "var(--color-text-primary)" }}>
            <IconCart />
            {count > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -9,
                  background: "var(--color-accent)",
                  color: "#1A0E04",
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="sitio-menu-btn"
            style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 8, padding: "7px 10px", color: "var(--color-text-primary)", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600 }}
          >
            Menu
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "10px 20px", display: "flex", flexDirection: "column", gap: 4 }} className="sitio-menu-mobile">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "8px 4px",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 14,
                color: pathname === item.href ? "var(--color-accent)" : "var(--color-text-primary)",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: 820px) {
          .sitio-nav-desktop { display: flex !important; }
          .sitio-menu-btn { display: none !important; }
          .sitio-menu-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
