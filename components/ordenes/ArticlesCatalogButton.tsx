"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconBarcode, IconPlus } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { createArticle } from "@/app/ordenes/actions";

type Article = { id: string; name: string; price: number };

export function ArticlesCatalogButton({ articles }: { articles: Article[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" type="button" onClick={() => setOpen(true)}>
        <IconBarcode /> Articulos
      </Button>
      {open && (
        <Modal title="Catalogo de articulos" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <form action={createArticle} style={{ display: "flex", gap: 8 }}>
              <TextInput name="name" placeholder="Nombre del articulo" style={{ flex: 1 }} required />
              <TextInput name="price" placeholder="Precio" style={{ width: 90 }} required />
              <Button type="submit">
                <IconPlus />
              </Button>
            </form>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {articles.length === 0 && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Todavia no hay articulos en el catalogo.</p>
              )}
              {articles.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{a.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--color-accent)" }}>{fmtEUR(a.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
