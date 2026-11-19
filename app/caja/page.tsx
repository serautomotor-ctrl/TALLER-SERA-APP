import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Select, TextInput } from "@/components/ui/inputs";
import { IconChevronLeft, IconChevronRight, IconTrash } from "@/components/ui/icons";
import { PaymentReminderButton } from "@/components/caja/PaymentReminderButton";
import { fmtDate, fmtEUR, fmtTime } from "@/lib/format";
import { addDaysToKey, dayBounds, nowMs, toDateKey } from "@/lib/time";
import { currentMonthKey, monthBounds } from "@/lib/period";
import { sharePath } from "@/lib/share";
import { prisma } from "@/lib/prisma";
import { addCashMovement, closeCash, removeCashClose, removeCashMovement } from "./actions";

export const dynamic = "force-dynamic";

const METHODS = ["efectivo", "tarjeta", "transferencia", "otro"] as const;
const METHOD_LABEL: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", otro: "Otro" };
const DAY = 86_400_000;

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const dayKey = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : toDateKey(new Date());
  const { start, end } = dayBounds(dayKey);
  const month = monthBounds(currentMonthKey(new Date(`${dayKey}T12:00:00`)));

  const [payments, movements, closes, pendingInvoices, unpaidPurchases, monthPayments, monthPurchasesPaid, vehicles] = await Promise.all([
    prisma.payment.findMany({ where: { date: { gte: start, lte: end } }, include: { invoice: true }, orderBy: { date: "asc" } }),
    prisma.cashMovement.findMany({ where: { date: { gte: start, lte: end } }, orderBy: { date: "asc" } }),
    prisma.cashClose.findMany({ orderBy: { date: "desc" }, take: 10 }),
    prisma.invoice.findMany({ where: { paymentStatus: { not: "cobrada" } }, orderBy: { createdAt: "asc" } }),
    prisma.purchase.findMany({ where: { paid: false, kind: { not: "albaran" } }, orderBy: [{ dueDate: "asc" }, { date: "asc" }] }),
    prisma.payment.aggregate({ where: { date: { gte: month.start, lte: month.end } }, _sum: { amount: true } }),
    prisma.purchase.aggregate({ where: { paid: true, paidAt: { gte: month.start, lte: month.end }, kind: { not: "albaran" } }, _sum: { total: true } }),
    prisma.vehicle.findMany({ select: { plate: true, customer: { select: { phone: true, email: true } } } }),
  ]);

  const byMethod = Object.fromEntries(METHODS.map((m) => [m, payments.filter((p) => p.method === m).reduce((s, p) => s + Number(p.amount), 0)]));
  const totalCobrado = payments.reduce((s, p) => s + Number(p.amount), 0);
  const entradas = movements.filter((m) => m.kind === "entrada").reduce((s, m) => s + Number(m.amount), 0);
  const salidas = movements.filter((m) => m.kind === "salida").reduce((s, m) => s + Number(m.amount), 0);
  const efectivoEsperado = Math.round((byMethod.efectivo + entradas - salidas) * 100) / 100;
  const dayClose = closes.find((c) => toDateKey(c.date) === dayKey);

  const pendingTotal = pendingInvoices.reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);
  const unpaidTotal = unpaidPurchases.reduce((s, p) => s + Number(p.total), 0);
  const contactByPlate = new Map(vehicles.map((v) => [v.plate, v.customer]));
  const now = nowMs();

  return (
    <div>
      <Header
        title="Cobros y caja"
        subtitle="Lo cobrado cada dia, el cierre de caja, lo que te deben los clientes y lo que debes a proveedores"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href={`/caja?dia=${addDaysToKey(dayKey, -1)}`}>
              <Button type="button" variant="ghost">
                <IconChevronLeft />
              </Button>
            </Link>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, minWidth: 120, textAlign: "center" }}>{fmtDate(start)}</span>
            <Link href={`/caja?dia=${addDaysToKey(dayKey, 1)}`}>
              <Button type="button" variant="ghost">
                <IconChevronRight />
              </Button>
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Cobrado este dia" value={fmtEUR(totalCobrado)} tone="success" />
        <MetricCard label="Efectivo en caja" value={fmtEUR(efectivoEsperado)} tone="accent" />
        <MetricCard label="Te deben clientes" value={fmtEUR(pendingTotal)} tone={pendingTotal ? "warning" : "success"} />
        <MetricCard label="Debes a proveedores" value={fmtEUR(unpaidTotal)} tone={unpaidTotal ? "danger" : "success"} />
      </div>

      <div className="two-col" style={{ marginBottom: 14 }}>
        <Card>
          <SectionTitle>Cobros del dia</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, margin: "10px 0" }}>
            {METHODS.map((m) => (
              <div key={m} style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-text-faint)", textTransform: "uppercase" }}>{METHOD_LABEL[m]}</p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{fmtEUR(byMethod[m])}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {payments.length === 0 && <p style={muted}>No hay cobros este dia.</p>}
            {payments.map((p) => (
              <Link key={p.id} href={`/facturas?id=${p.invoiceId}`} style={rowStyle}>
                <span>
                  {fmtTime(p.date)} · {p.invoice.number} · {p.invoice.clientName || p.invoice.plate}
                </span>
                <span>
                  <Pill tone="muted">{METHOD_LABEL[p.method]}</Pill> <strong>{fmtEUR(Number(p.amount))}</strong>
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Entradas y salidas de caja</SectionTitle>
          <p style={{ ...muted, margin: "4px 0 10px" }}>Dinero en efectivo que entra o sale sin factura: fondo de caja, una compra pequena, retirar al banco...</p>
          <form action={addCashMovement} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) 90px auto", gap: 6 }}>
            <input type="hidden" name="day" value={dayKey} />
            <Select name="kind" defaultValue="salida">
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </Select>
            <TextInput name="concept" placeholder="Concepto" required />
            <TextInput name="amount" placeholder="0,00" required />
            <Button type="submit">Anadir</Button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {movements.map((m) => (
              <div key={m.id} style={rowStyle}>
                <span>
                  {fmtTime(m.date)} · {m.concept}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong style={{ color: m.kind === "entrada" ? "var(--color-success)" : "var(--color-danger)" }}>
                    {m.kind === "entrada" ? "+" : "-"}
                    {fmtEUR(Number(m.amount))}
                  </strong>
                  <form action={removeCashMovement.bind(null, m.id)}>
                    <button type="submit" style={iconBtn}>
                      <IconTrash />
                    </button>
                  </form>
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 12, paddingTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5 }}>Cierre de caja</p>
            <p style={{ ...muted, margin: "0 0 8px" }}>
              Efectivo que deberia haber: <strong style={{ color: "var(--color-text-primary)" }}>{fmtEUR(efectivoEsperado)}</strong> (cobros en efectivo + entradas - salidas)
            </p>
            {dayClose ? (
              <div style={rowStyle}>
                <span>
                  Cerrada: contado {fmtEUR(Number(dayClose.counted))}
                  {dayClose.note ? ` · ${dayClose.note}` : ""}
                </span>
                <DiffPill diff={Number(dayClose.counted) - Number(dayClose.expected)} />
              </div>
            ) : (
              <form action={closeCash.bind(null, efectivoEsperado)} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr) auto", gap: 6 }}>
                <input type="hidden" name="day" value={dayKey} />
                <TextInput name="counted" placeholder="Contado" required />
                <TextInput name="note" placeholder="Nota (opcional)" />
                <Button type="submit" variant="primary">
                  Cerrar caja
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>

      <div className="two-col" style={{ marginBottom: 14 }}>
        <Card>
          <SectionTitle>Facturas pendientes de cobro ({pendingInvoices.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 420, overflowY: "auto" }}>
            {pendingInvoices.length === 0 && <p style={muted}>Todo cobrado.</p>}
            {pendingInvoices.map((i) => {
              const days = Math.floor((now - i.createdAt.getTime()) / DAY);
              const due = Number(i.total) - Number(i.paidAmount);
              const contact = contactByPlate.get(i.plate);
              return (
                <div key={i.id} style={{ ...rowStyle, alignItems: "center" }}>
                  <Link href={`/facturas?id=${i.id}`} style={{ color: "var(--color-text-primary)", minWidth: 0 }}>
                    <strong style={{ fontFamily: "var(--font-mono)" }}>{i.number}</strong> · {i.clientName || i.plate}
                    <div style={{ fontSize: 11.5, color: days > 30 ? "var(--color-danger)" : "var(--color-text-faint)" }}>
                      {fmtDate(i.createdAt)} · hace {days} dias
                    </div>
                  </Link>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong>{fmtEUR(due)}</strong>
                    <PaymentReminderButton
                      phone={contact?.phone || ""}
                      message={`Hola, te recordamos que la factura ${i.number} (${i.plate}) tiene pendiente ${fmtEUR(due)}. Puedes verla aqui:`}
                      path={sharePath("factura", i.id)}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle>Pagos pendientes a proveedores ({unpaidPurchases.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 420, overflowY: "auto" }}>
            {unpaidPurchases.length === 0 && <p style={muted}>No debes nada a proveedores.</p>}
            {unpaidPurchases.map((p) => {
              const overdue = p.dueDate && p.dueDate.getTime() < now;
              return (
                <Link key={p.id} href={`/compras?id=${p.id}`} style={rowStyle}>
                  <span>
                    {p.supplierName || "Proveedor"} {p.number && `· ${p.number}`}
                    <div style={{ fontSize: 11.5, color: overdue ? "var(--color-danger)" : "var(--color-text-faint)" }}>
                      {p.dueDate ? `Vence ${fmtDate(p.dueDate)}` : fmtDate(p.date)}
                    </div>
                  </span>
                  <strong>{fmtEUR(Number(p.total))}</strong>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="two-col">
        <Card>
          <SectionTitle>Tesoreria del mes</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            <div style={rowStyle}>
              <span>Cobrado a clientes</span>
              <strong style={{ color: "var(--color-success)" }}>{fmtEUR(Number(monthPayments._sum.amount) || 0)}</strong>
            </div>
            <div style={rowStyle}>
              <span>Pagado a proveedores</span>
              <strong style={{ color: "var(--color-danger)" }}>{fmtEUR(Number(monthPurchasesPaid._sum.total) || 0)}</strong>
            </div>
            <div style={{ ...rowStyle, fontWeight: 700 }}>
              <span>Diferencia</span>
              <span>{fmtEUR((Number(monthPayments._sum.amount) || 0) - (Number(monthPurchasesPaid._sum.total) || 0))}</span>
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle>Ultimos cierres de caja</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {closes.length === 0 && <p style={muted}>Aun no has cerrado ninguna caja.</p>}
            {closes.map((c) => (
              <div key={c.id} style={rowStyle}>
                <Link href={`/caja?dia=${toDateKey(c.date)}`} style={{ color: "var(--color-text-primary)" }}>
                  {fmtDate(c.date)} · contado {fmtEUR(Number(c.counted))}
                </Link>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <DiffPill diff={Number(c.counted) - Number(c.expected)} />
                  <form action={removeCashClose.bind(null, c.id)}>
                    <button type="submit" style={iconBtn}>
                      <IconTrash />
                    </button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DiffPill({ diff }: { diff: number }) {
  const d = Math.round(diff * 100) / 100;
  if (d === 0) return <Pill tone="success">Cuadra</Pill>;
  return <Pill tone={d > 0 ? "warning" : "danger"}>{d > 0 ? `Sobran ${fmtEUR(d)}` : `Faltan ${fmtEUR(-d)}`}</Pill>;
}

const muted = { margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" };
const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  background: "var(--color-surface-2)",
  borderRadius: 8,
  padding: "7px 10px",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  color: "var(--color-text-primary)",
} as const;
const iconBtn = { background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", display: "flex" } as const;

