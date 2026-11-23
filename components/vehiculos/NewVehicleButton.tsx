"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { createVehicle, uploadVehicleDocs } from "@/app/vehiculos/actions";
import { prepareDocFiles } from "./docFiles";

type Customer = { id: string; name: string; phone: string };

export function NewVehicleButton({ customers, defaultCustomerId }: { customers: Customer[]; defaultCustomerId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultCustomerId);
  const [mode, setMode] = useState<"existente" | "nuevo">("existente");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const submit = (fd: FormData) => {
    setError("");
    if (mode === "nuevo") fd.delete("customerId");
    else fd.delete("name");
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    fd.delete("files");
    start(async () => {
      const r = await createVehicle(fd);
      if (r.error || !r.id) return setError(r.error || "No se pudo crear.");
      if (files.length) {
        const up = new FormData();
        up.set("kind", "Ficha tecnica");
        for (const f of await prepareDocFiles(files)) up.append("files", f);
        const u = await uploadVehicleDocs(r.id, up);
        if (u.error) setError(`Vehiculo creado, pero la ficha tecnica no se subio: ${u.error}`);
      }
      setOpen(false);
      router.push(`/vehiculos?id=${r.id}`);
    });
  };

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Anadir vehiculo
      </Button>
      {open && (
        <Modal title="Anadir vehiculo a un cliente" onClose={() => setOpen(false)} maxWidth={520}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Button variant={mode === "existente" ? "primary" : "ghost"} type="button" onClick={() => setMode("existente")} style={{ flex: 1 }}>
              Cliente que ya tengo
            </Button>
            <Button variant={mode === "nuevo" ? "primary" : "ghost"} type="button" onClick={() => setMode("nuevo")} style={{ flex: 1 }}>
              Cliente nuevo
            </Button>
          </div>
          <form action={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "existente" ? (
              <Field label="Cliente">
                <Select name="customerId" required defaultValue={defaultCustomerId || ""}>
                  <option value="" disabled>
                    Elige el cliente...
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "Sin nombre"} {c.phone ? `· ${c.phone}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="Nombre del cliente">
                  <TextInput name="name" required placeholder="Nombre y apellidos, o empresa" />
                </Field>
                <div style={grid2}>
                  <Field label="Telefono">
                    <TextInput name="phone" placeholder="600 000 000" />
                  </Field>
                  <Field label="DNI / CIF">
                    <TextInput name="taxId" placeholder="00000000A" />
                  </Field>
                </div>
                <div style={grid2}>
                  <Field label="Email">
                    <TextInput name="email" type="email" />
                  </Field>
                  <Field label="Direccion">
                    <TextInput name="address" />
                  </Field>
                </div>
              </>
            )}
            <VehicleFields />
            <Field label="Ficha tecnica (PDF o fotos, opcional)">
              <input name="files" type="file" multiple accept="application/pdf,image/*" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-primary)" }} />
            </Field>
            {error && <p style={{ margin: 0, color: "var(--color-danger)", fontFamily: "var(--font-body)", fontSize: 13 }}>{error}</p>}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar vehiculo"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}

/** Campos del vehiculo (se usan al crear y al editar) */
export function VehicleFields({ v }: { v?: { plate?: string; brand: string; model: string; vin: string; mileage: number | null; firstRegistration: Date | string | null; fuel: string; color: string; notes: string } }) {
  const reg = v?.firstRegistration ? new Date(v.firstRegistration).toISOString().slice(0, 10) : "";
  return (
    <>
      {!v && (
        <Field label="Matricula">
          <TextInput name="plate" required placeholder="1234BCD" style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: 700 }} />
        </Field>
      )}
      <div style={grid2}>
        <Field label="Marca">
          <TextInput name="brand" defaultValue={v?.brand} placeholder="Seat" />
        </Field>
        <Field label="Modelo">
          <TextInput name="model" defaultValue={v?.model} placeholder="Leon 1.5 TSI" />
        </Field>
      </div>
      <Field label="Bastidor (VIN)">
        <TextInput name="vin" defaultValue={v?.vin} placeholder="17 caracteres" maxLength={17} style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)" }} />
      </Field>
      <div style={grid2}>
        <Field label="Km">
          <TextInput name="mileage" inputMode="numeric" defaultValue={v?.mileage ?? ""} />
        </Field>
        <Field label="1a matriculacion">
          <TextInput name="firstRegistration" type="date" defaultValue={reg} />
        </Field>
      </div>
      <div style={grid2}>
        <Field label="Combustible">
          <Select name="fuel" defaultValue={v?.fuel || ""}>
            <option value="">-</option>
            {["Gasolina", "Diesel", "Hibrido", "Hibrido enchufable", "Electrico", "GLP", "GNC"].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <Field label="Color">
          <TextInput name="color" defaultValue={v?.color} />
        </Field>
      </div>
      <Field label="Notas">
        <TextInput name="notes" defaultValue={v?.notes} placeholder="Neumaticos, aceite que lleva, codigos..." />
      </Field>
    </>
  );
}

const grid2 = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 } as const;
