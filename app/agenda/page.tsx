import Link from "next/link";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { NewAppointmentButton } from "@/components/agenda/NewAppointmentButton";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { addDaysToKey, dayBounds, toDateKey } from "@/lib/time";
import { fmtTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
// Horario base del taller; se amplia solo si hay citas fuera de el.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 19;
const MAX_CHIPS = 3;

type View = "calendario" | "lista";
type Appt = Awaited<ReturnType<typeof prisma.appointment.findMany>>[number];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDayTitle(dateKey: string) {
  const { start } = dayBounds(dateKey);
  return capitalize(start.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));
}

function monthKeyOf(dateKey: string) {
  return dateKey.slice(0, 7);
}

function addMonths(monthKey: string, n: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Todos los dias del mes, del 1 al ultimo. */
function monthDayKeys(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return Array.from({ length: days }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
}

/** Dias que se pintan en la cuadricula: semanas completas de lunes a domingo. */
function monthGridKeys(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const lead = (first.getDay() + 6) % 7; // lunes = 0
  const trail = 6 - ((last.getDay() + 6) % 7);
  const startKey = addDaysToKey(toDateKey(first), -lead);
  const total = lead + last.getDate() + trail;
  return Array.from({ length: total }, (_, i) => addDaysToKey(startKey, i));
}

function agendaHref(view: View, monthKey: string, dateKey: string) {
  const base = `/agenda?month=${monthKey}&date=${dateKey}`;
  return view === "lista" ? `${base}&vista=lista#d-${dateKey}` : base;
}

function countLabel(list: Appt[]) {
  const n = list.filter((a) => a.status !== "cancelada").length;
  return n === 0 ? "Sin citas" : n === 1 ? "1 cita" : `${n} citas`;
}

const navBtn: CSSProperties = { padding: "6px 9px" };
const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 20,
  color: "var(--color-text-primary)",
  textTransform: "uppercase",
};
const subStyle: CSSProperties = { margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" };

/** Horario de un dia: una fila por hora con sus citas o un hueco "+ Libre". */
function DaySlots({ dateKey, list }: { dateKey: string; list: Appt[] }) {
  const hoursWithAppts = list.map((a) => a.date.getHours());
  const firstHour = Math.min(OPEN_HOUR, ...hoursWithAppts);
  const lastHour = Math.max(CLOSE_HOUR, ...hoursWithAppts);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  return (
    <div>
      {hours.map((h) => {
        const inHour = list.filter((a) => a.date.getHours() === h);
        const label = `${String(h).padStart(2, "0")}:00`;
        return (
          <div key={h} className="slot-row">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-muted)", paddingTop: 4 }}>{label}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {inHour.map((a) => (
                <AppointmentRow key={a.id} appointment={a} />
              ))}
              {inHour.length === 0 && <NewAppointmentButton dateKey={dateKey} defaultTime={label} compact />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ViewToggle({ view, monthKey, dateKey }: { view: View; monthKey: string; dateKey: string }) {
  const item = (v: View, label: string) => {
    const active = v === view;
    return (
      <Link
        href={agendaHref(v, monthKey, dateKey)}
        style={{
          padding: "7px 14px",
          borderRadius: 8,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          background: active ? "var(--color-accent)" : "transparent",
          color: active ? "#14161a" : "var(--color-text-muted)",
        }}
      >
        {label}
      </Link>
    );
  };
  return (
    <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--color-surface)", border: "1px solid var(--color-border)", marginBottom: 14 }}>
      {item("calendario", "Calendario")}
      {item("lista", "Lista del mes")}
    </div>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; month?: string; vista?: string }>;
}) {
  const { date, month, vista } = await searchParams;
  const view: View = vista === "lista" ? "lista" : "calendario";
  const todayKey = toDateKey(new Date());
  const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey;
  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : monthKeyOf(dateKey);

  const gridKeys = monthGridKeys(monthKey);
  const rangeStart = dayBounds(gridKeys[0]).start;
  const rangeEnd = dayBounds(gridKeys[gridKeys.length - 1]).end;
  const day = dayBounds(dateKey);

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [{ date: { gte: rangeStart, lte: rangeEnd } }, { date: { gte: day.start, lte: day.end } }],
    },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, Appt[]>();
  for (const a of appointments) {
    const k = toDateKey(a.date);
    const list = byDay.get(k) ?? [];
    list.push(a);
    byDay.set(k, list);
  }

  const [y, m] = monthKey.split("-").map(Number);
  const monthTitle = capitalize(new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" }));
  // Al cambiar de mes se conserva el mismo dia del mes (si existe) para que la seleccion siga en el mes mostrado.
  const shiftDate = (mk: string) => {
    const dd = Math.min(Number(dateKey.slice(8)), monthDayKeys(mk).length);
    return `${mk}-${String(dd).padStart(2, "0")}`;
  };
  const prevMonth = addMonths(monthKey, -1);
  const nextMonth = addMonths(monthKey, 1);
  const isTodayView = monthKey === monthKeyOf(todayKey) && dateKey === todayKey;

  const monthNav = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <Link href={agendaHref(view, prevMonth, shiftDate(prevMonth))} aria-label="Mes anterior">
        <Button type="button" style={navBtn}>
          <IconChevronLeft />
        </Button>
      </Link>
      <div style={{ textAlign: "center" }}>
        <p style={titleStyle}>{monthTitle}</p>
        {(!isTodayView || view === "lista") && (
          <Link href={agendaHref(view, monthKeyOf(todayKey), todayKey)} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-accent)" }}>
            Ir a hoy
          </Link>
        )}
      </div>
      <Link href={agendaHref(view, nextMonth, shiftDate(nextMonth))} aria-label="Mes siguiente">
        <Button type="button" style={navBtn}>
          <IconChevronRight />
        </Button>
      </Link>
    </div>
  );

  return (
    <div>
      <Header title="Agenda" subtitle="Citas del taller" right={<NewAppointmentButton dateKey={dateKey} />} />
      <ViewToggle view={view} monthKey={monthKey} dateKey={dateKey} />

      {view === "lista" ? (
        <ListView monthKey={monthKey} dateKey={dateKey} todayKey={todayKey} byDay={byDay} monthNav={monthNav} />
      ) : (
        <CalendarView monthKey={monthKey} dateKey={dateKey} todayKey={todayKey} gridKeys={gridKeys} byDay={byDay} monthNav={monthNav} />
      )}
    </div>
  );
}

/** Ocupacion del dia: cuantas horas del horario base tienen al menos una cita activa. */
function occupancy(list: Appt[]) {
  const total = CLOSE_HOUR - OPEN_HOUR + 1;
  const busy = new Set(
    list.filter((a) => a.status !== "cancelada").map((a) => a.date.getHours()).filter((h) => h >= OPEN_HOUR && h <= CLOSE_HOUR),
  ).size;
  const free = total - busy;
  if (busy === 0) return { label: "Libre", tone: "free" as const };
  if (free === 0) return { label: "Completo", tone: "full" as const };
  return { label: free === 1 ? "1 hueco libre" : `${free} huecos libres`, tone: "some" as const };
}

const OCC_STYLE: Record<"free" | "some" | "full", CSSProperties> = {
  free: { background: "var(--color-success-soft)", color: "var(--color-success)" },
  some: { background: "var(--color-warning-soft)", color: "var(--color-warning)" },
  full: { background: "var(--color-danger-soft)", color: "var(--color-danger)" },
};

function ListView({
  monthKey,
  dateKey,
  todayKey,
  byDay,
  monthNav,
}: {
  monthKey: string;
  dateKey: string;
  todayKey: string;
  byDay: Map<string, Appt[]>;
  monthNav: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Card style={{ padding: 12, marginBottom: 6 }}>{monthNav}</Card>
      {monthDayKeys(monthKey).map((k) => {
        const list = byDay.get(k) ?? [];
        const active = list.filter((a) => a.status !== "cancelada");
        const isToday = k === todayKey;
        const isPast = k < todayKey;
        const occ = occupancy(list);
        return (
          <details
            key={k}
            id={`d-${k}`}
            className="day-fold"
            open={k === dateKey}
            style={{
              scrollMarginTop: 12,
              opacity: isPast && !isToday ? 0.6 : 1,
              ...(isToday ? { borderColor: "var(--color-accent)" } : {}),
            }}
          >
            <summary>
              <span className="day-fold-chev" aria-hidden>
                <IconChevronRight />
              </span>
              <span style={{ ...titleStyle, fontSize: 16, minWidth: 0, color: isToday ? "var(--color-accent)" : titleStyle.color }}>
                {fmtDayTitle(k)}
                {isToday ? " · Hoy" : ""}
              </span>
              <span className="day-fold-times">
                {active.slice(0, 4).map((a) => (
                  <span key={a.id} className={`cal-chip st-${a.status}`} style={{ display: "inline-block" }}>
                    <b style={{ fontFamily: "var(--font-mono)" }}>{fmtTime(a.date)}</b> {a.clientName || a.plate || "Cita"}
                  </span>
                ))}
                {active.length > 4 && <span className="cal-more">+{active.length - 4}</span>}
              </span>
              <span className="day-fold-count" style={{ ...subStyle, whiteSpace: "nowrap" }}>{countLabel(list)}</span>
              <span
                className="day-fold-occ"
                style={{
                  ...OCC_STYLE[occ.tone],
                  fontFamily: "var(--font-body)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                {occ.label}
              </span>
            </summary>
            <div style={{ padding: "0 16px 12px" }}>
              <DaySlots dateKey={k} list={list} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

function CalendarView({
  monthKey,
  dateKey,
  todayKey,
  gridKeys,
  byDay,
  monthNav,
}: {
  monthKey: string;
  dateKey: string;
  todayKey: string;
  gridKeys: string[];
  byDay: Map<string, Appt[]>;
  monthNav: React.ReactNode;
}) {
  const dayList = byDay.get(dateKey) ?? [];
  const prevDay = addDaysToKey(dateKey, -1);
  const nextDay = addDaysToKey(dateKey, 1);

  return (
    <div className="agenda-grid">
      {/* Calendario del mes */}
      <Card>
        <div style={{ marginBottom: 12 }}>{monthNav}</div>

        <div className="cal-grid" style={{ marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <span
              key={w}
              style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}
            >
              {w}
            </span>
          ))}
        </div>

        <div className="cal-grid">
          {gridKeys.map((k) => {
            const list = byDay.get(k) ?? [];
            const classes = ["cal-day"];
            if (monthKeyOf(k) !== monthKey) classes.push("is-other");
            if (k === todayKey) classes.push("is-today");
            if (k === dateKey) classes.push("is-selected");
            const visible = list.slice(0, MAX_CHIPS);
            const active = list.filter((a) => a.status !== "cancelada");
            return (
              <Link key={k} href={agendaHref("calendario", monthKeyOf(k), k)} className={classes.join(" ")}>
                <span className="cal-num">{Number(k.slice(8))}</span>
                {visible.map((a) => (
                  <span key={a.id} className={`cal-chip st-${a.status}`} title={`${fmtTime(a.date)} ${a.clientName} ${a.plate} ${a.reason}`}>
                    <b style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{fmtTime(a.date)}</b> {a.clientName || a.plate || a.reason || "Cita"}
                  </span>
                ))}
                {list.length > MAX_CHIPS && <span className="cal-more">+{list.length - MAX_CHIPS} mas</span>}
                {active.length > 0 && (
                  <span className="cal-dots">
                    {active.slice(0, 4).map((a) => (
                      <span key={a.id} className="cal-dot" />
                    ))}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Horario del dia seleccionado */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <Link href={agendaHref("calendario", monthKeyOf(prevDay), prevDay)} aria-label="Dia anterior">
            <Button type="button" style={navBtn}>
              <IconChevronLeft />
            </Button>
          </Link>
          <div style={{ textAlign: "center" }}>
            <p style={{ ...titleStyle, fontSize: 18 }}>{fmtDayTitle(dateKey)}</p>
            <p style={subStyle}>{countLabel(dayList)}</p>
          </div>
          <Link href={agendaHref("calendario", monthKeyOf(nextDay), nextDay)} aria-label="Dia siguiente">
            <Button type="button" style={navBtn}>
              <IconChevronRight />
            </Button>
          </Link>
        </div>
        <DaySlots dateKey={dateKey} list={dayList} />
      </Card>
    </div>
  );
}
