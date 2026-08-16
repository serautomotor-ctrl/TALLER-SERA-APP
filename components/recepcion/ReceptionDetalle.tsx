"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { IconCamera, IconPlus, IconPrint, IconTrash, IconWhatsapp } from "@/components/ui/icons";
import { fmtDate, fmtEUR } from "@/lib/format";
import { compressImage } from "@/lib/image";
import {
  addFinding,
  addFindingPhoto,
  addRequestedItem,
  removeFinding,
  removeFindingPhoto,
  removeRequestedItem,
  setBudgetStatus,
  setCheckpoint,
  setFindingPrice,
} from "@/app/recepcion/actions";

type Finding = { id: string; text: string; price: number | null; photos: string[] };
type RequestedItem = { id: string; text: string };
type Reception = {
  id: string;
  createdAt: Date;
  budgetStatus: string;
  checkpoints: Record<string, string>;
  requestedItems: RequestedItem[];
  findings: Finding[];
};

const CHECK_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  bien: { label: "Bien", tone: "success" },
  vigilar: { label: "Vigilar", tone: "warning" },
  cambiar: { label: "Cambiar", tone: "danger" },
};

const BUDGET_STATUS: Record<string, { label: string; tone: "muted" | "warning" | "success" | "danger" }> = {
  sin_enviar: { label: "Sin enviar", tone: "muted" },
  enviado: { label: "Enviado, esperando respuesta", tone: "warning" },
  aceptado: { label: "Cliente acepto", tone: "success" },
  rechazado: { label: "Cliente rechazo", tone: "danger" },
};

