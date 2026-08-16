import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { NewAppointmentButton } from "@/components/agenda/NewAppointmentButton";
import { AppointmentRow } from "@/components/agenda/AppointmentRow";
import { addDaysToKey, dayBounds, toDateKey } from "@/lib/time";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtHeaderDate(dateKey: string) {
  const { start } = dayBounds(dateKey);
  const label = start.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const dateKey = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toDateKey(new Date());
  const { start, end } = dayBounds(dateKey);

  const appointments = await prisma.appointment.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  const isToday = dateKey === toDateKey(new Date());
  const prevKey = addDaysToKey(dateKey, -1);
  const nextKey = addDaysToKey(dateKey, 1);

  return (
    <div>
      <Header title="Agenda" subtitle="Citas del taller" right={<NewAppointmentButton dateKey={dateKey} />} />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/agenda?date=${prevKey}`}>
            <Button type="button">
              <IconChevronLeft />
            </Button>
          </Link>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
              {fmtHeaderDate(dateKey)}
            </p>
            {!isToday && (
              <Link href={`/agenda?date=${toDateKey(new Date())}`} style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-accent)" }}>
                Ir a hoy
              </Link>
            )}
          </div>
          <Link href={`/agenda?date=${nextKey}`}>
            <Button type="button">
              <IconChevronRight />
            </Button>
          </Link>
        </div>
      </Card>

      <Card>
        {appointments.length === 0 && (
          <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>Sin citas para este dia.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {appointments.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </div>
      </Card>
    </div>
  );
}
