"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconCart } from "@/components/ui/icons";
import { useCart } from "./CartContext";

export function ProductDetailActions({ product }: { product: { id: string; name: string; price: number; available: boolean } }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant="primary"
        disabled={!product.available}
        onClick={() => {
          addItem({ productId: product.id, name: product.name, price: product.price });
          setAdded(true);
        }}
      >
        <IconCart /> {product.available ? "Anadir al carrito" : "Sin stock"}
      </Button>
      {added && (
        <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-success)" }}>Anadido al carrito.</p>
      )}
    </div>
  );
}
