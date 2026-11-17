"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconQr, IconTrash } from "@/components/ui/icons";
import { fmtDate, fmtEUR, fmtTime } from "@/lib/format";
import { stockLevel } from "@/lib/stock";
import { removeArticle } from "@/app/ordenes/actions";
import { addStockEntry, adjustStock, getStockMovements, updateArticle } from "@/app/articulos/actions";
import { ArticleQrModal } from "@/components/ordenes/ArticleQrModal";

export type ArticleView = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  supplier: string;
  tracked: boolean;
};

type Panel = null | "qr" | "entrada" | "ajuste" | "editar" | "historial";

const LEVEL = {
  sin_contar: { tone: "muted" as const, label: "Sin contar" },
  ok: { tone: "success" as const, label: "En stock" },
  bajo: { tone: "warning" as const, label: "Stock bajo" },
  agotado: { tone: "danger" as const, label: "Agotado" },
};

const smallBtn = { padding: "6px 10px", fontSize: 12.5 };

export function ArticleCard({ article }: { article: ArticleView }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [, startTransition] = useTransition();
  const level = stockLevel(article.stock, article.minStock, article.tracked);
  const close = () => setPanel(null);

  return (
    <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 260px" }}>
        <div
          style={{
            minWidth: 58,
            textAlign: "center",
            padding: "6px 8px",
            borderRadius: 10,
            background: level === "ok" || level === "sin_contar" ? "var(--color-surface-2)" : level === "bajo" ? "var(--color-warning-soft)" : "var(--color-danger-soft)",
          }}
          title="Unidades en el almacen"
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 20,
              color: level === "sin_contar" ? "var(--color-text-faint)" : level === "ok" ? "var(--color-text-primary)" : level === "bajo" ? "var(--color-warning)" : "var(--color-danger)",
            }}
          >
            {level === "sin_contar" ? "—" : article.stock}
          </p>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--color-text-muted)" }}>uds.</p>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{article.name}</p>
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--color-accent)" }}>
            {fmtEUR(article.price)}
            {article.costPrice > 0 && <span style={{ color: "var(--color-text-faint)" }}> · coste {fmtEUR(article.costPrice)}</span>}
          </p>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 5 }}>
            <Pill tone={LEVEL[level].tone}>{LEVEL[level].label}</Pill>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>
              Minimo {article.minStock}
              {article.supplier ? ` · ${article.supplier}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Button type="button" variant="primary" onClick={() => setPanel("entrada")} style={smallBtn}>
          <IconPlus /> Entrada
        </Button>
        <Button type="button" onClick={() => setPanel("ajuste")} style={smallBtn}>
          Recuento
        </Button>
        <Button type="button" onClick={() => setPanel("historial")} style={smallBtn}>
          Historial
        </Button>
        <Button type="button" onClick={() => setPanel("editar")} style={smallBtn}>
          Editar
        </Button>
        <Button type="button" onClick={() => setPanel("qr")} style={smallBtn}>
          <IconQr /> QR
        </Button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Eliminar ${article.name}? Se borrara tambien su historial de stock.`)) startTransition(() => removeArticle(article.id));
          }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          aria-label="Eliminar articulo"
        >
          <IconTrash />
        </button>
      </div>

      {panel === "qr" && <ArticleQrModal article={article} onClose={close} />}
      {panel === "entrada" && <EntryModal article={article} onClose={close} />}
      {panel === "ajuste" && <AdjustModal article={article} onClose={close} />}
      {panel === "editar" && <EditModal article={article} onClose={close} />}
      {panel === "historial" && <HistoryModal article={article} onClose={close} />}
    </Card>
  );
}

