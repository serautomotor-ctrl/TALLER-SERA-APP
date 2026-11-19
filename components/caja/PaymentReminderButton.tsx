"use client";

import { IconWhatsapp } from "@/components/ui/icons";
import { whatsappLink } from "@/lib/contact";

export function PaymentReminderButton({ phone, message, path }: { phone: string; message: string; path: string }) {
  return (
    <button
      type="button"
      title="Recordar el pago por WhatsApp"
      onClick={() => window.open(whatsappLink(phone, `${message}\n${window.location.origin}${path}`), "_blank")}
      style={{ background: "#1f7a46", color: "#fff", border: "none", borderRadius: 6, padding: "4px 6px", cursor: "pointer", display: "flex" }}
    >
      <IconWhatsapp />
    </button>
  );
}
