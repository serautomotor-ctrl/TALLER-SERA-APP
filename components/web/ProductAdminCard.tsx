"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { ProductFormFields } from "./ProductFormFields";
import { PhotoManager } from "./PhotoManager";
import {
  addProductPhoto,
  removeProduct,
  removeProductPhoto,
  setProductAvailable,
  toggleProductFeatured,
  updateProduct,
} from "@/app/web/actions";

export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  condition: string;
  available: boolean;
  description: string;
  photos: string[];
  featured: boolean;
};

export function ProductAdminCard({ product }: { product: AdminProduct }) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <Card style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
      {product.photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.photos[0]} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 84, height: 84, borderRadius: 10, background: "var(--color-surface-2)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>
              {product.name}
            </p>
            <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
              {product.category || "Sin categoria"} · {fmtEUR(product.price)}
            </p>
          </div>
          <Pill tone={product.available ? "success" : "muted"}>{product.available ? "Disponible" : "Sin stock"}</Pill>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <button
            type="button"
            onClick={() => startTransition(() => setProductAvailable(product.id, !product.available))}
            style={{
              border: "none",
              borderRadius: 7,
              padding: "5px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              background: "var(--color-surface-2)",
              color: "var(--color-text-muted)",
            }}
          >
            {product.available ? "Marcar sin stock" : "Marcar disponible"}
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => toggleProductFeatured(product.id, !product.featured))}
            style={{
              border: "none",
              borderRadius: 7,
              padding: "5px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              background: product.featured ? "var(--color-accent-soft)" : "var(--color-surface-2)",
              color: product.featured ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
          >
            {product.featured ? "Destacado" : "Destacar en inicio"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Editar y fotos
          </Button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar ${product.name}?`)) startTransition(() => removeProduct(product.id));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {editing && (
        <Modal title={`Editar ${product.name}`} onClose={() => setEditing(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Fotos
              </p>
              <PhotoManager
                photos={product.photos}
                addPhoto={(dataUrl) => addProductPhoto(product.id, dataUrl)}
                removePhoto={(index) => removeProductPhoto(product.id, index)}
              />
            </div>
            <form
              action={async (fd) => {
                await updateProduct(product.id, fd);
                setEditing(false);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <ProductFormFields defaults={product} />
              <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
                Guardar cambios
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </Card>
  );
}
