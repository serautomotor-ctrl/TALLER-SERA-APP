import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconPlus } from "@/components/ui/icons";
import { ArticleCard } from "@/components/articulos/ArticleCard";
import { createArticle } from "@/app/ordenes/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ArticulosPage() {
  const articles = await prisma.article.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <Header
        title="Articulos"
        subtitle="Catalogo de materiales y piezas. Genera un QR con el precio para anadirlo escaneandolo desde una orden"
      />

      <Card style={{ marginBottom: 16 }}>
        <form action={createArticle} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Field label="Nombre del articulo">
              <TextInput name="name" placeholder="Filtro de aceite" required style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="Precio venta">
              <TextInput name="price" placeholder="12.50" required style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 100 }}>
            <Field label="Coste (opcional)">
              <TextInput name="costPrice" placeholder="7.00" style={{ width: "100%" }} />
            </Field>
          </div>
          <Button type="submit" variant="primary">
            <IconPlus /> Anadir
          </Button>
        </form>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {articles.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay articulos en el catalogo. Anade el primero arriba.
            </p>
          </Card>
        )}
        {articles.map((a) => (
          <ArticleCard key={a.id} article={{ id: a.id, name: a.name, price: Number(a.price), costPrice: Number(a.costPrice) }} />
        ))}
      </div>
    </div>
  );
}
