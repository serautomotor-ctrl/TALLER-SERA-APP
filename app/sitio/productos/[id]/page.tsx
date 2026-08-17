import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/sitio/Gallery";
import { ProductDetailActions } from "@/components/sitio/ProductDetailActions";
import { fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONDITION_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  usado: "Usado",
  reacondicionado: "Reacondicionado",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div>
      <Link href="/sitio/productos" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
        &larr; Volver a productos
      </Link>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 28, marginTop: 14 }} className="sitio-vehicle-grid">
        <Gallery photos={product.photos} alt={product.name} />
        <div>
          <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            {product.category || "Producto"} {product.brand ? `· ${product.brand}` : ""} · {CONDITION_LABEL[product.condition]}
          </p>
          <h1 style={{ margin: "4px 0 8px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--color-text-primary)" }}>
            {product.name}
          </h1>
          <p style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--color-accent)" }}>
            {fmtEUR(Number(product.price))}
          </p>
          {product.description && (
            <p style={{ margin: "0 0 20px", fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
              {product.description}
            </p>
          )}
          <ProductDetailActions product={{ id: product.id, name: product.name, price: Number(product.price), available: product.available }} />
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .sitio-vehicle-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
