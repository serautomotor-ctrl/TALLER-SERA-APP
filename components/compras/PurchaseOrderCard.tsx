"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/inputs";
import { SendButtons } from "@/components/ui/SendButtons";
import { addPoItem, markPoSent, receivePurchaseOrder, removePurchaseOrder, setPoItemQty, setPoSupplier } from "@/app/compras/actions";

type Po = {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  supplierId: string | null;
  supplier: { name: string; phone: string; email: string } | null;
  notes: string;
  items: { id: string; name: string; qty: number }[];
};

const STATUS = { borrador: { label: "Borrador", tone: "muted" as const }, enviado: { label: "Enviado", tone: "warning" as const }, recibido: { label: "Recibido", tone: "success" as const } };

export function PurchaseOrderCard({
  po,
  suppliers,
  articles,
  workshopName,
}: {
  po: Po;
  suppliers: { id: string; name: string }[];
  articles: { id: string; name: string }[];
  workshopName: string;
}) {
  const [pending, start] = useTransition();
  const editable = po.status !== "recibido";
  const message = `Hola, somos ${workshopName}. Os hacemos el pedido ${po.number}:\n${po.items.map((i) => `- ${i.qty} x ${i.name}`).join("\n")}\n\nGracias.`;
  const st = STATUS[po.status as keyof typeof STATUS];

  return (
    <Card style={{ opacity: pending ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontFamily: "var(--font-mono)" }}>{po.number}</strong>
          <Pill tone={st.tone}>{st.label}</Pill>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>{po.createdAt}</span>
        </div>
        {editable ? (
          <Select defaultValue={po.supplierId || ""} onChange={(e) => start(() => setPoSupplier(po.id, e.target.value))} style={{ fontSize: 12.5, padding: "6px 8px" }}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        ) : (
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>{po.supplier?.name}</span>
        )}
      </div>
      {po.notes && <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-warning)" }}>{po.notes}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {po.items.length === 0 && <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-faint)" }}>Sin articulos todavia.</span>}
        {po.items.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: "var(--color-surface-2)", borderRadius: 6, padding: "5px 8px", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
            <span>{i.name}</span>
            {editable ? (
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button type="button" onClick={() => start(() => setPoItemQty(i.id, i.qty - 1))} style={qtyBtn}>
                  −
                </button>
                <strong style={{ minWidth: 22, textAlign: "center" }}>{i.qty}</strong>
                <button type="button" onClick={() => start(() => setPoItemQty(i.id, i.qty + 1))} style={qtyBtn}>
                  +
                </button>
              </span>
            ) : (
              <strong>{i.qty}</strong>
            )}
          </div>
        ))}
      </div>

      {editable && (
        <form action={(fd) => start(() => addPoItem(po.id, fd))} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 54px auto", gap: 6, marginTop: 8 }}>
          <Select name="articleId" defaultValue="" style={{ fontSize: 12.5, padding: "6px 8px" }}>
            <option value="">Anadir articulo del catalogo...</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <TextInput name="qty" type="number" min="1" defaultValue={1} style={{ fontSize: 12.5, padding: "6px 6px" }} />
          <Button type="submit">Anadir</Button>
        </form>
      )}

      {editable && po.items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <SendButtons
            phone={po.supplier?.phone}
            email={po.supplier?.email}
            subject={`Pedido ${po.number} - ${workshopName}`}
            message={message}
            onSent={() => po.status === "borrador" && start(() => markPoSent(po.id))}
          />
          <form
            action={(fd) => {
              if (confirm("¿Ha llegado todo? Se creara el albaran y las piezas entraran en el almacen.")) start(() => receivePurchaseOrder(po.id, fd));
            }}
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 6 }}
          >
            <TextInput name="number" placeholder="N.º de albaran del proveedor" style={{ fontSize: 12.5, padding: "6px 8px" }} />
            <Button type="submit" variant="primary">
              Mercancia recibida
            </Button>
          </form>
        </div>
      )}
      {po.status !== "recibido" && (
        <button
          type="button"
          onClick={() => confirm("¿Borrar este pedido?") && start(() => removePurchaseOrder(po.id))}
          style={{ marginTop: 8, background: "none", border: "none", color: "var(--color-text-faint)", fontFamily: "var(--font-body)", fontSize: 12, cursor: "pointer", padding: 0 }}
        >
          Borrar pedido
        </button>
      )}
    </Card>
  );
}

const qtyBtn = { width: 24, height: 24, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", cursor: "pointer" } as const;
