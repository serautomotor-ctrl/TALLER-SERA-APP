"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { createVehicleForExistingCustomer, createVehicleForNewCustomer } from "@/app/fichas/actions";

type Customer = { id: string; name: string };

export function NewFichaButton({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"nuevo" | "existente">("nuevo");

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva ficha
      </Button>
      {open && (
        <Modal title="Nueva ficha de vehiculo" onClose={() => setOpen(false)}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <Button variant={mode === "nuevo" ? "primary" : "ghost"} type="button" onClick={() => setMode("nuevo")} style={{ flex: 1 }}>
              Cliente nuevo
            </Button>
            <Button variant={mode === "existente" ? "primary" : "ghost"} type="button" onClick={() => setMode("existente")} style={{ flex: 1 }}>
              Cliente existente
            </Button>
          </div>

          {mode === "nuevo" ? (
            <form action={createVehicleForNewCustomer} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Nombre del cliente">
                <TextInput name="name" placeholder="Nombre y apellidos, o empresa" required />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
                <Field label="Telefono">
                  <TextInput name="phone" placeholder="600 000 000" />
                </Field>
                <Field label="Email">
                  <TextInput name="email" type="email" placeholder="cliente@email.com" />
                </Field>
              </div>
              <Field label="Direccion">
                <TextInput name="address" placeholder="Calle, numero, ciudad" />
              </Field>
              <Field label="DNI / CIF">
                <TextInput name="taxId" placeholder="00000000A" />
              </Field>
              <VehicleFields />
              <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
                Crear ficha
              </Button>
            </form>
          ) : (
            <form action={createVehicleForExistingCustomer} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="Cliente">
                <Select name="customerId" required defaultValue="">
                  <option value="" disabled>
                    Selecciona un cliente
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {customers.length === 0 && (
                <p style={{ margin: 0, fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                  Todavia no hay ningun cliente creado. Usa la pestaña "Cliente nuevo".
                </p>
              )}
              <VehicleFields />
              <Button variant="primary" type="submit" disabled={customers.length === 0} style={{ marginTop: 6 }}>
                Anadir vehiculo
              </Button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}

function VehicleFields() {
  return (
    <>
      <Field label="Matricula">
        <TextInput name="plate" placeholder="0000 ABC" required style={{ textTransform: "uppercase" }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Marca">
          <TextInput name="brand" placeholder="Seat, Renault..." />
        </Field>
        <Field label="Modelo">
          <TextInput name="model" placeholder="Ibiza, Clio..." />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
        <Field label="Bastidor (VIN)">
          <TextInput name="vin" placeholder="Opcional" />
        </Field>
        <Field label="Kilometraje">
          <TextInput name="mileage" type="number" min="0" placeholder="Opcional" />
        </Field>
      </div>
    </>
  );
}
