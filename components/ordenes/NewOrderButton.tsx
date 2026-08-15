"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/inputs";
import { TextArea, TextInput } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/Modal";
import { IconPlus } from "@/components/ui/icons";
import { createOrder } from "@/app/ordenes/actions";

export function NewOrderButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" type="button" onClick={() => setOpen(true)}>
        <IconPlus /> Nueva orden
      </Button>
      {open && (
        <Modal title="Nueva orden de reparacion" onClose={() => setOpen(false)}>
          <form action={createOrder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Matricula">
              <TextInput name="plate" placeholder="0000 ABC" required style={{ textTransform: "uppercase" }} />
            </Field>
            <Field label="Motivo de la visita">
              <TextArea name="description" placeholder="Descripcion del trabajo solicitado" />
            </Field>
            <Button variant="primary" type="submit" style={{ marginTop: 6 }}>
              Crear orden y generar QR
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
