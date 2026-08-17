"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { IconCart } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { useCart } from "./CartContext";

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  photos: string[];
};

export function ProductCard({ product }: { product: PublicProduct }) {
  const { addItem } = useCart();

  return (
    <Card style={{ padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <Link href={`/sitio/productos/${product.id}`}>
        <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-surface-2)" }}>
          {product.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photos[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
          {!product.available && (
            <div style={{ position: "absolute", top: 8, left: 8 }}>
              <Pill tone="muted">Sin stock</Pill>
            </div>
          )}
        </div>
      </Link>
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
        <Link href={`/sitio/productos/${product.id}`}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--color-text-primary)" }}>
            {product.name}
          </p>
          {product.category && (
            <p style={{ margin: "3px 0 8px", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>{product.category}</p>
          )}
        </Link>
        <p style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--color-accent)" }}>
          {fmtEUR(product.price)}
        </p>
        <Button
          type="button"
          variant="primary"
          disabled={!product.available}
          onClick={() => addItem({ productId: product.id, name: product.name, price: product.price })}
          style={{ marginTop: "auto" }}
        >
          <IconCart /> Anadir
        </Button>
      </div>
    </Card>
  );
}
