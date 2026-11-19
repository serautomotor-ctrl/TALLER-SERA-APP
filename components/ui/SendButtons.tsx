"use client";

import { useState } from "react";
import { Button } from "./Button";
import { IconMail, IconWhatsapp, IconLink } from "./icons";
import { mailtoLink, whatsappLink } from "@/lib/contact";

/**
 * Botones para enviar un documento al cliente por WhatsApp o email,
 * con un enlace publico donde lo puede ver (y descargar en PDF).
 */
export function SendButtons({
  phone,
  email,
  subject,
  message,
  path,
  onSent,
}: {
  phone?: string;
  email?: string;
  subject: string;
  message: string;
  /** Ruta publica del documento, p. ej. /doc/factura/abc?t=... */
  path?: string;
  onSent?: (channel: "whatsapp" | "email") => void;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = () => (path ? `${window.location.origin}${path}` : "");
  const text = () => (path ? `${message}\n\n${fullUrl()}` : message);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          type="button"
          style={{ flex: 1, background: "#1f7a46", color: "#fff", border: "1px solid #1f7a46" }}
          onClick={() => {
            window.open(whatsappLink(phone, text()), "_blank");
            onSent?.("whatsapp");
          }}
        >
          <IconWhatsapp /> WhatsApp
        </Button>
        <Button
          type="button"
          style={{ flex: 1 }}
          onClick={() => {
            window.location.href = mailtoLink(email, subject, text());
            onSent?.("email");
          }}
        >
          <IconMail /> Email
        </Button>
        {path && (
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fullUrl());
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                window.prompt("Copia el enlace:", fullUrl());
              }
            }}
          >
            <IconLink /> {copied ? "Copiado" : "Enlace"}
          </Button>
        )}
      </div>
      {!phone && !email && (
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-text-faint)" }}>
          La ficha del cliente no tiene telefono ni email: tendras que elegir el contacto a mano.
        </p>
      )}
    </div>
  );
}
