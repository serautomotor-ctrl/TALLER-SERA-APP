"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconBarcode, IconPlus, IconQr, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { createArticle, removeArticle } from "@/app/ordenes/actions";
import { ArticleQrModal } from "./ArticleQrModal";

type Article = { id: string; name: string; price: number };

export function ArticlesCatalogButton({ articles }: { articles: Article[] }) {
  const [open, setOpen] = useState(false);
  const [qrArticle, setQrArticle] = useState<Article | null>(null);
  const [, startTransition] = useTransition();

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
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {articles.length === 0 && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Todavia no hay articulos en el catalogo.</p>
              )}
              {articles.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                  <div>
                    <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)", fontWeight: 600 }}>{a.name}</p>
                    <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-accent)" }}>{fmtEUR(a.price)}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button type="button" onClick={() => setQrArticle(a)} style={{ padding: "5px 9px" }}>
                      <IconQr />
                    </Button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => removeArticle(a.id))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {qrArticle && <ArticleQrModal article={qrArticle} onClose={() => setQrArticle(null)} />}
    </>
  );
}
