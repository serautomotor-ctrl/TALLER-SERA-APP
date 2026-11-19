"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { createPurchase } from "@/app/compras/actions";

type Supplier = { id: string; name: string; taxId: string };
type Article = { id: string; name: string; costPrice: number; reference: string };
type OpenOrder = { id: string; plate: string; description: string };
type PendingAlbaran = { id: string; supplierId: string | null; supplierName: string; number: string; date: string; total: number };
type Line = { key: number; articleId: string; concept: string; qty: number; unitCost: number; vat: number };

let k = 1;
const blank = (): Line => ({ key: k++, articleId: "", concept: "", qty: 1, unitCost: 0, vat: 21 });

export const CATEGORIES = ["Recambios", "Aceites y liquidos", "Neumaticos", "Herramienta", "Alquiler", "Luz, agua y telefono", "Seguros", "Gestoria y asesoria", "Publicidad", "Combustible", "Reparaciones y mantenimiento", "Gastos generales"];

export function NewPurchaseButton({
  suppliers,
  articles,
  orders,
  albaranes,
}: {
  suppliers: Supplier[];
  articles: Article[];
  orders: OpenOrder[];
  albaranes: PendingAlbaran[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"albaran" | "factura" | "gasto">("factura");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierNif, setSupplierNif] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Recambios");
  const [orderId, setOrderId] = useState("");
  const [addToOrder, setAddToOrder] = useState(true);
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [albaranIds, setAlbaranIds] = useState<string[]>([]);
  const [manualBase, setManualBase] = useState("");
  const [manualVatRate, setManualVatRate] = useState(21);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const supplierAlbaranes = useMemo(() => albaranes.filter((a) => supplierId && a.supplierId === supplierId), [albaranes, supplierId]);

  const upd = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickArticle = (key: number, articleId: string) => {
    const a = articles.find((x) => x.id === articleId);
    upd(key, a ? { articleId, concept: a.name, unitCost: a.costPrice } : { articleId: "" });
  };

  const linesBase = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const linesVat = lines.reduce((s, l) => s + l.qty * l.unitCost * (l.vat / 100), 0);
  const albBase = albaranes.filter((a) => albaranIds.includes(a.id)).reduce((s, a) => s + a.total, 0);
  const manualB = parseFloat(manualBase.replace(",", ".")) || 0;
  const useManual = kind === "gasto" && !lines.some((l) => l.concept.trim());
  const base = useManual ? manualB : linesBase;
  const vat = useManual ? manualB * (manualVatRate / 100) : linesVat;

  const submit = async () => {
    setSaving(true);
    setError("");
    const res = await createPurchase({
      kind,
      supplierId: supplierId || null,
      supplierName,
      supplierNif,
      number,
      date,
      dueDate,
      category: kind === "gasto" ? category : "Recambios",
      orderId: orderId || null,
      addToOrder,
      notes,
      paid,
      albaranIds,
      manualBase: useManual ? manualB : undefined,
      manualVat: useManual ? manualB * (manualVatRate / 100) : undefined,
      lines: lines.map((l) => ({ articleId: l.articleId || null, concept: l.concept, qty: l.qty, unitCost: l.unitCost, vat: l.vat })),
    });
    setSaving(false);
    if (res.error) return setError(res.error);
    setOpen(false);
    setLines([blank()]);
    setAlbaranIds([]);
    setNumber("");
    router.push(`/compras?id=${res.id}`);
  };

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva compra o gasto
      </Button>
      {open && (
        <Modal title="Registrar compra" onClose={() => setOpen(false)} maxWidth={560}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  ["albaran", "Albaran"],
                  ["factura", "Factura proveedor"],
                  ["gasto", "Gasto"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setKind(key);
                    if (key === "gasto" && category === "Recambios") setCategory("Gastos generales");
                  }}
                  style={tabStyle(kind === key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p style={hint}>
              {kind === "albaran" && "La mercancia entra en el almacen. Luego, al llegar la factura del proveedor, la juntas con sus albaranes."}
              {kind === "factura" && "Factura de un proveedor. Puedes incluir albaranes que ya tengas apuntados para que cuadre."}
              {kind === "gasto" && "Alquiler, luz, gestoria, herramienta... Cuenta para el IVA soportado y los gastos del trimestre."}
            </p>

            <Field label="Proveedor">
              <Select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setAlbaranIds([]);
                  const s = suppliers.find((x) => x.id === e.target.value);
                  setSupplierNif(s?.taxId || "");
                }}
              >
                <option value="">Otro (escribir abajo)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {!supplierId && (
              <div style={grid2}>
                <TextInput value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nombre del proveedor" />
                <TextInput value={supplierNif} onChange={(e) => setSupplierNif(e.target.value)} placeholder="NIF/CIF" />
              </div>
            )}

            <div style={grid2}>
              <Field label={kind === "albaran" ? "N.º albaran" : "N.º factura"}>
                <TextInput value={number} onChange={(e) => setNumber(e.target.value)} />
              </Field>
              <Field label="Fecha">
                <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            {kind !== "albaran" && (
              <div style={grid2}>
                <Field label="Vencimiento (opcional)">
                  <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
                {kind === "gasto" ? (
                  <Field label="Tipo de gasto">
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <span />
                )}
              </div>
            )}

            {kind === "factura" && supplierAlbaranes.length > 0 && (
              <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: 10 }}>
                <p style={{ ...hint, marginBottom: 6, fontWeight: 600 }}>Albaranes pendientes de facturar de este proveedor</p>
                {supplierAlbaranes.map((a) => (
                  <label key={a.id} style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 12.5, padding: "3px 0" }}>
                    <input
                      type="checkbox"
                      checked={albaranIds.includes(a.id)}
                      onChange={(e) => setAlbaranIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                    />
                    {a.number || "Sin numero"} · {a.date} · {fmtEUR(a.total)}
                  </label>
                ))}
              </div>
            )}

            {kind !== "gasto" && (
              <Field label="Para la orden (opcional)">
                <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                  <option value="">Para el almacen</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.plate} {o.description && `· ${o.description.slice(0, 40)}`}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {orderId && kind !== "gasto" && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
                <input type="checkbox" checked={addToOrder} onChange={(e) => setAddToOrder(e.target.checked)} /> Anadir las piezas del catalogo a esa orden
              </label>
            )}

            <div>
              <p style={{ ...hint, fontWeight: 600, marginBottom: 6 }}>{kind === "gasto" ? "Lineas (opcional)" : "Lineas"}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lines.map((l) => (
                  <div key={l.key} style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {kind !== "gasto" && (
                      <Select value={l.articleId} onChange={(e) => pickArticle(l.key, e.target.value)} style={small}>
                        <option value="">Concepto libre (no entra en almacen)</option>
                        {articles.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} {a.reference && `· ${a.reference}`}
                          </option>
                        ))}
                      </Select>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 46px 70px 56px 22px", gap: 5, alignItems: "center" }}>
                      <TextInput value={l.concept} onChange={(e) => upd(l.key, { concept: e.target.value })} placeholder="Concepto" style={small} />
                      <TextInput type="number" min="1" value={l.qty} onChange={(e) => upd(l.key, { qty: Number(e.target.value) || 0 })} style={small} />
                      <TextInput type="number" step="0.01" value={l.unitCost} onChange={(e) => upd(l.key, { unitCost: Number(e.target.value) || 0 })} style={small} title="Coste unitario sin IVA" />
                      <Select value={l.vat} onChange={(e) => upd(l.key, { vat: Number(e.target.value) })} style={small}>
                        <option value={21}>21%</option>
                        <option value={10}>10%</option>
                        <option value={4}>4%</option>
                        <option value={0}>0%</option>
                      </Select>
                      <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" onClick={() => setLines((ls) => [...ls, blank()])} style={{ marginTop: 8 }}>
                <IconPlus /> Anadir linea
              </Button>
            </div>

            {useManual && (
              <div style={grid2}>
                <Field label="Base imponible">
                  <TextInput value={manualBase} onChange={(e) => setManualBase(e.target.value)} placeholder="0,00" />
                </Field>
                <Field label="IVA">
                  <Select value={manualVatRate} onChange={(e) => setManualVatRate(Number(e.target.value))}>
                    <option value={21}>21%</option>
                    <option value={10}>10%</option>
                    <option value={4}>4%</option>
                    <option value={0}>Sin IVA</option>
                  </Select>
                </Field>
              </div>
            )}

            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" />
            {kind !== "albaran" && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Ya esta pagada
              </label>
            )}

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8, fontFamily: "var(--font-body)", fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>
              {albBase > 0 && <span>Albaranes incluidos: {fmtEUR(albBase)} (con IVA)</span>}
              <span>Base: {fmtEUR(base)} · IVA: {fmtEUR(vat)}</span>
              <strong style={{ fontSize: 15 }}>Total: {fmtEUR(base + vat + albBase)}</strong>
            </div>
            {error && <p style={{ margin: 0, color: "var(--color-danger)", fontFamily: "var(--font-body)", fontSize: 12.5 }}>{error}</p>}
            <Button type="button" variant="primary" disabled={saving} onClick={submit}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8 };
const small: CSSProperties = { fontSize: 12.5, padding: "6px 7px" };
const hint: CSSProperties = { margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" };
function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "7px 6px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    background: active ? "var(--color-accent-soft)" : "var(--color-surface-2)",
    color: active ? "var(--color-accent)" : "var(--color-text-muted)",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fontSize: 12.5,
    cursor: "pointer",
  };
}
