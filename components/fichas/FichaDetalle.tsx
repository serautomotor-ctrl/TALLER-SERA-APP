import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";
import { addHistory, addPendingPayment, addWarranty, clearPending, removeWarranty } from "@/app/fichas/actions";
import type { HistoryEntry, Vehicle, Warranty } from "@/app/generated/prisma/client";

type VehicleWithRelations = Vehicle & { history: HistoryEntry[]; warranties: Warranty[] };

export function FichaDetalle({ vehicle }: { vehicle: VehicleWithRelations }) {
  const pending = Number(vehicle.pendingPayments);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", letterSpacing: 1 }}>
              {vehicle.plate}
            </p>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-muted)" }}>
              {vehicle.clientName || "Sin nombre"} {vehicle.phone ? `· ${vehicle.phone}` : ""}
            </p>
            {vehicle.model && (
              <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-faint)" }}>{vehicle.model}</p>
            )}
          </div>
          <Pill tone={pending > 0 ? "warning" : "success"}>{pending > 0 ? `Pendiente: ${fmtEUR(pending)}` : "Al dia"}</Pill>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
        <Card>
          <SectionTitle>Garantias vigentes</SectionTitle>
          <form action={addWarranty.bind(null, vehicle.id)} style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput name="text" placeholder="Ej: correa distribucion, 12 meses" style={{ flex: 1 }} />
            <Button type="submit">
              <IconPlus />
            </Button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {vehicle.warranties.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Sin garantias registradas.</p>
            )}
            {vehicle.warranties.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{w.text}</span>
                <form action={removeWarranty.bind(null, w.id)}>
                  <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                    <IconTrash />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Cobros pendientes</SectionTitle>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: pending > 0 ? "var(--color-warning)" : "var(--color-success)", margin: "8px 0" }}>
            {fmtEUR(pending)}
          </p>
          <form action={addPendingPayment.bind(null, vehicle.id)} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <TextInput name="amount" placeholder="Importe a anadir" style={{ flex: 1 }} />
            <Button type="submit">
              <IconPlus />
            </Button>
          </form>
          <form action={clearPending.bind(null, vehicle.id)}>
            <Button variant="ghost" type="submit" style={{ width: "100%" }}>
              Marcar como cobrado
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <SectionTitle>Historial del vehiculo</SectionTitle>
        <form action={addHistory.bind(null, vehicle.id)} style={{ display: "flex", gap: 8, margin: "10px 0" }}>
          <TextInput name="text" placeholder="Anadir entrada al historial" style={{ flex: 1 }} />
          <Button type="submit">
            <IconPlus />
          </Button>
        </form>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {vehicle.history.length === 0 && (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Sin entradas en el historial.</p>
          )}
          {vehicle.history.map((h) => (
            <div key={h.id} style={{ display: "flex", gap: 10, padding: "8px 10px", background: "var(--color-surface-2)", borderRadius: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--color-text-faint)", minWidth: 74 }}>{fmtDate(h.date)}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{h.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
