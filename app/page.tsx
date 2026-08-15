import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { IconClock } from "@/components/ui/icons";
import { fmtDate, fmtDur, fmtEUR, fmtTime } from "@/lib/format";
import { finishedEntryDurationMs, startOfToday } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const [openOrders, vehicleCount, pendingAgg, todayEntries, activeEntry, recentOrders] = await Promise.all([
    prisma.order.count({ where: { status: { not: "cerrada" } } }),
    prisma.vehicle.count(),
    prisma.vehicle.aggregate({ _sum: { pendingPayments: true } }),
    prisma.timeEntry.findMany({ where: { start: { gte: startOfToday() } } }),
    prisma.timeEntry.findFirst({ where: { end: null }, orderBy: { start: "desc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const todayMs = todayEntries.reduce((sum, e) => sum + finishedEntryDurationMs(e), 0);
  const pendingTotal = Number(pendingAgg._sum.pendingPayments) || 0;

  return (
    <div>
      <Header title="Inicio" subtitle="Resumen del dia en el taller" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
        <MetricCard label="Ordenes abiertas" value={openOrders} tone="accent" href="/ordenes" />
        <MetricCard label="Vehiculos registrados" value={vehicleCount} tone="steel" href="/fichas" />
        <MetricCard label="Cobros pendientes" value={fmtEUR(pendingTotal)} tone="warning" href="/fichas" />
        <MetricCard label="Horas de hoy" value={fmtDur(todayMs)} tone="success" href="/horario" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle>Estado del control horario</SectionTitle>
          {activeEntry ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: activeEntry.paused ? "var(--color-warning)" : "var(--color-success)",
                  boxShadow: activeEntry.paused ? "none" : "0 0 0 4px var(--color-success-soft)",
                }}
              />
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--color-text-primary)", fontSize: 14 }}>
                  {activeEntry.task || "Tarea sin nombre"} {activeEntry.plate ? `· ${activeEntry.plate}` : ""}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  {activeEntry.paused ? "En pausa" : "En marcha"} desde las {fmtTime(activeEntry.start)}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5, marginTop: 10 }}>
              No hay ninguna tarea en marcha ahora mismo.
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <Link href="/horario" style={{ display: "inline-block" }}>
              <Button variant="primary" type="button">
                <IconClock /> Ir a control horario
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <SectionTitle>Ultimas ordenes</SectionTitle>
          {recentOrders.length === 0 && (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5, marginTop: 10 }}>
              Todavia no hay ordenes de reparacion creadas.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {recentOrders.map((o) => (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "var(--color-surface-2)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-text-primary)", fontWeight: 600 }}>
                    {o.plate}
                  </p>
                  <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>{fmtDate(o.createdAt)}</p>
                </div>
                <StatusPill status={o.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
