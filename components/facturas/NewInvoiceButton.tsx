"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { createInvoice } from "@/app/facturas/actions";

type Vehicle = { id: string; plate: string; clientName: string };
type Item = { id: number; concept: string; qty: number; unitPrice: number; vat: number };

let nextId = 1;

export function NewInvoiceButton({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [items, setItems] = useState<Item[]>([{ id: nextId++, concept: "", qty: 1, unitPrice: 0, vat: 21 }]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPlate("");
    setClientName("");
    setClientNif("");
    setItems([{ id: nextId++, concept: "", qty: 1, unitPrice: 0, vat: 21 }]);
  };

  const handlePlateChange = (value: string) => {
    const upper = value.toUpperCase();
    setPlate(upper);
    const match = vehicles.find((v) => v.plate === upper);
    if (match) setClientName(match.clientName);
  };

  const updateItem = (id: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { id: nextId++, concept: "", qty: 1, unitPrice: 0, vat: 21 }]);
  const removeItem = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const vatTotal = items.reduce((s, it) => s + it.qty * it.unitPrice * (it.vat / 100), 0);
  const total = subtotal + vatTotal;
  const canSubmit = plate.trim() && items.some((it) => it.concept.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await createInvoice({ plate, clientName, clientNif, items });
    setSubmitting(false);
    if (res.invoiceId) {
      setOpen(false);
      reset();
      router.push(`/facturas?id=${res.invoiceId}`);
    }
  };

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva factura
      </Button>
      {open && (
        <Modal title="Nueva factura" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              <Field label="Matricula">
                <TextInput list="fac-plates" value={plate} onChange={(e) => handlePlateChange(e.target.value)} placeholder="0000 ABC" />
                <datalist id="fac-plates">
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plate} />
                  ))}
                </datalist>
              </Field>
              <Field label="Cliente">
                <TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre o razon social" />
              </Field>
            </div>
            <Field label="NIF del cliente (opcional)">
              <TextInput value={clientNif} onChange={(e) => setClientNif(e.target.value)} placeholder="00000000A" />
            </Field>

            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: 0.3, textTransform: "uppercase" }}>Conceptos</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {items.map((it) => (
                  <div key={it.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px 64px 52px 20px", gap: 6, alignItems: "center" }}>
                    <TextInput
                      placeholder="Concepto"
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
              <Button variant="ghost" type="button" onClick={addItem} style={{ marginTop: 8 }}>
                <IconPlus /> Anadir concepto
              </Button>
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
              <Row label="Base imponible" value={fmtEUR(subtotal)} />
              <Row label="IVA" value={fmtEUR(vatTotal)} />
              <Row label="Total" value={fmtEUR(total)} strong />
            </div>

            <Button variant="primary" type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "Emitiendo..." : "Emitir factura"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

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