function EntryModal({ article, onClose }: { article: ArticleView; onClose: () => void }) {
  return (
    <Modal title={`Entrada · ${article.name}`} onClose={onClose}>
      <form
        action={async (fd) => {
          await addStockEntry(article.id, fd);
          onClose();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          Mercancia que llega al taller. Ahora hay <b style={{ color: "var(--color-text-primary)" }}>{article.stock}</b> uds.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Unidades que entran">
            <TextInput name="qty" type="number" min={1} step={1} defaultValue={1} required autoFocus />
          </Field>
          <Field label="Coste por unidad">
            <TextInput name="unitCost" inputMode="decimal" placeholder={article.costPrice ? String(article.costPrice) : "0.00"} />
          </Field>
        </div>
        <Field label="Proveedor">
          <TextInput name="supplier" defaultValue={article.supplier} placeholder="Nombre del proveedor" />
        </Field>
        <Field label="Nota (opcional)">
          <TextInput name="note" placeholder="N.º de albaran, factura..." />
        </Field>
        <Button variant="primary" type="submit">
          Guardar entrada
        </Button>
      </form>
    </Modal>
  );
}

function AdjustModal({ article, onClose }: { article: ArticleView; onClose: () => void }) {
  return (
    <Modal title={`Recuento · ${article.name}`} onClose={onClose}>
      <form
        action={async (fd) => {
          await adjustStock(article.id, fd);
          onClose();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          Cuenta las unidades que hay de verdad en el almacen. El programa dice <b style={{ color: "var(--color-text-primary)" }}>{article.stock}</b>.
        </p>
        <Field label="Unidades contadas">
          <TextInput name="count" type="number" min={0} step={1} defaultValue={Math.max(0, article.stock)} required autoFocus />
        </Field>
        <Field label="Motivo (opcional)">
          <TextInput name="note" placeholder="Recuento, rotura, perdida..." />
        </Field>
        <Button variant="primary" type="submit">
          Guardar recuento
        </Button>
      </form>
    </Modal>
  );
}

function EditModal({ article, onClose }: { article: ArticleView; onClose: () => void }) {
  return (
    <Modal title="Editar articulo" onClose={onClose}>
      <form
        action={async (fd) => {
          await updateArticle(article.id, fd);
          onClose();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Field label="Nombre">
          <TextInput name="name" defaultValue={article.name} required />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Precio venta">
            <TextInput name="price" inputMode="decimal" defaultValue={article.price} required />
          </Field>
          <Field label="Coste">
            <TextInput name="costPrice" inputMode="decimal" defaultValue={article.costPrice} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Stock minimo">
            <TextInput name="minStock" type="number" min={0} step={1} defaultValue={article.minStock} />
          </Field>
          <Field label="Proveedor">
            <TextInput name="supplier" defaultValue={article.supplier} />
          </Field>
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>
          Las unidades no se cambian aqui: usa Entrada o Recuento para que quede apuntado en el historial.
        </p>
        <Button variant="primary" type="submit">
          Guardar cambios
        </Button>
      </form>
    </Modal>
  );
}

type Movement = Awaited<ReturnType<typeof getStockMovements>>[number];

const KIND: Record<string, { label: string; tone: "success" | "accent" | "steel" | "warning" }> = {
  entrada: { label: "Entrada", tone: "success" },
  salida_orden: { label: "Usado en orden", tone: "accent" },
  devolucion_orden: { label: "Devuelto de orden", tone: "steel" },
  ajuste: { label: "Recuento", tone: "warning" },
};

function HistoryModal({ article, onClose }: { article: ArticleView; onClose: () => void }) {
  const [rows, setRows] = useState<Movement[] | null>(null);

  useEffect(() => {
    let alive = true;
    getStockMovements(article.id).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [article.id]);

  return (
    <Modal title={`Historial · ${article.name}`} onClose={onClose}>
      {rows === null && <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Cargando...</p>}
      {rows?.length === 0 && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Todavia no hay movimientos de este articulo.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows?.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 14,
                minWidth: 40,
                color: m.qty > 0 ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {m.qty > 0 ? `+${m.qty}` : m.qty}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <Pill tone={KIND[m.kind]?.tone ?? "muted"}>{KIND[m.kind]?.label ?? m.kind}</Pill>
                {m.orderId && m.plate && (
                  <Link href={`/ordenes?qr=${m.orderId}`} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-accent)" }}>
                    {m.plate}
                  </Link>
                )}
              </div>
              <p style={{ margin: "3px 0 0", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-text-faint)" }}>
                {fmtDate(m.createdAt)} {fmtTime(m.createdAt)}
                {m.note ? ` · ${m.note}` : ""}
                {m.unitCost !== null ? ` · ${fmtEUR(m.unitCost)}/ud.` : ""}
              </p>
            </div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>quedan {m.stockAfter}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
