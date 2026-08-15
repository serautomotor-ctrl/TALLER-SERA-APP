"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconPrint } from "@/components/ui/icons";

export function QrModalParam({ order }: { order: { id: string; plate: string } | null }) {
  const router = useRouter();
  if (!order) return null;

  const qrData = encodeURIComponent(`ORDEN:${order.id}|MATRICULA:${order.plate}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${qrData}`;

  const close = () => router.replace("/ordenes");

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>Etiqueta ${order.plate}</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;">
          <h2 style="margin-bottom:4px;">${order.plate}</h2>
          <p style="color:#555; margin-top:0;">Orden ${order.id}</p>
          <img src="${qrUrl}" width="240" height="240" />
          <p style="margin-top:12px; font-size:12px; color:#777;">Escanea para acceder a la orden de reparacion</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title="Codigo QR de la orden" onClose={close}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} width={220} height={220} alt={`QR orden ${order.plate}`} />
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>{order.plate}</p>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)", textAlign: "center" }}>
          Pega esta etiqueta en el vehiculo. Al escanearla se identifica la orden {order.id}.
        </p>
        <Button variant="primary" type="button" onClick={handlePrint} style={{ width: "100%" }}>
          <IconPrint /> Imprimir etiqueta
        </Button>
      </div>
    </Modal>
  );
}
