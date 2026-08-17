import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { WebAdminTabs } from "@/components/web/WebAdminTabs";
import { NewProductButton } from "@/components/web/NewProductButton";
import { ProductAdminCard } from "@/components/web/ProductAdminCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WebProductosPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <Header title="Pagina web" subtitle="Productos visibles en la web publica" right={<NewProductButton />} />
      <WebAdminTabs active="productos" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {products.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay productos. Pulsa &quot;Nuevo producto&quot; para anadir el primero.
            </p>
          </Card>
        )}
        {products.map((p) => (
          <ProductAdminCard
            key={p.id}
            product={{
              id: p.id,
              name: p.name,
              category: p.category,
              brand: p.brand,
              price: Number(p.price),
              condition: p.condition,
              available: p.available,
              description: p.description,
              photos: p.photos,
              featured: p.featured,
            }}
          />
        ))}
      </div>
    </div>
  );
}
