import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { MetricCard } from "@/components/ui/MetricCard";
import { IconChevronLeft, IconChevronRight, IconPrint, IconTrash } from "@/components/ui/icons";
import { fmtDate, fmtDur, fmtEUR, fmtTime } from "@/lib/format";
import { finishedEntryDurationMs, nowMs } from "@/lib/time";
import { currentMonthKey, monthBounds, monthLabel, overlapDays, shiftMonthKey } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { addAbsence, createMechanic, removeAbsence, toggleClock, updateMechanic } from "./actions";

export const dynamic = "force-dynamic";

const ABSENCE: Record<string, { label: string; tone: "steel" | "danger" | "warning" }> = {
  vacaciones: { label: "Vacaciones", tone: "steel" },
  baja: { label: "Baja", tone: "danger" },
  ausencia: { label: "Ausencia", tone: "warning" },
};

export default async function OperariosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const monthKey = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonthKey();
  const { start, end } = monthBounds(monthKey);

  const mechanics = await prisma.mechanic.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      clockings: { where: { in: { gte: start, lte: end } }, orderBy: { in: "asc" } },
      timeEntries: { where: { start: { gte: start, lte: end } } },
      absences: { where: { to: { gte: start }, from: { lte: end } }, orderBy: { from: "asc" } },
      orders: { where: { status: { not: "cerrada" } }, select: { id: true } },
    },
  });
  const openClocks = await prisma.clocking.findMany({ where: { out: null }, orderBy: { in: "desc" } });

  const clockMs = (c: { in: Date; out: Date | null }) => (c.out ? c.out.getTime() : nowMs()) - c.in.getTime();

  const stats = mechanics.map((m) => {
    const presenceMs = m.clockings.reduce((s, c) => s + clockMs(c), 0);
    const productiveMs = m.timeEntries.reduce((s, e) => s + finishedEntryDurationMs(e), 0);
    const absenceDays = m.absences.reduce((s, a) => s + overlapDays(a.from, a.to, start, end), 0);
    const efficiency = presenceMs > 0 ? Math.round((productiveMs / presenceMs) * 100) : null;
    const cost = (presenceMs / 3_600_000) * Number(m.hourlyCost);
    return { m, presenceMs, productiveMs, absenceDays, efficiency, cost };
  });

  const totalPresence = stats.reduce((s, x) => s + x.presenceMs, 0);
  const totalProductive = stats.reduce((s, x) => s + x.productiveMs, 0);
  const active = mechanics.filter((m) => m.active);

  return (
    <div>
      <Header
        title="Operarios"
        subtitle="Mecanicos del taller, fichaje de entrada y salida, vacaciones, bajas e informe de rendimiento"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href={`/operarios?mes=${shiftMonthKey(monthKey, -1)}`}>
              <Button type="button" variant="ghost">
                <IconChevronLeft />
              </Button>
            </Link>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, textTransform: "capitalize", minWidth: 130, textAlign: "center" }}>
              {monthLabel(monthKey)}
            </span>
            <Link href={`/operarios?mes=${shiftMonthKey(monthKey, 1)}`}>
              <Button type="button" variant="ghost">
                <IconChevronRight />
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Operarios activos" value={active.length} tone="steel" />
        <MetricCard label="Fichados ahora" value={openClocks.length} tone="success" />
        <MetricCard label="Horas de presencia" value={fmtDur(totalPresence)} tone="accent" />
        <MetricCard
          label="Horas productivas"
          value={`${fmtDur(totalProductive)}${totalPresence ? ` · ${Math.round((totalProductive / totalPresence) * 100)}%` : ""}`}
          tone="warning"
        />
      </div>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Fichar entrada / salida</SectionTitle>
        <p style={{ margin: "4px 0 12px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
          Registro de jornada obligatorio. Cada operario pulsa su nombre al llegar y al irse.
        </p>
        {active.length === 0 && (
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Da de alta a los operarios mas abajo.</p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {active.map((m) => {
            const open = openClocks.find((c) => c.mechanicId === m.id);
            return (
              <form key={m.id} action={toggleClock.bind(null, m.id)}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${open ? "var(--color-success)" : "var(--color-border)"}`,
                    background: open ? "var(--color-success-soft)" : "var(--color-surface-2)",
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color }} />
                    <strong style={{ fontSize: 14 }}>{m.name}</strong>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: open ? "var(--color-success)" : "var(--color-text-muted)" }}>
                    {open ? `Dentro desde las ${fmtTime(open.in)} · pulsa para salir` : "Fuera · pulsa para entrar"}
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {stats.map(({ m, presenceMs, productiveMs, absenceDays, efficiency, cost }) => (
          <Card key={m.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: m.color }} />
                <SectionTitle>{m.name}</SectionTitle>
                {!m.active && <Pill tone="muted">De baja en el taller</Pill>}
                <Pill tone="steel">{m.orders.length} ordenes abiertas</Pill>
              </div>
              <Link href={`/operarios/jornada?m=${m.id}&mes=${monthKey}`}>
                <Button type="button" variant="ghost">
                  <IconPrint /> Registro de jornada
                </Button>
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 12 }}>
              <Stat label="Presencia" value={fmtDur(presenceMs)} />
              <Stat label="Productivo" value={fmtDur(productiveMs)} />
              <Stat label="Rendimiento" value={efficiency === null ? "-" : `${efficiency}%`} />
              <Stat label="Dias ausente" value={String(absenceDays)} />
              <Stat label="Coste del mes" value={Number(m.hourlyCost) ? fmtEUR(cost) : "-"} />
            </div>

            <div className="two-col" style={{ marginTop: 14 }}>
              <div>
                <p style={labelStyle}>Datos</p>
                <form action={updateMechanic.bind(null, m.id)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 70px", gap: 8 }}>
                    <TextInput name="name" defaultValue={m.name} />
                    <TextInput name="color" type="color" defaultValue={m.color} style={{ padding: 2, height: 38 }} />
                  </div>
                  <Field label="Coste por hora (sueldo + SS)">
                    <TextInput name="hourlyCost" defaultValue={String(m.hourlyCost)} />
                  </Field>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 13 }}>
                    <input type="checkbox" name="active" defaultChecked={m.active} /> Trabaja en el taller
                  </label>
                  <Button type="submit" style={{ alignSelf: "flex-start" }}>
                    Guardar
                  </Button>
                </form>
              </div>
              <div>
                <p style={labelStyle}>Vacaciones, bajas y ausencias ({monthLabel(monthKey)})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {m.absences.length === 0 && <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-faint)" }}>Ninguna este mes.</span>}
                  {m.absences.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", borderRadius: 8, padding: "6px 10px" }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5 }}>
                        <Pill tone={ABSENCE[a.kind].tone}>{ABSENCE[a.kind].label}</Pill> {fmtDate(a.from)} - {fmtDate(a.to)} {a.note && `· ${a.note}`}
                      </span>
                      <form action={removeAbsence.bind(null, a.id)}>
                        <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                          <IconTrash />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
                <form action={addAbsence.bind(null, m.id)} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 6 }}>
                  <Select name="kind" defaultValue="vacaciones">
                    <option value="vacaciones">Vacaciones</option>
                    <option value="baja">Baja</option>
                    <option value="ausencia">Ausencia</option>
                  </Select>
                  <TextInput name="note" placeholder="Nota" />
                  <TextInput name="from" type="date" required />
                  <TextInput name="to" type="date" />
                  <Button type="submit" style={{ gridColumn: "1 / -1" }}>
                    Anadir
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}

        <Card>
          <SectionTitle>Nuevo operario</SectionTitle>
          <form action={createMechanic} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) 70px minmax(0, 1fr) auto", gap: 8, marginTop: 10, alignItems: "end" }}>
            <Field label="Nombre">
              <TextInput name="name" placeholder="Nombre del mecanico" required />
            </Field>
            <Field label="Color">
              <TextInput name="color" type="color" defaultValue="#4F8EF7" style={{ padding: 2, height: 38 }} />
            </Field>
            <Field label="Coste/hora">
              <TextInput name="hourlyCost" placeholder="0" />
            </Field>
            <Button type="submit" variant="primary">
              Dar de alta
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

const labelStyle = { margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" as const };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-text-faint)", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{value}</p>
    </div>
  );
}
