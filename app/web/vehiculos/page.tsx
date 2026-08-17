import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { WebAdminTabs } from "@/components/web/WebAdminTabs";
import { NewVehicleButton } from "@/components/web/NewVehicleButton";
import { VehicleAdminCard } from "@/components/web/VehicleAdminCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WebVehiculosPage() {
  const vehicles = await prisma.usedVehicle.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <Header title="Pagina web" subtitle="Vehiculos de ocasion visibles en la web publica" right={<NewVehicleButton />} />
      <WebAdminTabs active="vehiculos" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {vehicles.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay vehiculos de ocasion. Pulsa &quot;Nuevo vehiculo&quot; para anadir el primero.
            </p>
          </Card>
        )}
        {vehicles.map((v) => (
          <VehicleAdminCard
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
              power: v.power,
              color: v.color,
              doors: v.doors,
              owners: v.owners,
              warrantyMonths: v.warrantyMonths,
              extras: v.extras,
              description: v.description,
              status: v.status,
              photos: v.photos,
              featured: v.featured,
            }}
          />
        ))}
      </div>
    </div>
  );
}
