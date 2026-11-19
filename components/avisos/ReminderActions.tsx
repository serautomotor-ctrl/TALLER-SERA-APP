"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { IconMail, IconWhatsapp } from "@/components/ui/icons";
import { mailtoLink, whatsappLink } from "@/lib/contact";
import { markReminded, postponeReminder } from "@/app/avisos/actions";

export function ReminderActions({
  vehicleId,
  field,
  phone,
  email,
  subject,
  message,
}: {
  vehicleId: string;
  field: "itvDate" | "nextServiceDate";
  phone: string;
  email: string;
  subject: string;
  message: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Button
        type="button"
        style={{ background: "#1f7a46", color: "#fff", border: "1px solid #1f7a46" }}
        onClick={() => {
          window.open(whatsappLink(phone, message), "_blank");
          start(() => markReminded(vehicleId));
        }}
      >
        <IconWhatsapp /> Avisar
      </Button>
      {email && (
        <Button
          type="button"
          onClick={() => {
            window.location.href = mailtoLink(email, subject, message);
            start(() => markReminded(vehicleId));
          }}
        >
          <IconMail />
        </Button>
      )}
      <Button type="button" variant="ghost" disabled={pending} onClick={() => start(() => postponeReminder(vehicleId, field, 12))} title="Pasar la fecha un ano adelante (cuando ya esta hecho)">
        Hecho, +1 ano
      </Button>
    </div>
  );
}
