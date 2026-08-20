import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { MetricCard } from "@/components/ui/MetricCard";
import { Pill } from "@/components/ui/Pill";
import { NewInvoiceButton } from "@/components/facturas/NewInvoiceButton";
import { InvoiceViewModal } from "@/components/facturas/InvoiceViewModal";
import { ExportCsvButton } from "@/components/facturas/ExportCsvButton";
import { fmtDate, fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" }> = {
  cobrada: { label: "Cobrada", tone: "success" },
  parcial: { label: "Cobro parcial", tone: "warning" },
  pendiente: { label: "Pendiente de cobro", tone: "muted" },
};

export default async function FacturasPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;

  const [invoices, vehicles, settings] = await Promise.all([
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.vehicle.findMany({ orderBy: { plate: "asc" }, include: { customer: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const viewInvoice = id ? invoices.find((i) => i.id === id) ?? null : null;
  const totalFacturado = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPendienteFacturas = invoices.reduce(
    (s, i) => s + (i.paymentStatus === "cobrada" ? 0 : Number(i.total) - Number(i.paidAmount)),
    0
  );

  return (
    <div>
      <Header
        title="Facturacion"
        subtitle="Numeracion correlativa, IVA y hash de control (sin conexion Verifactu por ahora)"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            {invoices.length > 0 && (
              <ExportCsvButton
                invoices={invoices.map((i) => ({
                  number: i.number,
                  createdAt: i.createdAt,
                  clientName: i.clientName,
                  clientNif: i.clientNif,
                  plate: i.plate,
                  subtotal: Number(i.subtotal),
                  vatTotal: Number(i.vatTotal),
                  total: Number(i.total),
                  hash: i.hash,
                }))}
              />
            )}
            <NewInvoiceButton
              vehicles={vehicles.map((v) => ({
                id: v.id,
                plate: v.plate,
                clientName: v.customer.name,
                clientNif: v.customer.taxId,
                clientAddress: v.customer.address,
              }))}
            />
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Facturas emitidas" value={invoices.length} tone="steel" />
        <MetricCard label="Facturado total" value={fmtEUR(totalFacturado)} tone="accent" />
        <MetricCard label="Pendiente de cobro" value={fmtEUR(totalPendienteFacturas)} tone={totalPendienteFacturas > 0 ? "warning" : "success"} />
        <MetricCard label="Ultimo numero" value={invoices.length ? invoices[0].number : "-"} tone="success" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>Datos del taller para la factura</SectionTitle>
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          {settings.workshopName || "Sin nombre"} · {settings.taxId || "sin NIF"} {settings.address ? `· ${settings.address}` : ""}
        </p>
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>
          Se edita desde Ajustes.
        </p>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no se ha emitido ninguna factura.
            </p>
          </Card>
        )}
        {invoices.map((inv) => (
          <a key={inv.id} href={`/facturas?id=${inv.id}`} style={{ display: "block" }}>
            <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{inv.number}</p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  {inv.clientName || "Sin cliente"} {inv.plate ? `· ${inv.plate}` : ""} · {fmtDate(inv.createdAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Pill tone={PAYMENT_STATUS[inv.paymentStatus]?.tone || "muted"}>{PAYMENT_STATUS[inv.paymentStatus]?.label}</Pill>
                <Pill tone="success">{fmtEUR(Number(inv.total))}</Pill>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {viewInvoice && (
        <InvoiceViewModal
          invoice={{
            ...viewInvoice,
            subtotal: Number(viewInvoice.subtotal),
            vatTotal: Number(viewInvoice.vatTotal),
            total: Number(viewInvoice.total),
            paidAmount: Number(viewInvoice.paidAmount),
            items: viewInvoice.items.map((it) => ({ ...it, unitPrice: Number(it.unitPrice) })),
          }}
          company={{
            workshopName: settings.workshopName,
            taxId: settings.taxId,
            address: settings.address,
            postalCode: settings.postalCode,
            city: settings.city,
            province: settings.province,
            phone: settings.phone,
            email: settings.email,
            logoUrl: settings.logoUrl,
          }}
        />
      )}
    </div>
  );
}
