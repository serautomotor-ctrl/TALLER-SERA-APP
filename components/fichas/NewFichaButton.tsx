"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/inputs";
import { TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { createVehicle } from "@/app/fichas/actions";

export function NewFichaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva ficha
      </Button>
      {open && (
        <Modal title="Nueva ficha de vehiculo" onClose={() => setOpen(false)}>
          <form action={createVehicle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Matricula">
              <TextInput name="plate" placeholder="0000 ABC" required style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="Cliente">
              <TextInput name="clientName" placeholder="Nombre y apellidos" />
            </Field>
            <Field label="Telefono">
              <TextInput name="phone" placeholder="600 000 000" />
            </Field>
            <Field label="Vehiculo">
              <TextInput name="model" placeholder="Marca y modelo" />
            </Field>
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Crear ficha
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
