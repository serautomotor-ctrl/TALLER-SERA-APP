import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MetricCard } from "@/components/ui/MetricCard";
import { Pill } from "@/components/ui/Pill";
import { NewBudgetButton } from "@/components/presupuestos/NewBudgetButton";
import { BudgetViewModal } from "@/components/presupuestos/BudgetViewModal";
import { fmtDate, fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PresupuestosPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;

  const [budgets, vehicles, settings] = await Promise.all([
    prisma.budget.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.vehicle.findMany({ orderBy: { plate: "asc" }, include: { customer: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const viewBudget = id ? budgets.find((b) => b.id === id) ?? null : null;
  const totalPresupuestado = budgets.reduce((s, b) => s + Number(b.total), 0);
  const facturados = budgets.filter((b) => b.invoiceId).length;

  return (
    <div>
      <Header
        title="Presupuestos"
        subtitle="Igual que las facturas, pero sin emitir. Cuando el cliente lo acepta, se convierten en factura con un boton"
        right={
          <NewBudgetButton
            vehicles={vehicles.map((v) => ({
              id: v.id,
              plate: v.plate,
              clientName: v.customer.name,
              clientNif: v.customer.taxId,
              clientAddress: v.customer.address,
            }))}
          />
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Presupuestos" value={budgets.length} tone="steel" />
        <MetricCard label="Importe presupuestado" value={fmtEUR(totalPresupuestado)} tone="accent" />
        <MetricCard label="Convertidos en factura" value={facturados} tone="success" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Datos del taller para el presupuesto</SectionTitle>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          {settings.workshopName || "Sin nombre"} · {settings.taxId || "sin NIF"} {settings.address ? `· ${settings.address}` : ""}
        </p>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>
          Se edita desde Ajustes.
        </p>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {budgets.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no se ha creado ningun presupuesto.
            </p>
          </Card>
        )}
        {budgets.map((b) => (
          <a key={b.id} href={`/presupuestos?id=${b.id}`} style={{ display: "block" }}>
            <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{b.number}</p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  {b.clientName || "Sin cliente"} {b.plate ? `· ${b.plate}` : ""} · {fmtDate(b.createdAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {b.invoiceId ? <Pill tone="success">Facturado</Pill> : <Pill tone="muted">Presupuesto</Pill>}
                <Pill tone="accent">{fmtEUR(Number(b.total))}</Pill>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {viewBudget && (
        <BudgetViewModal
          budget={{
            ...viewBudget,
            subtotal: Number(viewBudget.subtotal),
            vatTotal: Number(viewBudget.vatTotal),
            total: Number(viewBudget.total),
            items: viewBudget.items.map((it) => ({ ...it, unitPrice: Number(it.unitPrice) })),
          }}
          company={{
            workshopName: settings.workshopName,
            taxId: settings.taxId,
            address: settings.address,
            postalCode: settings.postalCode,
            city: settings.city,
            province: settings.province,
            phone: settings.phone,
            email: settings.email,
            logoUrl: settings.logoUrl,
          }}
        />
      )}
    </div>
  );
}
