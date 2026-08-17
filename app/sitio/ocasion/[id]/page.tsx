import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Gallery } from "@/components/sitio/Gallery";
import { IconWhatsapp } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FUEL_LABEL: Record<string, string> = {
  gasolina: "Gasolina",
  diesel: "Diesel",
  hibrido: "Hibrido",
  electrico: "Electrico",
  glp: "GLP",
  otro: "Otro",
};

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "muted" }> = {
  disponible: { label: "Disponible", tone: "success" },
  reservado: { label: "Reservado", tone: "warning" },
  vendido: { label: "Vendido", tone: "muted" },
};

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [vehicle, settings] = await Promise.all([
    prisma.usedVehicle.findUnique({ where: { id } }),
    prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } }),
  ]);
  if (!vehicle) notFound();

  const waText = encodeURIComponent(
    `Hola, estoy interesado/a en el ${vehicle.brand} ${vehicle.model} (${vehicle.year || "-"}) que teneis publicado por ${fmtEUR(Number(vehicle.price))}.`
  );

  const specs: [string, string][] = [
    ["Año", vehicle.year ? String(vehicle.year) : "-"],
    ["Kilometraje", vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("es-ES")} km` : "-"],
    ["Combustible", FUEL_LABEL[vehicle.fuel]],
    ["Cambio", vehicle.transmission === "automatico" ? "Automatico" : "Manual"],
    ["Potencia", vehicle.power || "-"],
    ["Color", vehicle.color || "-"],
    ["Puertas", vehicle.doors ? String(vehicle.doors) : "-"],
    ["Propietarios", vehicle.owners ? String(vehicle.owners) : "-"],
    ["Garantia", vehicle.warrantyMonths > 0 ? `${vehicle.warrantyMonths} meses` : "Sin garantia especificada"],
  ];

  return (
    <div>
      <Link href="/sitio/ocasion" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-muted)" }}>
        &larr; Volver a vehiculos de ocasion
      </Link>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 28, marginTop: 14 }} className="sitio-vehicle-grid">
        <Gallery photos={vehicle.photos} alt={`${vehicle.brand} ${vehicle.model}`} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Pill tone={STATUS_LABEL[vehicle.status]?.tone || "muted"}>{STATUS_LABEL[vehicle.status]?.label}</Pill>
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--color-text-primary)" }}>
            {vehicle.brand} {vehicle.model}
          </h1>
          <p style={{ margin: "8px 0 18px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, color: "var(--color-accent)" }}>
            {fmtEUR(Number(vehicle.price))}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            {specs.map(([label, value]) => (
              <div key={label} style={{ background: "var(--color-surface-2)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--color-text-faint)", textTransform: "uppercase" }}>{label}</p>
                <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{value}</p>
              </div>
            ))}
          </div>

          {vehicle.extras && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Extras
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--color-text-primary)" }}>{vehicle.extras}</p>
            </div>
          )}

          {vehicle.description && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Descripcion
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.6, color: "var(--color-text-primary)" }}>{vehicle.description}</p>
            </div>
          )}

          {vehicle.status !== "vendido" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {settings.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary">
                    <IconWhatsapp /> Preguntar por este vehiculo
                  </Button>
                </a>
              )}
              <Link href="/sitio/contacto">
                <Button variant="secondary">Pedir cita para verlo</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .sitio-vehicle-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
