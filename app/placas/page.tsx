import { Header } from "@/components/ui/Header";
import { PlateStudio } from "@/components/placas/PlateStudio";
import { mergePlateConfig } from "@/lib/plate";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PlacasPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const initialPlate = (m || "").toUpperCase().slice(0, 15);
  const [settings, jobs, vehicles, user] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" }, select: { plateConfig: true } }),
    prisma.plateJob.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.vehicle.findMany({ select: { plate: true, brand: true, model: true, customer: { select: { name: true, taxId: true } } } }),
    getSessionUser(),
  ]);

  return (
    <div>
      <Header title="Placas de matricula" subtitle="Diseno 520 x 110 mm sobre lamina reflectante, impresion y registro de placas hechas" />
      <PlateStudio
        initialPlate={initialPlate}
        config={mergePlateConfig(settings.plateConfig)}
        vehicles={vehicles.map((v) => ({ plate: v.plate, label: [v.brand, v.model].filter(Boolean).join(" "), holderName: v.customer.name, holderTaxId: v.customer.taxId }))}
        jobs={jobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() }))}
        isAdmin={!!user?.isAdmin}
      />
    </div>
  );
}
