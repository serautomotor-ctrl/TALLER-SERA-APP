"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconPrint } from "@/components/ui/icons";

export function QrModalParam({ order }: { order: { id: string; plate: string } | null }) {
  const router = useRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    QRCode.toDataURL(`ORDEN:${order.id}|MATRICULA:${order.plate}`, { width: 260, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [order]);

  if (!order) return null;

  const close = () => router.replace("/ordenes");

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>Etiqueta ${order.plate}</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;" onload="window.print()">
          <h2 style="margin-bottom:4px;">${order.plate}</h2>
          <p style="color:#555; margin-top:0;">Orden ${order.id}</p>
          <img src="${dataUrl}" width="240" height="240" />
          <p style="margin-top:12px; font-size:12px; color:#777;">Escanea para acceder a la orden de reparacion</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
  };

  return (
    <Modal title="Codigo QR de la orden" onClose={close}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10, minHeight: 220, minWidth: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} width={220} height={220} alt={`QR orden ${order.plate}`} />
          ) : (
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#999" }}>Generando...</span>
          )}
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>{order.plate}</p>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)", textAlign: "center" }}>
          Pega esta etiqueta en el vehiculo. Al escanearla se identifica la orden {order.id}.
        </p>
        <Button variant="primary" type="button" onClick={handlePrint} disabled={!dataUrl} style={{ width: "100%" }}>
          <IconPrint /> Imprimir etiqueta
        </Button>
      </div>
    </Modal>
  );
}
