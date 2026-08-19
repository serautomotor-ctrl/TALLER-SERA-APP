"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { createBudget } from "@/app/presupuestos/actions";

type Vehicle = { id: string; plate: string; clientName: string; clientNif: string; clientAddress: string };
type ItemKind = "concepto" | "mano_obra";
type Item = { id: number; kind: ItemKind; concept: string; qty: number; unitPrice: number; discount: number; vat: number };

let nextId = 1;
const blankItem = (kind: ItemKind): Item => ({ id: nextId++, kind, concept: "", qty: 1, unitPrice: 0, discount: 0, vat: 21 });

export function NewBudgetButton({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [items, setItems] = useState<Item[]>([blankItem("concepto")]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPlate("");
    setClientName("");
    setClientNif("");
    setClientAddress("");
    setItems([blankItem("concepto")]);
  };

  const handlePlateChange = (value: string) => {
    const upper = value.toUpperCase();
    setPlate(upper);
    const match = vehicles.find((v) => v.plate === upper);
    if (match) {
      setClientName(match.clientName);
      setClientNif(match.clientNif);
      setClientAddress(match.clientAddress);
    }
  };

  const updateItem = (id: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const addItem = (kind: ItemKind) => setItems((prev) => [...prev, blankItem(kind)]);
  const removeItem = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));

  const lineBase = (it: Item) => it.qty * it.unitPrice * (1 - (it.discount || 0) / 100);
  const subtotal = items.reduce((s, it) => s + lineBase(it), 0);
  const vatTotal = items.reduce((s, it) => s + lineBase(it) * (it.vat / 100), 0);
  const total = subtotal + vatTotal;
  const canSubmit = plate.trim() && items.some((it) => it.concept.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await createBudget({ plate, clientName, clientNif, clientAddress, items });
    setSubmitting(false);
    if (res.budgetId) {
      setOpen(false);
      reset();
      router.push(`/presupuestos?id=${res.budgetId}`);
    }
  };

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nuevo presupuesto
      </Button>
      {open && (
        <Modal title="Nuevo presupuesto" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              <Field label="Matricula">
                <TextInput list="pre-plates" value={plate} onChange={(e) => handlePlateChange(e.target.value)} placeholder="0000 ABC" />
                <datalist id="pre-plates">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plate} />
                  ))}
                </datalist>
              </Field>
              <Field label="Cliente">
                <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre o razon social" />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              <Field label="NIF del cliente (opcional)">
                <TextInput value={clientNif} onChange={(e) => setClientNif(e.target.value)} placeholder="00000000A" />
              </Field>
              <Field label="Direccion (opcional)">
                <TextInput value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Calle, numero, ciudad" />
              </Field>
            </div>

            <ItemsSection
              title="Conceptos"
              placeholder="Pieza, servicio..."
              addLabel="Anadir concepto"
              items={items.filter((it) => it.kind === "concepto")}
              updateItem={updateItem}
              removeItem={removeItem}
              onAdd={() => addItem("concepto")}
            />

            <ItemsSection
              title="Mano de obra"
              placeholder="Descripcion del trabajo realizado"
              addLabel="Anadir mano de obra"
              items={items.filter((it) => it.kind === "mano_obra")}
              updateItem={updateItem}
              removeItem={removeItem}
              onAdd={() => addItem("mano_obra")}
            />

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
              <Row label="Base imponible" value={fmtEUR(subtotal)} />
              <Row label="IVA" value={fmtEUR(vatTotal)} />
              <Row label="Total" value={fmtEUR(total)} strong />
            </div>

            <Button variant="primary" type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "Guardando..." : "Crear presupuesto"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

const ROW_COLUMNS = "minmax(0, 1fr) 40px 58px 44px 48px 20px";

function ItemsSection({
  title,
  placeholder,
  addLabel,
  items,
  updateItem,
  removeItem,
  onAdd,
}: {
  title: string;
  placeholder: string;
  addLabel: string;
  items: Item[];
  updateItem: (id: number, patch: Partial<Item>) => void;
  removeItem: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: 0.3, textTransform: "uppercase" }}>{title}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: 6 }}>
            <span style={labelStyle}>Descripcion</span>
            <span style={labelStyle}>Cant.</span>
            <span style={labelStyle}>Precio</span>
            <span style={labelStyle}>Dto. %</span>
            <span style={labelStyle}>IVA</span>
            <span />
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: ROW_COLUMNS, gap: 6, alignItems: "center" }}>
            <TextInput
              placeholder={placeholder}
              value={it.concept}
              onChange={(e) => updateItem(it.id, { concept: e.target.value })}
              style={{ fontSize: 12.5, padding: "6px 8px" }}
            />
            <TextInput
              type="number"
              min="0"
              value={it.qty}
              onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) || 0 })}
              style={{ fontSize: 12.5, padding: "6px 6px" }}
            />
            <TextInput
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio"
              value={it.unitPrice}
              onChange={(e) => updateItem(it.id, { unitPrice: Number(e.target.value) || 0 })}
              style={{ fontSize: 12.5, padding: "6px 6px" }}
            />
            <TextInput
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={it.discount}
              onChange={(e) => updateItem(it.id, { discount: Number(e.target.value) || 0 })}
              style={{ fontSize: 12.5, padding: "6px 6px" }}
            />
            <Select value={it.vat} onChange={(e) => updateItem(it.id, { vat: Number(e.target.value) })} style={{ fontSize: 12, padding: "6px 4px" }}>
              <option value={21}>21%</option>
              <option value={10}>10%</option>
              <option value={4}>4%</option>
              <option value={0}>0%</option>
            </Select>
            <button type="button" onClick={() => removeItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}>
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
      <Button variant="ghost" type="button" onClick={onAdd} style={{ marginTop: 8 }}>
        <IconPlus /> {addLabel}
      </Button>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--color-text-faint)",
  textTransform: "uppercase",
  letterSpacing: 0.2,
};

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 500, color: strong ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-body)", fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500, color: strong ? "var(--color-accent)" : "var(--color-text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
