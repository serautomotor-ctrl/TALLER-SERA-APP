import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SitioServiciosPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-text-primary)", textTransform: "uppercase" }}>
        Servicios
      </h1>
      {services.length === 0 && (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}>Muy pronto publicaremos aqui nuestros servicios.</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {services.map((s) => (
          <Card key={s.id} style={{ padding: 0, overflow: "hidden" }}>
            {s.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photoUrl} alt={s.name} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
            )}
            <div style={{ padding: 16 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--color-text-primary)" }}>{s.name}</p>
              {s.description && (
                <p style={{ margin: "8px 0 0", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.5, color: "var(--color-text-muted)" }}>
                  {s.description}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
