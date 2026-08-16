import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { fmtDur, fmtEUR } from "@/lib/format";
import { finishedEntryDurationMs } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function RentabilidadPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  const isMonth = period !== "all";
  const since = isMonth ? startOfMonth() : undefined;

  const [invoices, orders, timeEntries, settings] = await Promise.all([
    prisma.invoice.findMany({ where: since ? { createdAt: { gte: since } } : undefined }),
    prisma.order.findMany({ where: since ? { createdAt: { gte: since } } : undefined, include: { items: true } }),
    prisma.timeEntry.findMany({ where: { end: { not: null }, ...(since ? { start: { gte: since } } : {}) } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const facturado = invoices.reduce((s, i) => s + Number(i.total), 0);

  const materialesVenta = orders.reduce((s, o) => s + o.items.reduce((s2, it) => s2 + it.qty * Number(it.price), 0), 0);
  const materialesCoste = orders.reduce((s, o) => s + o.items.reduce((s2, it) => s2 + it.qty * Number(it.costPrice), 0), 0);
  const margenMateriales = materialesVenta - materialesCoste;

  const horasMs = timeEntries.reduce((s, e) => s + finishedEntryDurationMs(e), 0);
  const horas = horasMs / 3600000;
  const hourlyRate = Number(settings.hourlyRate);
  const costeManoObra = horas * hourlyRate;

  const beneficioEstimado = facturado - materialesCoste - costeManoObra;

  return (
    <div>
      <Header
        title="Rentabilidad"
        subtitle="Vision economica del taller: facturado, coste de materiales y de mano de obra"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/rentabilidad?period=month">
              <Button variant={isMonth ? "primary" : "ghost"} type="button">
                Este mes
              </Button>
            </Link>
            <Link href="/rentabilidad?period=all">
              <Button variant={!isMonth ? "primary" : "ghost"} type="button">
                Todo
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Facturado" value={fmtEUR(facturado)} tone="accent" href="/facturas" />
        <MetricCard label="Coste de materiales" value={fmtEUR(materialesCoste)} tone="steel" />
        <MetricCard label="Coste de mano de obra" value={fmtEUR(costeManoObra)} tone="warning" href="/horario" />
        <MetricCard label="Beneficio estimado" value={fmtEUR(beneficioEstimado)} tone={beneficioEstimado >= 0 ? "success" : "danger"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle>Materiales usados en ordenes</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <Row label="Vendidos (precio de venta)" value={fmtEUR(materialesVenta)} />
            <Row label="Coste de compra" value={fmtEUR(materialesCoste)} />
            <Row label="Margen sobre materiales" value={fmtEUR(margenMateriales)} strong />
          </div>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-text-faint)" }}>
            Basado en el coste de compra que hayas indicado en el catalogo de articulos (Ordenes y QR &rarr; Articulos).
          </p>
        </Card>

        <Card>
          <SectionTitle>Horas trabajadas</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <Row label="Horas finalizadas" value={fmtDur(horasMs)} />
            <Row label="Tarifa configurada" value={hourlyRate ? `${fmtEUR(hourlyRate)} / hora` : "Sin configurar"} />
            <Row label="Coste total de mano de obra" value={fmtEUR(costeManoObra)} strong />
          </div>
          {!hourlyRate && (
            <p style={{ margin: "10px 0 0", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-warning)" }}>
              Configura la tarifa por hora en Ajustes para que este calculo sea real.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 500, color: strong ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-body)", fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500, color: strong ? "var(--color-accent)" : "var(--color-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
