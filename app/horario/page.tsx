import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { HorarioDial } from "@/components/horario/HorarioDial";
import { fmtDur, fmtTime } from "@/lib/format";
import { finishedEntryDurationMs, startOfToday } from "@/lib/time";
import { prisma } from "@/lib/prisma";
import { finishEntry, startEntry, togglePause } from "./actions";

export const dynamic = "force-dynamic";

export default async function HorarioPage() {
  const [activeEntry, todayEntries] = await Promise.all([
    prisma.timeEntry.findFirst({ where: { end: null }, orderBy: { start: "desc" } }),
    prisma.timeEntry.findMany({ where: { start: { gte: startOfToday() } }, orderBy: { start: "desc" } }),
  ]);

  return (
    <div>
      <Header title="Control horario" subtitle="Inicia, pausa y cierra el tiempo dedicado a cada tarea" />
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, alignItems: "start" }}>
        <HorarioDial
          activeEntry={activeEntry}
          startEntryAction={startEntry}
          togglePauseAction={activeEntry ? togglePause.bind(null, activeEntry.id) : undefined}
          finishEntryAction={activeEntry ? finishEntry.bind(null, activeEntry.id) : undefined}
        />

        <Card>
          <SectionTitle>Registro de hoy</SectionTitle>
          {todayEntries.length === 0 && (
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5, marginTop: 10 }}>
              Aun no se ha registrado ninguna tarea hoy.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {todayEntries.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "var(--color-surface-2)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>
                    {e.task} {e.plate ? `· ${e.plate}` : ""}
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {fmtTime(e.start)} - {e.end ? fmtTime(e.end) : "en curso"}
                  </p>
                </div>
                <Pill tone="steel">{fmtDur(finishedEntryDurationMs(e))}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
