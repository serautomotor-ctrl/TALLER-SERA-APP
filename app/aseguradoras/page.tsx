import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Field, TextArea, TextInput } from "@/components/ui/inputs";
import { fmtDate, fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { removeInsurer, saveInsurer } from "./actions";

export const dynamic = "force-dynamic";

export default async function AseguradorasPage() {
  const insurers = await prisma.insurer.findMany({
    orderBy: { name: "asc" },
    include: { invoices: { orderBy: { createdAt: "desc" } } },
  });

  const all = insurers.flatMap((i) => i.invoices);
  const pending = all.filter((i) => i.paymentStatus !== "cobrada").reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const thisYear = all.filter((i) => i.createdAt >= yearStart);

  return (
    <div>
      <Header title="Aseguradoras" subtitle="Companias de seguros, siniestros facturados y lo que te deben. Las facturas de siniestro se hacen desde Facturas" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <MetricCard label="Companias" value={insurers.length} tone="steel" />
        <MetricCard label="Siniestros este ano" value={thisYear.length} tone="accent" />
        <MetricCard label="Facturado a seguros (ano)" value={fmtEUR(thisYear.reduce((s, i) => s + Number(i.total), 0))} tone="success" />
        <MetricCard label="Pendiente de cobro" value={fmtEUR(pending)} tone={pending ? "warning" : "success"} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {insurers.map((ins) => {
          const owe = ins.invoices.filter((i) => i.paymentStatus !== "cobrada").reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);
          return (
            <Card key={ins.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <SectionTitle>{ins.name}</SectionTitle>
                <div style={{ display: "flex", gap: 6 }}>
                  <Pill tone="accent">{ins.invoices.length} siniestros</Pill>
                  {owe > 0 && <Pill tone="warning">Debe {fmtEUR(owe)}</Pill>}
                </div>
              </div>
              <p style={muted}>{[ins.taxId, ins.phone, ins.email, ins.address].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
              {ins.invoices.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, maxHeight: 260, overflowY: "auto" }}>
                  {ins.invoices.map((inv) => (
                    <Link key={inv.id} href={`/facturas?id=${inv.id}`} style={rowStyle}>
                      <span>
                        <strong style={{ fontFamily: "var(--font-mono)" }}>{inv.number}</strong> · {inv.plate} · {fmtDate(inv.createdAt)}
                        {inv.claimNumber && ` · siniestro ${inv.claimNumber}`}
                      </span>
                      <span style={{ display: "flex", gap: 6 }}>
                        <Pill tone={inv.paymentStatus === "cobrada" ? "success" : "warning"}>{inv.paymentStatus === "cobrada" ? "Cobrada" : "Pendiente"}</Pill>
                        <strong>{fmtEUR(Number(inv.total))}</strong>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>Editar datos</summary>
                <InsurerForm id={ins.id} d={ins} />
                <form action={removeInsurer.bind(null, ins.id)} style={{ marginTop: 8 }}>
                  <Button type="submit" variant="danger">
                    Borrar compania
                  </Button>
                </form>
              </details>
            </Card>
          );
        })}
        <Card>
          <SectionTitle>Nueva aseguradora</SectionTitle>
          <InsurerForm id={null} d={null} />
        </Card>
      </div>
    </div>
  );
}

function InsurerForm({ id, d }: { id: string | null; d: { name: string; taxId: string; address: string; phone: string; email: string; notes: string } | null }) {
  return (
    <form action={saveInsurer.bind(null, id)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 10 }}>
      <Field label="Nombre">
        <TextInput name="name" defaultValue={d?.name} required />
      </Field>
      <Field label="CIF">
        <TextInput name="taxId" defaultValue={d?.taxId} />
      </Field>
      <Field label="Direccion fiscal">
        <TextInput name="address" defaultValue={d?.address} />
      </Field>
      <Field label="Telefono">
        <TextInput name="phone" defaultValue={d?.phone} />
      </Field>
      <Field label="Email (peritos / facturas)">
        <TextInput name="email" type="email" defaultValue={d?.email} />
      </Field>
      <Field label="Notas">
        <TextArea name="notes" defaultValue={d?.notes} style={{ minHeight: 38 }} />
      </Field>
      <Button type="submit" variant="primary" style={{ alignSelf: "end" }}>
        {id ? "Guardar" : "Anadir"}
      </Button>
    </form>
  );
}

const muted = { margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
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
