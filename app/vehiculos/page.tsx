import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { TextInput } from "@/components/ui/inputs";
import { IconSearch } from "@/components/ui/icons";
import { NewVehicleButton } from "@/components/vehiculos/NewVehicleButton";
import { VehicleDetail } from "@/components/vehiculos/VehicleDetail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function VehiculosPage({ searchParams }: { searchParams: Promise<{ q?: string; id?: string; cliente?: string }> }) {
  const { q = "", id, cliente } = await searchParams;

  const [vehicles, customers] = await Promise.all([
    prisma.vehicle.findMany({
      where: q
        ? {
            OR: [
              { plate: { contains: q.replace(/[\s-]/g, ""), mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { vin: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : undefined,
      select: { id: true, plate: true, brand: true, model: true, customer: { select: { name: true } }, _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
  ]);

  const selected = id
    ? await prisma.vehicle.findUnique({
        where: { id },
        include: {
          customer: { include: { vehicles: { orderBy: { createdAt: "desc" }, select: { id: true, plate: true } } } },
          documents: { orderBy: { createdAt: "desc" }, select: { id: true, kind: true, name: true, mime: true, size: true, createdAt: true } },
        },
      })
    : null;

  return (
    <div>
      <Header
        title="Vehiculos"
        subtitle="Vehiculos de cada cliente con su ficha tecnica y documentacion"
        right={<NewVehicleButton customers={customers} defaultCustomerId={cliente} />}
      />
      <div className="list-detail-grid">
        <Card style={{ padding: 12 }}>
          <form action="/vehiculos" method="get" style={{ position: "relative", marginBottom: 10 }}>
            <IconSearch style={{ position: "absolute", left: 10, top: 9, color: "var(--color-text-faint)" }} />
            <TextInput name="q" defaultValue={q} placeholder="Matricula, marca, bastidor o cliente" style={{ paddingLeft: 32, width: "100%" }} />
          </form>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 560, overflowY: "auto" }}>
            {vehicles.length === 0 && <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13, padding: "6px 4px" }}>Sin resultados.</p>}
            {vehicles.map((v) => {
              const active = v.id === id;
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              params.set("id", v.id);
              return (
                <Link
                  key={v.id}
                  href={`/vehiculos?${params.toString()}`}
                  style={{
                    display: "block",
                    padding: "9px 10px",
                    borderRadius: 8,
                    background: active ? "var(--color-accent-soft)" : "transparent",
                    border: `1px solid ${active ? "color-mix(in srgb, var(--color-accent) 33%, transparent)" : "transparent"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13.5, color: "var(--color-text-primary)" }}>{v.plate}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: v._count.documents ? "var(--color-success, #2e9d5b)" : "var(--color-text-faint)" }}>
                      {v._count.documents ? "Ficha tecnica ✓" : "Sin ficha tecnica"}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {[v.brand, v.model].filter(Boolean).join(" ") || "Sin marca"} · {v.customer.name || "Sin nombre"}
                  </p>
                </Link>
              );
            })}
          </div>
        </Card>

        {selected ? (
          <VehicleDetail vehicle={{ ...selected, documents: selected.documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) }} />
        ) : (
          <Card>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--color-text-muted)", fontSize: 13.5 }}>
              Elige un vehiculo de la lista para ver y subir su ficha tecnica, o anade un vehiculo nuevo a un cliente.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
