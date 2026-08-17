import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { VehicleCard } from "@/components/sitio/VehicleCard";
import { ProductCard } from "@/components/sitio/ProductCard";
import { IconCalendar, IconWhatsapp } from "@/components/ui/icons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioHomePage() {
  const [settings, featuredVehicles, latestVehicles, featuredProducts, services] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.usedVehicle.findMany({ where: { featured: true, status: { not: "vendido" } }, take: 3, orderBy: { createdAt: "desc" } }),
    prisma.usedVehicle.findMany({ where: { status: { not: "vendido" } }, take: 3, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { featured: true, available: true }, take: 4, orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ take: 4, orderBy: { order: "asc" } }),
  ]);

  const vehicles = (featuredVehicles.length ? featuredVehicles : latestVehicles).slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <section style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(28px, 5vw, 44px)", color: "var(--color-text-primary)", textTransform: "uppercase" }}>
          {settings.workshopName}
        </h1>
        {settings.aboutText && (
          <p style={{ margin: "14px auto 0", maxWidth: 640, fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6, color: "var(--color-text-muted)" }}>
            {settings.aboutText}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 22 }}>
          <Link href="/sitio/contacto">
            <Button variant="primary">
              <IconCalendar /> Pedir cita
            </Button>
          </Link>
          {settings.whatsapp && (
            <a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <IconWhatsapp /> Escribir por WhatsApp
              </Button>
            </a>
          )}
          <Link href="/sitio/ocasion">
            <Button variant="ghost">Ver vehiculos de ocasion</Button>
          </Link>
        </div>
      </section>

      {vehicles.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
              Vehiculos de ocasion
            </h2>
            <Link href="/sitio/ocasion" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>
              Ver todos
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={{
                  id: v.id,
                  brand: v.brand,
                  model: v.model,
                  year: v.year,
                  mileage: v.mileage,
                  price: Number(v.price),
                  fuel: v.fuel,
                  transmission: v.transmission,
                  status: v.status,
                  photos: v.photos,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
              Nuestros servicios
            </h2>
            <Link href="/sitio/servicios" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>
              Ver todos
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {services.map((s) => (
              <Card key={s.id}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, color: "var(--color-text-primary)" }}>{s.name}</p>
                {s.description && (
                  <p style={{ margin: "6px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>{s.description}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
              Productos destacados
            </h2>
            <Link href="/sitio/productos" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>
              Ver todos
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {featuredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={{ id: p.id, name: p.name, category: p.category, price: Number(p.price), available: p.available, photos: p.photos }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
