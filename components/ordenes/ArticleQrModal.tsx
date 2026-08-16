"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { IconPrint } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";

type Article = { id: string; name: string; price: number };

export function ArticleQrModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`ARTICULO:${article.id}`, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [article.id]);

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=380,height=520");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>Etiqueta ${article.name}</title></head>
        <body style="font-family: Arial, sans-serif; text-align:center; padding:20px;">
          <h3 style="margin-bottom:2px;">${article.name}</h3>
          <p style="color:#555; margin-top:0;">${fmtEUR(article.price)}</p>
          <img src="${dataUrl}" width="200" height="200" />
          <p style="margin-top:10px; font-size:11px; color:#777;">Pega en el articulo. Escanea desde la orden para sumarlo.</p>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal title="QR del articulo" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#fff", padding: 12, borderRadius: 10, minHeight: 220, minWidth: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} width={200} height={200} alt={`QR ${article.name}`} />
          ) : (
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#999" }}>Generando...</span>
          )}
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{article.name}</p>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-accent)" }}>{fmtEUR(article.price)}</p>
        <Button variant="primary" type="button" onClick={handlePrint} disabled={!dataUrl} style={{ width: "100%" }}>
          <IconPrint /> Imprimir etiqueta
        </Button>
      </div>
    </Modal>
  );
}
