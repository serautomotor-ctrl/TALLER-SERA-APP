import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { MetricCard } from "@/components/ui/MetricCard";
import { Pill } from "@/components/ui/Pill";
import { ReminderActions } from "@/components/avisos/ReminderActions";
import { fmtDate } from "@/lib/format";
import { firstName } from "@/lib/contact";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function AvisosPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias = "30" } = await searchParams;
  const days = Math.min(365, Math.max(7, parseInt(dias, 10) || 30));
  const now = new Date();
  const limit = new Date(now.getTime() + days * DAY);

  const [vehicles, settings] = await Promise.all([
    prisma.vehicle.findMany({
      where: { OR: [{ itvDate: { lte: limit } }, { nextServiceDate: { lte: limit } }] },
      include: { customer: true },
    }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  type Row = { key: string; vehicleId: string; plate: string; name: string; phone: string; email: string; kind: "ITV" | "Revision"; field: "itvDate" | "nextServiceDate"; date: Date; note: string; lastReminderAt: Date | null };
  const rows: Row[] = [];
  for (const v of vehicles) {
    const base = { vehicleId: v.id, plate: v.plate, name: v.customer.name, phone: v.customer.phone, email: v.customer.email, lastReminderAt: v.lastReminderAt };
    if (v.itvDate && v.itvDate <= limit) rows.push({ ...base, key: v.id + "itv", kind: "ITV", field: "itvDate", date: v.itvDate, note: "" });
    if (v.nextServiceDate && v.nextServiceDate <= limit)
      rows.push({ ...base, key: v.id + "rev", kind: "Revision", field: "nextServiceDate", date: v.nextServiceDate, note: v.reminderNote });
  }
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const overdue = rows.filter((r) => r.date < now).length;
  const sentRecently = rows.filter((r) => r.lastReminderAt && now.getTime() - r.lastReminderAt.getTime() < 30 * DAY).length;

  const message = (r: Row) => {
    const hola = `Hola${firstName(r.name) ? " " + firstName(r.name) : ""}`;
    const cuando = r.date < now ? `vencio el ${fmtDate(r.date)}` : `vence el ${fmtDate(r.date)}`;
    const que = r.kind === "ITV" ? `la ITV de tu vehiculo ${r.plate} ${cuando}` : `a tu vehiculo ${r.plate} le toca la revision${r.note ? ` (${r.note})` : ""}: ${cuando}`;
    return `${hola}, te escribimos de ${settings.workshopName}. Te recordamos que ${que}. ¿Quieres que te demos cita? Responde a este mensaje y te buscamos hueco.`;
  };

  return (
    <div>
      <Header
        title="Avisos a clientes"
        subtitle="ITV y revisiones que vencen pronto. Las fechas se ponen en la ficha de cada vehiculo"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {[15, 30, 60, 90].map((d) => (
              <Link key={d} href={`/avisos?dias=${d}`}>
                <Pill tone={d === days ? "accent" : "muted"}>{d} dias</Pill>
              </Link>
            ))}
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Avisos pendientes" value={rows.length} tone="accent" />
        <MetricCard label="Ya vencidos" value={overdue} tone={overdue ? "danger" : "success"} />
        <MetricCard label="Avisados este mes" value={sentRecently} tone="steel" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && (
          <Card>
            <p style={{ margin: 0, fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              No hay ITV ni revisiones en los proximos {days} dias. Para que salgan aqui, rellena &laquo;Proxima ITV&raquo; y &laquo;Proxima revision&raquo; en la
              ficha del vehiculo.
            </p>
          </Card>
        )}
        {rows.map((r) => {
          const isOver = r.date < now;
          const daysLeft = Math.round((r.date.getTime() - now.getTime()) / DAY);
          return (
            <Card key={r.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Link href={`/fichas?id=${r.vehicleId}`} style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
                    {r.plate}
                  </Link>
                  <Pill tone={r.kind === "ITV" ? "steel" : "accent"}>{r.kind}</Pill>
                  <Pill tone={isOver ? "danger" : daysLeft <= 7 ? "warning" : "muted"}>
                    {isOver ? `Vencido hace ${-daysLeft} dias` : daysLeft === 0 ? "Hoy" : `En ${daysLeft} dias`}
                  </Pill>
                </div>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  {r.name || "Sin nombre"} {r.phone ? `· ${r.phone}` : "· sin telefono"} · {fmtDate(r.date)}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
                {r.lastReminderAt && (
                  <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-success)" }}>Ultimo aviso: {fmtDate(r.lastReminderAt)}</p>
                )}
              </div>
              <ReminderActions vehicleId={r.vehicleId} field={r.field} phone={r.phone} email={r.email} subject={`Aviso de ${r.kind} - ${settings.workshopName}`} message={message(r)} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
