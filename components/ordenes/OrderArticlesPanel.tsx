"use client";

import { useState } from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconCamera, IconPlus, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { addCatalogItem, changeItemQty, removeOrderItem } from "@/app/ordenes/actions";
import { QrScanner } from "./QrScanner";

type Article = { id: string; name: string; price: number };
type OrderItem = { id: string; name: string; price: number; qty: number };

export function OrderArticlesPanel({ orderId, items, articles }: { orderId: string; items: OrderItem[]; articles: Article[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const [, startTransition] = useTransition();

  return (
    <div style={{ width: "100%", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>
          Articulos
        </span>
        <Button variant="ghost" type="button" onClick={() => setShowAdd(true)} style={{ padding: "5px 10px", fontSize: 12 }}>
          <IconPlus /> Anadir articulo
        </Button>
      </div>

      {items.length === 0 ? (
        <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-faint)" }}>Sin articulos anadidos.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-surface-2)", borderRadius: 7, padding: "6px 9px" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-primary)", flex: 1 }}>{it.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => startTransition(() => changeItemQty(it.id, -1))}
                  style={{ width: 20, height: 20, border: "none", borderRadius: 5, background: "var(--color-surface-3)", color: "var(--color-text-muted)", cursor: "pointer" }}
                >
                  -
                </button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-primary)", minWidth: 14, textAlign: "center" }}>{it.qty}</span>
                <button
                  onClick={() => startTransition(() => changeItemQty(it.id, 1))}
                  style={{ width: 20, height: 20, border: "none", borderRadius: 5, background: "var(--color-surface-3)", color: "var(--color-text-muted)", cursor: "pointer" }}
                >
                  +
                </button>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--color-accent)", minWidth: 60, textAlign: "right" }}>
                {fmtEUR(it.price * it.qty)}
              </span>
              <button
                onClick={() => startTransition(() => removeOrderItem(it.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", marginLeft: 4 }}
              >
                <IconTrash />
              </button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 2 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Subtotal articulos: {fmtEUR(subtotal)}
            </span>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Anadir articulo" onClose={() => setShowAdd(false)}>
          <AddArticleForm orderId={orderId} articles={articles} onAdded={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  );
}

function AddArticleForm({ orderId, articles, onAdded }: { orderId: string; articles: Article[]; onAdded: () => void }) {
  const [mode, setMode] = useState<"buscar" | "escanear">("buscar");
  const [query, setQuery] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const filtered = articles.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  const addArticle = async (articleId: string) => {
    const formData = new FormData();
    formData.set("articleId", articleId);
    await addCatalogItem(orderId, formData);
  };

  const handleDetect = (text: string) => {
    if (!text.startsWith("ARTICULO:")) return;
    const articleId = text.slice("ARTICULO:".length);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      setScanMessage("QR leido, pero ese articulo no esta en el catalogo.");
      return;
    }
    setScanMessage(`Anadido: ${article.name}`);
    addArticle(articleId);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant={mode === "buscar" ? "primary" : "ghost"} type="button" onClick={() => setMode("buscar")} style={{ flex: 1 }}>
          Buscar
        </Button>
        <Button variant={mode === "escanear" ? "primary" : "ghost"} type="button" onClick={() => setMode("escanear")} style={{ flex: 1 }}>
          <IconCamera /> Escanear QR
        </Button>
      </div>

      {mode === "buscar" ? (
        <>
          <TextInput placeholder="Buscar en el catalogo" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>Sin articulos en el catalogo.</p>
            )}
            {filtered.map((a) => (
              <form
                key={a.id}
                action={async (formData) => {
                  await addCatalogItem(orderId, formData);
                  onAdded();
                }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}
              >
                <input type="hidden" name="articleId" value={a.id} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }}>{a.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--color-accent)" }}>{fmtEUR(a.price)}</span>
                  <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                    <IconPlus />
                  </button>
                </div>
              </form>
            ))}
          </div>
        </>
      ) : (
        <>
          <QrScanner onDetect={handleDetect} />
          {scanMessage && (
            <div style={{ padding: "8px 10px", background: "var(--color-success-soft)", borderRadius: 8 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-success)" }}>{scanMessage}</p>
            </div>
          )}
          <Button variant="secondary" type="button" onClick={onAdded} style={{ width: "100%" }}>
            Listo
          </Button>
        </>
      )}
    </div>
  );
}
