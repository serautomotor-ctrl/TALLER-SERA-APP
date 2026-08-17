"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { IconTrash } from "@/components/ui/icons";
import { fmtTime } from "@/lib/format";
import { convertAppointmentToOrder, removeAppointment, setAppointmentStatus } from "@/app/agenda/actions";

type Appointment = {
  id: string;
  date: Date;
  plate: string;
  clientName: string;
  reason: string;
  notes: string;
  status: string;
  orderId: string | null;
};

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "danger" }> = {
  pendiente: { label: "Pendiente", tone: "warning" },
  confirmada: { label: "Confirmada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

export function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const [, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--color-surface-2)", borderRadius: 8, padding: "10px 12px" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)", fontWeight: 700, minWidth: 46 }}>
        {fmtTime(appointment.date)}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>
          {appointment.clientName || "Sin nombre"} {appointment.plate ? `· ${appointment.plate}` : ""}
        </p>
        {appointment.reason && (
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>{appointment.reason}</p>
        )}
        {appointment.notes && (
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>{appointment.notes}</p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {appointment.orderId ? (
          <Link href={`/ordenes?qr=${appointment.orderId}`}>
            <Pill tone="steel">Ver orden</Pill>
          </Link>
        ) : (
          appointment.plate && (
            <form action={convertAppointmentToOrder.bind(null, appointment.id)}>
              <Button type="submit" style={{ fontSize: 12, padding: "5px 9px" }}>
                Convertir en orden
              </Button>
            </form>
          )
        )}
        {appointment.status !== "confirmada" && (
          <button
            type="button"
            onClick={() => startTransition(() => setAppointmentStatus(appointment.id, "confirmada"))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Pill tone="success">Confirmar</Pill>
          </button>
        )}
        {appointment.status !== "cancelada" && (
          <button
            type="button"
            onClick={() => startTransition(() => setAppointmentStatus(appointment.id, "cancelada"))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Pill tone="danger">Cancelar</Pill>
          </button>
        )}
        <Pill tone={STATUS[appointment.status]?.tone || "muted"}>{STATUS[appointment.status]?.label}</Pill>
        <button
          type="button"
          onClick={() => startTransition(() => removeAppointment(appointment.id))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}
