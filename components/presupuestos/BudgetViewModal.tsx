"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconInvoice, IconPrint } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";
import { convertBudgetToInvoice } from "@/app/presupuestos/actions";

type BudgetItem = { id: string; concept: string; qty: number; unitPrice: number; discount: number; vat: number; kind: string };
type Budget = {
  id: string;
  number: string;
  plate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  createdAt: Date;
  invoiceId: string | null;
  items: BudgetItem[];
};
type Company = { workshopName: string; taxId: string; address: string; logoUrl: string };

export function BudgetViewModal({ budget, company }: { budget: Budget; company: Company }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [budgetError, setBudgetError] = useState("");

  const close = () => router.replace("/presupuestos");

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=460,height=680");
    if (!w) return;

    const rowsFor = (kind: string) =>
      budget.items
        .filter((it) => it.kind === kind)
        .map(
          (it) =>
            `<tr><td>${it.concept}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${it.unitPrice.toFixed(2)} EUR</td><td style="text-align:right">${it.discount ? it.discount + "%" : "-"}</td><td style="text-align:right">${it.vat}%</td></tr>`
        )
        .join("");
    const conceptRows = rowsFor("concepto");
    const laborRows = rowsFor("mano_obra");
    const tableHead = `<thead><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;">Descripcion</th><th>Cant.</th><th>Precio</th><th>Dto.</th><th>IVA</th></tr></thead>`;

    w.document.write(`
      <html>
        <head><title>Presupuesto ${budget.number}</title></head>
        <body style="font-family: Arial, sans-serif; padding:24px; color:#111; position:relative;" onload="window.print()">
          ${company.logoUrl ? `<img src="${company.logoUrl}" style="position:fixed; top:50%; left:50%; width:340px; height:340px; object-fit:contain; transform:translate(-50%,-50%); opacity:0.09; z-index:0;" />` : ""}
          <div style="position:relative; z-index:1;">
          <div style="display:flex; align-items:center; gap:12px;">
            ${company.logoUrl ? `<img src="${company.logoUrl}" style="width:56px; height:56px; object-fit:contain;" />` : ""}
            <div>
              <h2 style="margin-bottom:2px;">Presupuesto ${budget.number}</h2>
              <p style="color:#555; margin-top:0;">${fmtDate(budget.createdAt)}</p>
            </div>
          </div>
          <p><strong>${company.workshopName || ""}</strong><br/>${company.taxId || ""}<br/>${company.address || ""}</p>
          <p>Cliente: ${budget.clientName || "-"} ${budget.clientNif ? "(" + budget.clientNif + ")" : ""}${budget.clientAddress ? "<br/>" + budget.clientAddress : ""}<br/>Vehiculo: ${budget.plate}</p>
          ${conceptRows ? `<p style="margin:14px 0 4px;"><strong>Conceptos</strong></p><table width="100%" style="border-collapse:collapse;">${tableHead}<tbody>${conceptRows}</tbody></table>` : ""}
          ${laborRows ? `<p style="margin:14px 0 4px;"><strong>Mano de obra</strong></p><table width="100%" style="border-collapse:collapse;">${tableHead}<tbody>${laborRows}</tbody></table>` : ""}
          <p style="margin-top:14px;">Base imponible: ${budget.subtotal.toFixed(2)} EUR<br/>IVA: ${budget.vatTotal.toFixed(2)} EUR<br/><strong>Total: ${budget.total.toFixed(2)} EUR</strong></p>
          <p style="margin-top:18px; font-size:11px; color:#888;">Presupuesto sin validez de factura. Sujeto a confirmacion.</p>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
  };

  const conceptItems = budget.items.filter((it) => it.kind === "concepto");
  const laborItems = budget.items.filter((it) => it.kind === "mano_obra");

  return (
    <Modal title={`Presupuesto ${budget.number}`} onClose={close}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {company.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.workshopName} style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
        )}
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          {budget.clientName || "Sin cliente"} {budget.clientNif ? `· ${budget.clientNif}` : ""} · {budget.plate}
          {budget.clientAddress ? <><br />{budget.clientAddress}</> : null}
        </p>

        {conceptItems.length > 0 && (
          <div>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--color-text-faint)", textTransform: "uppercase" }}>
              Conceptos
            </p>
            <ItemsList items={conceptItems} />
          </div>
        )}
        {laborItems.length > 0 && (
          <div>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--color-text-faint)", textTransform: "uppercase" }}>
              Mano de obra
            </p>
            <ItemsList items={laborItems} />
          </div>
        )}

        <Row label="Base imponible" value={fmtEUR(budget.subtotal)} />
        <Row label="IVA" value={fmtEUR(budget.vatTotal)} />
        <Row label="Total" value={fmtEUR(budget.total)} strong />

        {budgetError && (
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-danger, #c0392b)" }}>{budgetError}</p>
        )}
        {budget.invoiceId ? (
          <Link href={`/facturas?id=${budget.invoiceId}`}>
            <Button variant="primary" type="button" style={{ width: "100%" }}>
              <IconInvoice /> Ver factura
            </Button>
          </Link>
        ) : (
          <Button
            variant="primary"
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await convertBudgetToInvoice(budget.id);
                if (res.error) setBudgetError(res.error);
                else if (res.invoiceId) router.push(`/facturas?id=${res.invoiceId}`);
              });
            }}
          >
            <IconInvoice /> {pending ? "Facturando..." : "Facturar"}
          </Button>
        )}

        <Button variant="ghost" type="button" onClick={handlePrint}>
          <IconPrint /> Imprimir / descargar
        </Button>
      </div>
    </Modal>
  );
}

function ItemsList({ items }: { items: BudgetItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--color-surface-2)", borderRadius: 8, padding: 10 }}>
      {items.map((it) => (
        <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}>
          <span>
            {it.concept} x{it.qty}
            {it.discount > 0 ? ` · -${it.discount}%` : ""}
          </span>
          <span>{fmtEUR(it.qty * it.unitPrice * (1 - it.discount / 100))}</span>
        </div>
      ))}
    </div>
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
