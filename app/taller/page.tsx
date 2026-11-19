import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { OrderPlanCard, type PlanOrder } from "@/components/taller/OrderPlanCard";
import { addDaysToKey, nowMs, startOfToday, toDateKey } from "@/lib/time";
import { weekStartKey } from "@/lib/period";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { status: "abierta", label: "Pendientes de empezar", tone: "steel" as const },
  { status: "en_progreso", label: "En curso", tone: "accent" as const },
  { status: "pendiente_piezas", label: "Esperando piezas", tone: "warning" as const },
  { status: "cerrada", label: "Terminadas (7 dias)", tone: "success" as const },
];

const WORKDAY_HOURS = 8;

export default async function TallerPage({ searchParams }: { searchParams: Promise<{ vista?: string; semana?: string }> }) {
  const { vista = "tablero", semana } = await searchParams;
  const weekKey = weekStartKey(semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? semana : toDateKey(new Date()));
  const weekDays = Array.from({ length: 6 }, (_, i) => addDaysToKey(weekKey, i));
  const weekStart = new Date(`${weekKey}T00:00:00`);
  const weekEnd = new Date(`${weekDays[5]}T23:59:59`);
  const sevenDaysAgo = new Date(nowMs() - 7 * 86_400_000);

  const [orders, mechanics, vehicles] = await Promise.all([
    prisma.order.findMany({
      where: { OR: [{ status: { not: "cerrada" } }, { createdAt: { gte: sevenDaysAgo } }, { plannedDate: { gte: weekStart, lte: weekEnd } }] },
      orderBy: [{ plannedDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.mechanic.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { absences: { where: { to: { gte: weekStart }, from: { lte: weekEnd } } } },
    }),
    prisma.vehicle.findMany({ select: { plate: true, brand: true, model: true, customer: { select: { name: true } } } }),
  ]);

  const today = startOfToday();
  const vehicleByPlate = new Map(vehicles.map((v) => [v.plate, v]));
  const toPlan = (o: (typeof orders)[number]): PlanOrder => {
    const v = vehicleByPlate.get(o.plate);
    return {
      id: o.id,
      plate: o.plate,
      description: o.description,
      status: o.status,
      vehicle: v ? [v.brand, v.model].filter(Boolean).join(" ") : "",
      clientName: v?.customer.name || "",
      mechanicId: o.mechanicId,
      plannedDate: o.plannedDate ? toDateKey(o.plannedDate) : "",
      promisedAt: o.promisedAt ? toDateKey(o.promisedAt) : "",
      plannedHours: o.plannedHours ? String(o.plannedHours) : "",
      createdAt: toDateKey(o.createdAt),
      late: o.status !== "cerrada" && !!o.promisedAt && o.promisedAt < today,
    };
  };
  const plan = orders.map(toPlan);
  const mechList = mechanics.map((m) => ({ id: m.id, name: m.name, color: m.color }));

  const open = plan.filter((o) => o.status !== "cerrada");
  const late = open.filter((o) => o.late).length;
  const unassigned = open.filter((o) => !o.mechanicId).length;
  const waiting = open.filter((o) => o.status === "pendiente_piezas").length;

  const tab = (key: string, label: string) => (
    <Link href={`/taller?vista=${key}${key === "semana" ? `&semana=${weekKey}` : ""}`}>
      <Pill tone={vista === key ? "accent" : "muted"}>{label}</Pill>
    </Link>
  );

  return (
    <div>
      <Header
        title="Planificador del taller"
        subtitle="Estado de las reparaciones y reparto del trabajo entre operarios"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {tab("tablero", "Tablero")}
            {tab("semana", "Semana por operario")}
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Coches en el taller" value={open.length} tone="accent" />
        <MetricCard label="Sin operario" value={unassigned} tone={unassigned ? "warning" : "success"} />
        <MetricCard label="Esperando piezas" value={waiting} tone="steel" />
        <MetricCard label="Retrasadas" value={late} tone={late ? "danger" : "success"} />
      </div>

      {mechanics.length === 0 && (
        <Card style={{ marginBottom: 14 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
            Para repartir el trabajo, da de alta a los mecanicos en <Link href="/operarios" style={{ color: "var(--color-accent)" }}>Operarios</Link>.
          </p>
        </Card>
      )}

      {vista === "semana" ? (
        <WeekView weekKey={weekKey} weekDays={weekDays} plan={plan} mechanics={mechanics} mechList={mechList} />
      ) : (
        <div className="board-cols">
          {COLUMNS.map((col) => {
            const list = plan.filter((o) => o.status === col.status);
            return (
              <div key={col.status} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 10, minWidth: 220 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>{col.label}</span>
                  <Pill tone={col.tone}>{list.length}</Pill>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {list.length === 0 && <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>Nada aqui.</span>}
                  {list.map((o) => (
                    <OrderPlanCard key={o.id} order={o} mechanics={mechList} compact={col.status === "cerrada"} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekView({
  weekKey,
  weekDays,
  plan,
  mechanics,
  mechList,
}: {
  weekKey: string;
  weekDays: string[];
  plan: PlanOrder[];
  mechanics: { id: string; name: string; color: string; absences: { from: Date; to: Date; kind: string }[] }[];
  mechList: { id: string; name: string; color: string }[];
}) {
  const rows = [...mechanics.map((m) => ({ id: m.id as string | null, name: m.name, color: m.color, absences: m.absences })), { id: null, name: "Sin asignar", color: "var(--color-border)", absences: [] }];
  const todayKey = toDateKey(new Date());
  const unplanned = plan.filter((o) => o.status !== "cerrada" && !o.plannedDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href={`/taller?vista=semana&semana=${addDaysToKey(weekKey, -7)}`}>
          <Button type="button" variant="ghost">
            <IconChevronLeft />
          </Button>
        </Link>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>
          Semana del {new Date(`${weekKey}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
        </span>
        <Link href={`/taller?vista=semana&semana=${addDaysToKey(weekKey, 7)}`}>
          <Button type="button" variant="ghost">
            <IconChevronRight />
          </Button>
        </Link>
        <Link href="/taller?vista=semana">
          <Button type="button" variant="ghost">
            Hoy
          </Button>
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `130px repeat(6, minmax(170px, 1fr))`, gap: 6, minWidth: 1150 }}>
          <div />
          {weekDays.map((d) => (
            <div
              key={d}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "capitalize",
                padding: "4px 6px",
                color: d === todayKey ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
            >
              {new Date(`${d}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric" })}
            </div>
          ))}
          {rows.map((r) => (
            <RowCells key={r.id || "none"} row={r} weekDays={weekDays} plan={plan} mechList={mechList} />
          ))}
        </div>
      </div>

      <Card>
        <p style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15 }}>Sin dia asignado ({unplanned.length})</p>
        <p style={{ margin: "0 0 10px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>Ponles un dia de trabajo para que salgan en la semana.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
          {unplanned.map((o) => (
            <OrderPlanCard key={o.id} order={o} mechanics={mechList} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function RowCells({
  row,
  weekDays,
  plan,
  mechList,
}: {
  row: { id: string | null; name: string; color: string; absences: { from: Date; to: Date; kind: string }[] };
  weekDays: string[];
  plan: PlanOrder[];
  mechList: { id: string; name: string; color: string }[];
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, padding: "6px 4px" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
        {row.name}
      </div>
      {weekDays.map((d) => {
        const date = new Date(`${d}T12:00:00`);
        const absence = row.absences.find((a) => a.from <= date && a.to >= date);
        const list = plan.filter((o) => o.plannedDate === d && (o.mechanicId || null) === row.id);
        const hours = list.reduce((s, o) => s + (parseFloat(o.plannedHours) || 0), 0);
        const over = hours > WORKDAY_HOURS;
        return (
          <div
            key={d}
            style={{
              background: absence ? "repeating-linear-gradient(45deg, var(--color-surface), var(--color-surface) 6px, var(--color-surface-2) 6px, var(--color-surface-2) 12px)" : "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 6,
              minHeight: 70,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {absence && <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--color-warning)", textTransform: "uppercase" }}>{absence.kind}</span>}
            {hours > 0 && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: over ? "var(--color-danger)" : "var(--color-text-faint)" }}>
                {hours} h de {WORKDAY_HOURS} h{over ? " · sobrecargado" : ""}
              </span>
            )}
            {list.map((o) => (
              <OrderPlanCard key={o.id} order={o} mechanics={mechList} />
            ))}
          </div>
        );
      })}
    </>
  );
}
