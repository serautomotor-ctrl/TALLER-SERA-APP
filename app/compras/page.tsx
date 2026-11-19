import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { Field, Select, TextArea, TextInput } from "@/components/ui/inputs";
import { NewPurchaseButton } from "@/components/compras/NewPurchaseButton";
import { PurchaseOrderCard } from "@/components/compras/PurchaseOrderCard";
import { PurchaseActions } from "@/components/compras/PurchaseActions";
import { fmtDate, fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createEmptyPurchaseOrder, generateAutoOrders, removeSupplier, saveSupplier } from "./actions";

export const dynamic = "force-dynamic";

const KIND: Record<string, { label: string; tone: "steel" | "accent" | "warning" }> = {
  albaran: { label: "Albaran", tone: "steel" },
  factura: { label: "Factura", tone: "accent" },
  gasto: { label: "Gasto", tone: "warning" },
};

export default async function ComprasPage({ searchParams }: { searchParams: Promise<{ vista?: string; id?: string; tipo?: string; prov?: string }> }) {
  const { vista = "compras", id, tipo = "", prov } = await searchParams;
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [purchases, suppliers, articles, orders, purchaseOrders, settings] = await Promise.all([
    prisma.purchase.findMany({
      where: { ...(tipo ? { kind: tipo as "albaran" | "factura" | "gasto" } : {}), ...(prov ? { supplierId: prov } : {}) },
      orderBy: { date: "desc" },
      take: 300,
      include: { order: { select: { plate: true } }, invoicedIn: { select: { number: true } } },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, include: { purchases: { where: { date: { gte: yearStart } }, select: { total: true, paid: true, kind: true } } } }),
    prisma.article.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, costPrice: true, reference: true } }),
    prisma.order.findMany({ where: { status: { not: "cerrada" } }, orderBy: { createdAt: "desc" }, select: { id: true, plate: true, description: true } }),
    prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { items: true, supplier: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);

  const selected = id ? await prisma.purchase.findUnique({ where: { id }, include: { items: { include: { article: true } }, albaranes: true, invoicedIn: true, order: true } }) : null;
  const pendingAlbaranes = await prisma.purchase.findMany({ where: { kind: "albaran", invoicedInId: null }, orderBy: { date: "asc" } });

  const unpaid = purchases.filter((p) => !p.paid && p.kind !== "albaran").reduce((s, p) => s + Number(p.total), 0);
  const yearTotal = suppliers.reduce((s, sp) => s + sp.purchases.filter((p) => p.kind !== "albaran").reduce((x, p) => x + Number(p.total), 0), 0);

  const tab = (key: string, label: string) => (
    <Link href={`/compras?vista=${key}`}>
      <Pill tone={vista === key ? "accent" : "muted"}>{label}</Pill>
    </Link>
  );

  return (
    <div>
      <Header
        title="Proveedores y compras"
        subtitle="Albaranes, facturas de proveedor, gastos y pedidos. Las piezas compradas entran solas en el almacen"
        right={
          <NewPurchaseButton
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, taxId: s.taxId }))}
            articles={articles.map((a) => ({ ...a, costPrice: Number(a.costPrice) }))}
            orders={orders}
            albaranes={pendingAlbaranes.map((a) => ({ id: a.id, supplierId: a.supplierId, supplierName: a.supplierName, number: a.number, date: fmtDate(a.date), total: Number(a.total) }))}
          />
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
        <MetricCard label="Comprado este ano" value={fmtEUR(yearTotal)} tone="accent" />
        <MetricCard label="Pendiente de pagar" value={fmtEUR(unpaid)} tone={unpaid ? "danger" : "success"} href="/caja" />
        <MetricCard label="Albaranes sin factura" value={pendingAlbaranes.length} tone="warning" href="/compras?tipo=albaran" />
        <MetricCard label="Proveedores" value={suppliers.length} tone="steel" href="/compras?vista=proveedores" />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {tab("compras", "Compras y gastos")}
        {tab("pedidos", "Pedidos a proveedor")}
        {tab("proveedores", "Proveedores")}
      </div>

      {selected && (
        <Card style={{ marginBottom: 14, borderColor: "var(--color-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Pill tone={KIND[selected.kind].tone}>{KIND[selected.kind].label}</Pill>
                <SectionTitle>
                  {selected.supplierName} {selected.number && `· ${selected.number}`}
                </SectionTitle>
              </div>
              <p style={muted}>
                {fmtDate(selected.date)} {selected.supplierNif && `· ${selected.supplierNif}`} · {selected.category}
                {selected.dueDate && ` · vence ${fmtDate(selected.dueDate)}`}
                {selected.order && ` · para ${selected.order.plate}`}
              </p>
              {selected.invoicedIn && <p style={muted}>Incluido en la factura {selected.invoicedIn.number || "(sin numero)"}</p>}
              {selected.notes && <p style={muted}>{selected.notes}</p>}
            </div>
            <Link href="/compras" style={{ color: "var(--color-text-faint)", fontSize: 20 }}>
              &times;
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "10px 0" }}>
            {selected.items.map((it) => (
              <div key={it.id} style={rowStyle}>
                <span>
                  {it.qty} x {it.concept} {it.article && <Pill tone="success">almacen</Pill>}
                </span>
                <span>
                  {fmtEUR(Number(it.unitCost))} · {it.vat}% · <strong>{fmtEUR(it.qty * Number(it.unitCost))}</strong>
                </span>
              </div>
            ))}
            {selected.albaranes.map((a) => (
              <Link key={a.id} href={`/compras?id=${a.id}`} style={rowStyle}>
                <span>Albaran {a.number || "sin numero"} · {fmtDate(a.date)}</span>
                <strong>{fmtEUR(Number(a.total))}</strong>
              </Link>
            ))}
          </div>
          <p style={{ ...muted, color: "var(--color-text-primary)" }}>
            Base {fmtEUR(Number(selected.subtotal))} · IVA {fmtEUR(Number(selected.vatTotal))} · <strong>Total {fmtEUR(Number(selected.total))}</strong>
            {selected.kind !== "albaran" && (selected.paid ? ` · Pagada ${selected.paidAt ? fmtDate(selected.paidAt) : ""}` : " · Sin pagar")}
          </p>
          <div style={{ marginTop: 10 }}>
            <PurchaseActions id={selected.id} paid={selected.paid} canPay={selected.kind !== "albaran"} />
          </div>
        </Card>
      )}

      {vista === "compras" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              ["", "Todo"],
              ["factura", "Facturas"],
              ["albaran", "Albaranes"],
              ["gasto", "Gastos"],
            ].map(([k, l]) => (
              <Link key={k} href={`/compras?tipo=${k}`}>
                <Pill tone={tipo === k ? "steel" : "muted"}>{l}</Pill>
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {purchases.length === 0 && (
              <Card>
                <p style={muted}>Aun no hay compras. Pulsa &laquo;Nueva compra o gasto&raquo; para apuntar la primera.</p>
              </Card>
            )}
            {purchases.map((p) => (
              <Link key={p.id} href={`/compras?id=${p.id}${tipo ? `&tipo=${tipo}` : ""}`}>
                <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: 14 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Pill tone={KIND[p.kind].tone}>{KIND[p.kind].label}</Pill>
                      <strong style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-primary)" }}>{p.supplierName}</strong>
                    </div>
                    <p style={{ ...muted, marginTop: 3 }}>
                      {p.number || "sin numero"} · {fmtDate(p.date)} · {p.category}
                      {p.order && ` · ${p.order.plate}`}
                      {p.invoicedIn && ` · en factura ${p.invoicedIn.number}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {p.kind !== "albaran" && <Pill tone={p.paid ? "success" : "danger"}>{p.paid ? "Pagada" : "Sin pagar"}</Pill>}
                    {p.kind === "albaran" && !p.invoicedInId && <Pill tone="warning">Sin facturar</Pill>}
                    <Pill tone="muted">{fmtEUR(Number(p.total))}</Pill>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {vista === "pedidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SectionTitle>Pedidos automaticos</SectionTitle>
            <p style={{ ...muted, margin: "4px 0 10px" }}>
              Mira los articulos que estan en su stock minimo o por debajo y prepara un pedido por proveedor (para dejarlos en el doble del minimo). Revisa
              las cantidades y envialo por WhatsApp o email.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <form
                action={async () => {
                  "use server";
                  await generateAutoOrders();
                }}
              >
                <Button type="submit" variant="primary">
                  Generar pedidos de lo que falta
                </Button>
              </form>
              <form action={createEmptyPurchaseOrder} style={{ display: "flex", gap: 6 }}>
                <Select name="supplierId" defaultValue="">
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit">Pedido a mano</Button>
              </form>
            </div>
          </Card>
          {purchaseOrders.length === 0 && (
            <Card>
              <p style={muted}>No hay pedidos.</p>
            </Card>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {purchaseOrders.map((po) => (
              <PurchaseOrderCard
                key={po.id}
                workshopName={settings.workshopName}
                suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
                articles={articles.map((a) => ({ id: a.id, name: a.name }))}
                po={{
                  id: po.id,
                  number: po.number,
                  status: po.status,
                  createdAt: fmtDate(po.createdAt),
                  supplierId: po.supplierId,
                  supplier: po.supplier ? { name: po.supplier.name, phone: po.supplier.phone, email: po.supplier.email } : null,
                  notes: po.notes,
                  items: po.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty })),
                }}
              />
            ))}
          </div>
        </div>
      )}

      {vista === "proveedores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {suppliers.map((s) => {
            const bought = s.purchases.filter((p) => p.kind !== "albaran").reduce((x, p) => x + Number(p.total), 0);
            const owe = s.purchases.filter((p) => p.kind !== "albaran" && !p.paid).reduce((x, p) => x + Number(p.total), 0);
            return (
              <Card key={s.id}>
                <details>
                  <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", listStyle: "none" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14 }}>
                      {s.name} <span style={{ fontWeight: 400, color: "var(--color-text-muted)", fontSize: 12.5 }}>{[s.taxId, s.phone, s.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span style={{ display: "flex", gap: 6 }}>
                      <Pill tone="accent">Este ano {fmtEUR(bought)}</Pill>
                      {owe > 0 && <Pill tone="danger">Debes {fmtEUR(owe)}</Pill>}
                    </span>
                  </summary>
                  <SupplierForm id={s.id} s={s} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <Link href={`/compras?prov=${s.id}`}>
                      <Button type="button" variant="ghost">
                        Ver sus compras
                      </Button>
                    </Link>
                    <form action={removeSupplier.bind(null, s.id)}>
                      <Button type="submit" variant="danger">
                        Borrar proveedor
                      </Button>
                    </form>
                  </div>
                </details>
              </Card>
            );
          })}
          <Card>
            <SectionTitle>Nuevo proveedor</SectionTitle>
            <SupplierForm id={null} s={null} />
          </Card>
        </div>
      )}
    </div>
  );
}

function SupplierForm({ id, s }: { id: string | null; s: { name: string; taxId: string; phone: string; email: string; address: string; notes: string } | null }) {
  return (
    <form action={saveSupplier.bind(null, id)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 10 }}>
      <Field label="Nombre">
        <TextInput name="name" defaultValue={s?.name} required />
      </Field>
      <Field label="NIF / CIF">
        <TextInput name="taxId" defaultValue={s?.taxId} />
      </Field>
      <Field label="Telefono / WhatsApp">
        <TextInput name="phone" defaultValue={s?.phone} />
      </Field>
      <Field label="Email de pedidos">
        <TextInput name="email" type="email" defaultValue={s?.email} />
      </Field>
      <Field label="Direccion">
        <TextInput name="address" defaultValue={s?.address} />
      </Field>
      <Field label="Notas">
        <TextArea name="notes" defaultValue={s?.notes} style={{ minHeight: 38 }} />
      </Field>
      <Button type="submit" variant="primary" style={{ alignSelf: "end" }}>
        {id ? "Guardar" : "Anadir proveedor"}
      </Button>
    </form>
  );
}

const muted = { margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" } as const;
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

