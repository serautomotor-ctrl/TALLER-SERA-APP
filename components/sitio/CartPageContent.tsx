"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { IconTrash, IconWhatsapp } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { useCart } from "./CartContext";

export function CartPageContent({ whatsapp }: { whatsapp: string }) {
  const { items, setQty, removeItem, total, clear } = useCart();

  const sendOrder = () => {
    const lines = [
      "Hola, quiero hacer un pedido de productos:",
      "",
      ...items.map((i) => `- ${i.name} x${i.qty} (${fmtEUR(i.price * i.qty)})`),
      "",
      `Total: ${fmtEUR(total)}`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
  };

  if (items.length === 0) {
    return (
      <Card>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
          Tu carrito esta vacio.{" "}
          <Link href="/sitio/productos" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
            Ver productos
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <Card key={item.productId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{item.name}</p>
            <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>{fmtEUR(item.price)} / unidad</p>
          </div>
          <TextInput
            type="number"
            min="1"
            value={item.qty}
            onChange={(e) => setQty(item.productId, Number(e.target.value) || 1)}
            style={{ width: 64, fontSize: 13, padding: "6px 8px" }}
          />
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--color-accent)", minWidth: 70, textAlign: "right" }}>
            {fmtEUR(item.qty * item.price)}
          </p>
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </Card>
      ))}

      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>Total del pedido</p>
          <p style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)" }}>{fmtEUR(total)}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={clear}>
            Vaciar carrito
          </Button>
          {whatsapp ? (
            <Button type="button" variant="primary" onClick={sendOrder}>
              <IconWhatsapp /> Pedir por WhatsApp
            </Button>
          ) : (
            <Link href="/sitio/contacto">
              <Button type="button" variant="primary">
                Consultar pedido
              </Button>
            </Link>
          )}
        </div>
      </Card>
      <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-faint)" }}>
        El pedido se envia como mensaje de WhatsApp; el pago y la entrega se acuerdan directamente con el taller.
      </p>
    </div>
  );
}