export function ReceptionDetalle({
  reception,
  order,
  client,
  checklist,
}: {
  reception: Reception;
  order: { id: string; plate: string };
  client: { clientName: string; phone: string } | null;
  checklist: string[];
}) {
  const [, startTransition] = useTransition();

  const budgetTotal = reception.findings.reduce((sum, f) => sum + (f.price || 0), 0);
  const phoneDigits = client?.phone ? client.phone.replace(/[^\d+]/g, "") : "";

  const buildMessage = () => {
    const lines: string[] = [];
    lines.push(`Hola${client?.clientName ? " " + client.clientName.split(" ")[0] : ""}, te escribimos del taller sobre tu vehiculo ${order.plate}.`);
    if (reception.requestedItems.length) {
      lines.push("");
      lines.push("Trabajos solicitados:");
      reception.requestedItems.forEach((i) => lines.push(`- ${i.text}`));
    }
    if (reception.findings.length) {
      lines.push("");
      lines.push("Hallazgos detectados en la revision:");
      reception.findings.forEach((f) => lines.push(`- ${f.text}${f.price ? ` (${fmtEUR(f.price)})` : ""}`));
    }
    if (budgetTotal > 0) {
      lines.push("");
      lines.push(`Presupuesto total: ${fmtEUR(budgetTotal)}`);
      lines.push("Responde a este mensaje para aceptar o rechazar el presupuesto.");
    }
    return lines.join("\n");
  };

  const sendWhatsapp = () => {
    const text = encodeURIComponent(buildMessage());
    const url = phoneDigits ? `https://wa.me/${phoneDigits.replace(/^\+/, "")}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
    startTransition(() => setBudgetStatus(reception.id, "enviado"));
  };

  const printDeposit = () => {
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    const now = new Date();
    w.document.write(`
      <html>
        <head><title>Resguardo de deposito ${order.plate}</title></head>
        <body style="font-family: Arial, sans-serif; padding:24px; color:#111;">
          <h2 style="margin-bottom:4px;">Resguardo de deposito</h2>
          <p style="color:#555; margin-top:0;">Automecanica Sera</p>
          <hr />
          <p><strong>Matricula:</strong> ${order.plate}</p>
          <p><strong>Cliente:</strong> ${client?.clientName || "-"}</p>
          <p><strong>Fecha y hora de entrada:</strong> ${now.toLocaleDateString("es-ES")} ${now.toLocaleTimeString("es-ES")}</p>
          <p><strong>Trabajos solicitados:</strong></p>
          <ul>${reception.requestedItems.map((i) => `<li>${i.text}</li>`).join("") || "<li>Sin especificar</li>"}</ul>
          <p style="margin-top:24px; font-size:12px; color:#777;">
            Este documento certifica que el vehiculo arriba indicado ha quedado depositado en las instalaciones del taller
            en la fecha y hora senaladas.
          </p>
          <div style="display:flex; justify-content:space-between; margin-top:48px;">
            <div>Firma del taller</div>
            <div>Firma del cliente</div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 20, color: "var(--color-text-primary)", letterSpacing: 1 }}>
              {order.plate}
            </p>
            {client && (
              <p style={{ margin: "3px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {client.clientName || "Sin nombre"} {client.phone ? `· ${client.phone}` : "· sin telefono en la ficha"}
              </p>
            )}
            <p style={{ margin: "4px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
              Recepcion iniciada el {fmtDate(reception.createdAt)}
            </p>
          </div>
          <Button variant="ghost" type="button" onClick={printDeposit}>
            <IconPrint /> Resguardo de deposito
          </Button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <Pill tone="steel">Pedido del cliente</Pill>
          <div style={{ marginTop: 8 }}>
            <SectionTitle>Motivo de la visita</SectionTitle>
          </div>
          <form action={addRequestedItem.bind(null, reception.id)} style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput name="text" placeholder="Anadir trabajo pedido" style={{ flex: 1 }} />
            <Button type="submit">
              <IconPlus />
            </Button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reception.requestedItems.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Sin trabajos pedidos registrados.</p>
            )}
            {reception.requestedItems.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-steel-soft)", borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{i.text}</span>
                <button
                  type="button"
                  onClick={() => startTransition(() => removeRequestedItem(i.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Pill tone="warning">Hallazgo en recepcion</Pill>
          <div style={{ marginTop: 8 }}>
            <SectionTitle>Detectado por el taller</SectionTitle>
          </div>
          <form action={addFinding.bind(null, reception.id)} style={{ display: "flex", gap: 8, margin: "10px 0" }}>
            <TextInput name="text" placeholder="Anadir hallazgo" style={{ flex: 1 }} />
            <Button type="submit">
              <IconPlus />
            </Button>
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reception.findings.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Sin hallazgos registrados.</p>
            )}
            {reception.findings.map((f) => (
              <FindingRow key={f.id} finding={f} />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle>Puntos de control</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 10 }}>
          {checklist.map((name) => {
            const status = reception.checkpoints[name];
            return (
              <div key={name} style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "9px 10px" }}>
                <p style={{ margin: "0 0 6px", fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)" }}>{name}</p>
                <div style={{ display: "flex", gap: 5 }}>
                  {Object.entries(CHECK_STATUS).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => startTransition(() => setCheckpoint(reception.id, name, key))}
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 6,
                        padding: "5px 0",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--font-body)",
                        cursor: "pointer",
                        background: status === key ? `var(--color-${meta.tone})` : "var(--color-surface-3)",
                        color: status === key ? "#151515" : "var(--color-text-muted)",
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <SectionTitle>Presupuesto y aviso al cliente</SectionTitle>
          <Pill tone={BUDGET_STATUS[reception.budgetStatus]?.tone || "muted"}>{BUDGET_STATUS[reception.budgetStatus]?.label}</Pill>
        </div>
        <p style={{ margin: "10px 0 4px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "var(--color-text-primary)" }}>
          {fmtEUR(budgetTotal)}
        </p>
        <p style={{ margin: "0 0 14px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
          Suma de los precios anadidos a cada hallazgo. El mensaje incluye tambien los trabajos pedidos por el cliente.
        </p>
        {!phoneDigits && (
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-warning)" }}>
            Esta ficha no tiene telefono guardado: se abrira WhatsApp sin numero, tendras que elegirlo a mano.
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" type="button" onClick={sendWhatsapp}>
            <IconWhatsapp /> Enviar presupuesto por WhatsApp
          </Button>
          <Button variant="ghost" type="button" onClick={() => startTransition(() => setBudgetStatus(reception.id, "aceptado"))}>
            Marcar aceptado
          </Button>
          <Button variant="ghost" type="button" onClick={() => startTransition(() => setBudgetStatus(reception.id, "rechazado"))}>
            Marcar rechazado
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const [, startTransition] = useTransition();
  const [price, setPrice] = useState(finding.price === null ? "" : String(finding.price));
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await compressImage(file);
        await addFindingPhoto(finding.id, dataUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: "var(--color-warning-soft)", borderRadius: 8, padding: "8px 10px" }}>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handleFiles} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)", flex: 1 }}>{finding.text}</span>
        <TextInput
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={(e) => startTransition(() => setFindingPrice(finding.id, e.target.value))}
          style={{ width: 74, padding: "5px 8px", fontSize: 12 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-warning)" }}
            aria-label="Anadir foto"
          >
            <IconCamera />
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => removeFinding(finding.id))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </div>
      </div>
      {uploading && (
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-text-muted)" }}>Subiendo foto...</p>
      )}
      {finding.photos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {finding.photos.map((p, idx) => (
            <div key={idx} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid var(--color-border)" }} />
              <button
                type="button"
                onClick={() => startTransition(() => removeFindingPhoto(finding.id, idx))}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--color-danger)",
                  color: "#fff",
                  border: "none",
                  fontSize: 10,
                  lineHeight: "16px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
