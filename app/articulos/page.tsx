import Link from "next/link";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/inputs";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { ArticleCard } from "@/components/articulos/ArticleCard";
import { createArticle } from "@/app/ordenes/actions";
import { fmtEUR } from "@/lib/format";
import { stockLevel } from "@/lib/stock";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Filter = "todos" | "bajo" | "agotado";

const statLabel: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: 11.5,
  fontWeight: 600,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.3,
};
const statValue: CSSProperties = { margin: "4px 0 0", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22 };

export default async function ArticulosPage({ searchParams }: { searchParams: Promise<{ filtro?: string; q?: string }> }) {
  const { filtro, q } = await searchParams;
  const filter: Filter = filtro === "bajo" || filtro === "agotado" ? filtro : "todos";
  const query = (q ?? "").trim();

  const all = await prisma.article.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { movements: true } } } });
  const articles = all.map((a) => ({
    id: a.id,
    name: a.name,
    price: Number(a.price),
    costPrice: Number(a.costPrice),
    stock: a.stock,
    minStock: a.minStock,
    supplier: a.supplier,
    tracked: a._count.movements > 0,
  }));

  const levels = articles.map((a) => stockLevel(a.stock, a.minStock, a.tracked));
  const lowCount = levels.filter((l) => l === "bajo").length;
  const outCount = levels.filter((l) => l === "agotado").length;
  const stockValue = articles.reduce((s, a) => s + Math.max(0, a.stock) * a.costPrice, 0);

  const shown = articles.filter((a, i) => {
    if (filter === "bajo" && levels[i] !== "bajo" && levels[i] !== "agotado") return false; // incluye tambien los agotados
    if (filter === "agotado" && levels[i] !== "agotado") return false;
    if (query && !`${a.name} ${a.supplier}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const href = (f: Filter) => {
    const p = new URLSearchParams();
    if (f !== "todos") p.set("filtro", f);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `/articulos?${s}` : "/articulos";
  };

  const chip = (f: Filter, label: string, count?: number) => {
    const active = f === filter;
    return (
      <Link
        key={f}
        href={href(f)}
        style={{
          padding: "7px 12px",
          borderRadius: 8,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          background: active ? "var(--color-accent)" : "transparent",
          color: active ? "#14161a" : "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        {count !== undefined ? ` (${count})` : ""}
      </Link>
    );
  };

  return (
    <div>
      <Header title="Articulos" subtitle="Catalogo de materiales y piezas, con el stock del almacen. Se descuenta solo al usarlos en una orden" />

      {/* Resumen del almacen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Card style={{ padding: 14 }}>
          <p style={statLabel}>Articulos</p>
          <p style={{ ...statValue, color: "var(--color-text-primary)" }}>{articles.length}</p>
        </Card>
        <Link href={href("bajo")} style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, borderColor: lowCount + outCount > 0 ? "var(--color-warning)" : undefined }}>
            <p style={statLabel}>Para pedir</p>
            <p style={{ ...statValue, color: lowCount + outCount > 0 ? "var(--color-warning)" : "var(--color-text-primary)" }}>{lowCount + outCount}</p>
          </Card>
        </Link>
        <Link href={href("agotado")} style={{ textDecoration: "none" }}>
          <Card style={{ padding: 14, borderColor: outCount > 0 ? "var(--color-danger)" : undefined }}>
            <p style={statLabel}>Agotados</p>
            <p style={{ ...statValue, color: outCount > 0 ? "var(--color-danger)" : "var(--color-text-primary)" }}>{outCount}</p>
          </Card>
        </Link>
        <Card style={{ padding: 14 }}>
          <p style={statLabel}>Valor del almacen</p>
          <p style={{ ...statValue, fontSize: 19, color: "var(--color-accent)" }}>{fmtEUR(stockValue)}</p>
        </Card>
      </div>

      {/* Alta de articulo */}
      <Card style={{ marginBottom: 16 }}>
        <form action={createArticle} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 180px" }}>
            <Field label="Nombre del articulo">
              <TextInput name="name" placeholder="Filtro de aceite" required style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 100 }}>
            <Field label="Precio venta">
              <TextInput name="price" inputMode="decimal" placeholder="12.50" required style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 90 }}>
            <Field label="Coste">
              <TextInput name="costPrice" inputMode="decimal" placeholder="7.00" style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 80 }}>
            <Field label="Stock">
              <TextInput name="stock" type="number" min={0} step={1} placeholder="0" style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ width: 80 }}>
            <Field label="Minimo">
              <TextInput name="minStock" type="number" min={0} step={1} placeholder="0" style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <Field label="Proveedor">
              <TextInput name="supplier" placeholder="Opcional" style={{ width: "100%" }} />
            </Field>
          </div>
          <Button type="submit" variant="primary">
            <IconPlus /> Anadir
          </Button>
        </form>
      </Card>

      {/* Filtros y buscador */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {chip("todos", "Todos", articles.length)}
          {chip("bajo", "Para pedir", lowCount + outCount)}
          {chip("agotado", "Agotados", outCount)}
        </div>
        <form action="/articulos" style={{ display: "flex", gap: 6, flex: "1 1 200px" }}>
          {filter !== "todos" && <input type="hidden" name="filtro" value={filter} />}
          <TextInput name="q" defaultValue={query} placeholder="Buscar articulo o proveedor" style={{ flex: 1 }} />
          <Button type="submit" aria-label="Buscar">
            <IconSearch />
          </Button>
        </form>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              {articles.length === 0
                ? "Todavia no hay articulos en el catalogo. Anade el primero arriba."
                : filter === "todos"
                  ? "Ningun articulo coincide con la busqueda."
                  : "No hay articulos en esta lista. Todo en orden."}
            </p>
          </Card>
        )}
        {shown.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
