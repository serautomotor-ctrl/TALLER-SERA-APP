"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";

type InvoiceItem = { id: string; concept: string; qty: number; unitPrice: number; vat: number };
type Invoice = {
  id: string;
  number: string;
  plate: string;
  clientName: string;
  clientNif: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  createdAt: Date;
  hash: string;
  items: InvoiceItem[];
};
type Company = { workshopName: string; taxId: string; address: string };

export function InvoiceViewModal({ invoice, company }: { invoice: Invoice; company: Company }) {
  const router = useRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`FACTURA:${invoice.number}|TOTAL:${invoice.total.toFixed(2)}|HASH:${invoice.hash.slice(0, 16)}`, {
      width: 160,
      margin: 1,
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [invoice.number, invoice.total, invoice.hash]);

  const close = () => router.replace("/facturas");

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=460,height=680");
    if (!w) return;
    const rows = invoice.items
      .map(
        (it) =>
          `<tr><td>${it.concept}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${it.unitPrice.toFixed(2)} EUR</td><td style="text-align:right">${it.vat}%</td></tr>`
      )
      .join("");
    w.document.write(`
      <html>
        <head><title>Factura ${invoice.number}</title></head>
        <body style="font-family: Arial, sans-serif; padding:24px; color:#111;">
          <h2 style="margin-bottom:2px;">Factura ${invoice.number}</h2>
          <p style="color:#555; margin-top:0;">${fmtDate(invoice.createdAt)}</p>
          <p><strong>${company.workshopName || ""}</strong><br/>${company.taxId || ""}<br/>${company.address || ""}</p>
          <p>Cliente: ${invoice.clientName || "-"} ${invoice.clientNif ? "(" + invoice.clientNif + ")" : ""}<br/>Vehiculo: ${invoice.plate}</p>
          <table width="100%" style="border-collapse:collapse; margin-top:12px;">
            <thead><tr style="border-bottom:1px solid #ccc;"><th style="text-align:left;">Concepto</th><th>Cant.</th><th>Precio</th><th>IVA</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:14px;">Base imponible: ${invoice.subtotal.toFixed(2)} EUR<br/>IVA: ${invoice.vatTotal.toFixed(2)} EUR<br/><strong>Total: ${invoice.total.toFixed(2)} EUR</strong></p>
          ${dataUrl ? `<img src="${dataUrl}" width="130" height="130" style="margin-top:16px;" />` : ""}
          <p style="font-size:10px; color:#888; word-break:break-all;">Hash: ${invoice.hash}</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title={`Factura ${invoice.number}`} onClose={close}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          {invoice.clientName || "Sin cliente"} {invoice.clientNif ? `· ${invoice.clientNif}` : ""} · {invoice.plate}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "var(--color-surface-2)", borderRadius: 8, padding: 10 }}>
          {invoice.items.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: "var(--font-body)", color: "var(--color-text-primary)" }}>
              <span>
                {it.concept} x{it.qty}
              </span>
              <span>{fmtEUR(it.qty * it.unitPrice)}</span>
            </div>
          ))}
        </div>
        <Row label="Base imponible" value={fmtEUR(invoice.subtotal)} />
        <Row label="IVA" value={fmtEUR(invoice.vatTotal)} />
        <Row label="Total" value={fmtEUR(invoice.total)} strong />
        <div style={{ display: "flex", justifyContent: "center", background: "#fff", borderRadius: 10, padding: 10, minHeight: 160 }}>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} width={140} height={140} alt="QR factura" />
          ) : (
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#999" }}>Generando...</span>
          )}
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-faint)", wordBreak: "break-all" }}>
          hash: {invoice.hash.slice(0, 40)}...
        </p>
        <Button variant="primary" type="button" onClick={handlePrint}>
          <IconPrint /> Imprimir / descargar
        </Button>
      </div>
    </Modal>
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
