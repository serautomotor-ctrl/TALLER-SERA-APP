import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { fmtEUR } from "@/lib/format";

export type PublicVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  mileage: number | null;
  price: number;
  fuel: string;
  transmission: string;
  status: string;
  photos: string[];
};

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

export function VehicleCard({ vehicle }: { vehicle: PublicVehicle }) {
  return (
    <Link href={`/sitio/ocasion/${vehicle.id}`}>
      <Card style={{ padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-surface-2)" }}>
          {vehicle.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vehicle.photos[0]} alt={`${vehicle.brand} ${vehicle.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <Pill tone={STATUS_LABEL[vehicle.status]?.tone || "muted"}>{STATUS_LABEL[vehicle.status]?.label}</Pill>
          </div>
        </div>
        <div style={{ padding: 14, flex: 1 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--color-text-primary)" }}>
            {vehicle.brand} {vehicle.model}
          </p>
          <p style={{ margin: "4px 0 8px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
            {vehicle.year || "-"} · {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("es-ES")} km` : "-"} · {FUEL_LABEL[vehicle.fuel]}
          </p>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, color: "var(--color-accent)" }}>
            {fmtEUR(vehicle.price)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
