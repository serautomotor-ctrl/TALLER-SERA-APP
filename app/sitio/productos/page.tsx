import { ProductCard } from "@/components/sitio/ProductCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioProductosPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
        Productos
      </h1>
      {products.length === 0 && (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}>Muy pronto publicaremos aqui nuestros productos.</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={{ id: p.id, name: p.name, category: p.category, price: Number(p.price), available: p.available, photos: p.photos }}
          />
        ))}
      </div>
    </div>
  );
}
