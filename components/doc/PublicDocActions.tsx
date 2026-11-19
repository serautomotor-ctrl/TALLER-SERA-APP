"use client";

import { whatsappLink } from "@/lib/contact";

const btn = {
  flex: 1,
  padding: "12px 16px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid #14161a",
  textAlign: "center" as const,
  textDecoration: "none",
  fontFamily: "inherit",
};

export function PublicDocActions({ whatsapp, label }: { whatsapp: string; label: string }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button type="button" onClick={() => window.print()} style={{ ...btn, background: "#14161a", color: "#fff" }}>
        Descargar PDF / Imprimir
      </button>
      {whatsapp && (
        <a href={whatsappLink(whatsapp, `Hola, tengo una consulta sobre ${label}.`)} target="_blank" rel="noreferrer" style={{ ...btn, background: "#1f7a46", color: "#fff", borderColor: "#1f7a46" }}>
          Preguntar por WhatsApp
        </a>
      )}
    </div>
  );
}
