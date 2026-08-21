"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconQr, IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { removeArticle } from "@/app/ordenes/actions";
import { ArticleQrModal } from "@/components/ordenes/ArticleQrModal";

type Article = { id: string; name: string; price: number; costPrice: number };

export function ArticleCard({ article }: { article: Article }) {
  const [showQr, setShowQr] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div>
        <p style={{ margin: 0, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>{article.name}</p>
        <p style={{ margin: "2px 0 0", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--color-accent)" }}>
          {fmtEUR(article.price)}
          {article.costPrice > 0 && <span style={{ color: "var(--color-text-faint)" }}> · coste {fmtEUR(article.costPrice)}</span>}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button type="button" onClick={() => setShowQr(true)}>
          <IconQr /> Ver QR
        </Button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`¿Eliminar ${article.name}?`)) startTransition(() => removeArticle(article.id));
          }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
        >
          <IconTrash />
        </button>
      </div>
      {showQr && <ArticleQrModal article={article} onClose={() => setShowQr(false)} />}
    </Card>
  );
}
