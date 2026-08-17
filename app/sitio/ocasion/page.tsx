import { VehicleCard } from "@/components/sitio/VehicleCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioOcasionPage() {
  const vehicles = await prisma.usedVehicle.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }] });

  return (
    <div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
        Vehiculos de ocasion
      </h1>
      {vehicles.length === 0 && (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}>Muy pronto publicaremos aqui nuestros vehiculos de ocasion.</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
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
    </div>
  );
}
