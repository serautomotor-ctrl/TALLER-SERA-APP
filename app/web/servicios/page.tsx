import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { WebAdminTabs } from "@/components/web/WebAdminTabs";
import { NewServiceButton } from "@/components/web/NewServiceButton";
import { ServiceAdminCard } from "@/components/web/ServiceAdminCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WebServiciosPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <Header title="Pagina web" subtitle="Servicios visibles en la web publica" right={<NewServiceButton />} />
      <WebAdminTabs active="servicios" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {services.length === 0 && (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Todavia no hay servicios. Pulsa &quot;Nuevo servicio&quot; para anadir el primero.
            </p>
          </Card>
        )}
        {services.map((s) => (
          <ServiceAdminCard key={s.id} service={{ id: s.id, name: s.name, description: s.description, photoUrl: s.photoUrl }} />
        ))}
      </div>
    </div>
  );
}
