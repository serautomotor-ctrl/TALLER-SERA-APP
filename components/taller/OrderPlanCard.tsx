"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setOrderPlanning, setOrderStatus } from "@/app/ordenes/actions";

export type PlanOrder = {
  id: string;
  plate: string;
  description: string;
  status: string;
  vehicle: string;
  clientName: string;
  mechanicId: string | null;
  plannedDate: string;
  promisedAt: string;
  plannedHours: string;
  createdAt: string;
  late: boolean;
};

const FLOW = ["abierta", "en_progreso", "pendiente_piezas", "cerrada"];
const LABEL: Record<string, string> = { abierta: "Abierta", en_progreso: "En curso", pendiente_piezas: "Pend. piezas", cerrada: "Terminada" };

const input = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: "4px 6px",
  color: "var(--color-text-primary)",
  fontFamily: "var(--font-body)",
  fontSize: 12,
  width: "100%",
  minWidth: 0,
} as const;

export function OrderPlanCard({ order, mechanics, compact }: { order: PlanOrder; mechanics: { id: string; name: string; color: string }[]; compact?: boolean }) {
  const [pending, start] = useTransition();
  const mech = mechanics.find((m) => m.id === order.mechanicId);
  const idx = FLOW.indexOf(order.status);

  return (
    <div
      style={{
        background: "var(--color-surface-2)",
        borderRadius: 10,
        padding: 10,
        borderLeft: `4px solid ${mech?.color || "var(--color-border)"}`,
        opacity: pending ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
        <Link href={`/ordenes?q=${encodeURIComponent(order.plate)}`} style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>
          {order.plate}
        </Link>
        {order.late && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-danger)" }}>RETRASADA</span>}
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.35 }}>
        {[order.vehicle, order.clientName].filter(Boolean).join(" · ")}
        {order.description && <div style={{ color: "var(--color-text-primary)" }}>{order.description}</div>}
      </div>
      {!compact && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 5 }}>
          <select
            value={order.mechanicId || ""}
            onChange={(e) => start(() => setOrderPlanning(order.id, { mechanicId: e.target.value }))}
            style={{ ...input, gridColumn: "1 / -1" }}
            aria-label="Operario"
          >
            <option value="">Sin asignar</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <label style={labelStyle}>
            Dia de trabajo
            <input type="date" defaultValue={order.plannedDate} onChange={(e) => start(() => setOrderPlanning(order.id, { plannedDate: e.target.value }))} style={input} />
          </label>
          <label style={labelStyle}>
            Prometido
            <input type="date" defaultValue={order.promisedAt} onChange={(e) => start(() => setOrderPlanning(order.id, { promisedAt: e.target.value }))} style={input} />
          </label>
          <label style={labelStyle}>
            Horas previstas
            <input
              type="number"
              step="0.5"
              min="0"
              defaultValue={order.plannedHours}
              onBlur={(e) => e.target.value !== order.plannedHours && start(() => setOrderPlanning(order.id, { plannedHours: e.target.value }))}
              style={input}
            />
          </label>
        </div>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        <button type="button" disabled={idx <= 0} onClick={() => start(() => setOrderStatus(order.id, FLOW[idx - 1]))} style={moveBtn(idx <= 0)}>
          ← {idx > 0 ? LABEL[FLOW[idx - 1]] : ""}
        </button>
        <button type="button" disabled={idx >= FLOW.length - 1} onClick={() => start(() => setOrderStatus(order.id, FLOW[idx + 1]))} style={moveBtn(idx >= FLOW.length - 1)}>
          {idx < FLOW.length - 1 ? LABEL[FLOW[idx + 1]] : ""} →
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 2, fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--color-text-faint)", textTransform: "uppercase" as const };

function moveBtn(disabled: boolean) {
  return {
    flex: 1,
    padding: "5px 6px",
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: disabled ? "var(--color-text-faint)" : "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  } as const;
}
