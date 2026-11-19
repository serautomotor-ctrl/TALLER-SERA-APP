import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconTrash } from "@/components/ui/icons";
import { PrintButton } from "@/components/ui/PrintButton";
import { fmtDur, fmtTime } from "@/lib/format";
import { toDateKey } from "@/lib/time";
import { currentMonthKey, monthBounds, monthLabel } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { addManualClocking, removeClocking } from "../actions";

export const dynamic = "force-dynamic";

export default async function JornadaPage({ searchParams }: { searchParams: Promise<{ m?: string; mes?: string }> }) {
  const { m, mes } = await searchParams;
  if (!m) notFound();
  const monthKey = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonthKey();
  const { start, end } = monthBounds(monthKey);

  const [mechanic, settings] = await Promise.all([
    prisma.mechanic.findUnique({
      where: { id: m },
      include: {
        clockings: { where: { in: { gte: start, lte: end } }, orderBy: { in: "asc" } },
        absences: { where: { to: { gte: start }, from: { lte: end } } },
      },
    }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);
  if (!mechanic) notFound();

  const days: { key: string; date: Date }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push({ key: toDateKey(d), date: new Date(d) });

  const ms = (c: { in: Date; out: Date | null }) => (c.out ? c.out.getTime() - c.in.getTime() : 0);
  const total = mechanic.clockings.reduce((s, c) => s + ms(c), 0);

  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href={`/operarios?mes=${monthKey}`}>
          <Button type="button" variant="ghost">
            Volver a Operarios
          </Button>
        </Link>
        <PrintButton label="Imprimir / PDF" />
      </div>

      <div className="print-sheet" style={{ background: "#fff", color: "#111", borderRadius: 12, padding: 22, fontFamily: "Arial, sans-serif", fontSize: 12.5 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Registro de jornada · {monthLabel(monthKey)}</h2>
        <p style={{ margin: "4px 0 14px", color: "#444" }}>
          Empresa: {settings.workshopName} {settings.taxId && `(NIF ${settings.taxId})`} · Trabajador: <strong>{mechanic.name}</strong>
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #111", textAlign: "left" }}>
                <th style={{ padding: 4 }}>Dia</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const list = mechanic.clockings.filter((c) => toDateKey(c.in) === d.key);
                const absence = mechanic.absences.find((a) => a.from <= d.date && a.to >= d.date);
                const dayMs = list.reduce((s, c) => s + ms(c), 0);
                const weekend = d.date.getDay() === 0 || d.date.getDay() === 6;
                return (
                  <tr key={d.key} style={{ borderBottom: "1px solid #ddd", background: weekend ? "#f4f4f4" : undefined }}>
                    <td style={{ padding: 4, whiteSpace: "nowrap" }}>{d.date.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" })}</td>
                    <td>{list.map((c) => fmtTime(c.in)).join(" / ")}</td>
                    <td>{list.map((c) => (c.out ? fmtTime(c.out) : "--")).join(" / ")}</td>
                    <td>{dayMs ? fmtDur(dayMs) : ""}</td>
                    <td style={{ fontSize: 11.5 }}>
                      {absence ? absence.kind.toUpperCase() + (absence.note ? ` (${absence.note})` : "") : list.map((c) => c.note).filter(Boolean).join("; ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 12, fontWeight: 700 }}>Total del mes: {fmtDur(total)}</p>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40 }}>
          <span>Firma de la empresa</span>
          <span>Firma del trabajador</span>
        </div>
      </div>

      <div className="no-print" style={{ marginTop: 16, display: "grid", gap: 14 }}>
        <Card>
          <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontWeight: 600 }}>Corregir: anadir un fichaje a mano</p>
          <form action={addManualClocking.bind(null, mechanic.id)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, alignItems: "end" }}>
            <Field label="Dia">
              <TextInput name="day" type="date" required />
            </Field>
            <Field label="Entrada">
              <TextInput name="in" type="time" required />
            </Field>
            <Field label="Salida">
              <TextInput name="out" type="time" />
            </Field>
            <Field label="Motivo">
              <TextInput name="note" placeholder="Se olvido fichar" />
            </Field>
            <Button type="submit">Anadir</Button>
          </form>
        </Card>
        {mechanic.clockings.length > 0 && (
          <Card>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontWeight: 600 }}>Fichajes del mes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {mechanic.clockings.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 12.5, background: "var(--color-surface-2)", padding: "5px 10px", borderRadius: 6 }}>
                  <span>
                    {c.in.toLocaleDateString("es-ES")} · {fmtTime(c.in)} - {c.out ? fmtTime(c.out) : "dentro"} {c.note && `· ${c.note}`}
                  </span>
                  <form action={removeClocking.bind(null, c.id)}>
                    <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                      <IconTrash />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
