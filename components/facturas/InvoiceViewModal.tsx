"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Select, TextInput } from "@/components/ui/inputs";
import { IconPrint } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";
import { markInvoicePaid, markInvoiceUnpaid, setPartialPayment, updateInvoiceNumber } from "@/app/facturas/actions";

type InvoiceItem = { id: string; concept: string; qty: number; unitPrice: number; discount: number; vat: number; kind: string };
type Invoice = {
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
  hash: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAmount: number;
  items: InvoiceItem[];
};
type Company = {
  workshopName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  logoUrl: string;
};

const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" }> = {
  cobrada: { label: "Cobrada", tone: "success" },
  parcial: { label: "Cobro parcial", tone: "warning" },
  pendiente: { label: "Pendiente de cobro", tone: "muted" },
};

export function InvoiceViewModal({ invoice, company }: { invoice: Invoice; company: Company }) {
  const router = useRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [partialAmount, setPartialAmount] = useState(String(invoice.total.toFixed(2)));
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberValue, setNumberValue] = useState(invoice.number);
  const [numberError, setNumberError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const targetUrl = `${window.location.origin}/facturas?id=${invoice.id}`;
    QRCode.toDataURL(targetUrl, {
      width: 160,
      margin: 1,
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [invoice.id]);

  const close = () => router.replace("/facturas");

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;

    const lineTotal = (it: InvoiceItem) => it.qty * it.unitPrice * (1 - it.discount / 100);
    const rowsFor = (kind: string) =>
      invoice.items
        .filter((it) => it.kind === kind)
        .map(
          (it) =>
            `<tr><td>${it.concept}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${it.unitPrice.toFixed(2)} EUR</td><td style="text-align:right">${it.discount ? it.discount + "%" : "-"}</td><td style="text-align:right">${it.vat}%</td><td style="text-align:right"><strong>${lineTotal(it).toFixed(2)} EUR</strong></td></tr>`
        )
        .join("");
    const conceptRows = rowsFor("concepto");
    const laborRows = rowsFor("mano_obra");
    const tableHead = `<thead><tr style="border-bottom:1px solid #999;"><th style="text-align:left;">Descripcion</th><th>Cant.</th><th>Precio</th><th>Dto.</th><th>IVA</th><th>Total</th></tr></thead>`;

    const cityLine = [company.postalCode, company.city].filter(Boolean).join("  ");
    const locationLine = [cityLine, company.province].filter(Boolean).join("    ");

    w.document.write(`
      <html>
        <head><title>Factura ${invoice.number}</title></head>
        <body style="font-family: Arial, sans-serif; padding:24px; color:#111; position:relative; font-size:13px;" onload="window.print()">
          ${company.logoUrl ? `<img src="${company.logoUrl}" style="position:fixed; top:50%; left:50%; width:340px; height:340px; object-fit:contain; transform:translate(-50%,-50%); opacity:0.09; z-index:0;" />` : ""}
          <div style="position:relative; z-index:1;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
              ${company.logoUrl ? `<img src="${company.logoUrl}" style="width:60px; height:60px; object-fit:contain;" />` : ""}
              <div>
                <p style="margin:0; font-size:19px; font-weight:bold;">${company.workshopName || ""}</p>
                ${company.address ? `<p style="margin:2px 0 0; color:#333;">${company.address}</p>` : ""}
                ${locationLine ? `<p style="margin:0; color:#333;">${locationLine}</p>` : ""}
                ${company.taxId ? `<p style="margin:2px 0 0; color:#333;">NIF: ${company.taxId}</p>` : ""}
                <p style="margin:2px 0 0; color:#333;">${company.phone ? `Tel: ${company.phone}` : ""}${company.phone && company.email ? "  ·  " : ""}${company.email ? `${company.email}` : ""}</p>
              </div>
            </div>
            <div style="text-align:right; border:1px solid #999; border-radius:6px; padding:8px 12px;">
              <p style="margin:0; font-weight:bold;">FACTURA: ${invoice.number}</p>
              <p style="margin:2px 0 0; color:#333;">Fecha: ${fmtDate(invoice.createdAt)}</p>
            </div>
          </div>
          <p style="margin-top:12px;">Cliente: ${invoice.clientName || "-"} ${invoice.clientNif ? "(" + invoice.clientNif + ")" : ""}${invoice.clientAddress ? "<br/>" + invoice.clientAddress : ""}<br/>Vehiculo: ${invoice.plate}</p>
          ${conceptRows ? `<p style="margin:14px 0 4px;"><strong>Conceptos</strong></p><table width="100%" style="border-collapse:collapse;">${tableHead}<tbody>${conceptRows}</tbody></table>` : ""}
          ${laborRows ? `<p style="margin:14px 0 4px;"><strong>Mano de obra</strong></p><table width="100%" style="border-collapse:collapse;">${tableHead}<tbody>${laborRows}</tbody></table>` : ""}
          <div style="display:flex; justify-content:flex-end; margin-top:20px;">
            <div style="display:flex; align-items:stretch; gap:0;">
              <div style="border:1px solid #999; border-right:none; border-radius:6px 0 0 6px; padding:10px 16px; text-align:right;">
                <p style="margin:0 0 6px;">Base imponible: <strong>${invoice.subtotal.toFixed(2)} EUR</strong></p>
                <p style="margin:0;">IVA: <strong>${invoice.vatTotal.toFixed(2)} EUR</strong></p>
              </div>
              <div style="border:2px solid #111; border-radius:0 6px 6px 0; padding:10px 18px; display:flex; flex-direction:column; justify-content:center; align-items:flex-end;">
                <span style="font-size:11px; text-transform:uppercase; color:#333;">Total factura</span>
                <span style="font-size:24px; font-weight:bold;">${invoice.total.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>
          ${dataUrl ? `<img src="${dataUrl}" width="130" height="130" style="margin-top:16px;" />` : ""}
          <p style="font-size:10px; color:#888; word-break:break-all;">Hash: ${invoice.hash}</p>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
  };

  const conceptItems = invoice.items.filter((it) => it.kind === "concepto");
  const laborItems = invoice.items.filter((it) => it.kind === "mano_obra");

  return (
    <Modal title={`Factura ${invoice.number}`} onClose={close}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {company.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.workshopName} style={{ width: 48, height: 48, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 4 }} />
        )}
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
          {invoice.clientName || "Sin cliente"} {invoice.clientNif ? `· ${invoice.clientNif}` : ""} · {invoice.plate}
          {invoice.clientAddress ? <><br />{invoice.clientAddress}</> : null}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {editingNumber ? (
            <form
              style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}
              action={async (fd) => {
                setNumberError("");
                const res = await updateInvoiceNumber(invoice.id, fd);
                if (res?.error) {
                  setNumberError(res.error);
                } else {
                  setEditingNumber(false);
                  router.refresh();
                }
              }}
            >
              <TextInput
                name="number"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
                style={{ fontSize: 12.5, padding: "6px 8px", flex: 1 }}
              />
              <Button type="submit" variant="primary" style={{ fontSize: 12 }}>
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                style={{ fontSize: 12 }}
                onClick={() => {
                  setEditingNumber(false);
                  setNumberValue(invoice.number);
                  setNumberError("");
                }}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <Button type="button" variant="ghost" style={{ fontSize: 12 }} onClick={() => setEditingNumber(true)}>
              Corregir numero de factura
            </Button>
          )}
        </div>
        {numberError && (
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-danger, #c0392b)" }}>{numberError}</p>
        )}
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
        <Row label="Base imponible" value={fmtEUR(invoice.subtotal)} />
        <Row label="IVA" value={fmtEUR(invoice.vatTotal)} />
        <Row label="Total" value={fmtEUR(invoice.total)} strong />

        <div style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Pill tone={PAYMENT_STATUS[invoice.paymentStatus]?.tone || "muted"}>{PAYMENT_STATUS[invoice.paymentStatus]?.label}</Pill>
            {invoice.paymentStatus !== "pendiente" && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>
                Cobrado: {fmtEUR(invoice.paidAmount)} {invoice.paymentMethod ? `· ${invoice.paymentMethod}` : ""}
              </span>
            )}
          </div>
          {invoice.paymentStatus === "pendiente" || invoice.paymentStatus === "parcial" ? (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <TextInput
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  style={{ width: 90, fontSize: 12.5, padding: "6px 8px" }}
                />
                <Select id="payment-method-select" defaultValue="efectivo" style={{ fontSize: 12.5, padding: "6px 8px", flex: 1 }}>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="otro">Otro</option>
                </Select>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  const select = document.getElementById("payment-method-select") as HTMLSelectElement | null;
                  const fd = new FormData();
                  fd.set("paidAmount", partialAmount);
                  fd.set("paymentMethod", select?.value || "efectivo");
                  startTransition(() => setPartialPayment(invoice.id, fd));
                }}
              >
                Registrar cobro
              </Button>
              <form
                action={(fd) => {
                  fd.set("paymentMethod", (document.getElementById("payment-method-select") as HTMLSelectElement | null)?.value || "efectivo");
                  startTransition(() => markInvoicePaid(invoice.id, fd));
                }}
              >
                <Button type="submit" variant="ghost" style={{ width: "100%" }}>
                  Marcar cobrada por completo ({fmtEUR(invoice.total)})
                </Button>
              </form>
            </>
          ) : (
            <Button type="button" variant="ghost" onClick={() => startTransition(() => markInvoiceUnpaid(invoice.id))}>
              Deshacer cobro
            </Button>
          )}
        </div>

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

function ItemsList({ items }: { items: InvoiceItem[] }) {
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
