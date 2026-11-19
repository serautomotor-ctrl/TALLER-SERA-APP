import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Select, TextInput } from "@/components/ui/inputs";
import { NewLoanForm } from "@/components/cortesia/NewLoanForm";
import { FUEL_LEVELS } from "@/lib/fuel";
import { LoanPrintButton } from "@/components/cortesia/LoanPrintButton";
import { fmtDate } from "@/lib/format";
import { startOfToday } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { returnLoan, saveCourtesyCar } from "./actions";

export const dynamic = "force-dynamic";

export default async function CortesiaPage() {
  const [cars, history, orders, vehicles, settings] = await Promise.all([
    prisma.courtesyCar.findMany({ orderBy: { plate: "asc" }, include: { loans: { where: { returnedAt: null } } } }),
    prisma.courtesyLoan.findMany({ where: { returnedAt: { not: null } }, orderBy: { returnedAt: "desc" }, take: 20, include: { car: true } }),
    prisma.order.findMany({ where: { status: { not: "cerrada" } }, orderBy: { createdAt: "desc" }, select: { id: true, plate: true } }),
    prisma.vehicle.findMany({ select: { plate: true, customer: { select: { name: true, phone: true } } } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);
  const byPlate = new Map(vehicles.map((v) => [v.plate, v.customer]));
  const today = startOfToday();
  const active = cars.flatMap((c) => c.loans.map((l) => ({ ...l, car: c })));
  const free = cars.filter((c) => c.active && c.loans.length === 0);
  const label = (c: { plate: string; brand: string; model: string }) => `${c.plate} ${[c.brand, c.model].filter(Boolean).join(" ")}`.trim();

  return (
    <div>
      <Header title="Vehiculos de cortesia" subtitle="Coches que prestas mientras reparas el del cliente: quien lo tiene, km, combustible y contrato firmado" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Coches de cortesia" value={cars.filter((c) => c.active).length} tone="steel" />
        <MetricCard label="Prestados ahora" value={active.length} tone="accent" />
        <MetricCard label="Libres" value={free.length} tone="success" />
        <MetricCard label="Devolucion atrasada" value={active.filter((l) => l.expectedBack && l.expectedBack < today).length} tone="danger" />
      </div>

      <div className="two-col" style={{ marginBottom: 14 }}>
        <Card>
          <SectionTitle>Prestados ahora</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {active.length === 0 && <p style={muted}>Ningun coche prestado.</p>}
            {active.map((l) => {
              const late = l.expectedBack && l.expectedBack < today;
              return (
                <div key={l.id} style={{ background: "var(--color-surface-2)", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{label(l.car)}</strong>
                    {late ? <Pill tone="danger">Atrasado</Pill> : <Pill tone="accent">Prestado</Pill>}
                  </div>
                  <p style={muted}>
                    {l.clientName} {l.phone && `· ${l.phone}`} {l.clientPlate && `· su coche ${l.clientPlate}`}
                    <br />
                    Desde {fmtDate(l.outAt)} {l.expectedBack && `· vuelve ${fmtDate(l.expectedBack)}`} · {l.kmOut ?? "?"} km · {l.fuelOut}
                  </p>
                  <form action={returnLoan.bind(null, l.id)} style={{ display: "grid", gridTemplateColumns: "90px 100px minmax(0,1fr) auto", gap: 6, marginTop: 8 }}>
                    <TextInput name="kmIn" type="number" placeholder="Km llegada" />
                    <Select name="fuelIn" defaultValue={l.fuelOut}>
                      {FUEL_LEVELS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </Select>
                    <TextInput name="notes" placeholder="Observaciones" defaultValue={l.notes} />
                    <Button type="submit" variant="primary">
                      Devuelto
                    </Button>
                  </form>
                  <div style={{ marginTop: 6 }}>
                    <LoanPrintButton
                      workshopName={settings.workshopName}
                      loan={{
                        carLabel: label(l.car),
                        clientName: l.clientName,
                        phone: l.phone,
                        clientPlate: l.clientPlate,
                        outAt: l.outAt.toLocaleString("es-ES"),
                        expectedBack: l.expectedBack ? fmtDate(l.expectedBack) : "",
                        kmOut: l.kmOut,
                        fuelOut: l.fuelOut,
                        notes: l.notes,
                        signatureUrl: l.signatureUrl,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Prestar un coche</SectionTitle>
          <div style={{ marginTop: 10 }}>
            <NewLoanForm
              cars={free.map((c) => ({ id: c.id, label: label(c) }))}
              orders={orders.map((o) => ({ id: o.id, plate: o.plate, clientName: byPlate.get(o.plate)?.name || "", phone: byPlate.get(o.plate)?.phone || "" }))}
            />
          </div>
        </Card>
      </div>

      <div className="two-col">
        <Card>
          <SectionTitle>Flota de cortesia</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {cars.map((c) => (
              <form key={c.id} action={saveCourtesyCar.bind(null, c.id)} style={{ display: "grid", gridTemplateColumns: "100px minmax(0,1fr) minmax(0,1fr) auto auto", gap: 6, alignItems: "center" }}>
                <TextInput name="plate" defaultValue={c.plate} style={{ textTransform: "uppercase" }} />
                <TextInput name="brand" defaultValue={c.brand} placeholder="Marca" />
                <TextInput name="model" defaultValue={c.model} placeholder="Modelo" />
                <label style={{ fontFamily: "var(--font-body)", fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="checkbox" name="active" defaultChecked={c.active} /> Activo
                </label>
                <Button type="submit">Guardar</Button>
              </form>
            ))}
            <form action={saveCourtesyCar.bind(null, null)} style={{ display: "grid", gridTemplateColumns: "100px minmax(0,1fr) minmax(0,1fr) auto", gap: 6, marginTop: 6 }}>
              <TextInput name="plate" placeholder="Matricula" required style={{ textTransform: "uppercase" }} />
              <TextInput name="brand" placeholder="Marca" />
              <TextInput name="model" placeholder="Modelo" />
              <Button type="submit" variant="primary">
                Anadir
              </Button>
            </form>
          </div>
        </Card>
        <Card>
          <SectionTitle>Ultimas devoluciones</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {history.length === 0 && <p style={muted}>Aun no hay historial.</p>}
            {history.map((l) => (
              <div key={l.id} style={rowStyle}>
                <span>
                  {l.car.plate} · {l.clientName}
                </span>
                <span>
                  {fmtDate(l.outAt)} → {l.returnedAt ? fmtDate(l.returnedAt) : ""}
                  {l.kmIn != null && l.kmOut != null ? ` · ${l.kmIn - l.kmOut} km` : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const muted = { margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  background: "var(--color-surface-2)",
  borderRadius: 8,
  padding: "7px 10px",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  color: "var(--color-text-primary)",
} as const;

