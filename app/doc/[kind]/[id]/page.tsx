import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isValidShareToken, type ShareKind } from "@/lib/share";
import { PublicDocActions } from "@/components/doc/PublicDocActions";
import { BudgetAcceptForm } from "@/components/doc/BudgetAcceptForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Line = { id: string; kind: string; concept: string; qty: number; unitPrice: number; discount: number; vat: number };

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const date = (d: Date) => new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function PublicDocPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { kind, id } = await params;
  const { t } = await searchParams;
  if (kind !== "factura" && kind !== "presupuesto") notFound();
  if (!isValidShareToken(kind as ShareKind, id, t)) notFound();

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });

  let doc: {
    title: string;
    number: string;
    createdAt: Date;
    plate: string;
    clientName: string;
    clientNif: string;
    clientAddress: string;
    subtotal: number;
    vatTotal: number;
    total: number;
    items: Line[];
    footer?: string;
  };
  let budgetSign: { signed: boolean; signerName: string; signedAt: Date | null; signatureUrl: string } | null = null;

  if (kind === "factura") {
    const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!inv) notFound();
    doc = {
      title: "Factura",
      number: inv.number,
      createdAt: inv.createdAt,
      plate: inv.plate,
      clientName: inv.clientName,
      clientNif: inv.clientNif,
      clientAddress: inv.clientAddress,
      subtotal: Number(inv.subtotal),
      vatTotal: Number(inv.vatTotal),
      total: Number(inv.total),
      items: inv.items.map((it) => ({ ...it, unitPrice: Number(it.unitPrice) })),
      footer: inv.claimNumber ? `Siniestro n.º ${inv.claimNumber}` : undefined,
    };
  } else {
    const b = await prisma.budget.findUnique({ where: { id }, include: { items: true } });
    if (!b) notFound();
    doc = {
      title: "Presupuesto",
      number: b.number,
      createdAt: b.createdAt,
      plate: b.plate,
      clientName: b.clientName,
      clientNif: b.clientNif,
      clientAddress: b.clientAddress,
      subtotal: Number(b.subtotal),
      vatTotal: Number(b.vatTotal),
      total: Number(b.total),
      items: b.items.map((it) => ({ ...it, unitPrice: Number(it.unitPrice) })),
      footer: "Presupuesto sin validez de factura.",
    };
    budgetSign = { signed: !!b.signedAt, signerName: b.signerName, signedAt: b.signedAt, signatureUrl: b.signatureUrl };
  }

  const lineTotal = (it: Line) => it.qty * it.unitPrice * (1 - it.discount / 100);
  const groups = [
    { label: "Conceptos", items: doc.items.filter((i) => i.kind !== "mano_obra") },
    { label: "Mano de obra", items: doc.items.filter((i) => i.kind === "mano_obra") },
  ].filter((g) => g.items.length);

  const location = [settings.postalCode, settings.city, settings.province].filter(Boolean).join(" ");

  return (
    <div className="public-doc" style={{ minHeight: "100vh", background: "#eef0f3", color: "#14161a", fontFamily: "var(--font-body)", padding: "24px 16px" }}>
      <style>{`@media print { .no-print { display:none !important } .public-doc { background:#fff !important; padding:0 !important } .doc-sheet { box-shadow:none !important; border:none !important } }`}</style>
      <div className="doc-sheet" style={{ maxWidth: 760, margin: "0 auto", background: "#fff", borderRadius: 12, padding: "28px 24px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "2px solid #14161a", paddingBottom: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {settings.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
            )}
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "#333" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#14161a" }}>{settings.workshopName}</div>
              {settings.address && <div>{settings.address}</div>}
              {location && <div>{location}</div>}
              {settings.taxId && <div>NIF: {settings.taxId}</div>}
              {(settings.phone || settings.email) && <div>{[settings.phone && `Tel: ${settings.phone}`, settings.email].filter(Boolean).join(" · ")}</div>}
            </div>
          </div>
          <div style={{ border: "1px solid #bbb", borderRadius: 8, padding: "8px 12px", fontSize: 13, alignSelf: "flex-start" }}>
            <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
              {doc.title}: {doc.number}
            </div>
            <div style={{ color: "#444" }}>Fecha: {date(doc.createdAt)}</div>
          </div>
        </div>

        <div style={{ fontSize: 13, margin: "14px 0", lineHeight: 1.5 }}>
          <div>
            <strong>Cliente:</strong> {doc.clientName || "-"} {doc.clientNif && `(${doc.clientNif})`}
          </div>
          {doc.clientAddress && <div>{doc.clientAddress}</div>}
          <div>
            <strong>Vehiculo:</strong> {doc.plate}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {groups.map((g) => (
            <div key={g.label} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{g.label}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 460 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #999", textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>Descripcion</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Dto.</th>
                    <th>IVA</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid #eee", textAlign: "right" }}>
                      <td style={{ textAlign: "left", padding: "5px 0" }}>{it.concept}</td>
                      <td>{it.qty}</td>
                      <td>{eur(it.unitPrice)}</td>
                      <td>{it.discount ? `${it.discount}%` : "-"}</td>
                      <td>{it.vat}%</td>
                      <td>
                        <strong>{eur(lineTotal(it))}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: 1.7 }}>
            <div>
              Base imponible: <strong>{eur(doc.subtotal)}</strong>
            </div>
            <div>
              IVA: <strong>{eur(doc.vatTotal)}</strong>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, borderTop: "2px solid #14161a", marginTop: 4, paddingTop: 4 }}>Total: {eur(doc.total)}</div>
          </div>
        </div>
        {doc.footer && <p style={{ fontSize: 11.5, color: "#777", marginTop: 16 }}>{doc.footer}</p>}

        {budgetSign?.signed && (
          <div style={{ marginTop: 18, padding: 12, border: "1px solid #b9dfc7", background: "#eef8f1", borderRadius: 8, fontSize: 13 }}>
            <strong>Presupuesto aceptado</strong> por {budgetSign.signerName}
            {budgetSign.signedAt && ` el ${new Date(budgetSign.signedAt).toLocaleString("es-ES")}`}
            {budgetSign.signatureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={budgetSign.signatureUrl} alt="Firma" style={{ display: "block", width: 200, marginTop: 8 }} />
            )}
          </div>
        )}
      </div>

      <div className="no-print" style={{ maxWidth: 760, margin: "16px auto 0", display: "flex", flexDirection: "column", gap: 14 }}>
        {budgetSign && !budgetSign.signed && <BudgetAcceptForm budgetId={id} token={t!} defaultName={doc.clientName} />}
        <PublicDocActions whatsapp={settings.whatsapp || settings.phone} label={`${doc.title} ${doc.number}`} />
      </div>
    </div>
  );
}
