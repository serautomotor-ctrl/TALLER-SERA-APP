import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";
import {
  addHistory,
  addPendingPayment,
  addWarranty,
  clearPending,
  removeWarranty,
  updateCustomer,
  updateVehicle,
} from "@/app/fichas/actions";
import type { Customer, HistoryEntry, Vehicle, Warranty } from "@/app/generated/prisma/client";

type VehicleWithRelations = Vehicle & {
  history: HistoryEntry[];
  warranties: Warranty[];
  customer: Customer & { vehicles: Vehicle[] };
};

export function FichaDetalle({ vehicle }: { vehicle: VehicleWithRelations }) {
  const pending = Number(vehicle.pendingPayments);
  const otherVehicles = vehicle.customer.vehicles.filter((v) => v.id !== vehicle.id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", letterSpacing: 1 }}>
              {vehicle.plate}
            </p>
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-muted)" }}>
              {vehicle.customer.name || "Sin nombre"} {vehicle.customer.phone ? `· ${vehicle.customer.phone}` : ""}
            </p>
            {(vehicle.brand || vehicle.model) && (
              <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-faint)" }}>
                {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                {vehicle.mileage != null ? ` · ${vehicle.mileage.toLocaleString("es-ES")} km` : ""}
              </p>
            )}
          </div>
          <Pill tone={pending > 0 ? "warning" : "success"}>{pending > 0 ? `Pendiente: ${fmtEUR(pending)}` : "Al dia"}</Pill>
        </div>

        {otherVehicles.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
            <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              Otros vehiculos de este cliente
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {otherVehicles.map((v) => (
                <Link key={v.id} href={`/fichas?id=${v.id}`}>
                  <Pill tone="steel">{v.plate}</Pill>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 14 }}>
        <Card>
          <SectionTitle>Datos del cliente</SectionTitle>
          <form action={updateCustomer.bind(null, vehicle.customer.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <Field label="Nombre">
              <TextInput name="name" defaultValue={vehicle.customer.name} style={{ width: "100%" }} />
            </Field>
            <Field label="Telefono">
              <TextInput name="phone" defaultValue={vehicle.customer.phone} style={{ width: "100%" }} />
            </Field>
            <Field label="Email">
              <TextInput name="email" type="email" defaultValue={vehicle.customer.email} style={{ width: "100%" }} />
            </Field>
            <Field label="Direccion">
              <TextInput name="address" defaultValue={vehicle.customer.address} style={{ width: "100%" }} />
            </Field>
            <Field label="DNI / CIF">
              <TextInput name="taxId" defaultValue={vehicle.customer.taxId} style={{ width: "100%" }} />
            </Field>
            <Button type="submit" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              Guardar cliente
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Datos del vehiculo</SectionTitle>
          <form action={updateVehicle.bind(null, vehicle.id)} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 }}>
              <Field label="Marca">
                <TextInput name="brand" defaultValue={vehicle.brand} style={{ width: "100%" }} />
              </Field>
              <Field label="Modelo">
                <TextInput name="model" defaultValue={vehicle.model} style={{ width: "100%" }} />
              </Field>
            </div>
            <Field label="Bastidor (VIN)">
              <TextInput name="vin" defaultValue={vehicle.vin} style={{ width: "100%" }} />
            </Field>
            <Field label="Kilometraje">
              <TextInput name="mileage" type="number" min="0" defaultValue={vehicle.mileage ?? ""} style={{ width: "100%" }} />
            </Field>
            <Button type="submit" style={{ alignSelf: "flex-start", marginTop: 4 }}>
              Guardar vehiculo
            </Button>
          </form>
        </Card>
      </div>

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
