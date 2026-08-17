"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { IconTrash } from "@/components/ui/icons";
import { fmtEUR } from "@/lib/format";
import { VehicleFormFields } from "./VehicleFormFields";
import { PhotoManager } from "./PhotoManager";
import {
  addVehiclePhoto,
  removeVehicle,
  removeVehiclePhoto,
  setVehicleStatus,
  toggleVehicleFeatured,
  updateVehicle,
} from "@/app/web/actions";

export type AdminVehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  mileage: number | null;
  price: number;
  fuel: string;
  transmission: string;
  power: string;
  color: string;
  doors: number | null;
  owners: number | null;
  warrantyMonths: number;
  extras: string;
  description: string;
  status: string;
  photos: string[];
  featured: boolean;
};

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" }> = {
  disponible: { label: "Disponible", tone: "success" },
  reservado: { label: "Reservado", tone: "warning" },
  vendido: { label: "Vendido", tone: "muted" },
};

export function VehicleAdminCard({ vehicle }: { vehicle: AdminVehicle }) {
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <Card style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
      {vehicle.photos[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vehicle.photos[0]} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 84, height: 84, borderRadius: 10, background: "var(--color-surface-2)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>
              {vehicle.brand} {vehicle.model}
            </p>
            <p style={{ margin: "2px 0 0", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
              {vehicle.year || "-"} · {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("es-ES")} km` : "-"} · {fmtEUR(vehicle.price)}
            </p>
          </div>
          <Pill tone={STATUS[vehicle.status]?.tone || "muted"}>{STATUS[vehicle.status]?.label}</Pill>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {Object.entries(STATUS).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => startTransition(() => setVehicleStatus(vehicle.id, key as "disponible" | "reservado" | "vendido"))}
              disabled={vehicle.status === key}
              style={{
                border: "none",
                borderRadius: 7,
                padding: "5px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                cursor: vehicle.status === key ? "default" : "pointer",
                opacity: vehicle.status === key ? 0.5 : 1,
                background: "var(--color-surface-2)",
                color: "var(--color-text-muted)",
              }}
            >
              {meta.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => startTransition(() => toggleVehicleFeatured(vehicle.id, !vehicle.featured))}
            style={{
              border: "none",
              borderRadius: 7,
              padding: "5px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              background: vehicle.featured ? "var(--color-accent-soft)" : "var(--color-surface-2)",
              color: vehicle.featured ? "var(--color-accent)" : "var(--color-text-muted)",
            }}
          >
            {vehicle.featured ? "Destacado" : "Destacar en inicio"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Editar y fotos
          </Button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`¿Eliminar ${vehicle.brand} ${vehicle.model}?`)) startTransition(() => removeVehicle(vehicle.id));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
          >
            <IconTrash />
          </button>
        </div>
      </div>

      {editing && (
        <Modal title={`Editar ${vehicle.brand} ${vehicle.model}`} onClose={() => setEditing(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                Fotos
              </p>
              <PhotoManager
                photos={vehicle.photos}
                addPhoto={(dataUrl) => addVehiclePhoto(vehicle.id, dataUrl)}
                removePhoto={(index) => removeVehiclePhoto(vehicle.id, index)}
              />
            </div>
            <form
              action={async (fd) => {
                await updateVehicle(vehicle.id, fd);
                setEditing(false);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <VehicleFormFields defaults={vehicle} />
              <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
                Guardar cambios
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </Card>
  );
}
